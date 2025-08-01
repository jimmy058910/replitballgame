import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { isAuthenticated } from "../googleAuth";
import { generateRandomPlayer } from "../services/leagueService";
import { z } from "zod";
import { ErrorCreators, asyncHandler, logInfo } from "../services/errorService";
import { TeamNameValidator } from "../services/teamNameValidation";
import { AgingService } from "../services/agingService";
import { generateRandomName } from "@shared/names";
import { Race, PlayerRole, InjuryStatus } from "../../generated/prisma";
import { prisma } from '../db';
import { getPlayerRole } from "@shared/playerUtils";
import { formatSubdivisionName, getSubdivisionCapacityInfo } from "@shared/subdivisionUtils";
import { CamaraderieService } from "../services/camaraderieService";
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
  teamName: z.string().min(1).max(50), // Frontend sends 'teamName'
  ndaAgreed: z.boolean().optional()
});

// Team creation handler function (shared between routes)
const handleTeamCreation = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  // Validate input using Zod - errors will be automatically converted by the error handler
  const { teamName, ndaAgreed } = createTeamSchema.parse(req.body);
  const name = teamName;

  // Comprehensive team name validation
  const validationResult = await TeamNameValidator.validateTeamName(name);
  if (!validationResult.isValid) {
    throw ErrorCreators.validation(validationResult.error || "Invalid team name");
  }

  const existingTeam = await storage.teams.getTeamByUserId(userId); // Use teamStorage
  if (existingTeam) {
    throw ErrorCreators.conflict("User already has a team");
  }

  // Check NDA acceptance for pre-alpha testing
  const userStorage = await import('../storage/userStorage');
  const ndaAccepted = await userStorage.userStorage.checkNDAAcceptance(userId);
  if (!ndaAccepted) {
    throw ErrorCreators.forbidden("You must accept the Non-Disclosure Agreement to participate in pre-alpha testing");
  }

  // Use the sanitized name from validation
  const sanitizedName = validationResult.sanitizedName || name;

  // Check if we're in late signup window (Day 1 3PM to Day 9 3PM)
  const currentSeason = await storage.seasons.getCurrentSeason();
  let isLateSignup = false;
  
  if (currentSeason) {
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Late signup window: Day 1 3PM to Day 9 3PM
    isLateSignup = (currentDayInCycle === 1 && estTime.getHours() >= 15) ||
                   (currentDayInCycle >= 2 && currentDayInCycle <= 8) ||
                   (currentDayInCycle === 9 && estTime.getHours() < 15);
  }
  
  let assignedDivision = 8;
  let assignedSubdivision = "main";
  
  if (isLateSignup) {
    // Handle late signup - place in late signup subdivision
    const { LateSignupService } = await import('../services/lateSignupService');
    const lateSignupResult = await LateSignupService.processLateSignup({
      userId,
      name: sanitizedName
    });
    
    // Return early for late signup teams
    logInfo("Late signup team created", { 
      teamId: lateSignupResult.team.id,
      subdivision: lateSignupResult.subdivision,
      scheduleGenerated: lateSignupResult.needsScheduleGeneration,
      requestId: req.requestId 
    });
    
    return res.status(201).json({
      message: "Team created successfully in late signup division",
      team: lateSignupResult.team,
      isLateSignup: true,
      subdivision: lateSignupResult.subdivision
    });
  } else {
    // Normal signup - use comprehensive subdivision system with Greek alphabet + numbering
    // Full Greek alphabet (24 letters) plus numbered extensions for infinite scalability
    const greekAlphabet = [
      "main", "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", 
      "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", 
      "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
    ];
    
    let foundAvailableSubdivision = false;
    
    // First, try all base Greek names (e.g., "alpha", "beta", etc.)
    for (const baseName of greekAlphabet) {
      const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, baseName);
      if (teamsInSubdivision.length < 8) {
        assignedSubdivision = baseName;
        foundAvailableSubdivision = true;
        break;
      }
    }
    
    // If all base names are full, try numbered extensions (e.g., "alpha_1", "beta_2", etc.)
    if (!foundAvailableSubdivision) {
      for (const baseName of greekAlphabet) {
        let subdivisionNumber = 1;
        let maxAttempts = 100; // Reasonable limit to prevent infinite loop
        
        while (subdivisionNumber <= maxAttempts) {
          const numberedSubdivision = `${baseName}_${subdivisionNumber}`;
          const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, numberedSubdivision);
          
          if (teamsInSubdivision.length < 8) {
            assignedSubdivision = numberedSubdivision;
            foundAvailableSubdivision = true;
            break;
          }
          
          subdivisionNumber++;
        }
        
        if (foundAvailableSubdivision) break;
      }
    }
    
    // Ultimate fallback: timestamp-based subdivision (should rarely be needed)
    if (!foundAvailableSubdivision) {
      const timestamp = Date.now().toString().slice(-6);
      assignedSubdivision = `overflow_${timestamp}`;
      
      logInfo("Creating overflow subdivision - all Greek alphabet subdivisions exhausted", {
        newSubdivision: assignedSubdivision,
        testedSubdivisions: greekAlphabet.length * 100,
        requestId: req.requestId
      });
    } else if (assignedSubdivision.includes('_')) {
      logInfo("Assigned to numbered subdivision", {
        subdivision: assignedSubdivision,
        requestId: req.requestId
      });
    }
  }
  
  logInfo("Assigning to sub-division", { 
    division: assignedDivision,
    subdivision: assignedSubdivision,
    subdivisionDisplayName: formatSubdivisionName(assignedSubdivision),
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
  
  // Updated team composition: 3 Passers, 4 Blockers, 4 Runners, 1 flexible (total 12)
  const requiredPositions = [
    "passer", "passer", "passer", // 3 passers
    "blocker", "blocker", "blocker", "blocker", // 4 blockers
    "runner", "runner", "runner", "runner", // 4 runners
  ];
  
  // For the remaining 1 player, add flexible position
  const additionalPositions = ["passer", "runner", "blocker"];
  for (let i = 0; i < 1; i++) {
    let position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
    requiredPositions.push(position);
  }

  // Generate 12 players with proper position distribution
  logInfo("Starting player generation", { 
    teamId: team.id, 
    positionDistribution: requiredPositions,
    requestId: req.requestId 
  });
  
  for (let i = 0; i < 12; i++) {
    const race = races[Math.floor(Math.random() * races.length)];
    const position = requiredPositions[i];
    
    try {
      const playerData = generateRandomPlayer("", race, team.id.toString(), position);
      
      // Extract only the fields that the PlayerStorage expects
      const cleanPlayerData = {
        teamId: team.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race as Race,
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
        camaraderie: playerData.camaraderie || 75.0,
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

  // Updated staff generation: weaker, more balanced stats and ages 35-75
  const defaultStaff = [
    { type: 'HEAD_COACH' as const, name: 'Coach Johnson', motivation: 18, development: 15, tactics: 14 },
    { type: 'RECOVERY_SPECIALIST' as const, name: 'Alex Recovery', physiology: 16 },
    { type: 'PASSER_TRAINER' as const, name: 'Sarah Passer', teaching: 15 },
    { type: 'RUNNER_TRAINER' as const, name: 'Mike Runner', teaching: 14 },
    { type: 'BLOCKER_TRAINER' as const, name: 'Lisa Blocker', teaching: 15 },
    { type: 'SCOUT' as const, name: 'Emma Talent', talentIdentification: 16, potentialAssessment: 15 },
    { type: 'SCOUT' as const, name: 'Tony Scout', talentIdentification: 14, potentialAssessment: 15 }
  ];

  for (const staffData of defaultStaff) {
    try {
      await storage.staff.createStaff({
        teamId: team.id,
        type: staffData.type,
        name: staffData.name,
        level: 1,
        motivation: staffData.motivation || 12,
        development: staffData.development || 12,
        teaching: staffData.teaching || 12,
        physiology: staffData.physiology || 12,
        talentIdentification: staffData.talentIdentification || 12,
        potentialAssessment: staffData.potentialAssessment || 12,
        tactics: staffData.tactics || 12,
        age: 35 + Math.floor(Math.random() * 40) // Ages 35-75
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

  res.status(201).json({ 
    message: "Dynasty created successfully!",
    team: team,
    success: true, 
    data: team,
    isLateSignup: false
  });
});

// Development bypass for team creation (remove in production)
const developmentTeamCreation = asyncHandler(async (req: any, res: Response) => {
  // Simulate authenticated user for development
  const hardcodedUserId = "44010914";
  
  console.log("🔧 DEVELOPMENT: Creating team with hardcoded user", { userId: hardcodedUserId });
  
  // Ensure UserProfile exists for development
  const userStorage = await import('../storage/userStorage');
  let user = await userStorage.userStorage.getUser(hardcodedUserId);
  
  if (!user) {
    console.log('🔧 Creating development UserProfile...');
    user = await userStorage.userStorage.upsertUser({
      userId: hardcodedUserId,
      email: "jimmy058910@gmail.com", 
      firstName: "Jimmy",
      lastName: "Dev"
    });
    
    // Auto-accept NDA for development
    user = await userStorage.userStorage.acceptNDA(hardcodedUserId, "1.0");
    console.log('🔧 Development user created and NDA accepted');
  }
  
  // Simulate authenticated request
  req.user = { claims: { sub: hardcodedUserId } };
  
  // Call the original handler
  return handleTeamCreation(req, res);
});

// Team routes - both endpoints use the same handler
router.post('/', process.env.NODE_ENV === 'development' ? developmentTeamCreation : handleTeamCreation);
router.post('/create', process.env.NODE_ENV === 'development' ? developmentTeamCreation : handleTeamCreation);

// Get all teams (for debugging/admin purposes)
router.get('/', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const teams = await storage.teams.getAllTeams();
  res.json(teams);
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
    
    // Calculate real-time camaraderie from player scores instead of using outdated database value
    const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

    // Serialize any BigInt fields to strings for JSON compatibility
    const serializedTeam = { 
      ...team, 
      teamPower, 
      teamCamaraderie 
    };

    // Handle finances BigInt serialization if present
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
  } catch (error) {
    console.error("Error fetching team:", error);
    next(error);
  }
});

// Enhanced dashboard endpoint with comprehensive data
router.get('/my/dashboard', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get all related data
    const [teamPlayers, finances, stadium, staff] = await Promise.all([
      storage.players.getPlayersByTeamId(team.id),
      prisma.teamFinances.findFirst({ where: { teamId: team.id } }),
      prisma.stadium.findFirst({ where: { teamId: team.id } }),
      storage.staff.getStaffByTeamId(team.id)
    ]);

    const teamPower = calculateTeamPower(teamPlayers);
    
    // Calculate real-time camaraderie from player scores instead of using outdated database value
    const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

    // Calculate draws by checking if there are ties in the game records
    const draws = 0; // TODO: Calculate from actual game data when draw logic is implemented

    // Serialize BigInt fields for JSON compatibility
    const serializedFinances = finances ? {
      ...finances,
      credits: finances.credits.toString(),
      gems: finances.gems.toString(),
      escrowCredits: finances.escrowCredits?.toString() || '0',
      escrowGems: finances.escrowGems?.toString() || '0',
      projectedIncome: finances.projectedIncome?.toString() || '0',
      projectedExpenses: finances.projectedExpenses?.toString() || '0',
      lastSeasonRevenue: finances.lastSeasonRevenue?.toString() || '0',
      lastSeasonExpenses: finances.lastSeasonExpenses?.toString() || '0',
      facilitiesMaintenanceCost: finances.facilitiesMaintenanceCost?.toString() || '0'
    } : { credits: '0', gems: '0', escrowCredits: '0', escrowGems: '0', projectedIncome: '0', projectedExpenses: '0', lastSeasonRevenue: '0', lastSeasonExpenses: '0', facilitiesMaintenanceCost: '0' };

    res.json({
      team: { ...team, teamPower, teamCamaraderie },
      players: teamPlayers,
      finances: serializedFinances,
      stadium: stadium || { capacity: 5000, concessionsLevel: 1, parkingLevel: 1, vipSuitesLevel: 1, merchandisingLevel: 1, lightingScreensLevel: 1 },
      staff,
      draws
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    next(error);
  }
});

router.get('/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const team = await storage.teams.getTeamById(parseInt(id)); // Use teamStorage

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
    
    // Get players with contract data included
    const teamIdNum = parseInt(id);
    if (isNaN(teamIdNum)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    const players = await prisma.player.findMany({
      where: { 
        teamId: teamIdNum, 
        isOnMarket: false 
      },
      include: {
        contract: true,
        skills: { include: { skill: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform the data to include contract info at player level
    const playersWithContracts = players.map(player => ({
      ...player,
      contractSalary: player.contract ? parseInt(player.contract.salary.toString()) : 0,
      contractLength: player.contract ? player.contract.length : 0,
      contractStartDate: player.contract ? player.contract.startDate : null,
      contractSigningBonus: player.contract ? parseInt(player.contract.signingBonus?.toString() || '0') : 0,
    }));

    res.json(playersWithContracts);
  } catch (error) {
    console.error("Error fetching players:", error);
    next(error);
  }
});

// Formation saving route
router.post('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  console.log('🚀 POST Formation route hit!');
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
      if (!teamToUpdate) {
          return res.status(404).json({ message: "Team not found." });
      }
      
      // Check team ownership via UserProfile
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user?.claims?.sub }
      });
      
      if (!userProfile || teamToUpdate.userProfileId !== userProfile.id) {
          return res.status(403).json({ message: "Forbidden: You do not own this team." });
      }
    }

    const { starters, substitutes, flexSubs, formationData } = req.body;

    // Debug logging for POST route
    console.log('🔍 POST Formation Debug:', {
      requestBody: req.body,
      starters: starters,
      substitutes: substitutes,
      flexSubs: flexSubs,
      startersType: typeof starters,
      substitutesType: typeof substitutes,
      flexSubsType: typeof flexSubs,
      startersIsArray: Array.isArray(starters),
      substitutesIsArray: Array.isArray(substitutes),
      flexSubsIsArray: Array.isArray(flexSubs)
    });

    // Validate that starters and substitutes are arrays
    if (!Array.isArray(starters)) {
        console.error('❌ POST Starters validation failed:', { starters, type: typeof starters });
        return res.status(400).json({ message: "Starters must be an array" });
    }
    if (!Array.isArray(substitutes)) {
        console.error('❌ POST Substitutes validation failed:', { substitutes, type: typeof substitutes });
        return res.status(400).json({ message: "Substitutes must be an array" });
    }
    if (flexSubs && !Array.isArray(flexSubs)) {
        console.error('❌ POST FlexSubs validation failed:', { flexSubs, type: typeof flexSubs });
        return res.status(400).json({ message: "FlexSubs must be an array" });
    }

    // Create formation object in the expected database format
    const formation = {
      starters: starters.map((player: any) => ({ id: player.id, role: player.role })),
      substitutes: substitutes.map((player: any) => ({ id: player.id, role: player.role })),
      flexSubs: flexSubs ? flexSubs.map((player: any) => ({ id: player.id, role: player.role })) : [],
      ...formationData
    };

    // Save formation to Strategy model (same as PUT route)
    await prisma.strategy.upsert({
      where: { teamId: parseInt(teamId) },
      update: {
        formationJson: formation,
        substitutionJson: {},
        updatedAt: new Date()
      },
      create: {
        teamId: parseInt(teamId),
        formationJson: formation,
        substitutionJson: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ POST Formation saved successfully to Strategy table:', {
      teamId: teamId,
      startersCount: formation.starters.length,
      substitutesCount: formation.substitutes.length,
      flexSubsCount: formation.flexSubs.length
    });

    res.json({ success: true, message: "Formation saved successfully" });
  } catch (error) {
    console.error("Error saving formation:", error);
    next(error);
  }
});

// Formation PUT route for TacticsLineupHub
router.put('/:teamId/formation', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  console.log('🚀 PUT Formation route hit!');
  try {
    let teamId: number;

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      teamId = parseInt(req.params.teamId);
      const teamToUpdate = await storage.teams.getTeamById(teamId); // Use teamStorage
      if (!teamToUpdate) {
          return res.status(404).json({ message: "Team not found." });
      }
      
      // Check team ownership via UserProfile
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user?.claims?.sub }
      });
      
      if (!userProfile || teamToUpdate.userProfileId !== userProfile.id) {
          return res.status(403).json({ message: "Forbidden: You do not own this team." });
      }
    }

    const { starters, substitutes, formationData } = req.body;

    // Debug logging
    console.log('🔍 Backend Formation Debug:', {
      requestBody: req.body,
      starters: starters,
      substitutes: substitutes,
      startersType: typeof starters,
      substitutesType: typeof substitutes,
      startersIsArray: Array.isArray(starters),
      substitutesIsArray: Array.isArray(substitutes),
      startersLength: starters?.length,
      substitutesLength: substitutes?.length
    });

    // Validate that starters and substitutes are arrays
    if (!Array.isArray(starters)) {
        console.error('❌ Starters validation failed:', { starters, type: typeof starters });
        return res.status(400).json({ message: "Starters must be an array" });
    }
    if (!Array.isArray(substitutes)) {
        console.error('❌ Substitutes validation failed:', { substitutes, type: typeof substitutes });
        return res.status(400).json({ message: "Substitutes must be an array" });
    }

    // Create formation object in the expected database format
    const formation = {
      starters: starters.map((player: any) => ({ id: player.id, role: player.role })),
      substitutes: substitutes.map((player: any) => ({ id: player.id, role: player.role })),
      ...formationData
    };

    // Save formation to Strategy model
    await prisma.strategy.upsert({
      where: { teamId: parseInt(teamId.toString()) },
      update: {
        formationJson: formation,
        substitutionJson: {},
        updatedAt: new Date()
      },
      create: {
        teamId: parseInt(teamId.toString()),
        formationJson: formation,
        substitutionJson: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ PUT Formation saved successfully to Strategy table:', {
      teamId: parseInt(teamId.toString()),
      startersCount: formation.starters.length,
      substitutesCount: formation.substitutes.length
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
    let teamId: number;

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      teamId = parseInt(req.params.teamId);
    }

    const team = await storage.teams.getTeamById(teamId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get all team players
    const allPlayers = await storage.players.getPlayersByTeamId(teamId);
    
    // Load formation data from Strategy model
    const strategy = await prisma.strategy.findUnique({
      where: { teamId: teamId }
    });
    
    const formationData = strategy?.formationJson || null;
    const substitutionOrderData = strategy?.substitutionJson || {};
    
    console.log('🔍 GET Formation Debug:', {
      teamId: teamId,
      hasStrategy: !!strategy,
      hasFormationData: !!formationData,
      startersCount: formationData?.starters?.length || 0,
      substitutesCount: formationData?.substitutes?.length || 0,
      substitutesOrder: formationData?.substitutes?.map((s: any, index: number) => ({
        index: index,
        id: s.id,
        role: s.role
      })) || []
    });

    let starters = [];
    let substitutes = [];
    let flexSubs = [];

    if (formationData && formationData.starters) {
      // Match starter IDs to actual player objects in the saved order
      starters = formationData.starters.map((s: any) => {
        const playerId = s.id || s;
        return allPlayers.find((player: any) => player.id === playerId);
      }).filter(Boolean);
    }

    if (formationData && formationData.substitutes) {
      // Match substitute IDs to actual player objects in the saved order
      substitutes = formationData.substitutes.map((s: any) => {
        const playerId = s.id || s;
        return allPlayers.find((player: any) => player.id === playerId);
      }).filter(Boolean);
    }

    if (formationData && formationData.flexSubs) {
      // Match flex sub IDs to actual player objects in the saved order
      flexSubs = formationData.flexSubs.map((s: any) => {
        const playerId = s.id || s;
        return allPlayers.find((player: any) => player.id === playerId);
      }).filter(Boolean);
    }

    // If no formation data exists, create a default formation with exactly 6 starters
    if (!formationData && allPlayers.length > 0) {
      // Sort players by overall rating (best first)
      const sortedPlayers = allPlayers.sort((a: any, b: any) => {
        const aRating = (a.speed + a.power + a.agility + a.throwing + a.catching + a.kicking) / 6;
        const bRating = (b.speed + b.power + b.agility + b.throwing + b.catching + b.kicking) / 6;
        return bRating - aRating;
      });

      // Create proper 6-player formation: 1 Passer, 2 Runners, 2 Blockers, 1 Wildcard
      const passers = sortedPlayers.filter((p: any) => p.role === 'PASSER');
      const runners = sortedPlayers.filter((p: any) => p.role === 'RUNNER');
      const blockers = sortedPlayers.filter((p: any) => p.role === 'BLOCKER');
      const allPlayersByRole = [...passers, ...runners, ...blockers];

      starters = [];
      
      // Add 1 best Passer
      if (passers.length > 0) starters.push(passers[0]);
      
      // Add 2 best Runners
      if (runners.length >= 2) {
        starters.push(runners[0], runners[1]);
      } else if (runners.length === 1) {
        starters.push(runners[0]);
      }
      
      // Add 2 best Blockers
      if (blockers.length >= 2) {
        starters.push(blockers[0], blockers[1]);
      } else if (blockers.length === 1) {
        starters.push(blockers[0]);
      }
      
      // Add best remaining player as wildcard to reach exactly 6 starters
      const usedIds = starters.map((p: any) => p.id);
      const remaining = sortedPlayers.filter((p: any) => !usedIds.includes(p.id));
      
      while (starters.length < 6 && remaining.length > 0) {
        starters.push(remaining.shift());
      }
      
      // All other players are substitutes
      substitutes = sortedPlayers.filter((p: any) => !starters.some((s: any) => s.id === p.id));

      // Save this default formation to the Strategy model
      const defaultFormation = {
        starters: starters.map((p: any) => p.id),
        substitutes: substitutes.map((p: any) => p.id)
      };
      
      await prisma.strategy.upsert({
        where: { teamId: teamId },
        update: {
          formationJson: defaultFormation,
          substitutionJson: {},
          updatedAt: new Date()
        },
        create: {
          teamId: teamId,
          formationJson: defaultFormation,
          substitutionJson: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
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

    const enhancedFlexSubs = flexSubs.map((player: any) => ({
      ...player,
      overallRating: Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6)
    }));

    console.log('🔍 GET Formation Debug - Final response:', {
      startersCount: enhancedStarters.length,
      substitutesCount: enhancedSubstitutes.length,
      flexSubsCount: enhancedFlexSubs.length,
      flexSubNames: enhancedFlexSubs.map((s: any) => s.firstName + ' ' + s.lastName)
    });
    
    res.json({
      starters: enhancedStarters,
      substitutes: enhancedSubstitutes,
      flexSubs: enhancedFlexSubs,
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

// Get next scheduled opponent for dashboard display
router.get('/my/next-opponent', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const userTeam = await storage.teams.getTeamByUserId(userId);
  
  if (!userTeam) {
    throw ErrorCreators.notFound("Team not found for current user");
  }

  // Get next scheduled game for this team
  const nextGame = await prisma.game.findFirst({
    where: {
      OR: [
        { homeTeamId: userTeam.id },
        { awayTeamId: userTeam.id }
      ],
      status: 'SCHEDULED',
      gameDate: {
        gte: new Date()
      }
    },
    include: {
      homeTeam: {
        select: { name: true }
      },
      awayTeam: {
        select: { name: true }
      }
    },
    orderBy: {
      gameDate: 'asc'
    }
  });

  if (!nextGame) {
    return res.json({ nextOpponent: "No games scheduled" });
  }

  // Determine opponent name and calculate time until match
  const isHome = nextGame.homeTeamId === userTeam.id;
  const opponentName = isHome ? nextGame.awayTeam.name : nextGame.homeTeam.name;
  const gameDate = nextGame.gameDate;
  
  // Calculate time until match
  const now = new Date();
  const timeDiff = gameDate.getTime() - now.getTime();
  
  // Calculate total hours and minutes (not days-based)
  const totalHours = Math.floor(timeDiff / (1000 * 60 * 60));
  const totalMinutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  let timeUntil;
  if (timeDiff <= 0) {
    timeUntil = "Starting soon";
  } else if (totalHours > 0) {
    timeUntil = `${totalHours} Hrs, ${totalMinutes} Minutes remaining`;
  } else if (totalMinutes > 0) {
    timeUntil = `${totalMinutes} Minutes remaining`;
  } else {
    timeUntil = "Less than 1 minute remaining";
  }

  res.json({ 
    nextOpponent: opponentName,
    gameDate: gameDate,
    isHome: isHome,
    matchType: nextGame.matchType || 'League',
    division: userTeam.division,
    timeUntil: timeUntil
  });
}));

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

  // Check seasonal restriction: teams start with 12 players, more than 12 means tryouts already used
  const currentPlayerCount = await prisma.player.count({
    where: { teamId: team.id }
  });
  
  if (currentPlayerCount > 12) {
    throw ErrorCreators.validation("Teams can only conduct tryouts once per season (17-day cycle). You have already used your tryouts for this season.");
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

  // No need to track separately - the player count serves as the seasonal restriction

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
  console.log('[DEBUG] Starting finances endpoint, teamId:', req.params.teamId);
  
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Verify team ownership - simplified for development
  let team;
  if (teamId === "my") {
    team = await storage.teams.getTeamByUserId(userId);
  } else {
    team = await storage.teams.getTeamById(parseInt(teamId));
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

  // Return finances with calculated values and proper BigInt serialization
  const facilitiesCost = parseInt(String(finances.facilitiesMaintenanceCost || '0'));
  const projectedIncome = parseInt(String(finances.projectedIncome || '0'));
  const totalExpenses = totalPlayerSalaries + totalStaffSalaries + facilitiesCost;
  
  // Create response object
  const calculatedFinances = {
    id: finances.id,
    teamId: finances.teamId,
    credits: finances.credits,
    gems: finances.gems,
    escrowCredits: finances.escrowCredits,
    escrowGems: finances.escrowGems,
    projectedIncome: finances.projectedIncome,
    projectedExpenses: finances.projectedExpenses,
    lastSeasonRevenue: finances.lastSeasonRevenue,
    lastSeasonExpenses: finances.lastSeasonExpenses,
    facilitiesMaintenanceCost: finances.facilitiesMaintenanceCost,
    createdAt: finances.createdAt,
    updatedAt: finances.updatedAt,
    team: finances.team,
    // Calculated values
    playerSalaries: totalPlayerSalaries,
    staffSalaries: totalStaffSalaries,
    totalExpenses: totalExpenses,
    netIncome: projectedIncome - totalExpenses
  };

  // Comprehensive BigInt serialization utility function
  function serializeBigIntValues(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(serializeBigIntValues);
    }
    
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = serializeBigIntValues(value);
      }
      return serialized;
    }
    
    return obj;
  }

  // Apply BigInt serialization to the entire response
  const serializedFinances = serializeBigIntValues(calculatedFinances);
  res.json(serializedFinances);
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

  // Get taxi squad players using the new storage method
  const actualTaxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);

  logInfo("Taxi squad retrieved", {
    teamId: team.id,
    playersCount: actualTaxiSquadPlayers.length,
    requestId: req.requestId
  });

  res.json(actualTaxiSquadPlayers);
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

  // Check taxi squad capacity (max 3 players as per updated config)
  const currentTaxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);
  
  // Also check total roster size (max 15 players total)
  const totalPlayers = await prisma.player.count({ where: { teamId: team.id } });
  const maxTotalPlayers = 15;
  
  if (totalPlayers + candidates.length > maxTotalPlayers) {
    throw ErrorCreators.validation(`Maximum roster size is ${maxTotalPlayers} players. You currently have ${totalPlayers} players.`);
  }
  
  if (currentTaxiSquadPlayers.length + candidates.length > 3) {
    throw ErrorCreators.validation(`Taxi squad full. Can only add ${3 - currentTaxiSquadPlayers.length} more players`);
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
    // Add taxi squad player directly using Prisma
    const newPlayer = await prisma.player.create({
      data: {
        teamId: team.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        race: candidate.race.toUpperCase(), // Convert to uppercase for Prisma enum
        age: candidate.age,
        role: roleEnum, // Use converted enum value
        speed: candidate.speed,
        power: candidate.power,
        throwing: candidate.throwing,
        catching: candidate.catching,
        kicking: candidate.kicking,
        staminaAttribute: candidate.staminaAttribute,
        leadership: candidate.leadership,
        agility: candidate.agility,
        potentialRating: parseFloat(candidate.potentialRating?.toString() || '0'),
        dailyStaminaLevel: 100,
        injuryStatus: "HEALTHY",
        camaraderieScore: 75.0,
        isOnMarket: false,
        // These players will be beyond the 12-player limit, making them taxi squad
      }
    });

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
    team = await storage.teams.getTeamById(parseInt(teamId));
    if (!team) {
      throw ErrorCreators.notFound("Team not found");
    }
    
    // Check team ownership via UserProfile (same as other routes)
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId }
    });
    
    if (!userProfile || team.userProfileId !== userProfile.id) {
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

  // Get all players to calculate roster positions (same logic as storage layer)
  const allTeamPlayers = await prisma.player.findMany({
    where: {
      teamId: team.id,
      isOnMarket: false
    },
    orderBy: { createdAt: 'asc' } // Same order as storage layer
  });

  // Calculate roster position based on creation order (same as storage layer)
  const playerIndex = allTeamPlayers.findIndex(p => p.id === parseInt(playerId));
  if (playerIndex === -1) {
    throw ErrorCreators.notFound("Player not found in team roster");
  }
  
  const rosterPosition = playerIndex + 1;
  
  // Flexible taxi squad logic: positions 13+ are taxi squad (max 2 players)
  // Minimum 12 main roster players (positions 1-12)
  const isOnTaxiSquad = rosterPosition >= 13 && allTeamPlayers.length > 12;
  
  if (!isOnTaxiSquad) {
    throw ErrorCreators.validation("Player is not on taxi squad");
  }

  // Check if total roster has space (must have < 15 total players to promote)
  if (allTeamPlayers.length >= 15) {
    throw ErrorCreators.validation("Cannot promote player - roster is full (15/15 players). Please release a player first to make space.");
  }

  // Calculate appropriate salary based on player stats and age
  const baseSalary = Math.max(5000, Math.min(50000, 
    ((player.speed + player.power + player.throwing + player.catching + player.agility + player.staminaAttribute) / 6) * 1000
  ));
  
  // Promote player (this will only succeed if main roster has space)
  const promotedPlayer = await storage.players.promotePlayerFromTaxiSquad(playerId);
  
  // Update player potential rating (contracts are handled separately in Contract table)
  const cappedPotential = Math.min(5.0, Number(player.potentialRating) || 3.0);
  const updatedPlayer = await storage.players.updatePlayer(parseInt(playerId), {
    // Cap potential at 5.0 stars maximum
    potentialRating: cappedPotential,
    updatedAt: new Date(),
  });

  logInfo("Player promoted from taxi squad with 3-year contract", {
    teamId: team.id,
    playerId: playerId,
    playerName: `${player.firstName} ${player.lastName}`,
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

  // Get all players to calculate roster positions (same logic as storage layer)
  const allTeamPlayers = await prisma.player.findMany({
    where: {
      teamId: team.id,
      isOnMarket: false
    },
    orderBy: { createdAt: 'asc' } // Same order as storage layer
  });

  // Calculate roster position based on creation order (same as storage layer)
  const playerIndex = allTeamPlayers.findIndex(p => p.id === parseInt(playerId));
  if (playerIndex === -1) {
    throw ErrorCreators.notFound("Player not found in team roster");
  }
  
  const rosterPosition = playerIndex + 1;
  
  // Flexible taxi squad logic: positions 13+ are taxi squad (max 2 players)
  // Minimum 12 main roster players (positions 1-12)
  const isOnTaxiSquad = rosterPosition >= 13 && allTeamPlayers.length > 12;
  
  if (!isOnTaxiSquad) {
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

// Debug endpoint to test taxi squad logic
router.get('/:teamId/taxi-squad/debug', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
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

  // Get all players for debugging
  const allPlayers = await prisma.player.findMany({
    where: {
      teamId: team.id,
      isOnMarket: false
    },
    orderBy: { createdAt: 'asc' }
  });

  // Show flexible taxi squad logic (13-15 main roster, 0-2 taxi squad)
  const taxiSquad = allPlayers.slice(13); // Players beyond position 13 are taxi squad (max 2)
  const mainRoster = allPlayers.slice(0, allPlayers.length - taxiSquad.length); // Rest are main roster

  res.json({
    teamId: team.id,
    totalPlayers: allPlayers.length,
    mainRoster: mainRoster.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, createdAt: p.createdAt })),
    taxiSquad: taxiSquad.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, createdAt: p.createdAt })),
    emberField: allPlayers.find(p => p.firstName === 'Ember' && p.lastName === 'Field')
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
    const contracts = await prisma.contract.findMany({
      where: { 
        playerId: { not: null },
        player: {
          teamId: parseInt(teamId)
        }
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            race: true,
            age: true,
            role: true
          }
        }
      }
    });
    
    // Transform contracts to display format
    const contractsWithPlayer = contracts.map(contract => ({
      ...contract,
      salary: contract.salary, // Already Int, no conversion needed
      signingBonus: contract.signingBonus,
      player: contract.player
    }));
    
    res.json({
      success: true,
      contracts: contractsWithPlayer,
      totalContracts: contractsWithPlayer.length,
      players: contractsWithPlayer.map(contract => ({
        id: contract.player?.id,
        firstName: contract.player?.firstName,
        lastName: contract.player?.lastName,
        race: contract.player?.race,
        age: contract.player?.age,
        role: contract.player?.role,
        salary: contract.salary,
        contractLength: contract.length,
        signingBonus: contract.signingBonus,
        startDate: contract.startDate
      }))
    });
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    next(error);
  }
});

