import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor() {
        this.APP_NAME = '[HtmlConverter]';
        
        // Suderinamos marked opcijos su TextNormalizer
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            // Pridedame papildomas opcijas pagal TextNormalizer patterns
            smartypants: true,  // Specialiems simboliams
            pedantic: false,    // Laisvesniam Markdown
        });
        
        // Leidžiami HTML elementai pagal TextNormalizer pattern'us
        this.ALLOWED_TAGS = [
            // Headers iš handleHeaders()
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            // Emphasis ir Strong iš handleEmphasis()
            'em', 'strong',
            // Basic elements
            'p', 'br', 'hr',
            // Lists iš processBasicElements()
            'ul', 'ol', 'li',
            // Blockquotes iš normalizeQuotes()
            'blockquote',
            // Code blocks iš normalizeCodeBlocks()
            'code', 'pre',
            // Baziniai elementai
            'div', 'span'
        ];
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async convertToHtml(text) {
        try {
            console.log(`${this.APP_NAME} Pradedama konversija į HTML`);

            // Konvertuojame į HTML
            let html = marked(text);
            
            // Išvalome HTML pagal leistinus elementus
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false
            });

            console.log(`${this.APP_NAME} HTML konversija baigta`);
            return html;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
