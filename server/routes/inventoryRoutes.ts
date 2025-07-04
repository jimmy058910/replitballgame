import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { teams, teamInventory, players } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Get team inventory
router.get('/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    let teamId = req.params.teamId;

    // Handle "my" team ID
    if (teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await db.select().from(teams).where(eq(teams.userId, userId)).limit(1);
      if (!team.length) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team[0].id;
    } else {
      // Verify user owns this team
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!team.length || team[0].userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Get team inventory
    const inventory = await db.select().from(teamInventory).where(eq(teamInventory.teamId, teamId));

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
      const team = await db.select().from(teams).where(eq(teams.userId, userId)).limit(1);
      if (!team.length) {
        return res.status(404).json({ error: "Team not found for current user" });
      }
      teamId = team[0].id;
    } else {
      // Verify user owns this team
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!team.length || team[0].userId !== req.user?.claims?.sub) {
        return res.status(403).json({ error: "Forbidden: You do not own this team." });
      }
    }

    // Find the inventory item
    const inventoryItem = await db.select().from(teamInventory).where(
      and(eq(teamInventory.teamId, teamId), eq(teamInventory.id, itemId))
    ).limit(1);

    if (!inventoryItem.length) {
      return res.status(404).json({ error: "Item not found in inventory" });
    }

    const item = inventoryItem[0];

    if (item.quantity <= 0) {
      return res.status(400).json({ error: "Item is out of stock" });
    }

    // Verify player belongs to team if playerId is provided
    if (playerId) {
      const player = await db.select().from(players).where(
        and(eq(players.id, playerId), eq(players.teamId, teamId))
      ).limit(1);

      if (!player.length) {
        return res.status(404).json({ error: "Player not found on your team" });
      }
    }

    // Reduce item quantity
    await db.update(teamInventory)
      .set({ quantity: item.quantity - 1 })
      .where(eq(teamInventory.id, itemId));

    // Remove item if quantity reaches 0
    if (item.quantity - 1 <= 0) {
      await db.delete(teamInventory).where(eq(teamInventory.id, itemId));
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