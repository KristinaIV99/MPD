import { TextNormalizer } from './text-normalizer.js'; 

export class TextReader {
  constructor(config = {}) {
    this.READER_NAME = '[TextReader]';
    
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB riba
      allowedTypes: [
        'text/markdown',
        'text/plain',
        'application/octet-stream'
      ],
      encoding: 'utf-8',
      ...config
    };

    this.normalizer = new TextNormalizer();
    this.abortController = new AbortController();
    this.events = new EventTarget();
  }

  async readFile(file) {
    this._validateFile(file);
    
    try {
      const text = await this._readFullFile(file);
      return this.normalizer.normalizeMarkdown(text);
    } finally {
      this._cleanup();
    }
  }

  _validateFile(file) {
    console.debug(`${this.READER_NAME} Failo informacija: 
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

  _readFullFile(file) {
    return new Promise((resolve, reject) => {
      if (this.abortController.signal.aborted) {
        reject(new DOMException('Operation aborted', 'AbortError'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = () => {
        this._dispatchProgress(file, file.size);
        resolve(reader.result);
      };
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new DOMException('Operation aborted', 'AbortError'));

      const abortHandler = () => {
        reader.abort();
        reject(new DOMException('Operation aborted', 'AbortError'));
      };

      this.abortController.signal.addEventListener('abort', abortHandler, { once: true });
      reader.readAsText(file, this.config.encoding);
    });
  }

  _dispatchProgress(file, loaded) {
    const percent = loaded >= file.size ? 100 : 
      Math.round((loaded / file.size) * 100);

    this.events.dispatchEvent(new CustomEvent('progress', {
      detail: { percent, loaded, total: file.size }
    }));
  }

  abort() {
    this.abortController.abort();
    console.warn(`${this.READER_NAME} Skaitymas nutrauktas`);
  }

  _cleanup() {
    this.abortController = new AbortController();
  }

  onProgress(callback) {
    this.events.addEventListener('progress', callback);
  }

  offProgress(callback) {
    this.events.removeEventListener('progress', callback);
  }
}
