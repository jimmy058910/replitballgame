import { getPrismaClient } from '../database.js';
import { PrismaClient, Tournament, TournamentEntry } from "@prisma/client";

export class TournamentStorage {
  async getAllTournamentHistory(): Promise<any[]> {
    const prisma = await getPrismaClient();
    const history = await prisma.tournamentEntry.findMany({
      include: {
        tournament: true,
        team: {
          select: {
            name: true,
            division: true,
            subdivision: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });
    
    return history;
  }
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
    const prisma = await getPrismaClient();
    const newTournament = await prisma.tournament.create({
      data: {
        name: tournamentData.name,
        type: tournamentData.type as any,
        status: tournamentData.status as any || 'REGISTRATION_OPEN' as any,
        division: tournamentData.division,
        // season: tournamentData.season, // Not in schema yet
        // gameDay: tournamentData.gameDay, // Not in schema yet
        entryFeeCredits: tournamentData.entryFeeCredits || BigInt(0),
        entryFeeGems: tournamentData.entryFeeGems || 0,
        // requiresEntryItem: tournamentData.requiresEntryItem || false, // Not in schema yet
        registrationEndTime: tournamentData.registrationDeadline,
        startTime: tournamentData.startTime || new Date(),
        prizePoolJson: {}, // Required by schema
        // maxParticipants: tournamentData.maxParticipants || 16, // Not in schema yet
      },
      include: {
        entries: true
      }
    });
    return newTournament;
  }

  async getTournamentById(id: number): Promise<Tournament | null> {
    const prisma = await getPrismaClient();
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
    const prisma = await getPrismaClient();
    const whereClause: any = { division };
    
    if (status) {
      // Convert string status to proper enum value
      switch (status) {
        case 'open':
          // Include both registration open and in-progress tournaments for display
          whereClause.status = { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] };
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
    const prisma = await getPrismaClient();
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

  async updateTournament(id: number, updates: any): Promise<Tournament | null> {
    const prisma = await getPrismaClient();
    try {
      // Remove 'id' from updates to avoid Prisma constraint conflicts
      const { id: _, ...updateData } = updates;
      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: updateData,
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
  }): Promise<TournamentEntry> {
    const prisma = await getPrismaClient();
    const newEntry = await prisma.tournamentEntry.create({
      data: {
        tournamentId: entryData.tournamentId,
        teamId: entryData.teamId,
      },
      include: {
        tournament: { select: { name: true } },
        team: { select: { name: true } }
      }
    });
    return newEntry;
  }

  async getTournamentEntries(tournamentId: number): Promise<TournamentEntry[]> {
    const prisma = await getPrismaClient();
    return await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        tournament: { select: { name: true } },
        team: { select: { name: true } }
      },
      orderBy: { registeredAt: 'asc' }
    });
  }

  async getTeamTournamentEntries(teamId: number): Promise<TournamentEntry[]> {
    const prisma = await getPrismaClient();
    return await prisma.tournamentEntry.findMany({
      where: { teamId },
      include: {
        tournament: { select: { name: true, type: true } },
        team: { select: { name: true } }
      },
      orderBy: { registeredAt: 'desc' }
    });
  }

  async updateTournamentEntry(id: number, updates: any): Promise<TournamentEntry | null> {
    const prisma = await getPrismaClient();
    try {
      // Remove 'id' from updates to avoid Prisma constraint conflicts
      const { id: _, ...updateData } = updates;
      const updatedEntry = await prisma.tournamentEntry.update({
        where: { id },
        data: updateData,
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
    const prisma = await getPrismaClient();
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
    const prisma = await getPrismaClient();
    // Get tournaments that are open and the team hasn't entered yet
    const existingEntries = await prisma.tournamentEntry.findMany({
      where: { teamId },
      select: { tournamentId: true }
    });
    
    const excludedTournamentIds = existingEntries.map((entry: any) => entry.tournamentId);

    return await prisma.tournament.findMany({
      where: {
        status: 'REGISTRATION_OPEN' as any,
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

  async getTournamentParticipantCount(tournamentId: number): Promise<number> {
    const prisma = await getPrismaClient();
    const count = await prisma.tournamentEntry.count({
      where: { tournamentId }
    });
    return count;
  }
}

export const tournamentStorage = new TournamentStorage();