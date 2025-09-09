#!/usr/bin/env node
/**
 * Fix Incorrect Player References
 * Repairs damage from overzealous script that broke player references
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes
let filesFixed = 0;
let referencesFixed = 0;

function fixIncorrectPlayerRefs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern 1: Fix contract.player references that were incorrectly changed
  // Wrong: contract.player ? `${player.firstName} ${player.lastName}` : ""
  // Right: contract.player ? `${contract.player.firstName} ${contract.player.lastName}` : ""
  const contractPlayerPattern = /(\w+)\.player\s*\?\s*`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g;
  content = content.replace(contractPlayerPattern, (match, varName) => {
    referencesFixed++;
    modified = true;
    return `${varName}.player ? \`\${${varName}.player.firstName} \${${varName}.player.lastName}\``;
  });
  
  // Pattern 2: Fix similar patterns for other objects
  // Wrong: item.player && `${player.firstName} ${player.lastName}`
  // Right: item.player && `${item.player.firstName} ${item.player.lastName}`
  const itemPlayerPattern = /(\w+)\.player\s*&&\s*`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g;
  content = content.replace(itemPlayerPattern, (match, varName) => {
    referencesFixed++;
    modified = true;
    return `${varName}.player && \`\${${varName}.player.firstName} \${${varName}.player.lastName}\``;
  });
  
  // Pattern 3: Fix injury.player references
  const injuryPlayerPattern = /(\w+)\.player\s*\)\s*`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g;
  content = content.replace(injuryPlayerPattern, (match, varName) => {
    referencesFixed++;
    modified = true;
    return `${varName}.player) \`\${${varName}.player.firstName} \${${varName}.player.lastName}\``;
  });
  
  // Pattern 4: Fix playerAging.player references
  // This one is already correct in AgingManager.tsx but check for similar issues
  const agingPlayerPattern = /playerAging\.player\s*&&\s*`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g;
  content = content.replace(agingPlayerPattern, (match) => {
    referencesFixed++;
    modified = true;
    return `playerAging.player && \`\${playerAging.player.firstName} \${playerAging.player.lastName}\``;
  });
  
  // Pattern 5: Fix cases where the variable doesn't exist at all
  // In loops or maps where 'player' should be the iterator variable
  // Look for patterns like: players.map(... => ... `${player.firstName}`
  // This is harder to fix automatically without context
  
  // Pattern 6: Fix standalone player references that should be from a specific object
  // Check for `${player.firstName} ${player.lastName}` without a proper context
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // If line contains the pattern but doesn't define 'player' variable
    if (line.includes('`${player.firstName} ${player.lastName}`')) {
      // Look for the context - what object should this come from?
      // Check previous lines for variable definitions
      let contextVar = null;
      
      // Common patterns to look for
      if (line.includes('.player ?')) {
        // Extract the variable before .player
        const match = line.match(/(\w+)\.player\s*\?/);
        if (match) {
          contextVar = match[1];
          line = line.replace(
            /`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g,
            `\`\${${contextVar}.player.firstName} \${${contextVar}.player.lastName}\``
          );
          referencesFixed++;
          modified = true;
        }
      } else if (line.includes('contract.player')) {
        line = line.replace(
          /`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g,
          '`${contract.player.firstName} ${contract.player.lastName}`'
        );
        referencesFixed++;
        modified = true;
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    content = newLines.join('\n');
  }
  
  return { content, modified };
}

// Get specific files that are known to have issues
const problemFiles = [
  'client/src/components/ContractManagement.tsx',
  'client/src/components/InjurySystem.tsx',
  'client/src/components/AgingManager.tsx',
  'client/src/components/InjuryManagement.tsx',
  'client/src/components/PlayerListingModal.tsx',
];

// Also scan for other affected files
function findAffectedFiles() {
  const affected = [];
  
  try {
    // Find files with the error pattern
    const result = execSync(
      'npx tsc --noEmit 2>&1 | grep "Cannot find name \'player\'" | cut -d"(" -f1 | sort -u',
      { encoding: 'utf8' }
    );
    
    const files = result.split('\n').filter(f => f.trim());
    affected.push(...files);
  } catch (e) {
    // Expected to fail but we get the output
    if (e.stdout) {
      const files = e.stdout.split('\n').filter(f => f.trim());
      affected.push(...files);
    }
  }
  
  return affected;
}

// Main execution
console.log('🔧 Fixing Incorrect Player References\n');

const affectedFiles = [...new Set([...problemFiles, ...findAffectedFiles()])];

console.log(`📂 Checking ${affectedFiles.length} files for incorrect player references...\n`);

const modifiedFiles = [];

affectedFiles.forEach(filePath => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  try {
    const result = fixIncorrectPlayerRefs(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      filesFixed++;
      modifiedFiles.push(path.relative(process.cwd(), fullPath));
    }
  } catch (err) {
    console.log(`  ⚠️ Error processing ${path.basename(fullPath)}: ${err.message}`);
  }
});

// Report results
console.log('📊 Results:');
console.log(`  ✅ Files fixed: ${filesFixed}`);
console.log(`  🔧 References corrected: ${referencesFixed}`);

if (modifiedFiles.length > 0) {
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