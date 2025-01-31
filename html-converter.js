import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';
import { AhoCorasick } from './aho-corasick.js';

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
        
        // Pridedame ALLOWED_CLASSES klasių sąrašą
        this.ALLOWED_CLASSES = ['dialog', 'triple-space', 'after-hr', 'phrases', 'word', 'homonym'];
        
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
                ALLOWED_CLASSES: this.ALLOWED_CLASSES,
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
			console.log('Gautas HTML:', html);
			console.log('Gautos frazės:', phrases);
			
			// Sukuriame laikiną DOM elementą
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = html;
			console.log('Sukurtas laikinas DIV:', tempDiv.innerHTML);
			
			// Rūšiuojame frazes nuo ilgiausios iki trumpiausios
			const sortedPhrases = [...phrases].sort((a, b) => b.text.length - a.text.length);
			console.log('Surūšiuotos frazės:', sortedPhrases);
			
			// Einame per tekstinius mazgus
			const walkNodes = (node) => {
				if (node.nodeType === Node.TEXT_NODE) {
					let text = node.textContent;
					console.log('Tikrinamas tekstas:', text);

					// Tikriname ar tekstas turi frazių
					let hasChanges = false;
					let markedText = text;

					sortedPhrases.forEach(phrase => {
						const textLower = markedText.toLowerCase();
						const phraseLower = phrase.text.toLowerCase();
						
						// Ieškome frazės tekste
						const index = textLower.indexOf(phraseLower);
						if (index !== -1) {
							console.log(`Rasta frazė "${phrase.text}" pozicijoje ${index}`);
							// Paimame originalų tekstą iš tos vietos
							const originalPhrase = markedText.slice(index, index + phrase.text.length);
							// Pakeičiame originalų tekstą su span
							markedText = markedText.slice(0, index) + 
									`<span class="phrases">${originalPhrase}</span>` + 
									markedText.slice(index + phrase.text.length);
							hasChanges = true;
						}
					});

					// Jei buvo pakeitimų, atnaujiname mazgą
					if (hasChanges) {
						const span = document.createElement('span');
						span.innerHTML = markedText;
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
			
			return markedHtml;
			
		} catch (error) {
			console.error(`${this.APP_NAME} Klaida žymint frazes:`, error);
			throw error;
		}
	}

	markWords(html, words) {
		try {
			if (!words.length) return html;
			console.log(`${this.APP_NAME} Pradedamas žodžių žymėjimas`);
			
			let markedText = html;
			const sortedWords = [...words].sort((a, b) => b.start - a.start);

			sortedWords.forEach(word => {
				if (word.start !== undefined && word.end !== undefined) {
					markedText = markedText.slice(0, word.start) + 
							`<span class="word">${word.text}</span>` + 
							markedText.slice(word.end);
				}
			});
			
			const cleanHtml = DOMPurify.sanitize(markedText, {
				ALLOWED_TAGS: this.ALLOWED_TAGS,
				ALLOWED_CLASSES: this.ALLOWED_CLASSES,
				KEEP_CONTENT: true,
				ALLOW_DATA_ATTR: false,
			});
			
			console.log(`${this.APP_NAME} Žodžių žymėjimas baigtas`);
			return cleanHtml;
		} catch (error) {
			console.error(`${this.APP_NAME} Klaida žymint žodžius:`, error);
			throw error;
		}
	}
}
