export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
    this.knownWords = new Set(); // Pridėta: žinomų žodžių saugykla
    console.log(`${this.COUNTER_NAME} Inicializuotas`);
  }

  // Pridėtas naujas metodas žinomų žodžių nustatymui
  setKnownWords(wordReader) {
    if (!wordReader || !wordReader.wordsMap) {
      console.warn(`${this.COUNTER_NAME} Nepateiktas žodžių skaičius arba jis tuščias`);
      return;
    }
    this.knownWords = new Set(Array.from(wordReader.wordsMap.keys()));
    console.log(`${this.COUNTER_NAME} Nustatyti žinomi žodžiai:`, this.knownWords.size);
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
      const unknownWords = new Set(); // Pridėta: nežinomų žodžių saugykla
      
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        
        // Tikriname ar žodis yra žinomas
        if (!this.knownWords.has(word)) {
          unknownWords.add(word);
        }
      });

      const sortedWords = Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a);

      // Sudarome nežinomų žodžių statistiką
      const unknownWordsArray = Array.from(unknownWords);
      const unknownWordsWithFrequency = unknownWordsArray.map(word => ({
        word,
        frequency: wordFrequency[word]
      })).sort((a, b) => b.frequency - a.frequency);

      console.log(`\n${this.COUNTER_NAME} STATISTIKA:`);
      console.log(`Iš viso žodžių: ${words.length}`);
      console.log(`Unikalių žodžių: ${sortedWords.length}`);
      console.log(`Nežinomų žodžių: ${unknownWords.size}`);
      console.log(`Žinomų žodžių: ${this.knownWords.size}`);
      
      return {
        totalWords: words.length,
        uniqueWords: sortedWords.length,
        knownWords: this.knownWords.size,
        unknownWords: unknownWords.size,
        unknownWordsDetails: unknownWordsWithFrequency,
        mostCommon: sortedWords
      };
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida ruošiant statistiką:`, error);
      throw error;
    }
  }
}
