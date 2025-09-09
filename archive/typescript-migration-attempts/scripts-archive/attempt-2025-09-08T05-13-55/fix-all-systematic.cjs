#!/usr/bin/env node
/**
 * Comprehensive TypeScript Error Fix Script
 * Combines all proven patterns from our migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes applied
const fixesApplied = {
  optionalChaining: 0,
  playerProperties: 0,
  prismaFields: 0,
  imports: 0,
  typeAssertions: 0
};

// Fix 1: Add optional chaining for undefined properties
function addOptionalChaining(content) {
  let modified = false;
  
  // Common patterns that need optional chaining
  const patterns = [
    // Object property access
    { from: /(\w+)\.currentDay/g, to: '$1?.currentDay' },
    { from: /(\w+)\.tacticalFocus/g, to: '$1?.tacticalFocus' },
    { from: /(\w+)\.fieldSize/g, to: '$1?.fieldSize' },
    { from: /(\w+)\.finances([^?])/g, to: '$1?.finances$2' },
    { from: /(\w+)\.players([^?])/g, to: '$1?.players$2' },
    { from: /(\w+)\.offensive([^?])/g, to: '$1?.offensive$2' },
    { from: /(\w+)\.defensive([^?])/g, to: '$1?.defensive$2' },
  ];
  
  patterns.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      fixesApplied.optionalChaining++;
    }
  });
  
  return { content, modified };
}

// Fix 2: Player property corrections
function fixPlayerProperties(content) {
  let modified = false;
  
  // Fix player.name references
  if (content.includes('player.name') || content.includes('player?.name')) {
    const patterns = [
      { 
        from: /player\.name/g,
        to: '`${player.firstName} ${player.lastName}`'
      },
      { 
        from: /player\?\.name/g,
        to: 'player ? `${player.firstName} ${player.lastName}` : ""'
      }
    ];
    
    patterns.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        fixesApplied.playerProperties++;
      }
    });
  }
  
  // Fix player.position to player.role
  if (content.includes('player.position') || content.includes('player?.position')) {
    content = content.replace(/player\.position/g, 'player.role');
    content = content.replace(/player\?\.position/g, 'player?.role');
    modified = true;
    fixesApplied.playerProperties++;
  }
  
  return { content, modified };
}

// Fix 3: Prisma field name corrections
function fixPrismaFields(content) {
  let modified = false;
  
  const fieldMappings = [
    { from: /\.teams\[/g, to: '.Team' },
    { from: /\.teams\./g, to: '.Team.' },
    { from: /lastUpdated:\s*new Date\(\)/g, to: 'updatedAt: new Date()' },
    { from: /completedAt:\s*new Date\(\)/g, to: 'updatedAt: new Date()' },
    { from: /transaction\.gemAmount/g, to: 'transaction.gemsAmount' },
    { from: /prisma\.gemPackage/g, to: 'prisma.gemPack' },
    { from: /getPlayersByTeam\(/g, to: 'getPlayersByTeamId(' },
  ];
  
  fieldMappings.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      fixesApplied.prismaFields++;
    }
  });
  
  return { content, modified };
}

// Fix 4: Add missing type imports
function addMissingImports(content, filePath) {
  let modified = false;
  
  // Check if file is TypeScript
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return { content, modified };
  }
  
  // Check for usage of types without imports
  const typeUsages = {
    Player: /\bPlayer\b/,
    Team: /\bTeam\b/,
    Staff: /\bStaff\b/,
    Contract: /\bContract\b/,
    TeamFinances: /\bTeamFinances\b/,
    Stadium: /\bStadium\b/,
    League: /\bLeague\b/,
    Notification: /\bNotification\b/,
    MarketplaceListing: /\bMarketplaceListing\b/,
    MarketplaceBid: /\bMarketplaceBid\b/,
  };
  
  const usedTypes = [];
  for (const [type, regex] of Object.entries(typeUsages)) {
    if (regex.test(content) && !content.includes(`import.*${type}.*from.*@shared/types/models`)) {
      usedTypes.push(type);
    }
  }
  
  if (usedTypes.length > 0 && !content.includes('@shared/types/models')) {
    const importStatement = `import type { ${usedTypes.join(', ')} } from '@shared/types/models';\n`;
    
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
      fixesApplied.imports++;
    }
  }
  
  return { content, modified };
}

// Fix 5: Add type assertions for query data
function addTypeAssertions(content) {
  let modified = false;
  
  // Pattern: useQuery without generic type
  const queryPattern = /useQuery\({\s*queryKey:/g;
  if (queryPattern.test(content)) {
    // Add generic types based on query key
    const patterns = [
      {
        from: /useQuery\({\s*queryKey:\s*\['\/api\/teams\/my'\]/g,
        to: 'useQuery<Team>({ queryKey: ["/api/teams/my"]'
      },
      {
        from: /useQuery\({\s*queryKey:\s*\['\/api\/players'\]/g,
        to: 'useQuery<Player[]>({ queryKey: ["/api/players"]'
      },
      {
        from: /useQuery\({\s*queryKey:\s*\['\/api\/notifications'\]/g,
        to: 'useQuery<Notification[]>({ queryKey: ["/api/notifications"]'
      }
    ];
    
    patterns.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        fixesApplied.typeAssertions++;
      }
    });
  }
  
  return { content, modified };
}

// Process all TypeScript files
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
console.log('🔧 Comprehensive TypeScript Error Fix\n');
console.log('📂 Scanning project files...\n');

const serverFiles = getAllTsFiles(path.join(process.cwd(), 'server'));
const clientFiles = getAllTsFiles(path.join(process.cwd(), 'client', 'src'));
const allFiles = [...serverFiles, ...clientFiles];

console.log(`Found ${allFiles.length} TypeScript files\n`);
console.log('🔄 Applying fixes...\n');

let filesFixed = 0;
const modifiedFiles = [];

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;
    
    // Apply all fixes
    let result;
    
    result = addOptionalChaining(content);
    if (result.modified) {
      content = result.content;
      fileModified = true;
    }
    
    result = fixPlayerProperties(content);
    if (result.modified) {
      content = result.content;
      fileModified = true;
    }
    
    result = fixPrismaFields(content);
    if (result.modified) {
      content = result.content;
      fileModified = true;
    }
    
    result = addMissingImports(content, filePath);
    if (result.modified) {
      content = result.content;
      fileModified = true;
    }
    
    result = addTypeAssertions(content);
    if (result.modified) {
      content = result.content;
      fileModified = true;
    }
    
    if (fileModified) {
      fs.writeFileSync(filePath, content);
      filesFixed++;
      modifiedFiles.push(path.relative(process.cwd(), filePath));
    }
  } catch (err) {
    // Skip files with errors
  }
});

// Report results
console.log('📊 Fix Summary:');
console.log(`  ✅ Files modified: ${filesFixed}`);
console.log(`  🔄 Optional chaining added: ${fixesApplied.optionalChaining}`);
console.log(`  👤 Player properties fixed: ${fixesApplied.playerProperties}`);
console.log(`  📦 Prisma fields corrected: ${fixesApplied.prismaFields}`);
console.log(`  📥 Type imports added: ${fixesApplied.imports}`);
console.log(`  🏷️ Type assertions added: ${fixesApplied.typeAssertions}`);

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