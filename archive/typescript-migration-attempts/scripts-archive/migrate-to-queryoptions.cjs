#!/usr/bin/env node
/**
 * Migrate Components to QueryOptions Pattern
 * Based on 2025 best practices for TanStack Query v5
 */

const fs = require('fs');
const path = require('path');

// Components to migrate
const COMPONENTS_TO_MIGRATE = [
  'client/src/components/TapToAssignTactics.tsx',
  'client/src/components/TacticalFormationMobile.tsx',
  'client/src/components/TextTacticalManager.tsx',
  'client/src/components/StatsDisplay.tsx'
];

// Migration patterns
const MIGRATION_PATTERNS = [
  // Pattern 1: useQuery with inline queryFn
  {
    pattern: /const\s*{\s*data:\s*(\w+)[^}]*}\s*=\s*useQuery\s*\(\s*{\s*queryKey:\s*\[(.*?)\],?\s*queryFn:\s*\(\)\s*=>\s*apiRequest\((.*?)\)/gs,
    replacement: (match, dataName, queryKey, apiPath) => {
      // Determine which query factory to use based on the API path
      let queryFactory = 'teamQueries.myTeam()';
      
      if (apiPath.includes('/api/teams/my')) {
        queryFactory = 'teamQueries.myTeam()';
      } else if (apiPath.includes('/api/teams/') && apiPath.includes('/finances')) {
        queryFactory = `teamQueries.finances(teamId)`;
      } else if (apiPath.includes('/api/teams/') && apiPath.includes('/players')) {
        queryFactory = `teamQueries.players(teamId)`;
      } else if (apiPath.includes('/api/stats/')) {
        queryFactory = `statsQueries.playerStats(playerId)`;
      } else if (apiPath.includes('/api/notifications')) {
        queryFactory = `notificationQueries.all()`;
      }
      
      return `const { data: ${dataName} } = useQuery(${queryFactory})`;
    }
  },
  
  // Pattern 2: Add type annotations to empty objects
  {
    pattern: /const\s*{\s*data:\s*(\w+)\s*}\s*=\s*useQuery<{}>/g,
    replacement: 'const { data: $1 } = useQuery<Team | undefined>'
  },
  
  // Pattern 3: Fix property access on potentially undefined data
  {
    pattern: /(\w+)\.currentDay/g,
    replacement: '$1?.currentDay'
  },
  {
    pattern: /(\w+)\.tacticalFocus/g,
    replacement: '$1?.tacticalFocus'
  },
  {
    pattern: /(\w+)\.fieldSize/g,
    replacement: '$1?.fieldSize'
  }
];

// Add necessary imports
function addQueryImports(content) {
  // Check if imports already exist
  if (content.includes('import { teamQueries')) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import .* from .*$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    const imports = `
import { teamQueries, playerQueries, statsQueries, notificationQueries } from '@/lib/api/queries';
import type { Team, Player, Staff, TeamFinances } from '@shared/types/models';`;
    
    content = content.slice(0, insertPos) + imports + content.slice(insertPos);
  }
  
  return content;
}

// Process each component
console.log('🔄 Migrating components to QueryOptions pattern...\n');

let totalMigrated = 0;
COMPONENTS_TO_MIGRATE.forEach(componentPath => {
  const fullPath = path.join(process.cwd(), componentPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${componentPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Apply migration patterns
  MIGRATION_PATTERNS.forEach(({ pattern, replacement }) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  // Add imports if needed
  if (modified && !content.includes('@/lib/api/queries')) {
    content = addQueryImports(content);
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Migrated: ${path.basename(componentPath)}`);
    totalMigrated++;
  } else {
    console.log(`⏭️  Skipped: ${path.basename(componentPath)} (no changes needed)`);
  }
});

console.log(`\n🎉 Migrated ${totalMigrated} components!`);

// Re-run TypeScript check
console.log('\n📊 New error count:');
const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
} catch (e) {
  // Expected to fail, just want the count
}