// Apply team boost for next match
router.post('/:teamId/apply-team-boost', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;
  const { itemId, effect } = req.body;

  // Verify team ownership
  const team = await storage.teams.getTeamById(teamId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check if user owns this team - need to get userProfile first
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.unauthorized("User profile not found");
  }

  if (team.userProfileId !== userProfile.id) {
    throw ErrorCreators.unauthorized("You don't own this team");
  }

  // Verify the item exists in team inventory
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      id: parseInt(itemId),
      teamId: parseInt(teamId)
    },
    include: {
      item: true
    }
  });

  if (!inventoryItem) {
    throw ErrorCreators.notFound("Item not found in team inventory");
  }

  // Check if it's a team boost
  if (!effect || !effect.startsWith('team_')) {
    throw ErrorCreators.validation("Item is not a team boost");
  }

  // Check if there's already a team boost of this type active
  const existingBoost = await prisma.activeBoost.findFirst({
    where: {
      teamId: parseInt(teamId),
      playerId: null, // Team boosts have no specific player
      isActive: true,
      item: {
        name: inventoryItem.item.name
      }
    }
  });

  if (existingBoost) {
    throw ErrorCreators.conflict("A boost of this type is already active");
  }

  // Create team boost record
  const teamBoost = await prisma.activeBoost.create({
    data: {
      teamId: parseInt(teamId),
      playerId: null, // Team boosts don't target specific players
      itemId: inventoryItem.item.id,
      matchType: "LEAGUE", // Default to league matches
      isActive: true
    },
    include: {
      item: true
    }
  });

  // Decrease item quantity or remove if quantity is 1
  if (inventoryItem.quantity > 1) {
    await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantity: inventoryItem.quantity - 1 }
    });
  } else {
    await prisma.inventoryItem.delete({
      where: { id: inventoryItem.id }
    });
  }

  res.json({
    success: true,
    message: `${inventoryItem.item.name} activated for next match`,
    teamBoost: {
      ...teamBoost,
      id: teamBoost.id.toString(),
      teamId: teamBoost.teamId.toString(),
      itemId: teamBoost.itemId.toString()
    }
  });
}));

