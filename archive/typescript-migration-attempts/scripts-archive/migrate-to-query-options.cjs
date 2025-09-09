#!/usr/bin/env node
/**
 * Migrate components to use queryOptions pattern (2025 best practice)
 * This provides better type safety and code reusability
 */

const fs = require('fs');
const path = require('path');

// Map of old query patterns to new queryOptions imports
const queryMappings = [
  {
    pattern: /useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/teams\/my['"`]\]/g,
    replacement: 'useQuery(teamQueries.myTeam())',
    import: 'teamQueries'
  },
  {
    pattern: /useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/players['"`]\]/g,
    replacement: 'useQuery(playerQueries.all())',
    import: 'playerQueries'
  },
  {
    pattern: /useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/leagues['"`]\]/g,
    replacement: 'useQuery(leagueQueries.all())',
    import: 'leagueQueries'
  },
  {
    pattern: /useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/notifications['"`]\]/g,
    replacement: 'useQuery(notificationQueries.all())',
    import: 'notificationQueries'
  },
  {
    pattern: /useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/matches\/live['"`]\]/g,
    replacement: 'useQuery(matchQueries.live())',
    import: 'matchQueries'
  },
];

function migrateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'File not found' };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const neededImports = new Set();
  
  // Step 1: Identify which query patterns are used
  queryMappings.forEach(({ pattern, replacement, import: importName }) => {
    if (pattern.test(content)) {
      neededImports.add(importName);
      
      // For now, just mark as needing migration
      // Full replacement would need more complex parsing
      modified = true;
    }
  });
  
  if (neededImports.size === 0) {
    return { success: false, reason: 'No queries to migrate' };
  }
  
  // Step 2: Add the queryOptions import
  const queryImports = Array.from(neededImports).join(', ');
  const importStatement = `import { ${queryImports} } from '@/lib/api/queries';`;
  
  // Find where to insert the import (after other imports)
  const importRegex = /^import .* from .*$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch && !content.includes('@/lib/api/queries')) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    content = content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
    modified = true;
  }
  
  // Step 3: Simple replacements for basic patterns
  // This is a simplified version - a full migration would need AST parsing
  
  // Replace simple my team queries
  content = content.replace(
    /const\s*{\s*data:\s*(\w+)[^}]*}\s*=\s*useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/teams\/my['"`]\][^}]*}/g,
    'const { data: $1 } = useQuery(teamQueries.myTeam())'
  );
  
  // Replace simple player queries
  content = content.replace(
    /const\s*{\s*data:\s*(\w+)[^}]*}\s*=\s*useQuery[^{]*{\s*queryKey:\s*\[['"`]\/api\/players['"`]\][^}]*}/g,
    'const { data: $1 } = useQuery(playerQueries.all())'
  );
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return { success: true };
  }
  
  return { success: false, reason: 'No changes made' };
}

// Target files for migration
const targetFiles = [
  'client/src/components/EnhancedDashboard.tsx',
  'client/src/components/QuickStatsBar.tsx',
  'client/src/components/FinancesTab.tsx',
  'client/src/components/TeamInfoDialog.tsx',
  'client/src/components/StaffManagement.tsx',
  'client/src/components/PlayerSkillsManager.tsx',
  'client/src/pages/Dashboard.tsx',
  'client/src/pages/Team.tsx',
];

console.log('🚀 Migrating to queryOptions pattern (2025 best practice)...\n');

let successCount = 0;
targetFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  const result = migrateFile(fullPath);
  
  if (result.success) {
    console.log(`✅ Migrated ${path.basename(file)}`);
    successCount++;
  } else {
    console.log(`✓  ${path.basename(file)} - ${result.reason}`);
  }
});

console.log(`\n🎉 Migrated ${successCount} files to queryOptions pattern!`);
console.log('\n📝 Note: This is a partial migration. Complex queries with parameters');
console.log('will need manual migration to use the parameterized queryOptions.');
console.log('\nExample for parameterized queries:');
console.log('  const { data } = useQuery(teamQueries.byId(teamId))');
console.log('\nRun: npx tsc --noEmit 2>&1 | grep "error TS" | wc -l');
console.log('to check the new error count.');