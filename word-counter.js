
// word-counter.js
export class WordCounter {
  constructor() {
    this.COUNTER_NAME = '[WordCounter]';
  }

  _cleanText(text) {
    // Patikriname teksto ilgį prieš apdorojimą
    console.log(`${this.COUNTER_NAME} Gautas tekstas, ilgis:`, text.length);
    
    // Pašaliname visus skyrybos ženklus ir specialius simbolius
    const cleanText = text
      .replace(/["""«»]/g, ' ')                          // Pašaliname kabutes (", ", «, »)
      .replace(/[?!…]/g, ' ')                            // Pašaliname klaustuką, šauktuką, daugtaškį
      .replace(/[.,;:{}=()\[\]\/\\@#$%^&*+~`|]/g, ' ')   // Pašaliname kablelius ir kitus skyrybos ženklus, išskyrus brūkšnelį tarp žodžių
      .replace(/[.,\/#!$%\^&\*;:{}=_`~()«»\d]/g, ' ')    // Pašaliname skyrybos ženklus ir skaičius
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
      // Patvirtina, kad žodis turi bent vieną švedišką raidę ir gali turėti brūkšnelį
      .filter(word => /^[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]+(-[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]+)*('?[a-zA-ZåäöÅÄÖéèêëîïûüÿçÉÈÊËÎÏÛÜŸÇ]*)*$/.test(word));

    console.log(`${this.COUNTER_NAME} Rasta žodžių:`, words.length);
    console.log(`${this.COUNTER_NAME} Pirmi 20 žodžių:`, words.slice(0, 20));
    console.log(`${this.COUNTER_NAME} Paskutiniai 20 žodžių:`, words.slice(-20));
    return words;
  }

  countWords(text) {
    try {
      console.log(`${this.COUNTER_NAME} Pradedamas žodžių skaičiavimas tekstui, ilgis:`, text.length);
      const words = this._getWords(text);
      const count = words.length;
      console.log(`${this.COUNTER_NAME} Baigtas skaičiavimas, rasta žodžių:`, count);
      return {
        totalWords: count,
        words: words
      };
    } catch (error) {
      console.error(`${this.COUNTER_NAME} Klaida skaičiuojant žodžius:`, error);
      throw error;
    }
  }
}

  getWordStatistics(words) {
    const wordFrequency = {};
    
    // Skaičiuojame kiekvieno žodžio pasikartojimus
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Rūšiuojame visus žodžius pagal dažnumą
    const sortedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a);
    
    // Spausdiname statistiką konsolėje
    console.log(`\n${this.COUNTER_NAME} STATISTIKA:`);
    console.log(`Iš viso žodžių: ${words.length}`);
    console.log(`Unikalių žodžių: ${sortedWords.length}`);
    
    // Spausdiname dažniausiai pasitaikančius žodžius
    console.log(`\n${this.COUNTER_NAME} 500 DAŽNIAUSIŲ ŽODŽIŲ:`);
    console.log('Nr. | Žodis                | Kiek kartų');
    console.log('-'.repeat(45));
    sortedWords.slice(0, 500).forEach(([word, count], index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')} | ${word.padEnd(20, ' ')} | ${count}`);
    });

    // Spausdiname visus unikalius žodžius
    console.log(`\n${this.COUNTER_NAME} VISI UNIKALŪS ŽODŽIAI:`);
    console.log('Nr. | Žodis');
    console.log('-'.repeat(30));
    sortedWords.forEach(([word], index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')} | ${word}`);
    });

    return {
      totalWords: words.length,
      uniqueWords: sortedWords.length,
      mostCommon: sortedWords.slice(0, 500)
    };
  }
}
