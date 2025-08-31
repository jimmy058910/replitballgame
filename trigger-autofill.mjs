import { execSync } from 'child_process';

try {
  console.log('🧪 Triggering manual auto-fill for tournament 2...');
  
  // Use tsx to run TypeScript directly
  const result = execSync(`npx tsx -e "
    import { dailyTournamentAutoFillService } from './server/services/dailyTournamentAutoFillService.js';
    console.log('🚀 Starting manual auto-fill...');
    await dailyTournamentAutoFillService.manualTriggerAutoFill(2);
    console.log('✅ Auto-fill completed!');
  "`, { encoding: 'utf8', cwd: process.cwd() });
  
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
}