/**
 * LATE REGISTRATION API ROUTES
 * 
 * API endpoints for the dynamic late registration system
 */

import { Router } from 'express';
import { LateRegistrationSystem } from '../services/lateRegistrationSystem.js';
import { DailyAutomationService } from '../services/dailyAutomationService.js';
import { requireAuth } from '../middleware/firebaseAuth.js';
import type { Team } from '@shared/types/models';


const router = Router();

/**
 * Register a late team (authenticated)
 */
router.post('/register', requireAuth, async (req: any, res) => {
  try {
    const { teamName, race } = req.body;
    const firebaseUID = req.user?.uid || req.user?.claims?.sub;

    if (!teamName || !race) {
      return res.status(400).json({
        success: false,
        message: 'Team name and race are required'
      });
    }

    // Check if user already has a team
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    const existingUserProfile = await prisma.userProfile.findUnique({
      where: { userId: firebaseUID },
      include: { Team: true }
    });

    if (existingUserProfile?.Team) {
      return res.status(400).json({
        success: false,
        message: 'You already have a team registered'
      });
    }

    // Create user profile if needed
    const userProfile = await prisma.userProfile.upsert({
      where: { userId: firebaseUID },
      create: {
        userId: firebaseUID,
        email: req.user?.email || 'unknown@example.com'
      },
      update: {}
    });

    // Register the team
    const result = await LateRegistrationSystem.registerLateTeam({
      name: teamName,
      race,
      userProfileId: userProfile.id
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Late registration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to system error'
    });
  }
});

/**
 * Get current late registration status
 */
router.get('/status', async (req, res) => {
  try {
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();

    // Get current day and cutoff info
    const currentDay = Math.max(1, Math.floor((Date.now() - new Date('2025-08-16').getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const cutoffDay = 9;
    const isPastCutoff = currentDay > cutoffDay;

    // Get subdivision status
    const subdivisions = await prisma.team.groupBy({
      by: ['subdivision'],
      where: {
        division: 8,
        subdivision: { not: null }
      },
      _count: { id: true }
    });

    const subdivisionStatus = subdivisions.map(sub => ({
      name: sub.subdivision,
      teamCount: sub._count.id,
      isFull: sub._count.id >= 8,
      needsAI: 8 - sub._count.id
    }));

    res.json({
      currentDay,
      cutoffDay,
      isPastCutoff,
      subdivisions: subdivisionStatus,
      totalActiveSubdivisions: subdivisions.length,
      automation: DailyAutomationService.getStatus()
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status'
    });
  }
});

/**
 * Manual trigger for daily fill (admin only)
 */
router.post('/admin/trigger-daily-fill', async (req, res) => {
  try {
    console.log('🔧 Manual trigger requested for daily fill process');
    
    const result = await DailyAutomationService.triggerManual();
    
    res.json(result);

  } catch (error) {
    console.error('❌ Manual trigger failed:', error);
    res.status(500).json({
      success: false,
      message: 'Manual trigger failed'
    });
  }
});

/**
 * Generate schedule for specific subdivision (admin)
 */
router.post('/admin/generate-schedule/:subdivision', async (req, res) => {
  try {
    const { subdivision } = req.params;
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();

    // Get teams in subdivision
    const teams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: subdivision
      },
      orderBy: { id: 'asc' }
    });

    if (teams.length !== 8) {
      return res.status(400).json({
        success: false,
        message: `Subdivision ${subdivision} has ${teams.length} teams, needs exactly 8`
      });
    }

    const result = await LateRegistrationSystem.generateSubdivisionSchedule(subdivision, teams);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Schedule generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Schedule generation failed'
    });
  }
});

/**
 * Get subdivision schedule details
 */
router.get('/subdivision/:subdivision/schedule', async (req, res) => {
  try {
    const { subdivision } = req.params;
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();

    // Get teams in subdivision
    const teams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: subdivision
      },
      select: { id: true, name: true, isAI: true }
    });

    // Get games for subdivision (using homeTeamId/awayTeamId)
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeam: { subdivision: subdivision } },
          { awayTeam: { subdivision: subdivision } }
        ]
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    // Get subdivision status by checking existing games
    const gameCount = await prisma.game.count({
      where: {
        OR: [
          { homeTeam: { subdivision: subdivision } },
          { awayTeam: { subdivision: subdivision } }
        ]
      }
    });

    const status = {
      isScheduled: gameCount > 0,
      totalGames: gameCount
    };

    res.json({
      subdivision,
      teams,
      games: games.map(game => ({
        id: game.id,
        homeTeam: game.homeTeam.name,
        awayTeam: game.awayTeam.name,
        gameDate: game.gameDate,
        status: game.status
      })),
      status,
      totalGames: games.length,
      gamesPerTeam: teams.length > 0 ? Math.floor(games.length / teams.length * 2) : 0
    });

  } catch (error) {
    console.error('❌ Schedule fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule'
    });
  }
});

export default router;