// Get active boosts for a team
router.get("/:teamId/active-boosts", isAuthenticated, asyncHandler(async (req, res) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;

  // Verify team ownership
  const team = await storage.teams.getTeamById(teamId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check if user owns this team
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.unauthorized("User profile not found");
  }

  if (team.userProfileId !== userProfile.id) {
    throw ErrorCreators.unauthorized("You don't own this team");
  }

  // Get active boosts for the team
  const activeBoosts = await prisma.activeBoost.findMany({
    where: {
      teamId: parseInt(teamId),
      isActive: true
    },
    include: {
      item: true
    }
  });

  // Convert BigInt values to strings for JSON serialization
  const serializedBoosts = activeBoosts.map(boost => ({
    id: boost.id.toString(),
    teamId: boost.teamId.toString(),
    playerId: boost.playerId?.toString() || null,
    itemId: boost.itemId.toString(),
    itemName: boost.item.name,
    effect: boost.item.effectValue?.effect || boost.item.metadata?.effect || boost.item.effect,
    matchType: boost.matchType,
    isActive: boost.isActive,
    appliedAt: boost.appliedAt
  }));

  res.json(serializedBoosts);
}));

// Delete active boost for a team
router.delete("/:teamId/active-boosts/:boostId", isAuthenticated, asyncHandler(async (req, res) => {
  const userId = req.user.claims.sub;
  const { teamId, boostId } = req.params;

  // Verify team ownership
  const team = await storage.teams.getTeamById(teamId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Check if user owns this team
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.unauthorized("User profile not found");
  }

  if (team.userProfileId !== userProfile.id) {
    throw ErrorCreators.unauthorized("You don't own this team");
  }

  // Delete the active boost
  await prisma.activeBoost.delete({
    where: {
      id: parseInt(boostId),
      teamId: parseInt(teamId)
    }
  });

  res.json({ success: true, message: "Active boost removed successfully" });
}));

