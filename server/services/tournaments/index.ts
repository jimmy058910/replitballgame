/**
 * TOURNAMENT SERVICES INDEX
 * Coordinates all tournament service modules
 * Replaces the monolithic tournamentService.ts (1,444 lines)
 */

import { TournamentCreationService } from './tournamentCreationService.js';
import { TournamentBracketService } from './tournamentBracketService.js';
import { TournamentMatchService } from './tournamentMatchService.js';
import { TournamentRewardsService } from './tournamentRewardsService.js';

// Re-export all services for backward compatibility
export {
  TournamentCreationService,
  TournamentBracketService,
  TournamentMatchService,
  TournamentRewardsService
};

// Main coordinating service that combines all tournament functionality
export class TournamentService {
  // Delegate to specialized services
  static creationService = TournamentCreationService;
  static bracketService = TournamentBracketService;
  static matchService = TournamentMatchService;
  static rewardsService = TournamentRewardsService;

  // Maintain backward compatibility for existing code
  static async createTournament(...args: any[]) {
    return TournamentCreationService.createTournament(...args);
  }

  static async generateBracket(...args: any[]) {
    return TournamentBracketService.generateBracket(...args);
  }

  static async processMatch(...args: any[]) {
    return TournamentMatchService.processMatch(...args);
  }

  static async distributeRewards(...args: any[]) {
    return TournamentRewardsService.distributeRewards(...args);
  }
}

console.log('✅ [Tournaments] Modular tournament services loaded successfully');