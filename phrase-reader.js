import { TextNormalizer } from './text-normalizer.js';

export class PhraseReader {
    constructor(options = {}) {
        this.READER_NAME = '[PhraseReader]';
        this.phrases = null;
        this.normalizer = new TextNormalizer();
        this.debug = options.debug || false;
    }

    async initialize() {
        try {
            const response = await fetch('phrases.json');
            if (!response.ok) {
                throw new Error(`Failed to load phrases: ${response.statusText}`);
            }
            this.phrases = await response.json();
            if (this.debug) {
                console.log(`${this.READER_NAME} Loaded ${Object.keys(this.phrases).length} phrases`);
            }
        } catch (error) {
            console.error(`${this.READER_NAME} Initialization error:`, error);
            throw error;
        }
    }

    findPhrases(text) {
        if (!this.phrases) {
            throw new Error('PhraseReader not initialized. Call initialize() first.');
        }

        // Sukuriame rezultatų masyvą, kur saugosime rastas frazes
        const foundPhrases = [];

        // Surūšiuojame frazes pagal ilgį (nuo ilgiausios iki trumpiausios)
        const sortedPhrases = Object.keys(this.phrases).sort((a, b) => b.length - a.length);

        // Einame per tekstą ir ieškome frazių
        for (const phraseKey of sortedPhrases) {
            const phraseData = this.phrases[phraseKey];
            const phrase = phraseData.fraze.toLowerCase();
            
            // Ieškome frazės tekste
            let position = -1;
            const normalizedText = text.toLowerCase();
            
            while ((position = normalizedText.indexOf(phrase, position + 1)) !== -1) {
                // Tikriname, ar tai pilnas žodis/frazė, o ne žodžio dalis
                const beforeChar = position > 0 ? normalizedText[position - 1] : ' ';
                const afterChar = position + phrase.length < normalizedText.length ? 
                    normalizedText[position + phrase.length] : ' ';
                
                if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                    foundPhrases.push({
                        phrase: phrase,
                        start: position,
                        end: position + phrase.length,
                        metadata: phraseData
                    });
                }
            }
        }

        // Rūšiuojame pagal poziciją tekste
        foundPhrases.sort((a, b) => a.start - b.start);

        return this.handleOverlappingPhrases(foundPhrases);
    }

    isWordBoundary(char) {
        // Tikriname, ar simbolis yra žodžių skirtukas
        return /[\s.,!?;:"'()[\]{}<>\\\/\-—]/.test(char);
    }

    handleOverlappingPhrases(phrases) {
        // Jau surūšiuota pagal pradžios poziciją
        return phrases.filter((phrase, index) => {
            // Jei tai paskutinė frazė, ją paliekame
            if (index === phrases.length - 1) return true;

            // Tikriname persidengimą su sekančia fraze
            const nextPhrase = phrases[index + 1];
            
            // Jei frazės persidengia, patikriname ar viena nėra kitos dalis
            if (this.doPhrasesOverlap(phrase, nextPhrase)) {
                // Jei dabartinė frazė yra ilgesnės frazės dalis, paliekame abi
                return true;
            }

            return true;
        });
    }

    doPhrasesOverlap(phrase1, phrase2) {
        return (phrase1.start <= phrase2.start && phrase1.end > phrase2.start) ||
               (phrase2.start <= phrase1.start && phrase2.end > phrase1.start);
    }

    processText(text) {
        // Randame frazes
        const foundPhrases = this.findPhrases(text);
        
        // Grąžiname objektą su tekstu ir rasta informacija
        return {
            originalText: text,
            phrases: foundPhrases.map(phrase => ({
                text: text.slice(phrase.start, phrase.end),
                start: phrase.start,
                end: phrase.end,
                type: phrase.metadata['kalbos dalis'],
                cerf: phrase.metadata.CERF,
                translation: phrase.metadata.vertimas
            }))
        };
    }
}
