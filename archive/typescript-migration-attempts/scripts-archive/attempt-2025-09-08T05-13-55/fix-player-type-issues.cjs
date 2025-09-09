#!/usr/bin/env node
/**
 * Fix Player Type Issues
 * Handles cases where components expect Player with 'name' property
 * but actual Player model has firstName/lastName
 */

const fs = require('fs');
const path = require('path');

// Track fixes
let filesFixed = 0;
let issuesFixed = 0;

function fixPlayerTypeIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern 1: Fix local Player type definitions that have 'name' instead of firstName/lastName
  // Look for interfaces or types that define Player with name property
  const playerInterfacePattern = /interface\s+(\w+Player\w*|\w*Player)\s*\{[^}]*name:\s*string[^}]*\}/g;
  const matches = content.match(playerInterfacePattern);
  
  if (matches) {
    matches.forEach(match => {
      // Check if this interface already has firstName/lastName
      if (!match.includes('firstName') && !match.includes('lastName')) {
        // Replace name: string with firstName and lastName
        const fixed = match.replace(
          /name:\s*string;?/,
          'firstName: string;\n  lastName: string;'
        );
        content = content.replace(match, fixed);
        issuesFixed++;
        modified = true;
      }
    });
  }
  
  // Pattern 2: Fix inline player objects that use 'name'
  // Example: { id: string; name: string; ... }
  const inlinePlayerPattern = /\{\s*id:\s*string;\s*name:\s*string;[^}]*\}/g;
  const inlineMatches = [...content.matchAll(inlinePlayerPattern)];
  
  inlineMatches.forEach(match => {
    const fullMatch = match[0];
    // Only fix if it looks like a player type and doesn't have firstName/lastName
    if (!fullMatch.includes('firstName') && !fullMatch.includes('lastName')) {
      // Check context - is this likely a player?
      const contextStart = Math.max(0, match.index - 50);
      const context = content.substring(contextStart, match.index);
      
      if (context.includes('player') || context.includes('Player') || 
          fullMatch.includes('race') || fullMatch.includes('position') || 
          fullMatch.includes('role') || fullMatch.includes('overall')) {
        
        const fixed = fullMatch.replace(
          /name:\s*string;?/,
          'firstName: string; lastName: string;'
        );
        content = content.replace(fullMatch, fixed);
        issuesFixed++;
        modified = true;
      }
    }
  });
  
  // Pattern 3: Fix references to player.name in template literals and JSX
  // But only if we know the player object should have firstName/lastName
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for player.name references in components that have been updated
    if (line.includes('player.name') || line.includes('player?.name')) {
      // Look for context clues that this is a real Player object
      const prevLines = lines.slice(Math.max(0, i - 10), i).join('\n');
      const nextLines = lines.slice(i + 1, Math.min(lines.length, i + 10)).join('\n');
      const context = prevLines + '\n' + line + '\n' + nextLines;
      
      // If context suggests this is a database Player object
      if (context.includes('firstName') || context.includes('lastName') || 
          context.includes('from "@shared/types/models"') ||
          context.includes('PlayerWithDetails') || 
          context.includes('getPlayersByTeamId')) {
        
        // Replace player.name with template literal
        line = line.replace(/\bplayer\.name\b/g, '`${player.firstName} ${player.lastName}`');
        line = line.replace(/\bplayer\?\.name\b/g, '`${player?.firstName} ${player?.lastName}`');
        issuesFixed++;
        modified = true;
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    content = newLines.join('\n');
  }
  
  // Pattern 4: Fix AgingManager specific issue
  if (filePath.includes('AgingManager')) {
    // The aging data has 'name' but needs to map to firstName/lastName
    content = content.replace(
      /`\$\{player\.firstName\}\s+\$\{player\.lastName\}`/g,
      (match, offset) => {
        // Check if this is in context of agingData
        const before = content.substring(Math.max(0, offset - 100), offset);
        if (before.includes('agingData') || before.includes('playerAging')) {
          issuesFixed++;
          modified = true;
          return 'player.name';
        }
        return match;
      }
    );
  }
  
  // Pattern 5: Fix ContractManagement PlayerData type
  if (filePath.includes('ContractManagement')) {
    // Fix the PlayerData interface to have firstName/lastName
    const playerDataPattern = /interface\s+PlayerData\s*\{[^}]*\}/g;
    const playerDataMatch = content.match(playerDataPattern);
    
    if (playerDataMatch) {
      const fixed = playerDataMatch[0].replace(
        /name:\s*string;?/,
        'firstName: string;\n  lastName: string;'
      );
      if (fixed !== playerDataMatch[0]) {
        content = content.replace(playerDataMatch[0], fixed);
        issuesFixed++;
        modified = true;
      }
    }
  }
  
  // Pattern 6: Fix InjurySystem player type
  if (filePath.includes('InjurySystem')) {
    // The mock players have 'name' but should have firstName/lastName
    const mockPlayerPattern = /\{\s*id:\s*['"`]\d+['"`],\s*name:\s*['"`][^'"`]+['"`]/g;
    content = content.replace(mockPlayerPattern, (match) => {
      const nameMatch = match.match(/name:\s*['"`]([^'"`]+)['"`]/);
      if (nameMatch) {
        const fullName = nameMatch[1];
        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        const fixed = match.replace(
          /name:\s*['"`][^'"`]+['"`]/,
          `firstName: "${firstName}", lastName: "${lastName}"`
        );
        issuesFixed++;
        modified = true;
        return fixed;
      }
      return match;
    });
  }
  
  return { content, modified };
}

// Target files with Player type issues
const problemFiles = [
  'client/src/components/AgingManager.tsx',
  'client/src/components/ContractManagement.tsx',
  'client/src/components/InjurySystem.tsx',
];

// Main execution
console.log('🔧 Fixing Player Type Issues\n');

problemFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ File not found: ${filePath}`);
    return;
  }
  
  try {
    const result = fixPlayerTypeIssues(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      filesFixed++;
      console.log(`  ✅ Fixed: ${path.basename(filePath)}`);
    } else {
      console.log(`  ⏭️ No changes needed: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.log(`  ❌ Error processing ${path.basename(filePath)}: ${err.message}`);
  }
});

// Report results
console.log('\n📊 Results:');
console.log(`  ✅ Files fixed: ${filesFixed}`);
console.log(`  🔧 Issues fixed: ${issuesFixed}`);

// Check new error count
console.log('\n📈 Checking new error count...');
const { execSync } = require('child_process');
try {
  const errorCount = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8'
  }).trim();
  console.log(`  📉 Current errors: ${errorCount}`);
} catch (e) {
  // Expected to fail but we get the output
  if (e.stdout) {
    console.log(`  📉 Current errors: ${e.stdout.trim()}`);
  }
}