// Get release fee for player
router.get('/:teamId/players/:playerId/release-fee', isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId, playerId } = req.params;

  // Find team and validate ownership
  let team;
  if (req.user && req.user.claims) {
    team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team || team.id !== parseInt(teamId)) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  } else {
    team = await storage.teams.getTeamById(parseInt(teamId));
    if (!team) {
      throw ErrorCreators.notFound("Team not found");
    }
    
    // Check ownership for non-Replit auth
    const ownershipTeam = await storage.teams.getTeamByUserId(req.user?.id);
    if (!ownershipTeam || ownershipTeam.id !== parseInt(teamId)) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }

  // Check if player exists and is on this team
  const player = await storage.players.getPlayerById(parseInt(playerId));
  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }

  if (player.teamId !== team.id) {
    throw ErrorCreators.forbidden("Player does not belong to your team");
  }

  // Validate release requirements and get release fee
  const validation = await storage.players.validatePlayerReleaseFromMainRoster(parseInt(playerId));
  
  // Get team finances to show current credits
  const teamFinances = await prisma.teamFinances.findUnique({
    where: { teamId: team.id }
  });
  
  res.json({
    canRelease: validation.canRelease,
    reason: validation.reason,
    releaseFee: validation.releaseFee || 2500,
    teamCredits: teamFinances ? Number(teamFinances.credits) : 0
  });
}));

