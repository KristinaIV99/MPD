import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor(wordReader, phraseReader) {
        this.APP_NAME = '[HtmlConverter]';
        this.wordReader = wordReader;
        this.phraseReader = phraseReader;
        
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
        });
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async convertToHtml(text, words, phrases) {
        console.log(`${this.APP_NAME} Pradedama konversija į HTML`);
        
        // Konvertuojame į pradinį HTML
        let html = marked(text);
        console.log(`${this.APP_NAME} Markdown konvertuotas į HTML`);
        
        // Išvalome HTML
        html = DOMPurify.sanitize(html);
        
        // Pridedame interaktyvius elementus
        const processedHtml = await this.processInteractiveElements(html, words, phrases);
        
        return processedHtml;
    }

    async processInteractiveElements(html, words, phrases) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Apdorojame žodžius ir frazes
        for (const word of words) {
            await this.markWord(doc, word);
        }
        
        for (const phrase of phrases) {
            await this.markPhrase(doc, phrase);
        }
        
        return doc.body.innerHTML;
    }

    async markWord(doc, word) {
        const range = document.createRange();
        const textNodes = this.findTextNodes(doc.body);
        
        for (const node of textNodes) {
            const index = node.textContent.indexOf(word.text);
            if (index !== -1) {
                range.setStart(node, index);
                range.setEnd(node, index + word.text.length);
                
                const span = doc.createElement('span');
                span.className = 'interactive-word';
                span.dataset.type = word.type;
                span.dataset.wordId = word.id;
                
                range.surroundContents(span);
            }
        }
    }

    async markPhrase(doc, phrase) {
        // Panašiai kaip markWord, bet frazėms
        // ...
    }

    findTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }
}
