import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { isAuthenticated } from "../replitAuth";
import { generateRandomPlayer } from "../services/leagueService";
import { z } from "zod";
import { ErrorCreators, asyncHandler, logInfo } from "../services/errorService";
import { TeamNameValidator } from "../services/teamNameValidation";
import { AgingService } from "../services/agingService";
import { generateRandomName } from "@shared/names";
// import { players as playersTable } from "@shared/schema"; // Not directly used here anymore

const router = Router();

// TODO: Move this to a dedicated TeamService or LeagueService
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: (player.speed || 20) + (player.power || 20) + (player.throwing || 20) +
                    (player.catching || 20) + (player.kicking || 20)
  }));

  const topPlayers = playersWithPower
    .sort((a, b) => b.individualPower - a.individualPower)
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum, player) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

// Team routes  
router.post('/', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  // Validate input using Zod - errors will be automatically converted by the error handler
  const { name } = createTeamSchema.parse(req.body);

  // Comprehensive team name validation
  const validationResult = await TeamNameValidator.validateTeamName(name);
  if (!validationResult.isValid) {
    throw ErrorCreators.validation(validationResult.error || "Invalid team name");
  }

  const existingTeam = await storage.teams.getTeamByUserId(userId); // Use teamStorage
  if (existingTeam) {
    throw ErrorCreators.conflict("User already has a team");
  }

  // Use the sanitized name from validation
  const sanitizedName = validationResult.sanitizedName || name;

  // storage.teams.createTeam now handles default staff and finances
  const team = await storage.teams.createTeam({ // Use teamStorage
    userId,
    name: sanitizedName,
    division: 8,
  });

  logInfo("Team created successfully", { 
    teamId: team.id, 
    teamName: team.name, 
    userId,
    requestId: req.requestId 
  });

  const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
  
  // Define required position distribution: 2 passers, 3 runners, 3 blockers, 2 additional
  const requiredPositions = [
    "passer", "passer", // 2 passers
    "runner", "runner", "runner", // 3 runners  
    "blocker", "blocker", "blocker" // 3 blockers
  ];
  
  // For the remaining 2 players, ensure we don't exceed limits
  const additionalPositions = ["passer", "runner", "blocker"];
  for (let i = 0; i < 2; i++) {
    let position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
    
    // Count current positions
    const currentCount = requiredPositions.filter(p => p === position).length;
    
    // Prevent overstocking: max 3 passers, max 4 runners, max 4 blockers
    if ((position === "passer" && currentCount >= 3) ||
        (position === "runner" && currentCount >= 4) ||
        (position === "blocker" && currentCount >= 4)) {
      // Try other positions
      const alternatives = additionalPositions.filter(p => {
        const count = requiredPositions.filter(pos => pos === p).length;
        return (p === "passer" && count < 3) ||
               (p === "runner" && count < 4) ||
               (p === "blocker" && count < 4);
      });
      if (alternatives.length > 0) {
        position = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }
    
    requiredPositions.push(position);
  }

  // Generate 10 players with proper position distribution
  logInfo("Starting player generation", { 
    teamId: team.id, 
    positionDistribution: requiredPositions,
    requestId: req.requestId 
  });
  
  for (let i = 0; i < 10; i++) {
    const race = races[Math.floor(Math.random() * races.length)];
    const position = requiredPositions[i];
    
    try {
      const playerData = generateRandomPlayer("", race, team.id, position);
      await storage.players.createPlayer(playerData);
    } catch (playerError) {
      const errorMessage = playerError instanceof Error ? playerError.message : String(playerError);
      throw ErrorCreators.database(`Failed to create player ${i + 1}: ${errorMessage}`);
    }
  }

  logInfo("Team creation completed", { 
    teamId: team.id, 
    playersCreated: 10,
    requestId: req.requestId 
  });

  res.status(201).json({ success: true, data: team });
}));

router.get('/my', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const teamPlayers = await storage.players.getPlayersByTeamId(team.id); // Use playerStorage
    const teamPower = calculateTeamPower(teamPlayers);

    res.json({ ...team, teamPower });
  } catch (error) {
    console.error("Error fetching team:", error);
    next(error);
  }
});

