import Logger from './logger.js';
import TextNormalizer from './text-normalizer.js';
import TextReader from './text-reader.js';

const logger = new Logger('Main');
const normalizer = new TextNormalizer(logger);

class App {
  constructor() {
    this.logger = new Logger('App');
    this.reader = new TextReader({ logger: this.logger });
    
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
        this.logger.warn('Atšaukiama esama užklausa...');
        this.reader.abort();
      }

      this.logger.debug('Pradedamas naujo failo apdorojimas');
      this.isProcessing = true;
      this.fileInput.disabled = true;
      this.showLoadingState();

      const file = e.target.files[0];
      if(!file) {
        this.logger.warn('Nepasirinktas failas');
        return;
      }

      this.logger.debug(`Apdorojamas failas: ${file.name}`);
      const text = await this.reader.readFile(file);
      this.logger.debug('Failas sėkmingai nuskaitytas');
      this.setContent(text);
      this.logger.debug('Teksto turinys sėkmingai įkeltas');

    } catch(error) {
      this.logger.error('Failo apdorojimo klaida:', error);
      this.handleError(error);
    } finally {
      this.logger.debug('Baigiamas failo apdorojimas');
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
  window.app = new App();
});