// Release player from main roster (with release fee)
router.delete('/:teamId/players/:playerId', isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId, playerId } = req.params;

  // Find team and validate ownership
  let team;
  if (req.user && req.user.claims) {
    team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team || team.id !== parseInt(teamId)) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  } else {
    team = await storage.teams.getTeamById(parseInt(teamId));
    if (!team) {
      throw ErrorCreators.notFound("Team not found");
    }
    
    // Check ownership for non-Replit auth
    const ownershipTeam = await storage.teams.getTeamByUserId(req.user?.id);
    if (!ownershipTeam || ownershipTeam.id !== parseInt(teamId)) {
      throw ErrorCreators.forbidden("You do not own this team");
    }
  }

  // Check if player exists and is on this team
  const player = await storage.players.getPlayerById(parseInt(playerId));
  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }

  if (player.teamId !== team.id) {
    throw ErrorCreators.forbidden("Player does not belong to your team");
  }

  // Validate release requirements and get release fee
  const validation = await storage.players.validatePlayerReleaseFromMainRoster(parseInt(playerId));
  if (!validation.canRelease) {
    throw ErrorCreators.validation(validation.reason || "Cannot release player");
  }

  const releaseFee = validation.releaseFee || 2500;

  // Get team finances to check credits
  const teamFinances = await prisma.teamFinances.findUnique({
    where: { teamId: team.id }
  });
  
  if (!teamFinances) {
    throw ErrorCreators.internal("Team finances not found");
  }

  const currentCredits = Number(teamFinances.credits);
  
  // Check if team has enough credits for the release fee
  if (currentCredits < releaseFee) {
    throw ErrorCreators.validation(`Insufficient credits for release fee. Need ${releaseFee} credits, have ${currentCredits}`);
  }

  // Deduct release fee from team finances
  await prisma.teamFinances.update({
    where: { teamId: team.id },
    data: { credits: BigInt(currentCredits - releaseFee) }
  });

  // Release player
  const released = await storage.players.releasePlayerFromMainRoster(parseInt(playerId));

  if (!released) {
    throw ErrorCreators.internal("Failed to release player");
  }

  logInfo("Player released from main roster", {
    teamId: team.id,
    playerId: playerId,
    playerName: player.name,
    releaseFee: releaseFee,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: "Player released from main roster",
    releaseFee: releaseFee
  });
}));

