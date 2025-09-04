import { Router, type Request, type Response } from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { asyncHandler } from '../services/errorService.js';
import { getPrismaClient } from "../database.js";

const router = Router();

// Team Trends API for Product-Led Growth Data Storytelling
router.get('/trends', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const prisma = await getPrismaClient();
  const userId = req.user.claims.sub;
  
  // Find user profile
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId }
  });
  
  if (!userProfile) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  
  const userProfileId = userProfile.id;
    
    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userProfileId },
      include: {
        _count: {
          select: {
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get recent matches (last 5 games) for trend analysis
    const recentMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ],
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        homeTeam: { select: { id: true, camaraderie: true } },
        awayTeam: { select: { id: true, camaraderie: true } }
      }
    });

    // Get historical team data (simulate trend by analyzing recent performance)
    const totalGames = (team._count as any).homeGames + (team._count as any).awayGames;
    const winRate = totalGames > 0 ? ((team.wins || 0) / totalGames) * 100 : 0;
    
    // Calculate power trend based on recent team performance
    let powerTrend: 'up' | 'down' | 'stable' = 'stable';
    let powerChange = 0;
    
    if (winRate >= 25) {
      powerTrend = 'up';
      powerChange = Math.random() * 2 + 1; // 1-3 point increase
    } else if (winRate < 18) {
      powerTrend = 'down';
      powerChange = -(Math.random() * 1.5 + 0.5); // 0.5-2 point decrease
    } else {
      powerTrend = Math.random() > 0.5 ? 'up' : 'stable';
      powerChange = powerTrend === 'up' ? Math.random() * 1.5 : 0;
    }

    // Calculate camaraderie trend based on recent wins/losses
    let camaraderieTrend: 'up' | 'down' | 'stable' = 'stable';
    let camaraderieChange = 0;
    
    if (winRate > 60) {
      camaraderieTrend = 'up';
      camaraderieChange = Math.random() * 5 + 2; // 2-7 point increase
    } else if (winRate < 30) {
      camaraderieTrend = 'down';
      camaraderieChange = -(Math.random() * 3 + 1); // 1-4 point decrease
    } else {
      camaraderieTrend = 'stable';
      camaraderieChange = 0;
    }

    // Calculate form trend based on recent matches
    let formTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentMatches.length >= 3) {
      const recentWins = recentMatches.slice(0, 3).filter((match: any) => {
        const isHomeWin = match.homeTeamId === team.id && match.homeScore > match.awayScore;
        const isAwayWin = match.awayTeamId === team.id && match.awayScore > match.homeScore;
        return isHomeWin || isAwayWin;
      }).length;
      
      if (recentWins >= 2) formTrend = 'up';
      else if (recentWins === 0) formTrend = 'down';
    }

    // Generate narrative based on team performance
    let narrative = 'Building Season';
    if (winRate > 75) narrative = 'Dominant Force';
    else if (winRate > 60) narrative = 'Strong Contender';
    else if (winRate > 40) narrative = 'Competitive Team';
    else if (winRate > 20) narrative = 'Fighting Spirit';
    else narrative = 'Rebuilding Phase';

    // Generate weekly highlight based on recent performance
    let weeklyHighlight = 'Steady Progress';
    if (formTrend === 'up' && powerTrend === 'up') {
      weeklyHighlight = 'Momentum Building';
    } else if (formTrend === 'up') {
      weeklyHighlight = 'Finding Form';
    } else if (powerTrend === 'up') {
      weeklyHighlight = 'Squad Improving';
    } else if (formTrend === 'down') {
      weeklyHighlight = 'Facing Challenges';
    }

    const trends = {
      powerTrend,
      powerChange: Math.round(powerChange * 10) / 10,
      camaraderieTrend,
      camaraderieChange: Math.round(camaraderieChange * 10) / 10,
      formTrend,
      narrative,
      weeklyHighlight,
      winRate: Math.round(winRate * 10) / 10,
      recentFormGames: recentMatches.length
    };

    res.json(trends);
}));

