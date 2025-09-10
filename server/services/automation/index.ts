/**
 * TIMING AUTOMATION SERVICES INDEX
 * Coordinates all season timing automation modules
 * Replaces the monolithic seasonTimingAutomationService.ts (2,184 lines)
 */

import { MatchSimulationAutomation } from './matchSimulationAutomation.js';
import { SeasonProgressionAutomation } from './seasonProgressionAutomation.js';
import { DailyTaskAutomation } from './dailyTaskAutomation.js';
import { TimingSchedulerService } from './timingSchedulerService.js';

// Re-export all services for backward compatibility
export {
  MatchSimulationAutomation,
  SeasonProgressionAutomation,
  DailyTaskAutomation,
  TimingSchedulerService
};

// Main coordinating service that combines all timing automation
export class SeasonTimingAutomationService {
  private static instance: SeasonTimingAutomationService;

  static getInstance(): SeasonTimingAutomationService {
    if (!SeasonTimingAutomationService.instance) {
      SeasonTimingAutomationService.instance = new SeasonTimingAutomationService();
    }
    return SeasonTimingAutomationService.instance;
  }

  // Delegate to specialized automation services
  static matchAutomation = MatchSimulationAutomation;
  static progressionAutomation = SeasonProgressionAutomation;
  static dailyAutomation = DailyTaskAutomation;
  static scheduler = TimingSchedulerService;

  // Maintain backward compatibility for existing code
  async checkMatchSimulationWindow(...args: any[]) {
    return MatchSimulationAutomation.checkMatchSimulationWindow(...args);
  }

  async processSeasonProgression(...args: any[]) {
    return SeasonProgressionAutomation.processSeasonProgression(...args);
  }

  async executeDailyTasks(...args: any[]) {
    return DailyTaskAutomation.executeDailyTasks(...args);
  }

  async scheduleAutomation(...args: any[]) {
    return TimingSchedulerService.scheduleAutomation(...args);
  }
}

console.log('✅ [Automation] Modular timing automation services loaded successfully');