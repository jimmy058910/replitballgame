/**
 * Enhanced Inventory Management System
 * Consolidation of equipment, inventory, and consumable routes
 * 
 * Phase 3F: Equipment/Inventory System Consolidation
 * Combines:
 * - equipmentRoutes.ts (2 endpoints)
 * - inventoryRoutes.ts (3 endpoints)
 * - consumableRoutes.ts (6 endpoints)
 * Total: 11 endpoints with unified authentication and error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { ErrorCreators, asyncHandler } from '../services/errorService.js';
import { consumableStorage } from '../storage/consumableStorage.js';
import type { Player, Team } from '@shared/types/models';


const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to get user's team
 */
async function getUserTeam(userId: string) {
  const prisma = await getPrismaClient();
  
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }
  
  const team = await prisma.team.findFirst({
    where: { userProfileId: userProfile.id },
    include: { user: true }
  });
  
  if (!team) {
    throw ErrorCreators.notFound("Team not found for current user");
  }
  
  return { team, userProfile };
}

/**
 * Helper to verify team ownership
 */
async function verifyTeamOwnership(teamId: number, userId: string) {
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
 * Helper to handle "my" team ID
 */
async function resolveTeamId(teamId: string | number, userId: string): Promise<number> {
  if (teamId === "my") {
    const { team } = await getUserTeam(userId);
    return team.id;
  }
  return typeof teamId === 'string' ? parseInt(teamId) : teamId;
}

// ============================================================================
// INVENTORY ROUTES (from inventoryRoutes.ts)
// ============================================================================

/**
 * GET /api/inventory
 * Get user's team inventory (root route)
 */
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const { team } = await getUserTeam(userId);

    // Get team inventory
    const prisma = await getPrismaClient();
    const inventory = await prisma.inventoryItem.findMany({
      where: { teamId: team.id },
      include: {
        item: true
      }
    });

    // Transform inventory data to match expected format
    const formattedInventory = inventory.map((invItem: any) => ({
      id: invItem.id,
      itemType: invItem.item.type,
      type: invItem.item.type.toLowerCase(),
      name: invItem.item.name,
      description: invItem.item.description,
      rarity: invItem.item.rarity.toLowerCase(),
      quantity: invItem.quantity,
      slot: invItem.item.slot?.toLowerCase(),
      raceRestriction: invItem.item.raceRestriction,
      statBoosts: invItem.item.statEffects,
      effect: invItem.item.effectValue,
      metadata: invItem.item.effectValue || {}
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error("Error fetching team inventory:", error);
    res.status(500).json({ error: "Failed to fetch team inventory" });
  }
});

/**
 * GET /api/inventory/:teamId
 * Get specific team inventory
 */
router.get('/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const teamId = await resolveTeamId(req.params.teamId, userId);
    
    // Verify ownership if not "my" team
    if (req.params.teamId !== "my") {
      const hasAccess = await verifyTeamOwnership(teamId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Get team inventory
    const prisma = await getPrismaClient();
    const inventory = await prisma.inventoryItem.findMany({
      where: { teamId },
      include: {
        item: true
      }
    });

    // Transform inventory data to match expected format
    const formattedInventory = inventory.map((invItem: any) => ({
      id: invItem.id,
      itemType: invItem.item.type,
      type: invItem.item.type.toLowerCase(),
      name: invItem.item.name,
      description: invItem.item.description,
      rarity: invItem.item.rarity.toLowerCase(),
      quantity: invItem.quantity,
      slot: invItem.item.slot?.toLowerCase(),
      raceRestriction: invItem.item.raceRestriction,
      statBoosts: invItem.item.statEffects,
      effect: invItem.item.effectValue,
      metadata: invItem.item.effectValue || {}
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error("Error fetching team inventory:", error);
    res.status(500).json({ error: "Failed to fetch team inventory" });
  }
});

/**
 * POST /api/inventory/:teamId/use-item
 * Use inventory item
 */
router.post('/:teamId/use-item', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const teamId = await resolveTeamId(req.params.teamId, userId);
    const { itemId, playerId, itemType } = req.body;
    
    // Verify ownership
    if (req.params.teamId !== "my") {
      const hasAccess = await verifyTeamOwnership(teamId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Find the inventory item
    const prisma = await getPrismaClient();
    const item = await prisma.inventoryItem.findFirst({
      where: {
        teamId,
        id: itemId
      }
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found in inventory" });
    }

    if (item.quantity <= 0) {
      return res.status(400).json({ error: "Item is out of stock" });
    }

    // Verify player belongs to team if playerId is provided
    if (playerId) {
      const player = await prisma.player.findFirst({
        where: {
          id: parseInt(playerId),
          teamId
        }
      });

      if (!player) {
        return res.status(404).json({ error: "Player not found on your team" });
      }
    }

    // Reduce item quantity
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - 1 }
    });

    // Remove item if quantity reaches 0
    if (item.quantity - 1 <= 0) {
      await prisma.inventoryItem.delete({
        where: { id: itemId }
      });
    }

    res.json({ 
      success: true, 
      message: "Item used successfully", 
      remainingQuantity: item.quantity - 1 
    });
  } catch (error) {
    console.error("Error using inventory item:", error);
    res.status(500).json({ error: "Failed to use inventory item" });
  }
});

// ============================================================================
// EQUIPMENT ROUTES (from equipmentRoutes.ts)
// ============================================================================

/**
 * POST /api/inventory/equipment/equip
 * Equip an item to a player
 */
router.post('/equipment/equip', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId, playerId, itemId, itemName } = req.body;

  const { team, userProfile } = await getUserTeam(userId);
  
  // Verify team ownership
  if (team.id !== parseInt(teamId)) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Verify player belongs to team
  const prisma = await getPrismaClient();
  const player = await prisma.player.findFirst({
    where: {
      id: parseInt(playerId),
      teamId: team.id
    }
  });

  if (!player) {
    throw ErrorCreators.forbidden("Player does not belong to your team");
  }

  // Check if item exists in inventory
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      teamId: team.id,
      quantity: { gt: 0 }
    },
    include: {
      item: true
    }
  });

  if (!inventoryItem) {
    throw ErrorCreators.notFound("Item not found in inventory");
  }

  // Check race requirements for equipment
  const raceRequirements: { [key: string]: string[] } = {
    "Human Tactical Helm": ["HUMAN"],
    "Gryllstone Plated Helm": ["GRYLL"],
    "Sylvan Barkwood Circlet": ["SYLVAN"],
    "Umbral Cowl": ["UMBRA"],
    "Lumina Radiant Aegis": ["LUMINA"]
  };

  if (raceRequirements[itemName] && !raceRequirements[itemName].includes(player.race)) {
    throw ErrorCreators.forbidden(`${itemName} can only be equipped by ${raceRequirements[itemName].join(", ")} race players`);
  }

  // Check if player already has equipment of the same type
  const existingEquipment = await prisma.playerEquipment.findFirst({
    where: {
      playerId: player.id,
      item: {
        name: itemName
      }
    }
  });

  if (existingEquipment) {
    throw ErrorCreators.conflict("Player already has this equipment equipped - equipment is permanent and cannot be removed");
  }

  // Create Item entry if it doesn't exist
  let item = await prisma.item.findFirst({
    where: { name: itemName }
  });

  if (!item) {
    // Map item name to race restriction
    const raceRestrictionMap = {
      "Human Tactical Helm": "HUMAN",
      "Gryllstone Plated Helm": "GRYLL", 
      "Sylvan Barkwood Circlet": "SYLVAN",
      "Umbral Cowl": "UMBRA",
      "Lumina Radiant Aegis": "LUMINA"
    };

    item = await prisma.item.create({
      data: {
        name: itemName,
        description: inventoryItem.item.description,
        type: inventoryItem.item.type,
        slot: itemName.toLowerCase().includes('helmet') || itemName.toLowerCase().includes('helm') ? 'HELMET' : 'ARMOR',
        raceRestriction: (raceRestrictionMap[itemName as keyof typeof raceRestrictionMap] as any) || null,
        rarity: (inventoryItem.item.rarity?.toUpperCase() as any) || 'COMMON',
        statEffects: inventoryItem.item.statEffects || {}
      }
    });
  }

  // Create PlayerEquipment entry
  await prisma.playerEquipment.create({
    data: {
      playerId: player.id,
      itemId: item.id
    }
  });

  // Decrease item quantity in inventory
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantity: {
        decrement: 1
      }
    }
  });

  res.json({
    success: true,
    message: `${itemName} permanently equipped to ${player.firstName} ${player.lastName} - cannot be removed`,
    item: item
  });
}));

