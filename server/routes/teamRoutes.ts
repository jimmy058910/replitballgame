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
import { Race, PlayerRole, InjuryStatus } from "../../generated/prisma";
import { prisma } from '../db';
import { getPlayerRole } from "@shared/playerUtils";
// Database operations handled through storage layer

const router = Router();

// TODO: Move this to a dedicated TeamService or LeagueService
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    // CAR = Average of all 8 attributes as per game mechanics
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

  // Check how many teams are already in division 8 to determine sub-division
  let assignedDivision = 8;
  let assignedSubdivision = "main";
  
  // Find the next available sub-division that has room (less than 8 teams)
  const possibleSubdivisions = ["main", "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"];
  for (const subdivisionValue of possibleSubdivisions) {
    const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionValue);
    if (teamsInSubdivision.length < 8) {
      assignedSubdivision = subdivisionValue;
      break;
    }
  }
  
  logInfo("Assigning to sub-division", { 
    division: assignedDivision,
    subdivision: assignedSubdivision,
    requestId: req.requestId 
  });

  // storage.teams.createTeam now handles default staff and finances
  const team = await storage.teams.createTeam({ // Use teamStorage
    userId,
    name: sanitizedName,
    division: assignedDivision,
    subdivision: assignedSubdivision,
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
      
      // Extract only the fields that the PlayerStorage expects
      const cleanPlayerData = {
        teamId: parseInt(playerData.teamId),
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race.toUpperCase() as Race,
        age: playerData.age,
        role: playerData.role as PlayerRole,
        speed: playerData.speed,
        power: playerData.power,
        throwing: playerData.throwing,
        catching: playerData.catching,
        kicking: playerData.kicking,
        staminaAttribute: playerData.staminaAttribute,
        leadership: playerData.leadership,
        agility: playerData.agility,
        potentialRating: playerData.potentialRating,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY' as InjuryStatus,
        camaraderieScore: playerData.camaraderie || 75.0,
      };
      
      await storage.players.createPlayer(cleanPlayerData);
    } catch (playerError) {
      const errorMessage = playerError instanceof Error ? playerError.message : String(playerError);
      throw ErrorCreators.database(`Failed to create player ${i + 1}: ${errorMessage}`);
    }
  }

  // Create default staff members
  logInfo("Starting staff creation", { 
    teamId: team.id, 
    requestId: req.requestId 
  });

  const defaultStaff = [
    { type: 'HEAD_COACH', name: 'Coach Johnson', motivation: 25, development: 20, tactics: 18 },
    { type: 'RECOVERY_SPECIALIST', name: 'Alex Recovery', physiology: 22 },
    { type: 'PASSER_TRAINER', name: 'Sarah Passer', teaching: 20 },
    { type: 'RUNNER_TRAINER', name: 'Mike Runner', teaching: 18 },
    { type: 'BLOCKER_TRAINER', name: 'Lisa Blocker', teaching: 19 },
    { type: 'SCOUT', name: 'Emma Talent', talentIdentification: 21, potentialAssessment: 20 },
    { type: 'SCOUT', name: 'Tony Scout', talentIdentification: 18, potentialAssessment: 19 }
  ];

  for (const staffData of defaultStaff) {
    try {
      await storage.staff.createStaff({
        teamId: team.id,
        type: staffData.type,
        name: staffData.name,
        level: 1,
        motivation: staffData.motivation || 15,
        development: staffData.development || 15,
        teaching: staffData.teaching || 15,
        physiology: staffData.physiology || 15,
        talentIdentification: staffData.talentIdentification || 15,
        potentialAssessment: staffData.potentialAssessment || 15,
        tactics: staffData.tactics || 15,
        age: 25 + Math.floor(Math.random() * 20)
      });
    } catch (staffError) {
      const errorMessage = staffError instanceof Error ? staffError.message : String(staffError);
      console.warn(`Failed to create staff member ${staffData.name}: ${errorMessage}`);
    }
  }

  logInfo("Team creation completed", { 
    teamId: team.id, 
    playersCreated: 10,
    staffCreated: defaultStaff.length,
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

    res.json({ ...team, teamPower, teamCamaraderie: team.camaraderie });
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

    res.json({ ...team, teamPower, teamCamaraderie: team.camaraderie });
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

    const { starters, substitutes, formationData } = req.body;

    // Validate that starters and substitutes are arrays
    if (!Array.isArray(starters)) {
        return res.status(400).json({ message: "Starters must be an array" });
    }
    if (!Array.isArray(substitutes)) {
        return res.status(400).json({ message: "Substitutes must be an array" });
    }

    // Create formation object in the expected database format
    const formation = {
      starters: starters.map((player: any) => ({ id: player.id, role: player.role })),
      substitutes: substitutes.map((player: any) => ({ id: player.id, role: player.role })),
      ...formationData
    };

    await storage.teams.updateTeam(teamId, { // Use teamStorage
      formation: JSON.stringify(formation),
      substitutionOrder: JSON.stringify({}), // Keep for compatibility
      updatedAt: new Date()
    });

    res.json({ success: true, message: "Formation saved successfully" });
  } catch (error) {
    console.error("Error saving formation:", error);
    next(error);
  }
});

