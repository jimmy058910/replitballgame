import { getPrismaClient } from "../database.js";
import { prisma } from '../database/enhancedDatabaseConfig';

/**
 * Tournament Bracket Validator
 * Validates tournament bracket progression and fixes issues
 */
export class TournamentBracketValidator {

  /**
   * Validate that tournament brackets are correctly generated
   */
  static async validateTournamentBracket(tournamentId: number): Promise<boolean> {
    console.log(`Validating tournament bracket for tournament ${tournamentId}`);
    
    try {
      // Get all matches for this tournament
      const allMatches = await prisma.game.findMany({
        where: { tournamentId: tournamentId },
        orderBy: [{ round: 'asc' }, { id: 'asc' }]
      });

      const rounds = new Map<number, any[]>();
      for (const match of allMatches) {
        const roundNum = match.round || 1;
        if (!rounds.has(roundNum)) {
          rounds.set(roundNum, []);
        }
        rounds.get(roundNum)?.push(match);
      }

      // Validate each round progression
      for (let round = 1; round < Math.max(...rounds.keys()); round++) {
        const currentRound = rounds.get(round) || [];
        const nextRound = rounds.get(round + 1) || [];

        // Get winners from current round
        const winners = currentRound
          .filter((m: any) => m.status === 'COMPLETED')
          .map((m: any) => m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId);

        // Check if next round teams match winners
        const nextRoundTeams = new Set();
        for (const match of nextRound) {
          nextRoundTeams.add(match.homeTeamId);
          nextRoundTeams.add(match.awayTeamId);
        }

        const winnersSet = new Set(winners);
        const isValid = [...nextRoundTeams].every(teamId => winnersSet.has(teamId));

        if (!isValid) {
          console.error(`❌ Tournament ${tournamentId} Round ${round} → ${round + 1} progression is INVALID`);
          console.error(`Winners from round ${round}:`, winners);
          console.error(`Teams in round ${round + 1}:`, [...nextRoundTeams]);
          return false;
        }

        console.log(`✅ Tournament ${tournamentId} Round ${round} → ${round + 1} progression is valid`);
      }

      return true;
    } catch (error) {
      console.error(`Error validating tournament bracket:`, error);
      return false;
    }
  }

  /**
   * Fix tournament bracket by regenerating correct matches
   */
  static async fixTournamentBracket(tournamentId: number): Promise<void> {
    console.log(`Fixing tournament bracket for tournament ${tournamentId}`);
    
    try {
      // Get all matches for this tournament
      const allMatches = await prisma.game.findMany({
        where: { tournamentId: tournamentId },
        orderBy: [{ round: 'asc' }, { id: 'asc' }]
      });

      const rounds = new Map<number, any[]>();
      for (const match of allMatches) {
        const roundNum = match.round || 1;
        if (!rounds.has(roundNum)) {
          rounds.set(roundNum, []);
        }
        rounds.get(roundNum)?.push(match);
      }

      // Fix each round progression
      for (let round = 1; round < Math.max(...rounds.keys()); round++) {
        const currentRound = rounds.get(round) || [];
        const nextRound = rounds.get(round + 1) || [];

        // Get winners from current round
        const winners = currentRound
          .filter((m: any) => m.status === 'COMPLETED')
          .map((m: any) => m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId);

        if (winners.length === 0) continue;

        // Check if next round needs to be fixed
        const nextRoundTeams = new Set();
        for (const match of nextRound) {
          nextRoundTeams.add(match.homeTeamId);
          nextRoundTeams.add(match.awayTeamId);
        }

        const winnersSet = new Set(winners);
        const needsFix = ![...nextRoundTeams].every(teamId => winnersSet.has(teamId));

        if (needsFix) {
          console.log(`🔧 Fixing round ${round + 1} matches with correct winners:`, winners);
          
          // Delete incorrect next round matches
          await prisma.game.deleteMany({
            where: {
              tournamentId: tournamentId,
              round: round + 1
            }
          });

          // Create correct matches
          const correctMatches = [];
          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              correctMatches.push({
                tournamentId: tournamentId,
                homeTeamId: winners[i],
                awayTeamId: winners[i + 1],
                homeScore: 0,
                awayScore: 0,
                status: 'SCHEDULED' as const,
                round: round + 1,
                gameDate: new Date(),
                matchType: 'PLAYOFF' as const
              });
            }
          }

          if (correctMatches.length > 0) {
            await prisma.game.createMany({
              data: correctMatches
            });
            console.log(`✅ Fixed ${correctMatches.length} matches for round ${round + 1}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error fixing tournament bracket:`, error);
    }
  }
}