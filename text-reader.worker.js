import { TextNormalizer } from './text-normalizer.js';

export class WordReader {
    constructor(options = {}) {
        this.READER_NAME = '[WordReader]';
        this.words = null;
        this.wordsMap = new Map();
        this.homonymsMap = new Map(); // Naujas Map objektas homonimams
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
                            zodis: key.split('_')[0],
                            tipas: key.split('_')[1],
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
        if (this.debug) {
            console.log(`${this.READER_NAME} Sukurtas regex šablonas žodžiui "${word}":`, regexPattern);
        }
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
            
            // Homonymų apdorojimas
            if (this.homonymsMap.has(wordWithoutSuffix)) {
                // Jei žodis jau egzistuoja, pridedame naują reikšmę
                const existingHomonyms = this.homonymsMap.get(wordWithoutSuffix);
                existingHomonyms.push(wordData);
                this.homonymsMap.set(wordWithoutSuffix, existingHomonyms);
            } else {
                // Jei žodis naujas, sukuriame naują įrašą
                this.homonymsMap.set(wordWithoutSuffix, [wordData]);
            }
            
            if (hasScand) {
                wordData.scanRegex = this.createScandinavianRegex(wordWithoutSuffix);
                if (this.debug) {
                    console.log(`${this.READER_NAME} Ieškomas skandinaviškas žodis:`, wordData.scanRegex);
                }
            }
        }

        // Debug informacija apie homonymus
        if (this.debug) {
            for (const [word, homonyms] of this.homonymsMap) {
                if (homonyms.length > 1) {
                    console.log(`${this.READER_NAME} Rasti homonymai žodžiui "${word}":`, 
                        homonyms.map(h => ({
                            type: h.type,
                            translation: h.vertimas,
                            baseForm: h['bazinė forma']
                        }))
                    );
                }
            }
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

        // Ieškome žodžių kiekvienoje teksto dalyje
        for (const part of textParts) {
            const searchText = part.text.toLowerCase();
            
            // Naudojame homonymsMap vietoj wordsMap
            for (const [word, homonyms] of this.homonymsMap) {
                const hasScand = homonyms[0].hasScandinavian; // Tikriname pagal pirmą homonymą
                
                if (hasScand) {
                    try {
                        let position = -1;
                        
                        while ((position = searchText.indexOf(word.toLowerCase(), position + 1)) !== -1) {
                            const globalPosition = part.start + position;
                            const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                            const afterChar = position + word.length < searchText.length ? 
                                searchText[position + word.length] : ' ';
                                
                            if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                                // Pridedame visus homonymus
                                homonyms.forEach(metadata => {
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
                                        isHomonym: homonyms.length > 1,
                                        homonymsCount: homonyms.length
                                    });
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
                            // Pridedame visus homonymus
                            homonyms.forEach(metadata => {
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
                                    isHomonym: homonyms.length > 1,
                                    homonymsCount: homonyms.length
                                });
                            });
                        }
                    }
                }
            }
        }

        // Grupuojame žodžius pagal poziciją
        const groupedWords = {};
        foundWords.forEach(word => {
            const key = `${word.start}_${word.end}`;
            if (!groupedWords[key]) {
                groupedWords[key] = [];
            }
            groupedWords[key].push(word);
        });

        // Konvertuojame į galutinį masyvą, išlaikant pozicijų tvarką
        const finalWords = Object.entries(groupedWords)
            .sort(([keyA], [keyB]) => {
                const [startA] = keyA.split('_').map(Number);
                const [startB] = keyB.split('_').map(Number);
                return startA - startB;
            })
            .flatMap(([_, words]) => words);

        console.timeEnd('wordSearch');
        console.log(`${this.READER_NAME} Rasta žodžių:`, finalWords.length);
        
        return finalWords;
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
