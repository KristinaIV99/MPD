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
					const result = /[\\s.,!?;:"'()\\[\\]{}<>\\\\\\\/\\-—]/.test(char);
					return result;
				}

				function hasScandinavianLetters(text) {
					const result = /[åäöÅÄÖ]/.test(text);
					console.log("Tikrinamas tekstas:", text);
					console.log("Ar turi skandinaviškas raides:", result);
					if (result) {
						const matches = text.match(/[åäöÅÄÖ]/g);
						console.log("Rastos skandinaviškos raidės:", matches);
					}
					return result;
				}

				function createScandinavianRegex(phrase) {
					console.log("Kuriamas regex šablonui frazė:", phrase);
					const regexPattern = phrase.toLowerCase();
					console.log("Sukurtas regex šablonas:", regexPattern);
					return {
						originali: phrase,
						regex: regexPattern
					};
				}

				function buildTrie(phrases) {
					console.log("Pradedamas Trie medžio kūrimas");
					console.log("Gautas frazių kiekis:", phrases.length);
					
					const root = {};
					const phraseMap = new Map();
					let scandCount = 0;
					
					for (const [phrase, metadata] of phrases) {
						console.log("Apdorojama frazė:", phrase);
						const hasScand = hasScandinavianLetters(phrase);
						if (hasScand) {
							scandCount++;
							console.log("Frazė turi skandinaviškas raides:", phrase);
						}
						
						const words = phrase.toLowerCase().split(/\\s+/);
						console.log("Frazės žodžiai:", words);
						
						let node = root;
						for (const word of words) {
							if (!node[word]) {
								node[word] = {};
								console.log("Sukurtas naujas Trie mazgas žodžiui:", word);
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
					
					console.log("Trie medis sukurtas");
					console.log("Iš viso frazių su skandinaviškomis raidėmis:", scandCount);
					return { root, phraseMap };
				}

				function tokenizeText(text) {
					console.log("Pradedamas teksto skaidymas į žodžius");
					console.log("Teksto ilgis:", text.length);
					
					const tokens = [];
					let word = "";
					let start = -1;
					
					// Pridedame progreso pranešimus
					const PROGRESS_STEP = 50000;
					
					for (let i = 0; i < text.length; i++) {
						if (i % PROGRESS_STEP === 0) {
							console.log("Tokenizuojama...", Math.round(i/text.length*100) + "%");
						}
						
						const char = text[i];
						if (isWordBoundary(char)) {
							if (word !== "") {
							const token = {
									word: word.toLowerCase(),
									originalWord: word,
									start,
									end: i
								};
								tokens.push(token);
								word = "";
								start = -1;
							}
						} else {
							if (word === "") {
								start = i;
							}
							word += char;
						}
					}
					
					if (word !== "") {
						tokens.push({
							word: word.toLowerCase(),
							originalWord: word,
							start,
							end: text.length
						});
					}
					
					console.log("Tokenizavimas baigtas. Rasta žodžių:", tokens.length);
					return tokens;
				}
				
				function searchWithTrie(text, phrases) {
					console.log("========== DETALI PAIEŠKOS INFORMACIJA ==========");
					console.log("TEKSTO ANALIZĖ:");
					console.log("Pirmi 100 simboliai:", text.substring(0, 100));
					console.log("Simbolių kodai pirmiems 10 simboliams:");
					for(let i = 0; i < 10; i++) {
						console.log("Simbolis '" + text[i] + "' -> kodas:", text.charCodeAt(i));
					}
					
					const { root, phraseMap } = buildTrie(phrases);
					const tokens = tokenizeText(text);
					const foundPhrases = [];
					const lowerText = text.toLowerCase();
					
					// Pridedame apribojimus
					const CHUNK_SIZE = 5000;
					const MAX_TOKENS = 50000;
					const tokensToCheck = Math.min(tokens.length, MAX_TOKENS);
					
					console.log("APRIBOJIMAI:");
					console.log("Viso žodžių:", tokens.length);
					console.log("Bus tikrinama žodžių:", tokensToCheck);
					console.log("Gabalo dydis:", CHUNK_SIZE);
					
					for (let startIdx = 0; startIdx < tokensToCheck; startIdx += CHUNK_SIZE) {
						const endIdx = Math.min(startIdx + CHUNK_SIZE, tokensToCheck);
						console.log("\\n===== APDOROJAMAS GABALAS " + startIdx + "-" + endIdx + " =====");
						
						for (let i = startIdx; i < endIdx; i++) {
							let node = root;
							console.log("\\nTikriname žodį:", tokens[i].word);
							console.log("Žodžio pozicija:", i);
							
							const maxLookAhead = Math.min(i + 5, tokens.length);
							
							for (let j = i; j < maxLookAhead; j++) {
								const word = tokens[j].word;
								if (!node[word]) {
									console.log("Nerastas žodis Trie medyje:", word);
									break;
								}
								
								console.log("Rastas žodis Trie medyje:", word);
								node = node[word];
								
								if (node._isEnd) {
									console.log("\\n----- FRAZĖS TIKRINIMAS -----");
									console.log("Potenciali frazė:", node._phrase);
									
									const firstToken = tokens[i];
									const lastToken = tokens[j];
									const fullPhrase = lowerText.slice(firstToken.start, lastToken.end);
									
									console.log("Rasta tekste:", fullPhrase);
									console.log("Pozicija pradžia:", firstToken.start);
									console.log("Pozicija pabaiga:", lastToken.end);
									console.log("Kontekstas:", text.substr(Math.max(0, firstToken.start - 20), 40));
									
									const beforeChar = firstToken.start > 0 ? text[firstToken.start - 1] : " ";
									const afterChar = lastToken.end < text.length ? text[lastToken.end] : " ";
									
									console.log("ŽODŽIŲ RIBŲ TIKRINIMAS:");
									console.log("Simbolis prieš - simbolis:", beforeChar);
									console.log("Simbolis prieš - kodas:", beforeChar.charCodeAt(0));
									console.log("Simbolis po - simbolis:", afterChar);
									console.log("Simbolis po - kodas:", afterChar.charCodeAt(0));
									
									if (isWordBoundary(beforeChar) && isWordBoundary(afterChar)) {
										if (node._hasScand) {
											console.log("\\n----- SKANDINAVIŠKOS FRAZĖS TIKRINIMAS -----");
											console.log("Originali frazė:", node._phrase);
											console.log("Rasta tekste:", fullPhrase);
											console.log("Originali mažosiomis:", node._lowerPhrase);
											console.log("Rasta mažosiomis:", fullPhrase);
											
											if (fullPhrase === node._lowerPhrase) {
												console.log("\\n!!! RASTA SKANDINAVIŠKA FRAZĖ !!!");
												console.log("Frazė:", node._phrase);
												console.log("Pozicija:", firstToken.start);
												
												const metadata = phraseMap.get(node._phrase);
												foundPhrases.push({
													text: node._phrase,
													start: firstToken.start,
													end: lastToken.end,
													...(metadata["kalbos dalis"] && { type: metadata["kalbos dalis"] }),
													...(metadata.CERF && { cerf: metadata.CERF }),
													...(metadata.vertimas && { translation: metadata.vertimas }),
													...(metadata["bazinė forma"] && { baseForm: metadata["bazinė forma"] }),
													...(metadata["bazė vertimas"] && { baseTranslation: metadata["bazė vertimas"] }),
													...(metadata["uttryck"] && { uttryck: metadata["uttryck"] })
												});
											} else {
												console.log("\\nNESUTAPIMO ANALIZĖ:");
												for(let k = 0; k < fullPhrase.length; k++) {
													if(fullPhrase[k] !== node._lowerPhrase[k]) {
														console.log("Nesutampa pozicijoje " + k + ":");
														console.log("  Rastas simbolis:", fullPhrase[k]);
														console.log("  Rastas kodas:", fullPhrase.charCodeAt(k));
														console.log("  Tikėtasi simbolis:", node._lowerPhrase[k]);
														console.log("  Tikėtasi kodas:", node._lowerPhrase.charCodeAt(k));
													}
												}
											}
										}
									} else {
										console.log("Frazė atmesta - nėra tinkamų žodžių ribų");
									}
								}
							}
						}
						
						console.log("\\nGabalo progresas:", Math.round((endIdx / tokensToCheck) * 100) + "%");
					}
					
					const sortedPhrases = foundPhrases.sort((a, b) => a.start - b.start);
					
					console.log("\\n========== PAIEŠKOS REZULTATAI ==========");
					console.log("Rasta frazių:", sortedPhrases.length);
					sortedPhrases.forEach((phrase, idx) => {
						console.log("Frazė " + (idx + 1) + ":");
						console.log("  tekstas:", phrase.text);
						console.log("  pradžia:", phrase.start);
						console.log("  pabaiga:", phrase.end);
						console.log("  tipas:", phrase.type);
						console.log("  vertimas:", phrase.translation);
					});
					
					return sortedPhrases;
				}
	
				self.onmessage = function(e) {
					console.log("Worker gavo užklausą");
					const { text, phrases } = e.data;
					console.log("Gautas teksto ilgis:", text.length);
					console.log("Gautas frazių kiekis:", phrases.length);
					const results = searchWithTrie(text, phrases);
					console.log("Worker baigia darbą");
					console.log("Grąžinama frazių:", results.length);
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
