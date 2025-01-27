// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  _cleanText(text) {
    // Pašaliname visus skyrybos ženklus ir specialius simbolius
    const cleanText = text
      .replace(/[.,\/#!$%\^&\*;:{}=_`~()«»\d]/g, ' ') // Pašaliname skyrybos ženklus ir skaičius
      .replace(/\s+/g, ' ')                              // Pakeičiame visus tarpus į vieną tarpą
      .trim()                                            // Pašaliname tarpus pradžioje ir gale
      .toLowerCase();                                    // Konvertuojame į mažąsias raides

    // Parodome pavyzdį konsolėje debugginimui
    console.log(`${this.COUNTER_NAME} Teksto pavyzdys po valymo:`, cleanText.slice(0, 100));
    return cleanText;
  }

  _getWords(text) {
    const cleanText = this._cleanText(text);
    const words = cleanText
      .split(' ')
      .filter(word => word.length > 0)
      // Atnaujintas regex, kad įtrauktų švedų kalbos raides
      .filter(word => /[a-zA-ZåäöÅÄÖ]/.test(word));

    console.log(`${this.COUNTER_NAME} Pavyzdys žodžių:`, words.slice(0, 20));
    return words;
  }

  countWords(text) {
    const words = this._getWords(text);
    const count = words.length;
    
    return {
      totalWords: count,
      words: words
    };
  }

  getWordStatistics(words) {
    // Skaičiuojame žodžių pasikartojimus
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

	const mostCommon = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
      
    console.log(`${this.COUNTER_NAME} 10 vanligaste orden:`, // "10 dažniausių žodžių" švediškai
      mostCommon.map(([word, count]) => `${word}: ${count}`));

    return {
      totalWords: words.length,
      uniqueWords: Object.keys(wordFrequency).length,
      mostCommon
    };
  }
}
