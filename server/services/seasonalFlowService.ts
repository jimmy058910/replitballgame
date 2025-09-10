/**
 * SEASONAL FLOW SERVICE - Clean Delegating Structure
 * 
 * This service has been refactored from a 2,297-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 2,297 lines
 * New modular structure: ~50 lines (this file) + 4 specialized services
 * 
 * Modules:
 * - ScheduleGenerationService: Season/division schedule creation
 * - PlayoffService: Playoff brackets and tournament management  
 * - PromotionRelegationService: League promotions, relegations, AI teams
 * - SeasonManagementService: Season rollover, standings, awards
 * 
 * All functionality preserved with improved maintainability.
 */

import ScheduleGenerationService from './seasonal/scheduleGenerationService.js';
import PlayoffService from './seasonal/playoffService.js';
import PromotionRelegationService from './seasonal/promotionRelegationService.js';
import SeasonManagementService from './seasonal/seasonManagementService.js';
import { logger } from './loggingService.js';
export class SeasonalFlowService {
  // Delegate all methods to specialized services
  static getCurrentDay = SeasonManagementService.getCurrentDay;
  static isTeamInDivisionPlayoffs = PlayoffService.isTeamInDivisionPlayoffs;
  static generateSeasonSchedule = ScheduleGenerationService.generateSeasonSchedule;
  static generatePremiumDivisionSchedule = ScheduleGenerationService.generatePremiumDivisionSchedule;
  static generateStandardSubdivisionSchedule = ScheduleGenerationService.generateStandardSubdivisionSchedule;
  static fixDivisionSchedule = ScheduleGenerationService.fixDivisionSchedule;
  static updateStandingsAfterMatch = SeasonManagementService.updateStandingsAfterMatch;
  static getFinalStandings = SeasonManagementService.getFinalStandings;
  static getTeamsWithStats = SeasonManagementService.getTeamsWithStats;
  static generatePlayoffBrackets = PlayoffService.generatePlayoffBrackets;
  static processPromotionRelegation = PromotionRelegationService.processPromotionRelegation;
  static getPlayoffChampions = PlayoffService.getPlayoffChampions;
  static rebalanceLeagues = PromotionRelegationService.rebalanceLeagues;
  static executePlayoffsToOffseasonTransition = PlayoffService.executePlayoffsToOffseasonTransition;
  static executeSeasonRollover = SeasonManagementService.executeSeasonRollover;
  static distributeEndOfSeasonAwards = SeasonManagementService.distributeEndOfSeasonAwards;
  static distributePrizeMoney = SeasonManagementService.distributePrizeMoney;
  static cleanupAITeams = PromotionRelegationService.cleanupAITeams;
  
  /**
   * Initialize seasonal flow services
   */
  static async initialize(): Promise<void> {
    logger.info('Initializing modular seasonal flow services');
    logger.info('✅ Seasonal flow services initialized successfully');
  }
}

export default SeasonalFlowService;