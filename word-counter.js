
// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
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

      console.log(`${this.COUNTER_NAME} Rasta žodžių:`, words.length);
      console.log(`${this.COUNTER_NAME} Pirmi 20 žodžių:`, words.slice(0, 20));
      console.log(`${this.COUNTER_NAME} Paskutiniai 20 žodžių:`, words.slice(-20));
      
      return words;
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida gaunant žodžius:`, error);
      throw error;
    }
  }

  countWords(text) {
    try {
      console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas tekstui, ilgis:`, text.length);
      
      // Skaidome tekstą į mažesnes dalis jei jis per didelis
      const CHUNK_SIZE = 500000; // ~500KB teksto
      let totalWords = [];
      
      if (text.length > CHUNK_SIZE) {
        console.log(`${this.COUNTER_NAME} Tekstas didelis, skaidome į dalis`);
        
        // Skaidome tekstą į dalis
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
          const chunk = text.slice(i, i + CHUNK_SIZE);
          const chunkWords = this._getWords(chunk);
          totalWords = totalWords.concat(chunkWords);
          console.log(`${this.COUNTER_NAME} Apdorota ${Math.round((i + CHUNK_SIZE) / text.length * 100)}%`);
        }
      } else {
        totalWords = this._getWords(text);
      }

      console.log(`${this.COUNTER_NAME} Baigtas skaičiavimas, rasta žodžių:`, totalWords.length);
      
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
      let processed = 0;
      const total = words.length;
      
      // Apdorojame žodžius dalimis
      const BATCH_SIZE = 10000;
      for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);
        batch.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
        processed += batch.length;
        console.log(`${this.COUNTER_NAME} Statistika: ${Math.round(processed/total * 100)}%`);
      }

      const sortedWords = Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a);

      // Spausdiname statistiką konsolėje
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
