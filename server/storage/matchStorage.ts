import { getPrismaClient } from '../database.js';
import { PrismaClient, Game } from "@prisma/client";

export class MatchStorage {
  async createMatch(matchData: {
    homeTeamId: number;
    awayTeamId: number;
    gameDate?: Date;
    status?: any;
    matchType?: any;
    leagueId?: number;
    tournamentId?: number;
    round?: number;
  }): Promise<Game> {
    const prisma = await getPrismaClient();
    const newMatch = await prisma.game.create({
      data: {
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        gameDate: matchData.gameDate || new Date(),
        status: matchData.status || 'SCHEDULED' as any,
        matchType: matchData.matchType || 'LEAGUE' as any,
        leagueId: matchData.leagueId,
        tournamentId: matchData.tournamentId,
        round: matchData.round,
      },
    });
    return newMatch;
  }

  async getMatchById(id: number): Promise<Game | null> {
    const prisma = await getPrismaClient();
    const match = await prisma.game.findUnique({
      where: { 
        id: Number(id) 
      },
      include: {
        league: true,
        tournament: true
      }
    });
    return match;
  }

  async getMatchesByTeamId(teamId: number): Promise<Game[]> {
    const prisma = await getPrismaClient();
    const teamMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: { gameDate: 'desc' }
    });
    return teamMatches;
  }

  async getUpcomingMatches(teamId: number): Promise<Game[]> {
    const prisma = await getPrismaClient();
    const upcomingMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        AND: [
          { status: { not: 'COMPLETED' } },
          { gameDate: { gte: new Date() } }
        ]
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: { gameDate: 'asc' }
    });
    return upcomingMatches;
  }

  async getMatchesByDivision(division: number, seasonId?: number): Promise<Game[]> {
    // Get teams in the division first
    const prisma = await getPrismaClient();
    const divisionTeams = await prisma.team.findMany({
      where: { division },
      select: { id: true }
    });
    
    const teamIdsInDivision = divisionTeams.map((t: any) => t.id);
    if (teamIdsInDivision.length === 0) return [];

    const divisionMatches = await prisma.game.findMany({
      where: {
        AND: [
          { homeTeamId: { in: teamIdsInDivision } },
          { awayTeamId: { in: teamIdsInDivision } },
          ...(seasonId ? [{ leagueId: seasonId }] : [])
        ]
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: [
        { gameDate: 'asc' }
      ]
    });

    return divisionMatches;
  }

  async updateMatch(id: number, updates: any): Promise<Game | null> {
    try {
      // Remove 'id' from updates to avoid Prisma constraint conflicts
      const { id: _, ...updateData } = updates;
      const prisma = await getPrismaClient();
      const updatedMatch = await prisma.game.update({
        where: { id },
        data: updateData,
        include: {
          league: true,
          tournament: true
        }
      });
      return updatedMatch;
    } catch (error) {
      console.warn(`Match with ID ${id} not found for update.`);
      return null;
    }
  }

  async getLiveMatches(teamId?: number): Promise<Game[]> {
    const whereClause: any = { status: 'IN_PROGRESS' };
    
    // If teamId is provided, only return matches where this team is participating
    if (teamId) {
      whereClause.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ];
    }
    
    const prisma = await getPrismaClient();
    const live = await prisma.game.findMany({
      where: whereClause,
      include: {
        league: true,
        tournament: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            division: true,
            subdivision: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            division: true,
            subdivision: true
          }
        }
      },
      orderBy: { gameDate: 'desc' }
    });
    return live;
  }

  async getScheduledMatchesForDay(gameDate: Date, leagueId?: number): Promise<Game[]> {
    // Get matches for the specific date
    const startOfDay = new Date(gameDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(gameDate);
    endOfDay.setHours(23, 59, 59, 999);

    const prisma = await getPrismaClient();
    const matches = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        gameDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        ...(leagueId ? { leagueId } : {})
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: { gameDate: 'asc' }
    });
    return matches;
  }
}

export const matchStorage = new MatchStorage();