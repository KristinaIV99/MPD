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
            // Konvertuojame markdown į HTML
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
            // Sukuriame Aho-Corasick automatą
            const ac = new AhoCorasick();
            
            // Pašaliname dublikatus iš frazių
            const uniquePhrases = [...new Set(phrases.map(p => p.text))]
                .map(text => ({ text, type: 'phrases' }));
            
            // Įdedame frazes į automatą
            uniquePhrases.forEach(phrase => {
                ac.addPattern(phrase.text.toLowerCase(), 'phrases');
            });
            
            ac.buildFailureLinks();

            // Sukuriame DOM
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

        // Pašaliname dublikatus
        matches = this.removeDuplicates(matches);

        // Sutvarkome matches pagal frazių ilgį
        matches.sort((a, b) => b.pattern.length - a.pattern.length);

        let processedRanges = [];
        let validMatches = [];

        for (const match of matches) {
            // Tikriname ar ši frazė yra leistina
            let isValid = true;

            for (const range of processedRanges) {
                // Jei frazė yra kitos frazės dalis - leidžiame
                if (match.start >= range.start && match.end <= range.end) {
                    validMatches.push(match);
                    isValid = false;
                    break;
                }
                
                // Jei frazės persidengia - neleidžiame
                if (match.start < range.end && match.end > range.start) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                validMatches.push(match);
                processedRanges.push({
                    start: match.start,
                    end: match.end
                });
            }
        }

        // Rūšiuojame nuo galo, kad indeksai nesusimaišytų
        validMatches.sort((a, b) => b.start - a.start);

        // Žymime tekstą
        let newContent = text;
        for (const match of validMatches) {
            const original = text.slice(match.start, match.end);
            newContent = this.insertSpan(newContent, match.start, match.end, original);
        }

        if (newContent !== text) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = newContent;
            node.replaceWith(wrapper);
        }
    }

    removeDuplicates(matches) {
        return matches.filter((match, index, self) =>
            index === self.findIndex(m =>
                m.start === match.start &&
                m.end === match.end &&
                m.pattern === match.pattern
            )
        );
    }

    insertSpan(text, start, end, content) {
        return (
            text.slice(0, start) +
            `<span class="phrases">${content}</span>` +
            text.slice(end)
        );
    }
}
