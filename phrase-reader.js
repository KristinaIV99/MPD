
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
            console.log(`${this.READER_NAME} Žodyno dydis:`, (text.length / 1024 / 1024).toFixed(2), 'MB');
            
            try {
                this.phrases = JSON.parse(text);
                
                console.log(`${this.READER_NAME} Žodyno dydis:`, text.length, 'baitų');
                const sample = Object.keys(this.phrases).slice(0, 3);
                console.log(`${this.READER_NAME} Pavyzdinės frazės (pirmos 3):`, 
                    sample.map(key => ({
                        originalFraze: key,
                        kodavimas: Array.from(key).map(c => `${c}:${c.charCodeAt(0)}`),
                        duomenys: this.phrases[key]
                    }))
                );
                
                this.preprocessPhrases();
                
                console.log(`${this.READER_NAME} Sėkmingai užkrautos ${Object.keys(this.phrases).length} frazės`);
                console.timeEnd('phraseLoad');
            } catch (jsonError) {
                console.error(`${this.READER_NAME} Klaida apdorojant JSON:`, jsonError);
                throw jsonError;
            }
        } catch (error) {
            console.error(`${this.READER_NAME} Initialization error:`, error);
            throw error;
        }
    }

    hasScandinavianLetters(text) {
        return /[åäöÅÄÖ]/.test(text);
    }

    escapeRegExp(string) {
        const escaped = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const withScandinavian = escaped
            .replace(/å/gi, '(å|a)')
            .replace(/ä/gi, '(ä|a)')
            .replace(/ö/gi, '(ö|o)');
        return withScandinavian;
    }

    preprocessPhrases() {
        console.time('preprocess');
        const sortedPhrases = Object.entries(this.phrases)
            .filter(([key]) => {
                const wordCount = key.trim().split(/\s+/).length;
                if (wordCount < 2) {
                    console.warn(`${this.READER_NAME} Ignoruojama frazė "${key}" - turi tik ${wordCount} žodį`);
                    return false;
                }
                return true;
            })
            .sort(([a], [b]) => b.length - a.length);

        // Skaičiuojame frazes su skandinaviškomis raidėmis
        const scandinavianPhrases = sortedPhrases.filter(([key]) => this.hasScandinavianLetters(key));
        console.log(`${this.READER_NAME} Frazės su skandinaviškomis raidėmis:`, 
            scandinavianPhrases.map(([key]) => ({
                fraze: key,
                kodavimas: Array.from(key).map(c => `${c}:${c.charCodeAt(0)}`)
            }))
        );

        // Įdedame frazes į Map
        for (const [key, value] of sortedPhrases) {
            this.phrasesMap.set(key, {
                ...value,
                length: key.length,
                words: key.toLowerCase().split(/\s+/).length,
                hasScandinavian: this.hasScandinavianLetters(key)
            });
        }
        
        console.timeEnd('preprocess');
        console.log(`${this.READER_NAME} Frazės paruoštos paieškai:`, this.phrasesMap.size);
    }

    findPhrases(text) {
        console.time('phraseSearch');
        if (!this.phrasesMap.size) {
            throw new Error('PhraseReader neinicializuotas. Pirma iškvieskite initialize()');
        }

        const foundPhrases = [];
        const searchText = text.toLowerCase();
        
        console.log(`${this.READER_NAME} Teksto pavyzdys (pirmi 100 simboliai):`, searchText.substring(0, 100));
        console.log(`${this.READER_NAME} Teksto kodavimas:`, 
            Array.from(searchText.substring(0, 100)).map(c => `${c}:${c.charCodeAt(0)}`));

        // Ieškome kiekvienos frazės
        for (const [phrase, metadata] of this.phrasesMap) {
            const searchPhrase = phrase.toLowerCase();
            
            // Jei frazėje yra skandinaviškų raidžių, naudojame specialią paiešką
            if (this.hasScandinavianLetters(searchPhrase)) {
				// Tiesioginis palyginimas be regex
				let position = -1;
				while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
					console.log(`${this.READER_NAME} Rasta skandinaviška frazė pozicijoje ${position}:`, {
						tekstas: searchText.substring(position, position + searchPhrase.length),
						originali: searchPhrase,
						kodai: Array.from(searchText.substring(position, position + searchPhrase.length))
							.map(c => `${c}:${c.charCodeAt(0)}`)
					});

                let match;
                while ((match = regex.exec(searchText)) !== null) {
                    const position = match.index;
                    const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                    const afterChar = position + searchPhrase.length < searchText.length ? 
                        searchText[position + searchPhrase.length] : ' ';

                    if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                        foundPhrases.push({
                            text: phrase,
                            start: position,
                            end: position + match[0].length,
                            type: metadata['kalbos dalis'],
                            cerf: metadata.CERF,
                            translation: metadata.vertimas
                        });
                        console.log(`${this.READER_NAME} Rasta skandinaviška frazė:`, {
                            fraze: phrase,
                            pozicija: position,
                            kontekstas: searchText.substring(
                                Math.max(0, position - 20),
                                Math.min(searchText.length, position + match[0].length + 20)
                            )
                        });
                    }
                }
            } else {
                // Įprasta paieška frazėms be skandinaviškų raidžių
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
                            type: metadata['kalbos dalis'],
                            cerf: metadata.CERF,
                            translation: metadata.vertimas
                        });
                        console.log(`${this.READER_NAME} Rasta frazė:`, {
                            fraze: phrase,
                            pozicija: position,
                            kontekstas: searchText.substring(
                                Math.max(0, position - 20),
                                Math.min(searchText.length, position + searchPhrase.length + 20)
                            )
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
