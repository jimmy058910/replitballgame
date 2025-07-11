import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Get team inventory
router.get('/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    // Handle "my" team ID
    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await prisma.team.findFirst({
        where: { userId: userId }
      });
      if (!team) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      // Verify user owns this team
      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });
      if (!team || team.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Get team inventory
    const inventory = await prisma.teamInventory.findMany({
      where: { teamId: teamId }
    });

    // Transform inventory data to match expected format
    const formattedInventory = inventory.map(item => ({
      id: item.id,
      itemType: item.itemType,
      name: item.name,
      description: `${item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Team inventory item`,
      rarity: item.rarity || "common",
      quantity: item.quantity,
      metadata: item.metadata || {}
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error("Error fetching team inventory:", error);
    res.status(500).json({ error: "Failed to fetch team inventory" });
  }
});

// Use inventory item
router.post('/:teamId/use-item', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;
    const { itemId, playerId, itemType } = req.body;

    // Handle "my" team ID
    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await prisma.team.findFirst({
        where: { userId: userId }
      });
      if (!team) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team.id;
    } else {
      // Verify user owns this team
      const team = await prisma.team.findFirst({
        where: { id: teamId }
      });
      if (!team || team.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Find the inventory item
    const item = await prisma.teamInventory.findFirst({
      where: {
        teamId: teamId,
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
          id: playerId,
          teamId: teamId
        }
      });

      if (!player) {
        return res.status(404).json({ error: "Player not found on your team" });
      }
    }

    // Reduce item quantity
    await prisma.teamInventory.update({
      where: { id: itemId },
      data: { quantity: item.quantity - 1 }
    });

    // Remove item if quantity reaches 0
    if (item.quantity - 1 <= 0) {
      await prisma.teamInventory.delete({
        where: { id: itemId }
      });
    }

    res.json({ 
      success: true, 
      message: "Item used successfully",
      remainingQuantity: Math.max(0, item.quantity - 1)
    });

  } catch (error) {
    console.error("Error using inventory item:", error);
    res.status(500).json({ error: "Failed to use inventory item" });
  }
});

export default router;