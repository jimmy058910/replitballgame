import { spawn } from 'child_process';

console.log('🚀 Starting auto-fill trigger...');

const script = `
import { dailyTournamentAutoFillService } from './server/services/dailyTournamentAutoFillService.js';
await dailyTournamentAutoFillService.manualTriggerAutoFill(2);
`;

const child = spawn('npx', ['tsx', '-e', script], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('close', (code) => {
  console.log(`\nProcess finished with code: ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});