#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Fix JSX Syntax Errors
 * Targets broken comment blocks and unclosed JSX tags
 */

const filesToFix = [
  'client/src/components/EnhancedLoadingWrapper.tsx',
  'client/src/components/FinancialCenter.tsx',
  'client/src/components/GameSimulationUI.tsx',
  'client/src/components/LiveMatchSimulation.tsx',
  'client/src/components/PlayerSkillsManager.tsx',
  'client/src/components/QuickStatsBar.tsx',
  'client/src/components/WebSocketTestPage.tsx',
  'client/src/pages/Inventory.tsx',
  'client/src/pages/Team.tsx'
];

let totalFixes = 0;

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix broken comment blocks in JSX
  // Pattern 1: {/* without closing */}
  content = content.replace(/\{\/\*(?![\s\S]*?\*\/})/g, '{/* ');
  
  // Pattern 2: Unclosed comment that starts properly but doesn't end
  const lines = content.split('\n');
  let inComment = false;
  let commentStartLine = -1;
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for comment start
    if (line.includes('{/*') && !line.includes('*/}')) {
      inComment = true;
      commentStartLine = i;
    }
    
    // Check for comment end
    if (inComment && line.includes('*/}')) {
      inComment = false;
      commentStartLine = -1;
    }
    
    // If we're in a comment and see JSX tags, close the comment
    if (inComment && (line.includes('</') || line.includes('/>'))) {
      // Insert comment close before this line
      if (i > 0 && !lines[i-1].includes('*/}')) {
        fixedLines[fixedLines.length - 1] += ' */}';
        inComment = false;
        commentStartLine = -1;
      }
    }
    
    fixedLines.push(line);
  }
  
  // If comment is still open at end of file, close it
  if (inComment && commentStartLine >= 0) {
    fixedLines[fixedLines.length - 1] += ' */}';
  }
  
  content = fixedLines.join('\n');
  
  // Fix specific known issues in Team.tsx
  if (file.includes('Team.tsx')) {
    // Fix the broken comment block around line 417-418
    content = content.replace(
      /\{\s*\/\*\s*\n\s*\{playersWithRoles/g,
      '{/* */}\n                          {playersWithRoles'
    );
    
    // Fix the broken comment around line 426
    content = content.replace(
      /\{\s*\/\*\s*\n\s*\{playersWithRoles\.map/g,
      '{/* */}\n                        {playersWithRoles.map'
    );
  }
  
  // Fix specific known issues in Inventory.tsx
  if (file.includes('Inventory.tsx')) {
    // Look for unclosed div tags and ensure they're closed
    const divOpenCount = (content.match(/<div[^>]*>/g) || []).length;
    const divCloseCount = (content.match(/<\/div>/g) || []).length;
    
    if (divOpenCount > divCloseCount) {
      // Add missing closing divs at the end of component
      const missingDivs = divOpenCount - divCloseCount;
      content = content.replace(/\n\s*export default/, '\n' + '</div>'.repeat(missingDivs) + '\nexport default');
    }
  }
  
  // Only write if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixes++;
  }
});

console.log(`\n📊 Total files fixed: ${totalFixes}`);
console.log('🔍 Run "npx tsc --noEmit" to check remaining errors');