// Player Spotlight API for narrative-driven content
router.get('/player-spotlight', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const prisma = await getPrismaClient();
  const userId = req.user.claims.sub;
  
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId }
  });
  
  if (!userProfile) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const team = await prisma.team.findFirst({
    where: { userProfileId: userProfile.id },
    include: {
      players: {
        where: { 
          isOnMarket: false, 
          isRetired: false 
        },
        orderBy: { camaraderieScore: 'desc' },
        take: 3
      }
    }
  });

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const spotlightPlayers = team.players.map((player: any, index: number) => {
    const power = Math.round(((player.speed || 20) + (player.power || 20) + (player.agility || 20) + 
                             (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20) + 
                             (player.staminaAttribute || 20) + (player.leadership || 20)) / 8);
    
    let trend: 'rising' | 'hot' | 'veteran' | 'rookie' = 'rising';
    let narrative = '';
    let stat = '';

    if (player.age <= 18) {
      trend = 'rookie';
      narrative = `Young ${player.race} ${player.role.toLowerCase()} showing incredible promise in training sessions`;
      stat = `Age ${player.age} • ${power} Power`;
    } else if (player.age >= 30) {
      trend = 'veteran';
      narrative = `Seasoned veteran leading by example with ${player.camaraderieScore}/100 team chemistry`;
      stat = `${player.age}y veteran • ${player.camaraderieScore} chemistry`;
    } else if (power >= 25) {
      trend = 'hot';
      narrative = `Elite performer dominating matches with outstanding ${power} power rating`;
      stat = `${power} power • Elite tier`;
    } else {
      trend = 'rising';
      narrative = `Rising talent developing rapidly with ${player.camaraderieScore}/100 morale`;
      stat = `${power} power • ${player.camaraderieScore} morale`;
    }

    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.role,
      narrative,
      stat,
      trend
    };
  });

  res.json(spotlightPlayers);
}));

// Team Storylines API for compelling narrative content
router.get('/storylines', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const prisma = await getPrismaClient();
  const userId = req.user.claims.sub;
  
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId }
  });
  
  if (!userProfile) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const team = await prisma.team.findFirst({
    where: { userProfileId: userProfile.id }
  });

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const totalGames = (team.wins || 0) + (team.losses || 0);
  const winRate = totalGames > 0 ? ((team.wins || 0) / totalGames) * 100 : 0;

  let storylines = [];

  // Create compelling storylines based on team performance
  if (winRate > 75 && totalGames >= 3) {
    storylines.push({
      title: "Championship Contender",
      description: `Your ${team.name} is dominating the league with a ${Math.round(winRate)}% win rate. Championship glory is within reach.`,
      type: 'success',
      icon: 'trophy',
      actionable: true,
      linkTo: '/competition'
    });
  } else if (winRate < 25 && totalGames >= 3) {
    storylines.push({
      title: "Rebuilding Phase",
      description: `Tough times for ${team.name}, but every champion starts somewhere. Focus on player development and team chemistry.`,
      type: 'challenge',
      icon: 'users',
      actionable: true,
      linkTo: '/roster-hq'
    });
  } else if (totalGames < 3) {
    storylines.push({
      title: "Season Launch",
      description: `${team.name} begins its journey. Every match counts as you build your legacy in the league.`,
      type: 'opportunity',
      icon: 'star',
      actionable: true,
      linkTo: '/competition'
    });
  } else if (team.camaraderie && team.camaraderie > 70) {
    storylines.push({
      title: "United Squad",
      description: `Exceptional team chemistry at ${team.camaraderie}/100. Your players are performing like a championship unit.`,
      type: 'milestone',
      icon: 'heart',
      actionable: false
    });
  } else {
    storylines.push({
      title: "Building Momentum",
      description: `${team.name} is finding its rhythm. Continue developing your tactical approach and squad depth.`,
      type: 'opportunity',
      icon: 'trending-up',
      actionable: true,
      linkTo: '/roster-hq?tab=tactics'
    });
  }

  res.json(storylines);
}));

export default router;