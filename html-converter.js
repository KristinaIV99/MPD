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

            // Pirmiausia pakeičiame dialogų brūkšnius į saugų HTML kodą
            let processed = text.replace(/–/g, '&ndash;');
            
            // Pakeičiame sekcijų skirtukus į HTML paragrafus su tarpais
            processed = processed.replace(/§SECTION_BREAK§/g, '</p><p><br><br></p><p>');
            
            // Horizontalią liniją keičiame į HR
            processed = processed.replace(/^—$/gm, '<hr>');

            // Konvertuojame į HTML
            let html = marked(processed);
            
            // Išvalome HTML
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false,
                ADD_ATTR: ['style'] // Leidžiame style atributą
            });

            // Apsaugome, kad neprarastume tarpų
            html = html.replace(/<p><br>/g, '<p style="margin-bottom: 2em;">');
            html = html.replace(/<br><br>/g, '<br style="margin-bottom: 1em;"><br style="margin-bottom: 1em;">');

            console.log(`${this.APP_NAME} HTML konversija baigta`);
            return html;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
