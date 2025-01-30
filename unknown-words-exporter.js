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
		console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
		const sentences = text.split(/[.!?]+/).filter(Boolean);
		console.log(`${this.APP_NAME} Rasti ${sentences.length} sakiniai`);
		
		sentences.forEach(sentence => {
			const originalSentence = sentence.trim();
			const words = originalSentence
				.toLowerCase()
				.replace(/[#*_\[\]]/g, '')  // Pašaliname Markdown simbolius
				.replace(/\s+/g, ' ')       // Sutvarkome tarpus
				.split(/\s+/);
				
			console.log(`${this.APP_NAME} Sakinyje rasti žodžiai:`, words);
			
			words.forEach(word => {
				if (word && !this.isKnownWord(word)) {
					console.log(`${this.APP_NAME} Rastas nežinomas žodis: ${word}`);
					if (!this.unknownWords.has(word)) {
						this.unknownWords.set(word, new Set());
					}
					this.unknownWords.get(word).add(originalSentence);
				}
			});
		});
		
		console.log(`${this.APP_NAME} Viso rasta nežinomų žodžių:`, this.unknownWords.size);
	}

    exportToTxt() {
		console.log(`${this.APP_NAME} Pradedu eksportavimą`);
		let content = '';
		
		for (let [word, sentencesSet] of this.unknownWords) {
			console.log(`${this.APP_NAME} Apdoroju žodį: ${word}`);
			let processedSentences = Array.from(sentencesSet)
				.map(sentence => sentence
					.replace(/[#*_\[\]]/g, '')
					.replace(/\s+/g, ' ')
					.trim());
					
			console.log(`${this.APP_NAME} Rasti sakiniai:`, processedSentences);
			
			processedSentences = processedSentences.filter(sentence => 
				sentence.length > 0 && 
				sentence.split(' ').length > 3 &&
				/[.!?]$/.test(sentence));
				
			console.log(`${this.APP_NAME} Po filtravimo:`, processedSentences);

			if (processedSentences.length > 0) {
				let bestSentence = processedSentences
					.sort((a, b) => this.rateQualitySentence(b) - this.rateQualitySentence(a))[0];
				
				if (bestSentence) {
					console.log(`${this.APP_NAME} Pridedamas sakinys:`, bestSentence);
					content += `${word} | ${bestSentence}\n`;
				}
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
