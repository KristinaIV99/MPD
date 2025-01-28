export class TextHighlighter {
    highlightPhrases(text, phrases) {
        let htmlText = text;
        const sortedPhrases = [...phrases].sort((a, b) => b.start - a.start);
        
        for (const phrase of sortedPhrases) {
            const before = htmlText.slice(0, phrase.start);
            const highlight = htmlText.slice(phrase.start, phrase.end);
            const after = htmlText.slice(phrase.end);
            
            htmlText = `${before}<span class="highlight">${highlight}</span>${after}`;
        }
        
        return htmlText;
    }
}
