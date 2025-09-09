const fs = require('fs');
const path = require('path');

// Fix League.tsx
function fixLeague() {
  const filePath = 'client/src/pages/League.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix empty comments that break JSX parsing
  // Replace {/* */} with nothing when it's just an empty comment
  content = content.replace(/\{\s*\/\*\s*\*\/\s*\}/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log('✓ Fixed League.tsx');
}

// Fix Store.tsx
function fixStore() {
  const filePath = 'client/src/pages/Store.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log('  Store.tsx not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix empty comments
  content = content.replace(/\{\s*\/\*\s*\*\/\s*\}/g, '');
  
  // Check for and fix unclosed JSX tags
  const lines = content.split('\n');
  let fixedLines = [];
  let inComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that are part of unclosed comments
    if (line.includes('{/*') && !line.includes('*/}')) {
      inComment = true;
      // Add closing to single-line unclosed comments
      fixedLines.push(line + ' */}');
      inComment = false;
    } else if (inComment && line.includes('*/}')) {
      inComment = false;
      fixedLines.push(line);
    } else if (!inComment) {
      fixedLines.push(line);
    }
  }
  
  content = fixedLines.join('\n');
  fs.writeFileSync(filePath, content);
  console.log('✓ Fixed Store.tsx');
}

console.log('Fixing final TypeScript errors...\n');

try {
  fixLeague();
  fixStore();
  console.log('\n✓ All fixes applied successfully');
} catch (error) {
  console.error('Error:', error.message);
}