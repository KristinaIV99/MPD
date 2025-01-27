// text-normalizer.js
export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
  }

  // Pagrindinė normalizavimo funkcija
  normalizeMarkdown(text) {
    try {
      let normalized = text;
      
      // 1. Headers
      normalized = normalized.replace(/^#\s+(.*?)\s*#*$/gm, '# $1');
      normalized = normalized.replace(/_+/g, '_');  // Sutvarkome visus pabraukimus

      // 2. Citatos ir blokai
      normalized = this.normalizeQuotes(normalized);
      
      // 3. Specialūs simboliai
      normalized = normalized.replace(/[“”]/g, '"');
      normalized = normalized.replace(/[‘’]/g, "'");
      normalized = normalized.replace(/–/g, '-');
      
      // 4. Emphasis ir escape
      normalized = this.handleEmphasis(normalized);
      
      // 5. Tarpai ir eilučių tarpai
      normalized = this.cleanWhitespace(normalized);

      this.logger.log('Markdown normalized successfully');
      return normalized;
    } catch (error) {
      this.logger.error(`Normalization failed: ${error.message}`);
      return text;
    }
  }

  // Privatūs metodai (be # sintaksės)
  normalizeQuotes(text) {
    return text
      .replace(/(\n|^)\s*&/g, '\n>')
      .replace(/(\n|^)>+/g, '\n>');
  }

  handleEmphasis(text) {
    return text
      .replace(/(\w)_(\w)/g, '$1\\_$2')
      .replace(/(^|\s)_([^_]+?)_(\s|$)/g, '$1*$2*$3')
      .replace(/\*\*(.*?)\*\*/g, '**$1**');
  }

  cleanWhitespace(text) {
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/ \n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  normalizePlainText(text) {
    return this.normalizeMarkdown(text).replace(/[*_>#]/g, '');
  }
}
