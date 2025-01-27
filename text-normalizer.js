export class TextNormalizer {
 constructor(logger) {
   this.logger = logger;
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
     emptyLines: /\n{2,}/g,
     paragraphs: /\n\s*\n/g
   };
 }

 normalizeMarkdown(text) {
   try {
     let normalized = text;
     
     // Tvarkome struktūrą
     normalized = this.processBasicElements(normalized);
     normalized = this.normalizeQuotes(normalized);
     normalized = this.normalizeCodeBlocks(normalized);
     normalized = this.handleEmphasis(normalized);
     normalized = this.handleSpecialSymbols(normalized);
     
     // Galiausiai tvarkome paragrafus ir tarpus
     normalized = this.handleParagraphsAndSpacing(normalized);
     
     this.logger.log('Markdown normalized successfully');
     return normalized;
   } catch (error) {
     this.logger.error(`Normalization failed: ${error.message}`);
     return text;
   }
 }

 processBasicElements(text) {
   return text
     .replace(this.patterns.headers, '# $2')  // Tvarko visas antraštes, įskaitant skyriaus
     .replace(this.patterns.lists, '* ')
     .replace(this.patterns.horizontalRules, '—');
 }

 handleSpecialSymbols(text) {
   return text
     .replace(this.patterns.quotes, '"')    // Standartizuojamos kabutės
     .replace(this.patterns.enDash, '-')    // Keičiamas en-dash
     .replace(/\.{3}/g, '…');               // Elipsė
 }

 normalizeQuotes(text) {
   return text
     .replace(/^(\s*)&/gm, '>')            // Senoviški citatos žymėjimai
     .replace(/^>+/gm, '>')                // Sutvarkyti įdėtiniai citatos ženklai
     .replace(this.patterns.blockquotes, '> $1');
 }

 normalizeCodeBlocks(text) {
   return text
     .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
     .replace(this.patterns.inlineCode, '`$1`');
 }

 handleEmphasis(text) {
   let result = text;
   
   // Pirma apdorojame trigubą formatavimą
   result = result.replace(this.patterns.strongEmphasis, '___$1___');
   
   // Stiprus formatavimas (**)
   this.patterns.strong.forEach(regex => {
     result = result.replace(regex, '__$1__');
   });
   
   // Paprastas formatavimas (_)
   this.patterns.emphasis.forEach(regex => {
     result = result.replace(regex, '_$1_');
   });
   
   return result;
 }

 handleParagraphsAndSpacing(text) {
   return text
     // Išsaugome originalius tarpus tarp paragrafų
     .replace(this.patterns.paragraphs, '\n\n')
     // Užtikriname, kad po kiekvieno paragrafo būtų tuščia eilutė
     .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
     // Išsaugome tuščias eilutes tarp sekcijų
     .replace(this.patterns.emptyLines, '\n\n')
     // Pašaliname nereikalingus tarpus eilučių pradžioje/pabaigoje
     .split('\n')
     .map(line => line.trim())
     .join('\n')
     .trim();
 }
}
