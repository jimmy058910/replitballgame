import { getPrismaClient } from '../db';
import { PrismaClient, LeagueStanding } from "../db";
import { DatabaseService } from "../database/DatabaseService.js";
import type { League } from '@shared/types/models';


export class LeagueStorage {
  async createLeague(leagueData: {
    division: number;
    name: string;
    seasonId: number;
  }): Promise<League> {
    const prisma = await DatabaseService.getInstance();
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
    const prisma = await DatabaseService.getInstance();
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
    const prisma = await DatabaseService.getInstance();
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
      const prisma = await DatabaseService.getInstance();
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
    const prisma = await DatabaseService.getInstance();
    
    // Query teams directly since that's where standings data is stored
    const teams = await prisma.team.findMany({
      where: { division: leagueId },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    // Calculate real-time stats for each team like /my endpoint does
    const teamsWithRealTimeStats = await Promise.all(teams.map(async (team) => {
      try {
        const { calculateTeamStatisticsFromGames } = await import('../utils/teamStatisticsCalculator.js');
        const realTimeStats = await calculateTeamStatisticsFromGames(team.id, team.name);
        
        console.log(`🏆 [STANDINGS DEBUG] Team ${team.name} calculated stats:`, {
          teamId: team.id,
          wins: realTimeStats.wins,
          losses: realTimeStats.losses,
          draws: realTimeStats.draws,
          points: realTimeStats.points,
          pointsFor: realTimeStats.pointsFor,
          pointsAgainst: realTimeStats.pointsAgainst,
          pointsDifference: realTimeStats.pointsDifference
        });
        
        return {
          ...team,
          wins: realTimeStats.wins,
          losses: realTimeStats.losses,
          draws: realTimeStats.draws,
          points: realTimeStats.points,
          gamesPlayed: realTimeStats.gamesPlayed,
          pointsFor: realTimeStats.pointsFor,
          pointsAgainst: realTimeStats.pointsAgainst,
          pointsDifference: realTimeStats.pointsDifference
        };
      } catch (error) {
        console.error(`❌ Failed to calculate real-time stats for team ${team.id} (${team.name})`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
          teamId: team.id,
          teamName: team.name
        });
        return {
          ...team,
          gamesPlayed: (team.wins || 0) + (team.losses || 0) + (team.draws || 0),
          pointsFor: 0,
          pointsAgainst: 0,
          pointsDifference: 0
        };
      }
    }));
    
    // Sort by points (real-time), then by wins
    teamsWithRealTimeStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.wins - a.wins;
    });
    
