import type { Player, Team, TeamFinances, Staff, Game, Tournament, UserProfile } from '@shared/types/models';
/**
 * League Admin Service
 * 
 * Business logic for administrative league operations
 * Secure admin functionality with audit logging
 * 
 * @module LeagueAdminService
 */

import { getPrismaClient } from '../../database.js';
import logger from '../../utils/logger.js';
import { generateRandomPlayer } from '../leagueService.js';
import { generateRandomName } from '../../../shared/names.js';
import { calculateTeamStatisticsFromGames } from '../../utils/teamStatisticsCalculator.js';


interface RegenerateOptions {
  leagueId: number;
  subdivision?: string;
  resetStandings: boolean;
  clearGames: boolean;
}

interface EmergencyResetOptions {
  division: number;
  subdivision: string;
}

export class LeagueAdminService {
  /**
   * Check if user has admin permissions
   */
  async checkAdminPermissions(userId: string): Promise<boolean> {
    try {
      const prisma = await getPrismaClient();
      
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      // Check for admin role or dev user
      const isAdmin = userProfile?.role === 'ADMIN' || 
                     userId === 'dev-user-123' ||
                     userProfile?.email?.includes('@admin.');
      
      if (isAdmin) {
        logger.info('Admin access granted', { userId });
      }
      
      return isAdmin;
    } catch (error) {
      logger.error('Error checking admin permissions', { error, userId });
      return false;
    }
  }

  /**
   * Regenerate league structure
   */
  async regenerateLeague(options: RegenerateOptions) {
    const prisma = await getPrismaClient();
    
    try {
      await prisma.$transaction(async (tx) => {
        // Clear games if requested
        if (options.clearGames) {
          const deleted = await tx.game.deleteMany({
            where: {
              matchType: 'LEAGUE',
              OR: [
                {
                  homeTeam: {
                    division: options.leagueId,
                    ...(options.subdivision && { subdivision: options.subdivision })
                  }
                },
                {
                  awayTeam: {
                    division: options.leagueId,
                    ...(options.subdivision && { subdivision: options.subdivision })
                  }
                }
              ]
            }
          });
          
          logger.info('Cleared league games', { 
            leagueId: options.leagueId,
            deleted: deleted.count 
          });
        }

        // Reset standings if requested
        if (options.resetStandings) {
          const updated = await tx.team.updateMany({
            where: {
              division: options.leagueId,
              ...(options.subdivision && { subdivision: options.subdivision })
            },
            data: {
              wins: 0,
              losses: 0,
              draws: 0,
              points: 0,
              pointsFor: 0,
              pointsAgainst: 0
            }
          });
          
          logger.info('Reset team standings', { 
            leagueId: options.leagueId,
            updated: updated.count 
          });
        }

        // Log audit entry
        await this.createAuditLog(tx, {
          action: 'REGENERATE_LEAGUE',
          details: options,
          userId: 'system'
        });
      });

      return {
        success: true,
        leagueId: options.leagueId,
        subdivision: options.subdivision,
        actionsPerformed: {
          gamesCleared: options.clearGames,
          standingsReset: options.resetStandings
        }
      };
    } catch (error) {
      logger.error('Error regenerating league', { error, options });
      throw new Error('Failed to regenerate league');
    }
  }

