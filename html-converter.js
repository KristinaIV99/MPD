import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
   constructor() {
       this.APP_NAME = '[HtmlConverter]';
       
       // Papildomos konversijos taisyklės
       this.preProcessRules = [
           { pattern: /^[&][ \t]*$/gm, replace: '\n\n\n' },  // & į 3 tuščias eilutes
           { pattern: /^(?:[-*_]\s*){3,}$/gm, replace: '<hr class="full-width">' }, // *** į pilno pločio HR
           { pattern: /–/g, replace: '<span class="dialog-dash">–</span>' }, // Dialogo brūkšnys
       ];

       // Nustatome marked opcijas
       marked.setOptions({
           breaks: true,
           gfm: true,
           headerIds: true,
           mangle: false,
           sanitize: false,
           smartLists: true,
           smartypants: false,  // Išjungiame, nes patys tvarkome specialius simbolius
           pedantic: false
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

       this.ALLOWED_CLASSES = [
           'full-width',    // HR elementams
           'dialog-dash'    // Dialogo brūkšniams
       ];
       
       console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
   }

   preProcessText(text) {
       let processed = text;
       for (const rule of this.preProcessRules) {
           processed = processed.replace(rule.pattern, rule.replace);
       }
       return processed;
   }

   async convertToHtml(text) {
       try {
           console.log(`${this.APP_NAME} Pradedama konversija į HTML`);

           // Pritaikome išankstines taisykles
           let processed = this.preProcessText(text);

           // Konvertuojame į HTML
           let html = marked(processed);
           
           // Išvalome HTML pagal leistinus elementus
           html = DOMPurify.sanitize(html, {
               ALLOWED_TAGS: this.ALLOWED_TAGS,
               ALLOWED_CLASSES: this.ALLOWED_CLASSES,
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
