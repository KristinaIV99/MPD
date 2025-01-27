// word-counter.js

export class WordCounter {
  countWords(text) {
    // Išvalome tekstą nuo specialių simbolių, paliekame tik žodžius ir tarpus
    const cleanText = text.replace(/[^\w\s]/g, ' ');
    
    // Pašaliname perteklinius tarpus
    const withoutExtraSpaces = cleanText.replace(/\s+/g, ' ').trim();
    
    // Suskaičiuojame žodžius (suskaldom tekstą pagal tarpus)
    const wordCount = withoutExtraSpaces.split(' ').length;
    
    return wordCount;
  }
}
