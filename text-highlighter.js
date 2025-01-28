export class TextHighlighter {
    markPhrases(text, phrases) {
        let markedText = text;
        const sortedPhrases = [...phrases].sort((a, b) => b.start - a.start);
        
        for (const phrase of sortedPhrases) {
            const before = markedText.slice(0, phrase.start);
            const highlight = markedText.slice(phrase.start, phrase.end);
            const after = markedText.slice(phrase.end);
            
            markedText = `${before}[[PHRASE_START]]${highlight}[[PHRASE_END]]${after}`;
        }
        
        return markedText;
    }
}
