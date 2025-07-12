import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../replitAuth';
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

  // Determine equipment slot based on item name
  let equipmentSlot = '';
  if (itemName.toLowerCase().includes('helmet') || itemName.toLowerCase().includes('helm')) {
    equipmentSlot = 'helmet';
  } else if (itemName.toLowerCase().includes('chest') || itemName.toLowerCase().includes('armor')) {
    equipmentSlot = 'chest';
  } else if (itemName.toLowerCase().includes('boot') || itemName.toLowerCase().includes('cleat')) {
    equipmentSlot = 'shoes';
  } else if (itemName.toLowerCase().includes('glove') || itemName.toLowerCase().includes('grip')) {
    equipmentSlot = 'gloves';
  } else {
    equipmentSlot = 'helmet'; // Default to helmet
  }

  // Update player equipment
  const updateData: any = {};
  if (equipmentSlot === 'helmet') {
    updateData.helmetItemId = itemId;
  } else if (equipmentSlot === 'chest') {
    updateData.chestItemId = itemId;
  } else if (equipmentSlot === 'shoes') {
    updateData.shoesItemId = itemId;
  } else if (equipmentSlot === 'gloves') {
    updateData.glovesItemId = itemId;
  }

  await prisma.player.update({
    where: { id: parseInt(playerId) },
    data: updateData
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
    message: `${itemName} equipped to ${player.firstName} ${player.lastName}`,
    slot: equipmentSlot
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
  const equippedItems = await prisma.inventoryItem.findMany({
    where: {
      id: {
        in: [
          player.helmetItemId,
          player.chestItemId,
          player.shoesItemId,
          player.glovesItemId
        ].filter(Boolean)
      }
    }
  });

  const equipment = {
    helmet: equippedItems.find(item => item.id === player.helmetItemId),
    chest: equippedItems.find(item => item.id === player.chestItemId),
    shoes: equippedItems.find(item => item.id === player.shoesItemId),
    gloves: equippedItems.find(item => item.id === player.glovesItemId)
  };

  res.json({
    success: true,
    equipment
  });
}));

export default router;