// Formation PUT route for TacticsLineupHub
router.put('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
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

    const { starters, substitutes, formationData } = req.body;

    // Validate that starters and substitutes are arrays
    if (!Array.isArray(starters)) {
        return res.status(400).json({ message: "Starters must be an array" });
    }
    if (!Array.isArray(substitutes)) {
        return res.status(400).json({ message: "Substitutes must be an array" });
    }

    // Create formation object in the expected database format
    const formation = {
      starters: starters.map((player: any) => ({ id: player.id, role: player.role })),
      substitutes: substitutes.map((player: any) => ({ id: player.id, role: player.role })),
      ...formationData
    };

    await storage.teams.updateTeam(teamId, { // Use teamStorage
      formation: JSON.stringify(formation),
      substitutionOrder: JSON.stringify({}), // Keep for compatibility
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
    let teamId = parseInt(req.params.teamId);

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    // Simplified: Just fetch the staff without complex authorization for now
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

    // Get all team players
    const allPlayers = await storage.players.getPlayersByTeamId(teamId);
    
    const formationData = team.formation ? JSON.parse(team.formation as string) : null;
    const substitutionOrderData = team.substitutionOrder ? JSON.parse(team.substitutionOrder as string) : {};

    let starters = [];
    let substitutes = [];

    if (formationData && formationData.starters) {
      // Match starter IDs to actual player objects
      const starterIds = formationData.starters.map((s: any) => s.id || s);
      starters = allPlayers.filter((player: any) => starterIds.includes(player.id));
    }

    if (formationData && formationData.substitutes) {
      // Match substitute IDs to actual player objects
      const substituteIds = formationData.substitutes.map((s: any) => s.id || s);
      substitutes = allPlayers.filter((player: any) => substituteIds.includes(player.id));
    }

    // If no formation data exists, create a default formation with all players
    if (!formationData && allPlayers.length > 0) {
      // Sort players by overall rating (best first)
      const sortedPlayers = allPlayers.sort((a: any, b: any) => {
        const aRating = (a.speed + a.power + a.agility + a.throwing + a.catching + a.kicking) / 6;
        const bRating = (b.speed + b.power + b.agility + b.throwing + b.catching + b.kicking) / 6;
        return bRating - aRating;
      });

      // Take top 9 as starters, rest as substitutes (allow all 10 players to be managed)
      starters = sortedPlayers.slice(0, Math.min(9, sortedPlayers.length));
      substitutes = sortedPlayers.slice(9);

      // Save this default formation to the team
      const defaultFormation = {
        starters: starters.map((p: any) => p.id),
        substitutes: substitutes.map((p: any) => p.id)
      };
      
      await storage.teams.updateTeam(teamId, {
        formation: JSON.stringify(defaultFormation)
      });
    }

    // Calculate power ratings for players
    const enhancedPlayers = allPlayers.map((player: any) => ({
      ...player,
      overallRating: Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6)
    }));

    const enhancedStarters = starters.map((player: any) => ({
      ...player,
      overallRating: Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6)
    }));

    const enhancedSubstitutes = substitutes.map((player: any) => ({
      ...player,
      overallRating: Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6)
    }));

    res.json({
      starters: enhancedStarters,
      substitutes: enhancedSubstitutes,
      allPlayers: enhancedPlayers, // Return all players for tactical management
      formation_data: formationData
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
  
  // Step 1: Determine Player Potential (1.0-5.0 stars in 0.5 increments)
  let overallPotentialStars: number;
  const potentialRoll = Math.random();
  
  if (type === 'advanced') {
    // Advanced: High chance of 2.5-4 stars, moderate chance of 4.5-5 stars
    if (potentialRoll < 0.05) overallPotentialStars = 5.0;      // 5% chance
    else if (potentialRoll < 0.15) overallPotentialStars = 4.5; // 10% chance
    else if (potentialRoll < 0.40) overallPotentialStars = 4.0; // 25% chance
    else if (potentialRoll < 0.65) overallPotentialStars = 3.5; // 25% chance
    else if (potentialRoll < 0.85) overallPotentialStars = 3.0; // 20% chance
    else if (potentialRoll < 0.95) overallPotentialStars = 2.5; // 10% chance
    else overallPotentialStars = 2.0; // 5% chance
  } else {
    // Basic: High chance of 1-2.5 stars, low chance of 3-4 stars, very rare 4.5+
    if (potentialRoll < 0.01) overallPotentialStars = 4.5;      // 1% chance
    else if (potentialRoll < 0.05) overallPotentialStars = 4.0; // 4% chance
    else if (potentialRoll < 0.15) overallPotentialStars = 3.5; // 10% chance
    else if (potentialRoll < 0.25) overallPotentialStars = 3.0; // 10% chance
    else if (potentialRoll < 0.45) overallPotentialStars = 2.5; // 20% chance
    else if (potentialRoll < 0.70) overallPotentialStars = 2.0; // 25% chance
    else if (potentialRoll < 0.90) overallPotentialStars = 1.5; // 20% chance
    else overallPotentialStars = 1.0; // 10% chance
  }
  
  // Step 2: Calculate Total Attribute Points (TAP)
  let basePoints: number;
  if (type === 'advanced') {
    basePoints = Math.floor(Math.random() * 26) + 60; // 60-85
  } else {
    basePoints = Math.floor(Math.random() * 21) + 40; // 40-60
  }
  
  const potentialBonus = overallPotentialStars * 4;
  const totalAttributePoints = basePoints + potentialBonus;
  
  // Step 3: Assign baseline stats (3 each) and determine role
  const roles = ['Passer', 'Runner', 'Blocker'];
  const assignedRole = roles[Math.floor(Math.random() * roles.length)];
  
  const baseStats = {
    speed: 3,
    power: 3,
    throwing: 3,
    catching: 3,
    kicking: 3,
    stamina: 3,
    leadership: 3,
    agility: 3,
  };
  
  // Calculate remaining points after baseline allocation
  const baselineTotal = 8 * 3; // 24 points
  const remainingPoints = totalAttributePoints - baselineTotal;
  
  // Distribute remaining points based on role
  const stats = { ...baseStats };
  let pointsToDistribute = remainingPoints;
  
  // Role-based distribution (60% to primary stats, 40% to others)
  const primaryPoints = Math.floor(pointsToDistribute * 0.6);
  const secondaryPoints = pointsToDistribute - primaryPoints;
  
  let primaryStats: string[] = [];
  let secondaryStats: string[] = [];
  
  if (assignedRole === 'Passer') {
    primaryStats = ['throwing', 'agility', 'leadership'];
    secondaryStats = ['speed', 'power', 'catching', 'kicking', 'stamina'];
  } else if (assignedRole === 'Runner') {
    primaryStats = ['speed', 'agility', 'catching'];
    secondaryStats = ['power', 'throwing', 'kicking', 'stamina', 'leadership'];
  } else { // Blocker
    primaryStats = ['power', 'stamina', 'agility'];
    secondaryStats = ['speed', 'throwing', 'catching', 'kicking', 'leadership'];
  }
  
  // Distribute primary points
  for (let i = 0; i < primaryPoints; i++) {
    const randomStat = primaryStats[Math.floor(Math.random() * primaryStats.length)];
    stats[randomStat as keyof typeof stats]++;
  }
  
  // Distribute secondary points
  for (let i = 0; i < secondaryPoints; i++) {
    const randomStat = secondaryStats[Math.floor(Math.random() * secondaryStats.length)];
    stats[randomStat as keyof typeof stats]++;
  }
  
  // Apply racial modifiers
  switch (race) {
    case "human":
      // Human: +1 to all stats
      Object.keys(stats).forEach(stat => {
        stats[stat as keyof typeof stats] += 1;
      });
      break;
    case "sylvan":
      // Sylvan: +3 Speed, +4 Agility, -2 Power
      stats.speed += 3;
      stats.agility += 4;
      stats.power -= 2;
      break;
    case "gryll":
      // Gryll: +5 Power, +3 Stamina, -3 Speed, -2 Agility
      stats.power += 5;
      stats.stamina += 3;
      stats.speed -= 3;
      stats.agility -= 2;
      break;
    case "lumina":
      // Lumina: +4 Throwing, +3 Leadership, -1 Stamina
      stats.throwing += 4;
      stats.leadership += 3;
      stats.stamina -= 1;
      break;
    case "umbra":
      // Umbra: +2 Speed, +3 Agility, -3 Power, -1 Leadership
      stats.speed += 2;
      stats.agility += 3;
      stats.power -= 3;
      stats.leadership -= 1;
      break;
  }
  
  // Cap all stats at 40 and minimum at 1
  Object.keys(stats).forEach(stat => {
    stats[stat as keyof typeof stats] = Math.max(1, Math.min(40, stats[stat as keyof typeof stats]));
  });
  
  // Convert potential to legacy format for compatibility
  let potential: "High" | "Medium" | "Low";
  if (overallPotentialStars >= 4.0) potential = "High";
  else if (overallPotentialStars >= 2.5) potential = "Medium";
  else potential = "Low";

  const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 8;
  const marketValue = Math.floor(500 + (avgStat * 25) + (Math.random() * 300)); // Lower market value for rookies

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    race,
    age,
    ...stats,
    overallPotentialStars, // This is the key field that was missing!
    marketValue,
    potential // Legacy field for compatibility
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

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userProfileId !== userProfile.id) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check seasonal restriction: only 1 tryout per season using TryoutHistory
  try {
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      where: { phase: 'REGULAR_SEASON' },
      orderBy: { startDate: 'desc' }
    });
    
    if (currentSeason) {
      // Check if team has already done tryouts this season
      const existingTryout = await prisma.tryoutHistory.findUnique({
        where: {
          teamId_seasonId: {
            teamId: team.id,
            seasonId: currentSeason.id
          }
        }
      });
      
      if (existingTryout) {
        throw ErrorCreators.validation("Teams can only conduct tryouts once per season (17-day cycle). You have already used your tryouts for this season.");
      }
    }
  } catch (error) {
    if (error.message && error.message.includes("tryouts once per season")) {
      throw error; // Re-throw the validation error
    }
    console.error('Error checking seasonal restrictions:', error);
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

  // Get team scouts to calculate "fog of war" reduction
  let scoutEffectiveness = 0;
  try {
    const scouts = await prisma.staff.findMany({
      where: {
        teamId: team.id,
        type: "SCOUT"
      }
    });
    
    // Calculate scout effectiveness (average of scouting and recruiting ratings)
    if (scouts.length > 0) {
      const avgScouting = scouts.reduce((sum: number, s: any) => sum + (s.scoutingRating || 0), 0) / scouts.length;
      const avgRecruiting = scouts.reduce((sum: number, s: any) => sum + (s.recruitingRating || 0), 0) / scouts.length;
      scoutEffectiveness = (avgScouting + avgRecruiting) / 2;
    }
  } catch (error) {
    console.error('Error calculating scout effectiveness:', error);
  }

  // Generate candidates
  const candidateCount = type === 'basic' ? 3 : 5;
  const rawCandidates = Array.from({ length: candidateCount }, () => generateTryoutCandidate(type));
  
  // Apply scout "fog of war" reduction to candidate information
  const candidates = rawCandidates.map(candidate => {
    // Scout effectiveness affects information accuracy (0-40 scale)
    // Poor scouts (0-15): High variance, hidden potential
    // Average scouts (16-25): Moderate accuracy 
    // Good scouts (26-35): Low variance, accurate potential
    // Excellent scouts (36-40): Very precise information
    
    const fogOfWarFactor = Math.max(0, Math.min(1, scoutEffectiveness / 40));
    const baseVariance = 3; // Base stat uncertainty
    const variance = baseVariance * (1 - fogOfWarFactor); // Better scouts reduce uncertainty
    
    // Apply stat range uncertainty for display purposes
    const scoutedCandidate = { ...candidate };
    
    // Add scout-influenced data for UI display
    scoutedCandidate.scoutData = {
      effectiveness: scoutEffectiveness,
      statVariance: variance,
      potentialAccuracy: fogOfWarFactor,
      // Scouts with 30+ effectiveness can reveal exact potential
      canRevealExactPotential: scoutEffectiveness >= 30,
      // Scouts with 20+ effectiveness provide stat ranges
      canProvideStatRanges: scoutEffectiveness >= 20
    };
    
    return scoutedCandidate;
  });

  // Deduct cost
  await storage.teamFinances.updateTeamFinances(team.id, {
    credits: (finances.credits || 0) - cost
  });

  // Mark tryouts as used for this season using TryoutHistory
  try {
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      where: { phase: 'REGULAR_SEASON' },
      orderBy: { startDate: 'desc' }
    });
    
    if (currentSeason) {
      // Create or update tryout history record
      await prisma.tryoutHistory.upsert({
        where: {
          teamId_seasonId: {
            teamId: team.id,
            seasonId: currentSeason.id.toString()
          }
        },
        create: {
          teamId: team.id,
          seasonId: currentSeason.id,
          tryoutType: type,
          cost: cost,
          playersAdded: candidates.length,
          conductedAt: new Date()
        },
        update: {
          playersAdded: candidates.length,
          conductedAt: new Date()
        }
      });
      
      logInfo("Tryouts marked as used for season", {
        teamId: team.id,
        seasonId: currentSeason.id,
        requestId: req.requestId
      });
    }
  } catch (error) {
    console.error('Error updating tryout history:', error);
  }

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

  // Verify team ownership - simplified for development
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    // Development bypass - skip ownership check for now
    if (!team) {
      throw ErrorCreators.notFound("Team not found");
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

  // Calculate actual player salaries from contracts
  const players = await prisma.player.findMany({
    where: { teamId: team.id },
    select: { id: true }
  });
  const playerIds = players.map(p => p.id);
  
  const contracts = await prisma.contract.findMany({
    where: {
      playerId: { in: playerIds }
    },
    select: {
      salary: true
    }
  });
  const totalPlayerSalaries = contracts.reduce((total, contract) => {
    return total + (contract.salary || 0);
  }, 0);

  // Calculate actual staff salaries - use level-based calculation
  let totalStaffSalaries = 0;
  try {
    const staff = await storage.staff.getStaffByTeamId(team.id);
    totalStaffSalaries = staff.reduce((total, staffMember) => {
      // Staff salary calculation: level * base salary (varies by type)
      const baseSalary = 50000; // Base salary for all staff
      const levelMultiplier = staffMember.level || 1;
      const calculatedSalary = baseSalary * levelMultiplier;
      return total + calculatedSalary;
    }, 0);
  } catch (error) {
    console.error('Error fetching staff for salary calculation:', error);
    // Use fallback salary calculation from finances table
    totalStaffSalaries = parseInt(String(finances.staffSalaries || '0'));
  }

  // Return finances with calculated values
  const facilitiesCost = parseInt(String(finances.facilitiesMaintenanceCost || '0'));
  const projectedIncome = parseInt(String(finances.projectedIncome || '0'));
  const totalExpenses = totalPlayerSalaries + totalStaffSalaries + facilitiesCost;
  
  const calculatedFinances = {
    ...finances,
    playerSalaries: totalPlayerSalaries,
    staffSalaries: totalStaffSalaries,
    totalExpenses: totalExpenses,
    netIncome: projectedIncome - totalExpenses
  };

  res.json(calculatedFinances);
}));

