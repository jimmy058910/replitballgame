/**
 * Enhanced Injury Management System
 * Consolidation of injury and injury-stamina routes
 * 
 * Phase 3G: Injury System Consolidation
 * Combines:
 * - injuryRoutes.ts (7 endpoints)
 * - injuryStaminaRoutes.ts (7 endpoints)
 * Total: 14 endpoints with unified authentication and error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';
import { injuryStaminaService } from '../services/injuryStaminaService.js';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to verify team ownership
 */
async function verifyTeamOwnership(teamId: number, userId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId }
  });
  
  if (!userProfile) {
    return false;
  }
  
  const team = await prisma.team.findFirst({
    where: { 
      id: teamId,
      userProfileId: userProfile.id 
    }
  });
  
  return !!team;
}

/**
 * Helper to get user's team from userId
 */
async function getUserTeam(userId: string) {
  const prisma = await getPrismaClient();
  
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId }
  });
  
  if (!userProfile) {
    return null;
  }
  
  const team = await prisma.team.findFirst({
    where: { userProfileId: userProfile.id }
  });
  
  return team;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createInjurySchema = z.object({
  playerId: z.string().uuid(),
  injuryType: z.string().min(1),
  injuryName: z.string().min(1),
  description: z.string().optional(),
  severity: z.number().min(1).max(10),
  recoveryTime: z.number().min(1),
});

const treatmentSchema = z.object({
  treatmentType: z.string().min(1),
});

const medicalStaffSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().min(1),
  experience: z.number().min(0),
  effectiveness: z.number().min(1).max(100),
  salary: z.number().min(0),
});

const conditioningUpdateSchema = z.object({
  fitnessLevel: z.number().min(0).max(100).optional(),
});

// ============================================================================
// INJURY MANAGEMENT ROUTES (from injuryRoutes.ts)
// ============================================================================

/**
 * GET /api/injuries/team/:teamId
 * Get all injuries for a team
 */
router.get('/team/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    const teamPlayers = await storage.players.getPlayersByTeamId(parseInt(teamId));
    if (teamPlayers.length === 0) {
      return res.json([]);
    }

    const allInjuries = [];
    for (const player of teamPlayers) {
      const playerInjuries = await storage.injuries.getPlayerInjuries(player.id);
      allInjuries.push(...playerInjuries.map((injury: any) => ({
        ...injury,
        player: {
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          race: player.race,
          position: player.role
        }
      })));
    }

    res.json(allInjuries);
  } catch (error) {
    console.error("Error fetching team injuries:", error);
    next(error);
  }
});

/**
 * POST /api/injuries
 * Create a new injury
 */
router.post('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const injuryData = createInjurySchema.parse(req.body);
    const userId = req.user.claims.sub;

    const player = await storage.players.getPlayerById(parseInt(injuryData.playerId.toString()));
    if (!player || !player.teamId) {
      return res.status(404).json({ message: "Player not found or not assigned to a team." });
    }

    // Verify ownership
    const hasAccess = await verifyTeamOwnership(player.teamId, userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Cannot create injury for player not on your team." });
    }

    const prisma = await getPrismaClient();
    const newInjury = await prisma.player.update({
      where: { id: parseInt(injuryData.playerId.toString()) },
      data: {
        injuryStatus: 'MINOR_INJURY',
        injuryRecoveryPointsNeeded: injuryData.recoveryTime || 100,
        injuryRecoveryPointsCurrent: 0,
      }
    });

    res.status(201).json(newInjury);
  } catch (error) {
    console.error("Error creating injury:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid injury data", errors: error.errors });
    }
    next(error);
  }
});

/**
 * PATCH /api/injuries/:injuryId/treatment
 * Apply treatment to an injury
 */
