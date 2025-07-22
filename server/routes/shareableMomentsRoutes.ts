import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

interface ShareableMoment {
  id: string;
  type: 'victory' | 'milestone' | 'achievement' | 'streak' | 'record';
  title: string;
  description: string;
  metric: string;
  value: string | number;
  context?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shareText: string;
  timestamp: string;
}

/**
 * GET /api/shareable-moments/:teamId?
 * Returns shareable moments for a team (social proof mechanics)
 */
router.get('/:teamId?', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.user as any;
    let teamId = req.params.teamId;
    
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

    // Get team data with stats
    const team = await storage.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          where: { isRetired: false, isOnMarket: false }
        },
        finances: true,
        stadium: true
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get recent match history for victory moments
    const recentMatches = await storage.prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    const shareableMoments: ShareableMoment[] = [];

    // Generate victory moments
    recentMatches.forEach((match: any) => {
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      
      if (teamScore > opponentScore) {
        const scoreDiff = teamScore - opponentScore;
        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
        let title = 'Victory!';
        
        if (scoreDiff >= 3) {
          rarity = 'epic';
          title = 'Dominant Victory!';
        } else if (scoreDiff >= 2) {
          rarity = 'rare';
          title = 'Convincing Win!';
        }

        shareableMoments.push({
          id: `victory-${match.id}`,
          type: 'victory',
          title,
          description: `Defeated ${opponent.name} in a ${match.matchType.toLowerCase()} match`,
          metric: 'Final Score',
          value: `${teamScore}-${opponentScore}`,
          context: `${match.matchType} match`,
          rarity,
          shareText: `🏆 Just led ${team.name} to a ${teamScore}-${opponentScore} victory over ${opponent.name}! ${rarity === 'epic' ? 'What a dominant performance!' : 'Great game!'} #RealmRivalry #FantasySports`,
          timestamp: match.createdAt
        });
      }
    });

    // Generate milestone moments based on team stats
    const totalWins = team.wins || 0;
    const activePlayers = team.players?.length || 0;
    const teamCredits = team.finances?.credits || 0;
    const stadiumCapacity = team.stadium?.capacity || 0;

    // Win milestone moments
    if (totalWins >= 10) {
      let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'rare';
      let title = '10 Wins Milestone';
      
      if (totalWins >= 50) {
        rarity = 'legendary';
        title = '50 Wins Achieved!';
      } else if (totalWins >= 25) {
        rarity = 'epic';
        title = '25 Wins Milestone';
      }

      shareableMoments.push({
        id: `milestone-wins-${totalWins}`,
        type: 'milestone',
        title,
        description: `Reached ${totalWins} career victories with ${team.name}`,
        metric: 'Total Wins',
        value: totalWins,
        rarity,
        shareText: `🎯 ${team.name} just hit ${totalWins} career wins! Building a dynasty one game at a time. #RealmRivalry #MilestoneAchieved`,
        timestamp: new Date().toISOString()
      });
    }

    // Team composition achievements
    if (activePlayers >= 12) {
      shareableMoments.push({
        id: `achievement-roster-${activePlayers}`,
        type: 'achievement',
        title: 'Full Roster Assembled',
        description: `Built a complete ${activePlayers}-player roster`,
        metric: 'Active Players',
        value: activePlayers,
        rarity: 'common',
        shareText: `⚡ ${team.name} roster is fully assembled with ${activePlayers} talented players! Ready for competition. #RealmRivalry #TeamBuilding`,
        timestamp: new Date().toISOString()
      });
    }

    // Financial achievements
    if (teamCredits >= 50000) {
      let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'rare';
      let title = 'Financial Success';
      
      if (teamCredits >= 200000) {
        rarity = 'legendary';
        title = 'Financial Empire!';
      } else if (teamCredits >= 100000) {
        rarity = 'epic';
        title = 'Wealthy Franchise';
      }

      shareableMoments.push({
        id: `achievement-credits-${Math.floor(teamCredits / 10000)}`,
        type: 'achievement',
        title,
        description: `Built a financially strong franchise`,
        metric: 'Team Credits',
        value: teamCredits.toLocaleString(),
        rarity,
        shareText: `💰 ${team.name} has reached ${teamCredits.toLocaleString()} credits! Smart management pays off. #RealmRivalry #FinancialSuccess`,
        timestamp: new Date().toISOString()
      });
    }

    // Win streak detection (recent matches)
    let currentStreak = 0;
    for (const match of recentMatches) {
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      
      if (teamScore > opponentScore) {
        currentStreak++;
      } else {
        break;
      }
    }

    if (currentStreak >= 3) {
      let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'rare';
      let title = `${currentStreak}-Game Win Streak!`;
      
      if (currentStreak >= 7) {
        rarity = 'legendary';
        title = `${currentStreak}-Game Winning Streak!`;
      } else if (currentStreak >= 5) {
        rarity = 'epic';
        title = `${currentStreak}-Game Win Streak!`;
      }

      shareableMoments.push({
        id: `streak-${currentStreak}`,
        type: 'streak',
        title,
        description: `On fire with ${currentStreak} consecutive victories`,
        metric: 'Win Streak',
        value: currentStreak,
        rarity,
        shareText: `🔥 ${team.name} is on FIRE with a ${currentStreak}-game winning streak! Can't be stopped! #RealmRivalry #WinStreak #OnFire`,
        timestamp: new Date().toISOString()
      });
    }

    // Sort by rarity and recency
    const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
    shareableMoments.sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    console.log(`Generated ${shareableMoments.length} shareable moments for team ${teamId}`);
    return res.json(shareableMoments);

  } catch (error) {
    console.error('Error generating shareable moments:', error);
    return next(error);
  }
});

export default router;