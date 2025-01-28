findPhrases(text) {
    console.time('phraseSearch');
    if (!this.phrasesMap.size) {
        throw new Error('PhraseReader neinicializuotas. Pirma iškvieskite initialize()');
    }

    const foundPhrases = [];
    const searchText = text.toLowerCase();
    
    console.log(`${this.READER_NAME} Teksto pavyzdys (pirmi 100 simboliai):`, searchText.substring(0, 100));
    console.log(`${this.READER_NAME} Teksto kodavimas:`, 
        Array.from(searchText.substring(0, 100)).map(c => `${c}:${c.charCodeAt(0)}`));

    // Ieškome kiekvienos frazės
    for (const [phrase, metadata] of this.phrasesMap) {
        const searchPhrase = phrase.toLowerCase();
        
        if (this.hasScandinavianLetters(searchPhrase)) {
            console.log(`${this.READER_NAME} Ieškoma skandinaviška frazė:`, {
                originali: phrase,
                kodavimas: Array.from(searchPhrase).map(c => `${c}:${c.charCodeAt(0)}`)
            });

            let position = -1;
            while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                console.log(`${this.READER_NAME} Rasta skandinaviška frazė pozicijoje ${position}:`, {
                    tekstas: searchText.substring(position, position + searchPhrase.length),
                    originali: searchPhrase,
                    kodai: Array.from(searchText.substring(position, position + searchPhrase.length))
                        .map(c => `${c}:${c.charCodeAt(0)}`)
                });
                
                const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                const afterChar = position + searchPhrase.length < searchText.length ? 
                    searchText[position + searchPhrase.length] : ' ';

                if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                    foundPhrases.push({
                        text: phrase,
                        start: position,
                        end: position + searchPhrase.length,
                        type: metadata['kalbos dalis'],
                        cerf: metadata.CERF,
                        translation: metadata.vertimas
                    });
                }
            }
        } else {
            let position = -1;
            while ((position = searchText.indexOf(searchPhrase, position + 1)) !== -1) {
                const beforeChar = position > 0 ? searchText[position - 1] : ' ';
                const afterChar = position + searchPhrase.length < searchText.length ? 
                    searchText[position + searchPhrase.length] : ' ';
                
                if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
                    foundPhrases.push({
                        text: phrase,
                        start: position,
                        end: position + searchPhrase.length,
                        type: metadata['kalbos dalis'],
                        cerf: metadata.CERF,
                        translation: metadata.vertimas
                    });
                    console.log(`${this.READER_NAME} Rasta frazė:`, {
                        fraze: phrase,
                        pozicija: position,
                        kontekstas: searchText.substring(
                            Math.max(0, position - 20),
                            Math.min(searchText.length, position + searchPhrase.length + 20)
                        )
                    });
                }
            }
        }
    }

    foundPhrases.sort((a, b) => a.start - b.start);
    console.timeEnd('phraseSearch');
    console.log(`${this.READER_NAME} Rasta frazių:`, foundPhrases.length);
    
    return foundPhrases;
}
