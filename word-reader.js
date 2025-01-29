import { TextNormalizer } from './text-normalizer.js';

export class WordReader {
    constructor(options = {}) {
        this.READER_NAME = '[WordReader]';
        this.words = null;
        this.wordsMap = new Map();
        this.normalizer = new TextNormalizer();
        this.debug = options.debug || false;
    }

    async initialize() {
        try {
            console.log(`${this.READER_NAME} Pradedamas žodžių žodyno krovimas...`);
            console.time('wordLoad');
            
            const response = await fetch('words.json');
            if (!response.ok) {
                throw new Error(`Nepavyko užkrauti žodžių: ${response.statusText}`);
            }

            const text = await response.text();
            console.log(`${this.READER_NAME} Gautas žodyno tekstas, ilgis:`, text.length);
            
            try {
                this.words = JSON.parse(text);
                
                if (this.debug) {
                    const sample = Object.entries(this.words).slice(0, 5);
                    console.log(`${this.READER_NAME} Pavyzdiniai žodžiai:`, 
                        sample.map(([key, value]) => ({
                            zodis: key,
                            duomenys: value,
                            arTuriSkandinav: this.hasScandinavianLetters(key)
                        }))
                    );
                }

                this.preprocessWords();
                console.log(`${this.READER_NAME} Sėkmingai užkrauti ${Object.keys(this.words).length} žodžiai`);
                console.timeEnd('wordLoad');
            } catch (jsonError) {
                console.error(`${this.READER_NAME} Klaida apdorojant JSON:`, jsonError);
                throw jsonError;
            }
        } catch (error) {
            console.error(`${this.READER_NAME} Klaida inicializuojant:`, error);
            throw error;
        }
    }

    hasScandinavianLetters(text) {
        return /[åäöÅÄÖ]/.test(text);
    }

    createScandinavianRegex(word) {
        const regexPattern = word.toLowerCase();
        console.log(`${this.READER_NAME} Sukurtas regex šablonas žodžiui "${word}":`, regexPattern);
        
        return {
            originali: word,
            regex: regexPattern
        };
    }

    preprocessWords() {
        console.time('preprocess');
        
        const sortedWords = Object.entries(this.words)
            .filter(([key]) => {
                const wordCount = key.trim().split(/\s+/).length;
                return wordCount === 1;  // Changed to only accept single words
            })
            .sort(([a], [b]) => b.length - a.length);

        for (const [key, value] of sortedWords) {
            const hasScand = this.hasScandinavianLetters(key);
            const wordData = {
                ...value,
                length: key.length,
                words: 1,  // Always 1 since we're dealing with single words
                hasScandinavian: hasScand
            };
            
            if (hasScand) {
                wordData.scanRegex = this.createScandinavianRegex(key);
                if (this.debug) {
                    console.log(`${this.READER_NAME} Ieškomas skandinaviškas žodis:`, wordData.scanRegex);
                }
            }
            
            this.wordsMap.set(key, wordData);
        }
        
        console.timeEnd('preprocess');
    }

    findWords(text) {
        console.time('wordSearch');
        const foundWords = [];
        const searchText = text.toLowerCase();
        
        const hasScandLetters = this.hasScandinavianLetters(searchText);
        console.log(`${this.READER_NAME} Ar tekste yra skandinaviškų raidžių:`, hasScandLetters);
        if (hasScandLetters) {
            const scandLetters = searchText.match(/[åäöÅÄÖ]/g);
            console.log(`${this.READER_NAME} Skandinaviškos raidės tekste:`, scandLetters);
        }

        for (const [word, metadata] of this.wordsMap) {
            if (metadata.hasScandinavian) {
                try {
                    const searchWord = word.toLowerCase();
                    let position = -1;
                    
                    while ((position = searchText.indexOf(searchWord, position + 1)) !== -1) {
                        const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                        const afterChar = position + searchWord.length < searchText.length ? 
                            searchText[position + searchWord.length] : ' ';
                            
                        foundWords.push({
                            text: word,
                            start: position,
                            end: position + searchWord.length,
                            ...(metadata['kalbos dalis'] && { type: metadata['kalbos dalis'] }),
                            ...(metadata.CERF && { cerf: metadata.CERF }),
                            ...(metadata.vertimas && { translation: metadata.vertimas }),
                            ...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
                            ...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
                        });
                    }
                } catch (error) {
                    console.error(`${this.READER_NAME} Klaida ieškant skandinaviško žodžio "${word}":`, error);
                }
            } else {
                const searchWord = word.toLowerCase();
                let position = -1;
                
                while ((position = searchText.indexOf(searchWord, position + 1)) !== -1) {
                    const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                    const afterChar = position + searchWord.length < searchText.length ? 
                        searchText[position + searchWord.length] : ' ';
                        
                    if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                        foundWords.push({
                            text: word,
                            start: position,
                            end: position + searchWord.length,
                            ...(metadata['kalbos dalis'] && { type: metadata['kalbos dalis'] }),
                            ...(metadata.CERF && { cerf: metadata.CERF }),
                            ...(metadata.vertimas && { translation: metadata.vertimas }),
                            ...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
                            ...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
                        });
                    }
                }
            }
        }

        foundWords.sort((a, b) => a.start - b.start);
        console.timeEnd('wordSearch');
        
        console.log(`${this.READER_NAME} Rasta žodžių:`, foundWords.length);
        
        return foundWords;
    }

    isWordBoundary(char) {
        return /[\s.,!?;:"'()[\]{}<>\\\/\-—]/.test(char);
    }

    processText(text) {
        console.time('totalProcess');
        const foundWords = this.findWords(text);
        console.timeEnd('totalProcess');
        
        return {
            originalText: text,
            words: foundWords
        };
    }
}
