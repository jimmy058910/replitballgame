/**
 * Centralized Team Statistics Calculator
 * 
 * Provides standardized win/loss/draw calculation logic used across all components.
 * Ensures consistent statistics calculation throughout the entire application.
 * 
 * SINGLE SOURCE OF TRUTH for team statistics calculations.
 */

import { getPrismaClient } from '../database.js';
import logger from './logger.js';
import { z } from 'zod';

// Validation schema for team statistics
export const TeamStatisticsSchema = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  draws: z.number().int().min(0),
  points: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0),
  pointsFor: z.number().int().min(0),
  pointsAgainst: z.number().int().min(0),
  pointsDifference: z.number().int()
});

export type TeamStatistics = z.infer<typeof TeamStatisticsSchema>;

// Game completion criteria - standardized across all components
export const GameCompletionCriteria = z.object({
  status: z.enum(['COMPLETED']).optional(),
  simulated: z.boolean().optional(),
  hasValidScores: z.boolean()
}).refine(data => 
  data.status === 'COMPLETED' || data.simulated === true || data.hasValidScores === true,
  { message: "Game must meet at least one completion criteria" }
);

/**
 * Standard team statistics calculator used across the entire application
 */
export class TeamStatisticsCalculator {
  private static serviceName = 'TeamStatisticsCalculator';

