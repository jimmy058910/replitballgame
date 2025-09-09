const fs = require('fs');
const path = require('path');

// Clean up extra closing tags added by the previous script
console.log('🧹 Cleaning up extra closing tags...\n');

const filesToClean = [
  'client/src/components/LiveMatchSimulation.tsx',
  'client/src/components/LineupRosterBoard.tsx',
  'client/src/components/GameSimulationUI.tsx',
  'client/src/components/ErrorBoundary.tsx',
  'client/src/components/EnhancedMarketplace.tsx',
  'client/src/components/ContractManagement.tsx',
  'client/src/components/AgingManager.tsx',
  'server/utils/teamStatisticsCalculator.ts'
];

filesToClean.forEach(relativePath => {
  const filePath = path.join(process.cwd(), relativePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${relativePath}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove lines that are just closing tags without opening tags
    const lines = content.split('\n');
    const cleanedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip lines that are just closing JSX/HTML tags at the end of the file
      if (i === lines.length - 1 && line.match(/^<\/[A-Za-z]+>$/)) {
        continue;
      }
      
      // Skip lines with just closing tags after the main export/function end
      if (line.match(/^<\/[A-Za-z]+>$/) && i > 0 && lines[i-1].includes('}')) {
        continue;
      }
      
      // Skip "No newline at end of file" markers
      if (line.includes('No newline at end of file')) {
        continue;
      }
      
      cleanedLines.push(line);
    }
    
    // Remove duplicate closing braces at the end
    while (cleanedLines.length > 0) {
      const lastLine = cleanedLines[cleanedLines.length - 1].trim();
      if (lastLine.match(/^<\/[A-Za-z]+>$/) || lastLine === '') {
        cleanedLines.pop();
      } else {
        break;
      }
    }
    
    const cleaned = cleanedLines.join('\n');
    
    if (cleaned !== content) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`✅ Cleaned: ${relativePath}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${relativePath}:`, error.message);
  }
});

console.log('\n✅ Cleanup complete!');