export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
    console.log(`${this.COUNTER_NAME} Sukurtas`);
  }

  countWords(text) {
    console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas`);
    
    const cleanText = text
      .replace(/\n/g, ' ')
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ').filter(word => word.length > 0);
    const wordCount = words.length;
    
    console.log(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${wordCount}`);
    console.log(`${this.COUNTER_NAME} Pirmi 5 žodžiai:`, words.slice(0, 5));
    
    return wordCount;
  } // Fixed: Added closing brace for countWords()

  getWordStatistics(text) { // Fixed: Now a separate method
    const words = text
      .toLowerCase()
      .replace(/\n/g, ' ')
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);

    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    const mostCommon = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    console.log(`${this.COUNTER_NAME} Statistika:`);
    console.log(`- Viso žodžių: ${words.length}`);
    console.log(`- Unikalių žodžių: ${Object.keys(wordFrequency).length}`);
    console.log('- Dažniausi žodžiai:');
    mostCommon.forEach(([word, count]) => {
      console.log(`  ${word}: ${count} kartų`);
    });

    return {
      totalWords: words.length,
      uniqueWords: Object.keys(wordFrequency).length,
      mostCommon
    };
  }
}
