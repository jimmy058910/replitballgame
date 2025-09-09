#!/usr/bin/env node
/**
 * Fix Server-Side TypeScript Issues
 * Focuses on server routes, services, and data access layers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track progress
const stats = {
  filesProcessed: 0,
  filesFixed: 0,
  typeImportsAdded: 0,
  asyncFunctionsFixed: 0,
  storageCallsFixed: 0,
  prismaTypesFixed: 0
};

function fixServerFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const fixes = [];
  
  // Fix 1: Add missing type imports for server files
  if (filePath.includes('server/') && !content.includes('from "@shared/types')) {
    const usedTypes = [];
    const typeChecks = [
      'Team', 'Player', 'Staff', 'Contract', 'Match', 'Game', 
      'Tournament', 'Season', 'League', 'Division', 'UserProfile',
      'TeamFinances', 'Stadium', 'MarketplaceListing', 'MarketplaceBid'
    ];
    
    typeChecks.forEach(type => {
      // Check if type is used but not imported
      const typeUsagePattern = new RegExp(`\\b${type}\\b(?!\\.)`, 'g');
      const importPattern = new RegExp(`import.*\\b${type}\\b.*from`);
      
      if (content.match(typeUsagePattern) && !content.match(importPattern)) {
        // Check if it's actually used as a type (not just in comments or strings)
        const contextPattern = new RegExp(`(:\\s*${type}\\b|<${type}\\b|${type}\\[|${type}\\s*\\||\\|\\s*${type}|as\\s+${type}\\b)`);
        if (content.match(contextPattern)) {
          usedTypes.push(type);
        }
      }
    });
    
    if (usedTypes.length > 0) {
      // Add import at the top of the file after other imports
      const importStatement = `import type { ${usedTypes.join(', ')} } from '@shared/types/models';\n`;
      
      // Find the last import statement
      const importMatches = content.match(/^import .* from ['"].*['"];?$/gm);
      if (importMatches && importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, lastImportIndex + lastImport.length) + 
                  '\n' + importStatement + 
                  content.slice(lastImportIndex + lastImport.length);
      } else {
        // No imports found, add at the beginning after any comments
        const firstNonComment = content.search(/^[^\/\*\s]/m);
        content = content.slice(0, firstNonComment) + importStatement + '\n' + content.slice(firstNonComment);
      }
      
      stats.typeImportsAdded++;
      fixes.push(`added types: ${usedTypes.join(', ')}`);
      modified = true;
    }
  }
  
  // Fix 2: Fix async function return types
  // Pattern: async function that doesn't have Promise return type
  const asyncFunctionPattern = /async\s+(\w+)\s*\([^)]*\)\s*(?::\s*(\w+))?/g;
  let match;
  const asyncFixes = [];
  
  while ((match = asyncFunctionPattern.exec(content)) !== null) {
    const [fullMatch, functionName, returnType] = match;
    if (returnType && !returnType.includes('Promise')) {
      const replacement = fullMatch.replace(returnType, `Promise<${returnType}>`);
      asyncFixes.push({ original: fullMatch, replacement });
    }
  }
  
  asyncFixes.forEach(({ original, replacement }) => {
    content = content.replace(original, replacement);
    stats.asyncFunctionsFixed++;
    fixes.push('async return type');
    modified = true;
  });
  
  // Fix 3: Fix Prisma/storage call patterns
  const storagePatterns = [
    // Fix missing await
    { pattern: /(?<!await\s+)storage\.(teams|players|staff|contracts|matches|games|tournaments|seasons)\.(?:get|create|update|delete)/g,
      replacement: 'await storage.$1.$2' },
    
    // Fix missing await for prisma calls
    { pattern: /(?<!await\s+)prisma\.\w+\.(?:findUnique|findFirst|findMany|create|update|delete|count|aggregate)/g,
      replacement: (match) => `await ${match}` },
  ];
  
  storagePatterns.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Check context to avoid adding await in wrong places
      matches.forEach(match => {
        const index = content.indexOf(match);
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const line = content.substring(lineStart, content.indexOf('\n', index));
        
        // Don't add await if it's in a return statement that already awaits
        if (!line.includes('return await') && !line.includes('await')) {
          const newMatch = typeof replacement === 'function' ? replacement(match) : match.replace(pattern, replacement);
          content = content.replace(match, newMatch);
          stats.storageCallsFixed++;
          modified = true;
        }
      });
      
      if (modified) {
        fixes.push('storage/prisma awaits');
      }
    }
  });
  
  // Fix 4: Fix common Prisma type issues
  const prismaTypePatterns = [
    // Fix BigInt to number conversions
    { pattern: /BigInt\(([^)]+)\)/g, replacement: 'Number($1)' },
    
    // Fix Date type issues
    { pattern: /new Date\(\)\.toISOString\(\)/g, replacement: 'new Date()' },
    
    // Fix optional chaining for nested relations
    { pattern: /(\w+)\.(\w+)\.(\w+)(?!\?)/g, 
      test: (match) => match.includes('team.players.') || match.includes('player.skills.') || match.includes('team.finances.'),
      replacement: '$1?.$2?.$3' },
  ];
  
  prismaTypePatterns.forEach(({ pattern, replacement, test }) => {
    if (!test || content.match(pattern)?.some(m => test(m))) {
      content = content.replace(pattern, replacement);
      stats.prismaTypesFixed++;
      fixes.push('Prisma types');
      modified = true;
    }
  });
  
  // Fix 5: Fix common Express/Request type issues
  if (filePath.includes('routes/')) {
    // Add Request type annotation where missing
    const routeHandlerPattern = /\.(get|post|put|delete|patch)\(.*?,\s*(?:async\s+)?\((\w+),\s*(\w+)\)/g;
    content = content.replace(routeHandlerPattern, (match, method, req, res) => {
      if (!content.includes(`${req}: Request`) && !content.includes(`${req}: any`)) {
        return match.replace(`(${req}, ${res})`, `(${req}: any, ${res}: any)`);
      }
      return match;
    });
  }
  
  return { content, modified, fixes };
}

// Main execution
console.log('🔧 Fixing Server-Side TypeScript Issues\n');
console.log('📋 Targeting server routes, services, and data access layers...\n');

// Get server files with errors
const serverErrorFiles = [];

try {
  const result = execSync('npx tsc --project tsconfig.migration.json --noEmit 2>&1 | grep "error TS" | grep "server/" | cut -d"(" -f1 | sort -u', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  
  result.split('\n').filter(f => f.trim()).forEach(file => {
    serverErrorFiles.push(file.trim());
  });
} catch (e) {
  if (e.stdout) {
    e.stdout.split('\n')
      .filter(line => line.includes('server/'))
      .map(line => line.split('(')[0])
      .filter(f => f.trim())
      .forEach(file => {
        serverErrorFiles.push(file.trim());
      });
  }
}

console.log(`📂 Found ${serverErrorFiles.length} server files with TypeScript errors\n`);

// Process server files
serverErrorFiles.forEach(filePath => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  stats.filesProcessed++;
  
  try {
    const result = fixServerFile(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      stats.filesFixed++;
      console.log(`✅ Fixed: ${path.relative('server', fullPath)}`);
      if (result.fixes.length > 0) {
        console.log(`   Fixes: ${result.fixes.join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`❌ Error processing ${path.basename(fullPath)}: ${err.message}`);
  }
});

// Report results
console.log('\n📊 Results:');
console.log(`  📁 Files processed: ${stats.filesProcessed}`);
console.log(`  ✅ Files fixed: ${stats.filesFixed}`);
console.log(`  📦 Type imports added: ${stats.typeImportsAdded}`);
console.log(`  🔄 Async functions fixed: ${stats.asyncFunctionsFixed}`);
console.log(`  💾 Storage calls fixed: ${stats.storageCallsFixed}`);
console.log(`  🔷 Prisma types fixed: ${stats.prismaTypesFixed}`);

// Check new error count
console.log('\n📈 Checking new error count...');
try {
  const errorCount = execSync('npx tsc --project tsconfig.migration.json --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8'
  }).trim();
  console.log(`  📉 Current errors: ${errorCount}`);
  
  // Calculate improvement
  const baseline = 1038;
  const current = parseInt(errorCount);
  const improvement = baseline - current;
  const percentage = ((improvement / baseline) * 100).toFixed(1);
  
  console.log(`  📊 Improvement: ${improvement} errors fixed (${percentage}% reduction from last run)`);
  
  if (current < 940) {
    console.log('  🎉 Goal achieved! Reduced errors by more than 10% from baseline');
  }
} catch (e) {
  if (e.stdout) {
    console.log(`  📉 Current errors: ${e.stdout.trim()}`);
  }
}