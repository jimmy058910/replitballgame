import { Router, Request, Response } from "express";
import { consumableStorage } from '../storage/consumableStorage.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { asyncHandler } from '../services/errorService.js';
import { getPrismaClient } from "../database.js";
import { validateRequest, validationSchemas } from '../middleware/validation.js';

const router = Router();

// Get team's consumable inventory
router.get("/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { teamId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const consumables = await consumableStorage.getTeamAvailableConsumables(parseInt(teamId));
  res.json(consumables);
}));

// Get consumables activated for a specific match
router.get("/match/:matchId/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
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

// Activate a consumable for a match
router.post("/activate", requireAuth, validateRequest(validationSchemas.consumableActivation), asyncHandler(async (req: any, res: Response): Promise<void> => {
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

  // Only allow consumables in league matches - NOTE: Using proper enum comparison
  if (match.matchType !== "LEAGUE" as any) { 
    res.status(400).json({ error: "Consumables can only be used in league matches" });
    return;
  }

  // Check if match has already started - NOTE: Using proper enum comparison  
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

// Deactivate a consumable (remove from match)
router.delete("/:consumableId/team/:teamId", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
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

// Get all consumables for a match (for match simulation)
router.get("/match/:matchId/all", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const consumables = await consumableStorage.getAllMatchConsumables(parseInt(matchId));
  res.json(consumables);
}));

// Mark consumables as used after match completion (internal endpoint)
router.post("/match/:matchId/mark-used", requireAuth, asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { matchId } = req.params;
  const userId = req.user?.claims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await consumableStorage.markConsumablesAsUsed(parseInt(matchId));
  res.json({ message: "Consumables marked as used" });
}));

export default router;