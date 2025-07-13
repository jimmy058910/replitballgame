import { Router, type Request, type Response, type NextFunction } from "express";
// playerStorage imported via storage index // Updated import
import { storage } from "../storage/index"; // Updated import
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { ContractService } from "../services/contractService";

const router = Router();

const contractNegotiationSchema = z.object({
    seasons: z.number().min(1, "Contract must be for at least 1 season.").max(5, "Contract cannot exceed 5 seasons."),
    salary: z.number().min(1000, "Salary must be at least 1000.").max(50000000, "Salary cannot exceed 50,000,000."),
});

/**
 * GET /api/players
 * Get all players for the authenticated user's team
 */
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const players = await storage.players.getPlayersByTeamId(userTeam.id);
    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId
 * Get player details including active contract
 */
router.get('/:playerId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const player = await storage.players.getPlayerById(parseInt(playerId));
    
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    console.error("Error fetching player:", error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId/contract-value
 * Get contract value calculation for a player using Universal Value Formula
 */
router.get('/:playerId/contract-value', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team or does not exist." });
    }

    const contractCalc = ContractService.calculateContractValue(player);
    const recommendations = ContractService.getContractRecommendations(contractCalc);

    res.json({
      success: true,
      data: {
        ...contractCalc,
        recommendations
      }
    });
  } catch (error) {
    console.error("Error calculating contract value:", error);
    next(error);
  }
});

/**
 * POST /api/players/:playerId/negotiate
 * Negotiate a contract with a player using the Universal Value Formula system
 */
router.post('/:playerId/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { seasons, salary } = contractNegotiationSchema.parse(req.body);

    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team or does not exist." });
    }

    // Use the new UVF-based contract negotiation system
    const negotiationResult = await ContractService.negotiatePlayerContract(parseInt(playerId), salary, seasons);

    if (negotiationResult.accepted) {
      // Update the player's contract
      const updatedPlayer = await ContractService.updatePlayerContract(parseInt(playerId), salary, seasons);
      
      if (!updatedPlayer) {
        return res.status(500).json({ message: "Failed to update player contract details." });
      }

      res.json({
        success: true,
        negotiationResult,
        player: updatedPlayer
      });
    } else {
      res.json({
        success: false,
        negotiationResult
      });
    }
  } catch (error) {
    console.error("Error negotiating contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid contract negotiation data.", errors: error.errors });
    }
    next(error);
  }
});

// Abilities system routes
router.post('/:id/train-abilities', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found for current user." });
    }

    const playerId = req.params.id;
    const player = await storage.players.getPlayerById(parseInt(playerId)); // Use playerStorage

    if (!player || player.teamId !== team.id) {
      return res.status(404).json({ message: "Player not found or not owned by your team." });
    }

    const { rollForAbility } = await import("@shared/abilities");

    const playerForAbilityRoll = { ...player }; // Spread player data

    const newAbility = rollForAbility(playerForAbilityRoll as any);

    if (newAbility && newAbility.id) { // Ensure newAbility and its ID exist
      const currentAbilities = Array.isArray(player.abilities) ? player.abilities :
                               player.abilities && typeof player.abilities === 'string' ? JSON.parse(player.abilities) : [];

      if (currentAbilities.includes(newAbility.id)) {
        return res.json({
          success: false,
          message: `${player.name} already possesses the ability: ${newAbility.name}. No change.`
        });
      }

      const updatedAbilities = [...currentAbilities, newAbility.id];

      await storage.players.updatePlayer(parseInt(playerId), { abilities: updatedAbilities as any, updatedAt: new Date() }); // Use playerStorage

      res.json({
        success: true,
        newAbilityName: newAbility.name,
        newAbilityId: newAbility.id,
        message: `${player.name} has successfully learned the ability: ${newAbility.name}!`
      });
    } else {
      res.json({
        success: false,
        message: "Training session completed. No new ability was gained this time."
      });
    }
  } catch (error) {
    console.error("Error training player abilities:", error);
    if (error instanceof Error && error.message.includes("Could not resolve")) {
        console.error("Failed to import @shared/abilities. Ensure the file exists and paths are correct.");
        return res.status(500).json({ message: "Internal server error: Abilities module not found." });
    }
    next(error);
  }
});

export default router;
