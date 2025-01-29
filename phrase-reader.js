import { TextNormalizer } from './text-normalizer.js';

export class PhraseReader {
    constructor(options = {}) {
        this.READER_NAME = '[PhraseReader]';
        this.phrases = null;
        this.phrasesMap = new Map();
        this.normalizer = new TextNormalizer();
        this.debug = options.debug || false;
    }

    async initialize() {
        try {
            console.log(`${this.READER_NAME} Pradedamas frazių žodyno krovimas...`);
            console.time('phraseLoad');
            
            const response = await fetch('phrases.json');
            if (!response.ok) {
                throw new Error(`Nepavyko užkrauti frazių: ${response.statusText}`);
            }

            const text = await response.text();
            console.log(`${this.READER_NAME} Gautas žodyno tekstas, ilgis:`, text.length);
            
            try {
                this.phrases = JSON.parse(text);
                
                // Parodome kelias pavyzdines frazes
                if (this.debug) {
                    const sample = Object.entries(this.phrases).slice(0, 5);
                    console.log(`${this.READER_NAME} Pavyzdinės frazės:`, 
                        sample.map(([key, value]) => ({
                            fraze: key,
                            duomenys: value,
                            arTuriSkandinav: this.hasScandinavianLetters(key)
                        }))
                    );
                }

                this.preprocessPhrases();
                console.log(`${this.READER_NAME} Sėkmingai užkrautos ${Object.keys(this.phrases).length} frazės`);
                console.timeEnd('phraseLoad');
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

    createScandinavianRegex(phrase) {
		const regexPattern = phrase.toLowerCase();
		console.log(`${this.READER_NAME} Sukurtas regex šablonas frazei "${phrase}":`, regexPattern);
		
		return {
			originali: phrase,
			regex: regexPattern
		};
    }

    preprocessPhrases() {
        console.time('preprocess');
        
        // Filtruojame ir rūšiuojame frazes
        const sortedPhrases = Object.entries(this.phrases)
            .filter(([key]) => {
                const wordCount = key.trim().split(/\s+/).length;
                return wordCount >= 2;
            })
            .sort(([a], [b]) => b.length - a.length);

        // Sukuriame regex šablonus skandinaviškoms frazėms
        for (const [key, value] of sortedPhrases) {
            const hasScand = this.hasScandinavianLetters(key);
            const phraseData = {
                ...value,
                length: key.length,
                words: key.toLowerCase().split(/\s+/).length,
                hasScandinavian: hasScand
            };
            
            if (hasScand) {
                phraseData.scanRegex = this.createScandinavianRegex(key);
                if (this.debug) {
                    console.log(`${this.READER_NAME} Ieškoma skandinaviška frazė:`, phraseData.scanRegex);
                }
            }
            
            this.phrasesMap.set(key, phraseData);
        }
        
        console.timeEnd('preprocess');
    }

    findPhrases(text) {
        console.time('phraseSearch');
        const foundPhrases = [];
        const searchText = text.toLowerCase();
        
        // Debug: patikriname tekstą dėl skandinaviškų raidžių
        const hasScandLetters = this.hasScandinavianLetters(searchText);
        console.log(`${this.READER_NAME} Ar tekste yra skandinaviškų raidžių:`, hasScandLetters);
        if (hasScandLetters) {
            const scandLetters = searchText.match(/[åäöÅÄÖ]/g);
            console.log(`${this.READER_NAME} Skandinaviškos raidės tekste:`, scandLetters);
        }

        // Einame per visas frazes žodyne
        for (const [phrase, metadata] of this.phrasesMap) {
            // Jei frazė turi skandinaviškas raides
            if (metadata.hasScandinavian) {
                try {
                    const searchPhrase = phrase.toLowerCase();
					let position = -1;
					
					while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
						const beforeChar = position > 0 ? searchText[position - 1] : ' ';
						const afterChar = position + searchPhrase.length < searchText.length ? 
							searchText[position + searchPhrase.length] : ' ';
							
							foundPhrases.push({
								text: phrase,
								start: position,
								end: position + searchPhrase.length,
								...(metadata['kalbos dalis'] && { type: metadata['kalbos dalis'] }),
								...(metadata.CERF && { cerf: metadata.CERF }),
								...(metadata.vertimas && { translation: metadata.vertimas }),
								...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
								...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
								...(metadata['uttryck'] && { uttryck: metadata['uttryck'] })
							});
						}
					}
                } catch (error) {
                    console.error(`${this.READER_NAME} Klaida ieškant skandinaviškos frazės "${phrase}":`, error);
                }
            // Jei frazė neturi skandinaviškų raidžių    
            } else {
                const searchPhrase = phrase.toLowerCase();
                let position = -1;
                
                while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                    const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                    const afterChar = position + searchPhrase.length < searchText.length ? 
                        searchText[position + searchPhrase.length] : ' ';
                        
                    if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                        foundPhrases.push({
                            text: phrase,
                            start: position,
                            end: position + searchPhrase.length,
                            ...(metadata['kalbos dalis'] && { type: metadata['kalbos dalis'] }),
							...(metadata.CERF && { cerf: metadata.CERF }),
							...(metadata.vertimas && { translation: metadata.vertimas }),
							...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
							...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
							...(metadata['uttryck'] && { uttryck: metadata['uttryck'] })
                        });
                    }
                }
            }
        }

        foundPhrases.sort((a, b) => a.start - b.start);
        console.timeEnd('phraseSearch');
        
        console.log(`${this.READER_NAME} Rasta frazių:`, foundPhrases.length);
        
        return foundPhrases;
    }

    isWordBoundary(char) {
        return /[\s.,!?;:"'()[\]{}<>\\\/\-—]/.test(char);
    }

    processText(text) {
        console.time('totalProcess');
        const foundPhrases = this.findPhrases(text);
        console.timeEnd('totalProcess');
        
        return {
            originalText: text,
            phrases: foundPhrases
        };
    }
}
