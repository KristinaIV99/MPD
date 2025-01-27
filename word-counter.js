// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
    console.log(`${this.COUNTER_NAME} Sukurtas`);
  }

  countWords(text) {
    console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas`);
    
    // Pašaliname specialius simbolius ir perteklinius tarpus
    const cleanText = text
      // Pakeičiame naujų eilučių simbolius tarpais
      .replace(/\n/g, ' ')
      // Pašaliname Unicode tarpus ir specialius simbolius
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g, ' ')
      // Pakeičiame kelis tarpus vienu
      .replace(/\s+/g, ' ')
      // Pašaliname tarpus pradžioje ir pabaigoje
      .trim();
    
    // Skaičiuojame žodžius (tik realius žodžius, ne tuščius tarpus)
    const words = cleanText.split(' ').filter(word => word.length > 0);
    const wordCount = words.length;
    
    console.log(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${wordCount}`);
    
    // Patikriname pirmus kelis žodžius (debugginimui)
    console.log(`${this.COUNTER_NAME} Pirmi 5 žodžiai:`, words.slice(0, 5));
    
    return wordCount;
  }
}
