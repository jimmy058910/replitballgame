#!/usr/bin/env node
/**
 * Fix syntax errors from commented interfaces
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixCommentedInterfaces() {
  const files = glob.sync('client/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**']
  });
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix multi-line commented interfaces that are breaking syntax
    // Pattern: "// interface Name {\n  property: type;\n  ..."
    const lines = content.split('\n');
    const fixedLines = [];
    let inCommentedInterface = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this starts a commented interface
      if (line.match(/^\/\/ (interface|type) \w+ \{$/)) {
        inCommentedInterface = true;
        fixedLines.push(line);
        continue;
      }
      
      // If we're in a commented interface, comment out the properties
      if (inCommentedInterface) {
        if (line === '}' || line.match(/^\}$/)) {
          fixedLines.push('// ' + line);
          inCommentedInterface = false;
        } else if (!line.startsWith('//')) {
          fixedLines.push('// ' + line);
          modified = true;
        } else {
          fixedLines.push(line);
        }
      } else {
        fixedLines.push(line);
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, fixedLines.join('\n'));
      console.log(`✅ Fixed ${file}`);
    }
  });
}

console.log('🔧 Fixing commented interface syntax errors...\n');
fixCommentedInterfaces();
console.log('\n✅ Done!');