/**
 * League Standings Repository
 * 
 * Data access layer for league standings
 * Implements Repository pattern for database operations
 * 
 * @module LeagueStandingsRepository
 */

import { getPrismaClient } from '../../database.js';
import { Prisma } from '../../db.js';
import logger from '../../utils/logger.js';
import type { League } from '@shared/types/models';


export class LeagueStandingsRepository {
  /**
   * Get standings for a league/subdivision
   */
  async getStandings(
    leagueId: number,
    seasonId: string,
    subdivision?: string,
    includeStats: boolean = false
  ) {
    const prisma = await getPrismaClient();

    try {
      const whereClause: Prisma.TeamWhereInput = {
        division: leagueId,
        ...(subdivision && { subdivision })
      };

      const teams = await prisma.team.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          logoUrl: true,
          division: true,
          subdivision: true,
          wins: true,
          losses: true,
          draws: true,
          points: true,
          // Note: pointsFor and pointsAgainst need to be calculated from games
          ...(includeStats && {
            homeGames: {
              where: {
                status: 'COMPLETED',
                scheduleId: { not: null }
              },
              select: {
                id: true,
                homeScore: true,
                awayScore: true,
                awayTeamId: true,
                gameDate: true
              },
              orderBy: { gameDate: 'desc' },
              take: 5
            },
            awayGames: {
              where: {
                status: 'COMPLETED',
                scheduleId: { not: null }
              },
              select: {
                id: true,
                homeScore: true,
                awayScore: true,
                homeTeamId: true,
                gameDate: true
              },
              orderBy: { gameDate: 'desc' },
              take: 5
            }
          })
        },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { wins: 'desc' }
        ]
      });

      // Process and format standings
      return teams.map((team, index) => {
        // Calculate points from games
        const pointsFor = 0; // TODO: Calculate from games
        const pointsAgainst = 0; // TODO: Calculate from games
        const pointDifference = pointsFor - pointsAgainst;
        const gamesPlayed = team.wins + team.losses + team.draws;

        let recentGames: any[] = [];
        if (includeStats && (team as any).homeGames && (team as any).awayGames) {
          const homeGames = (team as any).homeGames.map((g: any) => ({
            ...g,
            isHome: true,
            result: (g as any).homeScore > (g as any).awayScore ? 'WIN' : 
                   (g as any).homeScore < (g as any).awayScore ? 'LOSS' : 'DRAW'
          }));
          
          const awayGames = (team as any).awayGames.map((g: any) => ({
            ...g,
            isHome: false,
            result: (g as any).awayScore > (g as any).homeScore ? 'WIN' : 
                   (g as any).awayScore < (g as any).homeScore ? 'LOSS' : 'DRAW'
          }));

          recentGames = [...homeGames, ...awayGames]
            .sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime())
            .slice(0, 5);
        }

        return {
          position: index + 1,
          teamId: team.id,
          teamName: team.name,
          logoUrl: team.logoUrl,
          division: team.division,
          subdivision: team.subdivision,
          wins: team.wins,
          losses: team.losses,
          draws: team.draws,
          points: team.points,
          pointsFor,
          pointsAgainst,
          pointDifference,
          gamesPlayed,
          recentGames
        };
      });
    } catch (error) {
      logger.error('Database error fetching standings', { details:  { error } });
      throw error;
    }
  }

  /**
   * Recalculate standings from game results
   */
  async recalculateFromGames(
    leagueId: number,
    seasonId: string,
    subdivision?: string): Promise<number> {
    const prisma = await getPrismaClient();

    try {
      // Get all teams in the league/subdivision
      const teams = await prisma.team.findMany({
        where: {
          division: leagueId,
          ...(subdivision && { subdivision })
        },
        select: { id: true }
      });

      let updatedCount = 0;

      // Recalculate for each team
      for (const team of teams) {
        const stats = await this.calculateTeamStats(team.id, seasonId);
        
        await prisma.team.update({
          where: { id: team.id },
          data: {
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            points: stats.points,
            // Note: pointsFor and pointsAgainst calculated separately
          }
        });

        updatedCount++;
      }

      return updatedCount;
    } catch (error) {
      logger.error('Database error recalculating standings', { error });
      throw error;
    }
  }

  /**
   * Calculate team statistics from games
   */
  private async calculateTeamStats(teamId: number, seasonId: string) {
    const prisma = await getPrismaClient();

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED',
        scheduleId: { not: null },
        schedule: { seasonId }
      }
    });

    let wins = 0, losses = 0, draws = 0;
    let pointsFor = 0, pointsAgainst = 0;

    for (const game of games) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? (game as any).homeScore : (game as any).awayScore;
      const opponentScore = isHome ? (game as any).awayScore : (game as any).homeScore;

      if (teamScore === null || opponentScore === null) continue;

      pointsFor += teamScore;
      pointsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins++;
      } else if (teamScore < opponentScore) {
        losses++;
      } else {
        draws++;
      }
    }

    const points = (wins * 3) + draws;

    return {
      wins,
      losses,
      draws,
      points,
      pointsFor,
      pointsAgainst
    };
  }

  /**
   * Get team's recent form
   */
  async getTeamRecentForm(teamId: number, games: number = 5) {
    const prisma = await getPrismaClient();

    const recentGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED'
      },
      orderBy: { gameDate: 'desc' },
      take: games,
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        gameDate: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });

    return recentGames.map(game => {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? (game as any).homeScore : (game as any).awayScore;
      const opponentScore = isHome ? (game as any).awayScore : (game as any).homeScore;
      const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;

      let result = 'PENDING';
      if (teamScore !== null && opponentScore !== null) {
        if (teamScore > opponentScore) result = 'WIN';
        else if (teamScore < opponentScore) result = 'LOSS';
        else result = 'DRAW';
      }

      return {
        gameId: game.id,
        date: game.gameDate,
        opponent,
        isHome,
        teamScore,
        opponentScore,
        result
      };
    });
  }

  /**
   * Get head-to-head statistics against other teams
   */
  async getHeadToHeadStats(teamId: number) {
    const prisma = await getPrismaClient();

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED',
        scheduleId: { not: null }
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });

    const h2hMap = new Map<number, any>();

    for (const game of games) {
      const isHome = game.homeTeamId === teamId;
      const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
      const opponentName = isHome ? game.awayTeam.name : game.homeTeam.name;
      const teamScore = isHome ? (game as any).homeScore : (game as any).awayScore;
      const opponentScore = isHome ? (game as any).awayScore : (game as any).homeScore;

      if (!h2hMap.has(opponentId)) {
        h2hMap.set(opponentId, {
          opponentId,
          opponentName,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0
        });
      }

      const stats = h2hMap.get(opponentId);
      stats.played++;
      stats.goalsFor += teamScore || 0;
      stats.goalsAgainst += opponentScore || 0;

      if (teamScore !== null && opponentScore !== null) {
        if (teamScore > opponentScore) stats.wins++;
        else if (teamScore < opponentScore) stats.losses++;
        else stats.draws++;
      }
    }

    return Array.from(h2hMap.values());
  }

  /**
   * Get standings history for trend analysis
   */
  async getStandingsHistory(leagueId: number, days: number) {
    const prisma = await getPrismaClient();
    
    // This would ideally query a standings_history table
    // For now, we'll calculate based on games played in the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const teams = await prisma.team.findMany({
      where: { division: leagueId },
      select: {
        id: true,
        name: true,
        homeGames: {
          where: {
            gameDate: { gte: startDate },
            status: 'COMPLETED'
          },
          select: {
            gameDate: true,
            homeScore: true,
            awayScore: true
          }
        },
        awayGames: {
          where: {
            gameDate: { gte: startDate },
            status: 'COMPLETED'
          },
          select: {
            gameDate: true,
            homeScore: true,
            awayScore: true
          }
        }
      }
    });

    // Calculate daily standings
    const dailyStandings: any[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999);

      const standings = teams.map(team => {
        let points = 0;
        let position = 0;

        // Calculate points up to this date
        const homeGames = (team as any).homeGames.filter(
          (g: any) => g.gameDate <= date
        );
        const awayGames = (team as any).awayGames.filter(
          (g: any) => g.gameDate <= date
        );

        homeGames.forEach((g: any) => {
          if ((g as any).homeScore > (g as any).awayScore) points += 3;
          else if ((g as any).homeScore === (g as any).awayScore) points += 1;
        });

        awayGames.forEach((g: any) => {
          if ((g as any).awayScore > (g as any).homeScore) points += 3;
          else if ((g as any).awayScore === (g as any).homeScore) points += 1;
        });

        return {
          teamId: team.id,
          teamName: team.name,
          date: date.toISOString(),
          points,
          position
        };
      });

      // Sort and assign positions
      standings.sort((a, b) => b.points - a.points);
      standings.forEach((s, idx) => s.position = idx + 1);

      dailyStandings.push(...standings);
    }

    return dailyStandings;
  }
}