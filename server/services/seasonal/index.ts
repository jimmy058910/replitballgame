/**
 * SEASONAL SERVICES INDEX
 * Coordinates all seasonal flow service modules
 * Replaces the monolithic seasonalFlowService.ts (2,297 lines)
 */

import { SeasonScheduleService } from './seasonScheduleService.js';
import { PlayoffService } from './playoffService.js';
import { PromotionRelegationService } from './promotionRelegationService.js';
import { SeasonTransitionService } from './seasonTransitionService.js';
import { SeasonStandingsService } from './seasonStandingsService.js';
import { SeasonAIManagementService } from './seasonAIManagementService.js';

// Re-export all services for backward compatibility
export {
  SeasonScheduleService,
  PlayoffService, 
  PromotionRelegationService,
  SeasonTransitionService,
  SeasonStandingsService,
  SeasonAIManagementService
};

// Main coordinating service that combines all seasonal functionality
export class SeasonalFlowService {
  // Delegate to specialized services
  static scheduleService = SeasonScheduleService;
  static playoffService = PlayoffService;
  static promotionService = PromotionRelegationService;
  static transitionService = SeasonTransitionService;
  static standingsService = SeasonStandingsService;
  static aiService = SeasonAIManagementService;

  // Maintain backward compatibility for existing code
  static async generateSeasonSchedule(...args: any[]) {
    return SeasonScheduleService.generateSeasonSchedule(...args);
  }

  static async generatePlayoffBrackets(...args: any[]) {
    return PlayoffService.generatePlayoffBrackets(...args);
  }

  static async processPromotionRelegation(...args: any[]) {
    return PromotionRelegationService.processPromotionRelegation(...args);
  }

  static async executeSeasonRollover(...args: any[]) {
    return SeasonTransitionService.executeSeasonRollover(...args);
  }

  static async getFinalStandings(...args: any[]) {
    return SeasonStandingsService.getFinalStandings(...args);
  }

  static async cleanupAITeams(...args: any[]) {
    return SeasonAIManagementService.cleanupAITeams(...args);
  }

  // Add other key methods as needed for compatibility
}

console.log('✅ [Seasonal] Modular seasonal services loaded successfully');