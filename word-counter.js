// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  _cleanText(text) {
    // Pašaliname visus skyrybos ženklus ir specialius simbolius
    const cleanText = text
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»\d]/g, ' ') // Pašaliname skyrybos ženklus ir skaičius
      .replace(/\s+/g, ' ')                              // Pakeičiame visus tarpus į vieną tarpą
      .trim()                                            // Pašaliname tarpus pradžioje ir gale
      .toLowerCase();                                    // Konvertuojame į mažąsias raides

    // Parodome pavyzdį konsolėje debugginimui
    console.log(`${this.COUNTER_NAME} Teksto pavyzdys po valymo:`, cleanText.slice(0, 100));
    
    return cleanText;
  }

  _getWords(text) {
    const cleanText = this._cleanText(text);
    return cleanText
      .split(' ')
      .filter(word => word.length > 0)     // Pašaliname tuščius elementus
      .filter(word => /[a-zA-Z]/.test(word)); // Paliekame tik žodžius su raidėmis
  }

  countWords(text) {
    const words = this._getWords(text);
    
    // Parodome pirmus kelis žodžius debugginimui
    console.log(`${this.COUNTER_NAME} Pirmi 10 žodžių:`, words.slice(0, 10));
    
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
