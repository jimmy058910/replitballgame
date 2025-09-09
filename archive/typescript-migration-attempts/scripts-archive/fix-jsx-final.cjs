const fs = require('fs');
const path = require('path');

// Files with remaining JSX issues based on error analysis
const filesToFix = [
  'client/src/components/EnhancedDashboard.tsx',
  'client/src/components/LiveMatchSimulation.tsx',
  'client/src/components/PlayerDetailModal.tsx',
  'client/src/pages/Camaraderie.tsx',
  'client/src/pages/Inventory.tsx',
  'client/src/pages/Team.tsx',
  'client/src/pages/TournamentStatus.tsx'
];

function fixCommentedJSX(content) {
  let fixed = content;
  const lines = fixed.split('\n');
  let result = [];
  let inCommentBlock = false;
  let commentStartLine = -1;
  let commentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this starts a JSX comment block
    if (trimmedLine.startsWith('{/*') && !trimmedLine.endsWith('*/}')) {
      inCommentBlock = true;
      commentStartLine = i;
      commentContent = [];
      
      // If the comment has content on the same line after {/*
      const afterComment = trimmedLine.substring(3).trim();
      if (afterComment) {
        commentContent.push(afterComment);
      }
      continue;
    }
    
    // If we're in a comment block
    if (inCommentBlock) {
      // Check if this line ends the comment
      if (line.includes('*/}')) {
        inCommentBlock = false;
        
        // Check if the commented content looks like JSX
        const fullContent = commentContent.join('\n');
        const hasJSX = fullContent.match(/<[A-Z][^>]*>|\.map\(|\.filter\(|\{[^}]*\}/);
        
        if (hasJSX) {
          // This is likely commented-out JSX code, uncomment it
          console.log(`  Uncommenting JSX at line ${commentStartLine + 1}`);
          // Add the uncommented content
          for (const contentLine of commentContent) {
            result.push(contentLine);
          }
        }
        // Skip the closing */} line
        continue;
      } else {
        // Accumulate comment content
        commentContent.push(line);
        continue;
      }
    }
    
    // Regular line, add it to result
    result.push(line);
  }
  
  // If we ended while still in a comment (malformed), add remaining content
  if (inCommentBlock && commentContent.length > 0) {
    console.log(`  Fixing unclosed comment block at line ${commentStartLine + 1}`);
    for (const contentLine of commentContent) {
      result.push(contentLine);
    }
  }
  
  return result.join('\n');
}

function fixBrokenJSXStructure(content) {
  let fixed = content;
  
  // Fix patterns where closing tags are missing or mismatched
  // Pattern: Fix orphaned closing brackets
  fixed = fixed.replace(/^\s*\)\}\s*$/gm, (match) => {
    console.log('  Removed orphaned closing brackets');
    return '';
  });
  
  // Pattern: Fix double closing of same tag
  fixed = fixed.replace(/(<\/\w+>)\s*\1/g, '$1');
  
  return fixed;
}

function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  Skipping ${path.basename(filePath)} - file doesn't exist`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes
    content = fixCommentedJSX(content);
    content = fixBrokenJSXStructure(content);
    
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

console.log('Fixing final JSX structural issues...\n');
let fixedCount = 0;

for (const file of filesToFix) {
  if (processFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✓ Fixed ${fixedCount} files with JSX issues`);