import { prisma } from '../../db.js';
import { Logger } from '../core/logger.js';
import { NotFoundError, ConflictError } from '../core/errors.js';
import { MatchState, CreateMatchRequest, LiveMatchUpdate, SimulationEvent } from './schemas.js';

export class MatchDomainService {
  static async createMatch(request: CreateMatchRequest): Promise<MatchState> {
    try {
      const match = await prisma.game.create({
        data: {
          homeTeamId: request.homeTeamId,
          awayTeamId: request.awayTeamId,
          homeScore: 0,
          awayScore: 0,
          status: 'SCHEDULED',
          matchType: request.matchType,
          gameDate: request.scheduledTime || new Date(),
          ...(request.tournamentId && { tournamentId: request.tournamentId })
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        }
      });

      Logger.logInfo('Match created successfully', {
        matchId: String(match.id),
        homeTeamId: request.homeTeamId,
        awayTeamId: request.awayTeamId,
        matchType: request.matchType
      });

      return this.formatMatchState(match);
    } catch (error) {
      Logger.logError('Failed to create match', error as Error, { request });
      throw error;
    }
  }

  static async getMatchById(matchId: number): Promise<MatchState> {
    try {
      const match = await prisma.game.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        }
      });

      if (!match) {
        throw new NotFoundError('Match');
      }

      return this.formatMatchState(match);
    } catch (error) {
      Logger.logError('Failed to get match', error as Error, { matchId: String(matchId) });
      throw error;
    }
  }

  static async getLiveMatches(): Promise<MatchState[]> {
    try {
      const matches = await prisma.game.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        },
        orderBy: {
          gameDate: 'desc'
        }
      });

      return matches.map(this.formatMatchState);
    } catch (error) {
      Logger.logError('Failed to get live matches', error as Error);
      throw error;
    }
  }

  static async startMatch(matchId: number): Promise<MatchState> {
    try {
      const match = await prisma.game.update({
        where: { id: matchId },
        data: {
          status: 'IN_PROGRESS'
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        }
      });

      Logger.logInfo('Match started', {
        matchId: String(matchId),
        homeTeamId: String(match.homeTeamId),
        awayTeamId: String(match.awayTeamId)
      });

      return this.formatMatchState(match);
    } catch (error) {
      Logger.logError('Failed to start match', error as Error, { matchId: String(matchId) });
      throw error;
    }
  }

  static async updateMatchState(matchId: number, update: Partial<LiveMatchUpdate>): Promise<MatchState> {
    try {
      const match = await prisma.game.update({
        where: { id: matchId },
        data: {
          ...(update.homeScore !== undefined && { homeScore: update.homeScore }),
          ...(update.awayScore !== undefined && { awayScore: update.awayScore }),
          ...(update.status && { status: update.status })
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        }
      });

      return this.formatMatchState(match);
    } catch (error) {
      Logger.logError('Failed to update match state', error as Error, { matchId: String(matchId), update });
      throw error;
    }
  }

  private static formatMatchState(match: any): MatchState {
    return {
      id: Number(match.id),
      homeTeamId: Number(match.homeTeamId),
      awayTeamId: Number(match.awayTeamId),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      gameTime: match.gameTime,
      status: match.status,
      matchType: match.matchType,
      gameDate: match.gameDate,
      homeTeam: {
        id: Number(match.homeTeam.id),
        name: match.homeTeam.name,
        division: match.homeTeam.division
      },
      awayTeam: {
        id: Number(match.awayTeam.id),
        name: match.awayTeam.name,
        division: match.awayTeam.division
      },
      tournamentId: match.tournamentId ? Number(match.tournamentId) : undefined,
      simulationLog: match.simulationLog || undefined,
      attendance: match.attendance || undefined,
      mvpPlayerId: match.mvpPlayerId ? Number(match.mvpPlayerId) : undefined
    };
  }
}