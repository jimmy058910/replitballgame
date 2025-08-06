import { prisma } from '../db';
import { PrismaClient, Game, GameStatus, MatchType } from '../../generated/prisma';

export class MatchStorage {
  async createMatch(matchData: {
    homeTeamId: number;
    awayTeamId: number;
    gameDate?: Date;
    status?: GameStatus;
    matchType?: MatchType;
    leagueId?: number;
    tournamentId?: number;
    round?: number;
  }): Promise<Game> {
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
    const upcomingMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        AND: [
          { status: { not: GameStatus.COMPLETED } },
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
    const divisionTeams = await prisma.team.findMany({
      where: { division },
      select: { id: true }
    });
    
    const teamIdsInDivision = divisionTeams.map(t => t.id);
    if (teamIdsInDivision.length === 0) return [];

    const divisionMatches = await prisma.game.findMany({
      where: {
        AND: [
          { homeTeamId: { in: teamIdsInDivision } },
          { awayTeamId: { in: teamIdsInDivision } },
          // @ts-expect-error TS2322
          ...(seasonId ? [{ league: { seasonId } }] : [])
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

  async updateMatch(id: number, updates: Partial<Game>): Promise<Game | null> {
    try {
      const updatedMatch = await prisma.game.update({
        where: { id },
        // @ts-expect-error TS2322
        data: updates,
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
    const whereClause: any = { status: GameStatus.IN_PROGRESS };
    
    // If teamId is provided, only return matches where this team is participating
    if (teamId) {
      whereClause.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ];
    }
    
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

    const matches = await prisma.game.findMany({
      where: {
        status: GameStatus.SCHEDULED,
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