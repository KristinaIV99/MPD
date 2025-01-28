
// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';

    // Nustatome chunk dydį pagal įrenginį
    if (window.navigator.userAgent.toLowerCase().includes('mobile')) {
      this.CHUNK_SIZE = 100000;  // 100KB telefonams
      this.BATCH_SIZE = 5000;
      console.log(`${this.COUNTER_NAME} Nustatytas telefono režimas`);
    } else if (window.navigator.userAgent.toLowerCase().includes('tablet')) {
      this.CHUNK_SIZE = 500000;  // 500KB planšetėms
      this.BATCH_SIZE = 10000;
      console.log(`${this.COUNTER_NAME} Nustatytas planšetės režimas`);
    } else {
      this.CHUNK_SIZE = 1000000; // 1MB kompiuteriams
      this.BATCH_SIZE = 20000;
      console.log(`${this.COUNTER_NAME} Nustatytas kompiuterio režimas`);
    }
  }

  _cleanText(text) {
    try { // PRIDĖTA: try bloko pradžia
      // Patikriname teksto ilgį prieš apdorojimą
      console.log(`${this.COUNTER_NAME} Gautas tekstas, ilgis:`, text.length);
      
      // Pašaliname visus skyrybos ženklus ir specialius simbolius
      const cleanText = text
        .replace(/["""«»]/g, ' ')                          
        .replace(/[?!…]/g, ' ')                            
        .replace(/[.,;:{}=()\[\]\/\\@#$%^&*+~`|]/g, ' ')   
        .replace(/[.,\/#!$%\^&\*;:{}=_`~()«»\d]/g, ' ')    
        .replace(/\s+/g, ' ')                              
        .trim()                                            
        .toLowerCase();                                    

      // Parodome pavyzdį konsolėje debugginimui
      console.log(`${this.COUNTER_NAME} Teksto pavyzdys po valymo:`, cleanText.slice(0, 100));
      return cleanText;
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida valant tekstą:`, error);
      throw error;
    }
  }

  _getWords(text) {
    try {
      const cleanText = this._cleanText(text);
      const words = cleanText
        .split(' ')
        .filter(word => word.length > 0)
        .filter(word => /^[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]+(-[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]+)*('?[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]*)*$/.test(word));
      
      console.log(`${this.COUNTER_NAME} Rasta žodžių šioje dalyje:`, words.length);
      return words;
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida gaunant žodžius:`, error);
      throw error;
    }
  }

  async countWords(text) {
    try {
      console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas tekstui, ilgis:`, text.length);
      let totalWords = [];
      
      if (text.length > this.CHUNK_SIZE) {
        console.log(`${this.COUNTER_NAME} Tekstas didelis, skaidome į dalis po ${this.CHUNK_SIZE/1024}KB`);
        
        for (let i = 0; i < text.length; i += this.CHUNK_SIZE) {
          const chunk = text.slice(i, Math.min(i + this.CHUNK_SIZE, text.length));
          const chunkWords = this._getWords(chunk);
          totalWords = totalWords.concat(chunkWords);
          
          const progress = Math.min(100, Math.round((i + this.CHUNK_SIZE) / text.length * 100));
          console.log(`${this.COUNTER_NAME} Apdorota ${progress}%`);
          
          // Pašaliname "await" ir setTimeout
        }
      } else {
        totalWords = this._getWords(text);
      }
  
      return {
        totalWords: totalWords.length,
        words: totalWords
      };
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida skaičiuojant žodžius:`, error);
      throw error;
    }
  }

  getWordStatistics(words) {
    try {
      const wordFrequency = {};
      
      // Skaičiuojame kiekvieno žodžio pasikartojimus
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });

      const sortedWords = Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a);

      // Spausdiname statistiką
      console.log(`\n${this.COUNTER_NAME} STATISTIKA:`);
      console.log(`Iš viso žodžių: ${words.length}`);
      console.log(`Unikalių žodžių: ${sortedWords.length}`);
      
      // Spausdiname dažniausiai pasitaikančius žodžius
      console.log(`\n${this.COUNTER_NAME} 500 DAŽNIAUSIŲ ŽODŽIŲ:`);
      console.log('Nr. | Žodis                | Kiek kartų');
      console.log('-'.repeat(45));
      sortedWords.slice(0, 500).forEach(([word, count], index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')} | ${word.padEnd(20, ' ')} | ${count}`);
      });

      // Spausdiname visus unikalius žodžius
      console.log(`\n${this.COUNTER_NAME} VISI UNIKALŪS ŽODŽIAI:`);
      console.log('Nr. | Žodis');
      console.log('-'.repeat(30));
      sortedWords.forEach(([word], index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')} | ${word}`);
      });

      return {
        totalWords: words.length,
        uniqueWords: sortedWords.length,
        mostCommon: sortedWords
      };
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida ruošiant statistiką:`, error);
      throw error;
    }
  }
}
