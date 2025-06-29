import { Router, type Request, type Response, type NextFunction } from "express";
import { playerStorage } from "../storage/playerStorage"; // Updated import
import { teamStorage } from "../storage/teamStorage"; // Updated import
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

const router = Router();

const contractNegotiationSchema = z.object({
    seasons: z.number().min(1, "Contract must be for at least 1 season.").max(5, "Contract cannot exceed 5 seasons."),
    salary: z.number().min(1000, "Salary must be at least 1000.").max(10000000, "Salary cannot exceed 10,000,000."), // Example limits
});


router.post('/:playerId/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { seasons, salary } = contractNegotiationSchema.parse(req.body);

    const userId = req.user.claims.sub;
    const userTeam = await teamStorage.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await playerStorage.getPlayerById(playerId);
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team or does not exist." });
    }

    // TODO: Add more complex negotiation logic:
    // - Check against team's salary cap (requires salaryCapStorage)
    // - Player happiness/willingness to sign
    // - Rival offers?

    const updatedPlayer = await playerStorage.updatePlayer(playerId, {
      contractSeasons: seasons,
      // contractStartSeason: currentSeasonNumber, // This would require fetching current season from seasonStorage
      salary: salary,
      updatedAt: new Date(),
    });

    if (!updatedPlayer) {
        return res.status(404).json({ message: "Failed to update player contract details."})
    }
    res.json(updatedPlayer);
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
    const team = await teamStorage.getTeamByUserId(userId); // Use teamStorage
    if (!team) {
      return res.status(404).json({ message: "Team not found for current user." });
    }

    const playerId = req.params.id;
    const player = await playerStorage.getPlayerById(playerId); // Use playerStorage

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

      await playerStorage.updatePlayer(playerId, { abilities: updatedAbilities as any, updatedAt: new Date() }); // Use playerStorage

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