// Get current user's team stadium data
router.get('/stadium', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's team first
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Get stadium from database
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });
    
    if (!stadium) {
      // Create default stadium if none exists
      const newStadium = await prisma.stadium.create({
        data: {
          teamId: team.id,
          capacity: 5000,
          concessionsLevel: 1,
          parkingLevel: 1,
          vipSuitesLevel: 0,
          merchandisingLevel: 1,
          lightingScreensLevel: 1
        }
      });
      
      return res.json(newStadium);
    }
    
    res.json(stadium);
  } catch (error) {
    console.error("Error fetching team stadium:", error);
    next(error);
  }
});

// Get team stadium data by team ID
router.get('/:teamId/stadium', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    // Get stadium from database
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: teamId }
    });
    
    if (!stadium) {
      // Create default stadium if none exists
      const newStadium = await prisma.stadium.create({
        data: {
          teamId: teamId,
          capacity: 5000,
          concessionsLevel: 1,
          parkingLevel: 1,
          vipSuitesLevel: 0,
          merchandisingLevel: 1,
          lightingScreensLevel: 1
        }
      });
      
      return res.json(newStadium);
    }
    
    res.json(stadium);
  } catch (error) {
    console.error("Error fetching team stadium:", error);
    next(error);
  }
});

// Add tactical settings endpoints

