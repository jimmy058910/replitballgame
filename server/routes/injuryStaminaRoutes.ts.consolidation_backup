import { Router, Response, NextFunction } from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { injuryStaminaService } from '../services/injuryStaminaService.js';
import { getPrismaClient } from "../database.js";

const router = Router();

/**
 * Get injury and stamina status for team's players
 */
router.get('/team/:teamId/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;

    // Verify team ownership
    const prisma = await getPrismaClient();
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId) },
      include: { user: true }
    });
    if (!team || team.user.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all players with injury/stamina data
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
 * Use a recovery item on a player
 */
router.post('/player/:playerId/use-item', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

    const team = await prisma.team.findFirst({
      where: { id: player.teamId },
      include: { user: true }
    });
    if (!team || team.user.userId !== userId) {
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
    const result = await injuryStaminaService.useRecoveryItem(playerId, itemType, effectValue);
    
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
 * Simulate tackle injury (for testing purposes)
 */
router.post('/simulate-tackle-injury', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

    const team = await prisma.team.findFirst({
      where: { id: player.teamId },
      include: { user: true }
    });
    
    if (!team || team.user.userId !== userId) {
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
      await injuryStaminaService.applyInjury(playerId, injuryResult.injuryType, injuryResult.recoveryPoints);
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
 * Prepare team for match (set starting stamina based on game mode)
 */
router.post('/team/:teamId/prepare-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { gameMode } = req.body;
    const userId = req.user.claims.sub;

    const prisma = await getPrismaClient();
    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId) },
      include: { user: true }
    });
    if (!team || team.user.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all team players
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
 * Complete match (apply stamina depletion)
 */
router.post('/team/:teamId/complete-match', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { gameMode } = req.body;
    const userId = req.user.claims.sub;

    const prisma = await getPrismaClient();
    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId) },
      include: { user: true }
    });
    if (!team || team.user.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to team" });
    }

    // Get all team players
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
 * Manual daily reset (admin only)
 */
router.post('/admin/daily-reset', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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
 * Get injury/stamina system settings and statistics
 */
router.get('/system/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

export default router;