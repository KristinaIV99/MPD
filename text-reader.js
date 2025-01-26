import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';
import Logger from './logger.js';
import { LOG_LEVELS } from './logger.js';

export class TextReader {
  constructor(config = {}) {
    this.config = {
      chunkSize: 1024 * 1024,
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: [
        'text/markdown',
        'text/plain',
        'application/octet-stream'
		// Papildomas tipas
      ],
      encoding: 'utf-8',
      maxRetries: 3,
      sanitizeHTML: true,
      workerEnabled: true,
      chunkOverlap: 1024,
      logger: new Logger('TextReader'),
      logLevel: LOG_LEVELS.ERROR,
      ...config
    };

    this.abortController = new AbortController();
    this.events = new EventTarget();
    this.worker = null;
    this._workerAvailable = false;
    this.activeJobId = 0;
    this.activeRequests = new Set();
    
    if (this.config.workerEnabled) {
      this._initWorker();
    }
  }

  async readFile(file) {
    this._validateFile(file);
    
    try {
      const text = await this._readWithProgress(file);
      return await this._parseContent(text);
    } finally {
      this._cleanup();
    }
  }

  _validateFile(file) {
   this.config.logger.error('DOMPurify loaded:', DOMPurify);
   this.config.logger.error(`Failo informacija: 
     Pavadinimas: ${file.name}
     Dydis: ${file.size}
     Tipas: ${file.type}
     Plėtinys: ${file.name.split('.').pop()}`
   );
   
   if (file.size > this.config.maxFileSize) {
     throw new Error(`Failas viršija ${this.config.maxFileSize/1024/1024}MB ribą`);
   }
   
 if (!this.config.allowedTypes.includes(file.type)) {
   if (file.name.toLowerCase().endsWith('.md')) {
     return;
   }
   throw new Error(`Netinkamas failo formatas: ${file.type}. Leidžiami tipai: ${this.config.allowedTypes.join(', ')}`);
 }
}

  async _readWithProgress(file) {
    const offsets = Array.from(
      {length: Math.ceil(file.size/this.config.chunkSize)}, 
      (_, i) => i * this.config.chunkSize
    );
    
    const chunks = await Promise.all(
      offsets.map(offset => this._readChunkWithRetry(file, offset))
    );
    
    return chunks.join('');
  }

  async _readChunkWithRetry(file, offset, attempt = 1) {
    try {
      const chunk = await this._readChunk(file, offset);
      this._dispatchProgress(file, offset + this.config.chunkSize);
      return chunk;
    } catch (error) {
      if (attempt <= this.config.maxRetries) {
        return this._readChunkWithRetry(file, offset, attempt + 1);
      }
      throw error;
    }
  }

  _readChunk(file, offset) {
    return new Promise((resolve, reject) => {
      if (this.abortController.signal.aborted) {
        reject(new DOMException('Operation aborted', 'AbortError'));
        return;
      }

      const reader = new FileReader();
      const slice = file.slice(offset, offset + this.config.chunkSize + this.config.chunkOverlap);

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new DOMException('Operation aborted', 'AbortError'));
      
      const abortHandler = () => {
        reader.abort();
        reject(new DOMException('Operation aborted', 'AbortError'));
      };

      this.abortController.signal.addEventListener('abort', abortHandler, { once: true });
      reader.readAsText(slice, this.config.encoding);
    });
  }

  async _parseContent(text) {
    return this._workerAvailable 
      ? this._parseWithWorker(text) 
      : this._parseInMainThread(text);
  }

  _initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker('./text-reader.worker.js', { type: 'module' });
        this.worker.onerror = (e) => {
          this.config.logger.error('Worker error:', e.error);
          this._workerAvailable = false;
        };
        this._workerAvailable = true;
      } catch (e) {
        this.config.logger.error('Worker init failed:', e);
        this._workerAvailable = false;
      }
    }
  }

  _parseWithWorker(text) {
    return new Promise((resolve, reject) => {
      const jobId = ++this.activeJobId;
      this.activeRequests.add(jobId);

      const messageHandler = (e) => {
        if (e.data.jobId !== jobId) return;
        
        this.worker.removeEventListener('message', messageHandler);
        this.activeRequests.delete(jobId);

        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(this._sanitizeOutput(e.data.html));
        }
      };

      const abortHandler = () => {
        this.worker.postMessage({ type: 'cancel', jobId });
        reject(new DOMException('Operation aborted', 'AbortError'));
      };

      this.abortController.signal.addEventListener('abort', abortHandler, { once: true });
      this.worker.addEventListener('message', messageHandler);
      
      this.worker.postMessage({
        text: text, // Siunčiamas VISAS tekstas
        jobId,
        sanitize: this.config.sanitizeHTML
      });
    });
  }

  _sanitizeOutput(html) {
    return this.config.sanitizeHTML 
      ? DOMPurify.sanitize(html, {
          FORBID_TAGS: ['iframe', 'script'],
          FORBID_ATTR: ['onclick']
        })
      : html;
  }

  _parseInMainThread(text) {
    try {
      const rawHtml = marked.parse(text);
      return this._sanitizeOutput(rawHtml);
    } catch (error) {
      this.config.logger.error('Parsing error:', error);
      return text;
    }
  }

  _dispatchProgress(file, loaded) {
    const percent = Math.min(
      Math.round((loaded / file.size) * 100),
      100
    );
    
    this.events.dispatchEvent(new CustomEvent('progress', {
      detail: { percent, loaded, total: file.size }
    }));
  }

  abort() {
    this.activeRequests.forEach(jobId => {
      this.worker?.postMessage({ type: 'cancel', jobId });
    });
    this.activeRequests.clear();
    
    if (this.worker) {
      this.worker.terminate();
      this._initWorker();
    }
    
    this.abortController.abort();
    this.config.logger.warn('Skaitymas nutrauktas');
  }

  _cleanup() {
    this.abort();
    this.abortController = new AbortController();
  }
}
