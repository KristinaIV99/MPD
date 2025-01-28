
class TextNormalizer {
  constructor() {
    this.NORMALIZER_NAME = '[TextNormalizer]';
    
    this.patterns = {
      emphasis: [/_([^_]+?)_/g, /(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g],
      strong: [/__([^_]+?)__/g, /\*\*([^*]+?)\*\*/g],
      headers: /^(#{1,6})\s*(.+)$/gm,
      lists: /^[\s-]*[-+*]\s+/gm,
      blockquotes: /^>\s*(.+)$/gm,
      horizontalRules: /^(?:[-*_]\s*){3,}$/gm,
      codeBlocks: /```([\s\S]*?)```/g,
      inlineCode: /`([^`]+)`/g,
      enDash: /–/g,
      quotes: /["']/g,
      strongEmphasis: [/\*\*\*([^*]+?)\*\*\*/g],
      chapterTitle: /^#\s(.+)$/m,
      emptyLines: /\n\s*\n/g,
      paragraphs: /([^\n])\n([^\n])/g,
      images: /!\[([^\]]*)\]\([^)]+\)/g,                     // Markdown paveiksliukai
      htmlImages: /<img[^>]+>/g,                             // HTML paveiksliukai
      markdownLinks: /\[([^\]]+)\]\([^\)]+\)/g,                    // [[vidines-nuorodos]]
      htmlLinks: /<a[^>]*>([^<]*)<\/a>/g,                   // HTML nuorodos
      localPaths: /(?:\.\.?\/)*[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g, // Lokalūs keliai
      htmlTags: /<[^>]+>/g,                                  // Visos HTML žymės
      bareUrls: /(?:https?:\/\/)[^\s)]+/g                          // HTTP/HTTPS nuorodos
    };
  }

  normalizeMarkdown(text) {
    try {
      console.debug(`${this.NORMALIZER_NAME} === normalizeMarkdown START ===\nOriginal text: ${text}`);
      
      let normalized = text;
      normalized = this.removeUnwantedElements(normalized);
      normalized = this.handleEmphasis(normalized);
      normalized = this.handleHeaders(normalized);
      normalized = this.handleParagraphsAndSpacing(normalized);
      normalized = this.processBasicElements(normalized);
      normalized = this.normalizeQuotes(normalized);
      normalized = this.normalizeCodeBlocks(normalized);
      normalized = this.handleSpecialSymbols(normalized);
      
      console.debug(`${this.NORMALIZER_NAME} === normalizeMarkdown END ===\nFinal text: ${normalized}`);
      return normalized;
    } catch (error) {
      console.error(`${this.NORMALIZER_NAME} Normalization failed: ${error.message}`);
      throw error;
    }
  }

  removeUnwantedElements(text) {
    console.debug(`${this.NORMALIZER_NAME} Removing unwanted elements`);
    
    let cleaned = text
      // Išsaugome markdown nuorodų tekstą, bet pašaliname nuorodas
      .replace(this.patterns.markdownLinks, '$1')
      // Pašaliname URL adresus
      .replace(this.patterns.bareUrls, '')
      // Pašaliname lokalius kelius
      .replace(this.patterns.localPaths, '')
      // Sutvarkome tarpus, bet išsaugome paragrafus
      .replace(/[ \t]+/g, ' ')  // Tik horizontalūs tarpai
      .split('\n')              // Skaidome į eilutes
      .map(line => line.trim()) // Valome kiekvienos eilutės kraštus
      .join('\n');             // Sujungiame atgal su naujų eilučių simboliais
      
    return cleaned;
  }

  handleHeaders(text) {
    console.debug(`${this.NORMALIZER_NAME} === handleHeaders START ===\nInput text: ${text}`);
    
    const result = text
      .replace(/^#\s*_{3}(.+?)_{3}/gm, '# $1\n\n')
      .replace(/^(#+)\s*(.+?)$/gm, '$1 $2\n\n');
    
    console.debug(`${this.NORMALIZER_NAME} === handleHeaders END ===\nOutput text: ${result}`);
    return result;
  }
  
  handleParagraphsAndSpacing(text) {
    console.debug(`${this.NORMALIZER_NAME} === handleParagraphsAndSpacing START ===\nInput text: ${text}`);
    
    const result = text
      .replace(/^>\s*(.+)$/gm, '> $1\n\n')
      .replace(/([^\n])\n(?=[^\n])/g, '$1\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.debug(`${this.NORMALIZER_NAME} === handleParagraphsAndSpacing END ===\nOutput text: ${result}`);
    return result;
  }

  processBasicElements(text) {
    console.debug(`${this.NORMALIZER_NAME} Processing basic elements`);
    return text
      .replace(this.patterns.lists, '* ')
      .replace(this.patterns.horizontalRules, '—');
  }

  handleSpecialSymbols(text) {
    console.debug(`${this.NORMALIZER_NAME} Processing special symbols`);
    return text
      .replace(this.patterns.quotes, '"')
      .replace(this.patterns.enDash, '-')
      .replace(/\.{3}/g, '…');
  }

  normalizeQuotes(text) {
    console.debug(`${this.NORMALIZER_NAME} Normalizing quotes`);
    return text
      .replace(/^(\s*)&/gm, '>')
      .replace(/^>+/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
  }

  normalizeCodeBlocks(text) {
    console.debug(`${this.NORMALIZER_NAME} Normalizing code blocks`);
    return text
      .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
      .replace(this.patterns.inlineCode, '`$1`');
  }

  handleEmphasis(text) {
    console.debug(`${this.NORMALIZER_NAME} Processing emphasis`);
    let result = text;
    
    result = result.replace(this.patterns.strongEmphasis, '___$1___');
    
    this.patterns.strong.forEach(regex => {
      result = result.replace(regex, '__$1__');
    });
    
    this.patterns.emphasis.forEach(regex => {
      result = result.replace(regex, '_$1_');
    });
    
    return result;
  }
}

export { TextNormalizer };
