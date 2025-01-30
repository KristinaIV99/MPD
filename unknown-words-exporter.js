class UnknownWordsExporter {
    constructor() {
        this.APP_NAME = '[UnknownWordsExporter]';
        this.unknownWords = new Map();
        this.knownWords = new Set();
    }

    async initialize() {
        try {
            const response = await fetch('./words.json');
            const wordsData = await response.json();
            
            Object.values(wordsData).forEach(wordInfo => {
                if (wordInfo.base_word) {
                    this.knownWords.add(wordInfo.base_word.toLowerCase());
                }
            });
            
            console.log(`${this.APP_NAME} Žodynas užkrautas, ${this.knownWords.size} bazinių žodžių`);
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida kraunant žodyną:`, error);
        }
    }

    isKnownWord(word) {
        return this.knownWords.has(word.toLowerCase());
    }

    cleanWord(word) {
        return word.replace(/[0-9•\-()]/g, '')
                  .replace(/[^a-zA-ZåäöÅÄÖ]/g, '')
                  .toLowerCase();
    }

    cleanSentence(sentence) {
        return sentence
            .replace(/^["']|["']$/g, '')
            .replace(/[#*_\[\]•]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    isSuitableSentence(sentence) {
        if (sentence.length < 10) return false;
        if (sentence.split(' ').length < 4) return false;
        if (sentence.includes('ISBN')) return false;
        if (sentence.includes('förlag')) return false;
        if (/^(TACK|Tack)/.test(sentence)) return false;
        if (/\([0-9]{4}\)/.test(sentence)) return false;
        if (sentence.split('•').length > 2) return false;
        if (/^[A-ZÅÄÖ\s]{10,}$/.test(sentence)) return false;
        return true;
    }

    rateQualitySentence(sentence) {
        let score = 0;
        
        if (/[.!?]$/.test(sentence)) score += 3;
        if (/^[A-ZÄÅÖ]/.test(sentence)) score += 2;
        
        const wordCount = sentence.split(' ').length;
        if (wordCount >= 4 && wordCount <= 15) score += 2;
        if (wordCount >= 4 && wordCount <= 10) score += 1;
        if ((sentence.match(/[(),:;]/g) || []).length > 2) score -= 1;
        
        return score;
    }

    processText(text) {
        console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
        
        const matches = text.match(/[^.!?]+[.!?]*/g) || [];
        const sentences = matches.map(s => s.trim()).filter(Boolean);
        
        console.log(`${this.APP_NAME} Rasti ${sentences.length} sakiniai`);
        
        sentences.forEach(sentence => {
            if (!this.isSuitableSentence(sentence)) return;

            const cleanedSentence = this.cleanSentence(sentence);
            
            const words = cleanedSentence
                .toLowerCase()
                .split(/\s+/);
            
            words.forEach(word => {
                const cleanedWord = this.cleanWord(word);
                if (cleanedWord && !this.isKnownWord(cleanedWord)) {
                    if (!this.unknownWords.has(cleanedWord)) {
                        this.unknownWords.set(cleanedWord, new Set());
                    }
                    this.unknownWords.get(cleanedWord).add(cleanedSentence);
                }
            });
        });

        console.log(`${this.APP_NAME} Rasta nežinomų žodžių: ${this.unknownWords.size}`);
    }

    exportToTxt() {
        console.log(`${this.APP_NAME} Pradedu eksportavimą`);
        let content = '';
        
        for (const [word, sentencesSet] of this.unknownWords) {
            console.log(`${this.APP_NAME} Apdoroju žodį: ${word}`);
            
            const processedSentences = Array.from(sentencesSet)
                .filter(sentence => this.isSuitableSentence(sentence));

            if (processedSentences.length > 0) {
                const bestSentence = processedSentences
                    .sort((a, b) => this.rateQualitySentence(b) - this.rateQualitySentence(a))[0];
                
                content += `${word}\t${bestSentence}\n`;
            } else {
                console.log(`${this.APP_NAME} Žodžiui "${word}" nerasta tinkamų sakinių`);
            }
        }

        if (!content) {
            console.log(`${this.APP_NAME} KLAIDA: Nėra turinio eksportavimui`);
            return;
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nezinomi_zodziai.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`${this.APP_NAME} Eksportuota ${this.unknownWords.size} nežinomų žodžių`);
    }
}