router.get('/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const team = await storage.teams.getTeamById(id); // Use teamStorage

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const teamPlayers = await storage.players.getPlayersByTeamId(team.id); // Use playerStorage
    const teamPower = calculateTeamPower(teamPlayers);

    res.json({ ...team, teamPower });
  } catch (error) {
    console.error("Error fetching team:", error);
    next(error);
  }
});

router.get('/:id/players', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const teamPlayers = await storage.players.getPlayersByTeamId(id); // Use playerStorage
    res.json(teamPlayers);
  } catch (error) {
    console.error("Error fetching players:", error);
    next(error);
  }
});

// Formation saving route
router.post('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      const teamToUpdate = await storage.teams.getTeamById(teamId); // Use teamStorage
      if (!teamToUpdate || teamToUpdate.userId !== req.user?.claims?.sub) {
          return res.status(403).json({ message: "Forbidden: You do not own this team." });
      }
    }

    const { formation, substitutionOrder } = req.body;

    if (typeof formation !== 'object' || formation === null) {
        return res.status(400).json({ message: "Invalid formation data" });
    }
     if (substitutionOrder && (typeof substitutionOrder !== 'object' || substitutionOrder === null)) {
        return res.status(400).json({ message: "Invalid substitution order data" });
    }

    await storage.teams.updateTeam(teamId, { // Use teamStorage
      formation: JSON.stringify(formation),
      substitutionOrder: substitutionOrder ? JSON.stringify(substitutionOrder) : JSON.stringify({}),
      updatedAt: new Date()
    });

    res.json({ success: true, message: "Formation saved successfully" });
  } catch (error) {
    console.error("Error saving formation:", error);
    next(error);
  }
});

// Get staff members for a team
router.get('/:teamId/staff', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      // Verify user owns this team
      const team = await storage.teams.getTeamById(teamId);
      if (!team || team.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: "Forbidden: You do not own this team." });
      }
    }

    const staff = await storage.staff.getStaffByTeamId(teamId);
    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    next(error);
  }
});

router.get('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    const team = await storage.teams.getTeamById(teamId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const formationData = team.formation ? JSON.parse(team.formation as string) : null;
    const substitutionOrderData = team.substitutionOrder ? JSON.parse(team.substitutionOrder as string) : {};

    res.json({
      formation: formationData,
      substitutionOrder: substitutionOrderData
    });
  } catch (error) {
    console.error("Error fetching formation:", error);
    if (error instanceof SyntaxError) {
        return res.status(500).json({ message: "Failed to parse formation data from database." });
    }
    next(error);
  }
});

// Team inactivity tracking
router.post('/update-activity', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await storage.teams.updateTeam(team.id, { // Use teamStorage
      lastActivityAt: new Date(),
      seasonsInactive: 0
    });

    res.json({ success: true, message: "Team activity updated." });
  } catch (error) {
    console.error("Error updating team activity:", error);
    next(error);
  }
});

