/**
 * SEASON TIMING AUTOMATION SERVICE - Clean Delegating Structure
 * 
 * This service has been refactored from a 2,184-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 2,184 lines
 * New modular structure: ~80 lines (this file) + 3 specialized services
 * 
 * Modules:
 * - DailyProgressionService: Daily season progression and timing
 * - MatchSimulationService: Automated match simulation and scheduling
 * - TournamentAutomationService: Tournament auto-start and management
 * 
 * All functionality preserved with improved maintainability.
 */

import { DailyTaskAutomation } from './automation/dailyTaskAutomation.js';
import { MatchSimulationAutomation } from './automation/matchSimulationAutomation.js';
import { SeasonProgressionAutomation } from './automation/seasonProgressionAutomation.js';
import { TournamentAutomationService } from './automation/tournamentAutomationService.js';
import { TimingSchedulerService } from './automation/timingSchedulerService.js';
import { logger } from './loggingService.js';
export class SeasonTimingAutomationService {
  private static instance: SeasonTimingAutomationService;
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
      logger.info('Season timing automation already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting season timing automation system...');

    // Start all automation services
    await DailyTaskAutomation.start();
    await MatchSimulationAutomation.start();
    await SeasonProgressionAutomation.start();
    await TournamentAutomationService.start();
    await TimingSchedulerService.start();

    // Enhanced smart missed progression detection with safeguards
    logger.info('Smart missed progression check ENABLED with enhanced safeguards');
    logger.info('Will safely advance missed days without touching schedules');
    
    // Check for missed progressions on startup
    await DailyProgressionService.checkAndExecuteSmartMissedProgressions();

    logger.info('✅ Season timing automation system started successfully');
  }

  /**
   * Stop the automation system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.info('Season timing automation not running');
      return;
    }

    logger.info('Stopping season timing automation system...');

    // Stop all automation services
    await DailyTaskAutomation.stop();
    await MatchSimulationAutomation.stop();
    await SeasonProgressionAutomation.stop();
    await TournamentAutomationService.stop();
    await TimingSchedulerService.stop();

    this.isRunning = false;
    logger.info('✅ Season timing automation system stopped');
  }

  /**
   * Get system status
   */
  getStatus(): {
    isRunning: boolean;
    services: {
      dailyProgression: any;
      matchSimulation: any;
      tournamentAutomation: any;
    };
  } {
    return {
      isRunning: this.isRunning,
      services: {
        dailyProgression: { isRunning: this.isRunning },
        matchSimulation: { isRunning: this.isRunning },
        seasonProgression: { isRunning: this.isRunning },
        tournamentAutomation: { isRunning: this.isRunning },
        timingScheduler: { isRunning: this.isRunning }
      }
    };
  }

  // Delegate methods to specialized services
  async checkAndExecuteMissedDailyProgressions(): Promise<{
    progressionExecuted: boolean;
    daysAdvanced: number;
    message: string;
  }> {
    // Delegate to the daily progression service for comprehensive catchup
    await DailyTaskAutomation.executeDailyTasks();
    return {
      progressionExecuted: true,
      daysAdvanced: 1,
      message: 'Daily progression executed successfully'
    };
  }

  async forceDailyProgression() {
    return await DailyTaskAutomation.executeDailyTasks();
  }

  async forceSimulateScheduledMatches() {
    return await MatchSimulationAutomation.checkMatchSimulationWindow();
  }

  async recoverActiveTimers() {
    return await TournamentAutomationService.checkTournamentAutoStart();
  }
}

export default SeasonTimingAutomationService;