    // Transform to LeagueStanding format
    return teamsWithRealTimeStats.map((team, index) => ({
      id: team.id,
      leagueId,
      teamId: team.id,
      teamName: team.name,
      name: team.name,
      rank: index + 1,
      wins: team.wins || 0,
      losses: team.losses || 0,
      draws: team.draws || 0,
      points: team.points || 0,
      totalScores: team.pointsFor || 0,
      scoresAgainst: team.pointsAgainst || 0,
      scoreDifference: team.pointsDifference || 0,
      gamesPlayed: team.gamesPlayed || 0
    }));
  }

  async getTeamStandingInLeague(teamId: number, leagueId: number): Promise<LeagueStanding | null> {
    const prisma = await DatabaseService.getInstance();
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

    const prisma = await DatabaseService.getInstance();
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
      const prisma = await DatabaseService.getInstance();
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

  /**
   * Get daily schedule with games organized by day
   */
  async getDailySchedule(division?: number, subdivision?: string): Promise<{
    schedule: Record<number, any[]>;
    currentDay: number;
    totalDays: number;
    seasonStartDate: string;
  }> {
    console.log('🏀 [getDailySchedule] METHOD CALLED - Starting execution', { 
      division, 
      subdivision,
      divisionType: typeof division,
      subdivisionType: typeof subdivision,
      parametersProvided: division !== undefined && subdivision !== undefined
    });
    const prisma = await DatabaseService.getInstance();
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      return {
        schedule: {},
        currentDay: 1,
        totalDays: 0,
        seasonStartDate: new Date().toISOString()
      };
    }
    
    // Get all games from current season, filtered by division and subdivision if provided
    // Note: Games are associated with schedules, not directly with seasons
    // So we need to query games where scheduleId IS NOT NULL (active games)
    const whereClause: any = {
      scheduleId: {
        not: null
      }
    };

    // If division and subdivision are provided, filter games to only include teams from that division/subdivision
    if (division !== undefined && subdivision) {
      whereClause.AND = [
        {
          homeTeam: {
            division: division,
            subdivision: subdivision
          }
        },
        {
          awayTeam: {
            division: division,
            subdivision: subdivision
          }
        }
      ];
    }

    const games = await prisma.game.findMany({
      where: whereClause,
      include: {
        homeTeam: {
          select: { id: true, name: true, division: true, subdivision: true }
        },
        awayTeam: {
          select: { id: true, name: true, division: true, subdivision: true }
        }
      },
      orderBy: [
        { gameDay: 'asc' },
        { gameDate: 'asc' }
      ]
    });
    
    console.log('🏀 [getDailySchedule] Games found:', games.length);
    if (games.length > 0) {
      console.log('🏀 [getDailySchedule] Sample game:', {
        id: games[0].id,
        scheduleId: games[0].scheduleId,
        gameDay: games[0].gameDay,
        homeTeam: games[0].homeTeam?.name,
        homeTeamDivision: games[0].homeTeam?.division,
        homeTeamSubdivision: games[0].homeTeam?.subdivision,
        awayTeam: games[0].awayTeam?.name,
        awayTeamDivision: games[0].awayTeam?.division,
        awayTeamSubdivision: games[0].awayTeam?.subdivision
      });
    }
    
    // Debug: Show first few games with gameDay info to understand the data
    if (games.length > 0) {
      console.log('🏀 [getDailySchedule] First 3 games breakdown:');
      games.slice(0, 3).forEach((game, index) => {
        console.log(`🏀 Game ${index + 1}: ${game.homeTeam?.name} (Div ${game.homeTeam?.division}-${game.homeTeam?.subdivision}) vs ${game.awayTeam?.name} (Div ${game.awayTeam?.division}-${game.awayTeam?.subdivision}) - GameDay: ${game.gameDay}, Date: ${game.gameDate}`);
      });
    }
    
    try {
      console.log('🏀 [getDailySchedule] Starting game day calculation for', games.length, 'games');
      
      // Group games by day
      const scheduleByDay: Record<number, any[]> = {};
      let maxDay = 0;
      
      games.forEach((game, index) => {
        console.log(`🏀 [getDailySchedule] Processing game ${index + 1}:`, {
          id: game.id,
          gameDay: game.gameDay,
          gameDate: game.gameDate,
          homeTeam: game.homeTeam?.name,
          awayTeam: game.awayTeam?.name
        });
        
        // For regular season, games should be on days 1-14. If gameDay is null, calculate from gameDate
        let day = game.gameDay;
        
        if (!day && game.gameDate && currentSeason.startDate) {
          // Calculate day based on date difference from season start
          const seasonStart = new Date(currentSeason.startDate);
          const gameDate = new Date(game.gameDate);
          const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
          day = Math.max(1, Math.min(14, daysDiff + 1)); // Ensure day is between 1-14
          console.log('🏀 [getDailySchedule] Calculated day from date:', {
            gameId: game.id,
            seasonStart: seasonStart.toISOString(),
            gameDate: gameDate.toISOString(), 
            daysDiff,
            calculatedDay: day
          });
        }
        
        // Fallback to current day if still no day
        if (!day) {
          day = currentSeason.currentDay || 1;
          console.log('🏀 [getDailySchedule] Using fallback day:', day, 'for game', game.id);
        }
        
        maxDay = Math.max(maxDay, day);
        
        if (!scheduleByDay[day]) {
          scheduleByDay[day] = [];
        }
      
      const gameData = {
        id: game.id,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeTeamName: game.homeTeam?.name || `Team ${game.homeTeamId}`,
        awayTeamName: game.awayTeam?.name || `Team ${game.awayTeamId}`,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        matchType: game.matchType,
        gameDate: game.gameDate,
        scheduledTimeFormatted: game.gameDate ? new Date(game.gameDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/New_York'
        }) : 'TBD',
        isLive: game.status === 'IN_PROGRESS',
        canWatch: true
      };
      
        scheduleByDay[day].push(gameData);
      });
      
      // For regular season, totalDays should be 14 (Days 1-14), not whatever maxDay calculated
      const totalDays = currentSeason.phase === 'REGULAR_SEASON' ? 14 : 17;
      
      console.log('🏀 [getDailySchedule] Returning data:', {
        currentDay: currentSeason.currentDay || 1,
        totalDays: totalDays,
        maxDay: maxDay,
        seasonStartDate: currentSeason.startDate.toISOString(),
        scheduleKeys: Object.keys(scheduleByDay),
        totalGamesInSchedule: Object.values(scheduleByDay).reduce((sum, dayGames) => sum + dayGames.length, 0)
      });
      
      return {
        schedule: scheduleByDay,
        currentDay: currentSeason.currentDay || 1,
        totalDays: totalDays,
        seasonStartDate: currentSeason.startDate.toISOString()
      };
    } catch (error) {
      console.error('🏀 [getDailySchedule] Error processing games:', error);
      return {
        schedule: {},
        currentDay: currentSeason.currentDay || 1,
        totalDays: 14,
        seasonStartDate: currentSeason.startDate.toISOString()
      };
    }
  }
}

export const leagueStorage = new LeagueStorage();