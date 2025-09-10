/**
 * TEAM CORE ROUTES
 * Essential team operations: authentication, team retrieval, creation
 * Extracted from teamRoutes.ts for better maintainability
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../../storage/index.js';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { TeamNameValidator } from '../../services/teamNameValidation.js';
import { CamaraderieService } from '../../services/camaraderieService.js';
import { logger } from '../../services/loggingService.js';

const router = Router();

// Calculate team power from players
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: Math.round(((player?.speed ?? 20) + (player?.power ?? 20) + (player?.agility ?? 20) + 
                                (player?.throwing ?? 20) + (player?.catching ?? 20) + (player?.kicking ?? 20) + 
                                (player?.staminaAttribute ?? 20) + (player?.leadership ?? 20)) / 8)
  }));

  const topPlayers = playersWithPower
    .sort((a: any, b: any) => (b?.individualPower ?? 0) - (a?.individualPower ?? 0))
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + (player?.individualPower ?? 0), 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

// Team creation schema
const createTeamSchema = z.object({
  teamName: z.string().min(1).max(50),
  ndaAgreed: z.boolean().optional()
});

/**
 * Firebase authentication test endpoint
 * GET /firebase-test
 */
router.get('/firebase-test', asyncHandler(async (req: Request, res: Response) => {
  const admin = await import('firebase-admin');
  
  const config = {
    firebaseAppsCount: admin.apps.length,
    projectId: admin?.apps?.[0]?.options?.projectId ?? 'none',
    hasServiceAccount: !!(admin?.apps?.[0]?.options?.credential),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  logger.debug('TEAM_CORE', 'Firebase test endpoint accessed', config);
  res.json(config);
}));

/**
 * Get user's team with real-time statistics
 * GET /my
 */
router.get('/my', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  logger.debug('TEAM_CORE', 'Get my team endpoint called');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  const team = await storage.teams.getTeamByUserId(userId);
  
  if (!team) {
    logger.warn('TEAM_CORE', 'No team found for user', { userId });
    return res.status(404).json({ 
      message: "Team not found", 
      needsTeamCreation: true 
    });
  }

  logger.debug('TEAM_CORE', 'Team found', { 
    teamId: team.id, 
    teamName: team.name,
    playersCount: team?.playersCount, 
    playersArrayLength: team.players?.length 
  });

  // Calculate team power and camaraderie
  const teamPower = calculateTeamPower(team?.players || []);
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

  // Serialize team data with corrected financial formatting
  let serializedTeam = { 
    ...team, 
    teamPower, 
    teamCamaraderie 
  };

  if (serializedTeam?.finances) {
    serializedTeam.finances = {
      ...serializedTeam.finances,
      credits: serializedTeam.finances.credits?.toString() || '0',
      gems: serializedTeam.finances.gems?.toString() || '0',
      escrowCredits: serializedTeam.finances.escrowCredits?.toString() || '0',
      escrowGems: serializedTeam.finances.escrowGems?.toString() || '0',
      projectedIncome: serializedTeam.finances.projectedIncome?.toString() || '0',
      projectedExpenses: serializedTeam.finances.projectedExpenses?.toString() || '0',
      lastSeasonRevenue: serializedTeam.finances.lastSeasonRevenue?.toString() || '0',
      lastSeasonExpenses: serializedTeam.finances.lastSeasonExpenses?.toString() || '0',
      facilitiesMaintenanceCost: serializedTeam.finances.facilitiesMaintenanceCost?.toString() || '0'
    };
  }

  // Get real-time statistics from actual game results
  logger.debug('TEAM_CORE', 'Calculating real-time stats', {
    teamName: team.name,
    currentDbStats: `${serializedTeam.wins}W-${serializedTeam.draws}D-${serializedTeam.losses}L-${serializedTeam.points}pts`
  });
  
  try {
    const { calculateTeamStatisticsFromGames } = await import('../../utils/teamStatisticsCalculator.js');
    
    const realTimeStats = await calculateTeamStatisticsFromGames(
      parseInt(team.id.toString()), 
      team.name
    );
    
    logger.info('TEAM_CORE', 'Real-time stats calculated', {
      teamName: serializedTeam.name,
      dbStats: `${serializedTeam.wins}W-${serializedTeam.draws}D-${serializedTeam.losses}L`,
      realStats: `${realTimeStats.wins}W-${realTimeStats.draws}D-${realTimeStats.losses}L`
    });
    
    // Use real-time statistics instead of stale database values
    serializedTeam = {
      ...serializedTeam,
      wins: realTimeStats.wins,
      losses: realTimeStats.losses, 
      draws: realTimeStats.draws,
      points: realTimeStats.points,
      played: realTimeStats.gamesPlayed
    };
    
  } catch (statsError) {
    logger.error('TEAM_CORE', 'Failed to calculate real-time stats, using database values', statsError);
    
    // Fallback to database values if stats calculation fails
    serializedTeam = {
      ...serializedTeam,
      played: (serializedTeam.wins || 0) + (serializedTeam.losses || 0) + (serializedTeam.draws || 0)
    };
  }

  return res.json(serializedTeam);
}));

/**
 * Get team by ID
 * GET /:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  
  if (!teamId || isNaN(teamId)) {
    throw ErrorCreators.validation('Invalid team ID provided');
  }
  
  const team = await storage.teams.getTeamById(teamId);
  
  if (!team) {
    logger.warn('TEAM_CORE', 'Team not found by ID', { teamId });
    return res.status(404).json({ message: "Team not found" });
  }

  logger.debug('TEAM_CORE', 'Team retrieved by ID', { teamId, teamName: team.name });
  
  const teamPower = calculateTeamPower(team?.players || []);
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());
  
  res.json({ 
    ...team, 
    teamPower, 
    teamCamaraderie 
  });
}));

/**
 * Create new team
 * POST /create
 */
router.post('/create', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { teamName, ndaAgreed } = createTeamSchema.parse(req.body);
  const userId = req?.user?.uid;

  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  logger.info('TEAM_CORE', 'Team creation request', { userId, teamName, ndaAgreed });

  // Validate team name
  const nameValidation = await TeamNameValidator.validateTeamName(teamName);
  if (!nameValidation.isValid) {
    logger.warn('TEAM_CORE', 'Team name validation failed', { 
      teamName, 
      reason: nameValidation.reason 
    });
    throw ErrorCreators.validation(nameValidation.reason || 'Invalid team name');
  }

  // Check if user already has a team
  const existingTeam = await storage.teams.getTeamByUserId(userId);
  if (existingTeam) {
    logger.warn('TEAM_CORE', 'User already has team', { userId, existingTeamId: existingTeam.id });
    throw ErrorCreators.conflict('User already has a team');
  }

  // Create the team
  const newTeam = await storage.teams.createTeam({
    name: teamName,
    userId: userId,
    ndaAgreed: ndaAgreed || false
  });

  logger.info('TEAM_CORE', 'Team created successfully', { 
    teamId: newTeam.id, 
    teamName: newTeam.name,
    userId 
  });

  res.status(201).json({
    message: 'Team created successfully',
    team: newTeam
  });
}));

/**
 * Get team by ID (public endpoint for live match viewer)
 * GET /:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  
  if (isNaN(teamId)) {
    return res.status(400).json({ message: "Invalid team ID" });
  }
  
  const team = await storage.teams.getTeamById(teamId);
  
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }
  
  // Return basic team info for live match viewer
  res.json({
    id: team.id,
    name: team.name,
    logoUrl: team.logoUrl,
    division: team.division,
    subdivision: team.subdivision
  });
}));

export default router;