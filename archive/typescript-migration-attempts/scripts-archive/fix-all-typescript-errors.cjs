const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript errors
console.log('Analyzing TypeScript errors...');
const errors = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).split('\n');

// Parse errors by file
const fileErrors = new Map();
errors.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
  if (match) {
    const [, file, line, col, code, message] = match;
    if (!fileErrors.has(file)) {
      fileErrors.set(file, []);
    }
    fileErrors.get(file).push({ line: parseInt(line), col: parseInt(col), code, message });
  }
});

console.log(`Found errors in ${fileErrors.size} files`);

// Common fixes
const fixes = {
  // Fix missing prisma imports
  'TS2304': (file, error) => {
    if (error.message.includes("Cannot find name 'prisma'")) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('getPrismaClient')) {
        const lines = content.split('\n');
        // Find the last import line
        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        lines.splice(lastImportIndex + 1, 0, "import { getPrismaClient } from '../database.js';");
        
        // Replace prisma. with proper usage
        const updatedContent = lines.join('\n').replace(/\bprisma\./g, '(await getPrismaClient()).');
        fs.writeFileSync(file, updatedContent);
        return true;
      }
    }
    return false;
  },
  
  // Fix cacheTime -> gcTime in React Query
  'TS2353': (file, error) => {
    if (error.message.includes("'cacheTime'")) {
      const content = fs.readFileSync(file, 'utf8');
      const updated = content.replace(/cacheTime:/g, 'gcTime:');
      if (updated !== content) {
        fs.writeFileSync(file, updated);
        return true;
      }
    }
    return false;
  },
  
  // Fix property name typos
  'TS2551': (file, error) => {
    const typoFixes = {
      'Contract': 'contract',
      'userId': 'userProfileId',
      'goalsFor': 'pointsFor',
      'goalsAgainst': 'pointsAgainst'
    };
    
    for (const [wrong, correct] of Object.entries(typoFixes)) {
      if (error.message.includes(wrong)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        if (lines[error.line - 1] && lines[error.line - 1].includes(wrong)) {
          lines[error.line - 1] = lines[error.line - 1].replace(new RegExp(`\\b${wrong}\\b`, 'g'), correct);
          fs.writeFileSync(file, lines.join('\n'));
          return true;
        }
      }
    }
    return false;
  },
  
  // Remove unused @ts-expect-error directives
  'TS2578': (file, error) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    if (lines[error.line - 1] && lines[error.line - 1].includes('@ts-expect-error')) {
      lines.splice(error.line - 1, 1);
      fs.writeFileSync(file, lines.join('\n'));
      return true;
    }
    return false;
  },
  
  // Fix implicit any parameters
  'TS7006': (file, error) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const line = lines[error.line - 1];
    if (line) {
      // Add : any to parameters without types
      const updated = line.replace(/\(([a-zA-Z_]\w*)\)/g, '($1: any)')
                          .replace(/\(([a-zA-Z_]\w*),/g, '($1: any,')
                          .replace(/, ([a-zA-Z_]\w*)\)/g, ', $1: any)')
                          .replace(/, ([a-zA-Z_]\w*),/g, ', $1: any,');
      if (updated !== line) {
        lines[error.line - 1] = updated;
        fs.writeFileSync(file, lines.join('\n'));
        return true;
      }
    }
    return false;
  }
};

// Apply fixes
let totalFixed = 0;
for (const [file, errors] of fileErrors.entries()) {
  let fileFixed = 0;
  
  // Sort errors by line number in reverse (to avoid line number shifts)
  errors.sort((a, b) => b.line - a.line);
  
  for (const error of errors) {
    if (fixes[error.code]) {
      if (fixes[error.code](file, error)) {
        fileFixed++;
        totalFixed++;
      }
    }
  }
  
  if (fileFixed > 0) {
    console.log(`Fixed ${fileFixed} errors in ${path.basename(file)}`);
  }
}

console.log(`\nTotal fixes applied: ${totalFixed}`);
console.log('Running TypeScript check again...');

// Check remaining errors
const remaining = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf8' }).trim();
console.log(`Remaining errors: ${remaining}`);