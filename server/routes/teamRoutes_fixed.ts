import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { requireAuth } from "../middleware/firebaseAuth";
import { z } from "zod";
import { ErrorCreators, asyncHandler } from "../services/errorService";
import { TeamNameValidator } from "../services/teamNameValidation";
import { CamaraderieService } from "../services/camaraderieService";

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
    .sort((a, b) => b.individualPower - a.individualPower)
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum, player) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

// Team creation schema
const createTeamSchema = z.object({
  teamName: z.string().min(1).max(50),
  ndaAgreed: z.boolean().optional()
});

// Firebase test endpoint
router.get('/firebase-test', asyncHandler(async (req: any, res: Response) => {
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

// Get user's team - PRIMARY ROUTE
router.get('/my', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  console.log('🔍 /my route called for userId:', userId);
  
  const team = await storage.teams.getTeamByUserId(userId);
  console.log('🔍 Found team:', team ? team.name : 'none');

  if (!team) {
    return res.status(404).json({ 
      message: "Team not found", 
      needsTeamCreation: true 
    });
  }

  const teamPlayers = await storage.players.getPlayersByTeamId(team.id);
  const teamPower = calculateTeamPower(teamPlayers);
  
  // Calculate real-time camaraderie
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

  // Serialize BigInt fields
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

  res.json(serializedTeam);
}));

// Get user's next opponent
router.get('/my/next-opponent', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  // For now, return placeholder until next opponent logic is implemented
  res.json({ 
    message: "Next opponent feature coming soon",
    teamId: team.id 
  });
}));

// Team creation endpoint
router.post('/create', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
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

  // Check NDA acceptance
  const userStorage = await import('../storage/userStorage');
  const ndaAccepted = await userStorage.userStorage.checkNDAAcceptance(userId);
  if (!ndaAccepted) {
    throw ErrorCreators.forbidden("You must accept the Non-Disclosure Agreement to participate in pre-alpha testing");
  }

  // Create team logic here - simplified for immediate functionality
  const newTeam = await storage.teams.createTeam({ 
    userProfileId: parseInt(userId), 
    name: teamName,
    isAI: false,
    division: 8
  });

  res.json({
    success: true,
    message: "Team created successfully",
    team: newTeam
  });
}));

export { router as teamRoutes };