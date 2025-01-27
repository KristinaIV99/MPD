
export class TextNormalizer {
  constructor(logger) {
    this.logger = logger;
    this.patterns = {
      emphasis: [/_([^_]+)_/g, /\*([^*]+)\*/g],
      strong: [/__([^_]+)__/g, /\*\*([^*]+)\*\*/g],
      headers: /^(#{1,6})\s*(.+)$/gm,
      lists: /^[\s-]*[-+*]\s+/gm,
      blockquotes: /^>\s*(.+)$/gm,
      horizontalRules: /^(?:[-*_]\s*){3,}$/gm,
      codeBlocks: /```([^`]+)```/g,
      inlineCode: /`([^`]+)`/g,
	  enDash: /–/g,    // Trumpesnis brūkšnys (en dash)
      quotes: /[""'']/g, // Įvairūs kabutės
      longDash: /\*\*\*/g,  // Naujas šablonas trims žvaigždutėms
	  mixedFormatting: /\*[_]{2}(.+?)[_]{2}\*/g
    };
  }
  
  normalizeMarkdown(text) {
    try {
      let normalized = text;
      
      // Pirma apdorojame tris žvaigždutes į ilgą brūkšnį
      normalized = normalized.replace(this.patterns.longDash, '—');
      
      // 1. Horizontalios linijos (su patterns)
      normalized = normalized.replace(this.patterns.horizontalRules, '---');
      
      // 2. Headers (su patterns)
      normalized = normalized.replace(this.patterns.headers, '# $2');
      
      // 3. Sąrašai (su patterns)
      normalized = normalized.replace(this.patterns.lists, '* ');
      
      // 4. Citatos
      normalized = this.normalizeQuotes(normalized);
      
      // 5. Kodo blokai (su patterns)
      normalized = this.normalizeCodeBlocks(normalized);
      
      // 6. Specialūs simboliai
      normalized = normalized
        .replace(this.patterns.quotes, '"')   // Standartizuoja kabutes
        .replace(this.patterns.enDash, '-')   // Trumpą brūkšnį keičia į paprastą
        .replace(/\.{3}/g, '…');
      
      // 7. Emphasis
      normalized = this.handleEmphasis(normalized);
      
      // 8. Paragrafų tvarkymas
      normalized = this.normalizeParagraphs(normalized);
      
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
      .replace(/^>+/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
  }

  normalizeCodeBlocks(text) {
    return text
      .replace(this.patterns.codeBlocks, (match, code) => {
        return '\n\n```\n' + code.trim() + '\n```\n\n';
      })
      .replace(this.patterns.inlineCode, '`$1`');
  }

  handleEmphasis(text) {
    let result = text;
    
    // Tvarkome kombinuotą formatavimą *__text__*
    result = result.replace(this.patterns.mixedFormatting, (match, content) => {
      return `_${content}_`; // Paverčiame į žemą brūkšnį
    });
    
    // Tada tvarkome paprastą formatavimą
    result = result
      .replace(/\*\*([^*]+)\*\*/g, '**$1**')
      .replace(/__([^_]+)__/g, '**$1**');
    
    // Regular emphasis
    result = result
      .replace(/\*([^*]+)\*/g, '_$1_')
      .replace(/_([^_]+)_/g, '_$1_');
    
    return result;
  }

  normalizeParagraphs(text) {
    return text
      // Pašaliname perteklinius tarpus
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Tarpų tvarkymas
      .replace(/[ \t]+/g, ' ')
      .replace(/ \n/g, '\n')
      // Paragrafų tarpai
      .replace(/\n{3,}/g, '\n\n')
      // Tuščios eilutės prieš specialius elementus
      .replace(/(\n[#>*-])/g, '\n\n$1')
      // Kodo blokų tvarkymas
      .replace(/(```.*```)/gs, '\n\n$1\n\n')
      .trim();
  }
}
