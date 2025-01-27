import Logger from './logger.js';
import { LOG_LEVELS } from './logger.js';
import { TextNormalizer } from './text-normalizer.js';

export class TextReader {
  constructor(config = {}) {
    const defaultLogger = new Logger('TextReader');
    
    this.config = {
      chunkSize: 1024 * 1024,
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: [
        'text/markdown',
        'text/plain',
        'application/octet-stream'
      ],
      encoding: 'utf-8',
      maxRetries: 3,
      workerEnabled: true,
      chunkOverlap: 1024,
      logger: defaultLogger,
      logLevel: LOG_LEVELS.ERROR,
      ...config
    };

    this.normalizer = new TextNormalizer(this.config.logger);
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
      return text;
    } finally {
      this._cleanup();
    }
  }

  _validateFile(file) {
    this.config.logger.debug(`Failo informacija: 
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
      { length: Math.ceil(file.size / this.config.chunkSize) },
      (_, i) => i * this.config.chunkSize
    );

    const chunks = await Promise.all(
      offsets.map(offset => this._readChunkWithRetry(file, offset))
    );

    const rawText = chunks.join('');
    return this.normalizer.normalizeMarkdown(rawText);
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

  _initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker('./text-reader.worker.js', {
          type: 'module',
          name: 'textReaderWorker'
        });
        this.worker.onerror = (e) => {
          this.config.logger.debug('Worker error:', e.error);
          this._workerAvailable = false;
        };
        this._workerAvailable = true;
      } catch (e) {
        this.config.logger.debug('Worker init failed:', e);
        this._workerAvailable = false;
      }
    }
  }

  _dispatchProgress(file, loaded) {
    const percent = loaded >= file.size ? 100 : 
      Math.round((loaded / file.size) * 100);

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
    this.abortController = new AbortController();
  }

  // Eventų valdymo metodai
  onProgress(callback) {
    this.events.addEventListener('progress', callback);
  }

  offProgress(callback) {
    this.events.removeEventListener('progress', callback);
  }
}
