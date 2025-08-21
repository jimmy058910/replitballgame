import { Router, type Request, type Response, type NextFunction } from "express";

console.log('🔍 [teamRoutes.ts] Module loading...');
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod";
import { ErrorCreators, asyncHandler } from '../services/errorService.js';
import { TeamNameValidator } from '../services/teamNameValidation.js';
import { CamaraderieService } from '../services/camaraderieService.js';
import { cacheResponse } from "../middleware/cacheMiddleware.js";

const router = Router();

// Calculate team power from players
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: Math.round(((player.speed || 20) + (player.power || 20) + (player.agility || 20) + 
                                (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20) + 
                                (player.staminaAttribute || 20) + (player.leadership || 20)) / 8)
  }));

  const topPlayers = playersWithPower
    .sort((a: any, b: any) => b.individualPower - a.individualPower)
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

// Team creation schema
const createTeamSchema = z.object({
  teamName: z.string().min(1).max(50),
  ndaAgreed: z.boolean().optional()
});

// Firebase test endpoint
router.get('/firebase-test', asyncHandler(async (req: Request, res: Response) => {
  const admin = await import('firebase-admin');
  
  const config = {
    firebaseAppsCount: admin.apps.length,
    projectId: admin.apps[0]?.options?.projectId || 'none',
    hasServiceAccount: !!admin.apps[0]?.options?.credential,
    nodeEnv: process.env.NODE_ENV,
    viteFirebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Firebase Admin SDK Configuration Check',
    config
  });
}));

// Get user's team - PRIMARY ROUTE (DEBUG MODE)
router.get('/my', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/my route called!');
  
  // DEBUG: Log what user ID the middleware is actually providing
  console.log('🔍 [DEBUG] req.user:', req.user);
  const authUserId = req.user?.uid || req.user?.claims?.sub;
  console.log('🔍 [DEBUG] Extracted authUserId:', authUserId);
  
  // Use the authenticated user ID directly  
  const userId = authUserId || 'dev-user-123';
  console.log('🔍 [DEBUG] Final userId:', userId);
  
  const team = await storage.teams.getTeamByUserId(userId);
  console.log('✅ Using team:', team.name, 'players:', team?.playersCount || 0);

  if (!team) {
    console.log('❌ No team found for userId:', userId);
    return res.status(404).json({ 
      message: "Team not found", 
      needsTeamCreation: true 
    });
  }

  console.log('✅ Team found! playersCount:', team.playersCount, 'players.length:', team.players?.length);

  // Use team object directly (working approach from debug endpoint)  
  const teamPower = calculateTeamPower(team.players || []);
  
  // Calculate real-time camaraderie
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

  // Team object already has players with contracts from serializeTeamData()
  const serializedTeam = { 
    ...team, 
    teamPower, 
    teamCamaraderie 
  };

  if (serializedTeam.finances) {
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

  return res.json(serializedTeam);
}));

// Get user's next opponent
router.get('/my/next-opponent', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub;
  if (!userId) {
    console.log('❌ User ID extraction failed. req.user:', req.user);
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  // For now, return placeholder until next opponent logic is implemented
  return res.json({ 
    message: "Next opponent feature coming soon",
    teamId: team.id 
  });
}));

// Get user's comprehensive schedule (all games: League, Tournament, Exhibition)
router.get('/my-schedule/comprehensive', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub;
  if (!userId) {
    console.log('❌ User ID extraction failed. req.user:', req.user);
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  // Fetch ALL games for the user's team across all match types
  const allGames = await storage.matches.getMatchesByTeamId(team.id);

  // Transform games to match expected frontend format
  const transformedGames = allGames.map((game: any) => ({
    id: game.id,
    homeTeam: {
      id: game.homeTeam.id,
      name: game.homeTeam.name
    },
    awayTeam: {
      id: game.awayTeam.id,
      name: game.awayTeam.name
    },
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    gameDate: game.gameDate,
    status: game.status,
    matchType: game.matchType,
    tournamentId: game.tournamentId,
    round: game.round
  }));

  console.log(`✅ [COMPREHENSIVE SCHEDULE] Found ${transformedGames.length} total games for team ${team.name}`);
  
  return res.json(transformedGames);
}));

