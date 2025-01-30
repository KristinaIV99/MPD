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

    rateQualitySentence(sentence) {
        let score = 0;
        
        // Prioritetas sakiniams, kurie baigiasi .!?
        if (/[.!?]$/.test(sentence)) score += 3;
        
        // Tikriname ar sakinys prasideda didžiąja raide
        if (/^[A-ZÄÅÖ]/.test(sentence)) score += 2;
        
        // Tikriname ar sakinio ilgis yra optimalus (5-20 žodžių)
        const wordCount = sentence.split(' ').length;
        if (wordCount >= 5 && wordCount <= 20) score += 2;
        
        // Papildomi taškai už trumpesnius sakinius (lengviau suprasti)
        if (wordCount >= 5 && wordCount <= 12) score += 1;
        
        return score;
    }

    processText(text) {
        console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
        
        // Išskaidome tekstą į sakinius, išsaugant originalius skyrybos ženklus
        const matches = text.match(/[^.!?]+[.!?]*/g) || [];
        const sentences = matches.map(s => s.trim()).filter(Boolean);
        
        console.log(`${this.APP_NAME} Rasti ${sentences.length} sakiniai`);
        
        sentences.forEach(sentence => {
            const originalSentence = sentence.trim();
            
            // Žodžių apdorojimas
            const words = originalSentence
                .toLowerCase()
                .replace(/[#*_\[\]]/g, '')  // Pašaliname Markdown simbolius
                .replace(/[.,!?]/g, '')     // Pašaliname skyrybos ženklus žodžių identifikavimui
                .replace(/\s+/g, ' ')       // Sutvarkome tarpus
                .split(/\s+/);
            
            words.forEach(word => {
                if (word && !this.isKnownWord(word)) {
                    if (!this.unknownWords.has(word)) {
                        this.unknownWords.set(word, new Set());
                    }
                    this.unknownWords.get(word).add(originalSentence);
                }
            });
        });
    }

    exportToTxt() {
        console.log(`${this.APP_NAME} Pradedu eksportavimą`);
        let content = '';
        
        for (let [word, sentencesSet] of this.unknownWords) {
            console.log(`${this.APP_NAME} Apdoroju žodį: ${word}`);
            
            // Pirmiausia bandome rasti sakinius su .!?
            let processedSentences = Array.from(sentencesSet)
                .map(sentence => sentence
                    .replace(/[#*_\[\]]/g, '')  // Pašaliname tik Markdown simbolius
                    .replace(/\s+/g, ' ')       // Sutvarkome tarpus
                    .trim());
            
            // Filtruojame sakinius pagal minimalų ilgį
            processedSentences = processedSentences.filter(sentence => 
                sentence.length > 0 && 
                sentence.split(' ').length > 3
            );

            if (processedSentences.length > 0) {
                // Rūšiuojame sakinius pagal kokybę
                const bestSentence = processedSentences
                    .sort((a, b) => this.rateQualitySentence(b) - this.rateQualitySentence(a))[0];
                
                content += `${word} | ${bestSentence}\n`;
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
