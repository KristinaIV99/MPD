console.log('TESTAS - main.js pradėjo veikti');
console.warn('TESTAS - įspėjimo pranešimas');
console.error('TESTAS - klaidos pranešimas');

import { TextNormalizer } from './text-normalizer.js';
import { TextReader } from './text-reader.js';

class App {
  constructor() {
    console.log('TESTAS - App klasė inicializuota');
    this.APP_NAME = '[App]';
    this.reader = new TextReader();
    
    this.initUI();
    this.bindEvents();
    this.isProcessing = false;
  }

  initUI() {
    this.fileInput = document.getElementById('fileInput');
    this.content = document.getElementById('content');
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar';
    document.body.prepend(this.progressBar);
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFile(e));
    this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
  }

  async handleFile(e) {
    try {
      if(this.isProcessing) {
        console.warn(`${this.APP_NAME} Atšaukiama esama užklausa...`);
        this.reader.abort();
      }
      console.debug(`${this.APP_NAME} Pradedamas naujo failo apdorojimas`);
      this.isProcessing = true;
      this.fileInput.disabled = true;
      this.showLoadingState();

      const file = e.target.files[0];
      if(!file) {
        console.warn(`${this.APP_NAME} Nepasirinktas failas`);
        return;
      }

      console.debug(`${this.APP_NAME} Apdorojamas failas: ${file.name}`);
      const text = await this.reader.readFile(file);
      console.debug(`${this.APP_NAME} Failas sėkmingai nuskaitytas`);
      this.setContent(text);
      console.debug(`${this.APP_NAME} Teksto turinys sėkmingai įkeltas`);
    } catch(error) {
      console.error(`${this.APP_NAME} Failo apdorojimo klaida:`, error);
      this.handleError(error);
    } finally {
      console.debug(`${this.APP_NAME} Baigiamas failo apdorojimas`);
      this.isProcessing = false;
      this.fileInput.disabled = false;
      this.fileInput.value = '';
      this.hideLoadingState();
    }
  }

  setContent(text) {
    const div = document.createElement('div');
    div.className = 'text-content';
    div.textContent = text;
    this.content.replaceChildren(div);
  }

  handleError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Klaida: ${error.message}`;
    this.content.replaceChildren(errorDiv);
  }

  updateProgress({ percent }) {
    this.progressBar.style.width = `${percent}%`;
    if(percent >= 100) {
      setTimeout(() => {
        this.progressBar.style.width = '0%';
      }, 500);
    }
  }

  showLoadingState() {
    const loader = document.createElement('div');
    loader.className = 'loading';
    const text = document.createElement('p');
    text.textContent = 'Kraunama...';
    loader.appendChild(text);
    this.content.replaceChildren(loader);
  }

  hideLoadingState() {
    const loader = this.content.querySelector('.loading');
    if(loader) loader.remove();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('TESTAS - DOMContentLoaded įvyko');
  window.app = new App();
  console.log('TESTAS - App sukurtas');
});
