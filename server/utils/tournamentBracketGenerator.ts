import { getPrismaClient } from "../database.js";

export class TournamentBracketGenerator {
  
  /**
   * Generate quarterfinal matches for an 8-team tournament
   */
  static async generateInitialBracket(tournamentId: number): Promise<void> {
    console.log(`Generating initial bracket for tournament ${tournamentId}...`);
    
    try {
      const prisma = await getPrismaClient();
      
      // Get tournament and participants
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          entries: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              registeredAt: 'asc' // First come, first served seeding
            }
          }
        }
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.entries.length !== 8) {
        throw new Error(`Tournament must have exactly 8 teams, found ${tournament.entries.length}`);
      }

      // Check if games already exist
      const existingGames = await prisma.game.findMany({
        where: { tournamentId: tournamentId }
      });

      if (existingGames.length > 0) {
        console.log(`Tournament ${tournamentId} already has ${existingGames.length} games, skipping generation`);
        return;
      }

      // Seed teams based on registration order
      const seededTeams = tournament.entries.map((entry: any, index: number) => ({
        id: entry.teamId,
        name: entry.team?.name || 'Unknown Team',
        seed: index + 1
      }));

      console.log('Seeded teams:', seededTeams.map(t => `${t.seed}. ${t.name}`));

      // Generate quarterfinal matches (Round 1)
      const quarterfinalMatches = [
        {
          tournamentId: tournamentId,
          homeTeamId: seededTeams[0].id, // Seed 1
          awayTeamId: seededTeams[7].id,  // Seed 8
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED' as any,
          round: 1,
          gameDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          matchType: 'TOURNAMENT' as any
        },
        {
          tournamentId: tournamentId,
          homeTeamId: seededTeams[3].id, // Seed 4
          awayTeamId: seededTeams[4].id,  // Seed 5
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED' as any,
          round: 1,
          gameDate: new Date(Date.now() + 5 * 60 * 1000),
          matchType: 'TOURNAMENT' as any
        },
        {
          tournamentId: tournamentId,
          homeTeamId: seededTeams[1].id, // Seed 2
          awayTeamId: seededTeams[6].id,  // Seed 7
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED' as any,
          round: 1,
          gameDate: new Date(Date.now() + 5 * 60 * 1000),
          matchType: 'TOURNAMENT' as any
        },
        {
          tournamentId: tournamentId,
          homeTeamId: seededTeams[2].id, // Seed 3
          awayTeamId: seededTeams[5].id,  // Seed 6
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED' as any,
          round: 1,
          gameDate: new Date(Date.now() + 5 * 60 * 1000),
          matchType: 'TOURNAMENT' as any
        }
      ];

      // Insert the matches
      const createdMatches = await prisma.game.createMany({
        data: quarterfinalMatches
      });

      console.log(`Successfully generated ${quarterfinalMatches.length} quarterfinal matches for tournament ${tournamentId}`);
      console.log('Matches created:');
      quarterfinalMatches.forEach((match, i) => {
        const homeTeam = seededTeams.find(t => t.id === match.homeTeamId);
        const awayTeam = seededTeams.find(t => t.id === match.awayTeamId);
        console.log(`  Match ${i + 1}: ${homeTeam?.name} vs ${awayTeam?.name}`);
      });

    } catch (error) {
      console.error(`Error generating tournament bracket:`, error);
      throw error;
    }
  }
}