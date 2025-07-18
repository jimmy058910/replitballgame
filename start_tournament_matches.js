import { matchStateManager } from './server/services/matchStateManager.ts';
import { prisma } from './server/db.ts';

async function startTournamentMatches() {
  try {
    console.log('Starting tournament matches...');
    
    // Get all tournament matches that are IN_PROGRESS but not started
    const matches = await prisma.game.findMany({
      where: {
        tournamentId: 8,
        status: 'IN_PROGRESS'
      }
    });

    console.log(`Found ${matches.length} tournament matches to start`);

    for (const match of matches) {
      try {
        console.log(`Starting match ${match.id}: ${match.homeTeamId} vs ${match.awayTeamId}`);
        await matchStateManager.startLiveMatch(match.id.toString(), false);
        console.log(`✅ Started match ${match.id}`);
      } catch (error) {
        console.error(`❌ Error starting match ${match.id}:`, error);
      }
    }

    console.log('Tournament match start process completed');
  } catch (error) {
    console.error('Error in tournament match start process:', error);
  } finally {
    process.exit(0);
  }
}

startTournamentMatches();