router.patch('/:injuryId/treatment', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { injuryId } = req.params;
    const treatmentData = treatmentSchema.parse(req.body);
    const userId = req.user.claims.sub;

    const prisma = await getPrismaClient();
    const injury = await prisma.player.findUnique({ 
      where: { id: parseInt(injuryId) },
      include: { team: true }
    });
    
    if (!injury) {
      return res.status(404).json({ message: "Injury record not found." });
    }

    // Verify ownership
    const hasAccess = await verifyTeamOwnership(injury.teamId, userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Cannot treat injury for player not on your team." });
    }

    // Apply treatment logic
    let recoveryProgress = injury.injuryRecoveryPointsCurrent || 0;
    const recoveryNeeded = injury.injuryRecoveryPointsNeeded || 100;

    if (treatmentData.treatmentType === "Advanced Therapy") {
      recoveryProgress = Math.min(recoveryNeeded, recoveryProgress + 25);
    } else {
      recoveryProgress = Math.min(recoveryNeeded, recoveryProgress + 10);
    }

    const updatedInjury = await prisma.player.update({
      where: { id: parseInt(injuryId) },
      data: {
        injuryRecoveryPointsCurrent: recoveryProgress,
        injuryStatus: recoveryProgress >= recoveryNeeded ? 'HEALTHY' : injury.injuryStatus,
      }
    });
    
    res.json(updatedInjury);
  } catch (error) {
    console.error("Error updating injury treatment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid treatment data", errors: error.errors });
    }
    next(error);
  }
});

/**
 * GET /api/injuries/medical-staff/:teamId
 * Get medical staff for a team
 */
router.get('/medical-staff/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }
    
    const staffList = await storage.staff.getStaffByTeamId(teamId);
    const medicalStaffList = staffList.filter(s =>
      ["recovery_specialist", "trainer_physical", "doctor", "physiotherapist"].includes(s.type)
    );
    
    res.json(medicalStaffList);
  } catch (error) {
    console.error("Error fetching medical staff:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/medical-staff
 * Hire medical staff
 */
router.post('/medical-staff', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeam(userId);
    
    if (!team) {
      return res.status(404).json({ message: "Your team not found. Cannot hire staff." });
    }

    const staffDataFromRequest = medicalStaffSchema.parse(req.body);
    const prisma = await getPrismaClient();
    const newStaffMember = await prisma.staff.create({
      data: {
        ...staffDataFromRequest,
        teamId: team.id,
        type: 'DOCTOR',
      }
    } as any);
    
    res.status(201).json(newStaffMember);
  } catch (error) {
    console.error("Error hiring medical staff:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid medical staff data", errors: error.errors });
    }
    next(error);
  }
});

/**
 * GET /api/injuries/conditioning/:teamId
 * Get player conditioning data
 */
router.get('/conditioning/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    // Verify ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }
    
    const playersOnTeam = await storage.players.getPlayersByTeamId(parseInt(teamId));
    const conditioningData = playersOnTeam.map((p: any) => ({
      playerId: p.id,
      playerName: `${p.firstName} ${p.lastName}`,
      fitnessLevel: p.stamina,
    }));
    
    res.json(conditioningData);
  } catch (error) {
    console.error("Error fetching conditioning data:", error);
    next(error);
  }
});

/**
 * PATCH /api/injuries/conditioning/:playerId
 * Update player conditioning
 */
router.patch('/conditioning/:playerId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const updates = conditioningUpdateSchema.parse(req.body);
    const userId = req.user.claims.sub;

    // Verify player ownership
    const prisma = await getPrismaClient();
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId) },
      include: { team: true }
    });
    
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const hasAccess = await verifyTeamOwnership(player.teamId, userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Cannot update conditioning for this player." });
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: parseInt(playerId) },
      data: { staminaAttribute: updates.fitnessLevel }
    });

    res.json(updatedPlayer);
  } catch (error) {
    console.error("Error updating player conditioning:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid conditioning data", errors: error.errors });
    }
    next(error);
  }
});

// ============================================================================
// INJURY-STAMINA ROUTES (from injuryStaminaRoutes.ts)
// ============================================================================

/**
 * GET /api/injuries/stamina/team/:teamId/status
 * Get injury and stamina status for team's players
 */
