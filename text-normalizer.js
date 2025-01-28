/**
 * TextNormalizer - klasė skirta Markdown ir HTML teksto normalizavimui
 */
class TextNormalizer {
  constructor(options = {}) {
    this.NORMALIZER_NAME = options.name || '[TextNormalizer]';
    this.debug = options.debug !== false; // Defaulting to true
    
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

  log(message, text = '') {
    console.debug(`${this.NORMALIZER_NAME} ${message}${text ? '\n' + text : ''}`);
  }

  normalizeMarkdown(text) {
    try {
      this.log('=== normalizeMarkdown START ===', text);
      
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
      
      this.log('=== normalizeMarkdown END ===', normalized);
      return normalized;
    } catch (error) {
      console.error(`${this.NORMALIZER_NAME} Normalization failed: ${error.message}`);
      throw error;
    }
  }

  handleHtmlContent(text) {
    this.log('=== handleHtmlContent START ===', text);
    
    // Išsaugome HTML nuorodų tekstą
    let processed = text.replace(this.patterns.htmlLinks, '$1');
    
    // Pašaliname HTML paveikslėlius, išsaugant alt tekstą jei yra
    processed = processed.replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/g, '$1');
    processed = processed.replace(this.patterns.htmlImages, '');
    
    // Pašaliname likusias HTML žymes
    processed = processed.replace(this.patterns.htmlTags, '');
    
    this.log('=== handleHtmlContent END ===', processed);
    return processed;
  }

  removeUnwantedElements(text) {
    this.log('=== removeUnwantedElements START ===', text);
    
    let cleaned = text
      .replace(this.patterns.markdownLinks, '$1')
      .replace(this.patterns.bareUrls, '')
      .replace(this.patterns.localPaths, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
      
    this.log('=== removeUnwantedElements END ===', cleaned);
    return cleaned;
  }

  handleHeaders(text) {
    this.log('=== handleHeaders START ===', text);
    
    // Apdorojame chapter title
    let result = text.replace(this.patterns.chapterTitle, '# $1\n\n');
    
    // Apdorojame visus kitus headers
    result = result.replace(this.patterns.headers, '$1 $2\n\n');
    
    this.log('=== handleHeaders END ===', result);
    return result;
  }
  
  handleParagraphsAndSpacing(text) {
    this.log('=== handleParagraphsAndSpacing START ===', text);
    
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
    
    this.log('=== handleParagraphsAndSpacing END ===', result);
    return result;
  }

  handleImages(text) {
    this.log('=== handleImages START ===', text);
    
    let result = text
      // Išsaugome markdown paveikslėlių alt tekstą
      .replace(this.patterns.images, '$1')
      // Pašaliname HTML paveikslėlius (jei liko)
      .replace(this.patterns.htmlImages, '');
      
    this.log('=== handleImages END ===', result);
    return result;
  }

  processBasicElements(text) {
    this.log('=== processBasicElements START ===', text);
    
    let result = text
      .replace(this.patterns.lists, '* ')
      .replace(this.patterns.horizontalRules, '—');
      
    this.log('=== processBasicElements END ===', result);
    return result;
  }

  handleSpecialSymbols(text) {
    this.log('=== handleSpecialSymbols START ===', text);
    
    let result = text
      .replace(this.patterns.quotes, '"')
      .replace(this.patterns.enDash, '-')
      .replace(/\.{3}/g, '…');
      
    this.log('=== handleSpecialSymbols END ===', result);
    return result;
  }

  normalizeQuotes(text) {
    this.log('=== normalizeQuotes START ===', text);
    
    let result = text
      .replace(/^(\s*)(?:&|>+)/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
      
    this.log('=== normalizeQuotes END ===', result);
    return result;
  }

  normalizeCodeBlocks(text) {
    this.log('=== normalizeCodeBlocks START ===', text);
    
    let result = text
      .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
      .replace(this.patterns.inlineCode, '`$1`');
      
    this.log('=== normalizeCodeBlocks END ===', result);
    return result;
  }

  handleEmphasis(text) {
    this.log('=== handleEmphasis START ===', text);
    
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
    
    this.log('=== handleEmphasis END ===', result);
    return result;
  }
}

export { TextNormalizer };
