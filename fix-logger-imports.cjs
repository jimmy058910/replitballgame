const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Logger Import Fixer for Modular Architecture
 * 
 * This script fixes ALL files that have incorrect logger imports.
 * Changes: import { logger } from '...logger.js' → import logger from '...logger.js'
 */

// Files to fix (from the comprehensive search)
const filesToFix = [
  'server/services/enhancedStatisticsService.ts',
  'server/services/quickMatchSimulation.ts',
  'server/services/seasonal/scheduleGenerationService.ts',
  'server/services/seasonal/playoffService.ts',
  'server/services/seasonal/promotionRelegationService.ts',
  'server/services/seasonal/seasonManagementService.ts',
  'server/services/automation/dailyProgressionService.ts',
  'server/services/automation/matchSimulationService.ts',
  'server/services/automation/tournamentAutomationService.ts',
  'server/routes/teams/teamAdminRoutes.ts',
  'server/routes/leagues/leagueStandingsRoutes.ts',
  'server/routes/leagues/leagueTeamsRoutes.ts',
  'server/routes/leagues/leagueScheduleRoutes.ts',
  'server/routes/leagues/leagueAdminRoutes.ts',
  'server/routes/tournaments/tournamentRegistrationRoutes.ts',
  'server/routes/tournaments/tournamentMatchesRoutes.ts',
  'server/routes/tournaments/tournamentRewardsRoutes.ts',
  'server/routes/tournaments/tournamentAdminRoutes.ts',
  'server/routes/finance/financeTransactionsRoutes.ts',
  'server/routes/finance/financePaymentsRoutes.ts',
  'server/routes/finance/financeReportsRoutes.ts',
  'server/routes/finance/financeAdminRoutes.ts',
  'server/services/seasonalFlowService.ts',
  'server/services/seasonTimingAutomationService.ts',
  'server/services/tournamentService.ts',
  'server/services/enhancedGameEconomyService.ts',
  'server/services/enhancedTeamManagementService.ts',
  'server/services/enhancedEconomyService.ts',
  'server/services/enhancedSimulationEngine.ts',
  'server/dataAccess/enhancedMarketplaceDataAccess.ts',
  'server/dataAccess/enhancedTournamentDataAccess.ts',
  'server/routes/teams/teamManagementRoutes.ts',
  'server/routes/adminRoutes.ts',
  'server/routes/teams/teamContractsRoutes.ts',
  'server/routes/teams/teamCoreRoutes.ts',
  'server/routes/teams/teamFinancesRoutes.ts',
  'server/routes/paymentRoutes.ts',
  'server/storage.ts',
  'server/routes/admin/emergencyRoutes.ts',
  'server/services/admin/adminAuthService.ts',
  'server/routes/development/devRoutes.ts',
  'server/routes/monitoringRoutes.ts'
];

function fixLoggerImports() {
  let totalFixed = 0;
  
  console.log('🔧 Starting comprehensive logger import fixes...');
  
  filesToFix.forEach(relativePath => {
    const fullPath = path.join(__dirname, relativePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File does not exist: ${relativePath}`);
        return;
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix the specific logger import pattern
      const fixedContent = content.replace(
        /import\s*{\s*logger\s*}\s*from\s*(['"].*logger\.js['"])/g,
        'import logger from $1'
      );
      
      if (fixedContent !== content) {
        fs.writeFileSync(fullPath, fixedContent);
        console.log(`✅ Fixed: ${relativePath}`);
        totalFixed++;
      } else {
        console.log(`📝 No changes needed: ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${relativePath}:`, error.message);
    }
  });
  
  console.log(`\n🎉 Logger import fixes complete!`);
  console.log(`📊 Files fixed: ${totalFixed}/${filesToFix.length}`);
  console.log(`\n✅ All files now use: import logger from 'path/logger.js'`);
  console.log(`❌ Removed pattern: import { logger } from 'path/logger.js'`);
}

// Run the fixes
fixLoggerImports();