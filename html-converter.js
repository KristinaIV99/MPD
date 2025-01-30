import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor(wordReader, phraseReader) {
        this.wordReader = wordReader;
        this.phraseReader = phraseReader;
        
        // Konfigūruojame marked
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
        });
    }

    async convertToInteractiveHtml(normalizedText) {
        // 1. Konvertuojame į pradinį HTML
        let html = marked(normalizedText);
        
        // 2. Išvalome HTML
        html = DOMPurify.sanitize(html);
        
        // 3. Pridedame interaktyvius elementus žodžiams
        html = await this.addWordInteractivity(html);
        
        return html;
    }

    async addWordInteractivity(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Einame per teksto nodes ir pridedame interaktyvumą
        const textNodes = this.findTextNodes(doc.body);
        
        for (const node of textNodes) {
            await this.processTextNode(node);
        }
        
        return doc.body.innerHTML;
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

    async processTextNode(node) {
        const words = node.textContent.split(/\s+/);
        const fragment = document.createDocumentFragment();
        
        for (const word of words) {
            const wordInfo = await this.wordReader.getWordInfo(word);
            if (wordInfo) {
                const span = document.createElement('span');
                span.textContent = word;
                span.className = 'interactive-word';
                span.dataset.translation = wordInfo.translation;
                span.dataset.wordId = wordInfo.id;
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(word));
            }
            fragment.appendChild(document.createTextNode(' '));
        }
        
        node.parentNode.replaceChild(fragment, node);
    }
}
