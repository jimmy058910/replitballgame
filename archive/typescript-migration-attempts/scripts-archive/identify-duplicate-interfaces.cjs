#!/usr/bin/env node

/**
 * TypeScript Migration Helper
 * Identifies components with duplicate interface definitions
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript/TSX files in client components
const componentFiles = glob.sync('client/src/components/**/*.{ts,tsx}', {
  cwd: process.cwd()
});

const interfacePatterns = [
  { name: 'Player', pattern: /interface\s+\w*Player\w*\s*{/g },
  { name: 'Team', pattern: /interface\s+\w*Team\w*\s*{/g },
  { name: 'Match', pattern: /interface\s+\w*Match\w*\s*{/g },
  { name: 'Staff', pattern: /interface\s+\w*Staff\w*\s*{/g },
  { name: 'Contract', pattern: /interface\s+\w*Contract\w*\s*{/g }
];

const results = {
  totalFiles: componentFiles.length,
  filesWithInterfaces: 0,
  interfacesByType: {},
  files: []
};

// Initialize counters
interfacePatterns.forEach(p => {
  results.interfacesByType[p.name] = 0;
});

componentFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fileInfo = {
    path: file,
    interfaces: []
  };
  
  let hasInterface = false;
  
  interfacePatterns.forEach(({ name, pattern }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      hasInterface = true;
      results.interfacesByType[name] += matches.length;
      fileInfo.interfaces.push(...matches.map(m => m.replace(/\s*{$/, '')));
    }
  });
  
  // Check if file imports from shared types
  const hasSharedImport = content.includes('@shared/types');
  
  if (hasInterface) {
    results.filesWithInterfaces++;
    fileInfo.hasSharedImport = hasSharedImport;
    results.files.push(fileInfo);
  }
});

console.log('='.repeat(80));
console.log('TypeScript Migration Analysis - Duplicate Interfaces');
console.log('='.repeat(80));
console.log();
console.log(`Total files scanned: ${results.totalFiles}`);
console.log(`Files with local interfaces: ${results.filesWithInterfaces}`);
console.log();

console.log('Interface counts by type:');
console.log('-'.repeat(40));
Object.entries(results.interfacesByType).forEach(([type, count]) => {
  if (count > 0) {
    console.log(`  ${type}: ${count} definitions`);
  }
});

console.log();
console.log('Files to migrate (sorted by interface count):');
console.log('-'.repeat(40));

// Sort by number of interfaces
results.files.sort((a, b) => b.interfaces.length - a.interfaces.length);

results.files.forEach(file => {
  const status = file.hasSharedImport ? '✓' : '✗';
  console.log(`${status} ${file.path}`);
  file.interfaces.forEach(i => {
    console.log(`    ${i}`);
  });
});

console.log();
console.log('Migration Priority:');
console.log('-'.repeat(40));
console.log('Files without shared imports (need migration):');
const needsMigration = results.files.filter(f => !f.hasSharedImport);
needsMigration.forEach(file => {
  console.log(`  - ${file.path} (${file.interfaces.length} interfaces)`);
});

console.log();
console.log(`Total files needing migration: ${needsMigration.length}`);
console.log();
console.log('Recommended action:');
console.log('1. Replace local interfaces with: import type { Player, Team, ... } from "@shared/types/models";');
console.log('2. Add any missing properties to shared/types/models.ts');
console.log('3. Type API responses properly instead of using "any" or "unknown"');