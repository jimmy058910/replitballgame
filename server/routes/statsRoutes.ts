import { Router, Response } from 'express.js';
import { StatsService } from '../services/statsService.js';
import { asyncHandler } from '../services/errorService.js';
import { isAuthenticated } from '../googleAuth.js';

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

/**
 * Get comprehensive player stats
 * GET /api/stats/player/:playerId
 */
router.get('/player/:playerId', asyncHandler(async (req: any, res: Response) => {
  const { playerId } = req.params;
  const { seasonOnly } = req.query;
  
  const stats = await StatsService.getPlayerStats(playerId, seasonOnly === 'true');
  
  res.json(stats);
}));

/**
 * Get comprehensive team stats
 * GET /api/stats/team/:teamId
 */
router.get('/team/:teamId', asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const { seasonOnly } = req.query;
  
  const stats = await StatsService.getTeamStats(teamId, seasonOnly === 'true');
  
  res.json(stats);
}));

/**
 * Get live match stats display
 * GET /api/stats/match/:matchId
 */
router.get('/match/:matchId', asyncHandler(async (req: any, res: Response) => {
  const { matchId } = req.params;
  
  const matchStats = await StatsService.getMatchStatsDisplay(matchId);
  
  res.json(matchStats);
}));

/**
 * Get team leaderboards
 * GET /api/stats/leaderboards/teams
 */
router.get('/leaderboards/teams', asyncHandler(async (req: any, res: Response) => {
  const leaderboards = await StatsService.getTeamLeaderboards();
  
  res.json(leaderboards);
}));

/**
 * Get player leaderboards
 * GET /api/stats/leaderboards/players
 */
router.get('/leaderboards/players', asyncHandler(async (req: any, res: Response) => {
  const leaderboards = await StatsService.getPlayerLeaderboards();
  
  res.json(leaderboards);
}));

/**
 * Get player stats for current user's team
 * GET /api/stats/my-team/players
 */
router.get('/my-team/players', asyncHandler(async (req: any, res: Response) => {
  // This would need to be implemented to get all players on user's team
  // and return their comprehensive stats
  res.json({ message: 'Feature coming soon' });
}));

/**
 * Get team stats for current user's team
 * GET /api/stats/my-team
 */
router.get('/my-team', asyncHandler(async (req: any, res: Response) => {
  // This would need to be implemented to get user's team stats
  res.json({ message: 'Feature coming soon' });
}));

export default router;