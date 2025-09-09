const fs = require('fs');
const path = require('path');

// Files with JSX structure issues based on error analysis
const filesToFix = [
  'client/src/components/ContractNegotiation.tsx',
  'client/src/components/DynamicMarketplaceManager.tsx',
  'client/src/components/EnhancedDashboard.tsx',
  'client/src/components/EnhancedLoadingWrapper.tsx',
  'client/src/components/EnhancedMarketplace.tsx',
  'client/src/components/FinancialCenter.tsx',
  'client/src/components/GameSimulationUI.tsx',
  'client/src/components/LineupRosterBoard.tsx',
  'client/src/components/LiveMatchSimulation.tsx',
  'client/src/components/PlayerDetailModal.tsx'
];

function fixJSXComments(content) {
  let fixed = content;
  
  // Fix pattern where we have malformed nested comments breaking JSX structure
  // Pattern 1: {/* comment {/* nested */} more */} - remove inner comment markers
  fixed = fixed.replace(/(\{\/\*[^*]*)\{\/\*([^}]*)\*\/\}([^*]*\*\/\})/g, '$1$2$3');
  
  // Pattern 2: Remove orphaned comment closing tags that break JSX
  fixed = fixed.replace(/^\s*\*\/\}\s*$/gm, '');
  
  // Pattern 3: Fix comments that are breaking JSX element structure
  // Look for patterns like: {/* comment </Element> */} and extract the element
  fixed = fixed.replace(/\{\/\*[^<]*(<\/[^>]+>)[^*]*\*\/\}/g, '$1');
  
  // Pattern 4: Fix comments with JSX inside them - extract the JSX
  fixed = fixed.replace(/\{\/\*\s*(<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>)\s*\*\/\}/g, '$1');
  
  // Pattern 5: Fix broken comment blocks that span multiple elements
  // This looks for {/* at the start of a line and ensures it has a proper closing
  const lines = fixed.split('\n');
  let inComment = false;
  let commentStartLine = -1;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track if we're in a JSX comment
    if (line.includes('{/*') && !line.includes('*/}')) {
      inComment = true;
      commentStartLine = i;
      braceDepth = 0;
    }
    
    if (inComment) {
      // Count braces to track JSX nesting
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }
      
      // If we find */} or the brace depth goes negative, close the comment
      if (line.includes('*/}') || braceDepth < 0) {
        inComment = false;
        
        // If the comment spans multiple lines and contains JSX elements, it's likely broken
        if (i - commentStartLine > 2) {
          // Check if there are JSX elements in the comment
          let hasJSX = false;
          for (let j = commentStartLine; j <= i; j++) {
            if (lines[j].match(/<[A-Z][^>]*>|<\/[A-Z][^>]*>/)) {
              hasJSX = true;
              break;
            }
          }
          
          if (hasJSX) {
            // Remove the comment markers and keep the JSX
            lines[commentStartLine] = lines[commentStartLine].replace('{/*', '');
            lines[i] = lines[i].replace('*/}', '');
          }
        }
      }
    }
  }
  
  fixed = lines.join('\n');
  
  return fixed;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixJSXComments(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed JSX structure in ${path.basename(filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Fixing JSX structure issues...\n');
let fixedCount = 0;

for (const file of filesToFix) {
  if (processFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✓ Fixed ${fixedCount} files with JSX structure issues`);