  /**
   * Calculate team statistics from completed games
   * This is the SINGLE SOURCE OF TRUTH for all statistics calculations
   * 
   * @param teamId - Team ID to calculate statistics for
   * @param teamName - Team name for logging purposes
   * @returns Promise<TeamStatistics> - Calculated team statistics
   */
  static async calculateTeamStatisticsFromGames(teamId: number, teamName?: string): Promise<TeamStatistics> {
    const prisma = await getPrismaClient();
    const serviceName = 'TeamStatisticsCalculator';
    
    logger.debug(`[${serviceName}] Calculating statistics for team`, { teamId, teamName });
    
    // Fetch all completed league games using standardized completion criteria
    // CRITICAL: Only include games with a valid scheduleId to avoid orphaned games from old seasons
    const completedGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        matchType: 'LEAGUE',
        scheduleId: { not: null }, // Filter out orphaned games
        AND: [
          {
            OR: [
              { status: 'COMPLETED' },
              { simulated: true },
              { 
                AND: [
                  { homeScore: { not: null } },
                  { awayScore: { not: null } }
                ]
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        simulated: true,
        gameDate: true,
        matchType: true,
        scheduleId: true
      },
      orderBy: { gameDate: 'asc' }
    });

    logger.debug(`[${serviceName}] Games retrieved for calculation`, { 
      teamId, 
      gameCount: completedGames.length 
    });
    
    // Log each game for debugging
    completedGames.forEach((game, index) => {
      logger.debug(`[${serviceName}] Game ${index + 1}:`, {
        gameId: game.id,
        scheduleId: game.scheduleId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        score: `${game.homeScore}-${game.awayScore}`,
        date: game.gameDate
      });
    });

    // Calculate statistics using standardized logic
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let points = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    
    for (const game of completedGames) {
      // Validate game completion criteria using standardized schema
      const gameValidation = GameCompletionCriteria.safeParse({
        status: game.status,
        simulated: game.simulated,
        hasValidScores: game.homeScore !== null && game.awayScore !== null
      });
      
      if (!gameValidation.success) {
        logger.warn(`[${serviceName}] Game failed completion criteria`, {
          gameId: game.id,
          teamId,
          criteria: gameValidation.error.message
        });
        continue;
      }
      
      // Skip games without valid scores
      if (game.homeScore === null || game.awayScore === null) {
        continue;
      }
      
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;
      
      pointsFor += teamScore;
      pointsAgainst += opponentScore;
      
      // Standard win/loss/draw calculation logic
      if (teamScore > opponentScore) {
        wins++;
        points += 3; // 3 points for win
        logger.debug(`[${serviceName}] Game result: WIN`, { 
          gameId: game.id, 
          teamScore, 
          opponentScore 
        });
      } else if (teamScore === opponentScore) {
        draws++;
        points += 1; // 1 point for draw
        logger.debug(`[${serviceName}] Game result: DRAW`, { 
          gameId: game.id, 
          teamScore, 
          opponentScore 
        });
      } else {
        losses++;
        // 0 points for loss
        logger.debug(`[${serviceName}] Game result: LOSS`, { 
          gameId: game.id, 
          teamScore, 
          opponentScore 
        });
      }
    }
    
    // Create standardized statistics object
    const statistics: TeamStatistics = {
      wins,
      losses,
      draws,
      points,
      gamesPlayed: wins + losses + draws,
      pointsFor,
      pointsAgainst,
      pointsDifference: pointsFor - pointsAgainst
    };
    
    // Validate calculated statistics
    const validatedStats = TeamStatisticsSchema.parse(statistics);
    
    logger.info(`[${serviceName}] Statistics calculated using standardized logic`, {
      teamId,
      teamName,
      statistics: validatedStats,
      totalGamesProcessed: completedGames.length
    });
    
    return validatedStats;
  }

  /**
   * Calculate single game result outcome
   * Used for determining win/loss/draw from a single game
   * 
   * @param teamScore - Score of the team
   * @param opponentScore - Score of the opponent
   * @returns Object with game outcome and points earned
   */
  static calculateGameOutcome(teamScore: number, opponentScore: number): {
    outcome: 'WIN' | 'LOSS' | 'DRAW';
    points: number;
    winsIncrement: number;
    lossesIncrement: number;
    drawsIncrement: number;
  } {
    if (teamScore > opponentScore) {
      return {
        outcome: 'WIN',
        points: 3,
        winsIncrement: 1,
        lossesIncrement: 0,
        drawsIncrement: 0
      };
    } else if (teamScore === opponentScore) {
      return {
        outcome: 'DRAW',
        points: 1,
        winsIncrement: 0,
        lossesIncrement: 0,
        drawsIncrement: 1
      };
    } else {
      return {
        outcome: 'LOSS',
        points: 0,
        winsIncrement: 0,
        lossesIncrement: 1,
        drawsIncrement: 0
      };
    }
  }

  /**
   * Check if a game meets completion criteria
   * Standardized game completion logic used across all components
   * 
   * @param game - Game object to check
   * @returns boolean - True if game is considered completed
   */
  static isGameCompleted(game: {
    status?: string | null;
    simulated?: boolean | null;
    homeScore?: number | null;
    awayScore?: number | null;
  }): boolean {
    const validation = GameCompletionCriteria.safeParse({
      status: game.status,
      simulated: game.simulated,
      hasValidScores: game.homeScore !== null && game.awayScore !== null
    });
    
    return validation.success;
  }

  /**
   * Format team statistics for display
   * Standardized formatting across all UI components
   * 
   * @param stats - Team statistics object
   * @returns Formatted display object
   */
  static formatStatisticsForDisplay(stats: TeamStatistics) {
    return {
      record: `${stats.wins}W - ${stats.draws}D - ${stats.losses}L`,
      points: stats.points,
      gamesPlayed: stats.gamesPlayed,
      pointsDifference: stats.pointsDifference > 0 ? `+${stats.pointsDifference}` : stats.pointsDifference.toString(),
      pointsFor: stats.pointsFor,
      pointsAgainst: stats.pointsAgainst,
      winPercentage: stats.gamesPlayed > 0 ? 
        Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
    };
  }
}

// Export individual functions for convenience
export const {
  calculateTeamStatisticsFromGames,
  calculateGameOutcome,
  isGameCompleted,
  formatStatisticsForDisplay
} = TeamStatisticsCalculator;

// Schemas already exported above (lines 15 and 29)