import { TextReader } from './text-reader.js';
import Logger from './logger.js' // Default export
import { LOG_LEVELS } from './logger.js' // Named export
import purify from './vendor/purify.es.mjs';
const DOMPurify = purify(window);

class App {
  constructor() {
    this.logger = new Logger('App');
    this.reader = new TextReader({
      logger: this.logger
    });
    
    this.initUI();
    this.bindEvents();
    this.isProcessing = false; // Naujas loading state
  }

  initUI() {
    this.fileInput = document.getElementById('fileInput');
    this.content = document.getElementById('content');
    this.progressBar = document.createElement('div'); // Progress bar elementas
    this.progressBar.className = 'progress-bar';
    document.body.prepend(this.progressBar);
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFile(e));
    this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
  }

  async handleFile(e) {
    try {
      // 1. Atšaukti esamą užklausą
      if(this.isProcessing) {
        this.reader.abort();
        this.logger.warn('Atšaukiama esama užklausa...');
      }

      // 2. Nustatyti loading state
      this.isProcessing = true;
      this.fileInput.disabled = true;
      this.showLoadingState();

      // 3. Apdoroti failą
      const file = e.target.files[0];
      if (!file) return;

      const html = await this.reader.readFile(file);
      this.setSafeContent(html);

    } catch (error) {
      this.handleError(error);
    } finally {
      // 4. Atstatyti būseną
      this.isProcessing = false;
      this.fileInput.disabled = false;
      this.fileInput.value = ''; // Reset input
      this.hideLoadingState();
    }
  }

  setSafeContent(html) {
    // Saugus HTML įterpimas
    this.content.innerHTML = DOMPurify.sanitize(html, {
      ADD_TAGS: ['markdown'], // Leidžiami papildomi tagai
      ADD_ATTR: ['data-md'] // Leidžiami papildomi atributai
    });
  }

  handleError(error) {
    this.logger.error('File reading error:', error);
    
    // Saugus klaidos pranešimas
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Klaida: ${error.message}`; // Vietoj innerHTML
    
    this.content.replaceChildren(errorDiv);
  }

  updateProgress({ percent }) {
    this.logger.log(`Progress: ${percent}%`);
    this.progressBar.style.width = `${percent}%`;
    
    // Automatinis progreso baro dingimas
    if(percent >= 100) {
      setTimeout(() => {
        this.progressBar.style.width = '0%';
      }, 500);
    }
  }

  showLoadingState() {
    this.content.innerHTML = DOMPurify.sanitize(`
      <div class="loading">
        <div class="spinner"></div>
        <p>Kraunama...</p>
      </div>
    `);
  }

  hideLoadingState() {
    const loader = this.content.querySelector('.loading');
    if(loader) loader.remove();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
