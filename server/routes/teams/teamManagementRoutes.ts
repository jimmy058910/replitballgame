/**
 * TEAM MANAGEMENT ROUTES
 * Extracted from monolithic teamRoutes.ts
 * Handles: Staff management, formations, players, tryouts, taxi squad
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get team staff with contracts and costs
 * GET /:teamId/staff
 */
router.get('/:teamId/staff', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

    // Fetch staff with proper authentication check
    const userId = req.user?.claims?.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      throw ErrorCreators.unauthorized("Your team was not found");
    }

    // Only allow users to see their own team's staff for now
    if (userTeam.id !== teamId) {
      throw ErrorCreators.unauthorized("You can only view your own team's staff");
    }

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Get contracts for all staff members and calculate proper costs
    const staffWithContracts = await Promise.all(
      staff.map(async (member) => {
        try {
          const contracts = await storage.contracts.getActiveContractsByStaff(member.id);
          const activeContract = contracts.length > 0 ? contracts[0] : null;
          
          return {
            ...member,
            contract: activeContract ? {
              id: activeContract.id,
              salary: Number(activeContract.salary),
              duration: activeContract.length,
              remainingYears: activeContract.length,
              signedDate: activeContract.startDate,
              expiryDate: activeContract.startDate
            } : null
          };
        } catch (error) {
          logger.error(`Error fetching contract for staff member ${member.id}`, { error: error instanceof Error ? error.message : String(error) });
          return {
            ...member,
            contract: null
          };
        }
      })
    );
    
    // Calculate total staff cost based on skills and position importance
    const totalStaffCost = staffWithContracts.reduce((total: any, member: any) => {
      if (member.contract && member.contract.salary) {
        return total + member.contract.salary;
      }
      
      // Skill-based calculation with position multipliers
      let baseCost = 0;
      
      switch (member.type) {
        case 'HEAD_COACH':
          // Most important - motivation, development, tactics
          baseCost = (member.motivation || 5) * 200 + (member.development || 5) * 200 + (member.tactics || 5) * 200;
          break;
        case 'PASSER_TRAINER':
        case 'RUNNER_TRAINER': 
        case 'BLOCKER_TRAINER':
          // Training specialists - teaching is primary
          baseCost = (member.teaching || 5) * 300 + (member.development || 5) * 100;
          break;
        case 'SCOUT':
          // Scouting specialists - talent identification and assessment
          baseCost = (member.talentIdentification || 5) * 250 + (member.potentialAssessment || 5) * 250;
          break;
        case 'RECOVERY_SPECIALIST':
          // Medical specialist - physiology is primary
          baseCost = (member.physiology || 5) * 400 + (member.development || 5) * 100;
          break;
        default:
          // Generic calculation
          const skillAverage = (
            (member.motivation || 5) + (member.development || 5) + (member.teaching || 5) + 
            (member.physiology || 5) + (member.talentIdentification || 5) + 
            (member.potentialAssessment || 5) + (member.tactics || 5)
          ) / 7;
          baseCost = skillAverage * 150;
      }
      
      // Apply level multiplier and minimum cost
      const levelMultiplier = 1 + ((member.level || 1) - 1) * 0.5; // 50% increase per level
      return total + Math.max(1000, Math.round(baseCost * levelMultiplier));
    }, 0);
    
    return res.json({
      staff: staffWithContracts,
      totalStaffCost,
      totalStaffMembers: staffWithContracts.length
    });
  } catch (error) {
    logger.error("Error fetching staff", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}));

/**
 * Debug endpoint to check staff count and types
 * GET /:teamId/staff/debug
 */
