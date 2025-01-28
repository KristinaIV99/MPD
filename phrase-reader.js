import { TextNormalizer } from './text-normalizer.js';

export class PhraseReader {
    constructor(options = {}) {
        this.READER_NAME = '[PhraseReader]';
        this.phrases = null;
        this.phrasesMap = new Map(); // Optimizuota duomenų struktūra
        this.normalizer = new TextNormalizer();
        this.debug = options.debug || false;
    }

    async initialize() {
        try {
            console.log(`${this.READER_NAME} Pradedamas frazių žodyno krovimas...`);
            console.time('phraseLoad'); // Pradedame matuti krovimo laiką
            
            const response = await fetch('phrases.json');
            if (!response.ok) {
                throw new Error(`Nepavyko užkrauti frazių: ${response.statusText}`);
            }

            const text = await response.text();
            console.log(`${this.READER_NAME} Žodyno dydis:`, (text.length / 1024 / 1024).toFixed(2), 'MB');
            
            try {
                this.phrases = JSON.parse(text);
                
                // Rodome detalią informaciją apie žodyną
                console.log(`${this.READER_NAME} Žodyno dydis:`, text.length, 'baitų');
                const sample = Object.keys(this.phrases).slice(0, 3);
                console.log(`${this.READER_NAME} Pavyzdinės frazės (pirmos 3):`, 
                    sample.map(key => ({
                        originalFraze: key,
                        kodavimas: Array.from(key).map(c => `${c}:${c.charCodeAt(0)}`),
                        duomenys: this.phrases[key]
                    }))
                );
                
                // Optimizuojame duomenų struktūrą paieškai
                this.preprocessPhrases();
                
                console.log(`${this.READER_NAME} Sėkmingai užkrautos ${Object.keys(this.phrases).length} frazės`);
                console.timeEnd('phraseLoad'); // Baigiame matuoti krovimo laiką
            } catch (jsonError) {
                console.error(`${this.READER_NAME} Klaida apdorojant JSON:`, jsonError);
                throw jsonError;
            }
        } catch (error) {
            console.error(`${this.READER_NAME} Initialization error:`, error);
            throw error;
        }
    }

    preprocessPhrases() {
        console.time('preprocess');
        // Tikriname ar frazė turi bent 2 žodžius ir rūšiuojame pagal ilgį
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

        // Normalizuojame frazes prieš įdėdami į Map
        for (const [key, value] of sortedPhrases) {
            const normalizedKey = key.normalize('NFC');
            console.log(`${this.READER_NAME} Frazė normalizuojama:`, {
                original: key,
                normalized: normalizedKey,
                kodavimas: Array.from(normalizedKey).map(c => `${c}:${c.charCodeAt(0)}`)
            });
            this.phrasesMap.set(normalizedKey, {
                ...value,
                length: normalizedKey.length,
                words: normalizedKey.toLowerCase().split(/\s+/).length
            });
        }

        // Sukuriame Map su preliminariai apdorotomis frazėmis
        for (const [key, value] of sortedPhrases) {
            this.phrasesMap.set(key.toLowerCase(), {
                ...value,
                length: key.length,
                words: key.toLowerCase().split(/\s+/).length // Žodžių skaičius optimizacijai
            });
        }
        console.timeEnd('preprocess');
        console.log(`${this.READER_NAME} Frazės paruoštos paieškai:`, this.phrasesMap.size);
    }

    findPhrases(text) {
		if (!this.phrasesMap.size) {
			throw new Error('PhraseReader neinicializuotas. Pirma iškvieskite initialize()');
		}
	
		const foundPhrases = [];
		
		// Svarbu: tekstą paverčiame į mažąsias raides ir koduojame vienodai
		const searchText = text.toLowerCase().normalize('NFD');
		
		console.log(`${this.READER_NAME} Teksto pavyzdys (pirmi 100 simboliai):`, searchText.substring(0, 100));
	
		// Ieškome kiekvienos frazės
		for (const [phrase, metadata] of this.phrasesMap) {
			// Svarbu: frazę paverčiame į mažąsias raides ir koduojame vienodai
			const searchPhrase = phrase.toLowerCase().normalize('NFD');
			
			console.log(`${this.READER_NAME} Ieškoma frazė:`, {
				originali: phrase,
				paieškos: searchPhrase
			});
	
			let position = -1;
			while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
				// Tikriname žodžių ribas
				const beforeChar = position > 0 ? searchText[position - 1] : ' ';
				const afterChar = position + searchPhrase.length < searchText.length ? 
					searchText[position + searchPhrase.length] : ' ';
				
				if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
					foundPhrases.push({
						text: phrase, // Išsaugome originalią frazę
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

    // Rūšiuojame pagal poziciją tekste
    foundPhrases.sort((a, b) => a.start - b.start);
    
    console.log(`${this.READER_NAME} Rasta frazių:`, foundPhrases.length);
    return foundPhrases;
}

            // Progreso sekimas
            processedChars += phrase.length;
            if (processedChars % 1000000 === 0) { // Kas milijoną simbolių
                console.log(`${this.READER_NAME} Apdorota ${Math.round(processedChars/totalChars*100)}%`);
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
