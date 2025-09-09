#!/usr/bin/env node

/**
 * Batch fix TypeScript interfaces by replacing local definitions with shared types
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Component files to process
const componentsToFix = glob.sync('client/src/components/**/*.tsx', {
  cwd: process.cwd()
});

let totalFixed = 0;
let filesModified = 0;

componentsToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Check if file already imports from shared types
  const hasSharedImport = content.includes('@shared/types');
  
  // Pattern 1: Remove simple Player interface definitions
  const playerInterfacePattern = /interface\s+Player\s*{[^}]*?firstName[^}]*?lastName[^}]*?}/gs;
  if (playerInterfacePattern.test(content) && !hasSharedImport) {
    // Add import if not present
    const importStatement = "import type { Player, Team, Staff, Contract } from '@shared/types/models';";
    
    // Find the last import statement
    const lastImportMatch = content.match(/^import[^;]+;$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPosition = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
    }
    
    // Remove the interface
    content = content.replace(playerInterfacePattern, '');
    modified = true;
    totalFixed++;
  }
  
  // Pattern 2: Remove simple Team interface definitions
  const teamInterfacePattern = /interface\s+Team\s*{[^}]*?name[^}]*?}/gs;
  if (teamInterfacePattern.test(content)) {
    content = content.replace(teamInterfacePattern, '');
    modified = true;
    totalFixed++;
  }
  
  // Pattern 3: Remove simple Staff interface definitions
  const staffInterfacePattern = /interface\s+Staff(?:Member)?\s*{[^}]*?name[^}]*?salary[^}]*?}/gs;
  if (staffInterfacePattern.test(content)) {
    content = content.replace(staffInterfacePattern, '');
    // Update references from StaffMember to Staff
    content = content.replace(/StaffMember/g, 'Staff');
    modified = true;
    totalFixed++;
  }
  
  // Pattern 4: Remove simple Contract interface definitions
  const contractInterfacePattern = /interface\s+(?:Player)?Contract\s*{[^}]*?salary[^}]*?length[^}]*?}/gs;
  if (contractInterfacePattern.test(content)) {
    content = content.replace(contractInterfacePattern, '');
    modified = true;
    totalFixed++;
  }
  
  // Clean up multiple empty lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (modified && content !== originalContent) {
    fs.writeFileSync(file, content);
    filesModified++;
    console.log(`✓ Fixed ${file}`);
  }
});

console.log('='.repeat(60));
console.log('Batch Interface Fix Complete');
console.log('='.repeat(60));
console.log(`Files modified: ${filesModified}`);
console.log(`Interfaces removed: ${totalFixed}`);
console.log();
console.log('Next steps:');
console.log('1. Run: npm run check:errors');
console.log('2. Manually review any remaining complex interfaces');
console.log('3. Add missing properties to shared/types/models.ts as needed');