// Get team tactical setup
router.get('/:teamId/tactical-setup', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user.claims.sub;
  
  // Validate team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== parseInt(teamId)) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Get current season data for timing checks
  const currentSeason = await storage.seasons.getCurrentSeason();
  
  // Get head coach for tactical bonuses
  const headCoach = await prisma.staff.findFirst({
    where: { teamId: team.id, type: 'HEAD_COACH' }
  });

  // Calculate team camaraderie
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id);

  // Get tactical data
  const tacticalData = {
    fieldSize: team.homeField || 'STANDARD',
    tacticalFocus: team.tacticalFocus || 'BALANCED',
    coachBonus: headCoach ? Math.round((headCoach.motivation + headCoach.tactics) / 10) : 0,
    coachEffectiveness: headCoach ? Math.round((headCoach.motivation + headCoach.tactics) / 2) : 0,
    teamCamaraderie: Math.round(teamCamaraderie),
    fieldSizeBonus: team.homeField === 'LARGE' ? 3 : team.homeField === 'COMPACT' ? 2 : 1,
    tacticalFocusBonus: team.tacticalFocus === 'ALL_OUT_ATTACK' ? 4 : team.tacticalFocus === 'DEFENSIVE_WALL' ? 3 : 2,
    currentDay: currentSeason?.currentDay || 1
  };

  res.json(tacticalData);
}));

// Update field size (with timing restrictions)
router.post('/:teamId/field-size', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const { fieldSize } = req.body;
  const userId = req.user.claims.sub;

  // Validate field size
  if (!['STANDARD', 'LARGE', 'COMPACT'].includes(fieldSize)) {
    throw ErrorCreators.validation("Invalid field size. Must be STANDARD, LARGE, or COMPACT");
  }

  // Validate team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== parseInt(teamId)) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Check timing restrictions (Day 15 11PM EDT to Day 1 3PM EDT)
  const currentSeason = await storage.seasons.getCurrentSeason();
  const currentDay = currentSeason?.currentDay || 1;
  const currentHour = new Date().getHours();

  const canChangeFieldSize = (
    (currentDay === 15 && currentHour >= 23) ||
    currentDay === 16 || 
    currentDay === 17 ||
    (currentDay === 1 && currentHour <= 15)
  );

  if (!canChangeFieldSize) {
    throw ErrorCreators.validation("Field size can only be changed from Day 15 (11PM EDT) to Day 1 (3PM EDT)");
  }

  // Update field size
  await prisma.team.update({
    where: { id: team.id },
    data: { homeField: fieldSize as any }
  });

  logInfo("Field size updated", {
    teamId: team.id,
    fieldSize: fieldSize,
    currentDay: currentDay,
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    message: `Field size updated to ${fieldSize}`,
    fieldSize: fieldSize
  });
}));

