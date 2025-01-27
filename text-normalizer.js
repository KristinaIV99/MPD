export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
  }

  normalizeMarkdown(text) {
    try {
      let normalized = text;
      
      // 1. Headers - tvarkome tik # kiekį pabaigoje
      normalized = normalized.replace(/^#+\s+(.*?)\s*#*$/gm, '# $1');
      
      // 2. Citatos - normalizuojame į >
      normalized = this.normalizeQuotes(normalized);
      
      // 3. Specialūs simboliai
      normalized = normalized.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/–/g, '-');
      
      // 4. Emphasis - tvarkome pirmiausia
      normalized = this.handleEmphasis(normalized);
      
      // 5. Tarpai
      normalized = this.cleanWhitespace(normalized);

      this.logger.log('Markdown normalized successfully');
      return normalized;
    } catch (error) {
      this.logger.error(`Normalization failed: ${error.message}`);
      return text;
    }
  }

  normalizeQuotes(text) {
    return text.replace(/^(\s*)&/gm, '>') // Citatos iš &
      .replace(/^>+/gm, '>'); // Perteklinius > pašaliname
  }

  handleEmphasis(text) {
    return text
      // Pirmiausia konvertuojame __bold__ į **bold**
      .replace(/__([^_]+)__/g, '**$1**')
      // Tada _emphasis_ su bet kokiais ribotais simboliais
      .replace(/(\W|^)_([^_]+)_(\W|$)/g, '$1*$2*$3')
      // Escape'iname likusius _ ženklus žodžiuose
      .replace(/(\w)_(\w)/g, '$1\\_$2');
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