/**
 * GET /api/inventory/equipment/player/:playerId
 * Get player's current equipment
 */
router.get('/equipment/player/:playerId', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { playerId } = req.params;

  const { userProfile } = await getUserTeam(userId);

  // Get player with team info
  const prisma = await getPrismaClient();
  const player = await prisma.player.findFirst({
    where: { id: parseInt(playerId) },
    include: {
      team: true
    }
  });

  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }

  // Verify team ownership
  if (player.team.userProfileId !== userProfile.id) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Get equipped items
  const equippedItems = await prisma.playerEquipment.findMany({
    where: {
      playerId: player.id
    },
    include: {
      item: true
    }
  });

  res.json({
    success: true,
    equipment: equippedItems
  });
}));

// ============================================================================
// CONSUMABLE ROUTES (from consumableRoutes.ts)
// ============================================================================

/**
 * GET /api/inventory/consumables/team/:teamId
 * Get team's consumable inventory
 */
router.get("/consumables/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const consumables = await consumableStorage.getTeamAvailableConsumables(parseInt(teamId));
  res.json(consumables);
}));

/**
 * GET /api/inventory/consumables/match/:matchId/team/:teamId
 * Get consumables activated for a specific match
 */
router.get("/consumables/match/:matchId/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId, teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const consumables = await consumableStorage.getMatchConsumables(parseInt(matchId), parseInt(teamId));
  const count = await consumableStorage.getMatchConsumablesCount(parseInt(matchId), parseInt(teamId));
  
  res.json({ 
    consumables, 
    count,
    remainingSlots: 3 - count
  });
}));

