#!/usr/bin/env node
/**
 * Systematic TypeScript Error Fix Script
 * Based on error analysis showing TS2339 (455 errors) as the most common
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current errors
console.log('🔍 Analyzing current TypeScript errors...\n');
let errorOutput = '';
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8' });
} catch (error) {
  errorOutput = error.stdout || '';
}

// Parse errors
const errorsByFile = new Map();
const errorCounts = new Map();
const lines = errorOutput.split('\n');

lines.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, col, code, message] = match;
    if (!errorsByFile.has(file)) {
      errorsByFile.set(file, []);
    }
    errorsByFile.get(file).push({ 
      lineNum: parseInt(lineNum), 
      col: parseInt(col), 
      code, 
      message 
    });
    
    errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
  }
});

// Display error distribution
console.log('Error Distribution:');
const sortedErrors = Array.from(errorCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

sortedErrors.forEach(([code, count]) => {
  console.log(`  ${code}: ${count} errors`);
});
console.log();

// Fix Strategy 1: Add missing type imports
function addMissingImports(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2304Errors = errors.filter(e => e.code === 'TS2304');
  const missingTypes = new Set();
  
  ts2304Errors.forEach(error => {
    const match = error.message.match(/Cannot find name '(\w+)'/);
    if (match) {
      missingTypes.add(match[1]);
    }
  });
  
  // Known type mappings
  const typeImports = {
    'Player': '@shared/types/models',
    'Team': '@shared/types/models',
    'Staff': '@shared/types/models',
    'Contract': '@shared/types/models',
    'TeamFinances': '@shared/types/models',
    'Stadium': '@shared/types/models',
    'League': '@shared/types/models',
    'Notification': '@shared/types/models',
    'MarketplaceListing': '@shared/types/models',
    'MarketplaceBid': '@shared/types/models',
    'PlayerMatchStats': '@shared/types/models',
    'TeamMatchStats': '@shared/types/models',
    'TeamWithFinances': '@shared/types/models',
  };
  
  const importsToAdd = [];
  missingTypes.forEach(type => {
    if (typeImports[type] && !content.includes(`import.*${type}.*from.*${typeImports[type]}`)) {
      importsToAdd.push(type);
    }
  });
  
  if (importsToAdd.length > 0) {
    const importStatement = `import type { ${importsToAdd.join(', ')} } from '@shared/types/models';\n`;
    
    // Find last import
    const importRegex = /^import .* from .*$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
      modified = true;
    }
  }
  
  return { content, modified };
}

// Fix Strategy 2: Add type assertions for query data
function fixQueryDataAccess(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2339Errors = errors.filter(e => e.code === 'TS2339');
  
  // Pattern: data?.someProperty where someProperty doesn't exist
  // Solution: Add proper typing to useQuery or type assertion
  
  const lines = content.split('\n');
  
  ts2339Errors.forEach(error => {
    const lineIndex = error.lineNum - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      
      // Check if it's accessing query data
      if (line.includes('data?.') || line.includes('data.')) {
        // Look for the useQuery call above
        for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 20); i--) {
          if (lines[i].includes('useQuery')) {
            // Check if it has generic type
            if (!lines[i].includes('useQuery<')) {
              // Add type based on the queryKey
              const keyMatch = lines[i].match(/queryKey:\s*\[["']([^"']+)["']/);
              if (keyMatch) {
                const endpoint = keyMatch[1];
                let type = 'any';
                
                // Map endpoints to types
                if (endpoint.includes('/teams')) type = 'Team';
                if (endpoint.includes('/players')) type = 'Player[]';
                if (endpoint.includes('/finances')) type = 'TeamFinances';
                if (endpoint.includes('/store')) type = 'StoreData';
                if (endpoint.includes('/notifications')) type = 'Notification[]';
                
                lines[i] = lines[i].replace('useQuery(', `useQuery<${type}>(`);
                modified = true;
              }
            }
            break;
          }
        }
      }
    }
  });
  
  if (modified) {
    content = lines.join('\n');
  }
  
  return { content, modified };
}

// Fix Strategy 3: Add optional chaining
function addOptionalChaining(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2532Errors = errors.filter(e => e.code === 'TS2532');
  const lines = content.split('\n');
  
  ts2532Errors.forEach(error => {
    const lineIndex = error.lineNum - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      
      // Replace object.property with object?.property
      const newLine = line.replace(/(\w+)\.(\w+)/g, (match, obj, prop) => {
        // Don't add ? if it already exists or if it's a known safe access
        if (line.includes(`${obj}?.`) || obj === 'console' || obj === 'Math' || obj === 'JSON') {
          return match;
        }
        return `${obj}?.${prop}`;
      });
      
      if (newLine !== line) {
        lines[lineIndex] = newLine;
        modified = true;
      }
    }
  });
  
  if (modified) {
    content = lines.join('\n');
  }
  
  return { content, modified };
}

// Process high-error files
const filesToFix = Array.from(errorsByFile.entries())
  .filter(([file]) => file.endsWith('.tsx') || file.endsWith('.ts'))
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30); // Top 30 files

console.log(`📝 Processing ${filesToFix.length} files with most errors...\n`);

let totalModified = 0;
filesToFix.forEach(([file, errors]) => {
  const fileName = path.basename(file);
  console.log(`Processing ${fileName} (${errors.length} errors)`);
  
  try {
    // Apply fixes in sequence
    let result = addMissingImports(file, errors);
    if (result.modified) {
      fs.writeFileSync(file, result.content);
      console.log(`  ✅ Added missing type imports`);
      totalModified++;
    }
    
    result = fixQueryDataAccess(file, errors);
    if (result.modified) {
      fs.writeFileSync(file, result.content);
      console.log(`  ✅ Fixed query data access`);
      totalModified++;
    }
    
    result = addOptionalChaining(file, errors);
    if (result.modified) {
      fs.writeFileSync(file, result.content);
      console.log(`  ✅ Added optional chaining`);
      totalModified++;
    }
  } catch (err) {
    console.log(`  ❌ Error processing file: ${err.message}`);
  }
});

console.log(`\n🎉 Modified ${totalModified} files!`);

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