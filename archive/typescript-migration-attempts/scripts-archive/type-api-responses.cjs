#!/usr/bin/env node

/**
 * Type API responses to fix TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files that were modified and need API typing
const filesToFix = [
  'client/src/components/ConsumableManager.tsx',
  'client/src/components/EnhancedDashboard.tsx',
  'client/src/components/TeamInfoDialog.tsx',
  'client/src/components/FinancesTab.tsx',
  'client/src/components/FinancialCenter.tsx',
  'client/src/components/InjuryStaminaManager.tsx',
  'client/src/components/LineupRosterBoard.tsx',
  'client/src/components/LeagueStandings.tsx',
  'client/src/components/QuickStatsBar.tsx',
  'client/src/components/StaffManagement.tsx',
  'client/src/components/TacticsLineupHub.tsx',
  'client/src/components/TaxiSquadManager.tsx',
  'client/src/components/PlayerSkillsManager.tsx',
  'client/src/components/TryoutSystem.tsx',
  'client/src/components/UnifiedInventoryHub.tsx',
  'client/src/components/UnifiedTeamChemistry.tsx',
  'client/src/components/CamaraderieManagement.tsx',
  'client/src/components/LiveMatchSimulation.tsx',
  'client/src/components/DramaticTeamHQ.tsx',
  'client/src/components/TextTacticalManager.tsx',
  'client/src/components/TacticalFormationMobile.tsx',
  'client/src/components/NewNavigation.tsx',
  'client/src/components/ModernStickyHeader.tsx'
];

let totalFixed = 0;
let filesModified = 0;

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`⚠ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Pattern 1: Type team queries
  content = content.replace(
    /const\s+{\s*data:\s*team[^}]*}\s*=\s*useQuery\({\s*queryKey:\s*\[["']\/api\/teams\/my["']\]/g,
    'const { data: team } = useQuery<Team>({ queryKey: ["/api/teams/my"]'
  );
  
  // Pattern 2: Type player queries
  content = content.replace(
    /const\s+{\s*data:\s*players[^}]*}\s*=\s*useQuery\({\s*queryKey:\s*\[["']\/api\/.*players["']\]/g,
    'const { data: players } = useQuery<Player[]>({ queryKey: ["/api/players"]'
  );
  
  // Pattern 3: Add type assertion for API responses in queryFn
  const queryFnPattern = /queryFn:\s*\(\)\s*=>\s*apiRequest\(([^)]+)\)/g;
  content = content.replace(queryFnPattern, (match, args) => {
    // Don't double-type if already typed
    if (match.includes(' as ')) return match;
    return `queryFn: async () => {
      const response = await apiRequest(${args});
      return response;
    }`;
  });
  
  // Pattern 4: Type notification queries
  content = content.replace(
    /const\s+{\s*data:\s*notifications[^}]*}\s*=\s*useQuery\(/g,
    'const { data: notifications } = useQuery<Notification[]>('
  );
  
  // Pattern 5: Remove unnecessary @ts-expect-error comments for typed data
  content = content.replace(
    /\/\/\s*@ts-expect-error\s+TS2339.*\n\s*(team|players|notifications|finances)\??\./g,
    '$1?.'
  );
  
  // Pattern 6: Fix team.finances access
  content = content.replace(
    /team\?\.finances/g,
    '(team as TeamWithFinances)?.finances'
  );
  
  // Check if imports need updating
  if (content !== originalContent) {
    // Ensure shared types import exists
    if (!content.includes('@shared/types/models')) {
      // Add after last import
      const lastImportMatch = content.match(/^import[^;]+;$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const insertPosition = content.indexOf(lastImport) + lastImport.length;
        const importStatement = "\nimport type { Player, Team, Staff, Contract, Notification, TeamWithFinances } from '@shared/types/models';";
        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
      }
    }
    
    fs.writeFileSync(file, content);
    filesModified++;
    console.log(`✓ Fixed ${file}`);
    modified = true;
  }
});

console.log('='.repeat(60));
console.log('API Response Typing Complete');
console.log('='.repeat(60));
console.log(`Files modified: ${filesModified}`);
console.log();
console.log('Next steps:');
console.log('1. Run: npm run check:errors');
console.log('2. Manually fix any remaining complex typing issues');
console.log('3. Look for patterns in remaining errors');