// Get upcoming matches for authenticated user's team (for header display)
router.get('/my/matches/upcoming', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/my/matches/upcoming route called!');
  
  // DEBUG: Log what user ID the middleware is actually providing
  console.log('🔍 [DEBUG] req.user:', req.user);
  const authUserId = req.user?.uid || req.user?.claims?.sub;
  console.log('🔍 [DEBUG] Extracted authUserId:', authUserId);
  
  // Use the authenticated user ID directly (same pattern as /my route)
  const userId = authUserId || 'dev-user-123';
  console.log('🔍 [DEBUG] Final userId for upcoming matches:', userId);
  
  const team = await storage.teams.getTeamByUserId(userId);
  console.log('🔍 [DEBUG] Team lookup result:', team?.name, 'ID:', team?.id);
  
  if (!team) {
    console.log('❌ [UPCOMING MATCHES] No team found for user:', userId);
    throw ErrorCreators.notFound("No team found for user");
  }

  // Get all matches for the team (same method as comprehensive schedule)
  const allMatches = await storage.matches.getMatchesByTeamId(team.id);
  
  // Filter for upcoming matches (not simulated and in the future)
  const now = new Date();
  const upcomingMatches = allMatches
    .filter((match: any) => 
      !match.simulated && 
      match.status === 'SCHEDULED' &&
      new Date(match.gameDate) > now
    )
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
    .slice(0, 5) // Return only next 5 upcoming matches
    .map((match: any) => ({
      id: match.id.toString(),
      homeTeam: { 
        id: match.homeTeam.id.toString(), 
        name: match.homeTeam.name 
      },
      awayTeam: { 
        id: match.awayTeam.id.toString(), 
        name: match.awayTeam.name 
      },
      gameDate: match.gameDate,
      matchType: match.matchType
    }));

  console.log(`✅ [UPCOMING MATCHES] Team ${team.name} - Total matches: ${allMatches.length}, Upcoming: ${upcomingMatches.length}`);
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    console.log(`🎯 [NEXT MATCH] ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name} on ${nextMatch.gameDate}`);
  }
  
  return res.json(upcomingMatches);
}));

// Get upcoming matches for team (for header display) - LEGACY ENDPOINT
router.get('/:teamId/matches/upcoming', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  // Get authenticated user and verify team ownership
  const userId = req.user?.uid || req.user?.claims?.sub;
  const team = await storage.teams.getTeamByUserId(userId);
  
  if (!team || team.id !== teamId) {
    throw ErrorCreators.forbidden("Access denied to this team's matches");
  }

  // Get all matches for the team (same method as comprehensive schedule)
  const allMatches = await storage.matches.getMatchesByTeamId(teamId);
  
  // Filter for upcoming matches (not simulated and in the future)
  const now = new Date();
  const upcomingMatches = allMatches
    .filter((match: any) => 
      !match.simulated && 
      match.status === 'SCHEDULED' &&
      new Date(match.gameDate) > now
    )
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
    .slice(0, 5) // Return only next 5 upcoming matches
    .map((match: any) => ({
      id: match.id.toString(),
      homeTeam: { 
        id: match.homeTeam.id.toString(), 
        name: match.homeTeam.name 
      },
      awayTeam: { 
        id: match.awayTeam.id.toString(), 
        name: match.awayTeam.name 
      },
      gameDate: match.gameDate,
      matchType: match.matchType
    }));

  console.log(`✅ [UPCOMING MATCHES] Team ${team.name} - Total matches: ${allMatches.length}, Upcoming: ${upcomingMatches.length}`);
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    console.log(`🎯 [NEXT MATCH] ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name} on ${nextMatch.gameDate}`);
  }
  
  return res.json(upcomingMatches);
}));

// Team creation endpoint
router.post('/create', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub;
  if (!userId) {
    console.log('❌ User ID extraction failed. req.user:', req.user);
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const { teamName, ndaAgreed } = createTeamSchema.parse(req.body);

  // Validate team name
  const validationResult = await TeamNameValidator.validateTeamName(teamName);
  if (!validationResult.isValid) {
    throw ErrorCreators.validation(validationResult.error || "Invalid team name");
  }

  // Check if user already has a team
  const existingTeam = await storage.teams.getTeamByUserId(userId);
  if (existingTeam) {
    throw ErrorCreators.conflict("User already has a team");
  }

  // Check and record NDA acceptance
  if (!ndaAgreed) {
    throw ErrorCreators.forbidden("You must accept the Non-Disclosure Agreement to participate in pre-alpha testing");
  }

  // Create team with complete roster and staff
  const newTeam = await storage.teams.createTeam({
    name: teamName,
    userId: userId
  });

  res.json({
    success: true,
    message: "Team created successfully",
    team: newTeam
  });
}));

console.log('🔍 [teamRoutes.ts] Router configured with routes, exporting...');
console.log('🔍 [teamRoutes.ts] Router stack length:', router.stack.length);

export default router;