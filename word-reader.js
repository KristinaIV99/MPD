
import { TextNormalizer } from './text-normalizer.js';

export class WordReader {
    constructor(options = {}) {
        this.READER_NAME = '[WordReader]';
        this.words = null;
        this.wordsMap = new Map();
        this.homonymsMap = new Map();
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
                            zodis: key.split('_')[0], // Parodome žodį be sufikso
                            tipas: key.split('_')[1],
                            arTuriSkandinav: this.hasScandinavianLetters(key)
                        }))
                    );
                }

                this.preprocessWords();
                
                // Pridedame išsamesnę informaciją apie užkrautus žodžius
                console.log(`${this.READER_NAME} Žodynas sėkmingai užkrautas:`);
                console.log(`${this.READER_NAME} - Iš viso žodžių žodyne: ${Object.keys(this.words).length}`);
                console.log(`${this.READER_NAME} - Unikalių žodžių (wordsMap): ${this.wordsMap.size}`);
                console.log(`${this.READER_NAME} - Žodžių su homonimais (homonymsMap): ${this.homonymsMap.size}`);
                
                // Parodome homonimų statistiką
                const homonimaiCount = Array.from(this.homonymsMap.values())
                    .filter(homonyms => homonyms.length > 1).length;
                console.log(`${this.READER_NAME} - Rasta žodžių su homonimais: ${homonimaiCount}`);

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
                const wordWithoutSuffix = key.split('_')[0];
                const wordCount = key.trim().split(/\s+/).length;
                return wordCount === 1;  // Priimame tik pavienius žodžius
            })
            .sort(([a], [b]) => {
                const aWord = a.split('_')[0];
                const bWord = b.split('_')[0];
                return bWord.length - aWord.length;
            });

        for (const [key, value] of sortedWords) {
            const [wordWithoutSuffix, type] = key.split('_');
            const hasScand = this.hasScandinavianLetters(wordWithoutSuffix);
            const wordData = {
                ...value,
                originalWord: key,
                word: wordWithoutSuffix,
                type: type,
                length: wordWithoutSuffix.length,
                words: 1,
                hasScandinavian: hasScand
            };
            
            if (hasScand) {
                wordData.scanRegex = this.createScandinavianRegex(wordWithoutSuffix);
                if (this.debug) {
                    console.log(`${this.READER_NAME} Ieškomas skandinaviškas žodis:`, wordData.scanRegex);
                }
            }
            
            this.wordsMap.set(wordWithoutSuffix, wordData);
        }
        
        console.timeEnd('preprocess');
    }

    prepareTextAfterPhrases(text, phrases) {
        // Sukuriame masyvą su visomis pozicijomis, kurios jau yra padengtos frazėmis
        let coveredPositions = new Array(text.length).fill(false);
        
        // Pažymime visas pozicijas, kurios yra padengtos frazėmis
        for (const phrase of phrases) {
            for (let i = phrase.start; i < phrase.end; i++) {
                coveredPositions[i] = true;
            }
        }
        
        // Sukuriame masyvą su teksto dalimis, kurios nėra padengtos frazėmis
        let textParts = [];
        let currentPart = '';
        let startPosition = 0;
        
        for (let i = 0; i < text.length; i++) {
            if (!coveredPositions[i]) {
                currentPart += text[i];
            } else if (currentPart) {
                textParts.push({
                    text: currentPart,
                    start: startPosition,
                    length: currentPart.length
                });
                currentPart = '';
                startPosition = i + 1;
            } else {
                startPosition = i + 1;
            }
        }
        
        // Pridedame paskutinę dalį, jei ji yra
        if (currentPart) {
            textParts.push({
                text: currentPart,
                start: startPosition,
                length: currentPart.length
            });
        }

        if (this.debug) {
            console.log(`${this.READER_NAME} Teksto dalys po frazių apdorojimo:`, textParts);
        }

        return textParts;
    }

    findWords(text, phrases = []) {
        console.time('wordSearch');
        const foundWords = [];
        const textParts = this.prepareTextAfterPhrases(text, phrases);
        
        const hasScandLetters = this.hasScandinavianLetters(text);
        console.log(`${this.READER_NAME} Ar tekste yra skandinaviškų raidžių:`, hasScandLetters);
        
        if (hasScandLetters) {
            const scandLetters = text.match(/[åäöÅÄÖ]/g);
            console.log(`${this.READER_NAME} Skandinaviškos raidės tekste:`, scandLetters);
        }

        // Ieškome žodžių kiekvienoje teksto dalyje
        for (const part of textParts) {
            const searchText = part.text.toLowerCase();
            
            for (const [word, metadata] of this.wordsMap) {
                if (metadata.hasScandinavian) {
                    try {
                        let position = -1;
                        
                        while ((position = searchText.indexOf(word.toLowerCase(), position + 1)) !== -1) {
                            const globalPosition = part.start + position;
                            const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                            const afterChar = position + word.length < searchText.length ? 
                                searchText[position + word.length] : ' ';
                                
                            if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                                foundWords.push({
                                    text: word,
                                    originalWord: metadata.originalWord,
                                    start: globalPosition,
                                    end: globalPosition + word.length,
                                    type: metadata.type,
                                    ...(metadata.CERF && { cerf: metadata.CERF }),
                                    ...(metadata.vertimas && { translation: metadata.vertimas }),
                                    ...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
                                    ...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`${this.READER_NAME} Klaida ieškant skandinaviško žodžio "${word}":`, error);
                    }
                } else {
                    let position = -1;
                    
                    while ((position = searchText.indexOf(word.toLowerCase(), position + 1)) !== -1) {
                        const globalPosition = part.start + position;
                        const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                        const afterChar = position + word.length < searchText.length ? 
                            searchText[position + word.length] : ' ';
                            
                        if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                            foundWords.push({
                                text: word,
                                originalWord: metadata.originalWord,
                                start: globalPosition,
                                end: globalPosition + word.length,
                                type: metadata.type,
                                ...(metadata.CERF && { cerf: metadata.CERF }),
                                ...(metadata.vertimas && { translation: metadata.vertimas }),
                                ...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
                                ...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
                            });
                        }
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

    processText(text, phrases = []) {
        console.time('totalProcess');
        const foundWords = this.findWords(text, phrases);
        console.timeEnd('totalProcess');
        
        return {
            originalText: text,
            words: foundWords
        };
    }
}
