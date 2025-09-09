#!/usr/bin/env node
/**
 * Apply modern React Query TypeScript patterns based on 2024 best practices
 * Key principle: Let TypeScript infer types from properly typed query functions
 */

const fs = require('fs');
const path = require('path');

// Target high-error files
const targetFiles = [
  'client/src/pages/Store.tsx',
  'client/src/pages/League.tsx',
  'client/src/components/StatsDisplay.tsx',
  'client/src/components/TapToAssignTactics.tsx',
  'client/src/components/TacticalFormationMobile.tsx',
  'client/src/components/TextTacticalManager.tsx',
  'client/src/components/EnhancedMarketplace.tsx',
  'client/src/components/QuickStatsBar.tsx',
  'client/src/components/FinancesTab.tsx',
  'client/src/pages/Stats.tsx',
  'client/src/components/StaffManagement.tsx',
  'client/src/pages/Payments.tsx',
  'client/src/components/PlayerSkillsManager.tsx',
  'client/src/pages/Team.tsx'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${filePath} not found`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Step 1: Ensure imports are present
  if (!content.includes('@shared/types/models')) {
    // Find the last import
    const importRegex = /^import .* from .*$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      const importStatement = `\nimport type { Player, Team, Staff, Contract, TeamFinances, Stadium, League, Notification, MarketplaceListing, MarketplaceBid } from '@shared/types/models';`;
      content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
      modified = true;
    }
  }
  
  // Step 2: Fix useQuery patterns - remove Error generic, keep data type
  // Pattern: useQuery<Type, Error>( -> useQuery<Type>(
  content = content.replace(
    /useQuery<([^,>]+),\s*Error\s*>\(/g,
    'useQuery<$1>('
  );
  
  // Step 3: Add proper return types to query functions
  // Pattern: queryFn: () => apiRequest(...) -> queryFn: async () => { const response = await apiRequest(...); return response as Type; }
  
  // Find all useQuery calls and extract their types
  const queryPattern = /const\s*{\s*data:\s*(\w+)[^}]*}\s*=\s*useQuery(?:<([^>]+)>)?\s*\(\s*{([^}]+)}\s*\)/g;
  let queryMatch;
  const queries = [];
  
  while ((queryMatch = queryPattern.exec(content)) !== null) {
    const varName = queryMatch[1];
    const typeParam = queryMatch[2];
    const queryBody = queryMatch[3];
    
    // Check if queryFn needs fixing
    if (queryBody.includes('queryFn:') && !queryBody.includes('return response as')) {
      queries.push({ varName, typeParam, queryBody, fullMatch: queryMatch[0] });
    }
  }
  
  // Apply fixes for each query
  queries.forEach(({ varName, typeParam, queryBody, fullMatch }) => {
    if (typeParam) {
      // Extract the API endpoint
      const apiMatch = queryBody.match(/apiRequest\([^)]+\)/);
      if (apiMatch) {
        const newQueryFn = `queryFn: async () => {
      const response = await ${apiMatch[0]};
      return response as ${typeParam};
    }`;
        
        const newQueryBody = queryBody.replace(
          /queryFn:\s*\([^)]*\)\s*=>\s*apiRequest\([^)]+\)/,
          newQueryFn
        );
        
        const newFullMatch = fullMatch.replace(queryBody, newQueryBody);
        content = content.replace(fullMatch, newFullMatch);
        modified = true;
      }
    }
  });
  
  // Step 4: Fix common type issues
  // Add optional chaining for potentially undefined values
  content = content.replace(
    /(\w+)\.map\(/g,
    (match, varName) => {
      // Check if this is a query data variable
      if (content.includes(`data: ${varName}`)) {
        return `${varName}?.map(`;
      }
      return match;
    }
  );
  
  // Fix property access on potentially undefined objects
  content = content.replace(
    /(\w+)\.length/g,
    (match, varName) => {
      // Check if this is a query data variable
      if (content.includes(`data: ${varName}`)) {
        return `${varName}?.length`;
      }
      return match;
    }
  );
  
  // Step 5: Remove duplicate local interfaces that exist in shared types
  const interfacesToRemove = [
    'Player', 'Team', 'Staff', 'Contract', 'Stadium', 
    'TeamFinances', 'MarketplaceListing', 'MarketplaceBid',
    'League', 'Notification'
  ];
  
  interfacesToRemove.forEach(interfaceName => {
    const interfaceRegex = new RegExp(
      `^\\s*(?:export\\s+)?interface\\s+${interfaceName}\\s*{[^}]*}\\s*$`, 
      'gm'
    );
    if (interfaceRegex.test(content)) {
      content = content.replace(interfaceRegex, '');
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    return true;
  }
  
  return false;
}

console.log('🚀 Applying modern React Query TypeScript patterns...\n');

let totalFixed = 0;
targetFiles.forEach(file => {
  const fixed = fixFile(file);
  if (fixed) {
    console.log(`✅ Fixed ${path.basename(file)}`);
    totalFixed++;
  } else {
    console.log(`✓  ${path.basename(file)} - No changes needed`);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files!`);
console.log('\n📝 Next steps:');
console.log('1. Run: npx tsc --noEmit 2>&1 | grep "error TS" | wc -l');
console.log('2. Check for remaining errors and fix manually');
console.log('3. Update TYPESCRIPT_MIGRATION_GUIDE.md with new learnings');