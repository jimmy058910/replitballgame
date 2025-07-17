// Script to manually start tournament matches for #0851
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function startTournamentMatches() {
  try {
    console.log('Starting tournament #0851 quarterfinal matches...');
    
    // Get all IN_PROGRESS matches for tournament 5
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: 5,
        round: 1,
        status: 'IN_PROGRESS'
      }
    });
    
    console.log(`Found ${matches.length} matches to start`);
    
    // Import matchStateManager and start live simulation
    const { matchStateManager } = await import('./server/services/matchStateManager.js');
    
    for (const match of matches) {
      try {
        console.log(`Starting live simulation for match ${match.id}...`);
        await matchStateManager.startLiveMatch(match.id.toString());
        console.log(`✓ Match ${match.id} started successfully`);
      } catch (error) {
        console.error(`✗ Error starting match ${match.id}:`, error.message);
      }
    }
    
    console.log('Tournament quarterfinals started!');
    process.exit(0);
  } catch (error) {
    console.error('Error starting tournament matches:', error);
    process.exit(1);
  }
}

startTournamentMatches();