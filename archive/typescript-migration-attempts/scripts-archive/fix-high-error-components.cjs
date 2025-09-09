#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Components to fix with their import needs
const componentsToFix = [
  {
    file: 'QuickStatsBar.tsx',
    imports: ['Player', 'Team', 'Staff', 'Contract', 'TeamFinances', 'Stadium']
  },
  {
    file: 'StatsDisplay.tsx', 
    imports: ['Player', 'Team', 'PlayerMatchStats', 'TeamMatchStats']
  },
  {
    file: 'TapToAssignTactics.tsx',
    imports: ['Player', 'Team', 'Staff']
  },
  {
    file: 'TacticalFormationMobile.tsx',
    imports: ['Player', 'Team']
  },
  {
    file: 'TextTacticalManager.tsx',
    imports: ['Player', 'Team']
  },
  {
    file: 'EnhancedMarketplace.tsx',
    imports: ['Player', 'Team', 'MarketplaceListing', 'MarketplaceBid']
  },
  {
    file: 'StaffManagement.tsx',
    imports: ['Team', 'Staff', 'Contract']
  },
  {
    file: 'LineupRosterBoard.tsx',
    imports: ['Player', 'Team']
  }
];

const componentsDir = path.join(__dirname, 'client', 'src', 'components');

componentsToFix.forEach(({ file, imports }) => {
  const filePath = path.join(componentsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file already has shared/types/models import
  if (!content.includes('@shared/types/models')) {
    // Add the import at the top of the file after other imports
    const importStatement = `import type { ${imports.join(', ')} } from '@shared/types/models';\n`;
    
    // Find the last import statement
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
    } else {
      // No imports found, add at the beginning
      content = importStatement + '\n' + content;
      modified = true;
    }
  } else {
    // Update existing import to include all needed types
    const currentImportRegex = /import type \{([^}]+)\} from '@shared\/types\/models';/;
    const currentMatch = content.match(currentImportRegex);
    
    if (currentMatch) {
      const currentImports = currentMatch[1].split(',').map(s => s.trim());
      const allImports = [...new Set([...currentImports, ...imports])];
      const newImportStatement = `import type { ${allImports.join(', ')} } from '@shared/types/models';`;
      content = content.replace(currentImportRegex, newImportStatement);
      modified = true;
    }
  }
  
  // Fix common query patterns - add type assertions
  content = content.replace(
    /useQuery\s*<([^,>]+),\s*Error\s*>\s*\(/g,
    'useQuery<$1>('
  );
  
  content = content.replace(
    /return response;(\s*\n\s*}\s*,)/g,
    'return response as $1;$2'
  );
  
  // Remove duplicate interface definitions that are now in shared types
  const interfacesToRemove = [
    'Player', 'Team', 'Staff', 'Contract', 'Stadium', 
    'TeamFinances', 'MarketplaceListing', 'MarketplaceBid',
    'PlayerMatchStats', 'TeamMatchStats'
  ];
  
  interfacesToRemove.forEach(interfaceName => {
    // Remove interface definitions
    const interfaceRegex = new RegExp(`^\\s*(?:export\\s+)?interface\\s+${interfaceName}\\s*\\{[^}]*\\}\\s*$`, 'gm');
    if (interfaceRegex.test(content)) {
      content = content.replace(interfaceRegex, '');
      modified = true;
    }
    
    // Remove type definitions
    const typeRegex = new RegExp(`^\\s*(?:export\\s+)?type\\s+${interfaceName}\\s*=\\s*\\{[^}]*\\}\\s*;?\\s*$`, 'gm');
    if (typeRegex.test(content)) {
      content = content.replace(typeRegex, '');
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`✓  ${file} - No changes needed`);
  }
});

console.log('\n🎉 Component fixes complete!');