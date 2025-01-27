import { TextNormalizer } from './text-normalizer.js';
import { TextReader } from './text-reader.js';
import { WordCounter } from './word-counter.js';

class App {
  constructor() {
    this.APP_NAME = '[App]';
    this.reader = new TextReader();
    this.counter = new WordCounter();
    
    console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    this.initUI();
    this.bindEvents();
    this.isProcessing = false;
  }

  initUI() {
    this.fileInput = document.getElementById('fileInput');
    this.content = document.getElementById('content');
    this.wordCount = document.createElement('div');
    this.wordCount.className = 'word-count';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar';
    document.body.prepend(this.progressBar);
    document.body.prepend(this.wordCount);
    console.log(`${this.APP_NAME} UI elementai inicializuoti`);
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFile(e));
    this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
    console.log(`${this.APP_NAME} Event listeners prijungti`);
  }

  async handleFile(e) {
    try {
      if(this.isProcessing) {
        console.warn(`${this.APP_NAME} Atšaukiama esama užklausa...`);
        this.reader.abort();
      }
      console.log(`${this.APP_NAME} Pradedamas naujo failo apdorojimas`);
      this.isProcessing = true;
      this.fileInput.disabled = true;
      this.showLoadingState();
      const file = e.target.files[0];
      if(!file) {
        console.warn(`${this.APP_NAME} Nepasirinktas failas`);
        return;
      }
      console.log(`${this.APP_NAME} Apdorojamas failas: ${file.name}`);
      const text = await this.reader.readFile(file);
      console.log(`${this.APP_NAME} Failas sėkmingai nuskaitytas`);
      
      // Skaičiuojame žodžius
      console.log(`${this.APP_NAME} Pradedamas žodžių skaičiavimas`);
      const wordCount = this.counter.countWords(text);
      console.log(`${this.APP_NAME} Žodžių suskaičiuota:`, wordCount);
      
      // Atnaujiname žodžių skaičių UI
      this.updateWordCount(wordCount);
      
      this.setContent(text);
      console.log(`${this.APP_NAME} Teksto turinys sėkmingai įkeltas`);
    } catch(error) {
      console.error(`${this.APP_NAME} Failo apdorojimo klaida:`, error);
      this.handleError(error);
    } finally {
      console.log(`${this.APP_NAME} Baigiamas failo apdorojimas`);
      this.isProcessing = false;
      this.fileInput.disabled = false;
      this.fileInput.value = '';
      this.hideLoadingState();
    }
  }

  updateWordCount(count) {
    console.log(`${this.APP_NAME} Atnaujinamas žodžių skaičius:`, count);
    this.wordCount.textContent = `Žodžių skaičius: ${count}`;
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
  console.log('[Main] Aplikacija inicializuojama...');
  window.app = new App();
});
