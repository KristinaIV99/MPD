// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  countWords(text) {
    // Išvalome tekstą nuo specialių simbolių ir skaičiuojame žodžius
    const cleanText = text.replace(/[^\w\s]/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
    
    const wordCount = cleanText.split(' ').length;
    
    console.log(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${wordCount}`);
    return wordCount;
  }
}
