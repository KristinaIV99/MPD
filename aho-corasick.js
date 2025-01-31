// aho-corasick.js
class AhoCorasick {
   constructor() {
       this.root = this.createNode();
   }

   createNode() {
       return {
           next: {},     
           fail: null,   
           outputs: [],  
           isEnd: false  
       };
   }

   addPattern(pattern, type) {
       let node = this.root;
       for (const char of pattern.toLowerCase()) {
           if (!node.next[char]) {
               node.next[char] = this.createNode();
           }
           node = node.next[char];
       }
       node.isEnd = true;
       node.outputs.push({ pattern, type });
   }

   buildFailureLinks() {
       const queue = [];
       
       for (const char in this.root.next) {
           const node = this.root.next[char];
           node.fail = this.root;
           queue.push(node);
       }

       while (queue.length > 0) {
           const current = queue.shift();
           
           for (const char in current.next) {
               const child = current.next[char];
               queue.push(child);

               let failNode = current.fail;
               while (failNode && !failNode.next[char]) {
                   failNode = failNode.fail;
               }
               
               child.fail = failNode ? failNode.next[char] : this.root;
               child.outputs = child.outputs.concat(child.fail.outputs);
           }
       }
   }

   search(text) {
       const matches = [];
       let node = this.root;
       
       for (let i = 0; i < text.length; i++) {
           const char = text[i].toLowerCase();
           
           while (node !== this.root && !node.next[char]) {
               node = node.fail;
           }
           
           node = node.next[char] || this.root;
           
           if (node.outputs.length > 0) {
               for (const output of node.outputs) {
                   matches.push({
                       pattern: output.pattern,
                       type: output.type,
                       start: i - output.pattern.length + 1,
                       end: i + 1
                   });
               }
           }
       }
       
       return matches;
   }
}

export { AhoCorasick };

