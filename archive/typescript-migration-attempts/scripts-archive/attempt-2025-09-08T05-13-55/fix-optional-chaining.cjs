#!/usr/bin/env node
/**
 * Fix Optional Chaining Errors (TS18048)
 * Adds optional chaining where properties might be undefined
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current errors
console.log('🔍 Analyzing optional chaining errors...\n');
let errorOutput = '';
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8' });
} catch (error) {
  errorOutput = error.stdout || '';
}

// Parse TS18048 errors (possibly undefined)
const errorsByFile = new Map();
const lines = errorOutput.split('\n');

lines.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS18048): '(.+)' is possibly 'undefined'\.$/);
  if (match) {
    const [, file, lineNum, col, code, property] = match;
    
    if (!errorsByFile.has(file)) {
      errorsByFile.set(file, []);
    }
    errorsByFile.get(file).push({ 
      lineNum: parseInt(lineNum), 
      col: parseInt(col), 
      property 
    });
  }
});

console.log(`Found ${Array.from(errorsByFile.values()).flat().length} optional chaining errors in ${errorsByFile.size} files\n`);

// Fix optional chaining
function addOptionalChaining(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  
  // Sort errors by line number in reverse to avoid line number shifts
  errors.sort((a, b) => b.lineNum - a.lineNum);
  
  errors.forEach(error => {
    const lineIndex = error.lineNum - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const property = error.property;
      
      // Extract the property path (e.g., "playerStats.offensive")
      const parts = property.split('.');
      if (parts.length >= 2) {
        const objectPath = parts.slice(0, -1).join('.');
        const lastProp = parts[parts.length - 1];
        
        // Replace object.property with object?.property
        const pattern = new RegExp(`(${objectPath.replace(/\./g, '\\.')})\\.(${lastProp})`, 'g');
        const replacement = '$1?.$2';
        
        const newLine = line.replace(pattern, replacement);
        
        if (newLine !== line) {
          lines[lineIndex] = newLine;
          modified = true;
        }
      }
    }
  });
  
  if (modified) {
    content = lines.join('\n');
  }
  
  return { content, modified };
}

// Process files with optional chaining errors
const filesToFix = Array.from(errorsByFile.entries())
  .sort((a, b) => b[1].length - a[1].length);

console.log('📝 Fixing optional chaining errors...\n');

let totalFixed = 0;
filesToFix.forEach(([file, errors]) => {
  const fileName = path.basename(file);
  console.log(`Processing ${fileName} (${errors.length} errors)`);
  
  try {
    const result = addOptionalChaining(file, errors);
    if (result.modified) {
      fs.writeFileSync(file, result.content);
      console.log(`  ✅ Added optional chaining`);
      totalFixed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files!`);

// Re-run TypeScript check
console.log('\n📊 New error count:');
try {
  execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
} catch (e) {
  // Expected to fail, just want the count
}