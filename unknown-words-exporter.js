export class UnknownWordsExporter {
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
        // Pašaliname skaičius ir specialius simbolius iš žodžio
        return word.replace(/[0-9•\-()]/g, '')
                  .replace(/[^a-zA-ZåäöÅÄÖ]/g, '')
                  .toLowerCase();
    }

    cleanSentence(sentence) {
        return sentence
            .replace(/^["']|["']$/g, '')         // Pašaliname kabutes pradžioje ir pabaigoje
            .replace(/[#*_\[\]•]/g, '')          // Pašaliname Markdown ir kitus spec. simbolius
            .replace(/\s+/g, ' ')                // Sutvarkome tarpus
            .trim();
    }

    isSuitableSentence(sentence) {
        // Patikriname ar sakinys tinkamas
        if (sentence.length < 10) return false;                    // Per trumpas
        if (sentence.split(' ').length < 4) return false;          // Per mažai žodžių
        if (sentence.includes('ISBN')) return false;               // Bibliografinis aprašas
        if (sentence.includes('förlag')) return false;             // Leidyklos informacija
        if (/^(TACK|Tack)/.test(sentence)) return false;          // Padėkos
        if (/\([0-9]{4}\)/.test(sentence)) return false;          // Datos skliausteliuose
        if (sentence.split('•').length > 2) return false;          // Sąrašai su bullets
        if (/^[A-ZÅÄÖ\s]{10,}$/.test(sentence)) return false;     // Antraštės didžiosiomis
        return true;
    }

    rateQualitySentence(sentence) {
        let score = 0;
        
        // Minusas už kabutes
        if (sentence.includes('"') || sentence.includes('"') || sentence.includes('"')) {
            score -= 5;
        }
        
        // Prioritetas sakiniams, kurie baigiasi .!?
        if (/[.!?]$/.test(sentence)) score += 3;
        
        // Tikriname ar sakinys prasideda didžiąja raide
        if (/^[A-ZÄÅÖ]/.test(sentence)) score += 2;
        
        // Tikriname ar sakinio ilgis yra optimalus (4-15 žodžių)
        const wordCount = sentence.split(' ').length;
        if (wordCount >= 4 && wordCount <= 15) score += 2;
        
        // Papildomi taškai už trumpesnius sakinius
        if (wordCount >= 4 && wordCount <= 10) score += 1;

        // Minusas už per daug specialių simbolių
        if ((sentence.match(/[(),:;]/g) || []).length > 2) score -= 1;
        
        return score;
    }

    processText(text) {
        console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
        
        // Išskaidome tekstą į sakinius, išsaugant originalius skyrybos ženklus
        const matches = text.match(/[^.!?]+[.!?]*/g) || [];
        const sentences = matches.map(s => s.trim()).filter(Boolean);
        
        // Pridedame atskiras eilutes
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        const allSentences = [...sentences, ...lines];
        
        console.log(`${this.APP_NAME} Rasti ${allSentences.length} sakiniai`);
        
        allSentences.forEach(sentence => {
            if (!this.isSuitableSentence(sentence)) {
                return; // Praleidžiame netinkamus sakinius
            }

            const cleanedSentence = this.cleanSentence(sentence);
            
            // Žodžių apdorojimas
            const words = cleanedSentence
                .toLowerCase()
                .split(/\s+/);
            
            words.forEach(word => {
                const cleanedWord = this.cleanWord(word);
                if (cleanedWord && !this.isKnownWord(cleanedWord)) {
                    if (!this.unknownWords.has(cleanedWord)) {
                        this.unknownWords.set(cleanedWord, new Set());
                    }
                    this.unknownWords.get(cleanedWord).add(sentence);
                }
            });
        });

        console.log(`${this.APP_NAME} Rasta nežinomų žodžių: ${this.unknownWords.size}`);
    }

    exportToTxt() {
        console.log(`${this.APP_NAME} Pradedu eksportavimą`);
        let content = '';
        
        for (let [word, sentencesSet] of this.unknownWords) {
            console.log(`${this.APP_NAME} Apdoroju žodį: ${word}`);
            
            let processedSentences = Array.from(sentencesSet)
                .filter(sentence => this.isSuitableSentence(sentence));

            if (processedSentences.length > 0) {
                // Rūšiuojame sakinius pagal kokybę
                const bestSentence = processedSentences
                    .sort((a, b) => this.rateQualitySentence(b) - this.rateQualitySentence(a))[0];
                
                if (bestSentence) {
                    content += `${word}\t${bestSentence}\n`;
                }
            } else {
                console.log(`${this.APP_NAME} Žodžiui "${word}" nerasta tinkamų sakinių`);
            }
        }

        if (content === '') {
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
