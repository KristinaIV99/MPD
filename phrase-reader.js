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
					console.log('Tikriname žodžio ribą:', char);
					const result = /[\\s.,!?;:"'()\\[\\]{}<>\\\\\\\/\\-—]/.test(char);
					console.log('Ar tai žodžio riba:', result);
					return result;
				}

				function hasScandinavianLetters(text) {
					console.log('Tikriname skandinaviškas raides tekste:', text);
					const result = /[åäöÅÄÖ]/.test(text);
					console.log('Ar turi skandinaviškas raides:', result);
					if (result) {
						const matches = text.match(/[åäöÅÄÖ]/g);
						console.log('Rastos skandinaviškos raidės:', matches);
					}
					return result;
				}

				function createScandinavianRegex(phrase) {
					console.log('Kuriamas regex šablonui frazė:', phrase);
					const regexPattern = phrase.toLowerCase();
					console.log('Sukurtas regex šablonas:', regexPattern);
					return {
						originali: phrase,
						regex: regexPattern
					};
				}

				function buildTrie(phrases) {
					console.log('Pradedamas Trie medžio kūrimas');
					console.log('Gautas frazių kiekis:', phrases.length);
					
					const root = {};
					const phraseMap = new Map();
					let scandCount = 0;
					
					for (const [phrase, metadata] of phrases) {
						console.log('Apdorojama frazė:', phrase);
						const hasScand = hasScandinavianLetters(phrase);
						if (hasScand) {
							scandCount++;
							console.log('Frazė turi skandinaviškas raides:', phrase);
						}
						
						const words = phrase.toLowerCase().split(/\\s+/);
						console.log('Frazės žodžiai:', words);
						
						let node = root;
						for (const word of words) {
							if (!node[word]) {
								node[word] = {};
								console.log('Sukurtas naujas Trie mazgas žodžiui:', word);
							}
							node = node[word];
						}
						
						node._isEnd = true;
						node._phrase = phrase;
						node._hasScand = hasScand;
						node._lowerPhrase = phrase.toLowerCase();
						
						phraseMap.set(phrase, {
							...metadata,
							hasScandinavian: hasScand,
							originalPhrase: phrase
						});
					}
					
					console.log('Trie medis sukurtas');
					console.log('Iš viso frazių su skandinaviškomis raidėmis:', scandCount);
					return { root, phraseMap };
				}

				function tokenizeText(text) {
					console.log('Pradedamas teksto skaidymas į žodžius');
					console.log('Teksto ilgis:', text.length);
					
					const tokens = [];
					let word = '';
					let start = -1;
					
					for (let i = 0; i < text.length; i++) {
						const char = text[i];
						if (isWordBoundary(char)) {
							if (word !== '') {
								const token = {
									word: word.toLowerCase(),
									originalWord: word,
									start,
									end: i
								};
								console.log('Rastas žodis:', token);
								tokens.push(token);
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
						const token = {
							word: word.toLowerCase(),
							originalWord: word,
							start,
							end: text.length
						};
						console.log('Paskutinis žodis:', token);
						tokens.push(token);
					}
					
					console.log('Iš viso rasta žodžių:', tokens.length);
					return tokens;
				}
				
				function searchWithTrie(text, phrases) {
					console.log('Pradedama paieška su Trie');
					console.log('Teksto ilgis:', text.length);
					console.log('Frazių kiekis:', phrases.length);
					
					const { root, phraseMap } = buildTrie(phrases);
					const tokens = tokenizeText(text);
					const foundPhrases = [];
					const lowerText = text.toLowerCase();
					
					console.log('Pradedama frazių paieška per žodžius');
					
					for (let i = 0; i < tokens.length; i++) {
						let node = root;
						console.log('Tikrinamas pradinis žodis:', tokens[i].word);
						
						for (let j = i; j < tokens.length; j++) {
							const word = tokens[j].word;
						if (!node[word]) {
								console.log('Nerastas žodis Trie medyje:', word);
								break;
							}
							
							console.log('Rastas žodis Trie medyje:', word);
							node = node[word];
							
							if (node._isEnd) {
								console.log('Rasta potenciali frazė:', node._phrase);
							
								const firstToken = tokens[i];
								const lastToken = tokens[j];
								const fullPhrase = lowerText.slice(firstToken.start, lastToken.end);
								
								console.log('Pilna rasta frazė:', fullPhrase);
								console.log('Originali frazė:', node._phrase);
								console.log('Ar turi skandinaviškas raides:', node._hasScand);
								
								const beforeChar = firstToken.start > 0 ? text[firstToken.start - 1] : ' ';
								const afterChar = lastToken.end < text.length ? text[lastToken.end] : ' ';
								
								console.log('Simbolis prieš frazę:', beforeChar);
								console.log('Simbolis po frazės:', afterChar);
								
								if (isWordBoundary(beforeChar) && isWordBoundary(afterChar)) {
									if (node._hasScand) {
										console.log('Tikrinama skandinaviška frazė');
										console.log('Rastas tekstas:', fullPhrase);
										console.log('Tikrinama frazė:', node._lowerPhrase);
										
										if (fullPhrase === node._lowerPhrase) {
											console.log('RASTA SKANDINAVIŠKA FRAZĖ!');
											console.log('Frazė:', node._phrase);
											console.log('Pozicija:', firstToken.start);
											console.log('Kontekstas:', text.substr(Math.max(0, firstToken.start - 20), 40));
											
											const metadata = phraseMap.get(node._phrase);
											foundPhrases.push({
												text: node._phrase,
												start: firstToken.start,
												end: lastToken.end,
												...(metadata['kalbos dalis'] && { type: metadata['kalbos dalis'] }),
												...(metadata.CERF && { cerf: metadata.CERF }),
												...(metadata.vertimas && { translation: metadata.vertimas }),
												...(metadata['bazinė forma'] && { baseForm: metadata['bazinė forma'] }),
												...(metadata['bazė vertimas'] && { baseTranslation: metadata['bazė vertimas'] }),
												...(metadata['uttryck'] && { uttryck: metadata['uttryck'] })
											});
										} else {
											console.log('Frazė nesutampa tiksliai');
											console.log('Rastas tekstas:', fullPhrase);
											console.log('Ieškoma frazė:', node._lowerPhrase);
										}
									}
								} else {
									console.log('Frazė atmesta - nėra žodžių ribų');
								}
							}
						}
					}
					
					const sortedPhrases = foundPhrases.sort((a, b) => a.start - b.start);
					console.log('Paieška baigta');
					console.log('Rasta frazių:', sortedPhrases.length);
					return sortedPhrases;
				}

				self.onmessage = function(e) {
					console.log('Worker gavo užklausą');
					const { text, phrases } = e.data;
					console.log('Gautas teksto ilgis:', text.length);
					console.log('Gautas frazių kiekis:', phrases.length);
					const results = searchWithTrie(text, phrases);
					console.log('Worker baigia darbą');
					console.log('Grąžinama frazių:', results.length);
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
        
		// Pridedame teksto ilgio patikrinimą
		console.log(`${this.READER_NAME} Pradedama paieška tekste, ilgis:`, text.length);
		
        // Normalizuojame tekstą tik vieną kartą
        let searchText = this.cachedNormalizedText.get(text);
        if (!searchText) {
            searchText = text.toLowerCase();
            this.cachedNormalizedText.set(text, searchText);
        }
        
        const foundPhrases = [];
        
        // Naudojame Web Worker dideliems tekstams
        if (this.worker && text.length > 10000) {
			console.log(`${this.READER_NAME} Tekstas per ilgas (${text.length} > 10000), naudojamas Worker`);
            const workerResults = await this.findPhrasesWithWorker(searchText);
			console.log(`${this.READER_NAME} Worker grąžino frazių:`, workerResults.length);
			return workerResults;
        }
        
		// Jei Worker neįsijungė, registruojame įprastą paiešką
		console.log(`${this.READER_NAME} Vykdoma įprasta paieška`);
		
        const hasScandLetters = this.hasScandinavianLetters(searchText);
        if (this.debug) {
            console.log(`${this.READER_NAME} Ar tekste yra skandinaviškų raidžių:`, hasScandLetters);
            if (hasScandLetters) {
                const scandLetters = searchText.match(/[åäöÅÄÖ]/g);
                console.log(`${this.READER_NAME} Skandinaviškos raidės tekste:`, scandLetters);
            }
        }
		
		// Registruojame kiek frazių tikriname
		let phraseCount = 0;
		for (const [length, phrases] of this.phrasesByLength) {
			phraseCount += phrases.size;
		}
		console.log(`${this.READER_NAME} Bus tikrinama frazių:`, phraseCount);
	
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
		console.log(`${this.READER_NAME} Worker pradeda darbą`);
		return new Promise((resolve) => {
			this.worker.onmessage = (e) => {
				const results = e.data;
				console.log(`${this.READER_NAME} Worker baigė darbą, rasta frazių:`, results.length);
				console.log(`${this.READER_NAME} Worker rastos frazės:`, 
					results.map(phrase => ({
						frazė: phrase.text,
						pozicija: phrase.start,
						vertimas: phrase.translation,
						tipas: phrase.type,
						lygis: phrase.cerf
					}))
				);
				resolve(results);
			};
			// Įsitikiname, kad perduodame originalias frazes
			const phrasesArray = Array.from(this.phrasesMap.entries());
			this.worker.postMessage({ text, phrases: phrasesArray });
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
