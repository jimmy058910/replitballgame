/**
 * DAILY TASK AUTOMATION
 * Handles daily automated tasks and maintenance
 * Extracted from seasonTimingAutomationService.ts
 */

export class DailyTaskAutomation {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start daily task automation - schedules execution at 3:00 AM EDT
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Daily task automation already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting daily task automation...');

    // Schedule daily execution at 3:00 AM EDT
    this.scheduleNextExecution();
    console.log('✅ Daily task automation started');
  }

  /**
   * Stop daily task automation
   */
  static async stop(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('Daily task automation stopped');
  }

  /**
   * Execute all 6 critical daily tasks at 3:00 AM EDT
   */
  static async executeDailyTasks(): Promise<void> {
    try {
      const executionTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      console.log(`🚀 [DAILY PROGRESSION] Starting at ${executionTime} EDT`);

      // Import services
      const { storage } = await import('../../storage/index.js');
      const { DailyPlayerProgressionService } = await import('../dailyPlayerProgressionService.js');
      const { AgingService } = await import('../agingService.js');
      const { InjuryStaminaService } = await import('../injuryStaminaService.js');

      // Get current season
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        console.error('❌ [DAILY PROGRESSION] No current season found - aborting');
        return;
      }

      const currentDay = currentSeason.currentDay || 1;
      const nextDay = currentDay + 1;
      const isEndOfSeason = currentDay === 16; // Day 16→17 transition

      console.log(`🔄 [DAILY PROGRESSION] Processing Day ${currentDay} → Day ${nextDay}, End of season: ${isEndOfSeason}`);

      // 1. Daily Player Progression Service
      console.log('🔄 [SERVICE 1/6] Executing daily player progression...');
      await DailyPlayerProgressionService.executeDailyProgression();
      console.log('✅ [SERVICE 1/6] Daily player progression completed');

      // 2. Aging Service (only at end of season)
      if (isEndOfSeason) {
        console.log('🔄 [SERVICE 2/6] Executing aging and retirement (end of season)...');
        await AgingService.processAging();
        console.log('✅ [SERVICE 2/6] Aging and retirement completed');
      } else {
        console.log('ℹ️  [SERVICE 2/6] Aging skipped - only occurs at end of season');
      }

      // 3. Injury & Stamina Service
      console.log('🔄 [SERVICE 3/6] Executing injury recovery and stamina restoration...');
      await InjuryStaminaService.performDailyReset();
      console.log('✅ [SERVICE 3/6] Injury recovery and stamina restoration completed');

      // 4. Stadium Daily Costs Processing
      console.log('🔄 [SERVICE 4/6] Processing stadium maintenance costs...');
      await this.processStadiumMaintenanceCosts();
      console.log('✅ [SERVICE 4/6] Stadium maintenance costs completed');

      // 5. Daily Limits Reset
      console.log('🔄 [SERVICE 5/6] Resetting daily limits...');
      await this.resetDailyLimits();
      console.log('✅ [SERVICE 5/6] Daily limits reset completed');

      // 6. Season Day Advancement
      console.log('🔄 [SERVICE 6/6] Advancing season day...');
      await this.updateSeasonDay();
      console.log('✅ [SERVICE 6/6] Season day advancement completed');

      const completionTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      console.log(`✅ [DAILY PROGRESSION] All 6 services completed successfully at ${completionTime} EDT`);

    } catch (error) {
      console.error('❌ [DAILY PROGRESSION] Error during execution:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [DAILY PROGRESSION] Full error:', error);
    }
  }

  /**
   * Schedule next execution at 3:00 AM EDT
   */
  private static scheduleNextExecution(): void {
    const scheduleNext = () => {
      const nextExecution = this.getNextExecutionTime(3, 0); // 3:00 AM EDT
      const timeUntilExecution = nextExecution.getTime() - Date.now();
      
      console.log(`Daily progression scheduled for ${nextExecution.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT`);
      
      // Clear existing timer
      if (this.timer) {
        clearTimeout(this.timer);
      }
      
      this.timer = setTimeout(async () => {
        await this.executeDailyTasks();
        scheduleNext(); // Schedule next execution
      }, timeUntilExecution);
    };

    scheduleNext();
  }

  /**
   * Calculate next execution time for given hour/minute in EDT
   */
  private static getNextExecutionTime(hour: number, minute: number): Date {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    let nextExecution = new Date();
    nextExecution.setHours(hour, minute, 0, 0);
    
    // Convert to EDT
    const offset = easternTime.getTime() - now.getTime();
    nextExecution = new Date(nextExecution.getTime() + offset);
    
    // If time has passed today, schedule for tomorrow
    if (nextExecution <= now) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }
    
    return nextExecution;
  }

  /**
   * SERVICE 4: Stadium Daily Costs Processing
   * Deducts 1% of total stadium investment value daily
   */
  private static async processStadiumMaintenanceCosts(): Promise<void> {
    try {
      const { storage } = await import('../../storage/index.js');
      const teams = await storage.teams.findMany({
        include: {
          stadium: true,
          finances: true
        }
      });

      for (const team of teams) {
        if (team.stadium && team.finances) {
          // Calculate 1% of total stadium investment
          const totalInvestment = (team.stadium.concessionLevel * 50000) + 
                                 (team.stadium.parkingLevel * 30000) + 
                                 (team.stadium.vipSuiteLevel * 100000) + 
                                 (team.stadium.merchandisingLevel * 25000);
          
          const maintenanceCost = Math.floor(totalInvestment * 0.01);
          
          if (maintenanceCost > 0) {
            // Deduct maintenance cost
            const newBalance = Math.max(0, team.finances.credits - maintenanceCost);
            
            await storage.teams.updateFinances(team.id, {
              credits: newBalance
            });
            
            console.log(`Stadium maintenance: Team ${team.teamName} charged ${maintenanceCost}₡`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing stadium maintenance costs:', error);
    }
  }

  /**
   * SERVICE 5: Daily Limits Reset
   * Resets exhibition game limits, tournament entries, and ad system
   */
  private static async resetDailyLimits(): Promise<void> {
    try {
      const { storage } = await import('../../storage/index.js');

      // Reset exhibition game limits (3 per day)
      await storage.teams.updateMany({}, {
        dailyExhibitionGames: 0
      });

      // Reset daily ad view counts
      await storage.teams.updateMany({}, {
        dailyAdsWatched: 0
      });

      // Reset tournament entry cooldowns
      await storage.teams.updateMany({}, {
        lastTournamentEntry: null
      });

      console.log('Daily limits reset: Exhibition games, ad views, tournament cooldowns');
    } catch (error) {
      console.error('Error resetting daily limits:', error);
    }
  }

  /**
   * SERVICE 6: Season Day Advancement
   * Advances currentDay from 1→2→3...→17, handles season rollover
   */
  private static async updateSeasonDay(): Promise<void> {
    try {
      const { storage } = await import('../../storage/index.js');
      const { SeasonalFlowService } = await import('../seasonalFlowService.js');

      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        console.error('No current season found for day advancement');
        return;
      }

      const currentDay = currentSeason.currentDay || 1;
      const nextDay = currentDay + 1;

      if (nextDay > 17) {
        // Season rollover: Day 17 → Day 1 of new season
        console.log('🔄 SEASON ROLLOVER: Day 17 → Day 1 of new season');
        await SeasonalFlowService.executeSeasonRollover();
        console.log('✅ SEASON ROLLOVER: New season started');
      } else {
        // Normal day advancement
        await storage.seasons.update(currentSeason.id, {
          currentDay: nextDay
        });
        console.log(`Season day advanced: Day ${currentDay} → Day ${nextDay}`);
      }
    } catch (error) {
      console.error('Error advancing season day:', error);
    }
  }
}

console.log('📝 [Automation/DailyTask] Service placeholder - methods to be extracted');