#!/usr/bin/env node
/**
 * Fix Duplicate Import Declarations
 * Comprehensive fix for conflicting imports and duplicate declarations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes
let filesFixed = 0;
let duplicatesFixed = 0;

function fixDuplicateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const lines = content.split('\n');
  const imports = new Map();
  const importIndices = [];
  
  // Parse all imports
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Match import statements
    const importMatch = trimmed.match(/^import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/);
    if (importMatch) {
      const [, namedImports, source] = importMatch;
      const isTypeImport = trimmed.includes('import type');
      
      importIndices.push(index);
      
      if (!imports.has(source)) {
        imports.set(source, { 
          types: new Set(), 
          values: new Set(), 
          indices: [],
          hasTypeImport: false,
          hasValueImport: false
        });
      }
      
      const sourceImports = imports.get(source);
      sourceImports.indices.push(index);
      
      // Parse named imports
      const names = namedImports.split(',').map(n => n.trim());
      names.forEach(name => {
        if (isTypeImport) {
          sourceImports.types.add(name);
          sourceImports.hasTypeImport = true;
        } else {
          sourceImports.values.add(name);
          sourceImports.hasValueImport = true;
        }
      });
    }
  });
  
  // Check for duplicates and conflicts
  const newLines = [...lines];
  const linesToRemove = new Set();
  
  imports.forEach((sourceImports, source) => {
    if (sourceImports.indices.length > 1) {
      // Multiple imports from same source
      duplicatesFixed++;
      modified = true;
      
      // Mark all but the first for removal
      sourceImports.indices.slice(1).forEach(idx => {
        linesToRemove.add(idx);
      });
      
      // Build consolidated import
      const allTypes = Array.from(sourceImports.types);
      const allValues = Array.from(sourceImports.values);
      
      let consolidatedImport = '';
      if (allTypes.length > 0 && allValues.length > 0) {
        // Mixed type and value imports
        consolidatedImport = `import type { ${allTypes.join(', ')} } from '${source}';\nimport { ${allValues.join(', ')} } from '${source}';`;
      } else if (allTypes.length > 0) {
        // Only type imports
        consolidatedImport = `import type { ${allTypes.join(', ')} } from '${source}';`;
      } else {
        // Only value imports
        consolidatedImport = `import { ${allValues.join(', ')} } from '${source}';`;
      }
      
      // Replace first import with consolidated version
      const firstIdx = sourceImports.indices[0];
      if (consolidatedImport.includes('\n')) {
        // Split into multiple lines
        const [firstLine, secondLine] = consolidatedImport.split('\n');
        newLines[firstIdx] = firstLine;
        newLines.splice(firstIdx + 1, 0, secondLine);
      } else {
        newLines[firstIdx] = consolidatedImport;
      }
    }
  });
  
  // Remove marked lines (in reverse order to maintain indices)
  const sortedLinesToRemove = Array.from(linesToRemove).sort((a, b) => b - a);
  sortedLinesToRemove.forEach(idx => {
    newLines.splice(idx, 1);
  });
  
  if (modified) {
    content = newLines.join('\n');
  }
  
  // Fix specific conflicts reported in errors
  
  // Fix Team conflict in ComprehensiveCompetitionCenter
  if (filePath.includes('ComprehensiveCompetitionCenter')) {
    // Remove local Team interface if it conflicts with imported one
    const teamInterfaceMatch = content.match(/interface\s+Team\s*\{[^}]*\}/);
    if (teamInterfaceMatch) {
      content = content.replace(teamInterfaceMatch[0], '// Team interface removed - using imported type');
      modified = true;
      duplicatesFixed++;
    }
  }
  
  // Fix Contract conflict in EnhancedFinancesTab
  if (filePath.includes('EnhancedFinancesTab')) {
    const contractInterfaceMatch = content.match(/interface\s+Contract\s*\{[^}]*\}/);
    if (contractInterfaceMatch) {
      content = content.replace(contractInterfaceMatch[0], '// Contract interface removed - using imported type');
      modified = true;
      duplicatesFixed++;
    }
  }
  
  // Fix MarketplaceListing conflict in EnhancedMarketplace
  if (filePath.includes('EnhancedMarketplace')) {
    const listingInterfaceMatch = content.match(/interface\s+MarketplaceListing\s*\{[^}]*\}/);
    if (listingInterfaceMatch) {
      content = content.replace(listingInterfaceMatch[0], '// MarketplaceListing interface removed - using imported type');
      modified = true;
      duplicatesFixed++;
    }
  }
  
  return { content, modified };
}

// Get files with duplicate import errors
function findDuplicateImportFiles() {
  const affected = [];
  
  try {
    const result = execSync(
      'npx tsc --noEmit 2>&1 | grep "conflicts with local declaration" | cut -d"(" -f1 | sort -u',
      { encoding: 'utf8' }
    );
    
    const files = result.split('\n').filter(f => f.trim());
    affected.push(...files);
  } catch (e) {
    // Expected to fail but we get the output
    if (e.stdout) {
      const files = e.stdout.split('\\n')
        .filter(line => line.includes('conflicts with local declaration'))
        .map(line => line.split('(')[0])
        .filter(f => f.trim());
      affected.push(...files);
    }
  }
  
  // Add known problem files
  affected.push(
    'client/src/components/ComprehensiveCompetitionCenter.tsx',
    'client/src/components/EnhancedFinancesTab.tsx',
    'client/src/components/EnhancedMarketplace.tsx'
  );
  
  return [...new Set(affected)];
}

// Main execution
console.log('🔧 Fixing Duplicate Import Declarations\\n');

const affectedFiles = findDuplicateImportFiles();
console.log(`📂 Checking ${affectedFiles.length} files for duplicate imports...\\n`);

affectedFiles.forEach(filePath => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  try {
    const result = fixDuplicateImports(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      filesFixed++;
      console.log(`  ✅ Fixed: ${path.basename(fullPath)}`);
    } else {
      console.log(`  ⏭️ No changes needed: ${path.basename(fullPath)}`);
    }
  } catch (err) {
    console.log(`  ❌ Error processing ${path.basename(fullPath)}: ${err.message}`);
  }
});

// Report results
console.log('\\n📊 Results:');
console.log(`  ✅ Files fixed: ${filesFixed}`);
console.log(`  🔧 Duplicates fixed: ${duplicatesFixed}`);

// Check new error count
console.log('\\n📈 Checking new error count...');
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