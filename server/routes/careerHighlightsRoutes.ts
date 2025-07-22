import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

interface CareerHighlight {
  id: string;
  type: 'victory' | 'milestone' | 'management' | 'streak' | 'record';
  category: string;
  title: string;
  description: string;
  metric: string;
  value: string | number;
  context?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shareText: string;
  timestamp: string;
  unlockedAt: string;
  isNew?: boolean;
}

/**
 * GET /api/career-highlights/:teamId?
 * Returns career highlights for a team (expanded highlight system with comprehensive categories)
 */
router.get('/:teamId?', isAuthenticated, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userProfile = req.user as any;
    let teamId = req.params.teamId;
    const { tab = 'recent', filter = 'all' } = req.query;
    
    // If no teamId provided, get user's team
    if (!teamId) {
      const team = await storage.prisma.team.findFirst({
        where: { userProfileId: userProfile.id }
      });
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      teamId = team.id;
    }

    // Get team data with comprehensive stats
    const team = await storage.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          where: { isRetired: false, isOnMarket: false }
        },
        finances: true,
        stadium: true,
        user: {
          include: {
            user: true // Get UserProfile
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // 14-day rolling window for highlights
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    // Get recent match history
    const recentMatches = await storage.prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED',
        createdAt: { gte: fourteenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: true
      }
    });

    // Get tournament history
    const tournamentEntries = await storage.prisma.tournamentEntry.findMany({
      where: {
        teamId: teamId,
        entryDate: { gte: fourteenDaysAgo }
      },
      include: {
        tournament: true
      }
    });

    const careerHighlights: CareerHighlight[] = [];

    // 🏆 VICTORY HIGHLIGHTS
    recentMatches.forEach((match: any) => {
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      
      if (teamScore > opponentScore) {
        const scoreDiff = teamScore - opponentScore;
        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
        let title = 'Basic Victory';
        let category = 'Victory';
        
        // Determine rarity and title based on victory type
        if (scoreDiff >= 4) {
          rarity = 'epic';
          title = 'Blowout Win';
          category = 'Blowout Victory';
        } else if (scoreDiff >= 2) {
          rarity = 'rare';
          title = 'Convincing Win';
          category = 'Convincing Victory';
        }

        // Special tournament victories
        if (match.matchType === 'TOURNAMENT_DAILY') {
          rarity = 'common';
          title = 'Tournament Winner';
          category = 'Tournament Victory';
        }

        // Mid-Season Cup victories
        if (match.tournament && match.tournament.name?.includes('Mid-Season Cup')) {
          rarity = 'epic';
          title = 'Mid-Season Cup Winner';
          category = 'Cup Victory';
        }

        careerHighlights.push({
          id: `victory-${match.id}`,
          type: 'victory',
          category,
          title,
          description: `Defeated ${opponent.name} ${teamScore}-${opponentScore}`,
          metric: 'Final Score',
          value: `${teamScore}-${opponentScore}`,
          context: `${match.matchType.replace('_', ' ').toLowerCase()} match`,
          rarity,
          shareText: `🏆 Just led ${team.name} to a ${teamScore}-${opponentScore} victory over ${opponent.name}! ${rarity === 'epic' ? 'What a dominant performance!' : 'Great game!'}`,
          timestamp: match.createdAt,
          unlockedAt: match.createdAt,
          isNew: new Date(match.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        });
      }
    });

    // 📈 MILESTONE HIGHLIGHTS
    const totalWins = team.wins;
    const totalCredits = team.finances?.credits || 0;
    const teamPower = calculateTeamPower(team.players);
    const camaraderie = team.camaraderie || 0;

    // Career wins milestones
    if (totalWins >= 200) {
      careerHighlights.push({
        id: 'milestone-200-wins',
        type: 'milestone',
        category: 'Career Achievement',
        title: '200 Career Wins',
        description: 'Reached 200 total victories across all competitions',
        metric: 'Total Wins',
        value: totalWins,
        rarity: 'legendary',
        shareText: `🎯 Just hit 200 career wins with ${team.name}! This franchise is legendary!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    } else if (totalWins >= 50) {
      careerHighlights.push({
        id: 'milestone-50-wins',
        type: 'milestone',
        category: 'Career Achievement',
        title: '50 Career Wins',
        description: 'Reached 50 total victories across all competitions',
        metric: 'Total Wins',
        value: totalWins,
        rarity: 'epic',
        shareText: `🎯 Just hit 50 career wins with ${team.name}! Building something special!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    } else if (totalWins >= 15) {
      careerHighlights.push({
        id: 'milestone-15-wins',
        type: 'milestone',
        category: 'Career Achievement',
        title: '15 Career League Wins',
        description: 'Reached 15 total league victories',
        metric: 'League Wins',
        value: totalWins,
        rarity: 'rare',
        shareText: `🎯 Just hit 15 career wins with ${team.name}! The journey continues!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    }

    // Power milestones
    if (teamPower >= 2000) {
      careerHighlights.push({
        id: 'milestone-power-2000',
        type: 'milestone',
        category: 'Team Development',
        title: 'Power Milestone',
        description: 'Team power rating reached 2,000+',
        metric: 'Team Power',
        value: Math.round(teamPower),
        rarity: 'rare',
        shareText: `💪 ${team.name} just reached 2,000 team power! This roster is getting scary good!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    }

    // 🧠 MANAGEMENT HIGHLIGHTS
    if (totalCredits >= 1000000) {
      careerHighlights.push({
        id: 'management-financial-empire',
        type: 'management',
        category: 'Financial Achievement',
        title: 'Financial Empire',
        description: 'Accumulated over 1,000,000 credits',
        metric: 'Total Credits',
        value: totalCredits.toLocaleString(),
        rarity: 'legendary',
        shareText: `💰 ${team.name} just crossed 1 MILLION credits! This is what dynasty looks like!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    } else if (totalCredits >= 100000) {
      careerHighlights.push({
        id: 'management-first-100k',
        type: 'management',
        category: 'Financial Achievement',
        title: 'First 100K Credits',
        description: 'Accumulated over 100,000 credits',
        metric: 'Total Credits',
        value: totalCredits.toLocaleString(),
        rarity: 'epic',
        shareText: `💰 ${team.name} just crossed 100K credits! Financial success is building!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    }

    // 🔥 STREAK HIGHLIGHTS
    const winStreak = calculateWinStreak(recentMatches, teamId);
    if (winStreak >= 10) {
      careerHighlights.push({
        id: 'streak-10-wins',
        type: 'streak',
        category: 'Win Streak',
        title: '10+ Game Streak',
        description: `Currently on a ${winStreak} game winning streak`,
        metric: 'Win Streak',
        value: winStreak,
        rarity: 'legendary',
        shareText: `🔥 ${team.name} is on FIRE with a ${winStreak} game winning streak! Unstoppable!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    } else if (winStreak >= 6) {
      careerHighlights.push({
        id: 'streak-6-wins',
        type: 'streak',
        category: 'Win Streak',
        title: '6 Straight Wins',
        description: `Currently on a ${winStreak} game winning streak`,
        metric: 'Win Streak',
        value: winStreak,
        rarity: 'epic',
        shareText: `🔥 ${team.name} is heating up with a ${winStreak} game winning streak!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    } else if (winStreak >= 3) {
      careerHighlights.push({
        id: 'streak-3-wins',
        type: 'streak',
        category: 'Win Streak',
        title: '3 Consecutive Wins',
        description: `Currently on a ${winStreak} game winning streak`,
        metric: 'Win Streak',
        value: winStreak,
        rarity: 'rare',
        shareText: `🔥 ${team.name} is building momentum with a ${winStreak} game winning streak!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString()
      });
    }

    // 🥇 RECORD HIGHLIGHTS
    const attendanceRecords = recentMatches.filter((match: any) => {
      return match.homeTeamId === teamId && match.attendanceRate >= 1.0;
    });

    if (attendanceRecords.length > 0) {
      careerHighlights.push({
        id: 'record-attendance-100',
        type: 'record',
        category: 'Stadium Record',
        title: 'Attendance Record',
        description: 'Achieved 100% attendance in a home game',
        metric: 'Attendance Rate',
        value: '100%',
        rarity: 'rare',
        shareText: `🏟️ ${team.name} just packed the house with 100% attendance! The fans are loving this team!`,
        timestamp: attendanceRecords[0].createdAt,
        unlockedAt: attendanceRecords[0].createdAt
      });
    }

    // Filter highlights based on request
    let filteredHighlights = careerHighlights;
    if (filter !== 'all') {
      filteredHighlights = careerHighlights.filter(h => h.type === filter);
    }

    // Sort highlights
    if (tab === 'rarest') {
      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
      filteredHighlights.sort((a, b) => {
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      });
    } else {
      filteredHighlights.sort((a, b) => 
        new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
      );
    }

    res.json(filteredHighlights);
  } catch (error) {
    console.error('Error fetching career highlights:', error);
    next(error);
  }
});

// Helper functions
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;
  
  const validPlayers = players.filter(p => !p.isRetired && !p.isOnMarket);
  if (validPlayers.length === 0) return 0;

  const totalPower = validPlayers.reduce((sum, player) => {
    const power = (
      (player.speed || 0) +
      (player.power || 0) +
      (player.agility || 0) +
      (player.throwing || 0) +
      (player.catching || 0) +
      (player.kicking || 0)
    ) / 6;
    return sum + power;
  }, 0);

  return totalPower / validPlayers.length;
}

function calculateWinStreak(matches: any[], teamId: string): number {
  let streak = 0;
  
  for (const match of matches) {
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    
    if (teamScore > opponentScore) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

export default router;