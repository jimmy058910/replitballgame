import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { z } from "zod";
import { ContractService } from '../services/contractService.js';
import { PlayerSkillsService } from '../services/playerSkillsService.js';
import { PlayerAgingRetirementService } from '../services/playerAgingRetirementService.js';
import type { Player, Team, Contract, League } from '@shared/types/models';


const router = Router();

// Helper function to handle BigInt serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  return obj;
}

// Unified authentication and team validation helper
async function getUserTeam(req: any): Promise<any> {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam) {
    throw new Error("Team not found for user");
  }

  return userTeam;
}

// Contract negotiation validation schema
const contractNegotiationSchema = z.object({
  years: z.number().min(1).max(5),
  salary: z.number().min(1),
  signingBonus: z.number().min(0).optional()
});

// ============================================================================
// CORE PLAYER OPERATIONS
// ============================================================================

/**
 * GET /players - Get all players for user's team
 * Consolidated from: playerRoutes.ts
 */
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userTeam = await getUserTeam(req);
    
    const players = await storage?.players.getPlayersByTeamId(userTeam.id);
    
    res.json({ 
      players: convertBigIntToString(players),
      teamName: userTeam.name,
      totalPlayers: players.length
    });
  } catch (error) {
    console.error('Error fetching team players:', error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /players/:playerId - Get individual player details with contract
 * Consolidated from: playerRoutes.ts
 */
router.get('/:playerId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Verify player belongs to user's team
    if (player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player does not belong to your team" });
    }

    res.json({ player: convertBigIntToString(player) });
  } catch (error) {
    console.error('Error fetching player details:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/contract-value - Calculate contract value using UVF
 * Consolidated from: playerRoutes.ts
 */
router.get('/:playerId/contract-value', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    if (player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player does not belong to your team" });
    }

    // Calculate Universal Value Formula (UVF) contract value
    const contractService = new ContractService();
    const contractValue = await contractService.calculatePlayerValue(player);

    res.json({ 
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      contractValue: convertBigIntToString(contractValue),
      calculationDate: new Date()
    });
  } catch (error) {
    console.error('Error calculating contract value:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/contract-negotiation-data - Contract negotiation modal data
 * Consolidated from: playerRoutes.ts
 */
router.get('/:playerId/contract-negotiation-data', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    if (player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player does not belong to your team" });
    }

    const contractService = new ContractService();
    const negotiationData = await contractService.getContractNegotiationData(player, userTeam);

    res.json({ 
      player: {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.role,
        age: player.age
      },
      negotiationData: convertBigIntToString(negotiationData)
    });
  } catch (error) {
    console.error('Error fetching contract negotiation data:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/negotiation-feedback - Live contract feedback
 * Consolidated from: playerRoutes.ts
 */
router.post('/:playerId/negotiation-feedback', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);
    
    const validatedData = contractNegotiationSchema.parse(req.body);

    const player = await storage?.players.getPlayerById(playerId);
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    if (player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player does not belong to your team" });
    }

    const contractService = new ContractService();
    const feedback = await contractService.getNegotiationFeedback(player, validatedData);

    res.json({ 
      feedback: convertBigIntToString(feedback),
      terms: validatedData
    });
  } catch (error) {
    console.error('Error getting negotiation feedback:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid contract terms", 
        details: error.errors 
      });
    }
    next(error);
  }
});

/**
 * POST /players/:playerId/negotiate-contract - New contract negotiation system
 * Consolidated from: playerRoutes.ts
 */
router.post('/:playerId/negotiate-contract', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);
    
    const validatedData = contractNegotiationSchema.parse(req.body);

    const player = await storage?.players.getPlayerById(playerId);
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    if (player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player does not belong to your team" });
    }

    const contractService = new ContractService();
    const result = await contractService.negotiateContract(player, userTeam, validatedData);

    if (result.success) {
      res.json({ 
        success: true,
        message: "Contract negotiation successful",
        contract: convertBigIntToString(result.contract),
        newTerms: validatedData
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: result.error,
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Error negotiating contract:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid contract terms", 
        details: error.errors 
      });
    }
    next(error);
  }
});

// ============================================================================
// SKILL MANAGEMENT SYSTEM
// ============================================================================

