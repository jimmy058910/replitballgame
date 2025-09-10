/**
 * TEAM MATCHES & SCHEDULING ROUTES
 * Match history, upcoming games, and scheduling operations
 * Extracted from teamRoutes.ts for better maintainability
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { storage } from '../../storage.js';

const router = Router();

/**
 * Get user's next opponent
 * GET /my/next-opponent
 */
router.get('/my/next-opponent', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  try {
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const nextOpponent = await storage.teams.getNextOpponent(team.id);
    
    if (!nextOpponent) {
      return res.json({
        success: true,
        data: null,
        message: 'No upcoming matches found'
      });
    }

    res.json({
      success: true,
      data: nextOpponent
    });
  } catch (error) {
    logger.error('Failed to get next opponent', { userId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      message: 'Failed to get next opponent'
    });
  }
}));

/**
 * Get comprehensive schedule for user's team
 * GET /my-schedule/comprehensive
 */
router.get('/my-schedule/comprehensive', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  try {
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const schedule = await storage.teams.getComprehensiveSchedule(team.id);
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Failed to get comprehensive schedule', { userId, teamId: team?.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      message: 'Failed to get comprehensive schedule'
    });
  }
}));

/**
 * Get recent matches for a team
 * GET /:teamId/matches/recent
 */
router.get('/:teamId/matches/recent', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user.claims.sub;
  
  try {
    // Verify team access
    const team = await storage.teams.getTeamByUserId(userId);
    const isAdmin = await RBACService.hasPermission(userId, Permission.VIEW_ALL_TEAMS);
    
    if (!team || (team.id !== parseInt(teamId) && !isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const recentMatches = await storage.matches.getRecentMatchesByTeam(parseInt(teamId));
    
    res.json({
      success: true,
      data: recentMatches
    });
  } catch (error) {
    logger.error('Failed to get recent matches', { userId, teamId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      message: 'Failed to get recent matches'
    });
  }
}));

/**
 * Get upcoming matches for user's team
 * GET /my/matches/upcoming
 */
router.get('/my/matches/upcoming', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  let team: any = null;
  
  try {
    team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const upcomingMatches = await storage.matches.getUpcomingMatches(team.id);
    
    res.json({
      success: true,
      data: upcomingMatches
    });
  } catch (error) {
    logger.error('Failed to get upcoming matches', { userId, teamId: team?.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming matches'
    });
  }
}));

/**
 * Get upcoming matches for a specific team
 * GET /:teamId/matches/upcoming
 */
router.get('/:teamId/matches/upcoming', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user.claims.sub;
  
  try {
    // Verify team access
    const team = await storage.teams.getTeamByUserId(userId);
    const isAdmin = await RBACService.hasPermission(userId, Permission.VIEW_ALL_TEAMS);
    
    if (!team || (team.id !== parseInt(teamId) && !isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const upcomingMatches = await storage.matches.getUpcomingMatches(parseInt(teamId));
    
    res.json({
      success: true,
      data: upcomingMatches
    });
  } catch (error) {
    logger.error('Failed to get team upcoming matches', { userId, teamId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming matches'
    });
  }
}));

export default router;