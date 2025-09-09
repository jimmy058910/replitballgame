const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TSX files
const files = glob.sync('client/src/**/*.tsx');

function fixUnclosedComments(content) {
  let fixed = content;
  const lines = fixed.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for unclosed JSX comments - {/* without */}
    if (line.includes('{/*') && !line.includes('*/}')) {
      // Check the next few lines to see if there's a closing
      let foundClosing = false;
      let maxLookAhead = Math.min(i + 10, lines.length);
      
      for (let j = i + 1; j < maxLookAhead; j++) {
        if (lines[j].includes('*/}')) {
          foundClosing = true;
          break;
        }
        // If we find another opening comment or JSX element, stop looking
        if (lines[j].includes('{/*') || lines[j].match(/<[A-Z][^>]*>/)) {
          break;
        }
      }
      
      // If no closing found and the comment doesn't span properly, close it
      if (!foundClosing) {
        // Add closing at the end of the line
        lines[i] = line + ' */}';
        console.log(`  Fixed unclosed comment at line ${i + 1}`);
      }
    }
    
    // Check for orphaned closing comments - */} without {/*
    if (line.includes('*/}') && !line.includes('{/*')) {
      // Look back to see if there's an opening
      let foundOpening = false;
      let maxLookBack = Math.max(0, i - 10);
      
      for (let j = i - 1; j >= maxLookBack; j--) {
        if (lines[j].includes('{/*')) {
          foundOpening = true;
          break;
        }
      }
      
      // If no opening found, remove the orphaned closing
      if (!foundOpening) {
        lines[i] = line.replace('*/}', '');
        console.log(`  Removed orphaned comment closing at line ${i + 1}`);
      }
    }
  }
  
  return lines.join('\n');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixUnclosedComments(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${path.basename(filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Fixing unclosed JSX comments...\n');
let fixedCount = 0;

for (const file of files) {
  if (processFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✓ Fixed ${fixedCount} files with unclosed comments`);