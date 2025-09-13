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

import DailyProgressionService from './automation/dailyProgressionService.js';
import MatchSimulationService from './automation/matchSimulationService.js';
import TournamentAutomationService from './automation/tournamentAutomationService.js';
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
    await DailyProgressionService.start();
    await MatchSimulationService.start();
    await TournamentAutomationService.start();

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
    await DailyProgressionService.stop();
    await MatchSimulationService.stop();
    await TournamentAutomationService.stop();

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
        matchSimulation: MatchSimulationService.getStatus(),
        tournamentAutomation: TournamentAutomationService.getStatus()
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
    return await DailyProgressionService.checkAndExecuteSmartMissedProgressions();
  }

  async forceDailyProgression() {
    return await DailyProgressionService.forceDailyProgression();
  }

  async forceSimulateScheduledMatches() {
    return await MatchSimulationService.forceSimulateScheduledMatches();
  }

  async recoverActiveTimers() {
    return await TournamentAutomationService.recoverActiveTimers();
  }
}

export default SeasonTimingAutomationService;