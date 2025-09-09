/**
 * League Schedule Repository
 * 
 * Data access layer for league scheduling
 * Handles all database operations for schedules
 * 
 * @module LeagueScheduleRepository
 */

import { getPrismaClient } from '../../database.js';
import { Prisma } from '../../db.js';
import logger from '../../utils/logger.js';
import type { League } from '@shared/types/models';


export class LeagueScheduleRepository {
  /**
   * Get schedule for a division
   */
  async getSchedule(divisionId: number, options: {
    subdivision?: string;
    gameDay?: number;
    teamId?: number;
  }) {
    const prisma = await getPrismaClient();

    try {
      const whereClause: Prisma.GameWhereInput = {
        matchType: 'LEAGUE',
        ...(options.subdivision && { subdivision: options.subdivision }),
        ...(options.gameDay && { gameDay: options.gameDay }),
        ...(options.teamId && {
          OR: [
            { homeTeamId: options.teamId },
            { awayTeamId: options.teamId }
          ]
        })
      };

      // If no specific filters, get division games
      if (!options.teamId) {
        whereClause.OR = [
          {
            homeTeam: {
              division: divisionId,
              ...(options.subdivision && { subdivision: options.subdivision })
            }
          },
          {
            awayTeam: {
              division: divisionId,
              ...(options.subdivision && { subdivision: options.subdivision })
            }
          }
        ];
      }

      const games = await prisma.game.findMany({
        where: whereClause,
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              division: true,
              subdivision: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              division: true,
              subdivision: true
            }
          }
        },
        orderBy: [
          { gameDay: 'asc' },
          { gameDate: 'asc' }
        ]
      });

      return games.map(game => ({
        gameId: game.id,
        gameDay: game.gameDay,
        gameDate: game.gameDate,
        homeTeamId: game.homeTeamId,
        homeTeamName: game.homeTeam.name,
        homeTeamLogo: game.homeTeam.logoUrl,
        awayTeamId: game.awayTeamId,
        awayTeamName: game.awayTeam.name,
        awayTeamLogo: game.awayTeam.logoUrl,
        status: game.status,
        homeScore: (game as any).homeScore,
        awayScore: (game as any).awayScore,
        subdivision: game.subdivision || game.homeTeam.subdivision
      }));
    } catch (error) {
      logger.error('Database error fetching schedule', { error });
      throw error;
    }
  }

  /**
   * Get daily schedule
   */
  async getDailySchedule(date: Date, options: {
    division?: number;
    subdivision?: string;
  }) {
    const prisma = await getPrismaClient();

    try {
      // Set date range for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const whereClause: Prisma.GameWhereInput = {
        gameDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        matchType: 'LEAGUE'
      };

      if (options.division) {
        whereClause.OR = [
          {
            homeTeam: {
              division: options.division,
              ...(options.subdivision && { subdivision: options.subdivision })
            }
          },
          {
            awayTeam: {
              division: options.division,
              ...(options.subdivision && { subdivision: options.subdivision })
            }
          }
        ];
      }

      const games = await prisma.game.findMany({
        where: whereClause,
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              division: true,
              subdivision: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              division: true,
              subdivision: true
            }
          }
        },
        orderBy: { gameDate: 'asc' }
      });

      return games;
    } catch (error) {
      logger.error('Database error fetching daily schedule', { error });
      throw error;
    }
  }

  /**
   * Get next game for a team
   */
  async getNextGameForTeam(teamId: number) {
    const prisma = await getPrismaClient();

    try {
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId }
          ],
          status: 'SCHEDULED',
          gameDate: { gte: new Date() }
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } }
        },
        orderBy: { gameDate: 'asc' }
      });

      return game;
    } catch (error) {
      logger.error('Database error fetching next game', { error, teamId });
      throw error;
    }
  }

  /**
   * Create a new game
   */
  async createGame(gameData: {
    homeTeamId: number;
    awayTeamId: number;
    gameDate: Date;
    matchType: string;
    status: string;
  }) {
    const prisma = await getPrismaClient();

    try {
      const game = await prisma.game.create({
        data: {
          homeTeamId: gameData.homeTeamId,
          awayTeamId: gameData.awayTeamId,
          gameDate: gameData.gameDate,
          matchType: gameData.matchType as any,
          status: gameData.status as any
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } }
        }
      });

      return game;
    } catch (error) {
      logger.error('Database error creating game', { error, gameData });
      throw error;
    }
  }

  /**
   * Create schedule for a league
   */
  async createSchedule(data: {
    leagueId: number;
    subdivision?: string;
    games: any[];
  }) {
    const prisma = await getPrismaClient();

    try {
      // Get current season
      // Get current season (assuming latest is active)
      const season = await prisma.season.findFirst({
        orderBy: { seasonNumber: 'desc' }
      });

      if (!season) {
        throw new Error('No active season found');
      }

      // Create schedule record
      const schedule = await prisma.schedule.create({
        data: {
          seasonId: season.id,
          division: data.leagueId,
          subdivision: data.subdivision || 'main'
        }
      });

      // Create games
      const games = await prisma.game.createMany({
        data: data.games.map(game => ({
          scheduleId: schedule.id,
          gameDay: game.gameDay,
          gameDate: game.gameDate,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          subdivision: data.subdivision
        }))
      });

      return {
        scheduleId: schedule.id,
        gamesCreated: games.count,
        startDate: data.games[0].gameDate,
        endDate: data.games[data.games.length - 1].gameDate
      };
    } catch (error) {
      logger.error('Database error creating schedule', { error, data });
      throw error;
    }
  }

  /**
   * Delete schedule for a league
   */
  async deleteSchedule(leagueId: number, subdivision?: string) {
    const prisma = await getPrismaClient();

    try {
      // Find games to delete
      const gamesToDelete = await prisma.game.findMany({
        where: {
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          ...(subdivision && { subdivision }),
          OR: [
            {
              homeTeam: {
                division: leagueId,
                ...(subdivision && { subdivision })
              }
            },
            {
              awayTeam: {
                division: leagueId,
                ...(subdivision && { subdivision })
              }
            }
          ]
        },
        select: { id: true }
      });

      const gameIds = gamesToDelete.map(g => g.id);

      // Delete games
      const deleted = await prisma.game.deleteMany({
        where: { id: { in: gameIds } }
      });

      return deleted.count;
    } catch (error) {
      logger.error('Database error deleting schedule', { error, leagueId });
      throw error;
    }
  }
}