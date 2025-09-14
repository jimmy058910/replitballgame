/**
 * TOURNAMENT AUTOMATION SERVICE
 * Extracted from monolithic seasonTimingAutomationService.ts  
 * Handles: Tournament auto-start, auto-fill, bracket management
 */

import { logger } from '../loggingService.js';
import { DatabaseService } from '../../database.js';

export class TournamentAutomationService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start tournament automation
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Tournament automation already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting tournament automation...');

    // Recover active tournament timers from database on startup
    try {
      console.log('🔄 [TOURNAMENT STARTUP] Recovering tournament auto-fill timers...');
      const { dailyTournamentAutoFillService } = await import('../dailyTournamentAutoFillService.js');
      await dailyTournamentAutoFillService.recoverActiveTimers();
      console.log('✅ [TOURNAMENT STARTUP] Tournament timer recovery completed');
    } catch (error) {
      console.error('⚠️ [TOURNAMENT STARTUP] Tournament timer recovery failed:', error);
    }

    // Schedule tournament auto-start check every hour
    this.scheduleTournamentAutoStart();
    
    console.log('✅ Tournament automation started');
  }

  /**
   * Stop tournament automation
   */
  static async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('Tournament automation stopped');
  }

  /**
   * Check for tournaments that need auto-start processing
   */
  static async checkTournamentAutoStart(): Promise<void> {
    try {
      console.log('🏆 [TOURNAMENT CHECK] Checking for tournaments that need to be auto-started...');
      
      // Check for Mid-Season Cup tournaments that need AI team filling at 1PM on Day 7
      await this.checkMidSeasonCupStart();
      
      // Check for general tournament auto-start
      await this.checkAndStartTournaments();
      
      // Check for tournament advancement
      await this.checkTournamentAdvancement();
      
      // Check for dynamic playoff round advancement during Day 15
      await this.checkPlayoffRoundAdvancement();
      
      console.log('✅ [TOURNAMENT CHECK] Tournament auto-start check completed');
    } catch (error) {
      console.error('❌ [TOURNAMENT CHECK] Error during tournament auto-start check:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Check for Mid-Season Cup tournaments that need AI team filling at 1PM on Day 7
   */
  private static async checkMidSeasonCupStart(): Promise<void> {
    try {
      const now = new Date();
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Check if it's Day 7 at 1PM EDT
      const currentDay = await this.getCurrentDay();
      if (currentDay !== 7 || estNow.getHours() !== 13 || estNow.getMinutes() > 5) {
        return; // Not the right time for Mid-Season Cup start
      }

      console.log('🏆 [MID-SEASON CUP] Processing Day 7 1PM EDT Mid-Season Cup start...');

      const { getPrismaClient } = await import('../../database.js');
      const prisma = await getPrismaClient();

      // Find Mid-Season Cup tournaments that are still in registration for Day 7
      const midSeasonTournaments = await prisma.tournament.findMany({
        where: {
          type: 'MID_SEASON_CLASSIC',
          seasonDay: 7,
          status: 'REGISTRATION_OPEN'
        },
        include: {
          entries: true
        }
      });

      console.log(`🏆 [MID-SEASON CUP] Found ${midSeasonTournaments.length} Mid-Season Cup tournaments to process`);

      for (const tournament of midSeasonTournaments) {
        try {
          // Fill with AI teams if needed
          const { tournamentService } = await import('../tournamentService.js');
          await tournamentService.fillTournamentWithAI(tournament.id);

          // Update tournament status to prepare for start
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: { 
              status: 'READY_TO_START',
              registrationEndTime: new Date() // Close registration
            }
          });

          console.log(`✅ [MID-SEASON CUP] Tournament ${tournament.id} filled with AI teams and ready to start`);
        } catch (error) {
          console.error(`❌ [MID-SEASON CUP] Error processing tournament ${tournament.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [MID-SEASON CUP] Error in Mid-Season Cup start check:', error);
    }
  }

  /**
   * Check and start tournaments based on various conditions
   */
  private static async checkAndStartTournaments(): Promise<void> {
    try {
      const { tournamentService } = await import('../tournamentService.js');
      await tournamentService.checkAndStartTournaments();
      console.log('✅ [TOURNAMENT START] General tournament start check completed');
    } catch (error) {
      console.error('❌ [TOURNAMENT START] Error checking tournament starts:', error);
    }
  }

  /**
   * Check for tournament bracket advancement
   */
  private static async checkTournamentAdvancement(): Promise<void> {
    try {
      const { getPrismaClient } = await import('../../database.js');
      const prisma = await getPrismaClient();

      // Find tournaments with completed rounds that need advancement
      const tournaments = await prisma.tournament.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          matches: {
            include: {
              homeTeam: { select: { teamName: true } },
              awayTeam: { select: { teamName: true } }
            }
          }
        }
      });

      for (const tournament of tournaments) {
        await this.checkTournamentRoundAdvancement(tournament);
      }

      console.log('✅ [TOURNAMENT ADV] Tournament advancement check completed');
    } catch (error) {
      console.error('❌ [TOURNAMENT ADV] Error checking tournament advancement:', error);
    }
  }

  /**
   * Check for playoff round advancement during Day 15
   */
  private static async checkPlayoffRoundAdvancement(): Promise<void> {
    try {
      const currentDay = await this.getCurrentDay();
      
      if (currentDay === 15) {
        console.log('🏆 [PLAYOFF ADV] Checking Day 15 playoff round advancement...');
        
        const { DynamicPlayoffService } = await import('../dynamicPlayoffService.js');
        await DynamicPlayoffService.checkAndAdvancePlayoffRounds();
        
        console.log('✅ [PLAYOFF ADV] Playoff advancement check completed');
      }
    } catch (error) {
      console.error('❌ [PLAYOFF ADV] Error checking playoff advancement:', error);
    }
  }

  /**
   * Check specific tournament for round advancement
   */
  private static async checkTournamentRoundAdvancement(tournament: any): Promise<void> {
    try {
      const { getPrismaClient } = await import('../../database.js');
      const prisma = await getPrismaClient();

      // Group matches by round
      const matchesByRound = tournament.matches.reduce((acc: any, match: any) => {
        const round = match.round || 1;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
      }, {});

      const rounds = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b));

      for (const roundStr of rounds) {
        const round = parseInt(roundStr);
        const roundMatches = matchesByRound[round];
        
        // Check if all matches in this round are completed
        const completedMatches = roundMatches.filter((m: any) => m.status === 'COMPLETED');
        
        if (completedMatches.length === roundMatches.length && roundMatches.length > 0) {
          // All matches in this round are completed, check if next round needs to be created
          const nextRound = round + 1;
          const nextRoundMatches = matchesByRound[nextRound];
          
          if (!nextRoundMatches && completedMatches.length > 1) {
            // Create next round matches
            await this.createNextRoundMatches(tournament.id, round, completedMatches);
          } else if (completedMatches.length === 1) {
            // Tournament completed - this is the final
            await prisma.tournament.update({
              where: { id: tournament.id },
              data: { status: 'COMPLETED' }
            });
            
            console.log(`🏆 [TOURNAMENT COMPLETE] Tournament ${tournament.id} completed`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [TOURNAMENT ROUND] Error advancing tournament ${tournament.id}:`, error);
    }
  }

  /**
   * Create matches for the next tournament round
   */
  private static async createNextRoundMatches(tournamentId: number, currentRound: number, completedMatches: any[]): Promise<void> {
    try {
      const { getPrismaClient } = await import('../../database.js');
      const prisma = await getPrismaClient();

      // Get winners from completed matches
      const winners = completedMatches.map(match => {
        return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
      });

      // Pair up winners for next round
      const nextRoundMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
          nextRoundMatches.push({
            tournamentId: tournamentId,
            round: currentRound + 1,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            status: 'SCHEDULED',
            gameDate: new Date(Date.now() + (5 * 60 * 1000)) // Start in 5 minutes
          });
        }
      }

      // Create next round matches
      if (nextRoundMatches.length > 0) {
        await prisma.game.createMany({
          data: nextRoundMatches
        });

        console.log(`✅ [TOURNAMENT ROUND] Created ${nextRoundMatches.length} matches for round ${currentRound + 1} of tournament ${tournamentId}`);
      }
    } catch (error) {
      console.error(`❌ [TOURNAMENT ROUND] Error creating next round for tournament ${tournamentId}:`, error);
    }
  }

  /**
   * Get current season day
   */
  private static async getCurrentDay(): Promise<number> {
    try {
      const { storage } = await import('../../storage/index.js');
      const currentSeason = await storage.seasons.getCurrentSeason();
      return currentSeason?.currentDay || 1;
    } catch (error) {
      console.error('Error getting current day:', error);
      return 1;
    }
  }

  /**
   * Schedule tournament auto-start check every hour
   */
  private static scheduleTournamentAutoStart(): void {
    this.timer = setInterval(async () => {
      await this.checkTournamentAutoStart();
    }, 60 * 60 * 1000); // Check every hour
    
    // Also check immediately on startup after a short delay
    setTimeout(() => this.checkTournamentAutoStart(), 10000);
  }
}

export default TournamentAutomationService;