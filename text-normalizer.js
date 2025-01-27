import Logger from './logger.js';
import { LOG_LEVELS } from './logger.js';

export class TextNormalizer {
  constructor(logger) {
    this.logger = logger || new Logger({
      level: LOG_LEVELS.INFO,
      prefix: 'TextNormalizer'
    });
    this.patterns = {
      emphasis: [/_([^_]+?)_/g, /(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g],
      strong: [/__([^_]+?)__/g, /\*\*([^*]+?)\*\*/g],
      headers: /^(#{1,6})\s*(.+)$/gm,
      lists: /^[\s-]*[-+*]\s+/gm,
      blockquotes: /^>\s*(.+)$/gm,
      horizontalRules: /^(?:[-*_]\s*){3,}$/gm,
      codeBlocks: /```([\s\S]*?)```/g,  // Patobulintas kodo blokų aptikimas
      inlineCode: /`([^`]+)`/g,
      enDash: /–/g,
      quotes: /["']/g,  // Sutvarkytas kabučių regex
	  strongEmphasis: [/\*\*\*([^*]+?)\*\*\*/g],
      chapterTitle: /^#\s(.+)$/m,  // Skyriaus pavadinimui
      emptyLines: /\n\s*\n/g,       // Tuščioms eilutėms
      paragraphs: /([^\n])\n([^\n])/g       // Paragrafams
    };
  }

  normalizeMarkdown(text) {
      try {
          this.logger.debug('=== normalizeMarkdown START ===');
          this.logger.debug('Original text:', text);
          

		  let normalized = text;
          // Pirmiausia tvarkome emphasis ir strong formatavimą
          normalized = this.handleEmphasis(normalized);
          
          // Tada antraštes
          normalized = this.handleHeaders(normalized);
          
          // Tada paragrafus ir tarpus
          normalized = this.handleParagraphsAndSpacing(normalized);
          
          // Tada likusius elementus
          normalized = this.processBasicElements(normalized);
          normalized = this.normalizeQuotes(normalized);
          normalized = this.normalizeCodeBlocks(normalized);
          normalized = this.handleSpecialSymbols(normalized);
          
          this.logger.debug('Final text:', normalized);
          this.logger.debug('=== normalizeMarkdown END ===');
          return normalized;
      } catch (error) {
          this.logger.error('Normalization failed:', error);
          throw error;
      }
  }

  handleHeaders(text) {
      this.logger.debug('=== handleHeaders START ===');
      this.logger.debug('Input text:', text);
      
      // Pašalina ___ iš antraščių ir prideda tuščią eilutę
      const result = text
          .replace(/^#\s*_{3}(.+?)_{3}/gm, '# $1\n\n')
          .replace(/^(#+)\s*(.+?)$/gm, '$1 $2\n\n');
      
      this.logger.debug('Output text:', result);
      this.logger.debug('=== handleHeaders END ===');
      return result;
  }
  
  handleParagraphsAndSpacing(text) {
      this.logger.debug('=== handleParagraphsAndSpacing START ===');
      this.logger.debug('Input text:', text);
      
      // Tvarko paragrafus ir tarpus
      const result = text
          // Prideda tuščią eilutę po citatos
          .replace(/^>\s*(.+)$/gm, '> $1\n\n')
          // Prideda tuščią eilutę tarp paragrafų
          .replace(/([^\n])\n(?=[^\n])/g, '$1\n\n')
          // Pašalina perteklinius tarpus
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      
      this.logger.debug('Output text:', result);
      this.logger.debug('=== handleParagraphsAndSpacing END ===');
      return result;
  }

  processBasicElements(text) {
    this.logger.debug('Processing basic elements');
    return text
      .replace(this.patterns.lists, '* ')
      .replace(this.patterns.horizontalRules, '—');
  }

  handleSpecialSymbols(text) {
    this.logger.debug('Processing special symbols');
    return text
      .replace(this.patterns.quotes, '"')
      .replace(this.patterns.enDash, '-')
      .replace(/\.{3}/g, '…');
  }

  normalizeQuotes(text) {
    this.logger.debug('Normalizing quotes');
    return text
      .replace(/^(\s*)&/gm, '>')
      .replace(/^>+/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
  }

  normalizeCodeBlocks(text) {
    this.logger.debug('Normalizing code blocks');
    return text
      .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
      .replace(this.patterns.inlineCode, '`$1`');
  }

  handleEmphasis(text) {
    this.logger.debug('Processing emphasis');
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
