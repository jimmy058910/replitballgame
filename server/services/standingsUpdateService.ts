import { getPrismaClient } from '../database.js';
import { TeamStatisticsIntegrityService } from './enhancedStatisticsService.js';
import { TeamStatisticsCalculator } from './enhancedStatisticsService.js';
import logger from '../utils/logger.js';

/**
 * Bulletproof Standings Update Service
 * 
 * Automatically updates team standings when league games complete.
 * Uses comprehensive statistics synchronization to ensure 100% accuracy.
 * Integrates with TeamStatisticsIntegrityService for enterprise-grade reliability.
 */
export class StandingsUpdateService {
  
  /**
   * Updates standings for both teams when a league game completes
   * @param gameId - The completed game ID
   */
  static async updateStandingsForCompletedGame(gameId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    logger.info(`[STANDINGS UPDATE] Processing completed game`, { gameId });
    
    // Get the completed game with team info
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    if (!game) {
      logger.warn(`[STANDINGS UPDATE] Game not found`, { gameId });
      return;
    }
    
    // Only process COMPLETED LEAGUE games with valid scores
    if (game.matchType !== 'LEAGUE' || 
        game.status !== 'COMPLETED' || 
        game.homeScore === null || 
        game.awayScore === null) {
      logger.debug(`[STANDINGS UPDATE] Game not eligible for standings update`, {
        gameId,
        matchType: game.matchType,
        status: game.status,
        hasValidScores: game.homeScore !== null && game.awayScore !== null
      });
      return;
    }
    
    const homeScore = game.homeScore;
    const awayScore = game.awayScore;
    
    logger.info(`[STANDINGS UPDATE] Processing game result`, {
      gameId,
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      score: `${homeScore}-${awayScore}`
    });
    
    // Use comprehensive statistics synchronization for bulletproof accuracy
    try {
      // Sync both teams' statistics comprehensively
      const homeTeamResult = await TeamStatisticsIntegrityService.syncTeamStatistics(game.homeTeamId);
      const awayTeamResult = await TeamStatisticsIntegrityService.syncTeamStatistics(game.awayTeamId);
      
      logger.info(`[STANDINGS UPDATE] Comprehensive sync completed`, {
        gameId,
        homeTeam: {
          name: homeTeamResult.teamName,
          discrepancies: homeTeamResult.discrepanciesFound.length,
          statsUpdated: homeTeamResult.discrepanciesFound.length > 0
        },
        awayTeam: {
          name: awayTeamResult.teamName,
          discrepancies: awayTeamResult.discrepanciesFound.length,
          statsUpdated: awayTeamResult.discrepanciesFound.length > 0
        }
      });
      
      // Log the game result for audit purposes
      if (homeScore > awayScore) {
        logger.info(`[STANDINGS UPDATE] Game result: ${game.homeTeam.name} WIN, ${game.awayTeam.name} LOSS`, { gameId });
      } else if (awayScore > homeScore) {
        logger.info(`[STANDINGS UPDATE] Game result: ${game.awayTeam.name} WIN, ${game.homeTeam.name} LOSS`, { gameId });
      } else {
        logger.info(`[STANDINGS UPDATE] Game result: ${game.homeTeam.name} and ${game.awayTeam.name} DRAW`, { gameId });
      }
      
    } catch (syncError) {
      // Fallback to incremental updates if comprehensive sync fails
      logger.warn(`[STANDINGS UPDATE] Comprehensive sync failed, using fallback incremental update`, {
        gameId,
        error: syncError instanceof Error ? syncError.message : 'Unknown error'
      });
      
      // Use standardized game outcome calculation for fallback
      const homeOutcome = TeamStatisticsCalculator.calculateGameOutcome(homeScore, awayScore);
      const awayOutcome = TeamStatisticsCalculator.calculateGameOutcome(awayScore, homeScore);
      
      // Apply standardized increments
      if (homeOutcome.winsIncrement > 0) {
        await this.incrementTeamWin(game.homeTeamId);
      } else if (homeOutcome.lossesIncrement > 0) {
        await this.incrementTeamLoss(game.homeTeamId);
      } else if (homeOutcome.drawsIncrement > 0) {
        await this.incrementTeamDraw(game.homeTeamId);
      }
      
      if (awayOutcome.winsIncrement > 0) {
        await this.incrementTeamWin(game.awayTeamId);
      } else if (awayOutcome.lossesIncrement > 0) {
        await this.incrementTeamLoss(game.awayTeamId);
      } else if (awayOutcome.drawsIncrement > 0) {
        await this.incrementTeamDraw(game.awayTeamId);
      }
      
      logger.info(`[STANDINGS UPDATE] Fallback using standardized logic: ${game.homeTeam.name} ${homeOutcome.outcome}, ${game.awayTeam.name} ${awayOutcome.outcome}`, { gameId });
    }
  }
  
  /**
   * Increment team wins and points (3 points for win)
   */
  private static async incrementTeamWin(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        wins: { increment: 1 },
        points: { increment: 3 }
      },
      select: { name: true, wins: true, losses: true, points: true }
    });
    
    logger.debug(`[WIN] Team stats updated`, {
      teamName: updatedTeam.name,
      wins: updatedTeam.wins,
      losses: updatedTeam.losses,
      points: updatedTeam.points
    });
  }
  
  /**
   * Increment team losses
   */
  private static async incrementTeamLoss(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        losses: { increment: 1 }
      },
      select: { name: true, wins: true, losses: true, points: true }
    });
    
    logger.debug(`[LOSS] Team stats updated`, {
      teamName: updatedTeam.name,
      wins: updatedTeam.wins,
      losses: updatedTeam.losses,
      points: updatedTeam.points
    });
  }
  
  /**
   * Increment team draws and points (1 point for draw)
   */
  private static async incrementTeamDraw(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        draws: { increment: 1 },
        points: { increment: 1 }
      },
      select: { name: true, wins: true, losses: true, draws: true, points: true }
    });
    
    logger.debug(`[DRAW] Team stats updated`, {
      teamName: updatedTeam.name,
      wins: updatedTeam.wins,
      draws: updatedTeam.draws || 0,
      losses: updatedTeam.losses,
      points: updatedTeam.points
    });
  }
  
  /**
   * Hook function to be called whenever a game is marked as completed
   * @param gameId - The game that was just completed
   */
  static async onGameCompleted(gameId: number): Promise<void> {
    try {
      await this.updateStandingsForCompletedGame(gameId);
    } catch (error) {
      logger.error(`[STANDINGS UPDATE] Error updating standings for game`, {
        gameId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
}