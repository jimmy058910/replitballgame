import { prisma } from '../../db';
import { Logger } from '../core/logger';
import { NotFoundError, ConflictError, ValidationError } from '../core/errors';
import { TournamentEntry, TournamentStatus, TournamentRegistrationRequest } from './schemas.js';

export class TournamentDomainService {
  static async registerForTournament(
    teamId: number, 
    request: TournamentRegistrationRequest
  ): Promise<TournamentEntry> {
    try {
      // Check if team is already registered for active tournaments
      const existingRegistration = await prisma.tournamentEntry.findFirst({
        where: {
          teamId,
          tournament: {
            status: {
              in: ['REGISTRATION_OPEN', 'IN_PROGRESS']
            }
          }
        },
        include: {
          tournament: true
        }
      });

      if (existingRegistration) {
        throw new ConflictError(
          `Team is already registered for ${existingRegistration.tournament.name}`
        );
      }

      // Find appropriate tournament
      const tournament = await prisma.tournament.findFirst({
        where: {
          division: request.division,
          status: 'REGISTRATION_OPEN'
        }
      });

      if (!tournament) {
        throw new NotFoundError('Available tournament for this division');
      }

      // Register team
      const entry = await prisma.tournamentEntry.create({
        data: {
          teamId,
          tournamentId: Number(tournament.id),
          registeredAt: new Date()
        },
        include: {
          tournament: true
        }
      });

      Logger.logInfo('Tournament registration successful', {
        teamId,
        tournamentId: String(tournament.id),
        division: request.division
      });

      return this.formatTournamentEntry(entry);
    } catch (error) {
      Logger.logError('Tournament registration failed', error as Error, { teamId, division: request.division });
      throw error;
    }
  }

  static async getTournamentHistory(teamId: number): Promise<TournamentEntry[]> {
    try {
      const entries = await prisma.tournamentEntry.findMany({
        where: {
          teamId,
          finalRank: { not: null }
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
              division: true,
              status: true,
              seasonDay: true,
              tournamentId: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          registeredAt: 'desc'
        },
        take: 20
      });

      return entries.map(this.formatTournamentEntry);
    } catch (error) {
      Logger.logError('Failed to get tournament history', error as Error, { teamId });
      throw error;
    }
  }

  static async getActiveTournaments(teamId: number): Promise<TournamentEntry[]> {
    try {
      const entries = await prisma.tournamentEntry.findMany({
        where: {
          teamId,
          tournament: {
            status: {
              in: ['REGISTRATION_OPEN', 'IN_PROGRESS']
            }
          }
        },
        include: {
          tournament: true
        },
        orderBy: {
          registeredAt: 'desc'
        }
      });

      return entries.map(this.formatTournamentEntry);
    } catch (error) {
      Logger.logError('Failed to get active tournaments', error as Error, { teamId });
      throw error;
    }
  }

  static async getTournamentStatus(tournamentId: number): Promise<TournamentStatus> {
    try {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          entries: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  division: true
                }
              }
            }
          }
        }
      });

      if (!tournament) {
        throw new NotFoundError('Tournament');
      }

      return {
        id: tournament.id.toString(),
        tournamentId: Number(tournament.tournamentId ?? tournament.id ?? 0),
        name: tournament.name,
        type: tournament.type as 'DAILY_DIVISIONAL' | 'MID_SEASON_CLASSIC',
        division: tournament.division ?? 0,
        status: tournament.status as 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED',
        participantCount: tournament.entries.length,
        maxParticipants: 8,
        startTime: tournament.startTime || undefined,
        registrationEndTime: tournament.registrationEndTime || undefined,
        participants: tournament.entries.map(p => ({
          id: Number(p.team.id),
          name: p.team.name,
          division: p.team.division ?? 0,
          registeredAt: p.registeredAt
        })),
        prizes: {
          champion: {
            credits: (tournament.division || 0) <= 4 ? 10000 : 5000,
            gems: (tournament.division || 0) <= 4 ? 20 : 10
          },
          runnerUp: {
            credits: (tournament.division || 0) <= 4 ? 5000 : 2500,
            gems: (tournament.division || 0) <= 4 ? 10 : 5
          }
        }
      };
    } catch (error) {
      Logger.logError('Failed to get tournament status', error as Error, { tournamentId: tournamentId.toString() });
      throw error;
    }
  }

  private static formatTournamentEntry(entry: any): TournamentEntry {
    return {
      id: Number(entry.id),
      tournamentId: Number(entry.tournamentId),
      teamId: Number(entry.teamId),
      registeredAt: entry.registeredAt,
      finalRank: entry.finalRank ? Number(entry.finalRank) : null,
      creditsWon: Number(entry.creditsWon || 0),
      gemsWon: Number(entry.gemsWon || 0),
      placement: entry.finalRank ? Number(entry.finalRank) : null,
      tournament: {
        id: Number(entry.tournament.id),
        name: entry.tournament.name,
        type: entry.tournament.type,
        division: entry.tournament.division,
        status: entry.tournament.status,
        tournamentId: entry.tournament.tournamentId ? Number(entry.tournament.tournamentId) : undefined,
        createdAt: entry.tournament.createdAt,
        seasonDay: entry.tournament.seasonDay || undefined,
        gameDay: entry.tournament.gameDay || undefined
      }
    };
  }
}