// Taxi Squad endpoints
router.get('/:teamId/taxi-squad', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
  } else {
    team = await prisma.team.findFirst({
      where: { 
        id: parseInt(teamId),
        userProfileId: userProfile.id 
      }
    });
    if (!team) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get taxi squad players using Prisma - players with more than 10 on roster are taxi squad
  const allPlayers = await prisma.player.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: 'desc' }
  });

  // Consider players beyond the first 10 as taxi squad
  const taxiSquadPlayers = allPlayers.slice(10);

  logInfo("Taxi squad retrieved", {
    teamId: team.id,
    playersCount: taxiSquadPlayers.length,
    requestId: req.requestId
  });

  res.json(taxiSquadPlayers);
}));

router.post('/:teamId/taxi-squad/add-candidates', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;
  const { candidates } = req.body;

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team || team.userProfileId !== userProfile.id) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  if (!candidates || !Array.isArray(candidates)) {
    throw ErrorCreators.validation("Candidates array is required");
  }

  // Check taxi squad capacity (max 2 players)
  const currentTaxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);
  
  if (currentTaxiSquadPlayers.length + candidates.length > 2) {
    throw ErrorCreators.validation(`Taxi squad full. Can only add ${2 - currentTaxiSquadPlayers.length} more players`);
  }

  const addedPlayers = [];
  
  for (const candidate of candidates) {
    // Determine role based on candidate attributes
    const roleString = getPlayerRole(candidate);
    
    // Convert role string to PlayerRole enum
    let roleEnum: PlayerRole;
    switch (roleString.toLowerCase()) {
      case 'passer':
        roleEnum = PlayerRole.PASSER;
        break;
      case 'runner':
        roleEnum = PlayerRole.RUNNER;
        break;
      case 'blocker':
        roleEnum = PlayerRole.BLOCKER;
        break;
      default:
        roleEnum = PlayerRole.RUNNER; // Default fallback
    }
    
    // Convert candidate to player format for taxi squad
    const playerData = {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      name: `${candidate.firstName} ${candidate.lastName}`,
      race: candidate.race.toUpperCase(), // Convert to uppercase for Prisma enum
      age: candidate.age,
      speed: candidate.speed,
      power: candidate.power,
      throwing: candidate.throwing,
      catching: candidate.catching,
      kicking: candidate.kicking,
      staminaAttribute: candidate.stamina,
      leadership: candidate.leadership,
      agility: candidate.agility,
      potentialRating: parseFloat(candidate.overallPotentialStars?.toString() || '0'),
      marketValue: candidate.marketValue || 0,
      salary: 0, // Taxi squad players don't earn salary
      teamId: team.id,
      isOnTaxi: true,
      isMarketplace: false,
      contractSeasons: 1,
      contractValue: 0,
      abilities: JSON.stringify([]),
      role: roleEnum, // Use converted enum value
      dailyStaminaLevel: 100,
      injuryStatus: "HEALTHY",
      camaraderieScore: 75
    };

    const newPlayer = await storage.players.createPlayer(playerData);
    addedPlayers.push(newPlayer);
  }

  logInfo("Candidates added to taxi squad", {
    teamId: team.id,
    candidatesCount: candidates.length,
    addedPlayersCount: addedPlayers.length,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: `${addedPlayers.length} players added to taxi squad`,
    players: addedPlayers
  });
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

  // Check roster space (assuming max 13 main roster players)
  const mainRosterPlayers = await storage.players.getPlayersByTeamId(team.id);
  const activeMainRosterPlayers = mainRosterPlayers.filter(p => !p.isOnTaxi);
  
  if (activeMainRosterPlayers.length >= 13) {
    throw ErrorCreators.validation("Main roster is full (maximum 13 players)");
  }

  // Calculate appropriate salary based on player stats and age
  const baseSalary = Math.max(5000, Math.min(50000, 
    ((player.speed + player.power + player.throwing + player.catching + player.agility + player.stamina) / 6) * 1000
  ));
  
  // Promote player and update contract in one operation
  const promotedPlayer = await storage.players.promotePlayerFromTaxiSquad(playerId);
  
  // Update player with 3-year contract and fix potential cap
  const cappedPotential = Math.min(5.0, Number(player.overallPotentialStars) || 3.0);
  const updatedPlayer = await storage.players.updatePlayer(playerId, {
    contractSeasons: 3, // 3-year contract as requested
    salary: baseSalary,
    // Cap potential at 5.0 stars maximum (decimal field expects string)
    overallPotentialStars: cappedPotential.toFixed(1),
    updatedAt: new Date(),
  });

  logInfo("Player promoted from taxi squad with 3-year contract", {
    teamId: team.id,
    playerId: playerId,
    playerName: player.name,
    contractSeasons: 3,
    salary: baseSalary,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: "Player promoted to main roster with 3-year contract",
    player: promotedPlayer
  });
}));