/**
 * GET /players/:playerId/skills - Get player's current skills
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/:playerId/skills', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    // Verify player belongs to user's team
    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const skills = await PlayerSkillsService.getPlayerSkills(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      skills: convertBigIntToString(skills)
    });
  } catch (error) {
    console.error('Error fetching player skills:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/eligible-skills - Get acquirable skills
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/:playerId/eligible-skills', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const eligibleSkills = await PlayerSkillsService.getEligibleSkills(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      eligibleSkills: convertBigIntToString(eligibleSkills)
    });
  } catch (error) {
    console.error('Error fetching eligible skills:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/skill-effects - Get skill effects for matches
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/:playerId/skill-effects', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const skillEffects = await PlayerSkillsService.getSkillEffects(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      skillEffects: convertBigIntToString(skillEffects)
    });
  } catch (error) {
    console.error('Error fetching skill effects:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/skills/:skillId/acquire - Manual skill acquisition
 * Consolidated from: playerSkillsRoutes.ts
 */
router.post('/:playerId/skills/:skillId/acquire', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const skillId = parseInt(req.params.skillId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const result = await PlayerSkillsService.acquireSkill(playerId, skillId);

    if (result.success) {
      res.json({
        success: true,
        message: `${`${player.firstName} ${player.lastName}`} acquired new skill successfully`,
        skill: convertBigIntToString(result.skill)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error acquiring skill:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/skills/:skillId/upgrade - Manual skill upgrade
 * Consolidated from: playerSkillsRoutes.ts
 */
router.post('/:playerId/skills/:skillId/upgrade', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const skillId = parseInt(req.params.skillId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const result = await PlayerSkillsService.upgradeSkill(playerId, skillId);

    if (result.success) {
      res.json({
        success: true,
        message: `${`${player.firstName} ${player.lastName}`} upgraded skill successfully`,
        skill: convertBigIntToString(result.skill),
        newLevel: result.newLevel
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error upgrading skill:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/skill-up-event - Simulate skill-up event
 * Consolidated from: playerSkillsRoutes.ts
 */
router.post('/:playerId/skill-up-event', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const result = await PlayerSkillsService.simulateSkillUpEvent(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      skillUpEvent: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error simulating skill-up event:', error);
    next(error);
  }
});

// ============================================================================
// CAREER & DEVELOPMENT SYSTEM
// ============================================================================

/**
 * GET /players/:playerId/development-stats - Player development statistics
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.get('/:playerId/development-stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const developmentStats = await PlayerAgingRetirementService.getPlayerDevelopmentStats(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      developmentStats: convertBigIntToString(developmentStats)
    });
  } catch (error) {
    console.error('Error fetching development stats:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/simulate-aging - Simulate aging over seasons
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.post('/:playerId/simulate-aging', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const { seasons = 1 } = req.body;
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const agingSimulation = await PlayerAgingRetirementService.simulateAging(playerId, seasons);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      seasonsSimulated: seasons,
      agingResults: convertBigIntToString(agingSimulation)
    });
  } catch (error) {
    console.error('Error simulating aging:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/progression-chance - Calculate progression chances
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.get('/:playerId/progression-chance', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const progressionChance = await PlayerAgingRetirementService.calculateProgressionChance(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      age: player.age,
      progressionChance: convertBigIntToString(progressionChance)
    });
  } catch (error) {
    console.error('Error calculating progression chance:', error);
    next(error);
  }
});

/**
 * GET /players/:playerId/retirement-chance - Calculate retirement chance
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.get('/:playerId/retirement-chance', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const retirementChance = await PlayerAgingRetirementService.calculateRetirementChance(playerId);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      age: player.age,
      retirementChance: convertBigIntToString(retirementChance)
    });
  } catch (error) {
    console.error('Error calculating retirement chance:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/force-retirement - Admin force retirement
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.post('/:playerId/force-retirement', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const result = await PlayerAgingRetirementService.forceRetirement(playerId);

    if (result.success) {
      res.json({
        success: true,
        message: `${`${player.firstName} ${player.lastName}`} has been retired`,
        retirementDetails: convertBigIntToString(result.details)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error forcing retirement:', error);
    next(error);
  }
});

/**
 * POST /players/:playerId/generate-age - Generate age for player context
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.post('/:playerId/generate-age', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const userTeam = await getUserTeam(req);

    const player = await storage?.players.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(403).json({ error: "Player access denied" });
    }

    const generatedAge = await PlayerAgingRetirementService.generateAge(player);

    res.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      currentAge: player.age,
      generatedAge: generatedAge,
      context: "Age generation for development context"
    });
  } catch (error) {
    console.error('Error generating age:', error);
    next(error);
  }
});

// ============================================================================
// TEAM-LEVEL OPERATIONS
// ============================================================================

/**
 * POST /teams/:teamId/process-season-skills - Team skill progression
 * Consolidated from: playerSkillsRoutes.ts
 */
router.post('/teams/:teamId/process-season-skills', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userTeam = await getUserTeam(req);

    // Verify team ownership
    if (teamId !== userTeam.id) {
      return res.status(403).json({ error: "Team access denied" });
    }

    const result = await PlayerSkillsService.processTeamSeasonProgression(teamId);

    res.json({
      success: true,
      teamId,
      teamName: userTeam.name,
      skillProgression: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error processing team season skills:', error);
    next(error);
  }
});

/**
 * GET /teams/:teamId/skill-progression-summary - Team skill progression summary
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/teams/:teamId/skill-progression-summary', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userTeam = await getUserTeam(req);

    if (teamId !== userTeam.id) {
      return res.status(403).json({ error: "Team access denied" });
    }

    const summary = await PlayerSkillsService.getTeamProgressionSummary(teamId);

    res.json({
      teamId,
      teamName: userTeam.name,
      progressionSummary: convertBigIntToString(summary)
    });
  } catch (error) {
    console.error('Error fetching progression summary:', error);
    next(error);
  }
});

/**
 * POST /teams/:teamId/process-season-development - Team end-of-season development
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.post('/teams/:teamId/process-season-development', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userTeam = await getUserTeam(req);

    if (teamId !== userTeam.id) {
      return res.status(403).json({ error: "Team access denied" });
    }

    const result = await PlayerAgingRetirementService.processTeamDevelopment(teamId);

    res.json({
      success: true,
      teamId,
      teamName: userTeam.name,
      developmentResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error processing team development:', error);
    next(error);
  }
});

// ============================================================================
// SYSTEM-LEVEL OPERATIONS
// ============================================================================

/**
 * GET /skills - Get all available skills in game
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/skills', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const skills = await PlayerSkillsService.getAllSkills();

    res.json({
      skills: convertBigIntToString(skills),
      totalSkills: skills.length
    });
  } catch (error) {
    console.error('Error fetching all skills:', error);
    next(error);
  }
});

/**
 * GET /skills/:skillId - Get specific skill details
 * Consolidated from: playerSkillsRoutes.ts
 */
router.get('/skills/:skillId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const skillId = parseInt(req.params.skillId);
    
    const skill = await PlayerSkillsService.getSkillDetails(skillId);

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    res.json({
      skill: convertBigIntToString(skill)
    });
  } catch (error) {
    console.error('Error fetching skill details:', error);
    next(error);
  }
});

/**
 * POST /league/process-season-development - League-wide seasonal development
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.post('/league/process-season-development', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Note: This is a system-level operation that may require admin privileges
    // For now, allowing any authenticated user, but this could be restricted
    
    const result = await PlayerAgingRetirementService.processLeagueDevelopment();

    res.json({
      success: true,
      message: "League-wide seasonal development processed",
      developmentResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error processing league development:', error);
    next(error);
  }
});

/**
 * GET /aging-config - Get aging system configuration
 * Consolidated from: playerAgingRetirementRoutes.ts
 */
router.get('/aging-config', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = await PlayerAgingRetirementService.getAgingConfig();

    res.json({
      agingConfiguration: convertBigIntToString(config)
    });
  } catch (error) {
    console.error('Error fetching aging config:', error);
    next(error);
  }
});

// ============================================================================
// BACKWARD COMPATIBILITY ROUTES
// ============================================================================

// Legacy endpoint redirects for existing frontend code
router.get('/api/skills', async (req, res, next) => {
  req.url = '/skills';
  next();
});

router.get('/api/skills/skills/:skillId', async (req, res, next) => {
  req.url = `/skills/${req.params.skillId}`;
  next();
});

export default router;