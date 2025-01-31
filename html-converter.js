// html-converter.js
import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';
import { AhoCorasick } from './aho-corasick.js';

export class HtmlConverter {
  constructor() {
    this.ALLOWED_TAGS = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'em', 'strong', 'p', 'br', 'hr',
      'ul', 'ol', 'li', 'blockquote',
      'code', 'pre', 'div', 'span'
    ];
    
    this.ALLOWED_CLASSES = [
      'dialog', 'triple-space',
      'after-hr', 'phrases'
    ];
  }

  async convertToHtml(text) {
    try {
      // 1. Pirminis Markdown konvertavimas
      let html = marked(text);

      // 2. Specialių elementų apdorojimas
      html = this.processSpecialElements(html);

      // 3. HTML sanitizavimas
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: this.ALLOWED_TAGS,
        ALLOWED_CLASSES: this.ALLOWED_CLASSES,
        KEEP_CONTENT: true
      });

    } catch (error) {
      console.error('[HtmlConverter] Klaida:', error);
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
      // 1. Sukuriame automatoną
      const ac = new AhoCorasick();
      phrases.forEach(phrase => {
        console.log("Pridedama frazė:", phrase.text);
        ac.addPattern(phrase.text.toLowerCase(), 'phrase');
      });
      ac.buildFailureLinks();

      // 2. Sukuriame laikiną DOM elementą
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // 3. Apdorojame tekstinius mazgus
      this.processNode(tempDiv, ac);

      // 4. Grąžiname sanitizuotą HTML
      return DOMPurify.sanitize(tempDiv.innerHTML, {
        ALLOWED_TAGS: this.ALLOWED_TAGS,
        ALLOWED_CLASSES: this.ALLOWED_CLASSES,
        KEEP_CONTENT: true
      });

    } catch (error) {
      console.error('[HtmlConverter] Klaida žymint frazes:', error);
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
    let matches = ac.search(text);
    console.log("Rastos frazės:", matches);
    
    // Surūšiuojame frazes pagal ilgį (ilgiausios pirma)
    matches.sort((a, b) => {
        if (a.pattern.length === b.pattern.length) {
            return a.start - b.start;
        }
        return b.pattern.length - a.pattern.length;
    });

    let validMatches = [];
    for (const current of matches) {
        let isValid = true;

        for (const existing of validMatches) {
            // Tikriname ar tai leistinas persidengimas
            const isSmallerInLarger = (
                current.start >= existing.start && 
                current.end <= existing.end
            );
            
            // Tikriname ar frazių galai/pradžios sutampa
            const isEndMeetingStart = (
                current.start === existing.end || 
                current.end === existing.start
            );

            // Jei nei viena sąlyga netinka, frazė negalioja
            if (!isSmallerInLarger && !isEndMeetingStart) {
                const hasOverlap = (
                    current.start < existing.end && 
                    current.end > existing.start
                );
                if (hasOverlap) {
                    isValid = false;
                    break;
                }
            }
        }

        if (isValid) {
            validMatches.push(current);
        }
    }

    // Žymime tekstą nuo galo
    validMatches.sort((a, b) => b.start - a.start);
    let newContent = text;
    
    for (const match of validMatches) {
        const original = text.slice(match.start, match.end);
        newContent = this.spliceString(
            newContent,
            match.start,
            match.end - match.start,
            `<span class="phrases">${original}</span>`
        );
    }

    if (newContent !== text) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = newContent;
        node.replaceWith(wrapper);
    }
  }

  removeOverlaps(matches) {
    if (matches.length <= 1) return matches;
    
    // Rūšiuojame pagal pradžios poziciją
    matches.sort((a, b) => a.start - b.start);
    
    const result = [matches[0]];
    let lastEnd = matches[0].end;
    
    for (let i = 1; i < matches.length; i++) {
        if (matches[i].start >= lastEnd) {
            result.push(matches[i]);
            lastEnd = matches[i].end;
        }
    }
    
    return result;
  }

  spliceString(str, start, deleteCount, insert) {
    return str.slice(0, start) + insert + str.slice(start + deleteCount);
  }
}
