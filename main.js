import { TextReader } from './text-reader.js';
import { WordCounter } from './word-counter.js';
import { PhraseReader } from './phrase-reader.js';
import { WordReader } from './word-reader.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { HtmlConverter } from './html-converter.js';

class App {
  constructor() {
	  this.APP_NAME = '[App]';
      this.reader = new TextReader();
      this.counter = new WordCounter();
      this.phraseReader = new PhraseReader();
      this.wordReader = new WordReader();
      this.unknownWordsExporter = new UnknownWordsExporter();
      this.htmlConverter = new HtmlConverter(this.wordReader, this.phraseReader);

      // Inicializuojame PhraseReader
      this.phraseReader.initialize().catch(error => {
          console.error(`${this.APP_NAME} Klaida inicializuojant PhraseReader:`, error);
      });
      
      // Inicializuojame WordReader ir nustatome žinomus žodžius į WordCounter
	  this.wordReader.initialize()
        .then(() => {
          this.counter.setKnownWords(this.wordReader);
          console.log(`${this.APP_NAME} Žinomi žodžiai nustatyti:`, this.counter.knownWords.size);
        })
        .catch(error => {
          console.error(`${this.APP_NAME} Klaida inicializuojant WordReader:`, error);
        });

      this.unknownWordsExporter.initialize().catch(error => {
          console.error(`${this.APP_NAME} Klaida inicializuojant UnknownWordsExporter:`, error);
      });

		console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
		this.initUI();
		this.bindEvents();
		this.isProcessing = false;
	}

  initUI() {
    this.fileInput = document.getElementById('fileInput');
    this.exportButton = document.getElementById('exportUnknownWords');
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
    this.exportButton.addEventListener('click', () => this.handleExport());
    this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
    console.log(`${this.APP_NAME} Event listeners prijungti`);
  }

  async handleExport() {
      const text = this.content.textContent;
      if (!text) {
        console.warn(`${this.APP_NAME} Nėra teksto eksportavimui`);
        return;
      }

      this.unknownWordsExporter.processText(text);
      this.unknownWordsExporter.exportToTxt();
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
      this.exportButton.disabled = true;
      this.showLoadingState();
      const file = e.target.files[0];
      if(!file) {
        console.warn(`${this.APP_NAME} Nepasirinktas failas`);
        return;
      }
      console.log(`${this.APP_NAME} Apdorojamas failas: ${file.name}`);
      const text = await this.reader.readFile(file);
      console.log(`${this.APP_NAME} Failas sėkmingai nuskaitytas`);
      
      this.exportButton.disabled = false;
      
      // Skaičiuojame žodžius ir gauname statistiką
      console.log(`${this.APP_NAME} Pradedamas žodžių skaičiavimas`);
      const wordCount = this.counter.countWords(text);
      const stats = this.counter.getWordStatistics(wordCount.words);
      console.log(`${this.APP_NAME} Žodžių suskaičiuota:`, wordCount.totalWords);
      console.log(`${this.APP_NAME} Statistika:`, stats);

      // Atnaujiname UI
      this.updateWordCount(wordCount, stats);
      

      // ANTRA: Ieškome frazių
      const phraseResults = this.phraseReader.processText(text);
      console.log(`${this.APP_NAME} Rastos frazės:`, phraseResults.phrases);

      // TREČIA: Ieškome pavienių žodžių
      const wordResults = this.wordReader.processText(text);
      console.log(`${this.APP_NAME} Rasti žodžiai:`, wordResults.words);

      this.setContent(text, phraseResults.phrases, wordResults.words);
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

  updateWordCount(count, stats) {
      // Išvalome seną turinį
      this.wordCount.textContent = '';
      
      const elements = [
        { text: `Žodžių skaičius: ${count.totalWords}` },
        { text: `Unikalių žodžių: ${stats.uniqueWords}` },
        { text: `Nežinomų žodžių: ${stats.unknownWords || 0}` }
      ];

      elements.forEach(element => {
        const div = document.createElement('div');
        div.textContent = element.text;
        this.wordCount.appendChild(div);
      });
    
      console.log(`${this.APP_NAME} Atnaujinta žodžių statistika`);
    }

  async setContent(text, phrases = [], words = []) {  
    try {
        console.log(`${this.APP_NAME} Pradedama HTML konversija`);
        
        // Konvertuojame į HTML naudodami HtmlConverter
        let htmlContent = await this.htmlConverter.convertToHtml(text);
        
        // Žymime frazes
        if (phrases.length > 0) {
            console.log(`${this.APP_NAME} Pradedamas frazių žymėjimas`);
            htmlContent = await this.htmlConverter.markPhrases(htmlContent, phrases);
            console.log(`${this.APP_NAME} Frazių žymėjimas baigtas`);
        }
        
        // Žymime žodžius
        if (words.length > 0) {
            console.log(`${this.APP_NAME} Pradedamas žodžių žymėjimas`);
            htmlContent = await this.htmlConverter.markWords(htmlContent, words);
            console.log(`${this.APP_NAME} Žodžių žymėjimas baigtas`);
        }
        
        const div = document.createElement('div');
        div.className = 'text-content';
        // Vietoj textContent naudojame innerHTML
        div.innerHTML = htmlContent;
        
        // Jei yra rastų frazių, išvedame jas į konsolę
        if (phrases.length > 0) {
            console.log(`${this.APP_NAME} Rastos frazės tekste:`, 
                phrases.map(p => ({
                    text: p.text,
                    pozicija: `${p.start}-${p.end}`,
                    tipas: p.type
                }))
            );
        }
        
        // Jei yra rastų žodžių, išvedame juos į konsolę
        if (words.length > 0) {
            console.log(`${this.APP_NAME} Rasti žodžiai tekste:`, 
                words.map(w => ({
                    text: w.text,
                    pozicija: `${w.start}-${w.end}`,
                    tipas: w.type
                }))
            );
        }
        
        this.content.replaceChildren(div);
        console.log(`${this.APP_NAME} HTML konversija baigta`);
    } catch (error) {
        console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
        this.handleError(error);
    }
  }

  handleError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Klaida: ${error.message}`;
    this.content.replaceChildren(errorDiv);
  }

  updateProgress({ percent }) {
    this.progressBar.style.transition = 'width 0.3s ease'; // Pridedame sklandų perėjimą
    this.progressBar.style.width = `${percent}%`;
    
    if (percent >= 100) {
      setTimeout(() => {
        this.progressBar.style.transition = 'none'; // Išjungiam perėjimą resetui
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
