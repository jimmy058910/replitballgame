#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix relative imports that don't have .js extension
  // Match imports from relative paths (starting with ./ or ../) that don't end with .js
  const relativeImportRegex = /import\s+.*?\s+from\s+['"](\.\/.+?|\.\.\/[^'"]*?)['"](?=\s*;)/g;
  
  content = content.replace(relativeImportRegex, (match, importPath) => {
    // Only add .js if the path doesn't already have an extension
    if (!importPath.includes('.')) {
      const newMatch = match.replace(importPath, importPath + '.js');
      changed = true;
      console.log(`  Fixed: ${importPath} -> ${importPath}.js`);
      return newMatch;
    }
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  }
  
  return changed;
}

function findTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

console.log('🔧 Starting targeted ES module import fix...');

const serverDir = './server';
const tsFiles = findTsFiles(serverDir);
let totalChanges = 0;

for (const file of tsFiles) {
  if (fixImportsInFile(file)) {
    totalChanges++;
  }
}

console.log(`✅ Fixed imports in ${totalChanges} files out of ${tsFiles.length} TypeScript files`);
console.log('🎯 Only relative imports (./ and ../) were modified - npm packages left untouched');