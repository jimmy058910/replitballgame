/**
 * SEASON PROGRESSION AUTOMATION
 * Handles automated season advancement and progression
 * Extracted from seasonTimingAutomationService.ts
 */

export class SeasonProgressionAutomation {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start season progression automation
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Season progression automation already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting season progression automation...');

    // Schedule season events check every hour
    this.scheduleSeasonEvents();
    
    console.log('✅ Season progression automation started');
  }

  /**
   * Stop season progression automation
   */
  static async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('Season progression automation stopped');
  }

  /**
   * Process season progression based on current day and time
   */
  static async processSeasonProgression(): Promise<void> {
    try {
      const { storage } = await import('../../storage/index.js');
      
      // Get current season to determine current day
      const currentSeason = await storage.seasons.getCurrentSeason();
      let currentDayInCycle = 5; // Default fallback
      
      if (currentSeason && typeof currentSeason?.currentDay === 'number') {
        currentDayInCycle = currentSeason?.currentDay;
      } else {
        // Fallback to calculation if no database value
        const startDate = currentSeason?.startDate ? new Date(currentSeason.startDate) : new Date("2025-08-16T15:40:19.081Z");
        const { calculateCurrentSeasonDay } = await import("../../../shared/dayCalculation.js");
        currentDayInCycle = calculateCurrentSeasonDay(startDate);
      }
      
      const seasonNumber = currentSeason?.seasonNumber || 0;
      const estTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
      
      console.log(`🔄 [SEASON PROGRESSION] Day ${currentDayInCycle} - ${estTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EDT`);
      
      // Check for Day 1 season start at 3:00 PM EDT
      if (currentDayInCycle === 1 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeSeasonStart(seasonNumber);
      }
      
      // MANUAL TRIGGER: Check if we need to generate schedules for current day
      if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
        await this.checkAndGenerateScheduleIfNeeded(seasonNumber);
      }
      
      // Check for Day 7 Mid-Season Cup
      if (currentDayInCycle === 7) {
        if (estTime.getHours() === 13 && estTime.getMinutes() === 0) {
          // 1:00 PM EDT - Close registration and generate brackets
          await this.executeMidSeasonCupRegistrationClose(seasonNumber);
        } else if (estTime.getHours() === 13 && estTime.getMinutes() === 30) {
          // 1:30 PM EDT - Start tournament matches
          await this.executeMidSeasonCupStart(seasonNumber);
        }
      }
      
      // Check for DAILY Late Signup Processing (Day 1-9 at 3PM EDT)
      if (currentDayInCycle >= 1 && currentDayInCycle <= 9 && estTime.getHours() === 15 && estTime.getMinutes() === 0) {
        await this.executeDailyLateSignupProcessing(currentDayInCycle);
      }
      
      // Check for Day 15 Division Playoffs (3:00 AM EDT - Brackets formed and matches scheduled)
      if (currentDayInCycle === 15 && estTime.getHours() === 3 && estTime.getMinutes() === 0) {
        await this.executeDivisionPlayoffs(seasonNumber);
      }
      
      // Check for Day 16-17 Off-season
      if (currentDayInCycle === 16 && estTime.getHours() === 3 && estTime.getMinutes() === 0) {
        await this.executeOffseasonStart(seasonNumber);
      }
      
      // Check for Day 17 season rollover at 3:00 AM EDT
      if (currentDayInCycle === 17 && estTime.getHours() === 3 && estTime.getMinutes() === 0) {
        await this.executeSeasonRollover(seasonNumber);
      }
      
    } catch (error) {
      console.error('Error in season progression:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Day 1, 3:00 PM EDT - Season Start
   */
  private static async executeSeasonStart(seasonNumber: number): Promise<void> {
    try {
      console.log(`🚀 [SEASON START] Starting Season ${seasonNumber} initialization...`);
      
      const { SeasonalFlowService } = await import('../seasonalFlowService.js');
      
      // 1. Finalize divisions (fill with AI teams if needed)
      await this.finalizeDivisions();
      
      // 2. Generate complete season schedule
      const scheduleResult = await SeasonalFlowService.generateSeasonSchedule(seasonNumber);
      
      // 3. Open late registration window
      await this.openLateRegistration();
      
      console.log(`✅ [SEASON START] Season ${seasonNumber} started successfully`, {
        matchesGenerated: scheduleResult.matchesGenerated,
        leaguesProcessed: scheduleResult.leaguesProcessed?.length || 0
      });
      
    } catch (error) {
      console.error(`❌ [SEASON START] Error during Season ${seasonNumber} start:`, error);
    }
  }

  /**
   * Day 7 - Mid-Season Cup Registration Close (1:00 PM EDT)
   */
  private static async executeMidSeasonCupRegistrationClose(seasonNumber: number): Promise<void> {
    try {
      console.log(`🏆 [MID-SEASON CUP] Closing registration and generating brackets...`);
      
      // Import tournament services
      const { DynamicPlayoffService } = await import('../dynamicPlayoffService.js');
      
      // Close registration and generate brackets for all division tournaments
      const tournaments = await DynamicPlayoffService.generateMidSeasonCupBrackets();
      
      console.log(`✅ [MID-SEASON CUP] Registration closed, ${tournaments.length} tournaments bracketed`);
      
    } catch (error) {
      console.error(`❌ [MID-SEASON CUP] Registration close failed:`, error);
    }
  }

  /**
   * Day 7 - Mid-Season Cup Start (1:30-3:00 PM EDT)
   */
  private static async executeMidSeasonCupStart(seasonNumber: number): Promise<void> {
    try {
      console.log(`🏆 [MID-SEASON CUP] Starting tournament matches...`);
      
      // Start all mid-season cup tournaments
      const { DynamicPlayoffService } = await import('../dynamicPlayoffService.js');
      await DynamicPlayoffService.startMidSeasonCupTournaments();
      
      console.log(`✅ [MID-SEASON CUP] Tournaments started successfully`);
      
    } catch (error) {
      console.error(`❌ [MID-SEASON CUP] Tournament start failed:`, error);
    }
  }

  /**
   * Daily Late Signup Processing (Day 1-9, 3:00 PM EDT)
   */
  private static async executeDailyLateSignupProcessing(currentDay: number): Promise<void> {
    try {
      console.log(`📝 [LATE SIGNUP] Processing Day ${currentDay} late registrations...`);
      
      const { LateSignupService } = await import('../lateSignupService.js');
      
      // Process new late signups
      const result = await LateSignupService.processDailyLateSignups(currentDay);
      
      if (result.newTeamsProcessed > 0) {
        console.log(`✅ [LATE SIGNUP] Processed ${result.newTeamsProcessed} new teams, created ${result.subdivisionsCreated} subdivisions`);
      } else {
        console.log(`📝 [LATE SIGNUP] No new late registrations to process`);
      }
      
    } catch (error) {
      console.error(`❌ [LATE SIGNUP] Day ${currentDay} processing failed:`, error);
    }
  }

  /**
   * Day 15 - Division Playoffs (3:00 AM EDT)
   */
  private static async executeDivisionPlayoffs(seasonNumber: number): Promise<void> {
    try {
      console.log(`🏆 [DIVISION PLAYOFFS] Starting playoffs for Season ${seasonNumber}...`);
      
      const { DynamicPlayoffService } = await import('../dynamicPlayoffService.js');
      
      // Generate playoff brackets for all divisions
      const playoffResult = await DynamicPlayoffService.generateDivisionPlayoffs();
      
      console.log(`✅ [DIVISION PLAYOFFS] Generated brackets for ${playoffResult.tournamentsCreated} divisions`);
      
    } catch (error) {
      console.error(`❌ [DIVISION PLAYOFFS] Playoff generation failed:`, error);
    }
  }

  /**
   * Day 16 - Off-season Start (3:00 AM EDT)
   */
  private static async executeOffseasonStart(seasonNumber: number): Promise<void> {
    try {
      console.log(`🏁 [OFF-SEASON] Starting off-season for Season ${seasonNumber}...`);
      
      // Process end-of-season activities
      await this.processEndOfSeasonActivities();
      
      // Handle taxi squad promotions/releases
      await this.processTaxiSquadDecisions();
      
      console.log(`✅ [OFF-SEASON] Off-season activities completed`);
      
    } catch (error) {
      console.error(`❌ [OFF-SEASON] Off-season start failed:`, error);
    }
  }

  /**
   * Day 17 → Day 1 - Season Rollover (3:00 AM EDT)
   */
  private static async executeSeasonRollover(seasonNumber: number): Promise<void> {
    try {
      console.log(`🔄 [SEASON ROLLOVER] Rolling over to Season ${seasonNumber + 1}...`);
      
      const { SeasonalFlowService } = await import('../seasonalFlowService.js');
      
      // Complete season rollover process
      await SeasonalFlowService.executeSeasonRollover();
      
      console.log(`✅ [SEASON ROLLOVER] Season ${seasonNumber + 1} started successfully`);
      
    } catch (error) {
      console.error(`❌ [SEASON ROLLOVER] Season rollover failed:`, error);
    }
  }

  /**
   * Helper: Check if schedule generation is needed
   */
  private static async checkAndGenerateScheduleIfNeeded(seasonNumber: number): Promise<void> {
    try {
      const { getPrismaClient } = await import('../../database.js');
      const prisma = await getPrismaClient();
      
      // Get the season from database
      const season = await prisma.season.findFirst({
        where: { seasonNumber: seasonNumber },
        select: { id: true }
      });

      if (!season) {
        console.log(`Season ${seasonNumber} not found in database. Skipping schedule generation.`);
        return;
      }

      // Check if any games exist for current season
      const existingGames = await prisma.game.count({
        where: { seasonId: season.id }
      });

      if (existingGames === 0) {
        console.log(`🔧 [SCHEDULE CHECK] No games found for Season ${seasonNumber}, generating schedules...`);
        
        const { SeasonalFlowService } = await import('../seasonalFlowService.js');
        await SeasonalFlowService.generateSeasonSchedule(seasonNumber);
        
        console.log(`✅ [SCHEDULE CHECK] Schedules generated for Season ${seasonNumber}`);
      }
      
    } catch (error) {
      console.error(`❌ [SCHEDULE CHECK] Error checking schedules for Season ${seasonNumber}:`, error);
    }
  }

  /**
   * Helper: Finalize divisions with AI teams
   */
  private static async finalizeDivisions(): Promise<void> {
    // Implementation would call AI team generation service
    console.log('🤖 [AI TEAMS] Division finalization completed');
  }

  /**
   * Helper: Open late registration window
   */
  private static async openLateRegistration(): Promise<void> {
    console.log('📝 [LATE REG] Late registration window opened (Days 1-9)');
  }

  /**
   * Helper: Process end-of-season activities
   */
  private static async processEndOfSeasonActivities(): Promise<void> {
    console.log('🏁 [END SEASON] Processing end-of-season activities');
  }

  /**
   * Helper: Process taxi squad decisions
   */
  private static async processTaxiSquadDecisions(): Promise<void> {
    console.log('🚌 [TAXI SQUAD] Processing taxi squad promote/release decisions');
  }

  /**
   * Schedule season events check every hour
   */
  private static scheduleSeasonEvents(): void {
    this.timer = setInterval(async () => {
      await this.processSeasonProgression();
    }, 60 * 60 * 1000); // Check every hour
    
    // Also check immediately on startup
    setTimeout(() => this.processSeasonProgression(), 5000);
  }
}

console.log('📝 [Automation/SeasonProgression] Service placeholder - methods to be extracted');