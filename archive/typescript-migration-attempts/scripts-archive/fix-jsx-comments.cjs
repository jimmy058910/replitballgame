const fs = require('fs');
const path = require('path');

// Fix broken JSX comments that are causing syntax errors
console.log('🔧 Fixing JSX comment syntax errors...\n');

let filesFixed = 0;
let totalFixes = 0;

function fixJSXComments(content, filePath) {
  let modified = content;
  let fixes = 0;
  
  // Fix broken multiline JSX comments like {/* ... */}
  // Pattern 1: Fix unclosed JSX comments
  modified = modified.replace(/\{\/\*(?:(?!\*\/|\{\/\*).)*$/gm, (match) => {
    fixes++;
    return match + ' */}';
  });
  
  // Pattern 2: Fix double-commented sections {/* {/* */}
  modified = modified.replace(/\{\/\*\s*\{\/\*/g, '{/*');
  
  // Pattern 3: Fix improperly nested comments
  modified = modified.replace(/\*\/\}\s*\*\/\}/g, '*/}');
  
  // Pattern 4: Remove stray closing comment tags outside JSX blocks
  const lines = modified.split('\n');
  const fixedLines = [];
  let inJSXComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Track JSX comment state
    if (line.includes('{/*')) {
      inJSXComment = true;
    }
    if (line.includes('*/}')) {
      inJSXComment = false;
    }
    
    // Fix lines with broken comment syntax
    if (line.includes('/*') && !line.includes('{/*') && !line.includes('*/') && filePath.includes('.tsx')) {
      // This is likely a broken JSX comment
      line = line.replace(/\/\*/, '{/*');
      fixes++;
    }
    
    if (line.includes('*/') && !line.includes('*/}') && !line.includes('/*') && filePath.includes('.tsx')) {
      // This is likely a broken JSX comment ending
      line = line.replace(/\*\//, '*/}');
      fixes++;
    }
    
    fixedLines.push(line);
  }
  
  if (fixes > 0) {
    modified = fixedLines.join('\n');
  }
  
  return { content: modified, fixes };
}

// List of files with known JSX comment issues
const problemFiles = [
  'client/src/pages/League.tsx',
  'client/src/pages/Payments.tsx',
  'client/src/pages/Scouting.tsx',
  'client/src/pages/Stats.tsx',
  'client/src/pages/Store.tsx',
  'client/src/pages/Team.tsx',
  'client/src/pages/TournamentStatus.tsx',
  'client/src/components/ContractNegotiation.tsx',
  'client/src/components/DynamicMarketplaceManager.tsx'
];

// Process each problem file
problemFiles.forEach(relativePath => {
  const filePath = path.join(process.cwd(), relativePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${relativePath}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = fixJSXComments(content, filePath);
    
    if (result.fixes > 0) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      console.log(`✅ Fixed ${result.fixes} issues in: ${relativePath}`);
      filesFixed++;
      totalFixes += result.fixes;
    }
  } catch (error) {
    console.error(`❌ Error processing ${relativePath}:`, error.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ JSX comment fix complete!`);
console.log(`📊 Files fixed: ${filesFixed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);