import { TextReader } from './text-reader.js';
import { WordCounter } from './word-counter.js';
import { PhraseReader } from './phrase-reader.js';
import { WordReader } from './word-reader.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { HtmlConverter } from './html-converter.js';

class App {
  constructor() {
    this.APP_NAME = '[App]';
    this.initComponents();
    this.initUI();
    this.bindEvents();
    this.isProcessing = false;
    console.log(`${this.APP_NAME} Inicializuota`);
  }

  initComponents() {
    this.reader = new TextReader();
    this.counter = new WordCounter();
    this.phraseReader = new PhraseReader();
    this.wordReader = new WordReader();
    this.unknownExporter = new UnknownWordsExporter();
    this.htmlConverter = new HtmlConverter();

    this.initializeServices()
      .then(() => console.log(`${this.APP_NAME} Visi servisai inicijuoti`))
      .catch(error => this.showFatalError(error));
  }

  async initializeServices() {
    try {
      await Promise.all([
        this.phraseReader.initialize(),
        this.wordReader.initialize(),
        this.unknownExporter.initialize()
      ]);
      
      this.counter.setKnownWords(this.wordReader.knownWords);
      console.log(`${this.APP_NAME} Žinomi žodžiai:`, this.wordReader.knownWords.size);
      console.log(`${this.APP_NAME} Žinomos frazės:`, this.phraseReader.phrases.size);
      
    } catch (error) {
      console.error(`${this.APP_NAME} Kritinė inicializacijos klaida:`, error);
      throw error;
    }
  }

  initUI() {
    this.ui = {
      fileInput: document.getElementById('fileInput'),
      exportBtn: document.getElementById('exportUnknownWords'),
      content: document.getElementById('content'),
      progress: document.createElement('div'),
      status: document.createElement('div'),
      wordStats: document.createElement('div')
    };

    this.ui.progress.className = 'progress-bar';
    this.ui.status.className = 'status-message';
    this.ui.wordStats.className = 'word-stats';
    
    document.body.prepend(
      this.ui.progress,
      this.ui.status,
      this.ui.wordStats
    );
  }

  bindEvents() {
    this.ui.fileInput.addEventListener('change', e => this.handleFile(e));
    this.ui.exportBtn.addEventListener('click', () => this.handleExport());
    this.reader.events.addEventListener('progress', e => this.updateProgress(e.detail));
  }

  async handleFile(e) {
    if (this.isProcessing) {
      console.warn(`${this.APP_NAME} Atšaukiama esama operacija`);
      this.reader.abort();
    }

    try {
      this.startProcessing();
      const file = e.target.files[0];
      if (!file) return;

      const text = await this.reader.readFile(file);
      const stats = this.processTextStatistics(text);
      const phrases = this.phraseReader.findPhrases(text);
      
      this.updateStatisticsDisplay(stats);
      await this.displayContent(text, phrases);

    } catch (error) {
      this.handleError(error);
    } finally {
      this.finishProcessing();
    }
  }

  processTextStatistics(text) {
    const stats = this.counter.countWords(text);
    console.log(`${this.APP_NAME} Statistika:`, stats);
    return stats;
  }

  async displayContent(text, phrases) {
    try {
      let htmlContent = await this.htmlConverter.convertToHtml(text);
      
      if (phrases.length > 0) {
        htmlContent = await this.htmlConverter.markPhrases(htmlContent, phrases);
        console.log(`${this.APP_NAME} Pažymėtos frazės:`, phrases.length);
      }

      this.renderContent(htmlContent);
      
    } catch (error) {
      throw new Error(`HTML konversijos klaida: ${error.message}`);
    }
  }

  renderContent(html) {
    const container = document.createElement('div');
    container.className = 'content-wrapper';
    container.innerHTML = html;
    this.ui.content.replaceChildren(container);
  }

  updateStatisticsDisplay({ totalWords, uniqueWords, unknownWords }) {
    this.ui.wordStats.innerHTML = `
      <div class="stat-item">Viso žodžių: ${totalWords}</div>
      <div class="stat-item">Unikalūs: ${uniqueWords}</div>
      <div class="stat-item">Nežinomi: ${unknownWords}</div>
    `;
  }

  updateProgress({ percent }) {
    this.ui.progress.style.width = `${percent}%`;
    if (percent >= 100) {
      setTimeout(() => this.ui.progress.style.width = '0%', 500);
    }
  }

  async handleExport() {
    if (!this.ui.content.textContent.trim()) {
      this.showWarning('Nėra teksto eksportavimui');
      return;
    }
    this.unknownExporter.exportToTxt(this.ui.content.textContent);
  }

  startProcessing() {
    this.isProcessing = true;
    this.ui.fileInput.disabled = true;
    this.ui.content.innerHTML = '<div class="loading">Kraunama...</div>';
  }

  finishProcessing() {
    this.isProcessing = false;
    this.ui.fileInput.disabled = false;
    this.ui.fileInput.value = '';
  }

  showFatalError(error) {
    this.ui.status.innerHTML = `
      <div class="error fatal">
        <h3>Kritinė klaida</h3>
        <p>${error.message}</p>
        <p>Perkraukite puslapį</p>
      </div>
    `;
  }

  handleError(error) {
    console.error(`${this.APP_NAME} Klaida:`, error);
    this.ui.content.innerHTML = `
      <div class="error">
        <h3>Operacijos klaida</h3>
        <p>${error.message}</p>
      </div>
    `;
  }

  showWarning(message) {
    this.ui.status.innerHTML = `<div class="warning">⚠️ ${message}</div>`;
    setTimeout(() => this.ui.status.innerHTML = '', 3000);
  }
}

// Paleidimas
window.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new App();
    console.log('[Main] Aplikacija parengta');
  } catch (error) {
    document.body.innerHTML = `<div class="error">Nepavyko paleisti aplikacijos: ${error.message}</div>`;
  }
});