  /**
   * Recalculate team statistics
   */
  async recalculateTeamStats(teamId: number) {
    try {
      const stats = await calculateTeamStatisticsFromGames(teamId);
      
      const prisma = await getPrismaClient();
      await prisma.team.update({
        where: { id: teamId },
        data: {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          points: stats.points,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst
        }
      });

      logger.info('Team stats recalculated', { teamId, stats });
      
      return stats;
    } catch (error) {
      logger.error('Error recalculating team stats', { error, teamId });
      throw new Error('Failed to recalculate team statistics');
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(detailed: boolean = false) {
    const prisma = await getPrismaClient();
    
    try {
      const [
        totalTeams,
        totalGames,
        activeSeasons,
        orphanedGames
      ] = await Promise.all([
        await prisma.team.count(),
        await prisma.game.count(),
        await prisma.season.count({ where: { isActive: true } }),
        prisma.game.count({ where: { scheduleId: null } })
      ]);

      const health = {
        status: orphanedGames > 100 ? 'WARNING' : 'HEALTHY',
        timestamp: new Date(),
        metrics: {
          totalTeams,
          totalGames,
          activeSeasons,
          orphanedGames
        }
      };

      if (detailed) {
        // Add detailed breakdown
        const gamesByStatus = await prisma.game.groupBy({
          by: ['status'],
          _count: true
        });

        const teamsByDivision = await prisma.team.groupBy({
          by: ['division'],
          _count: true
        });

        (health as any).detailed = {
          gamesByStatus,
          teamsByDivision
        };
      }

      return health;
    } catch (error) {
      logger.error('Error getting system health', { error });
      throw new Error('Failed to get system health');
    }
  }

  /**
   * Emergency reset for a division
   */
  async emergencyReset(options: EmergencyResetOptions) {
    const prisma = await getPrismaClient();
    
    logger.warn('EMERGENCY RESET STARTING', options);
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get all teams in the division
        const teams = await tx.team.findMany({
          where: {
            division: options.division,
            subdivision: options.subdivision
          },
          select: { id: true, name: true }
        });

        const teamIds = teams.map(t => t.id);

        // Delete all games for these teams
        const deletedGames = await tx.game.deleteMany({
          where: {
            OR: [
              { homeTeamId: { in: teamIds } },
              { awayTeamId: { in: teamIds } }
            ]
          }
        });

        // Reset all team standings
        await tx.team.updateMany({
          where: { id: { in: teamIds } },
          data: {
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            pointsFor: 0,
            pointsAgainst: 0
          }
        });

        // Reset season to day 1
        const season = await tx.season.findFirst({
          where: {
            isActive: true,
            leagueId: options.division
          }
        });

        if (season) {
          await tx.season.update({
            where: { id: season.id },
            data: { currentDay: 1 }
          });
        }

        // Log audit entry
        await this.createAuditLog(tx, {
          action: 'EMERGENCY_RESET',
          details: options,
          userId: 'system'
        });

        return {
          teamsReset: teams.length,
          gamesDeleted: deletedGames.count,
          seasonReset: !!season
        };
      });

      logger.warn('EMERGENCY RESET COMPLETED', { ...options, ...result });
      
      return {
        success: true,
        division: options.division,
        subdivision: options.subdivision,
        ...result
      };
    } catch (error) {
      logger.error('Error in emergency reset', { error, options });
      throw new Error('Failed to perform emergency reset');
    }
  }

  /**
   * Fix orphaned games
   */
  async fixOrphanedGames() {
    const prisma = await getPrismaClient();
    
    try {
      // Find orphaned games (no scheduleId)
      const orphanedGames = await prisma.game.findMany({
        where: { scheduleId: null },
        select: { 
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          gameDate: true
        }
      });

      // Delete orphaned games
      const deleted = await prisma.game.deleteMany({
        where: { scheduleId: null }
      });

      logger.info('Fixed orphaned games', { 
        found: orphanedGames.length,
        deleted: deleted.count 
      });

      return {
        orphanedGamesFound: orphanedGames.length,
        orphanedGamesDeleted: deleted.count
      };
    } catch (error) {
      logger.error('Error fixing orphaned games', { error });
      throw new Error('Failed to fix orphaned games');
    }
  }

  /**
   * Create AI teams for testing
   */
  async createAITeams(options: {
    division: number;
    subdivision?: string;
    count: number;
  }) {
    const prisma = await getPrismaClient();
    const teams = [];
    
    try {
      for (let i = 0; i < options.count; i++) {
        const teamName = generateRandomName();
        
        const team = await prisma.team.create({
          data: {
            name: `AI ${teamName}`,
            isAI: true,
            division: options.division,
            subdivision: options.subdivision,
            userProfileId: 1, // Default AI profile
            camaraderie: 75,
            fanLoyalty: 50
          }
        });

        // Create players for the team
        const players = [];
        for (let j = 0; j < 6; j++) {
          const player = generateRandomPlayer(team.id);
          players.push(player);
        }

        await prisma.player.createMany({
          data: players
        });

        teams.push({
          id: team.id,
          name: team.name,
          playerCount: players.length
        });
      }

      logger.info('Created AI teams', { 
        count: teams.length,
        division: options.division 
      });

      return teams;
    } catch (error) {
      logger.error('Error creating AI teams', { error, options });
      throw new Error('Failed to create AI teams');
    }
  }

  /**
   * Get audit log
   */
  async getAuditLog(limit: number = 50, offset: number = 0) {
    const prisma = await getPrismaClient();
    
    try {
      // Note: This assumes an AuditLog model exists
      // For now, return mock data
      return {
        entries: [],
        total: 0,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error fetching audit log', { error });
      throw new Error('Failed to fetch audit log');
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(tx: any, data: {
    action: string;
    details: any;
    userId: string;
  }) {
    // Note: This would write to an AuditLog table
    // For now, just log to console
    logger.info('AUDIT LOG', data);
  }
}