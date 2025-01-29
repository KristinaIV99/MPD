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

                function hasScandinavianLetters(text) {
                    return /[åäöÅÄÖ]/.test(text);
                }

                function searchPhrasesInWorker(searchText, phrases) {
                    const foundPhrases = [];
                    searchText = searchText.toLowerCase();
                    
                    const hasScandLetters = hasScandinavianLetters(searchText);
                    
                    // Grupuojame frazes pagal ilgį
                    const phrasesByLength = new Map();
                    for (const [phrase, metadata] of phrases) {
                        const length = phrase.length;
                        if (!phrasesByLength.has(length)) {
                            phrasesByLength.set(length, []);
                        }
                        phrasesByLength.get(length).push([phrase, metadata]);
                    }
                    
                    // Ieškome frazių pagal ilgį
                    for (const [length, phraseGroup] of phrasesByLength) {
                        if (length > searchText.length) continue;
                        
                        for (const [phrase, metadata] of phraseGroup) {
                            const searchPhrase = phrase.toLowerCase();
                            let position = -1;
                            
                            while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                                const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                                const afterChar = position + searchPhrase.length < searchText.length ? 
                                    searchText[position + searchPhrase.length] : ' ';
                                    
                                if (isWordBoundary(beforeChar) && isWordBoundary(afterChar)) {
                                    const hasTranslation = metadata.vertimas && metadata.vertimas.trim() !== '';
                                    
                                    foundPhrases.push({
                                        text: phrase,
                                        start: position,
                                        end: position + searchPhrase.length,
                                        type: metadata['kalbos dalis'],
                                        cerf: metadata.CERF,
                                        translation: hasTranslation ? metadata.vertimas : '-',
                                        baseForm: metadata['bazinė forma'] || null,
                                        baseTranslation: metadata['bazė vertimas'] || null
                                    });
                                }
                            }
                        }
                    }
                    
                    return foundPhrases.sort((a, b) => a.start - b.start);
                }

                self.onmessage = function(e) {
                    const { text, phrases } = e.data;
                    const results = searchPhrasesInWorker(text, phrases);
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
        
        console.log(`${this.READER_NAME} Rasta frazių:`, foundPhrases.length);
        
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
