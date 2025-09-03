import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { logInfo } from '../services/errorService.js';

const router = Router();

/**
 * Data Visualization API Routes
 * Support for Phase 3 Product-Led Growth Framework Implementation
 * 
 * Routes
 * GET /api/data-viz/team-performance - Team performance metrics
 * GET /api/data-viz/player-distribution - Player race distribution
 * GET /api/data-viz/season-progress - Season-long progress tracking
 * GET /api/data-viz/division-standings - Current division standings
 */

/**
 * GET /api/data-viz/team-performance
 * Returns team performance metrics for visualization
 */
router.get('/team-performance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.user as any;
    
    // Get user's team using Prisma
    const prisma = await getPrismaClient();
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team performance data
    const players = await prisma.player.findMany({
      where: { teamId: team.id }
    });
    
    // Calculate team power (average of top 9 players)
    const activePlayers = players.filter((p: any) => !p.isOnMarket && !p.isRetired);
    const sortedPlayers = activePlayers.sort((a: any, b: any) => {
      const aPower = (a.speed + a.power + a.agility + a.throwing + a.catching + a.kicking) / 6;
      const bPower = (b.speed + b.power + b.agility + b.throwing + b.catching + b.kicking) / 6;
      return bPower - aPower;
    });
    
    const top9Players = sortedPlayers.slice(0, 9);
    const teamPower = top9Players.length > 0 
      ? Math.round(top9Players.reduce((sum: number, p: any) => {
          return sum + (p.speed + p.power + p.agility + p.throwing + p.catching + p.kicking) / 6;
        }, 0) / top9Players.length)
      : 0;

    // Calculate team camaraderie
    const teamCamaraderie = activePlayers.length > 0
      ? Math.round(activePlayers.reduce((sum: number, p: any) => sum + p.camaraderieScore, 0) / activePlayers.length)
      : 0;

    // Determine trend based on recent performance
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const totalGames = team.wins + team.losses;
    
    if (totalGames > 3) {
      const winRate = team.wins / totalGames;
      if (winRate > 0.6) trend = 'up';
      else if (winRate < 0.4) trend = 'down';
    }

    const performanceData = {
      teamName: team.name,
      wins: team.wins,
      losses: team.losses,
      power: teamPower,
      camaraderie: teamCamaraderie,
      trend
    };

    logInfo(`Team performance data generated for team ${team.id}`);
    return res.json(performanceData);

  } catch (error) {
    console.error('Error getting team performance data:', error);
    return next(error);
  }
});

/**
 * GET /api/data-viz/player-distribution
 * Returns player race distribution for pie chart visualization
 */
router.get('/player-distribution', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.user as any;
    
    // Get user's team
    const prisma = await getPrismaClient();
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get active players only
    const players = await prisma.player.findMany({
      where: { teamId: team.id }
    });
    const activePlayers = players.filter((p: any) => !p.isOnMarket && !p.isRetired);

    // Group by race and calculate distribution
    const raceDistribution = activePlayers.reduce((acc: any, player: any) => {
      if (!acc[player.race]) {
        acc[player.race] = {
          race: player.race,
          count: 0,
          totalPower: 0,
          averagePower: 0,
          color: getColorForRace(player.race)
        };
      }
      acc[player.race].count++;
      const playerPower = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;
      acc[player.race].totalPower += playerPower;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and format for response
    const distributionData = Object.values(raceDistribution).map((race: any) => ({
      race: race.race,
      count: race.count,
      averagePower: Math.round(race.totalPower / race.count),
      color: race.color
    }));

    logInfo(`Player distribution data generated for team ${team.id}`);
    return res.json(distributionData);

  } catch (error) {
    console.error('Error getting player distribution data:', error);
    return next(error);
  }
});

/**
 * GET /api/data-viz/season-progress
 * Returns season progress data for trend visualization
 */
