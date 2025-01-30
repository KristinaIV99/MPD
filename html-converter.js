import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor(wordReader, phraseReader) {
        this.APP_NAME = '[HtmlConverter]';
        this.wordReader = wordReader;
        this.phraseReader = phraseReader;
        
        // Nustatome marked konfigūraciją
        marked.setOptions({
            breaks: true,           // Automatinis eilučių laužymas
            gfm: true,             // GitHub Flavored Markdown palaikymas
            headerIds: true,        // Automatiniai ID antraštėms
            mangle: false,          // Išjungiame teksto kodavimą
            sanitize: false,        // Išjungiame, nes naudosime DOMPurify
            smartLists: true,       // Išmanūs sąrašai
            smartypants: true,      // Tipografiniai patobulinimai
            xhtml: true            // XHTML palaikymas
        });
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async initialize() {
        try {
            // Čia galima pridėti papildomą inicializacijos logiką
            console.log(`${this.APP_NAME} Inicializacija sėkminga`);
            return true;
        } catch (error) {
            console.error(`${this.APP_NAME} Inicializacijos klaida:`, error);
            throw error;
        }
    }

    async convertToHtml(text, words = [], phrases = []) {
        try {
            console.log(`${this.APP_NAME} Pradedama konversija į HTML`);
            console.log(`${this.APP_NAME} Gauta žodžių:`, words.length);
            console.log(`${this.APP_NAME} Gauta frazių:`, phrases.length);

            // Konvertuojame Markdown į HTML
            let html = marked(text);
            console.log(`${this.APP_NAME} Markdown konvertuotas į HTML`);

            // Išvalome HTML nuo pavojingo turinio
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'p', 'br', 'b', 'i', 'strong', 'em',
                    'ul', 'ol', 'li', 'a', 'blockquote',
                    'code', 'pre', 'hr', 'span', 'div'
                ],
                ALLOWED_ATTR: ['class', 'id', 'data-*']
            });

            // Pridedame interaktyvius elementus
            const processedHtml = await this.processInteractiveElements(html, words, phrases);
            
            console.log(`${this.APP_NAME} HTML konversija baigta`);
            return processedHtml;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }

    async processInteractiveElements(html, words, phrases) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Pirma apdorojame frazes (ilgesni tekstai)
            for (const phrase of phrases) {
                await this.markPhrase(doc, phrase);
            }

            // Tada apdorojame pavienius žodžius
            for (const word of words) {
                await this.markWord(doc, word);
            }

            return doc.body.innerHTML;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida apdorojant interaktyvius elementus:`, error);
            throw error;
        }
    }

    async markWord(doc, word) {
        try {
            const textNodes = this.findTextNodes(doc.body);
            
            for (const node of textNodes) {
                let content = node.textContent;
                let startIndex = content.indexOf(word.text);
                
                // Jei žodis rastas ir dar nepažymėtas
                if (startIndex !== -1 && !this.isInsideMarkedElement(node)) {
                    const range = doc.createRange();
                    range.setStart(node, startIndex);
                    range.setEnd(node, startIndex + word.text.length);

                    const span = doc.createElement('span');
                    span.className = 'interactive-word';
                    span.dataset.type = word.type || 'unknown';
                    span.dataset.wordId = word.id || '';
                    span.dataset.start = word.start || startIndex;
                    span.dataset.end = word.end || (startIndex + word.text.length);

                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        console.warn(`${this.APP_NAME} Negalima pažymėti žodžio "${word.text}":`, e);
                    }
                }
            }
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida žymint žodį:`, error);
        }
    }

    async markPhrase(doc, phrase) {
        try {
            const textNodes = this.findTextNodes(doc.body);
            
            for (const node of textNodes) {
                let content = node.textContent;
                let startIndex = content.indexOf(phrase.text);
                
                // Jei frazė rasta ir dar nepažymėta
                if (startIndex !== -1 && !this.isInsideMarkedElement(node)) {
                    const range = doc.createRange();
                    range.setStart(node, startIndex);
                    range.setEnd(node, startIndex + phrase.text.length);

                    const span = doc.createElement('span');
                    span.className = 'interactive-phrase';
                    span.dataset.type = phrase.type || 'unknown';
                    span.dataset.phraseId = phrase.id || '';
                    span.dataset.start = phrase.start || startIndex;
                    span.dataset.end = phrase.end || (startIndex + phrase.text.length);

                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        console.warn(`${this.APP_NAME} Negalima pažymėti frazės "${phrase.text}":`, e);
                    }
                }
            }
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida žymint frazę:`, error);
        }
    }

    findTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Ignoruojame tuščius teksto mazgus
                    return node.textContent.trim() 
                        ? NodeFilter.FILTER_ACCEPT 
                        : NodeFilter.FILTER_REJECT;
                }
            },
            false
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    isInsideMarkedElement(node) {
        let parent = node.parentElement;
        while (parent) {
            if (parent.classList.contains('interactive-word') || 
                parent.classList.contains('interactive-phrase')) {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    // Pagalbinė funkcija klaidų apdorojimui
    handleError(error, context) {
        console.error(`${this.APP_NAME} Klaida ${context}:`, error);
        throw new Error(`${context}: ${error.message}`);
    }
}