/**
 * POST /api/inventory/consumables/activate
 * Activate a consumable for a match
 */
router.post("/consumables/activate", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId, teamId, consumableId, consumableName, effectType, effectData } = req.body;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Validate that this is a league match
  const prisma = await getPrismaClient();
  const match = await prisma.game.findFirst({
    where: { id: matchId }
  });

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  // Only allow consumables in league matches
  if (match.matchType !== "LEAGUE" as any) { 
    res.status(400).json({ error: "Consumables can only be used in league matches" });
    return;
  }

  // Check if match has already started
  if (match.status !== "SCHEDULED" as any) {
    res.status(400).json({ error: "Cannot activate consumables after match has started" });
    return;
  }

  const result = await consumableStorage.activateConsumable(
    matchId,
    teamId,
    consumableId,
    consumableName,
    effectType,
    effectData
  );

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json({ error: result.message });
  }
}));

/**
 * DELETE /api/inventory/consumables/:consumableId/team/:teamId
 * Deactivate a consumable (remove from match)
 */
router.delete("/consumables/:consumableId/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { consumableId, teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const success = await consumableStorage.deactivateConsumable(consumableId, teamId);
  
  if (success) {
    res.json({ message: "Consumable deactivated successfully" });
  } else {
    res.status(400).json({ error: "Failed to deactivate consumable" });
  }
}));

/**
 * GET /api/inventory/consumables/match/:matchId/all
 * Get all consumables for a match (for match simulation)
 */
router.get("/consumables/match/:matchId/all", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const consumables = await consumableStorage.getAllMatchConsumables(parseInt(matchId));
  res.json(consumables);
}));

/**
 * POST /api/inventory/consumables/match/:matchId/mark-used
 * Mark consumables as used after match completion (internal endpoint)
 */
router.post("/consumables/match/:matchId/mark-used", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await consumableStorage.markConsumablesAsUsed(parseInt(matchId));
  res.json({ message: "Consumables marked as used" });
}));

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

// Equipment aliases (for /api/equipment routes)
router.post('/equip', requireAuth, asyncHandler(async (req: any, res: Response) => {
  return router.handle(req, res, () => {});
}));

router.get('/player/:playerId', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/equipment/player/${req.params.playerId}`;
  return router.handle(req, res, () => {});
}));

// Consumables aliases (for /api/consumables routes)
router.get('/team/:teamId', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/consumables/team/${req.params.teamId}`;
  return router.handle(req, res, () => {});
}));

router.get('/match/:matchId/team/:teamId', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/consumables/match/${req.params.matchId}/team/${req.params.teamId}`;
  return router.handle(req, res, () => {});
}));

router.post('/activate', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = '/consumables/activate';
  return router.handle(req, res, () => {});
}));

router.delete('/:consumableId/team/:teamId', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/consumables/${req.params.consumableId}/team/${req.params.teamId}`;
  return router.handle(req, res, () => {});
}));

router.get('/match/:matchId/all', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/consumables/match/${req.params.matchId}/all`;
  return router.handle(req, res, () => {});
}));

router.post('/match/:matchId/mark-used', requireAuth, asyncHandler(async (req: any, res: Response) => {
  req.url = `/consumables/match/${req.params.matchId}/mark-used`;
  return router.handle(req, res, () => {});
}));

// ============================================================================
// EXPORTS
// ============================================================================

export default router;