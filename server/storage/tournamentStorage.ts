import { prisma } from '../db';
import { PrismaClient, Tournament, TournamentEntry } from '../../generated/prisma';

export class TournamentStorage {
  async createTournament(tournamentData: {
    name: string;
    type: string;
    status?: string;
    division?: number;
    season?: number;
    gameDay?: number;
    entryFeeCredits?: bigint;
    entryFeeGems?: number;
    requiresEntryItem?: boolean;
    registrationDeadline?: Date;
    startTime?: Date;
    maxParticipants?: number;
  }): Promise<Tournament> {
    const newTournament = await prisma.tournament.create({
      data: {
        name: tournamentData.name,
        type: tournamentData.type,
        status: tournamentData.status || 'OPEN',
        division: tournamentData.division,
        season: tournamentData.season,
        gameDay: tournamentData.gameDay,
        entryFeeCredits: tournamentData.entryFeeCredits || BigInt(0),
        entryFeeGems: tournamentData.entryFeeGems || 0,
        requiresEntryItem: tournamentData.requiresEntryItem || false,
        registrationDeadline: tournamentData.registrationDeadline,
        startTime: tournamentData.startTime,
        maxParticipants: tournamentData.maxParticipants || 16,
      },
      include: {
        entries: true
      }
    });
    return newTournament;
  }

  async getTournamentById(id: number): Promise<Tournament | null> {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            team: { select: { name: true } }
          }
        }
      }
    });
    return tournament;
  }

  async getTournamentsByDivision(division: number, status?: string): Promise<Tournament[]> {
    const whereClause: any = { division };
    
    if (status) {
      // Convert string status to proper enum value
      switch (status) {
        case 'open':
          whereClause.status = 'REGISTRATION_OPEN';
          break;
        case 'closed':
          whereClause.status = 'REGISTRATION_CLOSED';
          break;
        case 'in_progress':
          whereClause.status = 'IN_PROGRESS';
          break;
        case 'completed':
          whereClause.status = 'COMPLETED';
          break;
        case 'cancelled':
          whereClause.status = 'CANCELLED';
          break;
        default:
          whereClause.status = status; // Assume it's already the correct enum value
      }
    }
    
    return await prisma.tournament.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            team: { select: { name: true } }
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async getAllTournaments(status?: string): Promise<Tournament[]> {
    const whereClause: any = {};
    
    if (status) {
      // Convert string status to proper enum value
      switch (status) {
        case 'open':
          whereClause.status = 'REGISTRATION_OPEN';
          break;
        case 'closed':
          whereClause.status = 'REGISTRATION_CLOSED';
          break;
        case 'in_progress':
          whereClause.status = 'IN_PROGRESS';
          break;
        case 'completed':
          whereClause.status = 'COMPLETED';
          break;
        case 'cancelled':
          whereClause.status = 'CANCELLED';
          break;
        default:
          whereClause.status = status; // Assume it's already the correct enum value
      }
    }
    
    return await prisma.tournament.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            team: { select: { name: true } }
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament | null> {
    try {
      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: updates,
        include: {
          entries: {
            include: {
              team: { select: { name: true } }
            }
          }
        }
      });
      return updatedTournament;
    } catch (error) {
      console.warn(`Tournament with ID ${id} not found for update.`);
      return null;
    }
  }

  // Tournament Entry Operations
  async createTournamentEntry(entryData: {
    tournamentId: number;
    teamId: number;
    prizeWon?: bigint;
    placement?: number;
  }): Promise<TournamentEntry> {
    const newEntry = await prisma.tournamentEntry.create({
      data: {
        tournamentId: entryData.tournamentId,
        teamId: entryData.teamId,
        prizeWon: entryData.prizeWon || BigInt(0),
        placement: entryData.placement || 0,
      },
      include: {
        tournament: { select: { name: true } },
        team: { select: { name: true } }
      }
    });
    return newEntry;
  }

  async getTournamentEntries(tournamentId: number): Promise<TournamentEntry[]> {
    return await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        tournament: { select: { name: true } },
        team: { select: { name: true } }
      },
      orderBy: { entryTime: 'asc' }
    });
  }

  async getTeamTournamentEntries(teamId: number): Promise<TournamentEntry[]> {
    return await prisma.tournamentEntry.findMany({
      where: { teamId },
      include: {
        tournament: { select: { name: true, type: true } },
        team: { select: { name: true } }
      },
      orderBy: { entryTime: 'desc' }
    });
  }

  async updateTournamentEntry(id: number, updates: Partial<TournamentEntry>): Promise<TournamentEntry | null> {
    try {
      const updatedEntry = await prisma.tournamentEntry.update({
        where: { id },
        data: updates,
        include: {
          tournament: { select: { name: true } },
          team: { select: { name: true } }
        }
      });
      return updatedEntry;
    } catch (error) {
      console.warn(`Tournament entry with ID ${id} not found for update.`);
      return null;
    }
  }

  async deleteTournamentEntry(id: number): Promise<boolean> {
    try {
      await prisma.tournamentEntry.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.warn(`Tournament entry with ID ${id} not found for deletion.`);
      return false;
    }
  }

  async getAvailableTournaments(teamId: number): Promise<Tournament[]> {
    // Get tournaments that are open and the team hasn't entered yet
    const existingEntries = await prisma.tournamentEntry.findMany({
      where: { teamId },
      select: { tournamentId: true }
    });
    
    const excludedTournamentIds = existingEntries.map(entry => entry.tournamentId);

    return await prisma.tournament.findMany({
      where: {
        status: 'OPEN',
        NOT: {
          id: { in: excludedTournamentIds }
        }
      },
      include: {
        entries: true
      },
      orderBy: { startTime: 'asc' }
    });
  }
}

export const tournamentStorage = new TournamentStorage();