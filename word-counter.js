export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
    console.log(`${this.COUNTER_NAME} Inicializuotas`);
  }

  _cleanText(text) {
    try {
      console.log(`${this.COUNTER_NAME} Gautas tekstas, ilgis:`, text.length);
      
      const cleanText = text
        .replace(/["""«»]/g, ' ')                          
        .replace(/[?!…]/g, ' ')                            
        .replace(/[.,;:{}=()\[\]\/\\@#$%^&*+~`|]/g, ' ')   
        .replace(/[.,\/#!$%\^&\*;:{}=_`~()«»\d]/g, ' ')    
        .replace(/\s+/g, ' ')                              
        .trim()                                            
        .toLowerCase();

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
      return words;
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida gaunant žodžius:`, error);
      throw error;
    }
  }

  countWords(text) {
    try {
      console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas`);
      const totalWords = this._getWords(text);
      
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
      
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });

      const sortedWords = Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a);

      console.log(`\n${this.COUNTER_NAME} STATISTIKA:`);
      console.log(`Iš viso žodžių: ${words.length}`);
      console.log(`Unikalių žodžių: ${sortedWords.length}`);
      
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
