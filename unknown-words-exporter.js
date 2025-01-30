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
            this.knownWords = new Set(wordsData.words.map(word => word.text.toLowerCase()));
            console.log(`${this.APP_NAME} Žodynas užkrautas, ${this.knownWords.size} žodžių`);
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida kraunant žodyną:`, error);
        }
    }

    isKnownWord(word) {
        return this.knownWords.has(word.toLowerCase());
    }

    processText(text) {
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        
        sentences.forEach(sentence => {
            const words = sentence.trim()
                .toLowerCase()
                .replace(/[^a-ząčęėįšųūž\s-]/g, '')
                .split(/\s+/);

            words.forEach(word => {
                if (word && !this.isKnownWord(word)) {
                    if (!this.unknownWords.has(word)) {
                        this.unknownWords.set(word, new Set());
                    }
                    this.unknownWords.get(word).add(sentence.trim());
                }
            });
        });
    }

    exportToTxt() {
        let content = '';
        
        this.unknownWords.forEach((sentences, word) => {
            sentences.forEach(sentence => {
                content += `${word} | ${sentence}\n`;
            });
        });

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
