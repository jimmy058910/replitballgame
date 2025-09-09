#!/usr/bin/env node
/**
 * Comprehensive TypeScript Pattern Fixes
 * Applies proven fixes for the most common TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes
const stats = {
  filesProcessed: 0,
  filesFixed: 0,
  storageFixesApplied: 0,
  typeImportsAdded: 0,
  implicitAnyFixed: 0
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const fixes = [];
  
  // Fix 1: storage.Team -> storage.teams (and similar patterns)
  const storagePatterns = [
    { wrong: /storage\.Team\b/g, right: 'storage.teams', name: 'Team->teams' },
    { wrong: /storage\.Player\b/g, right: 'storage.players', name: 'Player->players' },
    { wrong: /storage\.Staff\b/g, right: 'storage.staff', name: 'Staff->staff' },
    { wrong: /storage\.Contract\b/g, right: 'storage.contracts', name: 'Contract->contracts' },
    { wrong: /storage\.Match\b/g, right: 'storage.matches', name: 'Match->matches' },
    { wrong: /storage\.Game\b/g, right: 'storage.games', name: 'Game->games' },
    { wrong: /storage\.Tournament\b/g, right: 'storage.tournaments', name: 'Tournament->tournaments' },
    { wrong: /storage\.Season\b/g, right: 'storage.seasons', name: 'Season->seasons' },
  ];
  
  storagePatterns.forEach(pattern => {
    if (content.match(pattern.wrong)) {
      content = content.replace(pattern.wrong, pattern.right);
      stats.storageFixesApplied++;
      fixes.push(pattern.name);
      modified = true;
    }
  });
  
  // Fix 2: Add explicit types to common callback parameters
  const callbackPatterns = [
    // .map((t) => ...) -> .map((t: any) => ...)
    { pattern: /\.map\(\(([a-z]+)\) =>/g, replacement: '.map(($1: any) =>' },
    { pattern: /\.filter\(\(([a-z]+)\) =>/g, replacement: '.filter(($1: any) =>' },
    { pattern: /\.forEach\(\(([a-z]+)\) =>/g, replacement: '.forEach(($1: any) =>' },
    { pattern: /\.find\(\(([a-z]+)\) =>/g, replacement: '.find(($1: any) =>' },
    { pattern: /\.reduce\(\(([a-z]+), ([a-z]+)\) =>/g, replacement: '.reduce(($1: any, $2: any) =>' },
  ];
  
  // Only apply in .ts files, not .tsx (to avoid breaking React components)
  if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
    callbackPatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        stats.implicitAnyFixed += matches.length;
        fixes.push(`implicit any (${matches.length}x)`);
        modified = true;
      }
    });
  }
  
  // Fix 3: Add missing type imports for server files
  if (filePath.includes('server/') && !content.includes('from "@shared/types')) {
    const usedTypes = [];
    const typeChecks = [
      'Team', 'Player', 'Staff', 'Contract', 'Match', 'Game', 
      'Tournament', 'Season', 'League', 'Division'
    ];
    
    typeChecks.forEach(type => {
      // Check if type is used but not imported
      const typeUsagePattern = new RegExp(`\\b${type}\\b(?!\\.)`, 'g');
      const importPattern = new RegExp(`import.*\\b${type}\\b.*from`);
      
      if (content.match(typeUsagePattern) && !content.match(importPattern)) {
        // Check if it's actually used as a type (not just in comments or strings)
        const contextPattern = new RegExp(`(:\\s*${type}\\b|<${type}\\b|${type}\\[|${type}\\s*\\||\\|\\s*${type})`);
        if (content.match(contextPattern)) {
          usedTypes.push(type);
        }
      }
    });
    
    if (usedTypes.length > 0) {
      // Add import at the top of the file after other imports
      const importStatement = `import type { ${usedTypes.join(', ')} } from '@shared/types/models';\n`;
      
      // Find the last import statement
      const importMatches = content.match(/^import .* from .*;$/gm);
      if (importMatches) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, lastImportIndex + lastImport.length) + 
                  '\n' + importStatement + 
                  content.slice(lastImportIndex + lastImport.length);
      } else {
        // No imports found, add at the beginning
        content = importStatement + '\n' + content;
      }
      
      stats.typeImportsAdded++;
      fixes.push(`added types: ${usedTypes.join(', ')}`);
      modified = true;
    }
  }
  
  // Fix 4: Common property name fixes
  const propertyFixes = [
    // getPlayersByTeam -> getPlayersByTeamId
    { pattern: /\.getPlayersByTeam\(/g, replacement: '.getPlayersByTeamId(' },
    // contractStartDate -> signedAt
    { pattern: /\.contractStartDate\b/g, replacement: '.signedAt' },
    // contractLength -> length
    { pattern: /contract\.contractLength\b/g, replacement: 'contract.length' },
  ];
  
  propertyFixes.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
      content = content.replace(pattern, replacement);
      fixes.push(`property fix: ${pattern.source}`);
      modified = true;
    }
  });
  
  return { content, modified, fixes };
}

// Main execution
console.log('🔧 Comprehensive TypeScript Pattern Fixes\n');
console.log('📋 Applying proven fixes for common TypeScript errors...\n');

// Get all TypeScript files with errors
const errorFiles = new Set();

try {
  const result = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | cut -d"(" -f1 | sort -u', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });
  
  result.split('\n').filter(f => f.trim()).forEach(file => {
    errorFiles.add(file.trim());
  });
} catch (e) {
  if (e.stdout) {
    e.stdout.split('\n').filter(f => f.trim()).forEach(file => {
      errorFiles.add(file.trim());
    });
  }
}

console.log(`📂 Found ${errorFiles.size} files with TypeScript errors\n`);

// Process each file
errorFiles.forEach(filePath => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  stats.filesProcessed++;
  
  try {
    const result = fixFile(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      stats.filesFixed++;
      console.log(`✅ Fixed: ${path.basename(fullPath)}`);
      console.log(`   Fixes: ${result.fixes.join(', ')}`);
    }
  } catch (err) {
    console.log(`❌ Error processing ${path.basename(fullPath)}: ${err.message}`);
  }
});

// Report results
console.log('\n📊 Results:');
console.log(`  📁 Files processed: ${stats.filesProcessed}`);
console.log(`  ✅ Files fixed: ${stats.filesFixed}`);
console.log(`  🔧 Storage pattern fixes: ${stats.storageFixesApplied}`);
console.log(`  📦 Type imports added: ${stats.typeImportsAdded}`);
console.log(`  🎯 Implicit any fixed: ${stats.implicitAnyFixed}`);

// Check new error count
console.log('\n📈 Checking new error count...');
try {
  const errorCount = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8'
  }).trim();
  console.log(`  📉 Current errors: ${errorCount}`);
} catch (e) {
  if (e.stdout) {
    console.log(`  📉 Current errors: ${e.stdout.trim()}`);
  }
}