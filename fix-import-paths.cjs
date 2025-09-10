const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing import paths systematically based on actual directory structure...');

// Define the correct import paths based on actual directory structure
const importFixes = [
  // Services directory (same level as loggingService.ts)
  {
    directory: 'server/services',
    files: [
      'enhancedSimulationEngine.ts',
      'quickMatchSimulation.ts', 
      'enhancedEconomyService.ts',
      'enhancedTeamManagementService.ts',
      'enhancedStatisticsService.ts',
      'enhancedGameEconomyService.ts',
      'tournamentService.ts',
      'seasonTimingAutomationService.ts',
      'seasonalFlowService.ts'
    ],
    correctImport: "import { logger } from './loggingService.js';"
  },
  
  // DataAccess directory (one level up from services)
  {
    directory: 'server/dataAccess',
    files: [
      'enhancedTournamentDataAccess.ts',
      'enhancedMarketplaceDataAccess.ts'
    ],
    correctImport: "import { logger } from '../services/loggingService.js';"
  },
  
  // Routes subdirectories (two levels up from services) 
  {
    directory: 'server/routes/finance',
    files: [
      'financeAdminRoutes.ts',
      'financeReportsRoutes.ts', 
      'financePaymentsRoutes.ts',
      'financeTransactionsRoutes.ts'
    ],
    correctImport: "import { logger } from '../../services/loggingService.js';"
  },
  
  {
    directory: 'server/routes/tournaments',
    files: [
      'tournamentAdminRoutes.ts',
      'tournamentRewardsRoutes.ts',
      'tournamentMatchesRoutes.ts', 
      'tournamentRegistrationRoutes.ts'
    ],
    correctImport: "import { logger } from '../../services/loggingService.js';"
  },
  
  {
    directory: 'server/routes/leagues',
    files: [
      'leagueAdminRoutes.ts',
      'leagueScheduleRoutes.ts',
      'leagueTeamsRoutes.ts', 
      'leagueStandingsRoutes.ts'
    ],
    correctImport: "import { logger } from '../../services/loggingService.js';"
  },
  
  {
    directory: 'server/routes/teams',
    files: [
      'teamAdminRoutes.ts'
    ],
    correctImport: "import { logger } from '../../services/loggingService.js';"
  },
  
  // Services subdirectories (one level down from services)
  {
    directory: 'server/services/automation',
    files: [
      'tournamentAutomationService.ts',
      'matchSimulationService.ts',
      'dailyProgressionService.ts'
    ],
    correctImport: "import { logger } from '../loggingService.js';"
  },
  
  {
    directory: 'server/services/seasonal',
    files: [
      'seasonManagementService.ts',
      'promotionRelegationService.ts',
      'playoffService.ts',
      'scheduleGenerationService.ts'
    ],
    correctImport: "import { logger } from '../loggingService.js';"
  }
];

let totalFixed = 0;
let totalErrors = 0;

importFixes.forEach(group => {
  console.log(`\n📁 Processing directory: ${group.directory}`);
  
  group.files.forEach(fileName => {
    const filePath = path.join(__dirname, group.directory, fileName);
    
    try {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace any existing logger import with the correct one
        const originalContent = content;
        content = content.replace(
          /import\s*{\s*logger\s*}\s*from\s*['"][^'"]*loggingService\.js['"];?\s*/g,
          group.correctImport + '\n'
        );
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✅ Fixed: ${fileName}`);
          totalFixed++;
        } else {
          console.log(`  ℹ️  No changes needed: ${fileName}`);
        }
      } else {
        console.log(`  ⚠️  File not found: ${fileName}`);
      }
    } catch (error) {
      console.error(`  ❌ Error fixing ${fileName}:`, error.message);
      totalErrors++;
    }
  });
});

console.log(`\n📊 Summary:`);
console.log(`✅ Files fixed: ${totalFixed}`);
console.log(`❌ Errors: ${totalErrors}`);
console.log('🎉 Import path corrections completed!');