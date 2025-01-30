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

    isStandaloneFormat(line, allLines) {
        const index = allLines.indexOf(line);
        const hasPrevEmpty = index === 0 || !allLines[index - 1].trim();
        const hasNextEmpty = index === allLines.length - 1 || !allLines[index + 1].trim();
        const hasNoParaMarkers = !line.includes(',') && !line.includes(':') && !line.includes(';');
        
        const isTitleLike = (
            /^[A-ZÅÄÖ\s\-*#]+$/.test(line) ||
            line.includes('ISBN') ||
            /^\*[^*]+\*$/.test(line) ||
            /^#/.test(line) ||
            /^\d+/.test(line)
        );
        
        return (hasPrevEmpty && hasNextEmpty && hasNoParaMarkers) || isTitleLike;
    }

    isSuitableSentence(sentence, isStandalone = false) {
        if (isStandalone) {
            // Mažiau griežti reikalavimai atskiriems elementams
            return sentence.length > 0 && 
                   !sentence.includes('förlag') &&
                   !/^(TACK|Tack)/.test(sentence);
        }
        
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

    rateQualitySentence(sentence, isStandalone = false) {
        let score = 0;
        
        // Minusas už kabutes
        if (sentence.includes('"') || sentence.includes('"') || sentence.includes('"')) {
            score -= 5;
        }

        if (!isStandalone) {
            // Pilni sakiniai
            if (/[.!?]$/.test(sentence)) score += 3;
            if (/^[A-ZÄÅÖ]/.test(sentence)) score += 2;
            const wordCount = sentence.split(' ').length;
            if (wordCount >= 4 && wordCount <= 15) score += 2;
            if (wordCount >= 4 && wordCount <= 10) score += 1;
            if ((sentence.match(/[(),:;]/g) || []).length > 2) score -= 1;
        } else {
            // Atskiri elementai gauna bazinį žemesnį prioritetą
            score -= 3;
        }
        
        return score;
    }

    processText(text) {
        console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
        
        // Išskaidome tekstą į sakinius, išsaugant originalius skyrybos ženklus
        const matches = text.match(/[^.!?]+[.!?]*/g) || [];
        const sentences = matches.map(s => s.trim()).filter(Boolean);
        
        // Gauname visas eilutes ir atskirus elementus
        const allLines = text.split('\n').map(line => line.trim());
        const standaloneElements = allLines
            .filter(line => line && this.isStandaloneFormat(line, allLines));
        
        const allSentences = [...sentences, ...standaloneElements];
        
        console.log(`${this.APP_NAME} Rasti ${allSentences.length} sakiniai`);
        
        allSentences.forEach(sentence => {
            // Nustatome ar tai atskiras elementas
            const isStandalone = standaloneElements.includes(sentence);
            
            if (!this.isSuitableSentence(sentence, isStandalone)) {
                return;
            }

            const cleanedSentence = this.cleanSentence(sentence);
            const words = cleanedSentence.toLowerCase().split(/\s+/);
            
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
        
        // Gauname visas eilutes dar kartą standaloneElements patikrinimui
        const allLines = text.split('\n').map(line => line.trim());
        const standaloneElements = allLines
            .filter(line => line && this.isStandaloneFormat(line, allLines));
        
        for (let [word, sentencesSet] of this.unknownWords) {
            console.log(`${this.APP_NAME} Apdoroju žodį: ${word}`);
            
            let sentences = Array.from(sentencesSet);
            
            if (sentences.length > 0) {
                // Rūšiuojame sakinius pagal kokybę
                const bestSentence = sentences
                    .sort((a, b) => {
                        const isStandaloneA = standaloneElements.includes(a);
                        const isStandaloneB = standaloneElements.includes(b);
                        return this.rateQualitySentence(b, isStandaloneB) - 
                               this.rateQualitySentence(a, isStandaloneA);
                    })[0];
                
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
