#!/usr/bin/env node
/**
 * Fix Duplicate Import Errors
 * Removes duplicate type imports that were accidentally added
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes
let filesFixed = 0;
let importsRemoved = 0;

function removeDuplicateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Track imported types per source
  const importedTypes = new Map(); // source -> Set of types
  const importLines = [];
  let modified = false;
  
  // First pass: collect all imports
  lines.forEach((line, index) => {
    const importMatch = line.match(/^import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const [, types, source] = importMatch;
      const typeList = types.split(',').map(t => t.trim());
      
      if (!importedTypes.has(source)) {
        importedTypes.set(source, new Set());
      }
      
      importLines.push({ index, types: typeList, source, line });
      typeList.forEach(type => importedTypes.get(source).add(type));
    }
  });
  
  // Check for duplicate imports from same source
  const duplicateSources = [];
  importedTypes.forEach((types, source) => {
    const relevantImports = importLines.filter(imp => imp.source === source);
    if (relevantImports.length > 1) {
      duplicateSources.push({ source, imports: relevantImports });
    }
  });
  
  // If we have duplicates, consolidate them
  if (duplicateSources.length > 0) {
    const linesToRemove = new Set();
    const linesToReplace = new Map();
    
    duplicateSources.forEach(({ source, imports }) => {
      // Collect all unique types
      const allTypes = new Set();
      imports.forEach(imp => {
        imp.types.forEach(type => allTypes.add(type));
      });
      
      // Keep the first import line, remove the rest
      const firstImport = imports[0];
      const consolidatedLine = `import type { ${Array.from(allTypes).join(', ')} } from '${source}';`;
      linesToReplace.set(firstImport.index, consolidatedLine);
      
      // Mark other lines for removal
      for (let i = 1; i < imports.length; i++) {
        linesToRemove.add(imports[i].index);
      }
    });
    
    // Apply changes
    const newLines = [];
    lines.forEach((line, index) => {
      if (linesToRemove.has(index)) {
        importsRemoved++;
        // Skip this line
      } else if (linesToReplace.has(index)) {
        newLines.push(linesToReplace.get(index));
      } else {
        newLines.push(line);
      }
    });
    
    content = newLines.join('\n');
    modified = true;
  }
  
  // Also check for exact duplicate lines (same types, same source)
  const seenImports = new Set();
  const newLines = [];
  
  lines.forEach(line => {
    const importMatch = line.match(/^import\s+(?:type\s+)?{[^}]+}\s+from\s+['"][^'"]+['"]/);
    if (importMatch) {
      const normalizedLine = line.replace(/\s+/g, ' ').trim();
      if (seenImports.has(normalizedLine)) {
        // Skip duplicate
        importsRemoved++;
        modified = true;
      } else {
        seenImports.add(normalizedLine);
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  });
  
  if (modified) {
    content = newLines.join('\n');
  }
  
  return { content, modified };
}

// Get all TypeScript files
function getAllTsFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  
  for (const file of fileList) {
    const filePath = path.join(dir, file);
    
    // Skip node_modules and other ignored directories
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === 'prisma') {
      continue;
    }
    
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, files);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      files.push(filePath);
    }
  }
  
  return files;
}

// Main execution
console.log('🔧 Fixing Duplicate Import Errors\n');

const serverFiles = getAllTsFiles(path.join(process.cwd(), 'server'));
const clientFiles = getAllTsFiles(path.join(process.cwd(), 'client', 'src'));
const sharedFiles = getAllTsFiles(path.join(process.cwd(), 'shared'));
const allFiles = [...serverFiles, ...clientFiles, ...sharedFiles];

console.log(`📂 Checking ${allFiles.length} TypeScript files for duplicate imports...\n`);

const modifiedFiles = [];

allFiles.forEach(filePath => {
  try {
    const result = removeDuplicateImports(filePath);
    if (result.modified) {
      fs.writeFileSync(filePath, result.content);
      filesFixed++;
      modifiedFiles.push(path.relative(process.cwd(), filePath));
    }
  } catch (err) {
    // Skip files with errors
  }
});

// Report results
console.log('📊 Results:');
console.log(`  ✅ Files fixed: ${filesFixed}`);
console.log(`  🗑️ Duplicate imports removed: ${importsRemoved}`);

if (modifiedFiles.length > 0 && modifiedFiles.length <= 20) {
  console.log('\n📝 Modified files:');
  modifiedFiles.forEach(file => console.log(`  - ${file}`));
}

// Check new error count
console.log('\n📈 Checking new error count...');
try {
  execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
} catch (e) {
  // Expected to fail
}