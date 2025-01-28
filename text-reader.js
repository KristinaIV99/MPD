import { TextNormalizer } from './text-normalizer.js';

export class TextReader {
  constructor(config = {}) {
    this.READER_NAME = '[TextReader]';
    
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['text/markdown', 'text/plain', 'application/octet-stream'],
      encoding: 'utf-8',
      chunkSize: 1024 * 1024, // 1MB chunk'as pagal nutylėjimą
      ...config
    };

    this.normalizer = new TextNormalizer();
    this.abortController = new AbortController();
    this.events = new EventTarget();
    this.currentReader = null;
  }

  async readFile(file) {
    this._validateFile(file);
    this.abortController = new AbortController();
    
    try {
      let text = '';
      let offset = 0;

      while (offset < file.size && !this.abortController.signal.aborted) {
        const chunk = await this._readChunk(file, offset);
        text += chunk;
        offset += this.config.chunkSize;
        this._dispatchProgress(file, offset);
      }

      return this.normalizer.normalizeMarkdown(text);
    } finally {
      this._cleanup();
    }
  }

  _readChunk(file, offset) {
    return new Promise((resolve, reject) => {
      if (this.abortController.signal.aborted) {
        reject(new DOMException('Operation aborted', 'AbortError'));
        return;
      }

      const chunk = file.slice(offset, offset + this.config.chunkSize);
      const reader = new FileReader();
      this.currentReader = reader;

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new DOMException('Operation aborted', 'AbortError'));
      
      reader.readAsText(chunk, this.config.encoding);
    });
  }

  _dispatchProgress(file, loaded) {
    const percent = Math.min(Math.round((loaded / file.size) * 100), 100);
    this.events.dispatchEvent(new CustomEvent('progress', {
      detail: { 
        percent,
        loaded: Math.min(loaded, file.size),
        total: file.size 
      }
    }));
  }

  abort() {
    if (this.currentReader) {
      this.currentReader.abort();
    }
    this.abortController.abort();
    console.warn(`${this.READER_NAME} Skaitymas nutrauktas`);
  }

  _validateFile(file) {
    // ... (liks toks pats kaip jūsų originaliame kode) ...
  }

  _cleanup() {
    this.currentReader = null;
    this.abortController = new AbortController();
  }

  onProgress(callback) {
    this.events.addEventListener('progress', callback);
  }

  offProgress(callback) {
    this.events.removeEventListener('progress', callback);
  }
}
