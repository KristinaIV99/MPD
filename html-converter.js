
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

            // Išsaugome dialogus (pakeičiame į specialų žymėjimą)
            let processed = text.replace(/^[-–]\s(.+)$/gm, '###DIALOG###$1');
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
            
            // Tvarkome trigubas eilutes (dabar naudojame §SECTION_BREAK§)
            html = html.replace(/§SECTION_BREAK§/g, '</p><div class="triple-space"></div><p>');
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

		markPhrases(html, phrases) {
			try {
				console.log(`${this.APP_NAME} Pradedamas frazių žymėjimas`);
				
				// Sukuriame laikiną DOM elementą
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = html;
				
				// Einame per tekstinius mazgus ir žymime frazes
				const walkNodes = (node) => {
					if (node.nodeType === Node.TEXT_NODE) {
						const text = node.textContent;
						const relevantPhrases = phrases.filter(phrase => 
							text.includes(phrase.text)
						);
						
						if (relevantPhrases.length > 0) {
							const span = document.createElement('span');
							let currentPos = 0;
							let result = '';
							
							relevantPhrases.forEach(phrase => {
								const startPos = text.indexOf(phrase.text);
								if (startPos !== -1) {
									result += text.substring(currentPos, startPos);
									result += `<span class="word">${phrase.text}</span>`;
									currentPos = startPos + phrase.text.length;
								}
							});
							
							result += text.substring(currentPos);
							span.innerHTML = result;
							node.parentNode.replaceChild(span, node);
						}
					} else if (node.nodeType === Node.ELEMENT_NODE) {
						Array.from(node.childNodes).forEach(walkNodes);
					}
				};
				
				walkNodes(tempDiv);
				
				// Išvalome HTML su DOMPurify
				const markedHtml = DOMPurify.sanitize(tempDiv.innerHTML, {
					ALLOWED_TAGS: this.ALLOWED_TAGS,
					ALLOWED_CLASSES: this.ALLOWED_CLASSES,
					KEEP_CONTENT: true,
					ALLOW_DATA_ATTR: false,
				});
				
				console.log(`${this.APP_NAME} Frazių žymėjimas baigtas`);
				return markedHtml;
				
			} catch (error) {
				console.error(`${this.APP_NAME} Klaida žymint frazes:`, error);
				throw error;
			}
		}
	}
}
