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
                console.log(`${this.READER_NAME} Žodyno turinys:`, this.phrases);
                console.log(`${this.READER_NAME} Frazių skaičius:`, Object.keys(this.phrases).length);
                
                // Rodome kiekvienos frazės informaciją
                Object.entries(this.phrases).forEach(([key, value]) => {
                    console.log(`${this.READER_NAME} Frazė:`, {
                        frazė: key,
                        kalbosDalis: value['kalbos dalis'],
                        CERF: value.CERF,
                        vertimas: value.vertimas
                    });
                });
                
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
        console.time('phraseSearch');
        if (!this.phrasesMap.size) {
            throw new Error('PhraseReader neinicializuotas. Pirma iškvieskite initialize()');
        }

        const foundPhrases = [];
        const normalizedText = text.toLowerCase();
        let processedChars = 0;
        const totalChars = normalizedText.length;

        // Optimizuota paieška naudojant Map
        for (const [phrase, metadata] of this.phrasesMap) {
            let position = -1;
            
            while ((position = normalizedText.indexOf(phrase, position + 1)) !== -1) {
                // Tikriname žodžių ribas
                const beforeChar = position > 0 ? normalizedText[position - 1] : ' ';
                const afterChar = position + phrase.length < normalizedText.length ? 
                    normalizedText[position + phrase.length] : ' ';
                
                if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                    foundPhrases.push({
                        text: phrase,
                        start: position,
                        end: position + phrase.length,
                        type: metadata['kalbos dalis'],
                        cerf: metadata.CERF,
                        translation: metadata.vertimas
                    });
                }
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
