import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../googleAuth';
import { prisma } from '../db';
import { ErrorCreators, asyncHandler } from '../services/errorService';

const router = Router();

/**
 * POST /api/equipment/equip
 * Equip an item to a player
 */
router.post('/equip', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId, playerId, itemId, itemName } = req.body;

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Verify team ownership
  const team = await prisma.team.findFirst({
    where: { 
      id: parseInt(teamId),
      userProfileId: userProfile.id 
    }
  });

  if (!team) {
    throw ErrorCreators.forbidden("You do not own this team");
  }

  // Verify player belongs to team
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
    }
  });

  if (!inventoryItem) {
    throw ErrorCreators.notFound("Item not found in inventory");
  }

  // Check race requirements for equipment
  const raceRequirements = {
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
        description: inventoryItem.description,
        type: inventoryItem.itemType,
        slot: itemName.toLowerCase().includes('helmet') || itemName.toLowerCase().includes('helm') ? 'HELMET' : 'ARMOR',
        raceRestriction: raceRestrictionMap[itemName] || null,
        rarity: inventoryItem.rarity?.toUpperCase() || 'COMMON',
        statEffects: inventoryItem.metadata || {}
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
 * GET /api/equipment/player/:playerId
 * Get player's current equipment
 */
router.get('/player/:playerId', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { playerId } = req.params;

  // Get userProfile to check team ownership
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId: userId }
  });
  
  if (!userProfile) {
    throw ErrorCreators.forbidden("User profile not found");
  }

  // Get player with team info
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

export default router;