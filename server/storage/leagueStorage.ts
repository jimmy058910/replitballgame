import { prisma } from '../db';
import { PrismaClient, League, LeagueStanding } from '../../generated/prisma';

export class LeagueStorage {
  async createLeague(leagueData: {
    division: number;
    name: string;
    seasonId: number;
  }): Promise<League> {
    const newLeague = await prisma.league.create({
      data: {
        division: leagueData.division,
        name: leagueData.name,
        seasonId: leagueData.seasonId.toString(),
      },
      include: {
        teams: true,
        schedule: true,
        standings: true,
        season: true
      }
    });
    return newLeague;
  }

  async getLeagueById(id: number): Promise<League | null> {
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        teams: true,
        schedule: true,
        standings: true,
        season: true
      }
    });
    return league;
  }

  async getActiveLeagueByDivision(division: number, seasonId?: number): Promise<League | null> {
    const league = await prisma.league.findFirst({
      where: {
        division,
        ...(seasonId ? { seasonId: seasonId.toString() } : {})
      },
      include: {
        teams: true,
        schedule: true,
        standings: true,
        season: true
      },
      orderBy: { id: 'desc' } // Get the most recent one
    });
    return league;
  }

  async updateLeague(id: number, updates: Partial<League>): Promise<League | null> {
    try {
      const updatedLeague = await prisma.league.update({
        where: { id },
        data: updates,
        include: {
          teams: true,
          schedule: true,
          standings: true,
          season: true
        }
      });
      return updatedLeague;
    } catch (error) {
      console.warn(`League with ID ${id} not found for update.`);
      return null;
    }
  }

  // League Standings methods
  async getLeagueStandings(leagueId: number): Promise<LeagueStanding[]> {
    return await prisma.leagueStanding.findMany({
      where: { leagueId },
      orderBy: [
        { rank: 'asc' },
        { pointsFor: 'desc' }
      ]
    });
  }

  async getTeamStandingInLeague(teamId: number, leagueId: number): Promise<LeagueStanding | null> {
    const standing = await prisma.leagueStanding.findFirst({
      where: {
        teamId,
        leagueId
      }
    });
    return standing;
  }

  async upsertLeagueStanding(standingData: {
    leagueId: number;
    teamId: number;
    teamName: string;
    wins?: number;
    losses?: number;
    ties?: number;
    pointsFor?: number;
    pointsAgainst?: number;
    pointDifferential?: number;
    streak?: string;
    rank?: number;
  }): Promise<LeagueStanding> {
    // Calculate point differential if not provided
    const pointDifferential = standingData.pointDifferential ?? 
      ((standingData.pointsFor ?? 0) - (standingData.pointsAgainst ?? 0));

    const standing = await prisma.leagueStanding.upsert({
      where: {
        leagueId_teamId: {
          leagueId: standingData.leagueId,
          teamId: standingData.teamId
        }
      },
      update: {
        teamName: standingData.teamName,
        wins: standingData.wins ?? 0,
        losses: standingData.losses ?? 0,
        ties: standingData.ties ?? 0,
        pointsFor: standingData.pointsFor ?? 0,
        pointsAgainst: standingData.pointsAgainst ?? 0,
        pointDifferential,
        streak: standingData.streak ?? 'N/A',
        rank: standingData.rank ?? 0,
      },
      create: {
        leagueId: standingData.leagueId,
        teamId: standingData.teamId,
        teamName: standingData.teamName,
        wins: standingData.wins ?? 0,
        losses: standingData.losses ?? 0,
        ties: standingData.ties ?? 0,
        pointsFor: standingData.pointsFor ?? 0,
        pointsAgainst: standingData.pointsAgainst ?? 0,
        pointDifferential,
        streak: standingData.streak ?? 'N/A',
        rank: standingData.rank ?? 0,
      }
    });

    return standing;
  }

  async deleteLeagueStanding(leagueId: number, teamId: number): Promise<boolean> {
    try {
      await prisma.leagueStanding.delete({
        where: {
          leagueId_teamId: {
            leagueId,
            teamId
          }
        }
      });
      return true;
    } catch (error) {
      console.warn(`League standing for team ${teamId} in league ${leagueId} not found for deletion.`);
      return false;
    }
  }
}

export const leagueStorage = new LeagueStorage();