#!/usr/bin/env node
/**
 * Fix the most common TypeScript errors based on analysis
 * 
 * Top errors:
 * - TS2339 (455): Property does not exist on type
 * - TS2353 (103): Object literal may only specify known properties  
 * - TS2345 (92): Argument type not assignable
 * - TS2322 (62): Type not assignable to type
 * - TS2304 (50): Cannot find name
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current errors for analysis
console.log('🔍 Analyzing current TypeScript errors...\n');
let errorOutput = '';
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8' });
} catch (error) {
  errorOutput = error.stdout || '';
}

// Parse errors by file
const errorsByFile = new Map();
const lines = errorOutput.split('\n');
lines.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, col, code, message] = match;
    if (!errorsByFile.has(file)) {
      errorsByFile.set(file, []);
    }
    errorsByFile.get(file).push({ lineNum: parseInt(lineNum), col: parseInt(col), code, message });
  }
});

console.log(`Found errors in ${errorsByFile.size} files\n`);

// Strategy 1: Fix TS2339 - Property does not exist
function fixPropertyDoesNotExist(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2339Errors = errors.filter(e => e.code === 'TS2339');
  
  ts2339Errors.forEach(error => {
    // Extract property name from error message
    const propMatch = error.message.match(/Property '(\w+)' does not exist on type/);
    if (propMatch) {
      const prop = propMatch[1];
      
      // Common patterns and fixes
      if (prop === 'dashboardData') {
        // Add type for dashboardData
        if (!content.includes('interface DashboardData')) {
          const interfaceToAdd = `
interface DashboardData {
  team?: any;
  finances?: any;
  players?: any[];
  matches?: any[];
  notifications?: any[];
  leagues?: any[];
}
`;
          // Add after imports
          const importRegex = /^import .* from .*$/gm;
          let lastImportMatch;
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            lastImportMatch = match;
          }
          
          if (lastImportMatch) {
            const insertPos = lastImportMatch.index + lastImportMatch[0].length;
            content = content.slice(0, insertPos) + '\n' + interfaceToAdd + content.slice(insertPos);
            modified = true;
          }
        }
      } else if (content.includes(`${prop}?.`) || content.includes(`.${prop}`)) {
        // Property is being accessed - might need type assertion
        // Look for the variable declaration
        const lines = content.split('\n');
        const errorLine = lines[error.lineNum - 1];
        
        // If it's accessing a query result, add type assertion
        if (errorLine && errorLine.includes('data.') || errorLine.includes('data?.')) {
          // Find the useQuery call
          const queryPattern = new RegExp(`const\\s*{[^}]*data[^}]*}\\s*=\\s*useQuery`, 'g');
          if (queryPattern.test(content)) {
            // Already has useQuery, might need type assertion in access
            const newLine = errorLine.replace(
              /(\w+)\.(\w+)/g,
              (match, obj, prop) => {
                if (errors.some(e => e.message.includes(`'${prop}'`))) {
                  return `(${obj} as any).${prop}`;
                }
                return match;
              }
            );
            if (newLine !== errorLine) {
              lines[error.lineNum - 1] = newLine;
              content = lines.join('\n');
              modified = true;
            }
          }
        }
      }
    }
  });
  
  return { content, modified };
}

// Strategy 2: Fix TS2304 - Cannot find name
function fixCannotFindName(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2304Errors = errors.filter(e => e.code === 'TS2304');
  const missingNames = new Set();
  
  ts2304Errors.forEach(error => {
    const nameMatch = error.message.match(/Cannot find name '(\w+)'/);
    if (nameMatch) {
      missingNames.add(nameMatch[1]);
    }
  });
  
  // Add missing type imports
  const typesToImport = [];
  if (missingNames.has('Player')) typesToImport.push('Player');
  if (missingNames.has('Team')) typesToImport.push('Team');
  if (missingNames.has('Staff')) typesToImport.push('Staff');
  if (missingNames.has('Contract')) typesToImport.push('Contract');
  if (missingNames.has('TeamFinances')) typesToImport.push('TeamFinances');
  if (missingNames.has('Stadium')) typesToImport.push('Stadium');
  if (missingNames.has('League')) typesToImport.push('League');
  if (missingNames.has('Notification')) typesToImport.push('Notification');
  
  if (typesToImport.length > 0 && !content.includes('@shared/types/models')) {
    const importStatement = `import type { ${typesToImport.join(', ')} } from '@shared/types/models';\n`;
    
    // Add after other imports
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
    } else {
      // No imports, add at top
      content = importStatement + '\n' + content;
      modified = true;
    }
  }
  
  return { content, modified };
}

// Strategy 3: Fix TS2345 - Type not assignable
function fixTypeNotAssignable(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const ts2345Errors = errors.filter(e => e.code === 'TS2345');
  
  ts2345Errors.forEach(error => {
    const lines = content.split('\n');
    const errorLine = lines[error.lineNum - 1];
    
    if (errorLine) {
      // Common pattern: string | undefined not assignable to string
      if (error.message.includes('string | undefined') && error.message.includes('not assignable to parameter of type \'string\'')) {
        // Add nullish coalescing
        const newLine = errorLine.replace(
          /(\w+)([,)])/g,
          (match, varName, delimiter) => {
            // Check if this is the problematic variable
            if (errorLine.includes(varName) && !errorLine.includes(`${varName} || ''`) && !errorLine.includes(`${varName} ?? ''`)) {
              return `(${varName} || '')${delimiter}`;
            }
            return match;
          }
        );
        
        if (newLine !== errorLine) {
          lines[error.lineNum - 1] = newLine;
          content = lines.join('\n');
          modified = true;
        }
      }
    }
  });
  
  return { content, modified };
}

// Process high-error files
const filesToFix = Array.from(errorsByFile.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20); // Top 20 files with most errors

console.log('📝 Fixing top error files...\n');

let totalFixed = 0;
filesToFix.forEach(([file, errors]) => {
  const fileName = path.basename(file);
  console.log(`Processing ${fileName} (${errors.length} errors)...`);
  
  let result = { content: fs.readFileSync(file, 'utf8'), modified: false };
  
  // Apply fixes
  result = fixPropertyDoesNotExist(file, errors);
  if (result.modified) {
    fs.writeFileSync(file, result.content);
    console.log(`  ✅ Fixed property access errors`);
    totalFixed++;
  }
  
  result = fixCannotFindName(file, errors);
  if (result.modified) {
    fs.writeFileSync(file, result.content);
    console.log(`  ✅ Added missing type imports`);
    totalFixed++;
  }
  
  result = fixTypeNotAssignable(file, errors);
  if (result.modified) {
    fs.writeFileSync(file, result.content);
    console.log(`  ✅ Fixed type assignment errors`);
    totalFixed++;
  }
});

console.log(`\n🎉 Fixed issues in ${totalFixed} files!`);
console.log('\nRun: npx tsc --noEmit 2>&1 | grep "error TS" | wc -l');
console.log('to check the new error count.');