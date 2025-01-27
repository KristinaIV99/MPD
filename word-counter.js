export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  countWords(text) {
    try {
      // Pašaliname specialius simbolius ir perteklinius tarpus
      const cleanText = text.replace(/[^\w\s]/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();
      
      // Išskaidome tekstą į žodžius
      const words = cleanText.split(' ');
      
      // Filtruojame tuščius elementus ir skaičiuojame
      const wordCount = words.filter(word => word.length > 0).length;
      
      console.debug(`${this.COUNTER_NAME} Suskaičiuota žodžių: ${wordCount}`);
      
      return {
        totalWords: wordCount,
        text: text
      };
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida skaičiuojant žodžius:`, error);
      throw error;
    }
  }

  getWordStatistics(text) {
    const words = text.toLowerCase()
                     .replace(/[^\w\s]/g, ' ')
                     .split(/\s+/)
                     .filter(word => word.length > 0);
    
    // Skaičiuojame žodžių pasikartojimus
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Rūšiuojame pagal dažnumą
    const sortedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalWords: words.length,
      uniqueWords: Object.keys(wordFrequency).length,
      mostCommonWords: sortedWords,
      averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length
    };
  }
}
