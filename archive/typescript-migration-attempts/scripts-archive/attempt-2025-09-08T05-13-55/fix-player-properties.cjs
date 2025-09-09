#!/usr/bin/env node
/**
 * Fix Player Model Property References
 * Based on Prisma schema analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Known Player model property mappings
const PLAYER_PROPERTY_FIXES = {
  // Player model has firstName and lastName, not name
  'player.name': '`${player.firstName} ${player.lastName}`',
  'player?.name': '`${player?.firstName} ${player?.lastName}`',
  
  // Player model has role (PlayerRole), not position
  'player.position': 'player.role',
  'player?.position': 'player?.role',
  
  // Common method name fixes
  'getPlayersByTeam': 'getPlayersByTeamId',
};

console.log('🔍 Analyzing Player property errors...\n');

// Get all TypeScript files
const getAllTsFiles = (dir, files = []) => {
  const fileList = fs.readdirSync(dir);
  
  for (const file of fileList) {
    const filePath = path.join(dir, file);
    
    // Skip node_modules and other ignored directories
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') {
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
};

// Fix player property references
function fixPlayerProperties(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix player.name references
  if (content.includes('player.name') || content.includes('player?.name')) {
    // Handle different contexts
    const patterns = [
      // Simple property access
      { 
        pattern: /(\s+)([\w]+):\s*player\.name([,\s\}])/g,
        replacement: '$1$2: `${player.firstName} ${player.lastName}`$3'
      },
      // Optional chaining
      { 
        pattern: /(\s+)([\w]+):\s*player\?\.name([,\s\}])/g,
        replacement: '$1$2: player ? `${player.firstName} ${player.lastName}` : ""$3'
      },
      // In JSX
      {
        pattern: /\{player\.name\}/g,
        replacement: '{`${player.firstName} ${player.lastName}`}'
      },
      // In template literals
      {
        pattern: /\$\{player\.name\}/g,
        replacement: '${`${player.firstName} ${player.lastName}`}'
      }
    ];
    
    patterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
  }
  
  // Fix player.position references
  if (content.includes('player.position') || content.includes('player?.position')) {
    content = content.replace(/player\.position/g, 'player.role');
    content = content.replace(/player\?\.position/g, 'player?.role');
    modified = true;
  }
  
  // Fix method names
  if (content.includes('getPlayersByTeam(')) {
    content = content.replace(/getPlayersByTeam\(/g, 'getPlayersByTeamId(');
    modified = true;
  }
  
  return { content, modified };
}

// Process server and client directories
const serverFiles = getAllTsFiles(path.join(process.cwd(), 'server'));
const clientFiles = getAllTsFiles(path.join(process.cwd(), 'client'));
const allFiles = [...serverFiles, ...clientFiles];

console.log(`📝 Processing ${allFiles.length} TypeScript files...\n`);

let totalFixed = 0;
const fixedFiles = [];

allFiles.forEach(file => {
  try {
    const result = fixPlayerProperties(file);
    if (result.modified) {
      fs.writeFileSync(file, result.content);
      fixedFiles.push(path.relative(process.cwd(), file));
      totalFixed++;
    }
  } catch (err) {
    // Skip files that can't be processed
  }
});

if (fixedFiles.length > 0) {
  console.log('✅ Fixed files:');
  fixedFiles.forEach(file => console.log(`  - ${file}`));
}

console.log(`\n🎉 Fixed ${totalFixed} files!`);

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