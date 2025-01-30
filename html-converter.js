import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor() {
        this.APP_NAME = '[HtmlConverter]';
        
        // Nustatome marked opcijas
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: false, // Išjungiame, kad nekonvertuotų brūkšnių
            pedantic: false
        });
        
        // Leidžiami HTML elementai
        this.ALLOWED_TAGS = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'em', 'strong',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'blockquote',
            'code', 'pre',
            'div', 'span'
        ];
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async convertToHtml(text) {
        try {
            console.log(`${this.APP_NAME} Pradedama konversija į HTML`);

            let processed = text;
            
            // Pakeičiame §SECTION_BREAK§ į trigubą naują eilutę
            processed = processed.replace(/§SECTION_BREAK§/g, '\n\n\n');
            
            // Išsaugome dialogų brūkšnius
            processed = processed.replace(/–/g, '---DASH---');
            
            // Horizontalus brūkšnys
            processed = processed.replace(/^—$/gm, '<hr>');

            // Konvertuojame į HTML
            let html = marked(processed);
            
            // Grąžiname dialogų brūkšnius
            html = html.replace(/---DASH---/g, '–');
            
            // Išvalome HTML
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false
            });

            // Pridedame papildomą tarpą tarp paragrafų
            html = html.replace(/\n\n\n/g, '<br><br>');

            console.log(`${this.APP_NAME} HTML konversija baigta`);
            return html;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
