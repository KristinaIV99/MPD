// word-counter.js
console.log('WordCounter modulis užkrautas');

export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
    console.log(`${this.COUNTER_NAME} Sukurtas`);
  }

  countWords(text) {
    console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas`);
    console.log(`${this.COUNTER_NAME} Gautas tekstas:`, text.slice(0, 100) + '...'); // Parodys pirmus 100 simbolių
    
    // Išvalome tekstą nuo specialių simbolių ir skaičiuojame žodžius
    const cleanText = text.replace(/[^\w\s]/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
    
    const wordCount = cleanText.split(' ').length;
    
    console.log(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${wordCount}`);
    return wordCount;
  }
}
