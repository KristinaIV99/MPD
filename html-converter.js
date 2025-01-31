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
        
        matches = this.removeDuplicates(matches);

        matches.sort((a, b) => {
            const lengthDiff = b.pattern.length - a.pattern.length;
            return lengthDiff !== 0 ? lengthDiff : a.start - b.start;
        });

        const root = {
            start: 0,
            end: text.length,
            children: [],
            isRoot: true
        };

        let processedRanges = [];
        let validMatches = [];

        for (const match of matches) {
            let isValid = true;

            for (const range of processedRanges) {
                if (match.start >= range.start && match.end <= range.end) {
                    validMatches.push(match);
                    isValid = false;
                    break;
                }
                
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

        for (const match of validMatches) {
            this.insertIntoTree(root, match, text);
        }

        const newContent = this.treeToHtml(root, text);

        if (newContent !== text) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = newContent;
            node.replaceWith(wrapper);
        }
    }

    insertIntoTree(node, match, text) {
        let insertAt = node.children.length;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            
            if (match.start >= child.start && match.end <= child.end) {
                return this.insertIntoTree(child, match, text);
            }
            
            if (match.end <= child.start) {
                insertAt = i;
                break;
            }
        }

        node.children.splice(insertAt, 0, {
            start: match.start,
            end: match.end,
            pattern: match.pattern,
            children: []
        });
    }

    treeToHtml(node, text) {
        if (node.isRoot) {
            let result = '';
            let lastEnd = node.start;

            for (const child of node.children) {
                if (child.start > lastEnd) {
                    result += text.slice(lastEnd, child.start);
                }
                result += this.treeToHtml(child, text);
                lastEnd = child.end;
            }

            if (lastEnd < node.end) {
                result += text.slice(lastEnd, node.end);
            }

            return result;
        }

        let content = '';
        let lastEnd = node.start;

        for (const child of node.children) {
            if (child.start > lastEnd) {
                content += text.slice(lastEnd, child.start);
            }
            content += this.treeToHtml(child, text);
            lastEnd = child.end;
        }

        if (lastEnd < node.end) {
            content += text.slice(lastEnd, node.end);
        }

        return `<span class="phrases" data-pattern="${node.pattern}">${content}</span>`;
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
}