// Generate random tryout candidate
function generateTryoutCandidate(type: 'basic' | 'advanced'): any {
  const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
  const race = races[Math.floor(Math.random() * races.length)];
  const { firstName, lastName } = generateRandomName(race);
  
  // Use AgingService for proper age generation (16-20 for tryouts)
  const age = AgingService.generatePlayerAge('tryout');
  
  // Enhanced stats for advanced tryouts
  const statBonus = type === 'advanced' ? 5 : 0;
  const minStat = type === 'advanced' ? 15 : 8;
  const maxStat = type === 'advanced' ? 35 : 30;
  
  const baseStats = {
    speed: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    power: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    throwing: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    catching: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    kicking: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    stamina: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    leadership: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
    agility: Math.floor(Math.random() * (maxStat - minStat + 1)) + minStat + statBonus,
  };

  // Generate potential (higher for advanced tryouts)
  const potentialRoll = Math.random();
  let potential: "High" | "Medium" | "Low";
  if (type === 'advanced') {
    potential = potentialRoll < 0.4 ? "High" : potentialRoll < 0.8 ? "Medium" : "Low";
  } else {
    potential = potentialRoll < 0.2 ? "High" : potentialRoll < 0.6 ? "Medium" : "Low";
  }

  const avgStat = Object.values(baseStats).reduce((a, b) => a + b, 0) / 8;
  const marketValue = Math.floor(1000 + (avgStat * 50) + (Math.random() * 500));

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${firstName} ${lastName}`,
    race,
    age,
    ...baseStats,
    marketValue,
    potential
  };
}

// Tryout System endpoint
const tryoutSchema = z.object({
  type: z.enum(['basic', 'advanced']),
});

router.post('/:teamId/tryouts', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;
  const { type } = tryoutSchema.parse(req.body);

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userId !== userId) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get team finances
  const finances = await storage.teamFinances.getTeamFinances(team.id);
  if (!finances) {
    throw ErrorCreators.notFound("Team finances not found");
  }

  // Check costs and affordability
  const costs = { basic: 25000, advanced: 75000 };
  const cost = costs[type];

  if ((finances.credits || 0) < cost) {
    throw ErrorCreators.validation(`Insufficient credits. Required: ${cost}, Available: ${finances.credits || 0}`);
  }

  // Generate candidates
  const candidateCount = type === 'basic' ? 3 : 5;
  const candidates = Array.from({ length: candidateCount }, () => generateTryoutCandidate(type));

  // Deduct cost
  await storage.teamFinances.updateTeamFinances(team.id, {
    credits: (finances.credits || 0) - cost
  });

  logInfo(`Tryout hosted successfully`, {
    teamId: team.id,
    type,
    cost,
    candidatesGenerated: candidates.length,
    requestId: req.requestId
  });

  res.json({
    type,
    candidates,
    cost,
    message: `${type === 'basic' ? 'Basic' : 'Advanced'} tryout completed successfully!`
  });
}));

// Team finances endpoint
router.get('/:teamId/finances', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userId !== userId) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get team finances
  const finances = await teamFinancesStorage.getTeamFinances(team.id);
  if (!finances) {
    throw ErrorCreators.notFound("Team finances not found");
  }

  res.json(finances);
}));

// Taxi Squad endpoints
router.get('/:teamId/taxi-squad', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userId !== userId) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get taxi squad players
  const taxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);

  logInfo("Taxi squad retrieved", {
    teamId: team.id,
    playersCount: taxiSquadPlayers.length,
    requestId: req.requestId
  });

  res.json(taxiSquadPlayers);
}));

router.post('/:teamId/taxi-squad/:playerId/promote', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId, playerId } = req.params;

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userId !== userId) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check if player exists and is on taxi squad
  const player = await storage.players.getPlayerById(playerId);
  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }

  if (player.teamId !== team.id) {
    throw ErrorCreators.forbidden("Player does not belong to your team");
  }

  if (!player.isOnTaxi) {
    throw ErrorCreators.validation("Player is not on taxi squad");
  }

  // Check roster space (assuming max 10 main roster players)
  const mainRosterPlayers = await storage.players.getPlayersByTeamId(team.id);
  const activeMainRosterPlayers = mainRosterPlayers.filter(p => !p.isOnTaxi);
  
  if (activeMainRosterPlayers.length >= 10) {
    throw ErrorCreators.validation("Main roster is full (maximum 10 players)");
  }

  // Promote player
  const promotedPlayer = await storage.players.promotePlayerFromTaxiSquad(playerId);

  logInfo("Player promoted from taxi squad", {
    teamId: team.id,
    playerId: playerId,
    playerName: player.name,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: "Player promoted to main roster",
    player: promotedPlayer
  });
}));

router.delete('/:teamId/taxi-squad/:playerId', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId, playerId } = req.params;

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userId !== userId) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check if player exists and is on taxi squad
  const player = await storage.players.getPlayerById(playerId);
  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }

  if (player.teamId !== team.id) {
    throw ErrorCreators.forbidden("Player does not belong to your team");
  }

  if (!player.isOnTaxi) {
    throw ErrorCreators.validation("Player is not on taxi squad");
  }

  // Release player
  const released = await storage.players.releasePlayerFromTaxiSquad(playerId);

  if (!released) {
    throw ErrorCreators.internal("Failed to release player");
  }

  logInfo("Player released from taxi squad", {
    teamId: team.id,
    playerId: playerId,
    playerName: player.name,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: "Player released from taxi squad"
  });
}));


export default router;
