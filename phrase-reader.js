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
            
            try {
                this.phrases = JSON.parse(text);
                
                // Išsaugome keletą pavyzdinių frazių debug tikslais
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
        const regexPattern = phrase.toLowerCase()
            .replace(/å/g, '[åa]')
            .replace(/ä/g, '[äa]')
            .replace(/ö/g, '[öo]');
        return {
            originali: phrase,
            regex: regexPattern,
            kodavimas: Array.from(phrase).map(c => `${c}:${c.charCodeAt(0)}`)
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

        if (this.debug) {
            console.log(`${this.READER_NAME} Teksto pavyzdys (pirmi 100 simboliai):`, searchText.substring(0, 100));
        }

        for (const [phrase, metadata] of this.phrasesMap) {
            if (metadata.hasScandinavian) {
                // Naudojame regex paiešką skandinaviškoms frazėms
                const pattern = `\\b${metadata.scanRegex.regex}\\b`;
                const regex = new RegExp(pattern, 'gi');
                let match;
                
                while ((match = regex.exec(searchText)) !== null) {
                    foundPhrases.push({
                        text: phrase,
                        start: match.index,
                        end: match.index + match[0].length,
                        type: metadata['kalbos dalis'],
                        cerf: metadata.CERF,
                        translation: metadata.vertimas
                    });
                    
                    if (this.debug) {
                        console.log(`${this.READER_NAME} Rasta frazė:`, {
                            fraze: match[0],
                            pozicija: match.index,
                            kontekstas: searchText.substring(
                                Math.max(0, match.index - 20),
                                Math.min(searchText.length, match.index + match[0].length + 20)
                            )
                        });
                    }
                }
            } else {
                // Įprasta paieška ne-skandinaviškoms frazėms
                const searchPhrase = phrase.toLowerCase();
                let position = -1;
                
                while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                    // Tikriname žodžių ribas
                    const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                    const afterChar = position + searchPhrase.length < searchText.length ? 
                        searchText[position + searchPhrase.length] : ' ';
                        
                    if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                        foundPhrases.push({
                            text: phrase,
                            start: position,
                            end: position + searchPhrase.length,
                            type: metadata['kalbos dalis'],
                            cerf: metadata.CERF,
                            translation: metadata.vertimas
                        });
                    }
                }
            }
        }

        foundPhrases.sort((a, b) => a.start - b.start);
        console.timeEnd('phraseSearch');
        
        if (this.debug) {
            console.log(`${this.READER_NAME} Rasta frazių:`, foundPhrases.length);
        }
        
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
