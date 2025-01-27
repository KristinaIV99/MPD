// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  // Privatus metodas teksto išvalymui
  _cleanText(text) {
    return text
      .replace(/[^a-zA-Z\s]/g, ' ')  // Paliekame tik raides ir tarpus
      .replace(/\s+/g, ' ')          // Pakeičiame kelis tarpus vienu
      .trim()                        // Pašaliname tarpus pradžioje ir gale
      .toLowerCase();                // Konvertuojame į mažąsias raides
  }

  // Privatus metodas žodžių gavimui
  _getWords(text) {
    const cleanText = this._cleanText(text);
    return cleanText.split(' ').filter(word => word.length > 0);
  }

  countWords(text) {
    const words = this._getWords(text);
    const count = words.length;
    console.log(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${count}`);
    return {
      totalWords: count,
      words: words // Perduodame žodžių masyvą statistikai
    };
  }

  getWordStatistics(words) {
    // Skaičiuojame žodžių pasikartojimus
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    return {
      totalWords: words.length,
      uniqueWords: Object.keys(wordFrequency).length,
      mostCommon: Object.entries(wordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    };
  }
}
