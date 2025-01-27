export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
  }
  
  normalizeMarkdown(text) {
    try {
      let normalized = text;
      
      // 1. Horizontalios linijos (patobulintas - priima *, - ir _)
      normalized = normalized.replace(/^\s*([*\-_])\1{2,}\s*$/gm, '---');
      
      // 2. Headers (nepakeista - veikia gerai)
      normalized = normalized.replace(/^#+\s+(.*?)\s*#*$/gm, '# $1');
      
      // NAUJAS: Sąrašai
      normalized = normalized.replace(/^[\s-]*[-+*]\s+/gm, '* ');
      
      // 3. Citatos (nepakeista - veikia gerai)
      normalized = this.normalizeQuotes(normalized);
      
      // NAUJAS: Kodo blokai
      normalized = this.normalizeCodeBlocks(normalized);
      
      // 4. Specialūs simboliai (papildyta)
      normalized = normalized
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/\.{3}/g, '…');      // Naujas: trys taškai → vienas simbolis
      
      // 5. Emphasis (nepakeista - veikia gerai)
      normalized = this.handleEmphasis(normalized);
      
      // 6. Tarpai (papildyta tuščiomis eilutėmis prieš specialius elementus)
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

  // NAUJAS metodas kodo blokams
  normalizeCodeBlocks(text) {
    return text
      // Kodo blokai
      .replace(/```(.*?)\n(.*?)```/gs, (match, lang, code) => {
        return '```' + lang.trim() + '\n' + code.trim() + '\n```';
      })
      // Inline kodas
      .replace(/`([^`]+)`/g, (match, code) => {
        return '`' + code.trim() + '`';
      });
  }

  handleEmphasis(text) {
    return text
      .replace(/\*\*(\*?[^*]+?\*?)\*\*/g, '**$1**')
      .replace(/(\W|^)\*(\*?[^*\n]+?\*?)\*(\W|$)/g, '$1**$2**$3')
      .replace(/(\W|^)_([^_\n]+?)_(\W|$)/g, '$1*$2*$3')
      .replace(/(\W|^)"([^"\n]+?)"\*(\W|$)/g, '$1*"$2"*$3');
  }

  cleanWhitespace(text) {
    return text
      .replace(/[ \t]+/g, ' ')           // Daugybinius tarpus → vienas tarpas
      .replace(/ \n/g, '\n')             // Tarpai eilutės gale
      .replace(/\n{3,}/g, '\n\n')        // 3+ tuščios eilutės → 2
      .replace(/(\n[#>*-])/g, '\n\n$1')  // NAUJAS: tuščia eilutė prieš specialius elementus
      .trim();
  }
}
