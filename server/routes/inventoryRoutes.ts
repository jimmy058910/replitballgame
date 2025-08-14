import { Router, Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";

const router = Router();

// Get user's team inventory (root route)
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    
    // Get user's team
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({ error: "Team not found for current user" });
    }

    // Get team inventory
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
      type: invItem.item.type.toLowerCase(), // Add type field for frontend compatibility
      name: invItem.item.name,
      description: invItem.item.description,
      rarity: invItem.item.rarity.toLowerCase(),
      quantity: invItem.quantity,
      slot: invItem.item.slot?.toLowerCase(), // Add slot field for equipment
      raceRestriction: invItem.item.raceRestriction, // Add race restriction
      statBoosts: invItem.item.statEffects, // Add stat effects for equipment
      effect: invItem.item.effectValue, // Add effect for consumables
      metadata: invItem.item.effectValue || {}
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error("Error fetching team inventory:", error);
    res.status(500).json({ error: "Failed to fetch team inventory" });
  }
});

// Get team inventory
router.get('/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    // Handle "my" team ID
    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const userProfile = await prisma.userProfile.findFirst({
        where: { userId: userId }
      });
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }
      const team = await prisma.team.findFirst({
        where: { userProfileId: userProfile.id }
      });
      if (!team) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      // Verify user owns this team
      const team = await prisma.team.findFirst({
        where: { id: parseInt(teamId) },
        include: { user: true }
      });
      if (!team || team.user.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Get team inventory
    const inventory = await prisma.inventoryItem.findMany({
      where: { teamId: parseInt(teamId) },
      include: {
        item: true
      }
    });

    // Transform inventory data to match expected format
    const formattedInventory = inventory.map((invItem: any) => ({
      id: invItem.id,
      itemType: invItem.item.type,
      type: invItem.item.type.toLowerCase(), // Add type field for frontend compatibility
      name: invItem.item.name,
      description: invItem.item.description,
      rarity: invItem.item.rarity.toLowerCase(),
      quantity: invItem.quantity,
      slot: invItem.item.slot?.toLowerCase(), // Add slot field for equipment
      raceRestriction: invItem.item.raceRestriction, // Add race restriction
      statBoosts: invItem.item.statEffects, // Add stat effects for equipment
      effect: invItem.item.effectValue, // Add effect for consumables
      metadata: invItem.item.effectValue || {}
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error("Error fetching team inventory:", error);
    res.status(500).json({ error: "Failed to fetch team inventory" });
  }
});

// Use inventory item
router.post('/:teamId/use-item', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;
    const { itemId, playerId, itemType } = req.body;

    // Handle "my" team ID
    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const userProfile = await prisma.userProfile.findFirst({
        where: { userId: userId }
      });
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }
      const team = await prisma.team.findFirst({
        where: { userProfileId: userProfile.id }
      });
      if (!team) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      // Verify user owns this team
      const team = await prisma.team.findFirst({
        where: { id: parseInt(teamId) },
        include: { user: true }
      });
      if (!team || team.user.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Find the inventory item
    const item = await prisma.inventoryItem.findFirst({
      where: {
        teamId: parseInt(teamId),
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
          teamId: parseInt(teamId)
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

export default router;