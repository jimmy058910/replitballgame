import { prisma } from "../db";

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
      const { matchStateManager } = require('./matchStateManager');
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
          await matchStateManager.startLiveMatch(match.id);
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

      // Determine winners
      const winners = completedMatches.map(match => {
        return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
      });

      // Generate matches for next round
      const nextRound = completedRound + 1;
      const nextRoundMatches = [];

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextRoundMatches.push({
            tournamentId: tournamentId,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            status: 'SCHEDULED',
            round: nextRound,
            gameDate: new Date(),
            matchType: 'TOURNAMENT_DAILY'
          });
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
      // Get finals match
      const finalsMatch = await prisma.game.findFirst({
        where: {
          tournamentId: tournamentId,
          round: 3,
          status: 'COMPLETED'
        }
      });

      if (!finalsMatch) return;

      // Determine champion and runner-up
      const championTeamId = finalsMatch.homeScore > finalsMatch.awayScore ? 
        finalsMatch.homeTeamId : finalsMatch.awayTeamId;
      const runnerUpTeamId = finalsMatch.homeScore > finalsMatch.awayScore ? 
        finalsMatch.awayTeamId : finalsMatch.homeTeamId;

      // Award prizes (simplified for now)
      console.log(`Tournament ${tournamentId} completed! Champion: Team ${championTeamId}, Runner-up: Team ${runnerUpTeamId}`);

      // Update tournament status
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      console.log(`Tournament ${tournamentId} marked as completed`);
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
      await this.checkRoundCompletion(match.tournamentId, match.round);
    } catch (error) {
      console.error(`Error handling tournament match completion:`, error);
    }
  }
}