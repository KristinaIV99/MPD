export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
  }

  normalizeMarkdown(text) {
    try {
      // Pradinis teksto būsenos vizualizavimas
      this.visualizeTextState('INITIAL', text);

      let normalized = text;
      
      // 1. Pradinis eilučių tvarkymas
      normalized = this.normalizeLineEndings(normalized);
      this.visualizeTextState('AFTER_LINE_ENDINGS', normalized);
      
      // 2. Horizontalios linijos
      normalized = this.normalizeHorizontalRules(normalized);
      
      // 3. Antraštės
      normalized = this.normalizeHeaders(normalized);
      this.visualizeTextState('AFTER_HEADERS', normalized);
      
      // 4. Citatos
      normalized = this.normalizeQuotes(normalized);
      
      // 5. Specialūs simboliai
      normalized = this.normalizeSpecialCharacters(normalized);
      this.visualizeTextState('AFTER_SPECIAL_CHARS', normalized);
      
      // 6. Emphasis elementai
      normalized = this.handleEmphasis(normalized);
      this.visualizeTextState('AFTER_EMPHASIS', normalized);
      
      // 7. Tarpai ir tuščios eilutės
      normalized = this.cleanWhitespace(normalized);
      this.visualizeTextState('FINAL', normalized);

      this.logger.log('Markdown normalized successfully');
      return normalized;
    } catch (error) {
      this.logger.error(`Normalization failed: ${error.message}`);
      return text;
    }
  }

  visualizeTextState(stage, text) {
    this.logger.group(`Text state at: ${stage}`);
    this.logger.log('Text preview:', text.slice(0, 200));
    this.logger.log('Length:', text.length);
    this.logger.log('Lines:', text.split('\n').length);
    this.logger.log('Special characters:', this.findSpecialCharacters(text));
    this.logger.log('Markdown elements:', this.findMarkdownElements(text));
    this.logger.groupEnd();
  }

  findSpecialCharacters(text) {
    return {
      quotes: text.match(/[""'']/g) || [],
      dashes: text.match(/[–—]/g) || [],
      problematic: text.match(/[^\x20-\x7E\n]/g) || []
    };
  }

  findMarkdownElements(text) {
    return {
      headers: text.match(/^#+\s.*$/gm) || [],
      emphasis: text.match(/(\*\*.*?\*\*)|(\*.*?\*)|(_.*?_)/g) || [],
      horizontalRules: text.match(/^[\*\-_]{3,}\s*$/gm) || [],
      quotes: text.match(/^>\s.*$/gm) || []
    };
  }

  normalizeLineEndings(text) {
    return text.replace(/\r\n|\r/g, '\n');
  }

  normalizeHorizontalRules(text) {
    return text.replace(/^\s*[\*_]{3,}\s*$/gm, '---');
  }

  normalizeHeaders(text) {
    return text
      .replace(/^(#+)\s*(.*?)\s*#*$/gm, (match, hashes, content) => {
        // Pašaliname nereikalingus # iš pabaigos ir normalizuojame tarpus
        return `${hashes} ${content.trim()}`;
      })
      .replace(/^(={3,}|\-{3,})\s*$/gm, (match) => {
        // Konvertuojame setext stiliaus antraštes į ATX stilių
        return match[0] === '=' ? '# ' : '## ';
      });
  }

  normalizeQuotes(text) {
    return text
      .replace(/^(\s*)>[>\s]*/gm, '> ') // Sutvarkome įvairius citavimo variantus
      .replace(/^(\s*)&gt;/gm, '>');    // HTML entities → markdown
  }

  normalizeSpecialCharacters(text) {
    return text
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/\.\.\./g, '…')           // Trys taškai → vienas simbolis
      .replace(/--/g, '–')              // Du brūkšniai → vidutinis brūkšnys
      .replace(/\s+–\s+/g, ' – ');      // Normalizuojame tarpus aplink brūkšnius
  }

  handleEmphasis(text) {
    return text
      // Konvertuojame **storą tekstą**
      .replace(/\*{2}(.+?)\*{2}/g, '**$1**')
      // Konvertuojame *pasvirąjį tekstą*
      .replace(/(?<!\\)\*([^*\n]+)\*/g, '*$1*')
      // Konvertuojame _pasvirąjį tekstą_
      .replace(/(?<!\\)_([^_\n]+)_/g, '*$1*')
      // Tvarkome kombinuotus atvejus
      .replace(/\*{3}(.+?)\*{3}/g, '***$1***')
      // Išvalome nereikalingus escape simbolius
      .replace(/\\([*_])/g, '$1');
  }

  cleanWhitespace(text) {
    return text
      .replace(/[ \t]+/g, ' ')          // Daugybinius tarpus → vienas tarpas
      .replace(/^ +| +$/gm, '')         // Tarpai eilučių pradžioje/pabaigoje
      .replace(/\n{3,}/g, '\n\n')       // Daugybines tuščias eilutes → dvi
      .replace(/\n\s+\n/g, '\n\n')      // Tarpai tarp eilučių
      .trim();
  }
}
