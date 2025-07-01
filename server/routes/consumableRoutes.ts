import { Router, Request, Response } from "express";
import { consumableStorage } from "../storage/consumableStorage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../services/errorService";
import { matches } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Get team's consumable inventory
router.get("/team/:teamId", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const consumables = await consumableStorage.getTeamAvailableConsumables(teamId);
  res.json(consumables);
}));

// Get consumables activated for a specific match
router.get("/match/:matchId/team/:teamId", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { matchId, teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const consumables = await consumableStorage.getMatchConsumables(matchId, teamId);
  const count = await consumableStorage.getMatchConsumablesCount(matchId, teamId);
  
  res.json({ 
    consumables, 
    count,
    remainingSlots: 3 - count
  });
}));

// Activate a consumable for a match
router.post("/activate", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { matchId, teamId, consumableId, consumableName, effectType, effectData } = req.body;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate that this is a league match
  const [match] = await db.select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  // Only allow consumables in league matches
  if (match.matchType !== "league") {
    return res.status(400).json({ error: "Consumables can only be used in league matches" });
  }

  // Check if match has already started
  if (match.status !== "scheduled") {
    return res.status(400).json({ error: "Cannot activate consumables after match has started" });
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

// Deactivate a consumable (remove from match)
router.delete("/:consumableId/team/:teamId", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { consumableId, teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const success = await consumableStorage.deactivateConsumable(consumableId, teamId);
  
  if (success) {
    res.json({ message: "Consumable deactivated successfully" });
  } else {
    res.status(400).json({ error: "Failed to deactivate consumable" });
  }
}));

// Get all consumables for a match (for match simulation)
router.get("/match/:matchId/all", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const consumables = await consumableStorage.getAllMatchConsumables(matchId);
  res.json(consumables);
}));

// Mark consumables as used after match completion (internal endpoint)
router.post("/match/:matchId/mark-used", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await consumableStorage.markConsumablesAsUsed(matchId);
  res.json({ message: "Consumables marked as used" });
}));

export default router;