// Update tactical focus
router.post('/:teamId/tactical-focus', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const { tacticalFocus } = req.body;
  const userId = req.user.claims.sub;

  // Validate tactical focus
  if (!['BALANCED', 'ALL_OUT_ATTACK', 'DEFENSIVE_WALL'].includes(tacticalFocus)) {
    throw ErrorCreators.validation("Invalid tactical focus. Must be BALANCED, ALL_OUT_ATTACK, or DEFENSIVE_WALL");
  }

  // Validate team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== parseInt(teamId)) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Update tactical focus
  await prisma.team.update({
    where: { id: team.id },
    data: { tacticalFocus: tacticalFocus as any }
  });

  logInfo("Tactical focus updated", {
    teamId: team.id,
    tacticalFocus: tacticalFocus,
    requestId: req.requestId
  });

  res.json({ 
    success: true,
    message: `Tactical focus updated to ${tacticalFocus}`,
    tacticalFocus: tacticalFocus
  });
}));

// Get team scouting data (for opponent analysis)
router.get('/:teamId/scouting', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (!teamId || isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    // Get team data
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        finances: true,
        stadium: true
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get players with contracts
    const players = await prisma.player.findMany({
      where: { teamId: teamId },
      include: {
        contract: true
      }
    });

    // Calculate team metrics
    const teamPower = players.length > 0 ? 
      Math.round(players.reduce((sum, p) => sum + ((p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6), 0) / players.length * 10) / 10 : 0;

    // Get top 5 players by power
    const topPlayers = players
      .map(p => ({
        ...p,
        powerRating: (p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6
      }))
      .sort((a, b) => b.powerRating - a.powerRating)
      .slice(0, 5);

    // Calculate financial metrics
    const totalSalary = players.reduce((sum, p) => sum + (p.contract?.salary || 0), 0);
    const highestContract = players
      .filter(p => p.contract)
      .sort((a, b) => (b.contract?.salary || 0) - (a.contract?.salary || 0))[0];

    // Calculate fan loyalty and attendance (simplified)
    const fanLoyalty = team.fanLoyalty || 50;
    const attendanceRate = Math.min(fanLoyalty / 100 * 0.8 + 0.2, 1.0);

    // Get global ranking (simplified)
    const allTeams = await prisma.team.findMany({
      select: { id: true, wins: true, losses: true, points: true }
    });
    const sortedTeams = allTeams.sort((a, b) => b.points - a.points);
    const globalRank = sortedTeams.findIndex(t => t.id === teamId) + 1;

    const scoutingData = {
      team: {
        id: team.id,
        name: team.name,
        division: team.division,
        subdivision: team.subdivision,
        wins: team.wins,
        draws: 0, // Not tracked in current schema
        losses: team.losses,
        points: team.points,
        camaraderie: team.camaraderie,
        tacticalFocus: team.tacticalFocus,
        homeField: team.homeField
      },
      teamPower,
      globalRank,
      fanLoyalty,
      attendanceRate,
      topPlayers,
      totalSalary,
      playerCount: players.length,
      highestContract: highestContract ? {
        firstName: highestContract.firstName,
        lastName: highestContract.lastName,
        salary: highestContract.contract?.salary || 0,
        length: highestContract.contract?.length || 1
      } : null,
      stadium: {
        capacity: team.stadium?.capacity || 15000,
        concessionsLevel: team.stadium?.concessionsLevel || 1,
        vipSuitesLevel: team.stadium?.vipSuitesLevel || 1,
        lightingScreensLevel: team.stadium?.lightingScreensLevel || 1
      }
    };

    res.json(scoutingData);
  } catch (error) {
    console.error('Error fetching team scouting data:', error);
    next(error);
  }
});



// User-specific live matches endpoint
router.get('/:teamId/matches/live', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const teamIdNum = parseInt(teamId, 10);
    
    if (isNaN(teamIdNum)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    // Import matchStorage here to avoid circular dependencies
    const { matchStorage } = await import('../storage/matchStorage');

    // Get live matches involving only the specified team
    const allLiveMatches = await matchStorage.getLiveMatches();
    const userTeamMatches = allLiveMatches.filter(match => 
      match.homeTeamId === teamIdNum || match.awayTeamId === teamIdNum
    );

    // Transform matches for user team display
    const transformedMatches = userTeamMatches.map(match => {
      const matchType = match.tournamentId ? 'TOURNAMENT' : 
                       match.type === 'exhibition' ? 'EXHIBITION' : 'LEAGUE';
      
      return {
        id: match.id.toString(),
        type: matchType,
        status: match.status || 'LIVE',
        homeTeam: {
          id: match.homeTeamId.toString(),
          name: match.homeTeam?.name || 'Unknown Team',
          logo: null
        },
        awayTeam: {
          id: match.awayTeamId.toString(),
          name: match.awayTeam?.name || 'Unknown Team',
          logo: null
        },
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        gameTime: match.gameTime || 0,
        maxGameTime: match.maxGameTime || 2400,
        division: match.homeTeam?.division || match.awayTeam?.division || 8,
        subdivision: match.homeTeam?.subdivision || match.awayTeam?.subdivision || match.league?.name || 'Unknown Subdivision',
        tournamentName: match.tournament?.name || (matchType === 'TOURNAMENT' ? 'Tournament Match' : null),
        priority: 'HIGH', // User matches are always high priority
        userTeamInvolved: true,
        gameDate: match.gameDate || new Date().toISOString(),
        estimatedEndTime: null,
        viewers: match.viewers || 0
      };
    });

    res.json(transformedMatches);
  } catch (error) {
    console.error("Error fetching user team live matches:", error);
    next(error);
  }
});

// Get team contracts
router.get('/:teamId/contracts', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify team ownership
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || team.id !== parseInt(teamId)) {
      return res.status(403).json({ message: "You do not own this team" });
    }
    
    // Get contracts for both players and staff on this team
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { player: { teamId: parseInt(teamId) } },
          { staff: { teamId: parseInt(teamId) } }
        ]
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });
    
    // Convert BigInt salary values to strings for JSON serialization
    const serializedContracts = contracts.map(contract => ({
      ...contract,
      salary: contract.salary.toString()
    }));
    
    res.json(serializedContracts);
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    next(error);
  }
});

export default router;
