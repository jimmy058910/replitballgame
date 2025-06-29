import { Router, type Request, type Response, type NextFunction } from "express";
import { teamStorage } from "../storage/teamStorage";
import { itemStorage } from "../storage/itemStorage";
// import { teamInventoryStorage } from "../storage/teamInventoryStorage"; // If you create this
import { isAuthenticated } from "../replitAuth";
// import { db } from "../db"; // Avoid direct db access here
// import { items as itemsTable, teamInventory as teamInventoryTable } from "@shared/schema";
import { eq, and } from "drizzle-orm"; // Keep if used for complex queries not in storage

const router = Router();

// Inventory routes
router.get('/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const requestedTeamId = req.params.teamId;

    let teamToViewId = requestedTeamId;

    if (requestedTeamId === 'my') {
        const userTeam = await teamStorage.getTeamByUserId(userId); // Use teamStorage
        if (!userTeam || !userTeam.id) { // Check for team.id as well
            return res.status(404).json({ message: "Your team not found." });
        }
        teamToViewId = userTeam.id;
    } else {
        const teamExists = await teamStorage.getTeamById(requestedTeamId); // Use teamStorage
        if (!teamExists) {
            return res.status(404).json({ message: "Team not found."});
        }
        // Optional: Permission check if viewing other team's inventory is restricted
        // if (teamExists.userId !== userId && !userIsAdmin(req.user)) {
        //     return res.status(403).json({ message: "Forbidden to view this team's inventory." });
        // }
    }

    // Fetches items where items.teamId matches teamToViewId
    const ownedEquipment = await itemStorage.getItemsByTeam(teamToViewId); // Use itemStorage

    // If you have a separate teamInventory table for consumables, trophies, etc.
    // const otherInventoryItems = await teamInventoryStorage.getItemsByTeam(teamToViewId);

    res.json({
        teamId: teamToViewId,
        equipment: ownedEquipment, // Items from `items` table linked by teamId
        // otherItems: otherInventoryItems,
    });

  } catch (error) {
    console.error("Error fetching team inventory:", error);
    next(error);
  }
});

// Example: Route to equip an item (would involve playerStorage and itemStorage)
// router.post('/:teamId/equip', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
//   try {
//     const userId = req.user.claims.sub;
//     const teamIdParam = req.params.teamId;
//     const { playerId, itemId, slot } = req.body; // Validate these inputs

//     const teamId = teamIdParam === 'my' ? (await teamStorage.getTeamByUserId(userId))?.id : teamIdParam;
//     if (!teamId) return res.status(404).json({ message: "Team not found." });

//     const player = await playerStorage.getPlayerById(playerId);
//     if (!player || player.teamId !== teamId) return res.status(404).json({ message: "Player not on this team."});

//     const item = await itemStorage.getItemById(itemId);
//     if (!item || item.teamId !== teamId) return res.status(404).json({ message: "Item not in team inventory."});
//     if (item.slot !== slot) return res.status(400).json({ message: `Item does not fit in ${slot} slot.`});

//     // Logic to unequip previous item in slot, then equip new item
//     // await playerStorage.updatePlayer(playerId, { [`${slot}ItemId`]: itemId });
//     // await itemStorage.updateItem(itemId, { isEquipped: true, equippedByPlayerId: playerId }); // Example fields

//     res.json({ success: true, message: `${item.name} equipped to ${player.name} in ${slot} slot.` });
//   } catch (error) {
//     next(error);
//   }
// });

export default router;
