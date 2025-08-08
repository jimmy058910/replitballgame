import { prisma } from "../db";
import { MatchType, GameStatus } from "../db";

/**
 * Unified Tournament Automation System
 * Handles all tournament types: Daily, Mid-Season Cup, League/Division
 */
export class UnifiedTournamentAutomation {
  
  /**
   * Start live simulation for all matches in a tournament round
   */
  static async startTournamentRound(tournamentId: number, roundNumber: number): Promise<void> {
    console.log(`Starting tournament ${tournamentId} round ${roundNumber}...`);
    
    try {
      // Get matches for this round
      const matches = await prisma.game.findMany({
        where: { 
          tournamentId: tournamentId,
          round: roundNumber,
          status: 'SCHEDULED'
        }
      });

      if (matches.length === 0) {
        console.log(`No scheduled matches found for tournament ${tournamentId} round ${roundNumber}`);
        return;
      }

      // Start live simulation for all matches
      const { matchStateManager } = await import('./matchStateManager');
      const startPromises = matches.map(async (match) => {
        try {
          // Update match status to IN_PROGRESS
          await prisma.game.update({
            where: { id: match.id },
            data: {
              status: 'IN_PROGRESS',
              gameDate: new Date()
            }
          });

          // Start live simulation
          await matchStateManager.startLiveMatch(match.id.toString());
          console.log(`Started live simulation for tournament match ${match.id}`);
          
          return match.id;
        } catch (error) {
          console.error(`Error starting match ${match.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(startPromises);
      const successful = results.filter(id => id !== null);
      
      console.log(`Tournament ${tournamentId} round ${roundNumber}: ${successful.length}/${matches.length} matches started`);
    } catch (error) {
      console.error(`Error starting tournament round ${tournamentId}-${roundNumber}:`, error);
    }
  }

  /**
   * Check if round is complete and advance to next round
   */
  static async checkRoundCompletion(tournamentId: number, completedRound: number): Promise<void> {
    console.log(`Checking round completion for tournament ${tournamentId}, round ${completedRound}`);
    
    try {
      // Get all matches for this round
      const roundMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: completedRound
        }
      });

      const completedMatches = roundMatches.filter(m => m.status === 'COMPLETED');
      
      console.log(`Tournament ${tournamentId} round ${completedRound}: ${completedMatches.length}/${roundMatches.length} matches completed`);
      
      if (completedMatches.length === roundMatches.length && roundMatches.length > 0) {
        const nextRound = completedRound + 1;
        
        // Check if next round already exists
        const nextRoundMatches = await prisma.game.findMany({
          where: {
            tournamentId: tournamentId,
            round: nextRound
          }
        });

        if (nextRoundMatches.length === 0) {
          if (completedRound === 3) {
            // Finals completed - complete tournament
            await this.completeTournament(tournamentId);
          } else {
            // Generate next round matches
            await this.generateNextRoundMatches(tournamentId, completedRound);
            
            // Start next round with delay
            setTimeout(() => {
              this.startTournamentRound(tournamentId, nextRound);
            }, 30000); // 30 second delay between rounds
          }
        }
      }
    } catch (error) {
      console.error(`Error checking round completion:`, error);
    }
  }

  /**
   * Generate matches for the next tournament round
   */
  static async generateNextRoundMatches(tournamentId: number, completedRound: number): Promise<void> {
    console.log(`Generating round ${completedRound + 1} matches for tournament ${tournamentId}`);
    
    try {
      const nextRound = completedRound + 1;
      
      // Check if next round matches already exist (prevent duplicates)
      const existingNextRoundMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: nextRound
        }
      });

      if (existingNextRoundMatches.length > 0) {
        console.log(`Round ${nextRound} matches already exist for tournament ${tournamentId}, skipping generation`);
        return;
      }

      // Get completed matches from previous round
      const completedMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: completedRound,
          status: 'COMPLETED'
        },
        orderBy: { id: 'asc' }
      });

      if (completedMatches.length === 0) return;

      // Determine winners (with detailed logging)
      const winners = completedMatches.map(match => {
        const winnerId = (match.homeScore || 0) > (match.awayScore || 0) ? match.homeTeamId : match.awayTeamId;
        const loserId = (match.homeScore || 0) > (match.awayScore || 0) ? match.awayTeamId : match.homeTeamId;
        console.log(`Match ${match.id}: Team ${winnerId} (${(match.homeScore || 0) > (match.awayScore || 0) ? 'home' : 'away'}) beat Team ${loserId} (${match.homeScore || 0}-${match.awayScore || 0})`);
        return winnerId;
      });

      // Generate matches for next round
      const nextRoundMatches = [];

      console.log(`Generating round ${nextRound} matches from ${winners.length} winners: [${winners.join(', ')}]`);

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const match = {
            tournamentId: tournamentId,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            status: 'SCHEDULED' as GameStatus,
            round: nextRound,
            gameDate: new Date(),
            matchType: 'TOURNAMENT_DAILY' as MatchType
          };
          nextRoundMatches.push(match);
          console.log(`Created match: Team ${winners[i]} vs Team ${winners[i + 1]} for round ${nextRound}`);
        }
      }

      // Insert matches
      if (nextRoundMatches.length > 0) {
        await prisma.game.createMany({
          data: nextRoundMatches
        });
        
        console.log(`Generated ${nextRoundMatches.length} matches for tournament ${tournamentId} round ${nextRound}`);
      }
    } catch (error) {
      console.error(`Error generating next round matches:`, error);
    }
  }

  /**
   * Complete tournament and award prizes
   */
  static async completeTournament(tournamentId: number): Promise<void> {
    console.log(`Completing tournament ${tournamentId}...`);
    
    try {
      // Get tournament to determine type and find finals round
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) return;

      // Determine finals round based on tournament type
      const finalsRound = tournament.type === 'MID_SEASON_CLASSIC' ? 4 : 3;
      
      // Get finals match
      const finalsMatch = await prisma.game.findFirst({
        where: {
          tournamentId: tournamentId,
          round: finalsRound,
          status: 'COMPLETED'
        }
      });

      if (!finalsMatch) return;

      // Determine champion and runner-up
      const championTeamId = (finalsMatch.homeScore || 0) > (finalsMatch.awayScore || 0) ? 
        finalsMatch.homeTeamId : finalsMatch.awayTeamId;
      const runnerUpTeamId = (finalsMatch.homeScore || 0) > (finalsMatch.awayScore || 0) ? 
        finalsMatch.awayTeamId : finalsMatch.homeTeamId;

      // Get semifinals matches to determine 3rd place (different round for different tournament types)
      const semifinalsRound = tournament.type === 'MID_SEASON_CLASSIC' ? 3 : 2;
      const semifinalsMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: semifinalsRound,
          status: 'COMPLETED'
        }
      });

      // For Mid-Season Cup: Check if 3rd place playoff game exists and create if needed
      if (tournament.type === 'MID_SEASON_CLASSIC' && semifinalsMatches.length === 2) {
        const existingThirdPlaceGame = await prisma.game.findFirst({
          where: {
            tournamentId: tournamentId,
            round: 5, // Round 5 for 3rd place playoff
            status: { not: 'COMPLETED' }
          }
        });

        if (!existingThirdPlaceGame) {
          // Create 3rd place playoff game
          const semifinalLosers = semifinalsMatches.map(match => 
            (match.homeScore || 0) > (match.awayScore || 0) ? match.awayTeamId : match.homeTeamId
          );

          if (semifinalLosers.length === 2) {
            await prisma.game.create({
              data: {
                tournamentId,
                homeTeamId: semifinalLosers[0],
                awayTeamId: semifinalLosers[1],
                gameDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
                matchType: "TOURNAMENT_DAILY",
                round: 5, // 3rd place playoff
                status: "SCHEDULED"
              }
            });
            console.log(`Created 3rd place playoff game for Mid-Season Cup tournament ${tournamentId}`);
          }
        }
      }

      // Get quarterfinals matches to determine 5th place (different round for different tournament types)
      const quarterfinalsRound = tournament.type === 'MID_SEASON_CLASSIC' ? 2 : 1;
      const quarterfinalsMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: quarterfinalsRound,
          status: 'COMPLETED'
        }
      });

      // Assign final ranks
      const finalRanks = new Map<number, number>();
      
      // 1st place - Champion
      finalRanks.set(championTeamId, 1);
      
      // 2nd place - Runner-up
      finalRanks.set(runnerUpTeamId, 2);
      
      // 3rd place - Semifinals losers
      let rank = 3;
      for (const match of semifinalsMatches) {
        const loserId = (match.homeScore || 0) > (match.awayScore || 0) ? match.awayTeamId : match.homeTeamId;
        if (!finalRanks.has(loserId)) {
          finalRanks.set(loserId, rank);
          rank++;
        }
      }
      
      // 5th place - Quarterfinals losers
      rank = 5;
      for (const match of quarterfinalsMatches) {
        const loserId = (match.homeScore || 0) > (match.awayScore || 0) ? match.awayTeamId : match.homeTeamId;
        if (!finalRanks.has(loserId)) {
          finalRanks.set(loserId, rank);
          rank++;
        }
      }

      // Update tournament entries with final ranks
      for (const [teamId, finalRank] of finalRanks) {
        await prisma.tournamentEntry.updateMany({
          where: {
            tournamentId: tournamentId,
            teamId: teamId
          },
          data: {
            finalRank: finalRank
          }
        });
      }

      console.log(`Tournament ${tournamentId} completed! Champion: Team ${championTeamId}, Runner-up: Team ${runnerUpTeamId}`);

      // Update tournament status
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED'
        }
      });

      console.log(`Tournament ${tournamentId} marked as completed with proper final ranks`);
    } catch (error) {
      console.error(`Error completing tournament:`, error);
    }
  }

  /**
   * Handle match completion for tournament progression
   */
  static async handleMatchCompletion(matchId: number): Promise<void> {
    try {
      const match = await prisma.game.findUnique({
        where: { id: matchId },
        include: {
          tournament: true
        }
      });

      if (!match || !match.tournament || !match.tournamentId) {
        return; // Not a tournament match
      }

      console.log(`Tournament match ${matchId} completed - checking round progression`);
      
      // Check if round is complete and advance
      await this.checkRoundCompletion(match.tournamentId, match.round || 1);
    } catch (error) {
      console.error(`Error handling tournament match completion:`, error);
    }
  }
}