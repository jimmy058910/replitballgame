import { execSync } from 'child_process';

// Use tsx to run TypeScript with proper async handling
const script = `
(async () => {
  try {
    const { dailyTournamentAutoFillService } = await import('./server/services/dailyTournamentAutoFillService.js');
    console.log('🚀 Starting manual auto-fill for tournament 2...');
    await dailyTournamentAutoFillService.manualTriggerAutoFill(2);
    console.log('✅ Auto-fill completed successfully!');
  } catch (error) {
    console.error('❌ Auto-fill failed:', error);
    process.exit(1);
  }
})();
`;

try {
  console.log('🧪 Triggering manual auto-fill...');
  const result = execSync(`npx tsx -e "${script}"`, { 
    encoding: 'utf8', 
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  console.log(result);
} catch (error) {
  console.error('Error output:', error.stdout || error.stderr || error.message);
}