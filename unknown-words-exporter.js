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
            
            // Surenkame visus bazinius žodžius iš words.json
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

    // Funkcija įvertinti sakinio kokybę
    rateQualitySentence(sentence) {
        let score = 0;
        
        // Tikriname ar sakinys prasideda didžiąja raide
        if (/^[A-ZÄÅÖ]/.test(sentence)) score += 1;
        
        // Tikriname ar sakinys baigiasi tinkamu skyrybos ženklu
        if (/[.!?]$/.test(sentence)) score += 1;
        
        // Tikriname ar sakinio ilgis yra optimalus
        const wordCount = sentence.split(' ').length;
        if (wordCount >= 5 && wordCount <= 20) score += 2;
        
        // Tikriname ar nėra kabučių viduryje sakinio
        if (!/[""]/.test(sentence)) score += 1;

        return score;
    }

    processText(text) {
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        
        sentences.forEach(sentence => {
            const originalSentence = sentence.trim();
            const words = originalSentence
                .toLowerCase()
                .replace(/[#*_\[\]]/g, '')  // Pašaliname Markdown simbolius
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
		let content = '';
		// Naudojame Map.entries() kad išlaikytume originalią eilės tvarką
		for (let [word, sentencesSet] of this.unknownWords) {
			let processedSentences = Array.from(sentencesSet)
				.map(sentence => sentence
					.replace(/[#*_\[\]]/g, '')  // Pašaliname Markdown simbolius
					.replace(/\s+/g, ' ')       // Sutvarkome tarpus
					.trim())
				.filter(sentence => 
					sentence.length > 0 && 
					sentence.split(' ').length > 3 &&
					/[.!?]$/.test(sentence));   // Tik pilni sakiniai

			// Renkame geriausią sakinį pagal reitingavimo sistemą
			if (processedSentences.length > 0) {
				let bestSentence = processedSentences
					.sort((a, b) => this.rateQualitySentence(b) - this.rateQualitySentence(a))[0];
				
				if (bestSentence) {
					content += `${word} | ${bestSentence}\n`;
				}
			}
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
