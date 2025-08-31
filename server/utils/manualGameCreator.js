// Simple manual game creator for Tournament 2
import { getPrismaClient } from "../database.js";

async function createTournamentGames() {
  try {
    const prisma = await getPrismaClient();
    
    // Check if games already exist
    const existingGames = await prisma.game.count({
      where: { tournamentId: 2 }
    });
    
    if (existingGames > 0) {
      console.log(`Tournament 2 already has ${existingGames} games`);
      return;
    }
    
    // Get tournament teams
    const tournament = await prisma.tournament.findUnique({
      where: { id: 2 },
      include: {
        entries: {
          include: { team: true },
          orderBy: { registeredAt: 'asc' }
        }
      }
    });
    
    if (!tournament || tournament.entries.length !== 8) {
      console.log('Tournament 2 not found or wrong number of teams');
      return;
    }
    
    const teams = tournament.entries.map(e => e.teamId);
    console.log('Creating matches for teams:', teams);
    
    // Create 4 quarterfinal matches
    const matches = [
      { homeTeamId: teams[0], awayTeamId: teams[7] }, // 1 vs 8
      { homeTeamId: teams[3], awayTeamId: teams[4] }, // 4 vs 5  
      { homeTeamId: teams[1], awayTeamId: teams[6] }, // 2 vs 7
      { homeTeamId: teams[2], awayTeamId: teams[5] }  // 3 vs 6
    ];
    
    for (const match of matches) {
      const game = await prisma.game.create({
        data: {
          tournamentId: 2,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED',
          round: 1,
          gameDate: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
          matchType: 'TOURNAMENT_DAILY',
          simulated: false
        }
      });
      console.log(`Created game ${game.id}: Team ${match.homeTeamId} vs Team ${match.awayTeamId}`);
    }
    
    console.log('Successfully created all 4 quarterfinal matches!');
    
  } catch (error) {
    console.error('Error creating tournament games:', error);
  }
}

// Export for use
export { createTournamentGames };