router.get('/stamina/team/:teamId/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;

    // Verify team ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all players with injury/stamina data
    const prisma = await getPrismaClient();
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: parseInt(teamId) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        dailyStaminaLevel: true,
        injuryStatus: true,
        injuryRecoveryPointsNeeded: true,
        injuryRecoveryPointsCurrent: true,
        dailyItemsUsed: true,
        staminaAttribute: true
      }
    });

    // Calculate recovery estimates and status summaries
    const playersWithStatus = teamPlayers.map((player: any) => {
      const isInjured = player.injuryStatus !== 'HEALTHY';
      const recoveryProgress = isInjured 
        ? Math.round(((player.injuryRecoveryPointsCurrent || 0) / (player.injuryRecoveryPointsNeeded || 1)) * 100) 
        : 0;
        
      const dailyStamina = player.dailyStaminaLevel || 100;
      const staminaStatus = dailyStamina >= 75 ? 'Fresh' 
                         : dailyStamina >= 50 ? 'Tired' 
                         : dailyStamina >= 25 ? 'Fatigued' : 'Exhausted';
      
      const canPlay = injuryStaminaService.canPlayInCompetitive(player.injuryStatus || 'Healthy');
      const injuryEffects = injuryStaminaService.getInjuryEffects(player.injuryStatus || 'Healthy');

      return {
        ...player,
        isInjured,
        recoveryProgress,
        staminaStatus,
        canPlay,
        injuryEffects,
        canUseItems: (player.dailyItemsUsed || 0) < 2
      };
    });

    res.json({
      players: playersWithStatus,
      teamSummary: {
        totalPlayers: teamPlayers.length,
        injuredPlayers: playersWithStatus.filter((p: any) => p.isInjured).length,
        exhaustedPlayers: playersWithStatus.filter((p: any) => (p.dailyStaminaLevel || 100) < 25).length,
        playersCannotPlay: playersWithStatus.filter((p: any) => !p.canPlay).length
      }
    });
  } catch (error) {
    console.error("Error getting injury/stamina status:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/stamina/player/:playerId/use-item
 * Use a recovery item on a player
 */
router.post('/stamina/player/:playerId/use-item', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { itemType, effectValue, itemName } = req.body;
    const userId = req.user.claims.sub;

    const prisma = await getPrismaClient();
    // Verify player ownership through team
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId) },
      select: { id: true, teamId: true }
    });

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const hasAccess = await verifyTeamOwnership(player.teamId, userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to player" });
    }

    // Find the inventory item by name and team
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        teamId: player.teamId,
        item: {
          name: itemName || 'basic_stamina_drink'
        }
      },
      include: {
        item: true
      }
    });

    if (!inventoryItem || inventoryItem.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Item not found in inventory or out of stock" });
    }

    // Use the item
    const result = await injuryStaminaService.useRecoveryItem(playerId.toString(), itemType, effectValue);
    
    if (result.success) {
      // Consume the inventory item
      if (inventoryItem.quantity <= 1) {
        await prisma.inventoryItem.delete({
          where: { id: inventoryItem.id }
        });
      } else {
        await prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: inventoryItem.quantity - 1 }
        });
      }
      
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Error using recovery item:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/stamina/simulate-tackle-injury
 * Simulate tackle injury (for testing purposes)
 */
router.post('/stamina/simulate-tackle-injury', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId, tacklePower, carrierAgility, carrierStamina, gameMode } = req.body;
    const userId = req.user.claims.sub;

    const prisma = await getPrismaClient();
    // Verify player ownership
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId) },
      select: { id: true, teamId: true }
    });

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const hasAccess = await verifyTeamOwnership(player.teamId, userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to player" });
    }

    // For testing purposes, force injury with high tackle power
    const forceInjury = tacklePower >= 40;
    
    // Calculate injury
    const injuryResult = await injuryStaminaService.calculateTackleInjury(
      tacklePower, carrierAgility, carrierStamina, gameMode, forceInjury
    );

    // Apply injury if it occurred
    if (injuryResult.hasInjury && injuryResult.injuryType && injuryResult.recoveryPoints) {
      await injuryStaminaService.applyInjury(playerId.toString(), injuryResult.injuryType, injuryResult.recoveryPoints);
    }

    res.json({
      ...injuryResult,
      playerId: playerId,
      playerAffected: injuryResult.hasInjury
    });
  } catch (error) {
    console.error("Error simulating tackle injury:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/stamina/team/:teamId/prepare-match
 * Prepare team for match (set starting stamina based on game mode)
 */
router.post('/stamina/team/:teamId/prepare-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { gameMode } = req.body;
    const userId = req.user.claims.sub;

    // Verify team ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all team players
    const prisma = await getPrismaClient();
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: parseInt(teamId) },
      select: { id: true }
    });

    // Set match start stamina for each player
    for (const player of teamPlayers) {
      await injuryStaminaService.setMatchStartStamina(player.id.toString(), gameMode);
    }

    res.json({ 
      success: true, 
      message: `Team prepared for ${gameMode} match`,
      playersAffected: teamPlayers.length
    });
  } catch (error) {
    console.error("Error preparing team for match:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/stamina/team/:teamId/complete-match
 * Complete match (apply stamina depletion)
 */
router.post('/stamina/team/:teamId/complete-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { gameMode } = req.body;
    const userId = req.user.claims.sub;

    // Verify team ownership
    const hasAccess = await verifyTeamOwnership(parseInt(teamId), userId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all team players
    const prisma = await getPrismaClient();
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: parseInt(teamId) },
      select: { id: true }
    });

    // Apply stamina depletion for each player (assuming full 40-minute match)
    for (const player of teamPlayers) {
      await injuryStaminaService.depleteStaminaAfterMatch(player.id.toString(), gameMode, 40);
    }

    res.json({ 
      success: true, 
      message: `Match completed, stamina effects applied for ${gameMode}`,
      playersAffected: teamPlayers.length
    });
  } catch (error) {
    console.error("Error completing match:", error);
    next(error);
  }
});

