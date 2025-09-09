#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Files with syntax errors to fix
const filesToFix = [
  'client/src/components/LineupRosterBoard.tsx',
  'client/src/components/QuickStatsBar.tsx'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${filePath} not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix the broken return statements
  // Pattern: "return response as \n    },;$2" should be "return response as Type;\n    },"
  content = content.replace(/return response as\s*\n\s*\},;\$2/g, (match, offset) => {
    // Determine the type based on context
    const before = content.substring(Math.max(0, offset - 200), offset);
    
    if (before.includes('/players')) {
      return 'return response as Player[];\n    },';
    } else if (before.includes('/teams') && !before.includes('/players')) {
      return 'return response as Team;\n    },';
    } else if (before.includes('/finances')) {
      return 'return response as TeamFinances;\n    },';
    } else if (before.includes('/staff')) {
      return 'return response as Staff[];\n    },';
    } else if (before.includes('/stadium')) {
      return 'return response as Stadium;\n    },';
    } else {
      return 'return response;\n    },';
    }
  });
  
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Fixed ${path.basename(filePath)}`);
});

console.log('\n🎉 Syntax fixes complete!');