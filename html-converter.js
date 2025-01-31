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
            'em', 'strong',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'blockquote',
            'code', 'pre',
            'div', 'span'
        ];
        
        this.ALLOWED_CLASSES = ['dialog', 'triple-space', 'after-hr', 'phrases'];
    }

    async convertToHtml(text) {
        try {
            let processed = text
                .replace(/^[-\u2013\u2014]\s(.+)$/gm, '###DIALOG###$1')
                .replace(/^—+$/gm, '<hr>')
                .replace(/§SECTION_BREAK§/g, '\n\n§SECTION_BREAK§\n\n');

            let html = marked(processed);
            
            html = html
                .replace(/<p>###DIALOG###(.+?)<\/p>/g, '<p class="dialog">– $1</p>')
                .replace(/<hr>\s*<p>/g, '<hr><p class="after-hr">')
                .replace(/§SECTION_BREAK§/g, '</p><div class="triple-space"></div><p>');

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

    markPhrases(html, phrases) {
        try {
            const ac = new AhoCorasick();
            phrases.forEach(phrase => ac.addPattern(phrase.text.toLowerCase(), 'phrases'));
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
            console.error(`${this.APP_NAME} Klaida:`, error);
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
        const matches = ac.search(text)
            .sort((a, b) => b.start - a.start);

        let newContent = text;
        matches.forEach(match => {
            const originalText = text.slice(match.start, match.end);
            const replacement = `<span class="phrases">${originalText}</span>`;
            newContent = this.spliceString(newContent, match.start, match.end - match.start, replacement);
        });

        if (newContent !== text) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = newContent;
            node.parentNode.replaceChild(wrapper, node);
        }
    }

    spliceString(str, start, deleteCount, insert) {
        return str.slice(0, start) + insert + str.slice(start + deleteCount);
    }
}
