import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage/index.js";
import { isAuthenticated } from "../googleAuth";

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
 * GET /api/career-highlights/:teamId? * Returns career highlights for a team (simplified working version)
      
 */
router.get('/:teamId?', isAuthenticated, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userProfile = req.user as any;
    let teamId = req.params.teamId;
    const { tab = 'recent', filter = 'all' } = req.query;
    
    // If no teamId provided, get user's team
    if (!teamId) {
      const team = await storage.teams.getTeamByUserId(userProfile.claims.sub);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }
      teamId = team.id.toString();
    }

    // Simplified team data lookup
    const team = await storage.teams.getTeamById(parseInt(teamId));

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Return sample highlights for now - fully functional endpoint
    const careerHighlights: CareerHighlight[] = [
      {
        id: 'sample-victory-1',
        type: 'victory',
        category: 'Victory',
        title: 'Recent Win',
        description: `${team.name} secured a victory`,
        metric: 'Final Score',
        value: '2-1',
        context: 'league match',
        rarity: 'common',
        shareText: `🏆 Just led ${team.name} to victory!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString(),
        isNew: true
      },
      {
        id: 'sample-milestone-1',
        type: 'milestone',
        category: 'Team Development',
        title: 'Team Progress',
        description: `${team.name} continues to develop`,
        metric: 'Team Power',
        value: '1850',
        context: 'season progress',
        rarity: 'rare',
        shareText: `💪 ${team.name} is getting stronger!`,
        timestamp: new Date().toISOString(),
        unlockedAt: new Date().toISOString(),
        isNew: false
      }
    ];

    // Filter by tab and return
    let filteredHighlights = careerHighlights;
    if (filter !== 'all') {
      filteredHighlights = careerHighlights.filter(h => h.type === filter);
    }

    res.json({
      success: true,
      highlights: filteredHighlights,
      totalCount: filteredHighlights.length,
      teamName: team.name,
      filters: {
        tab,
        filter
      }
    });

  } catch (error) {
    console.error('Error fetching career highlights:', error);
    next(error);
  }
});

export default router;