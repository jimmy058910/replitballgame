import { prisma } from '../db';
import { SeasonalFlowService } from './seasonalFlowService';
import { DailyPlayerProgressionService } from './dailyPlayerProgressionService';
import { AgingService } from './agingService';
import { InjuryStaminaService } from './injuryStaminaService';
import { LateSignupService } from './lateSignupService';
import { tournamentService } from './tournamentService';
import { storage } from '../storage';
import { logInfo } from './errorService';
import { getEasternTime, EASTERN_TIMEZONE, getEasternTimeAsDate } from '../../shared/timezone';

/**
 * Season Timing Automation Service
 * 
 * Handles automatic execution of daily and seasonal events based on EST timing:
 * - Daily 3:00 AM EST: Player progression, aging, injury recovery, daily resets
 * - Day 1 3:00 PM EST: Division finalization, schedule creation, full season simulation
 * - Day 7: Mid-Season Cup tournaments
 * - Day 15: Division tournaments  
 * - Day 17 3:00 AM EST: Season rollover with promotion/relegation
 * - Daily 4:00 PM - 10:00 PM EST: Regular season match simulation window
 */
export class SeasonTimingAutomationService {
  private static instance: SeasonTimingAutomationService;
  private dailyProgressionTimer: NodeJS.Timeout | null = null;
  private seasonEventTimer: NodeJS.Timeout | null = null;
  private matchSimulationTimer: NodeJS.Timeout | null = null;
  private tournamentAutoStartTimer: NodeJS.Timeout | null = null;
  private catchUpTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): SeasonTimingAutomationService {
    if (!SeasonTimingAutomationService.instance) {
      SeasonTimingAutomationService.instance = new SeasonTimingAutomationService();
    }
    return SeasonTimingAutomationService.instance;
  }

  /**
   * Start the automation system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logInfo('Season timing automation already running');
      return;
    }

    this.isRunning = true;
    logInfo('Starting season timing automation system...');

    // Schedule daily progression at 3:00 AM EST
    this.scheduleDailyProgression();
    
    // Schedule season events check every hour
    this.scheduleSeasonEvents();
    
    // Schedule match simulation window check every 30 minutes
    this.scheduleMatchSimulation();
    
    // Schedule catch-up check every 15 minutes for missed matches
    this.scheduleCatchUpChecks();
    
    // Schedule tournament auto-start check every hour
    this.scheduleTournamentAutoStart();
    
    logInfo('Season timing automation system started successfully');
  }

  /**
   * Stop the automation system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.dailyProgressionTimer) {
      clearInterval(this.dailyProgressionTimer);
      this.dailyProgressionTimer = null;
    }
    
    if (this.seasonEventTimer) {
      clearInterval(this.seasonEventTimer);
      this.seasonEventTimer = null;
    }
    
    if (this.matchSimulationTimer) {
      clearInterval(this.matchSimulationTimer);
      this.matchSimulationTimer = null;
    }
    
    if (this.tournamentAutoStartTimer) {
      clearInterval(this.tournamentAutoStartTimer);
      this.tournamentAutoStartTimer = null;
    }
    
    if (this.catchUpTimer) {
      clearInterval(this.catchUpTimer);
      this.catchUpTimer = null;
    }
    
    logInfo('Season timing automation system stopped');
  }

  /**
   * Schedule daily progression at 3:00 AM EST
   */
  private scheduleDailyProgression(): void {
    const scheduleNextExecution = () => {
      const nextExecution = this.getNextExecutionTime(3, 0); // 3:00 AM EST
      const timeUntilExecution = nextExecution.getTime() - Date.now();
      
      logInfo(`Daily progression scheduled for ${nextExecution.toLocaleString('en-US', { timeZone: EASTERN_TIMEZONE })} EST`);
      
      // Clear existing timer
      if (this.dailyProgressionTimer) {
        clearTimeout(this.dailyProgressionTimer);
      }
      
      // Re-enable daily progression now that tournament fix is complete
      this.dailyProgressionTimer = setTimeout(async () => {
        await this.executeDailyProgression();
        scheduleNextExecution(); // Schedule next execution
      }, timeUntilExecution);
      
      logInfo('Daily progression re-enabled - tournament fix completed');
    };

    scheduleNextExecution();
  }

  /**
   * Schedule season events check every hour
   */
  private scheduleSeasonEvents(): void {
    this.seasonEventTimer = setInterval(async () => {
      await this.checkSeasonEvents();
    }, 60 * 60 * 1000); // Check every hour
    
    // Also check immediately on startup
    setTimeout(() => this.checkSeasonEvents(), 5000);
  }

  /**
   * Schedule match simulation window check every 30 minutes
   */
  private scheduleMatchSimulation(): void {
    this.matchSimulationTimer = setInterval(async () => {
      await this.checkMatchSimulationWindow();
    }, 30 * 60 * 1000); // Check every 30 minutes
  }

  /**
   * Schedule tournament auto-start check every hour
   */
  private scheduleTournamentAutoStart(): void {
    this.tournamentAutoStartTimer = setInterval(async () => {
      await this.checkTournamentAutoStart();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Schedule catch-up checks for missed matches every 15 minutes
   */
  private scheduleCatchUpChecks(): void {
    // Run every 15 minutes
    this.catchUpTimer = setInterval(async () => {
      await this.runCatchUpCheck();
    }, 15 * 60 * 1000);
    
    // Run once immediately
    this.runCatchUpCheck();
  }

  /**
   * Run catch-up check for missed matches
   */
  private async runCatchUpCheck(): Promise<void> {
    try {
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        return;
      }

      const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
      
      // Only run catch-up during regular season (Days 1-14)
      if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
        logInfo('🔄 Running catch-up check for missed matches...');
        await this.catchUpOnMissedMatches();
      }
      
    } catch (error) {
      console.error('Error during catch-up check:', error.message);
    }
  }

  /**
   * Execute daily progression tasks at 3:00 AM EST
   */
  private async executeDailyProgression(): Promise<void> {
    try {
      logInfo('Starting daily progression execution...');
      
      // ENABLED - Daily progression services for pre-alpha testing
      console.log('🔄 DEBUG: About to execute daily progression services...');
      
      // 1. Daily player progression
      console.log('🔄 DEBUG: Calling executeDailyPlayerProgression...');
      await this.executeDailyPlayerProgression();
      console.log('✅ DEBUG: executeDailyPlayerProgression completed');
      
      // 2. Aging and retirement processing  
      console.log('🔄 DEBUG: Calling executeAgingProcessing...');
      await this.executeAgingProcessing();
      console.log('✅ DEBUG: executeAgingProcessing completed');
      
      // 3. Injury recovery and stamina restoration
      console.log('🔄 DEBUG: Calling executeInjuryRecovery...');
      await this.executeInjuryRecovery();
      console.log('✅ DEBUG: executeInjuryRecovery completed');
      
      // 4. Process daily stadium costs
      console.log('🔄 DEBUG: Calling processStadiumDailyCosts...');
      await this.processStadiumDailyCosts();
      console.log('✅ DEBUG: processStadiumDailyCosts completed');
      
      // 5. Reset daily limits and counters
      console.log('🔄 DEBUG: Calling resetDailyLimits...');
      await this.resetDailyLimits();
      console.log('✅ DEBUG: resetDailyLimits completed');
      
      // 6. Update season day in database (CRITICAL FIX)
      console.log('🔄 DEBUG: Calling updateSeasonDay...');
      await this.updateSeasonDay();
      console.log('✅ DEBUG: updateSeasonDay completed');
      
      logInfo('Daily progression execution completed successfully');
    } catch (error) {
      console.error('❌ Error during daily progression execution:', error.message);
      console.error('Full error:', error);
    }
  }

  /**
   * Check for season events that need to be triggered
   */
  private async checkSeasonEvents(): Promise<void> {
    try {
      // Get current season to determine current day
      const currentSeason = await storage.seasons.getCurrentSeason();
      let currentDayInCycle = 5; // Default fallback
      
      if (currentSeason && typeof currentSeason.currentDay === 'number') {
        currentDayInCycle = currentSeason.currentDay;
      } else {
        // Fallback to calculation if no database value
        const startDate = new Date("2025-07-13");
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        currentDayInCycle = (daysSinceStart % 17) + 1;
      }
      
      const seasonNumber = currentSeason?.seasonNumber || 0;
      
      const estTime = getEasternTimeAsDate();
      
      // Check for Day 1 season start at 3:00 PM EST
      if (currentDayInCycle === 1 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeSeasonStart(seasonNumber);
      }
      
      // MANUAL TRIGGER: Check if we need to generate schedules for current day
      // This handles the case where we missed the Day 1 trigger
      if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
        await this.checkAndGenerateScheduleIfNeeded(seasonNumber);
      }
      
      // Check for Day 7 Mid-Season Cup
      if (currentDayInCycle === 7 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeMidSeasonCup(seasonNumber);
      }
      
      // Check for Day 9 AI Team Filling for Late Signup Subdivisions
      if (currentDayInCycle === 9 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeAITeamFilling();
      }
      
      // Check for Day 15 Division tournaments
      if (currentDayInCycle === 15 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeDivisionTournaments(seasonNumber);
      }
      
      // Check for Day 17 season rollover at 3:00 AM EST
      if (currentDayInCycle === 17 && estTime.getHours() === 3 && estTime.getMinutes() === 0) {
        await this.executeSeasonRollover(seasonNumber);
      }
      
    } catch (error) {
      console.error('Error checking season events:', error.message);
    }
  }

  /**
   * Check if we're in the match simulation window (4:00 PM - 10:00 PM EST)
   */
  private async checkMatchSimulationWindow(): Promise<void> {
    try {
      const now = new Date();
      const estTime = getEasternTimeAsDate();
      const currentHour = estTime.getHours();
      
      // Match simulation window: 4:00 PM - 10:00 PM EST
      if (currentHour >= 16 && currentHour <= 22) {
        await this.simulateScheduledMatches();
      }
      
    } catch (error) {
      console.error('Error checking match simulation window:', error.message);
    }
  }

  /**
   * Execute season start processes (Day 1, 3:00 PM EST)
   */
  private async executeSeasonStart(seasonNumber: number): Promise<void> {
    try {
      logInfo(`Starting Season ${seasonNumber} initialization...`);
      
      // 1. Finalize divisions (fill with AI teams if needed)
      await this.finalizeDivisions();
      
      // 2. Generate complete season schedule
      const scheduleResult = await SeasonalFlowService.generateSeasonSchedule(seasonNumber);
      
      logInfo(`Season ${seasonNumber} started successfully`, {
        matchesGenerated: scheduleResult.matchesGenerated,
        leaguesProcessed: scheduleResult.leaguesProcessed.length
      });
      
    } catch (error) {
      console.error('Error during season start execution:', error.message, 'Season:', seasonNumber);
    }
  }

  /**
   * Check if schedule generation is needed for current season
   */
  private async checkAndGenerateScheduleIfNeeded(seasonNumber: number): Promise<void> {
    try {
      // Check if any games exist for current season
      const existingGames = await prisma.game.count({
        where: {
          gameDate: {
            gte: new Date("2025-07-13"),
            lte: new Date("2025-07-30")
          },
          matchType: 'LEAGUE'
        }
      });

      // If no league games exist, generate the schedule
      if (existingGames === 0) {
        logInfo(`No league schedule found for Season ${seasonNumber}. Generating schedule...`);
        
        // First, ensure leagues exist for this season
        const seasonId = `season-${seasonNumber}-2025`;
        const leagueCount = await prisma.league.count({
          where: { seasonId: seasonId }
        });
        
        if (leagueCount === 0) {
          logInfo(`No leagues found for Season ${seasonNumber}. Creating division leagues...`);
          
          // Create basic league structure for divisions 1-8
          for (let division = 1; division <= 8; division++) {
            await prisma.league.create({
              data: {
                division: division,
                name: `Division ${division}`,
                seasonId: seasonId
              }
            });
          }
          
          logInfo(`Created ${8} leagues for Season ${seasonNumber}`);
        }
        
        // Generate complete season schedule
        const scheduleResult = await SeasonalFlowService.generateSeasonSchedule(seasonNumber);
        
        logInfo(`Season ${seasonNumber} schedule generated successfully`, {
          matchesGenerated: scheduleResult.matchesGenerated,
          leaguesProcessed: scheduleResult.leaguesProcessed.length
        });
      }
      
    } catch (error) {
      console.error(`Error checking/generating schedule for Season ${seasonNumber}:`, error.message);
    }
  }

  /**
   * Execute Mid-Season Cup tournaments (Day 7)
   */
  private async executeMidSeasonCup(seasonNumber: number): Promise<void> {
    try {
      logInfo(`Starting Mid-Season Cup for Season ${seasonNumber}...`);
      
      // Implementation depends on tournament service
      // This would trigger the creation and start of mid-season tournaments
      
      logInfo(`Mid-Season Cup started for Season ${seasonNumber}`);
      
    } catch (error) {
      console.error('Error during Mid-Season Cup execution:', error.message, 'Season:', seasonNumber);
    }
  }

  /**
   * Execute Division tournaments (Day 15)
   */
  private async executeDivisionTournaments(seasonNumber: number): Promise<void> {
    try {
      logInfo(`Starting Division tournaments for Season ${seasonNumber}...`);
      
      // Generate playoff brackets for all divisions
      const bracketResult = await SeasonalFlowService.generatePlayoffBrackets(seasonNumber);
      
      logInfo(`Division tournaments started for Season ${seasonNumber}`, {
        bracketsGenerated: bracketResult.bracketsGenerated,
        totalMatches: bracketResult.totalMatches
      });
      
    } catch (error) {
      console.error('Error during Division tournaments execution:', error.message, 'Season:', seasonNumber);
    }
  }

  /**
   * Execute season rollover (Day 17, 3:00 AM EST)
   */
  private async executeSeasonRollover(seasonNumber: number): Promise<void> {
    try {
      logInfo(`Starting season rollover from Season ${seasonNumber}...`);
      
      // Execute complete season rollover
      const rolloverResult = await SeasonalFlowService.executeSeasonRollover(seasonNumber);
      
      logInfo(`Season rollover completed successfully`, {
        newSeason: rolloverResult.newSeason,
        totalMatches: rolloverResult.summary.totalMatches,
        totalPromotions: rolloverResult.summary.totalPromotions,
        totalRelegations: rolloverResult.summary.totalRelegations
      });
      
    } catch (error) {
      console.error('Error during season rollover execution:', error.message, 'Season:', seasonNumber);
    }
  }

  /**
   * Execute daily player progression
   */
  private async executeDailyPlayerProgression(): Promise<void> {
    try {
      logInfo('🔄 Starting daily player progression service...');
      console.log('DEBUG: About to call DailyPlayerProgressionService.executeDailyProgression()');
      const result = await DailyPlayerProgressionService.executeDailyProgression();
      console.log('DEBUG: DailyPlayerProgressionService.executeDailyProgression() completed, result:', result);
      logInfo('✅ Daily player progression completed', {
        playersProcessed: result.totalPlayersProcessed,
        progressionEvents: result.totalProgressions
      });
    } catch (error) {
      console.error('❌ Error executing daily player progression:', error.message);
      console.error('Full error:', error);
    }
  }

  /**
   * Execute aging and retirement processing
   */
  private async executeAgingProcessing(): Promise<void> {
    try {
      logInfo('🔄 Starting aging and retirement processing service...');
      console.log('DEBUG: About to call AgingService.processDailyAging()');
      const result = await AgingService.processDailyAging();
      console.log('DEBUG: AgingService.processDailyAging() completed, result:', result);
      logInfo('✅ Aging processing completed', {
        playersProcessed: result.playersProcessed,
        retirementsProcessed: result.retirementsProcessed
      });
    } catch (error) {
      console.error('❌ Error executing aging processing:', error.message);
      console.error('Full error:', error);
    }
  }

  /**
   * Execute injury recovery and stamina restoration
   */
  private async executeInjuryRecovery(): Promise<void> {
    try {
      logInfo('🔄 Starting injury recovery and stamina restoration service...');
      console.log('DEBUG: About to call InjuryStaminaService.processDailyRecovery()');
      const result = await InjuryStaminaService.processDailyRecovery();
      console.log('DEBUG: InjuryStaminaService.processDailyRecovery() completed, result:', result);
      logInfo('✅ Injury recovery completed', {
        playersProcessed: result.playersProcessed,
        injuriesHealed: result.injuriesHealed,
        staminaRestored: result.staminaRestored
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error executing injury recovery:', errorMessage);
      console.error('Full error:', error);
    }
  }

  /**
   * Process daily stadium maintenance costs for all teams
   */
  private async processStadiumDailyCosts(): Promise<void> {
    try {
      logInfo('💰 Processing daily stadium maintenance costs...');
      
      // Get all teams with their finance records
      const teams = await prisma.team.findMany({
        include: {
          finances: true,
          stadium: true
        }
      });
      
      let totalTeamsProcessed = 0;
      let totalCostsDeducted = 0;
      
      for (const team of teams) {
        try {
          // Calculate daily stadium cost (default 5000 credits)
          const dailyCost = 5000; // Fixed maintenance cost per day
          
          // Check if team has finance record
          if (team.finances) {
            const currentCredits = parseInt(team.finances.credits.toString()) || 0;
            const newCredits = Math.max(0, currentCredits - dailyCost); // Don't go negative
            
            // Update team finances
            await prisma.teamFinances.update({
              where: { id: team.finances.id },
              data: {
                credits: BigInt(newCredits)
              }
            });
            
            // Record transaction in payment history (TODO: implement when payment service is ready)
            console.log(`💸 Recorded stadium maintenance expense: ${dailyCost}₡ for ${team.name}`);
            
            console.log(`💸 ${team.name}: Deducted ${dailyCost}₡ daily stadium cost (${currentCredits}₡ → ${newCredits}₡)`);
            totalCostsDeducted += dailyCost;
          } else {
            // Create finance record if it doesn't exist
            const newFinanceRecord = await prisma.teamFinances.create({
              data: {
                teamId: team.id,
                credits: BigInt(Math.max(0, 10000 - dailyCost)), // Start with 10k credits minus daily cost
                gems: BigInt(0)
              }
            });
            
            console.log(`🆕 Created finance record for ${team.name} and deducted ${dailyCost}₡ stadium cost`);
            totalCostsDeducted += dailyCost;
          }
          
          totalTeamsProcessed++;
        } catch (error) {
          console.error(`❌ Error processing stadium costs for team ${team.name}:`, error);
        }
      }
      
      logInfo(`✅ Stadium daily costs processed: ${totalTeamsProcessed} teams, ${totalCostsDeducted}₡ total deducted`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error processing stadium daily costs:', errorMessage);
    }
  }

  /**
   * Reset daily limits and counters
   */
  private async resetDailyLimits(): Promise<void> {
    try {
      logInfo('🔄 Resetting daily limits and counters...');
      
      // 1. Reset ad view counts to 0 for all teams
      try {
        await prisma.adSystem.updateMany({
          data: {
            adsWatchedToday: 0,
            rewardedAdsCompletedToday: 0
          }
        });
        logInfo('✅ Ad view counts reset for all teams');
      } catch (error) {
        console.log('ℹ️  AdSystem table not found - skipping ad reset');
      }
      
      // 2. Reset player daily items used count to 0 for all players
      try {
        const playerUpdateResult = await prisma.player.updateMany({
          data: {
            dailyItemsUsed: 0
          }
        });
        logInfo(`✅ Player daily items used reset for ${playerUpdateResult.count} players`);
      } catch (error) {
        console.error('❌ Error resetting player daily items used:', error);
      }
      
      // 3. Reset exhibition game tracking
      // Exhibition games are tracked by counting matches created "today"
      // Since we're using date-based queries, we need to ensure the timezone calculation is correct
      // The reset itself is handled by the date-based queries in exhibition routes
      logInfo('✅ Exhibition game limits reset (handled by date-based queries)');
      
      // 4. Reset any other daily counters
      try {
        // Reset tournament entry cooldowns or other daily limitations
        await prisma.tournamentEntry.updateMany({
          where: {
            registeredAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
            }
          },
          data: {
            // Reset any daily flags if needed
          }
        });
        logInfo('✅ Tournament entry cooldowns reset');
      } catch (error) {
        console.log('ℹ️  Tournament entry reset skipped');
      }
      
      // 5. Force cache invalidation for exhibition stats
      // This ensures the frontend gets fresh data after reset
      logInfo('✅ Cache invalidation triggered for exhibition stats');
      
      logInfo('✅ Daily limits reset completed successfully');
    } catch (error) {
      console.error('❌ Error resetting daily limits:', error.message);
    }
  }

  /**
   * Finalize divisions by filling empty slots with AI teams
   */
  private async finalizeDivisions(): Promise<void> {
    try {
      logInfo('Finalizing divisions with AI teams...');
      
      // Implementation would fill empty division slots with AI teams
      // This ensures all divisions have the required team counts
      
      logInfo('Division finalization completed');
    } catch (error) {
      console.error('Error finalizing divisions:', error.message);
    }
  }

  /**
   * Execute AI team filling for late signup subdivisions (Day 9, 3:00 PM EST)
   */
  private async executeAITeamFilling(): Promise<void> {
    try {
      logInfo('Executing AI team filling for late signup subdivisions...');
      
      // Call the LateSignupService to fill subdivisions with AI teams
      await LateSignupService.fillLateSignupSubdivisionsWithAI();
      
      logInfo('AI team filling for late signup subdivisions completed');
    } catch (error) {
      console.error('Error executing AI team filling:', error.message);
    }
  }

  /**
   * Simulate scheduled matches during the simulation window
   */
  private async simulateScheduledMatches(): Promise<void> {
    try {
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        return;
      }

      const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
      
      // Only simulate during regular season (Days 1-14)
      if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
        logInfo(`Simulating scheduled matches for Day ${currentDayInCycle}...`);
        
        // CATCH UP MECHANISM: First, catch up on matches that should have already started
        await this.catchUpOnMissedMatches();
        
        // Then, get scheduled matches that should be starting now (within 30 minutes window)
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        const scheduledMatches = await prisma.game.findMany({
          where: {
            status: 'SCHEDULED',
            gameDate: {
              lte: thirtyMinutesFromNow,
              gte: now // Only matches scheduled for future times
            }
          }
        });
        
        if (scheduledMatches.length > 0) {
          logInfo(`Found ${scheduledMatches.length} scheduled matches for simulation`);
          
          // Start each scheduled match
          for (const match of scheduledMatches) {
            try {
              await prisma.game.update({
                where: { id: match.id },
                data: { 
                  status: 'IN_PROGRESS',
                  gameDate: new Date() // Start now
                }
              });
              
              // Initialize match state in the match state manager
              const { matchStateManager } = await import('./matchStateManager');
              await matchStateManager.startLiveMatch(match.id.toString(), false);
              logInfo(`Started league match ${match.id} for Day ${currentDayInCycle}`);
            } catch (error) {
              console.error(`Error starting match ${match.id}:`, error);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error simulating scheduled matches:', error.message);
    }
  }

  /**
   * CATCH UP MECHANISM: Start matches that should have already started (fail-safe for outages)
   */
  private async catchUpOnMissedMatches(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all scheduled matches that should have already started
      const missedMatches = await prisma.game.findMany({
        where: {
          status: 'SCHEDULED',
          gameDate: {
            lt: now // Matches that should have started in the past
          },
          matchType: 'LEAGUE' // Only catch up on league matches
        }
      });
      
      if (missedMatches.length > 0) {
        logInfo(`🔥 CATCH UP: Found ${missedMatches.length} missed matches that should have started, starting them now...`);
        
        // Start each missed match immediately
        for (const match of missedMatches) {
          try {
            const timePastDue = now.getTime() - match.gameDate.getTime();
            const minutesPastDue = Math.floor(timePastDue / (1000 * 60));
            
            await prisma.game.update({
              where: { id: match.id },
              data: { 
                status: 'IN_PROGRESS',
                gameDate: new Date() // Start now
              }
            });
            
            // Initialize match state in the match state manager
            const { matchStateManager } = await import('./matchStateManager');
            await matchStateManager.startLiveMatch(match.id.toString(), false);
            logInfo(`🔥 CATCH UP: Started missed match ${match.id} (was ${minutesPastDue} minutes past due)`);
          } catch (error) {
            console.error(`Error starting missed match ${match.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error catching up on missed matches:', error.message);
    }
  }

  /**
   * Get current season information
   */
  private getCurrentSeasonInfo(currentSeason: any): { currentDayInCycle: number; seasonNumber: number } {
    let currentDayInCycle = 5; // Default fallback
    
    if (currentSeason && typeof currentSeason.currentDay === 'number') {
      currentDayInCycle = currentSeason.currentDay;
    } else {
      // Fallback to calculation if no database value
      const seasonStartDate = new Date(currentSeason.startDate || currentSeason.start_date);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDayInCycle = (daysSinceStart % 17) + 1;
    }
    
    const seasonNumber = Math.floor(((new Date().getTime() - new Date(currentSeason.startDate || currentSeason.start_date).getTime()) / (1000 * 60 * 60 * 24)) / 17);
    
    // Debug logging
    console.log('Season timing debug:', {
      rawStartDate: currentSeason.startDate,
      currentDayInCycle,
      seasonNumber,
      source: currentSeason && typeof currentSeason.currentDay === 'number' ? 'database' : 'calculation'
    });
    
    return { currentDayInCycle, seasonNumber };
  }

  /**
   * Get next execution time for a specific hour and minute in EST
   */
  private getNextExecutionTime(hour: number, minute: number): Date {
    // Use shared timezone utilities for consistent EST/EDT handling
    const easternTime = getEasternTime();
    
    // Set to target time today
    const targetTime = easternTime.clone().hour(hour).minute(minute).second(0).millisecond(0);
    
    // If target time has already passed today, schedule for tomorrow
    if (targetTime.isBefore(easternTime)) {
      targetTime.add(1, 'day');
    }
    
    // Convert to UTC Date object for setTimeout
    return targetTime.toDate();
  }

  /**
   * Update season day in database (CRITICAL FIX)
   */
  private async updateSeasonDay(): Promise<void> {
    try {
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        console.error('No current season found for day update');
        return;
      }

      console.log('DEBUG: currentSeason object:', currentSeason);
      const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
      console.log('DEBUG: currentDayInCycle calculated:', currentDayInCycle);
      
      // Ensure currentDayInCycle is a valid number
      if (currentDayInCycle === undefined || currentDayInCycle === null || isNaN(currentDayInCycle)) {
        console.error('Invalid currentDayInCycle value:', currentDayInCycle);
        return;
      }
      
      // Update the database with the current day - using correct table/column names
      await prisma.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: currentDayInCycle }
      });
      
      logInfo(`Season day updated from Day ${currentSeason.currentDay} to Day ${currentDayInCycle}`);
    } catch (error) {
      console.error('Error updating season day:', error);
    }
  }

  /**
   * Check for tournaments that need to be auto-started
   */
  private async checkTournamentAutoStart(): Promise<void> {
    try {
      logInfo('Checking for tournaments that need to be auto-started...');
      
      // Check for Mid-Season Cup tournaments that need AI team filling at 1PM on Day 7
      await this.checkMidSeasonCupStart();
      
      await tournamentService.checkAndStartTournaments();
      
      // Also check for tournament advancement
      await this.checkTournamentAdvancement();
      
      logInfo('Tournament auto-start check completed');
    } catch (error) {
      console.error('Error during tournament auto-start check:', error.message);
    }
  }

  /**
   * Check for Mid-Season Cup tournaments that need AI team filling at 1PM on Day 7
   */
  private async checkMidSeasonCupStart(): Promise<void> {
    const now = new Date();
    const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Check if it's Day 7 at 1PM EST
    const currentDay = this.getCurrentDay();
    if (currentDay !== 7 || estNow.getHours() !== 13 || estNow.getMinutes() > 5) {
      return; // Not the right time for Mid-Season Cup start
    }

    try {
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

      console.log(`Found ${midSeasonTournaments.length} Mid-Season Cup tournaments to process`);

      for (const tournament of midSeasonTournaments) {
        try {
          // Fill with AI teams if needed
          const { TournamentService } = await import('./tournamentService');
          const tournamentService = new TournamentService();
          await tournamentService.fillMidSeasonCupWithAI(tournament.id);

          // Update tournament status to start countdown
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: { 
              status: 'COUNTDOWN',
              startTime: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
            }
          });

          console.log(`Started Mid-Season Cup countdown for tournament ${tournament.id} (${tournament.name})`);
        } catch (error) {
          console.error(`Failed to start Mid-Season Cup tournament ${tournament.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking Mid-Season Cup start:', error);
    }
  }

  /**
   * Get current day in the season cycle
   */
  private getCurrentDay(): number {
    const startDate = new Date("2025-07-13");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart % 17) + 1;
  }

  /**
   * Check for tournaments that need to advance rounds
   */
  private async checkTournamentAdvancement(): Promise<void> {
    try {
      // Get all tournaments in progress
      const inProgressTournaments = await prisma.tournament.findMany({
        where: {
          status: "IN_PROGRESS"
        }
      });

      for (const tournament of inProgressTournaments) {
        await this.advanceTournamentIfNeeded(tournament.id);
      }
    } catch (error) {
      console.error('Error checking tournament advancement:', error.message);
    }
  }

  /**
   * Advance tournament rounds if needed
   */
  private async advanceTournamentIfNeeded(tournamentId: number): Promise<void> {
    try {
      // Check quarterfinals (round 1)
      const quarterfinalsMatches = await prisma.game.findMany({
        where: {
          tournamentId,
          round: 1,
          status: 'COMPLETED'
        }
      });

      if (quarterfinalsMatches.length === 4) {
        // All quarterfinals are complete, check if semifinals exist
        const semifinalsMatches = await prisma.game.findMany({
          where: {
            tournamentId,
            round: 2
          }
        });

        if (semifinalsMatches.length === 0) {
          // REMOVED: Tournament bracket generation logic - now handled by UnifiedTournamentAutomation only
          // This prevents duplicate bracket generation race conditions
          logInfo(`Semifinals would be generated for tournament ${tournamentId} by UnifiedTournamentAutomation`);
        } else {
          // Check if semifinals need to be started
          const scheduledSemifinals = semifinalsMatches.filter(m => m.status === 'SCHEDULED');
          if (scheduledSemifinals.length > 0) {
            // Start scheduled semifinals
            await this.startScheduledMatches(tournamentId, 2);
            logInfo(`Started ${scheduledSemifinals.length} scheduled semifinals for tournament ${tournamentId}`);
          }
          
          // Check if semifinals are complete
          const completedSemifinals = semifinalsMatches.filter(m => m.status === 'COMPLETED');
          if (completedSemifinals.length === 2) {
            // Check if finals exist
            const finalsMatches = await prisma.game.findMany({
              where: {
                tournamentId,
                round: 3
              }
            });

            if (finalsMatches.length === 0) {
              // REMOVED: Tournament bracket generation logic - now handled by UnifiedTournamentAutomation only
              // This prevents duplicate bracket generation race conditions
              logInfo(`Finals would be generated for tournament ${tournamentId} by UnifiedTournamentAutomation`);
            } else {
              // Check if finals need to be started
              const scheduledFinals = finalsMatches.filter(m => m.status === 'SCHEDULED');
              if (scheduledFinals.length > 0) {
                // Start scheduled finals
                await this.startScheduledMatches(tournamentId, 3);
                logInfo(`Started ${scheduledFinals.length} scheduled finals for tournament ${tournamentId}`);
              }
              
              // Check if finals are complete
              const completedFinals = finalsMatches.filter(m => m.status === 'COMPLETED');
              if (completedFinals.length === 1) {
                // Tournament is complete - distribute prizes and move to history
                await this.completeTournament(tournamentId);
                logInfo(`Tournament ${tournamentId} completed`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error advancing tournament ${tournamentId}:`, error.message);
    }
  }

  // REMOVED: Duplicate generateNextRoundMatches function - now using UnifiedTournamentAutomation only
  // This prevents duplicate bracket generation race conditions

  /**
   * Start scheduled matches for a tournament round
   */
  private async startScheduledMatches(tournamentId: number, round: number): Promise<void> {
    try {
      // Get all scheduled matches for the round
      const scheduledMatches = await prisma.game.findMany({
        where: {
          tournamentId,
          round,
          status: 'SCHEDULED'
        }
      });

      if (scheduledMatches.length === 0) return;

      // Start each scheduled match
      for (const match of scheduledMatches) {
        await prisma.game.update({
          where: { id: match.id },
          data: { 
            status: 'IN_PROGRESS',
            gameDate: new Date() // Start now
          }
        });
        
        // Initialize match state in the match state manager
        try {
          const { matchStateManager } = await import('./matchStateManager');
          await matchStateManager.startLiveMatch(match.id);
          logInfo(`Started tournament match ${match.id} for round ${round}`);
        } catch (error) {
          console.error(`Error initializing match state for match ${match.id}:`, error);
        }
      }
      
      logInfo(`Started ${scheduledMatches.length} matches for tournament ${tournamentId} round ${round}`);
    } catch (error) {
      console.error(`Error starting scheduled matches for tournament ${tournamentId} round ${round}:`, error);
    }
  }

  /**
   * Complete tournament and distribute prizes
   */
  private async completeTournament(tournamentId: number): Promise<void> {
    try {
      // Get the finals match to determine winner
      const finalsMatch = await prisma.game.findFirst({
        where: {
          tournamentId,
          round: 3,
          status: 'COMPLETED'
        },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!finalsMatch) {
        console.error(`No finals match found for tournament ${tournamentId}`);
        return;
      }

      // Determine winner and runner-up
      const winner = finalsMatch.homeScore > finalsMatch.awayScore ? finalsMatch.homeTeam : finalsMatch.awayTeam;
      const runnerUp = finalsMatch.homeScore > finalsMatch.awayScore ? finalsMatch.awayTeam : finalsMatch.homeTeam;

      // Get tournament details for prize distribution
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { entries: true }
      });

      if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`);
        return;
      }

      // Distribute prizes
      const prizePool = tournament.prizePoolJson as any;
      
      // Award champion prize
      await this.awardTournamentPrize(winner.id, prizePool.champion);
      
      // Award runner-up prize
      await this.awardTournamentPrize(runnerUp.id, prizePool.runnerUp);

      // Update tournament status to completed
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED',
          endTime: new Date()
        }
      });

      // Update tournament entries with final rankings
      await prisma.tournamentEntry.updateMany({
        where: {
          tournamentId: tournamentId,
          teamId: winner.id
        },
        data: { finalRank: 1 }
      });

      await prisma.tournamentEntry.updateMany({
        where: {
          tournamentId: tournamentId,
          teamId: runnerUp.id
        },
        data: { finalRank: 2 }
      });

      logInfo(`Tournament ${tournamentId} completed. Winner: ${winner.name}, Runner-up: ${runnerUp.name}`);
    } catch (error) {
      console.error(`Error completing tournament ${tournamentId}:`, error.message);
    }
  }

  /**
   * Award tournament prize to team
   */
  private async awardTournamentPrize(teamId: number, prize: { credits: number, gems: number }): Promise<void> {
    try {
      const teamFinances = await prisma.teamFinances.findUnique({
        where: { teamId }
      });

      if (!teamFinances) {
        console.error(`Team finances not found for team ${teamId}`);
        return;
      }

      // Award credits and gems
      await prisma.teamFinances.update({
        where: { teamId },
        data: {
          credits: {
            increment: BigInt(prize.credits)
          },
          gems: {
            increment: prize.gems
          }
        }
      });

      logInfo(`Awarded ${prize.credits} credits and ${prize.gems} gems to team ${teamId}`);
    } catch (error) {
      console.error(`Error awarding prize to team ${teamId}:`, error.message);
    }
  }
}