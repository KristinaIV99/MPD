
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
      this.logger.debug('Starting markdown normalization');
      let normalized = text;
      
      normalized = this.handleHeaders(normalized);
      this.logger.debug('Headers processed');
      
      normalized = this.handleParagraphsAndSpacing(normalized);
      this.logger.debug('Paragraphs and spacing processed');
      
      normalized = this.processBasicElements(normalized);
      this.logger.debug('Basic elements processed');
      
      normalized = this.normalizeQuotes(normalized);
      this.logger.debug('Quotes normalized');
      
      normalized = this.normalizeCodeBlocks(normalized);
      this.logger.debug('Code blocks normalized');
      
      normalized = this.handleEmphasis(normalized);
      this.logger.debug('Emphasis handled');
      
      normalized = this.handleSpecialSymbols(normalized);
      this.logger.debug('Special symbols handled');
      
      this.logger.info('Markdown normalized successfully');
      return normalized;
    } catch (error) {
      this.logger.error('Normalization failed:', error);
      return text;
    }
  }

  handleHeaders(text) {
    this.logger.debug('Processing headers');
    return text.replace(/^(#+)\s*(.+?)$/gm, (match, hashes, content) => {
      return `${hashes} ${content}\n\n`;
    });
  }

  handleParagraphsAndSpacing(text) {
    this.logger.debug('Processing paragraphs and spacing');
    return text
      .split(/\n/)
      .map(line => line.trim())
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/([^\n])\n(#+\s)/g, '$1\n\n$2')
      .replace(/(#+\s.*)\n([^\n])/g, '$1\n\n$2')
      .trim();
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

