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
            smartypants: false,
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
            console.log('Gautas tekstas:', text);

            // Laikinai išsaugome trigubas eilutes
            let processed = text.replace(/\n\n\n/g, '###TRIPLE_BREAK###');
            console.log('Po trigubų eilučių išsaugojimo:', processed);
            
            // Išsaugome dialogus (pakeičiame į specialų žymėjimą)
            processed = text.replace(/^[-–]\s(.+)$/gm, '###DIALOG###$1');
            console.log('Po dialogų brūkšnių:', processed);
            
            // Horizontalią liniją keičiame į HR
            processed = processed.replace(/^—$/gm, '<hr>\n');
            console.log('Po horizontalios linijos:', processed);
            
            // Konvertuojame į HTML
            let html = marked(processed);
            console.log('Po marked konversijos:', html);
            
            // Grąžiname dialogus
            html = html.replace(/<p>###DIALOG###(.+?)<\/p>/g, '<p class="dialog">– $1</p>');
            console.log('Po dialogų grąžinimo:', html);
            
            // Tvarkome trigubas eilutes
            html = html.replace(/###TRIPLE_BREAK###/g, '</p><div class="triple-space"></div><p>');
            console.log('Po sekcijų skirtukų:', processed);
            
            // Tvarkome horizontalią liniją ir sekantį tekstą
            html = html.replace(/<hr>\s*<p>/g, '<hr><p class="after-hr">');
            console.log('Po elementų grąžinimo:', html);

            // Išvalome HTML
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                ALLOWED_CLASSES: ['dialog', 'triple-space', 'after-hr'],
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false,
            });
            console.log('Po DOMPurify:', html);

            console.log(`${this.APP_NAME} HTML konversija baigta`);
            return html;

        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
