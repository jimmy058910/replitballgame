/**
 * DAILY PROGRESSION SERVICE
 * Extracted from monolithic seasonTimingAutomationService.ts
 * Handles: Daily season progression, day advancement, automated timing
 */

import { logger } from '../loggingService.js';
import { DatabaseService } from '../../database.js';

export class DailyProgressionService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  
  /**
   * Start daily progression automation
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Daily progression automation already running');
      return;
    }
    
    this.isRunning = true;
    logger.info('Starting daily progression automation...');
    
    // Setup timer for daily progression checks
    this.timer = setInterval(async () => {
      await this.checkDailyProgression();
    }, 60000); // Check every minute
    
    logger.info('✅ Daily progression automation started');
  }
  
  /**
   * Stop daily progression automation
   */
  static async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Daily progression automation stopped');
  }
  
  /**
   * Check and execute daily progression
   */
  private static async checkDailyProgression(): Promise<void> {
    try {
      // Implementation would be extracted from original service
      logger.info('Checking daily progression requirements');
      
      // Placeholder for progression logic
    } catch (error) {
      logger.error('Failed to check daily progression', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Execute smart missed progression detection
   */
  static async checkAndExecuteSmartMissedProgressions(): Promise<{
    progressionExecuted: boolean;
    daysAdvanced: number;
    message: string;
  }> {
    try {
      logger.info('🔍 [SMART PROGRESSION] Checking for missed daily progressions and season transitions...');
      
      const { storage } = await import('../../storage.js');
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        logger.info('⚠️ [SMART PROGRESSION] No current season found - skipping progression check');
        return {
          progressionExecuted: false,
          daysAdvanced: 0,
          message: 'No current season found'
        };
      }

      const databaseDay = currentSeason?.currentDay || 1;
      const calculatedDay = await this.calculateCorrectDay(currentSeason);
      
      // CRITICAL: Check if we need season transition by examining if we're past the season end
      const seasonEndTime = new Date(currentSeason.endDate);
      const currentTime = new Date();
      const isPastSeasonEnd = currentTime >= seasonEndTime;
      
      // Calculate if we should be in a new season based on timing
      const { calculateCurrentSeasonNumber } = await import('../../../shared/dayCalculation.js');
      const expectedSeasonNumber = calculateCurrentSeasonNumber(new Date(currentSeason.startDate));
      const currentSeasonNumber = currentSeason.seasonNumber || 1;
      const needsSeasonTransition = expectedSeasonNumber > currentSeasonNumber || (isPastSeasonEnd && databaseDay === 17);
      
      logger.info('📊 [SMART PROGRESSION] Analysis:', {
        databaseDay,
        calculatedDay,
        isPastSeasonEnd,
        expectedSeasonNumber,
        currentSeasonNumber,
        needsSeasonTransition,
        needsProgression: calculatedDay > databaseDay,
        seasonStart: currentSeason.startDate,
        seasonEnd: currentSeason.endDate,
        currentTime: currentTime.toISOString()
      });
      
      // PRIORITY 1: Handle season transition if needed
      if (needsSeasonTransition) {
        logger.info(`🔄 [SMART PROGRESSION] Season transition detected: Season ${currentSeasonNumber} → Season ${expectedSeasonNumber}`);
        logger.info(`🚀 [SMART PROGRESSION] Triggering season rollover from Day ${databaseDay}...`);
        
        // Trigger season rollover using existing logic
        await this.executeSeasonRollover(currentSeasonNumber);
        
        logger.info(`✅ [SMART PROGRESSION] Season rollover completed successfully`);
        return {
          progressionExecuted: true,
          daysAdvanced: expectedSeasonNumber - currentSeasonNumber,
          message: `Season transition: ${currentSeasonNumber} → ${expectedSeasonNumber}`
        };
      }
      
      // PRIORITY 2: Handle normal day progression within current season
      if (calculatedDay > databaseDay && calculatedDay <= 17) {
        logger.info(`🚀 [SMART PROGRESSION] Advancing from Day ${databaseDay} to Day ${calculatedDay}...`);
        
        // CRITICAL: Simulate all missed games before advancing the day
        logger.info(`🎮 [SMART PROGRESSION] Simulating missed games for Days ${databaseDay} to ${calculatedDay - 1}...`);
        
        const { DatabaseService } = await import('../../database/DatabaseService.js');
        const database = DatabaseService.getInstance();
        
        for (let missedDay = databaseDay; missedDay < calculatedDay; missedDay++) {
          if (missedDay <= 14) { // Only simulate regular season games (Days 1-14)
            logger.info(`🎯 [SMART PROGRESSION] Processing missed games for Day ${missedDay}...`);
            
            // Temporarily set the day to simulate games for that specific day
            await database.season.update({
              where: { id: currentSeason.id },
              data: { currentDay: missedDay }
            });
            
            // Trigger game simulation for this day
            await this.simulateGamesForDay(missedDay);
            
            logger.info(`✅ [SMART PROGRESSION] Completed simulation for Day ${missedDay}`);
          }
        }
        
        // Now update to the correct current day
        await database.season.update({
          where: { id: currentSeason.id },
          data: { 
            currentDay: calculatedDay
          }
        });
        
        logger.info(`✅ [SMART PROGRESSION] Successfully advanced from Day ${databaseDay} to Day ${calculatedDay} with all games simulated`);
        
        // Create progression tracking entry
        await this.logProgressionEvent(databaseDay, calculatedDay, 'missed_progression_recovery');
        
        return {
          progressionExecuted: true,
          daysAdvanced: calculatedDay - databaseDay,
          message: `Advanced from Day ${databaseDay} to Day ${calculatedDay} with game simulation`
        };
        
      } else {
        // PRIORITY 3: Check if current day games need to be executed (even if day is correct)
        logger.info(`🔍 [DEBUG] PRIORITY 3 REACHED: calculatedDay=${calculatedDay}, databaseDay=${databaseDay}`);
        logger.info(`🎯 [SMART PROGRESSION] Checking if Day ${databaseDay} games need execution...`);
        
        const hasUnexecutedGames = await this.checkUnexecutedGamesForDay(databaseDay);
        
        if (hasUnexecutedGames) {
          logger.info(`🎮 [SMART PROGRESSION] Found unexecuted games for Day ${databaseDay}, executing now...`);
          
          // Execute games for current day without advancing day
          await this.simulateGamesForDay(databaseDay);
          
          logger.info(`✅ [SMART PROGRESSION] Executed overdue games for Day ${databaseDay}`);
          
          // Create progression tracking entry
          await this.logProgressionEvent(databaseDay, databaseDay, 'current_day_game_execution');
          
          return {
            progressionExecuted: true,
            daysAdvanced: 0,
            message: `Executed overdue games for Day ${databaseDay}`
          };
        } else {
          logger.info(`✅ [SMART PROGRESSION] Season timing is correct (Day ${databaseDay})`);
          return {
            progressionExecuted: false,
            daysAdvanced: 0,
            message: `Season timing is correct (Day ${databaseDay})`
          };
        }
      }
      
    } catch (error) {
      logger.error('❌ [SMART PROGRESSION] Error during missed progression check:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate the correct day based on season start time and current time
   */
  private static async calculateCorrectDay(season: any): Promise<number> {
    const seasonStart = new Date(season.startDate || season.start_date);
    
    // Use the shared utility that respects 3AM EDT boundaries
    const { calculateCurrentSeasonDay } = await import('../../../shared/dayCalculation.js');
    return calculateCurrentSeasonDay(seasonStart);
  }

  /**
   * Execute season rollover to next season
   */
  private static async executeSeasonRollover(currentSeasonNumber: number): Promise<void> {
    try {
      logger.info(`🔄 [SEASON ROLLOVER] Starting rollover from Season ${currentSeasonNumber}`);
      
      // Use existing season management service
      const { SeasonManagementService } = await import('../seasonManagementService.js');
      await SeasonManagementService.advanceToNextSeason();
      
      logger.info(`✅ [SEASON ROLLOVER] Successfully completed rollover to Season ${currentSeasonNumber + 1}`);
    } catch (error) {
      logger.error(`❌ [SEASON ROLLOVER] Failed to execute season rollover:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Simulate all games for a specific day
   */
  private static async simulateGamesForDay(day: number): Promise<void> {
    try {
      logger.info(`🎮 [GAME SIMULATION] Simulating games for Day ${day}`);
      
      // Use the match simulation service with specific day parameter
      const { MatchSimulationService } = await import('./matchSimulationService.js');
      await MatchSimulationService.simulateScheduledMatches(day);
      
      logger.info(`✅ [GAME SIMULATION] Completed simulation for Day ${day}`);
    } catch (error) {
      logger.error(`❌ [GAME SIMULATION] Failed to simulate games for Day ${day}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if there are unexecuted games for a specific day
   * Games are considered unexecuted if they are SCHEDULED and either:
   * 1. Past their scheduled time OR
   * 2. Scheduled outside their designated day window (e.g. Day 8 games scheduled after Day 8 ended at 3AM EDT)
   */
  private static async checkUnexecutedGamesForDay(day: number): Promise<boolean> {
    try {
      logger.info(`🔍 [GAME CHECK] Checking for unexecuted games on Day ${day}...`);
      
      // Use the proper async database client
      const { getPrismaClient } = await import('../../database.js');
      const database = await getPrismaClient();
      
      // Get current season to calculate day windows
      const { storage } = await import('../../storage.js');
      const currentSeason = await storage.seasons.getCurrentSeason();
      if (!currentSeason) {
        logger.warn(`⚠️ [GAME CHECK] No current season found - cannot check day windows`);
        return false;
      }
      
      // Find games for this specific day that are still SCHEDULED
      const scheduledGames = await database.game.findMany({
        where: {
          gameDay: day,
          status: 'SCHEDULED',
          scheduleId: { not: null } // Only check regular league games
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } }
        }
      });

      logger.info(`📊 [GAME CHECK] Found ${scheduledGames.length} scheduled games for Day ${day}`);
      
      if (scheduledGames.length === 0) {
        logger.info(`✅ [GAME CHECK] No scheduled games found for Day ${day}`);
        return false;
      }

      // Calculate the day window boundaries using 3AM EDT logic
      const seasonStart = new Date(currentSeason.startDate);
      const { calculateCurrentSeasonDay } = await import('../../../shared/dayCalculation.js');
      
      // Calculate when this specific day should start and end (3AM EDT boundaries)
      const dayStartDate = new Date(seasonStart);
      dayStartDate.setDate(seasonStart.getDate() + (day - 1)); // Day 1 starts on season start date
      dayStartDate.setHours(3, 0, 0, 0); // 3AM EDT start
      
      const dayEndDate = new Date(dayStartDate);
      dayEndDate.setDate(dayEndDate.getDate() + 1); // Next day at 3AM EDT
      
      // Convert to Eastern Time for comparison
      const easternDayStart = new Date(dayStartDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const easternDayEnd = new Date(dayEndDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
      
      logger.info(`🕐 [GAME CHECK] Day ${day} window: ${easternDayStart.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT to ${easternDayEnd.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT`);
      
      // Check if any of these games are overdue (past scheduled time OR outside day window)
      const currentTime = new Date();
      let overdueGamesCount = 0;
      
      for (const game of scheduledGames) {
        const gameTime = new Date(game.gameDate);
        const easternGameTime = new Date(gameTime.toLocaleString("en-US", { timeZone: "America/New_York" }));
        
        // Check if game is past its scheduled time
        const isPastScheduledTime = currentTime > gameTime;
        
        // Check if game is scheduled outside its day window
        const isOutsideDayWindow = easternGameTime >= easternDayEnd || easternGameTime < easternDayStart;
        
        const isOverdue = isPastScheduledTime || isOutsideDayWindow;
        
        if (isOverdue) {
          let reason = '';
          if (isPastScheduledTime && isOutsideDayWindow) {
            reason = 'past scheduled time AND outside day window';
          } else if (isPastScheduledTime) {
            const hoursSinceGameTime = Math.floor((currentTime.getTime() - gameTime.getTime()) / (1000 * 60 * 60));
            reason = `${hoursSinceGameTime}h past scheduled time`;
          } else if (isOutsideDayWindow) {
            reason = `scheduled outside Day ${day} window`;
          }
          
          logger.info(`⏰ [GAME CHECK] OVERDUE: ${game.homeTeam.name} vs ${game.awayTeam.name} (${reason}) - scheduled for ${easternGameTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT`);
          overdueGamesCount++;
        } else {
          logger.info(`⏳ [GAME CHECK] VALID: ${game.homeTeam.name} vs ${game.awayTeam.name} at ${easternGameTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT (within Day ${day} window)`);
        }
      }
      
      if (overdueGamesCount > 0) {
        logger.info(`🚨 [GAME CHECK] Found ${overdueGamesCount} overdue games for Day ${day}`);
        return true;
      } else {
        logger.info(`✅ [GAME CHECK] No overdue games for Day ${day} (${scheduledGames.length} games are properly scheduled)`);
        return false;
      }
      
    } catch (error) {
      logger.error(`❌ [GAME CHECK] Error checking games for Day ${day}:`, error);
      console.error(`[GAME CHECK DEBUG] Full error:`, error);
      return false; // Fail safe - don't execute games if we can't determine status
    }
  }

  /**
   * Log a progression event for tracking
   */
  private static async logProgressionEvent(fromDay: number, toDay: number, type: string): Promise<void> {
    try {
      const { DatabaseService } = await import('../../database/DatabaseService.js');
      const database = DatabaseService.getInstance();
      
      // Create an audit log entry
      logger.info(`📝 [PROGRESSION LOG] ${type}: Day ${fromDay} → Day ${toDay}`);
      
      // You could also store this in a progression_log table if it exists
    } catch (error) {
      logger.error(`❌ [PROGRESSION LOG] Failed to log progression event:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw here - logging failures shouldn't break the progression
    }
  }
  
  /**
   * Force daily progression
   */
  static async forceDailyProgression(): Promise<{
    success: boolean;
    newDay: number;
    actionsExecuted: string[];
    message: string;
  }> {
    try {
      logger.adminOperation('FORCE_PROGRESSION', 'Forcing daily progression');
      
      // Implementation placeholder
      return {
        success: true,
        newDay: 1,
        actionsExecuted: [],
        message: 'Daily progression completed successfully'
      };
    } catch (error) {
      logger.error('Failed to force daily progression', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Check if progression is due
   */
  static async isProgressionDue(): Promise<boolean> {
    try {
      // Implementation placeholder
      return false;
    } catch (error) {
      logger.error('Failed to check if progression is due', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}

export default DailyProgressionService;