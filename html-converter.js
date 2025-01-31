import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';
import { AhoCorasick } from './aho-corasick.js';

export class HtmlConverter {
    constructor() {
        this.APP_NAME = '[HtmlConverter]';
        
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
        
        this.ALLOWED_TAGS = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'em', 'strong', 'p', 'br', 'hr',
            'ul', 'ol', 'li', 'blockquote',
            'code', 'pre', 'div', 'span'
        ];
        
        this.ALLOWED_CLASSES = ['dialog', 'triple-space', 'after-hr', 'phrases'];
    }

    async convertToHtml(text) {
        try {
            let html = marked(text);
            html = this.processSpecialElements(html);
            
            return DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                ALLOWED_CLASSES: this.ALLOWED_CLASSES,
                KEEP_CONTENT: true
            });
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida:`, error);
            throw error;
        }
    }

    processSpecialElements(html) {
        return html
            .replace(/<p>###DIALOG###(.*?)<\/p>/g, '<p class="dialog">– $1</p>')
            .replace(/<hr>\s*<p>/g, '<hr><p class="after-hr">')
            .replace(/§SECTION_BREAK§/g, '</p><div class="triple-space"></div><p>');
    }

    markPhrases(html, phrases) {
        try {
            const ac = new AhoCorasick();
            
            const uniquePhrases = [...new Set(phrases.map(p => p.text))]
                .map(text => ({ text, type: 'phrases' }));
            
            uniquePhrases.forEach(phrase => {
                ac.addPattern(phrase.text.toLowerCase(), 'phrases');
            });
            
            ac.buildFailureLinks();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            this.processNode(tempDiv, ac);
            
            return DOMPurify.sanitize(tempDiv.innerHTML, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                ALLOWED_CLASSES: this.ALLOWED_CLASSES,
                KEEP_CONTENT: true
            });
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida žymint frazes:`, error);
            return html;
        }
    }

    processNode(node, ac) {
        if (node.nodeType === Node.TEXT_NODE) {
            this.processTextNode(node, ac);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(child => this.processNode(child, ac));
        }
    }

    processTextNode(node, ac) {
		const text = node.textContent;
		if (!text.trim()) return;

		let matches = ac.search(text);
		
		// Pašaliname tikrus dublikatus (identiškas pozicijas)
		matches = this.removeDuplicates(matches);

		// Rūšiuojame pagal ilgį (ilgiausios frazės pirma) ir poziciją
		matches.sort((a, b) => {
			const lengthDiff = b.pattern.length - a.pattern.length;
			return lengthDiff !== 0 ? lengthDiff : a.start - b.start;
		});

		let processedRanges = [];
		let validMatches = [];

		for (const match of matches) {
			// Patikriname ar ši frazė nepersikerta su jau apdorotomis
			let canBeProcessed = true;

			for (const range of processedRanges) {
				// Jei frazė pilnai telpa į kitą - pridedame ją kaip sub-frazę
				if (match.start >= range.start && match.end <= range.end) {
					validMatches.push({
						...match,
						isSubPhrase: true,
						parentStart: range.start,
						parentEnd: range.end
					});
					canBeProcessed = false;
					break;
				}
				
				// Jei frazės persidengia - ignoruojame trumpesnę
				if (match.start < range.end && match.end > range.start) {
					canBeProcessed = false;
					break;
				}
			}

			if (canBeProcessed) {
				validMatches.push({...match, isSubPhrase: false});
				processedRanges.push({
					start: match.start,
					end: match.end
				});
			}
		}

		// Rūšiuojame validMatches pagal poziciją ir ilgį
		validMatches.sort((a, b) => {
			const posDiff = a.start - b.start;
			return posDiff !== 0 ? posDiff : b.pattern.length - a.pattern.length;
		});

		// Kuriame HTML rezultatą
		let result = '';
		let lastPos = 0;
		let openTags = [];

		for (let i = 0; i < validMatches.length; i++) {
			const match = validMatches[i];
        
			// Pridedame tekstą prieš frazę
			if (match.start > lastPos) {
				result += text.slice(lastPos, match.start);
			}

			// Uždarome ankstesnius tagus jei reikia
			while (openTags.length > 0 && openTags[openTags.length - 1].end <= match.start) {
				result += '</span>';
				openTags.pop();
			}

			// Atidarome naują tagą
			result += `<span class="phrases" data-pattern="${match.pattern}">`;
			openTags.push(match);

			if (i === validMatches.length - 1 || validMatches[i + 1].start > match.end) {
				// Pridedame frazės tekstą
				result += text.slice(match.start, match.end);
				lastPos = match.end;

				// Uždarome tagą
				result += '</span>';
				openTags.pop();
			}
		}

		// Pridedame likusį tekstą
		if (lastPos < text.length) {
			result += text.slice(lastPos);
		}

		// Uždarome likusius tagus
		while (openTags.length > 0) {
			result += '</span>';
			openTags.pop();
		}

		if (result !== text) {
			const wrapper = document.createElement('span');
			wrapper.innerHTML = result;
			node.replaceWith(wrapper);
		}
	}

	removeDuplicates(matches) {
		const seen = new Set();
		return matches.filter(match => {
			const key = `${match.start},${match.end},${match.pattern}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}
}