router.delete('/:teamId/taxi-squad/:playerId', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId, playerId } = req.params;

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
  } else {
    team = await prisma.team.findFirst({
      where: { 
        id: parseInt(teamId),
        userProfileId: userProfile.id 
      }
    });
    if (!team) {
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

// Get seasonal data for team (tryout usage tracking)
router.get('/:teamId/seasonal-data', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Verify team ownership
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(teamId);
    if (!team) {
      throw ErrorCreators.notFound("Team not found");
    }
    
    // Check ownership by looking up the UserProfile first, then comparing userProfileId
    const userProfile = await storage.users.getUser(userId);
    if (!userProfile || team.userProfileId !== userProfile.id) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // For now, check if there are any taxi squad players as indicator of tryouts used
  // In a full implementation, this would track actual tryout usage per season
  const taxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);
  const tryoutsUsed = taxiSquadPlayers.length > 0;

  res.json({
    success: true,
    data: {
      tryoutsUsed: tryoutsUsed,
      taxiSquadCount: taxiSquadPlayers.length,
      seasonalData: {
        tryoutDate: tryoutsUsed ? new Date().toISOString() : null,
        currentSeasonDay: 1 // Would be from season tracking system
      }
    }
  });
}));

// Get teams by division endpoint
router.get('/division/:division', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { division } = req.params;
  const divisionNumber = parseInt(division);
  
  if (isNaN(divisionNumber) || divisionNumber < 1 || divisionNumber > 8) {
    throw ErrorCreators.validation("Division must be a number between 1 and 8");
  }

  // Get all teams in the specified division
  const teams = await storage.teams.getTeamsByDivision(divisionNumber);

  // Get team details with player counts and power ratings
  const teamsWithDetails = await Promise.all(
    teams.map(async (team) => {
      const players = await storage.players.getPlayersByTeamId(team.id);
      const teamPower = calculateTeamPower(players);
      
      return {
        id: team.id,
        name: team.name,
        division: team.division,
        teamPower,
        playerCount: players.length,
        wins: team.wins || 0,
        losses: team.losses || 0,
        draws: team.draws || 0,
        isUserTeam: !!team.userId
      };
    })
  );

  logInfo("Teams by division retrieved", {
    division: divisionNumber,
    teamsCount: teamsWithDetails.length,
    requestId: req.requestId
  });

  res.json(teamsWithDetails);
}));


/**
 * GET /api/teams/:teamId/contracts
 * Get all player contracts for a team
 */
router.get('/:teamId/contracts', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || userTeam.id !== parseInt(teamId)) {
      return res.status(404).json({ message: "Team not found or you don't have permission to access this team." });
    }

    // Get all player contracts for the team
    const contracts = await prisma.playerContract.findMany({
      where: { teamId: parseInt(teamId) }
    });
    
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    next(error);
  }
});

export default router;
