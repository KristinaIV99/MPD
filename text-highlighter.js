export class TextHighlighter {
    markPhrases(text, phrases) {
        // Sukuriame masyva su visomis žymėjimo pozicijomis
        const markers = [];
        
        // Sudedam visas pradžios ir pabaigos pozicijas
        for (const phrase of phrases) {
            markers.push({
                position: phrase.start,
                isStart: true,
                phrase: phrase
            });
            markers.push({
                position: phrase.end,
                isStart: false,
                phrase: phrase
            });
        }
        
        // Surūšiuojame markers. Jei pozicijos sutampa:
        // 1. Pirma einą pabaigos žymekliai (nuo ilgiausios frazės)
        // 2. Tada pradžios žymekliai (nuo trumpiausios frazės)
        markers.sort((a, b) => {
            if (a.position === b.position) {
                if (a.isStart === b.isStart) {
                    // Jei abu yra pabaigos žymekliai, ilgesnė frazė eina pirma
                    // Jei abu yra pradžios žymekliai, trumpesnė frazė eina pirma
                    const lengthDiff = a.phrase.end - a.phrase.start - (b.phrase.end - b.phrase.start);
                    return a.isStart ? lengthDiff : -lengthDiff;
                }
                return a.isStart ? 1 : -1; // Pabaigos žymeklis eina pirma
            }
            return a.position - b.position;
        });
        
        // Įterpiame žymeklius nuo galo, kad nepažeistume pozicijų
        let result = text;
        for (let i = markers.length - 1; i >= 0; i--) {
            const marker = markers[i];
            const markerText = marker.isStart ? '[[PHRASE_START]]' : '[[PHRASE_END]]';
            result = result.slice(0, marker.position) + markerText + result.slice(marker.position);
        }
        
        return result;
    }
}