/**
 * POST /api/injuries/stamina/admin/daily-reset
 * Manual daily reset (admin only)
 */
router.post('/stamina/admin/daily-reset', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Simple admin check (you may want to enhance this)
    if (userId !== '44010914') {
      return res.status(403).json({ message: "Admin access required" });
    }

    await injuryStaminaService.performDailyReset();
    
    res.json({ success: true, message: "Daily reset completed for all players" });
  } catch (error) {
    console.error("Error performing daily reset:", error);
    next(error);
  }
});

/**
 * GET /api/injuries/stamina/system/stats
 * Get injury/stamina system settings and statistics
 */
router.get('/stamina/system/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    // Get overall system statistics
    const totalPlayers = await prisma.player.findMany();
    
    const injuredPlayers = totalPlayers.filter((p: any) => p.injuryStatus !== 'HEALTHY').length;
    const healthyPlayers = totalPlayers.length - injuredPlayers;
    
    // Calculate average stamina percentage
    const averageStamina = totalPlayers.length > 0 
      ? totalPlayers.reduce((sum: number, p: any) => sum + (p.dailyStaminaLevel ?? 100), 0) / totalPlayers.length  
      : 100;
        
    const stats = {
      totalPlayers: totalPlayers.length,
      injuredPlayers,
      healthyPlayers,
      averageStamina,
      lowStaminaPlayers: totalPlayers.filter((p: any) => (p.dailyStaminaLevel ?? 100) < 50).length,
      playersUsedItemsToday: totalPlayers.filter((p: any) => (p.dailyItemsUsed ?? 0) > 0).length,
      
      injuryBreakdown: {
        minor: totalPlayers.filter((p: any) => p.injuryStatus === 'MINOR_INJURY').length,
        moderate: totalPlayers.filter((p: any) => p.injuryStatus === 'MODERATE_INJURY').length,
        severe: totalPlayers.filter((p: any) => p.injuryStatus === 'SEVERE_INJURY').length
      },
      
      staminaBreakdown: {
        fresh: totalPlayers.filter((p: any) => (p.dailyStaminaLevel ?? 100) >= 75).length,
        tired: totalPlayers.filter((p: any) => (p.dailyStaminaLevel ?? 100) >= 50 && (p.dailyStaminaLevel ?? 100) < 75).length,
        fatigued: totalPlayers.filter((p: any) => (p.dailyStaminaLevel ?? 100) >= 25 && (p.dailyStaminaLevel ?? 100) < 50).length,
        exhausted: totalPlayers.filter((p: any) => (p.dailyStaminaLevel ?? 100) < 25).length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting system stats:", error);
    next(error);
  }
});

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

// Aliases for /api/injury-stamina routes
router.get('/team/:teamId/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = `/stamina/team/${req.params.teamId}/status`;
  return router.handle(req, res, next);
});

router.post('/player/:playerId/use-item', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = `/stamina/player/${req.params.playerId}/use-item`;
  return router.handle(req, res, next);
});

router.post('/simulate-tackle-injury', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = '/stamina/simulate-tackle-injury';
  return router.handle(req, res, next);
});

router.post('/team/:teamId/prepare-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = `/stamina/team/${req.params.teamId}/prepare-match`;
  return router.handle(req, res, next);
});

router.post('/team/:teamId/complete-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = `/stamina/team/${req.params.teamId}/complete-match`;
  return router.handle(req, res, next);
});

router.post('/admin/daily-reset', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = '/stamina/admin/daily-reset';
  return router.handle(req, res, next);
});

router.get('/system/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  req.url = '/stamina/system/stats';
  return router.handle(req, res, next);
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;