router.get('/:teamId/staff/debug', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Group staff by type and count
    const staffByType = staff.reduce((acc: any, member: any) => {
      if (!acc[member.type]) {
        acc[member.type] = [];
      }
      acc[member.type].push({
        id: member.id,
        name: member.name,
        level: member.level,
        age: member.age
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Count staff by type
    const staffCounts = Object.keys(staffByType).reduce((acc: any, type: any) => {
      acc[type] = staffByType[type].length;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      teamId,
      totalStaffMembers: staff.length,
      staffCounts,
      staffByType
    });
  } catch (error) {
    logger.error("Error debugging staff", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}));

/**
 * Clean up duplicate staff members (admin endpoint)
 * POST /:teamId/staff/cleanup-duplicates
 */
router.post('/:teamId/staff/cleanup-duplicates', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Group staff by type
    const staffByType = staff.reduce((acc: any, member: any) => {
      if (!acc[member.type]) {
        acc[member.type] = [];
      }
      acc[member.type].push(member);
      return acc;
    }, {} as Record<string, any[]>);

    let deletedCount = 0;
    const keptStaff = [];

    // For each staff type, keep the first one and delete the rest
    for (const [type, members] of Object.entries(staffByType)) {
      if (members.length > 1) {
        // Keep the first member (oldest ID)
        const toKeep = members.sort((a, b) => a.id - b.id)[0];
        keptStaff.push(toKeep);
        
        // Delete the duplicates
        const toDelete = members.slice(1);
        for (const duplicate of toDelete) {
          logger.info(`Deleting duplicate ${type}: ${duplicate.name} (ID: ${duplicate.id})`);
          await storage.staff.deleteStaff(duplicate.id);
          deletedCount++;
        }
      } else if (members.length === 1) {
        // Only one of this type, keep it
        keptStaff.push(members[0]);
      }
    }

    // Special handling for SCOUT type - should have exactly 2 (Tony Scout and Emma Talent)
    const scouts = staffByType['SCOUT'] || [];
    if (scouts.length > 2) {
      // Find one Tony Scout and one Emma Talent, delete the rest
      const tonyScout = scouts.find(s => s.name === 'Tony Scout');
      const emmaTalent = scouts.find(s => s.name === 'Emma Talent');
      
      if (tonyScout && emmaTalent) {
        // Delete all other scouts
        const toDeleteScouts = scouts.filter(s => s.id !== tonyScout.id && s.id !== emmaTalent.id);
        for (const scout of toDeleteScouts) {
          logger.info(`Deleting duplicate scout: ${scout.name} (ID: ${scout.id})`);
          await storage.staff.deleteStaff(scout.id);
          deletedCount++;
        }
      }
    }

    // Recalculate team staff salaries after cleanup
    const { teamFinancesStorage } = await import('../../storage/teamFinancesStorage.js');
    await teamFinancesStorage.recalculateAndSaveStaffSalaries(teamId);

    return res.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate staff members`,
      deletedCount,
      remainingStaffCount: staff.length - deletedCount,
      expectedStaffCount: 7
    });
  } catch (error) {
    logger.error("Error cleaning up duplicate staff", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}));

/**
 * Add missing Tony Scout (Head Scout) to complete 7-position roster
 * POST /:teamId/staff/add-missing-scout
 */
router.post('/:teamId/staff/add-missing-scout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

    // Check if Tony Scout already exists
    const existingStaff = await storage.staff.getStaffByTeamId(teamId);
    const tonyScout = existingStaff.find(s => s.name === 'Tony Scout');
    
    if (tonyScout) {
      return res.json({
        success: false,
        message: "Tony Scout already exists on this team",
        existingStaffCount: existingStaff.length
      });
    }

    // Add Tony Scout as Head Scout
    const newTonyScout = {
      teamId,
      type: 'SCOUT' as const,
      name: 'Tony Scout',
      level: 1,
      motivation: Math.floor(Math.random() * 5) + 4, // 4-8
      development: Math.floor(Math.random() * 5) + 4, // 4-8
      teaching: Math.floor(Math.random() * 5) + 4, // 4-8
      physiology: Math.floor(Math.random() * 5) + 4, // 4-8
      talentIdentification: Math.floor(Math.random() * 5) + 6, // 6-10 (primary skill)
      potentialAssessment: Math.floor(Math.random() * 5) + 6, // 6-10 (primary skill)
      tactics: Math.floor(Math.random() * 5) + 4, // 4-8
      age: Math.floor(Math.random() * 20) + 35 // 35-54
    };

    const addedStaff = await storage.staff.createStaff(newTonyScout);
    
    // Recalculate team staff salaries after adding new staff
    const { teamFinancesStorage } = await import('../../storage/teamFinancesStorage.js');
    await teamFinancesStorage.recalculateAndSaveStaffSalaries(teamId);

    return res.json({
      success: true,
      message: "Tony Scout added as Head Scout",
      addedStaff,
      newStaffCount: existingStaff.length + 1
    });
  } catch (error) {
    logger.error("Error adding Tony Scout", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}));

/**
 * Host tryouts (recruiting system)
 * POST /:teamId/tryouts
 */
router.post('/:teamId/tryouts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { type } = req.body;
    const userId = req.user?.claims?.sub;

    // Get team
    let team;
    if (teamId === "my") {
      team = await storage.teams.getTeamByUserId(userId);
    } else {
      team = await storage.teams.getTeamById(parseInt(teamId));
      // Verify ownership
      const userTeam = await storage.teams.getTeamByUserId(userId);
      if (!userTeam || userTeam.id !== team?.id) {
        return res.status(403).json({ error: "You don't own this team" });
      }
    }
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check costs and affordability
    const costs = { basic: 25000, advanced: 75000 };
    const cost = costs[type as keyof typeof costs];

    if (!cost) {
      return res.status(400).json({ error: "Invalid tryout type. Use 'basic' or 'advanced'" });
    }

    const teamFinances = await storage.teamFinances.getTeamFinances(team.id);
    const currentCredits = Number(teamFinances?.credits || 0);

    if (currentCredits < cost) {
      return res.status(400).json({ 
        error: `Insufficient credits. Required: ${cost}₡, Available: ${currentCredits}₡` 
      });
    }

    // Generate candidates based on type
    const candidateCount = type === 'advanced' ? 5 : 3;
    const candidates = [];
    
    const races = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'];
    const lastNames = ['Storm', 'Stone', 'Swift', 'Bright', 'Strong', 'Bold', 'True', 'Fair', 'Wild', 'Free'];
    
    for (let i = 0; i < candidateCount; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      // Base stats (6-20 range for prospects)
      const statBonus = type === 'advanced' ? 4 : 0; // Advanced gets better prospects
      const baseStats = {
        speed: Math.floor(Math.random() * 10) + 8 + statBonus,
        power: Math.floor(Math.random() * 10) + 8 + statBonus,
        throwing: Math.floor(Math.random() * 10) + 8 + statBonus,
        catching: Math.floor(Math.random() * 10) + 8 + statBonus,
        kicking: Math.floor(Math.random() * 10) + 8 + statBonus,
        leadership: Math.floor(Math.random() * 10) + 8 + statBonus,
        agility: Math.floor(Math.random() * 10) + 8 + statBonus,
      };
      
      // Generate potential (better for advanced)
      const potentialMin = type === 'advanced' ? 2.0 : 1.5;
      const potentialMax = type === 'advanced' ? 4.0 : 3.0;
      const potentialRating = Math.random() * (potentialMax - potentialMin) + potentialMin;
      
      // Calculate market value
      const avgStat = Object.values(baseStats).reduce((a: any, b: any) => a + b, 0) / 7;
      const marketValue = Math.floor(1000 + (avgStat * 50) + (potentialRating * 500) + (Math.random() * 500));
      
      const candidate = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        race,
        age: Math.floor(Math.random() * 5) + 18, // 18-22 years old
        ...baseStats,
        potentialRating,
        marketValue,
        potential: potentialRating >= 3.5 ? "High" : potentialRating >= 2.5 ? "Medium" : "Low",
        overallPotentialStars: Math.round(potentialRating),
        catching: baseStats.catching,
        kicking: baseStats.kicking
      };
      
      candidates.push(candidate);
    }

    // Deduct credits
    await storage.teamFinances.updateTeamFinances(team.id, {
      credits: currentCredits - cost
    });

    return res.json({
      success: true,
      candidates,
      type,
      creditsSpent: cost,
      remainingCredits: currentCredits - cost
    });

  } catch (error) {
    logger.error("Error hosting tryouts", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}));

/**
 * Get team formation
 * GET /:teamId/formation
 */
router.get('/:teamId/formation', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId, 10);
  const userId = req.user?.claims?.sub;

  logger.info(`Handling GET /api/teams/${teamId}/formation`);

  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Verify team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== teamId) {
    throw ErrorCreators.unauthorized("Access denied to this team");
  }

  // Get players for this team
  const players = await storage?.players.getPlayersByTeamId(teamId);
  
  // Get formation from strategy table
  const { DatabaseService } = await import('../../database.js');
  const prisma = await DatabaseService.getInstance();
  const strategy = await prisma.strategy.findFirst({
    where: { teamId: teamId }
  });

  const formationData = strategy?.formationJson || null;
  
  let starters: any[] = [];
  let substitutes: any[] = [];

  if (formationData) {
    // Map starters with full player data
    starters = formationData.starters.map((s: any) => {
      const player = players.find((p: any) => p.id === s.id || p.id === parseInt(s.id));
      return player ? { ...player, rosterPosition: s.rosterPosition } : null;
    }).filter(Boolean);

    // Map substitutes with full player data
    substitutes = formationData.substitutes.map((s: any) => {
      const player = players.find((p: any) => p.id === s.id || p.id === parseInt(s.id));
      return player ? { ...player, rosterPosition: s.rosterPosition } : null;
    }).filter(Boolean);
  }

  res.json({
    starters,
    substitutes,
    formation_data: formationData
  });
}));

/**
 * Update team formation
 * PUT /:teamId/formation
 */
router.put('/:teamId/formation', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId, 10);
  const userId = req.user?.claims?.sub;

  logger.info(`Handling PUT /api/teams/${teamId}/formation`);

  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Verify team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== teamId) {
    throw ErrorCreators.unauthorized("Access denied to this team");
  }

  const { starters, substitutes, formationData } = req.body;

  // Validate starters and substitutes are arrays
  if (!Array.isArray(starters) || !Array.isArray(substitutes)) {
    throw ErrorCreators.validation("Starters and substitutes must be arrays");
  }

  logger.info('Formation update payload', {
    startersCount: starters.length,
    substitutesCount: substitutes.length,
    hasFormationData: !!formationData
  });

  // Create formation object
  const formation = {
    starters: starters.map((s: any, index: number) => ({
      id: s.id,
      rosterPosition: index + 1
    })),
    substitutes: substitutes.map((s: any, index: number) => ({
      id: s.id,
      rosterPosition: starters.length + index + 1
    })),
    formationData: formationData || { formation: "2-2-1-1-wildcard" }
  };

  // Save to strategy table
  const { DatabaseService } = await import('../../database.js');
  const prisma = await DatabaseService.getInstance();
  await prisma.strategy.upsert({
    where: { teamId: teamId },
    update: { formationJson: formation },
    create: {
      teamId: teamId,
      formationJson: formation
    }
  });

  logger.info('Formation saved successfully');

  res.json({
    success: true,
    message: "Formation updated successfully",
    formation
  });
}));

/**
 * Get team players - Required for tactics page
 * GET /:teamId/players
 */
router.get('/:teamId/players', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId, 10);
  const userId = req.user?.claims?.sub;

  logger.info(`Handling GET /api/teams/${teamId}/players`);

  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Verify team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== teamId) {
    throw ErrorCreators.unauthorized("Access denied to this team");
  }

  // Get players for this team (contracted players only)
  const players = await storage?.players.getPlayersByTeamId(teamId);
  
  logger.info(`Found ${players.length} players for team ${team.name}`);
  
  // Return players in the expected format for tactics component
  res.json(players);
}));

/**
 * Get taxi squad players
 * GET /:teamId/taxi-squad
 */
router.get('/:teamId/taxi-squad', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId, 10);
  const userId = req.user?.claims?.sub;

  logger.info(`Handling GET /api/teams/${teamId}/taxi-squad`);

  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Verify team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== teamId) {
    throw ErrorCreators.unauthorized("Access denied to this team");
  }

  // Get taxi squad players using storage method
  const taxiSquadPlayers = await storage?.players.getTaxiSquadPlayersByTeamId(team.id);

  logger.info(`Found ${taxiSquadPlayers.length} taxi squad players for team ${team.name}`);

  res.json(taxiSquadPlayers);
}));

/**
 * Get seasonal data for team (tryout usage tracking)
 * GET /:teamId/seasonal-data
 */
router.get('/:teamId/seasonal-data', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId, 10);
  const userId = req.user?.claims?.sub;

  logger.info(`Handling GET /api/teams/${teamId}/seasonal-data`);

  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  // Verify team ownership
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team || team.id !== teamId) {
    throw ErrorCreators.unauthorized("Access denied to this team");
  }

  // Check if tryouts have been used this season by looking for TryoutHistory records
  const { DatabaseService } = await import('../../database.js');
  const prisma = await DatabaseService.getInstance();
  const currentSeason = await prisma.season.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  const tryoutHistoryThisSeason = await prisma.tryoutHistory.findMany({
    where: {
      teamId: team.id,
      conductedAt: {
        gte: currentSeason?.startDate || new Date('2025-01-01')
      }
    }
  });
  
  const tryoutsUsed = tryoutHistoryThisSeason.length > 0;
  const taxiSquadPlayers = await storage?.players.getTaxiSquadPlayersByTeamId(team.id);

  logger.info(`Tryouts used: ${tryoutsUsed}, taxi squad count: ${taxiSquadPlayers.length}`);

  res.json({
    success: true,
    data: {
      tryoutsUsed: tryoutsUsed,
      taxiSquadCount: taxiSquadPlayers.length,
      seasonalData: {
        tryoutDate: tryoutsUsed ? new Date() : null,
        currentSeasonDay: 1
      }
    }
  });
}));

export default router;