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
                
                const homonimaiCount = Array.from(this.homonymsMap.entries())
                    .filter(([_, homonyms]) => homonyms.length > 1);
                
                // Pridedame išsamesnę informaciją apie užkrautus žodžius
                console.log(`${this.READER_NAME} Žodynas sėkmingai užkrautas:`);
                console.log(`${this.READER_NAME} - Iš viso žodžių žodyne: ${Object.keys(this.words).length}`);
                console.log(`${this.READER_NAME} - Unikalių žodžių (wordsMap): ${this.wordsMap.size}`);
                console.log(`${this.READER_NAME} - Žodžių su homonimais (homonymsMap): ${this.homonymsMap.size}`);
                console.log(`${this.READER_NAME} - Rasta žodžių su homonimais: ${homonimaiCount.length}`);
                
                // Išvedame detalią informaciją apie homonymus
                if (homonimaiCount.length > 0) {
                    console.log(`${this.READER_NAME} Homonymų sąrašas:`);
                    homonimaiCount.forEach(([word, homonyms]) => {
                        console.log(`${this.READER_NAME} Žodis "${word}" turi ${homonyms.length} reikšmes:`);
                        homonyms.forEach(h => {
                            console.log(`  - ${h.type}: ${h.vertimas || 'nėra vertimo'}`);
                        });
                    });
                }

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
        
        // Pirmiausia grupuojame žodžius pagal bazinę formą
        const wordGroups = {};
        
        Object.entries(this.words).forEach(([key, value]) => {
            const [wordWithoutSuffix] = key.split('_');
            if (!wordGroups[wordWithoutSuffix]) {
                wordGroups[wordWithoutSuffix] = [];
            }
            wordGroups[wordWithoutSuffix].push({ key, value });
        });
        
        // Apdorojame kiekvieną grupę
        Object.entries(wordGroups).forEach(([baseWord, entries]) => {
            const hasScand = this.hasScandinavianLetters(baseWord);
            
            // Kuriame žodžių duomenis
            const wordDataArray = entries.map(({ key, value }) => {
                const [, type] = key.split('_');
                return {
                    ...value,
                    originalWord: key,
                    word: baseWord,
                    type: type,
                    length: baseWord.length,
                    words: 1,
                    hasScandinavian: hasScand
                };
            });
            
            // Įdedame į homonymsMap
            this.homonymsMap.set(baseWord, wordDataArray);
            
            // Įdedame pirmą formą į wordsMap
            if (!this.wordsMap.has(baseWord)) {
                this.wordsMap.set(baseWord, wordDataArray[0]);
            }
            
            // Pridedame regex jei reikia
            if (hasScand) {
                wordDataArray.forEach(wordData => {
                    wordData.scanRegex = this.createScandinavianRegex(baseWord);
                });
            }
        });
        
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
            
            // Naudojame homonymsMap vietoj wordsMap
            for (const [word, homonyms] of this.homonymsMap) {
                const hasScand = homonyms[0].hasScandinavian;
                
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
