// Manual tournament start script
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function startTournamentRound() {
  try {
    console.log('Manually starting tournament 5, round 1...');
    
    // Import and call the tournament flow service method
    const { tournamentFlowService } = await import('./server/services/tournamentFlowService.js');
    
    // Manually trigger the tournament round
    await tournamentFlowService.manuallyStartTournamentRound(5, 1);
    
    console.log('Tournament round started successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error starting tournament round:', error);
    process.exit(1);
  }
}

startTournamentRound();