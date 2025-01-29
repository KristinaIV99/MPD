import { TextNormalizer } from './text-normalizer.js';

export class PhraseReader {
    constructor(options = {}) {
        this.READER_NAME = '[PhraseReader]';
        this.phrases = null;
        this.phrasesMap = new Map();
        this.normalizer = new TextNormalizer();
        this.debug = options.debug || false;
        
        // Nauji laukai optimizacijai
        this.phrasesByLength = new Map(); // Frazių grupavimas pagal ilgį
        this.worker = null; // Web Worker dideliems tekstams
        this.cachedNormalizedText = new Map(); // Normalizuoto teksto kešavimas
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

                await this.preprocessPhrases();
                this.initializeWorker();
                
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

	initializeWorker() {
		if (typeof Worker !== 'undefined') {
			const workerCode = `
				function isWordBoundary(char) {
					return /[\\s.,!?;:"'()\\[\\]{}<>\\\\\/\\-—]/.test(char);
				}

				function buildTrie(phrases) {
					const root = {};
					const phraseMap = new Map();
					
					for (const [phrase, metadata] of phrases) {
						const words = phrase.toLowerCase().split(/\\s+/);
						let node = root;
						
						for (const word of words) {
							if (!node[word]) {
								node[word] = {};
							}
							node = node[word];
						}
						
						node._isEnd = true;
						node._phrase = phrase;
						phraseMap.set(phrase, metadata);
					}
					
					return { root, phraseMap };
				}

				function tokenizeText(text) {
					const tokens = [];
					let word = '';
					let start = -1;
					
					for (let i = 0; i < text.length; i++) {
						const char = text[i];
						if (isWordBoundary(char)) {
							if (word !== '') {
								tokens.push({
									word: word.toLowerCase(),
									start,
									end: i
								});
								word = '';
								start = -1;
							}
						} else {
							if (word === '') {
								start = i;
							}
							word += char;
						}
					}
					
					if (word !== '') {
						tokens.push({
							word: word.toLowerCase(),
							start,
							end: text.length
						});
					}
					
					return tokens;
				}

				function searchWithTrie(text, phrases) {
					const { root, phraseMap } = buildTrie(phrases);
					const tokens = tokenizeText(text);
					const foundPhrases = [];
					
					for (let i = 0; i < tokens.length; i++) {
						let node = root;
						for (let j = i; j < tokens.length; j++) {
							const word = tokens[j].word;
							if (!node[word]) break;
							
							node = node[word];
							if (node._isEnd) {
								const firstToken = tokens[i];
								const lastToken = tokens[j];
								
								const beforeChar = firstToken.start > 0 ? text[firstToken.start - 1] : ' ';
								const afterChar = lastToken.end < text.length ? text[lastToken.end] : ' ';
								
								if (isWordBoundary(beforeChar) && isWordBoundary(afterChar)) {
									const metadata = phraseMap.get(node._phrase);
									const hasTranslation = metadata.vertimas && metadata.vertimas.trim() !== '';
									
									foundPhrases.push({
										text: node._phrase,
										start: firstToken.start,
										end: lastToken.end,
										type: metadata['kalbos dalis'],
										cerf: metadata.CERF,
										translation: hasTranslation ? metadata.vertimas : '-',
										baseForm: metadata['bazinė forma'] || null,
										baseTranslation: metadata['bazė vertimas'] || null,
										uttryck: metadata['uttryck'] || null
									});
								}
							}
						}
					}
					
					return foundPhrases.sort((a, b) => a.start - b.start);
				}

				self.onmessage = function(e) {
					const { text, phrases } = e.data;
					const results = searchWithTrie(text, phrases);
					self.postMessage(results);
				};
			`;
			const blob = new Blob([workerCode], { type: 'application/javascript' });
			this.worker = new Worker(URL.createObjectURL(blob));
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

    async preprocessPhrases() {
        console.time('preprocess');
        
        // Filtruojame ir rūšiuojame frazes
        const sortedPhrases = Object.entries(this.phrases)
            .filter(([key]) => {
                const wordCount = key.trim().split(/\s+/).length;
                return wordCount >= 2;
            })
            .sort(([a], [b]) => b.length - a.length);

        // Grupuojame frazes pagal ilgį optimizacijai
        for (const [key, value] of sortedPhrases) {
            const length = key.length;
            if (!this.phrasesByLength.has(length)) {
                this.phrasesByLength.set(length, new Set());
            }
            this.phrasesByLength.get(length).add(key);

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

    async findPhrases(text) {
        console.time('phraseSearch');
        
        // Normalizuojame tekstą tik vieną kartą
        let searchText = this.cachedNormalizedText.get(text);
        if (!searchText) {
            searchText = text.toLowerCase();
            this.cachedNormalizedText.set(text, searchText);
        }
        
        const foundPhrases = [];
        
        // Naudojame Web Worker dideliems tekstams
        if (this.worker && text.length > 10000) {
            return await this.findPhrasesWithWorker(searchText);
        }
        
        const hasScandLetters = this.hasScandinavianLetters(searchText);
        if (this.debug) {
            console.log(`${this.READER_NAME} Ar tekste yra skandinaviškų raidžių:`, hasScandLetters);
            if (hasScandLetters) {
                const scandLetters = searchText.match(/[åäöÅÄÖ]/g);
                console.log(`${this.READER_NAME} Skandinaviškos raidės tekste:`, scandLetters);
            }
        }

        // Optimizuota paieška pagal frazių ilgį
        for (const [length, phrases] of this.phrasesByLength) {
            if (length > searchText.length) continue;
            
            for (const phrase of phrases) {
                const metadata = this.phrasesMap.get(phrase);
                const searchPhrase = phrase.toLowerCase();
                let position = -1;
                
                while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                    const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                    const afterChar = position + searchPhrase.length < searchText.length ? 
                        searchText[position + searchPhrase.length] : ' ';
                        
                    if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                        const hasTranslation = metadata.vertimas && metadata.vertimas.trim() !== '';
                        
                        if (metadata.hasScandinavian && this.debug) {
                            console.log(`${this.READER_NAME} Rasta skandinaviška frazė:`, {
                                rastas_tekstas: searchPhrase,
                                pozicija: position,
                                kontekstas: searchText.substr(Math.max(0, position - 20), 40)
                            });
                        }
                        
                        foundPhrases.push({
                            text: phrase,
                            start: position,
                            end: position + searchPhrase.length,
                            type: metadata['kalbos dalis'],
                            cerf: metadata.CERF,
                            translation: hasTranslation ? metadata.vertimas : '-',
                            baseForm: metadata['bazinė forma'] || null,
                            baseTranslation: metadata['bazė vertimas'] || null,
                            uttryck: metadata['uttryck'] || null
                        });
                    }
                }
            }
        }
    
        foundPhrases.sort((a, b) => a.start - b.start);
        console.timeEnd('phraseSearch');
        
        console.log(`${this.READER_NAME} Rastos frazės:`, 
			foundPhrases.map(phrase => ({
				frazė: phrase.text,
				pozicija: phrase.start,
				vertimas: phrase.translation,
				tipas: phrase.type,
				lygis: phrase.cerf
			}))
		);
		
		return foundPhrases;
    }

    async findPhrasesWithWorker(text) {
        return new Promise((resolve) => {
            this.worker.onmessage = (e) => resolve(e.data);
            this.worker.postMessage({ 
                text, 
                phrases: Array.from(this.phrasesMap.entries()) 
            });
        });
    }

    isWordBoundary(char) {
        return /[\s.,!?;:"'()[\]{}<>\\\/\-—]/.test(char);
    }

    async processText(text) {
        console.time('totalProcess');
        const foundPhrases = await this.findPhrases(text);
        console.timeEnd('totalProcess');
        
        return {
            originalText: text,
            phrases: foundPhrases
        };
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.cachedNormalizedText.clear();
    }
}
