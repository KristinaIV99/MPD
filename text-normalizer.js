/**
 * TextNormalizer - klasė skirta Markdown ir HTML teksto normalizavimui
 */
class TextNormalizer {
  constructor(options = {}) {
    this.NORMALIZER_NAME = options.name || '[TextNormalizer]';
    this.debug = options.debug || false;
    
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
      images: /!\[([^\]]*)\]\([^)]+\)/g,
      htmlImages: /<img[^>]+>/g,
      markdownLinks: /\[([^\]]+)\]\([^\)]+\)/g,
      htmlLinks: /<a[^>]*>([^<]*)<\/a>/g,
      localPaths: /(?:\.\.?\/)*[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g,
      htmlTags: /<[^>]+>/g,
      bareUrls: /(?:https?:\/\/)[^\s)]+/g
    };
  }

  log(message) {
    if (this.debug) {
      console.debug(`${this.NORMALIZER_NAME} ${message}`);
    }
  }

  normalizeMarkdown(text) {
    try {
      this.log('=== normalizeMarkdown START ===\nOriginal text: ' + text);
      
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
      }

      let normalized = text;
      normalized = this.removeUnwantedElements(normalized);
      normalized = this.handleHtmlContent(normalized);
      normalized = this.handleEmphasis(normalized);
      normalized = this.handleHeaders(normalized);
      normalized = this.handleParagraphsAndSpacing(normalized);
      normalized = this.processBasicElements(normalized);
      normalized = this.normalizeQuotes(normalized);
      normalized = this.normalizeCodeBlocks(normalized);
      normalized = this.handleSpecialSymbols(normalized);
      normalized = this.handleImages(normalized);
      
      this.log('=== normalizeMarkdown END ===\nFinal text: ' + normalized);
      return normalized;
    } catch (error) {
      console.error(`${this.NORMALIZER_NAME} Normalization failed: ${error.message}`);
      throw error;
    }
  }

  handleHtmlContent(text) {
    this.log('Processing HTML content');
    
    // Išsaugome HTML nuorodų tekstą
    let processed = text.replace(this.patterns.htmlLinks, '$1');
    
    // Pašaliname HTML paveikslėlius, išsaugant alt tekstą jei yra
    processed = processed.replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/g, '$1');
    processed = processed.replace(this.patterns.htmlImages, '');
    
    // Pašaliname likusias HTML žymes
    processed = processed.replace(this.patterns.htmlTags, '');
    
    return processed;
  }

  removeUnwantedElements(text) {
    this.log('Removing unwanted elements');
    
    let cleaned = text
      .replace(this.patterns.markdownLinks, '$1')
      .replace(this.patterns.bareUrls, '')
      .replace(this.patterns.localPaths, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
      
    return cleaned;
  }

  handleHeaders(text) {
    this.log('=== handleHeaders START ===');
    
    // Apdorojame chapter title
    let result = text.replace(this.patterns.chapterTitle, '# $1\n\n');
    
    // Apdorojame visus kitus headers
    result = result.replace(this.patterns.headers, '$1 $2\n\n');
    
    this.log('=== handleHeaders END ===');
    return result;
  }
  
  handleParagraphsAndSpacing(text) {
    this.log('Processing paragraphs and spacing');
    
    let result = text
      // Tvarkome paragrafus
      .replace(this.patterns.paragraphs, '$1\n\n$2')
      // Tvarkome blockquotes
      .replace(/^>\s*(.+)$/gm, '> $1\n\n')
      // Tvarkome tuščias eilutes
      .replace(this.patterns.emptyLines, '\n\n')
      // Pašaliname perteklinius tarpus tarp paragrafų
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return result;
  }

  handleImages(text) {
    this.log('Processing images');
    
    return text
      // Išsaugome markdown paveikslėlių alt tekstą
      .replace(this.patterns.images, '$1')
      // Pašaliname HTML paveikslėlius (jei liko)
      .replace(this.patterns.htmlImages, '');
  }

  processBasicElements(text) {
    this.log('Processing basic elements');
    return text
      .replace(this.patterns.lists, '* ')
      .replace(this.patterns.horizontalRules, '—');
  }

  handleSpecialSymbols(text) {
    this.log('Processing special symbols');
    return text
      .replace(this.patterns.quotes, '"')
      .replace(this.patterns.enDash, '-')
      .replace(/\.{3}/g, '…');
  }

  normalizeQuotes(text) {
    this.log('Normalizing quotes');
    return text
      .replace(/^(\s*)(?:&|>+)/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
  }

  normalizeCodeBlocks(text) {
    this.log('Normalizing code blocks');
    return text
      .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
      .replace(this.patterns.inlineCode, '`$1`');
  }

  handleEmphasis(text) {
    this.log('Processing emphasis');
    let result = text;
    
    // Stiprus pabrėžimas
    result = result.replace(this.patterns.strongEmphasis, '___$1___');
    
    // Stiprus tekstas
    this.patterns.strong.forEach(regex => {
      result = result.replace(regex, '__$1__');
    });
    
    // Pabrėžtas tekstas
    this.patterns.emphasis.forEach(regex => {
      result = result.replace(regex, '_$1_');
    });
    
    return result;
  }
}

export { TextNormalizer };
