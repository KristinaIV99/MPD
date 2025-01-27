export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
  }

  normalizeMarkdown(text) {
    try {
      let normalized = text;
      
      // 1. Horizontalios linijos (*** → ---)
      normalized = normalized.replace(/^\s*\*\*\*\s*$/gm, '---');
      
      // 2. Headers
      normalized = normalized.replace(/^#+\s+(.*?)\s*#*$/gm, '# $1');
      
      // 3. Citatos
      normalized = this.normalizeQuotes(normalized);
      
      // 4. Specialūs simboliai (paliekame ilgą brūkšnį "–")
      normalized = normalized
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
      
      // 5. Emphasis su žvaigždutėmis ir pabraukimais
      normalized = this.handleEmphasis(normalized);
      
      // 6. Tarpai
      normalized = this.cleanWhitespace(normalized);

      this.logger.log('Markdown normalized successfully');
      return normalized;
    } catch (error) {
      this.logger.error(`Normalization failed: ${error.message}`);
      return text;
    }
  }

  normalizeQuotes(text) {
    return text
      .replace(/^(\s*)&/gm, '>')
      .replace(/^>+/gm, '>');
  }

  handleEmphasis(text) {
    return text
      // Konvertuojame **storą tekstą** ir *pasvirąjį*
      .replace(/\*\*(\*?[^*]+?\*?)\*\*/g, '**$1**') // Išlaikome vidinius žvaigždutes
      .replace(/(\W|^)\*(\*?[^*\n]+?\*?)\*(\W|$)/g, '$1**$2**$3') // Storas tekstas su *
      .replace(/(\W|^)_([^_\n]+?)_(\W|$)/g, '$1*$2*$3') // Pasvirasis su _
      // Tvarkome "ni?\!*" → "*ni?\!*"
      .replace(/(\W|^)"([^"\n]+?)"\*(\W|$)/g, '$1*"$2"*$3');
  }

  cleanWhitespace(text) {
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/ \n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
