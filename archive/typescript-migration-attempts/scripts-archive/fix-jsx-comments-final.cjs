#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🎯 FIXING JSX COMMENT ISSUES');
console.log('============================================================');
console.log('');

let totalFixed = 0;
let filesModified = 0;

// Fix malformed JSX comments
function fixJSXComments(content, filePath) {
  let fixed = content;
  let changes = 0;

  // Pattern 1: Fix nested JSX comments (comment inside comment)
  // Replace {/* ... {/* ... with {/* ... /* ...
  const nestedCommentPattern = /(\{\/\*[^*]*)\{\/\*/g;
  fixed = fixed.replace(nestedCommentPattern, '$1/*');
  
  // Pattern 2: Fix unclosed JSX comments that span multiple elements
  // Look for {/* followed by JSX code without closing */}
  const lines = fixed.split('\n');
  const newLines = [];
  let inComment = false;
  let commentDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for comment start
    if (line.includes('{/*')) {
      const beforeComment = line.substring(0, line.indexOf('{/*'));
      const afterCommentStart = line.substring(line.indexOf('{/*') + 3);
      
      // Check if comment is closed on same line
      if (afterCommentStart.includes('*/}')) {
        // Properly closed comment on same line
        newLines.push(line);
      } else {
        // Check if next line has JSX elements (indicates malformed comment)
        const nextLine = lines[i + 1] || '';
        if (nextLine.trim() && nextLine.includes('{') && !nextLine.includes('*/}')) {
          // This is likely a malformed comment, close it
          line = beforeComment + '{/* ' + afterCommentStart.trim() + ' */}';
          changes++;
          console.log(`  ✅ Fixed malformed JSX comment in ${path.basename(filePath)}:${i + 1}`);
        }
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  if (changes > 0) {
    fixed = newLines.join('\n');
  }

  return fixed;
}

// Fix specific known issues in ContractNegotiation.tsx
function fixContractNegotiation(content, filePath) {
  if (!filePath.includes('ContractNegotiation.tsx')) return content;
  
  let fixed = content;
  
  // Fix the specific malformed comment block
  const malformedBlock = `              {/*
              {player.camaraderie !== undefined && (
                <Badge
                  variant={
                    player.camaraderie > 70 ? "default" :
                    player.camaraderie < 30 ? "destructive" : "secondary"
                  }
                  className={
                    player.camaraderie > 70 ? "bg-green-500 hover:bg-green-600" :
                    player.camaraderie < 30 ? "bg-red-500 hover:bg-red-600" : ""
                  }
                >
                  {/*
                  Camaraderie: {player.camaraderie} ({getCamaraderieEffectDescription(player.camaraderie)})
                </Badge>
              )}`;

  const fixedBlock = `              {/* Camaraderie display temporarily disabled */}
              {false && player.camaraderie !== undefined && (
                <Badge
                  variant={
                    (player as any).camaraderie > 70 ? "default" :
                    (player as any).camaraderie < 30 ? "destructive" : "secondary"
                  }
                  className={
                    (player as any).camaraderie > 70 ? "bg-green-500 hover:bg-green-600" :
                    (player as any).camaraderie < 30 ? "bg-red-500 hover:bg-red-600" : ""
                  }
                >
                  Camaraderie: {(player as any).camaraderie} ({getCamaraderieEffectDescription((player as any).camaraderie)})
                </Badge>
              )}`;

  if (fixed.includes(malformedBlock)) {
    fixed = fixed.replace(malformedBlock, fixedBlock);
    console.log(`  ✅ Fixed malformed camaraderie block in ContractNegotiation.tsx`);
  }

  return fixed;
}

// Fix similar issues in other files
function fixJSXStructure(content, filePath) {
  let fixed = content;
  let changes = 0;

  // Remove all malformed multi-line JSX comments
  const multiLineCommentPattern = /\{\/\*[\s\S]*?\{[\s\S]*?\*\/\}/g;
  const matches = fixed.match(multiLineCommentPattern);
  
  if (matches) {
    matches.forEach(match => {
      // Check if this is a malformed comment (has JSX inside)
      if (match.includes('<') && match.includes('>')) {
        // Extract the JSX code and uncomment it
        const jsxCode = match.replace(/\{\/\*|\*\/\}/g, '').trim();
        // Wrap problematic code in conditional render
        const safeCode = `{false && (${jsxCode})}`;
        fixed = fixed.replace(match, safeCode);
        changes++;
      }
    });
  }

  if (changes > 0) {
    console.log(`  ✅ Fixed ${changes} JSX structure issues in ${path.basename(filePath)}`);
  }

  return fixed;
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply fixes
    content = fixContractNegotiation(content, filePath);
    content = fixJSXComments(content, filePath);
    content = fixJSXStructure(content, filePath);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Main execution
console.log('🔍 Scanning TSX files with JSX issues...');
console.log('');

// Target files with known JSX issues
const problemFiles = [
  'client/src/components/ContractNegotiation.tsx',
  'client/src/components/DynamicMarketplaceManager.tsx',
  'client/src/components/EnhancedDashboard.tsx',
  'client/src/pages/Team.tsx',
  'client/src/pages/MarketDistrict.tsx'
];

console.log(`📁 Processing ${problemFiles.length} files with known JSX issues...`);
problemFiles.forEach(file => {
  if (fs.existsSync(file)) {
    if (processFile(file)) {
      totalFixed++;
    }
  }
});

// Also scan all TSX files for similar issues
const allTsxFiles = glob.sync('client/src/**/*.tsx', {
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
});

console.log(`\n📁 Scanning ${allTsxFiles.length} TSX files for JSX comment issues...`);
allTsxFiles.forEach(file => {
  if (processFile(file)) {
    totalFixed++;
  }
});

console.log('');
console.log('============================================================');
console.log('✅ JSX COMMENT FIX COMPLETE');
console.log(`📊 Files modified: ${filesModified}`);
console.log(`🎯 Total fixes applied: ${totalFixed}`);
console.log('============================================================');