router.get('/season-progress', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.user as any;
    
    // Get user's team
    const prisma = await getPrismaClient();
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get current season
    const currentSeason = await storage.seasons.getCurrentSeason();
    const currentDay = currentSeason?.currentDay || 9;

    // Get team's match history for season progress
    const matches = await prisma.game.findMany({
      where: { 
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });
    const leagueMatches = matches.filter((m: any) => m.matchType === 'LEAGUE' && m.status === 'COMPLETED');

    // Build progress data day by day
    const progressData = [];
    
    for (let day = 1; day <= Math.min(currentDay, 14); day++) {
      // Count wins/losses up to this day
      const matchesUpToDay = leagueMatches.slice(0, day - 1);
      
      const wins = matchesUpToDay.filter((m: any) => 
        (m.homeTeamId === team.id && m.homeScore > m.awayScore) ||
        (m.awayTeamId === team.id && m.awayScore > m.homeScore)
      ).length;
      
      const losses = matchesUpToDay.filter((m: any) => 
        (m.homeTeamId === team.id && m.homeScore < m.awayScore) ||
        (m.awayTeamId === team.id && m.awayScore < m.homeScore)
      ).length;

      // Get team stats for this point in season
      const players = await prisma.player.findMany({
        where: { teamId: team.id }
      });
      const activePlayers = players.filter((p: any) => !p.isOnMarket && !p.isRetired);
      
      const teamPower = activePlayers.length > 0
        ? Math.round(activePlayers.reduce((sum: number, p: any) => {
            return sum + (p.speed + p.power + p.agility + p.throwing + p.catching + p.kicking) / 6;
          }, 0) / activePlayers.length)
        : 0;

      const camaraderie = activePlayers.length > 0
        ? Math.round(activePlayers.reduce((sum: number, p: any) => sum + p.camaraderieScore, 0) / activePlayers.length)
        : 0;

      progressData.push({
        day,
        wins,
        losses,
        teamPower,
        camaraderie
      });
    }

    logInfo(`Season progress data generated for team ${team.id}`);
    return res.json(progressData);

  } catch (error) {
    console.error('Error getting season progress data:', error);
    return next(error);
  }
});

/**
 * GET /api/data-viz/division-standings
 * Returns current division standings for rankings visualization
 */
router.get('/division-standings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.user as any;
    
    // Get user's team
    const prisma = await getPrismaClient();
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get all teams in same division and subdivision
    const divisionTeams = await prisma.team.findMany({
      where: { 
        division: team.division,
        subdivision: team.subdivision 
      }
    });

    // Calculate standings for each team
    const standingsData = await Promise.all(divisionTeams.map(async (divisionTeam: any, index: number) => {
      // Get matches for standings calculation
      const matches = await prisma.game.findMany({
        where: { 
          OR: [
            { homeTeamId: divisionTeam.id },
            { awayTeamId: divisionTeam.id }
          ]
        }
      });
      const leagueMatches = matches.filter((m: any) => m.matchType === 'LEAGUE' && m.status === 'COMPLETED');

      let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0;

      leagueMatches.forEach((match: any) => {
        if (match.homeTeamId === divisionTeam.id) {
          goalsFor += match.homeScore;
          goalsAgainst += match.awayScore;
          if (match.homeScore > match.awayScore) wins++;
          else if (match.homeScore < match.awayScore) losses++;
          else draws++;
        } else if (match.awayTeamId === divisionTeam.id) {
          goalsFor += match.awayScore;
          goalsAgainst += match.homeScore;
          if (match.awayScore > match.homeScore) wins++;
          else if (match.awayScore < match.homeScore) losses++;
          else draws++;
        }
      });

      const points = (wins * 3) + (draws * 1);
      const goalDifference = goalsFor - goalsAgainst;

      return {
        teamId: divisionTeam.id,
        teamName: divisionTeam.name,
        wins,
        losses,
        draws,
        points,
        goalDifference,
        goalsFor,
        goalsAgainst
      };
    }));

    // Sort by points, then goal difference, then goals for
    standingsData.sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Add position numbers
    const finalStandings = standingsData.map((team: any, index: number) => ({
      position: index + 1,
      teamName: team.teamName,
      points: team.points,
      wins: team.wins,
      losses: team.losses,
      goalDifference: team.goalDifference
    }));

    logInfo(`Division standings data generated for team ${team.id}`);
    return res.json(finalStandings);

  } catch (error) {
    console.error('Error getting division standings data:', error);
    return next(error);
  }
});

/**
 * Helper function to get color for each race
 */
function getColorForRace(race: string): string {
  const colors: Record<string, string> = {
    'Human': '#8B5CF6',
    'Sylvan': '#10B981', 
    'Gryll': '#F59E0B',
    'Lumina': '#3B82F6',
    'Umbra': '#6B7280'
  };
  return colors[race] || '#6B7280';
}

export default router;