import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor() {
        this.APP_NAME = '[HtmlConverter]';
        
        // Nustatome marked konfigūraciją
        marked.setOptions({
            breaks: true,           // Automatinis eilučių laužymas
            gfm: true,             // GitHub Flavored Markdown palaikymas
            headerIds: true,        // Automatiniai ID antraštėms
            mangle: false,          // Išjungiame teksto kodavimą
            sanitize: false,        // Išjungiame, nes naudosime DOMPurify
            smartLists: true,       // Išmanūs sąrašai
        });
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async convertToHtml(text) {
        try {
            console.log(`${this.APP_NAME} Pradedama konversija į HTML`);

            // Konvertuojame Markdown į HTML
            let html = marked(text);
            console.log(`${this.APP_NAME} Markdown konvertuotas į HTML`);

            // Išvalome HTML
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'p', 'br', 'b', 'i', 'strong', 'em',
                    'ul', 'ol', 'li', 'a', 'blockquote',
                    'code', 'pre', 'hr'
                ]
            });

            return html;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
