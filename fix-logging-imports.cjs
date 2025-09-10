const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files with LoggingService imports
const files = [
  'server\\dataAccess\\enhancedTournamentDataAccess.ts',
  'server\\dataAccess\\enhancedMarketplaceDataAccess.ts',
  'server\\services\\enhancedSimulationEngine.ts',
  'server\\services\\quickMatchSimulation.ts',
  'server\\services\\enhancedEconomyService.ts',
  'server\\services\\enhancedTeamManagementService.ts',
  'server\\services\\enhancedStatisticsService.ts',
  'server\\services\\enhancedGameEconomyService.ts',
  'server\\routes\\finance\\financeAdminRoutes.ts',
  'server\\routes\\finance\\financeReportsRoutes.ts',
  'server\\routes\\finance\\financePaymentsRoutes.ts',
  'server\\routes\\finance\\financeTransactionsRoutes.ts',
  'server\\services\\tournamentService.ts',
  'server\\routes\\tournaments\\tournamentAdminRoutes.ts',
  'server\\routes\\tournaments\\tournamentRewardsRoutes.ts',
  'server\\routes\\tournaments\\tournamentMatchesRoutes.ts',
  'server\\routes\\tournaments\\tournamentRegistrationRoutes.ts',
  'server\\services\\seasonTimingAutomationService.ts',
  'server\\services\\automation\\tournamentAutomationService.ts',
  'server\\services\\automation\\matchSimulationService.ts',
  'server\\services\\automation\\dailyProgressionService.ts',
  'server\\services\\seasonalFlowService.ts',
  'server\\services\\seasonal\\seasonManagementService.ts',
  'server\\services\\seasonal\\promotionRelegationService.ts',
  'server\\services\\seasonal\\playoffService.ts',
  'server\\services\\seasonal\\scheduleGenerationService.ts',
  'server\\routes\\leagues\\leagueAdminRoutes.ts',
  'server\\routes\\leagues\\leagueScheduleRoutes.ts',
  'server\\routes\\leagues\\leagueTeamsRoutes.ts',
  'server\\routes\\leagues\\leagueStandingsRoutes.ts',
  'server\\routes\\teams\\teamAdminRoutes.ts'
];

console.log('Starting logging service import fixes...');

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace import statement
      content = content.replace(
        /import\s*{\s*LoggingService\s*}\s*from\s*['"][^'"]*loggingService\.js['"];?/g,
        "import { logger } from '../../services/loggingService.js';"
      );
      
      // For files in deeper directories, adjust path
      if (file.includes('finance\\') || file.includes('tournaments\\') || file.includes('automation\\') || file.includes('seasonal\\') || file.includes('leagues\\') || file.includes('teams\\')) {
        content = content.replace(
          "import { logger } from '../../services/loggingService.js';",
          "import { logger } from '../../../services/loggingService.js';"
        );
      }
      if (file.includes('dataAccess\\')) {
        content = content.replace(
          "import { logger } from '../../services/loggingService.js';",
          "import { logger } from '../services/loggingService.js';"
        );
      }
      
      // Replace all LoggingService usage with logger
      content = content.replace(/LoggingService\./g, 'logger.');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log('✅ All logging service imports fixed!');