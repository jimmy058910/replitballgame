import { Router, type Request, type Response, type NextFunction } from "express";
// playerStorage imported via storage index
import { storage } from '../storage/index.js';
import { teamFinancesStorage } from '../storage/teamFinancesStorage.js';
import { itemStorage } from '../storage/itemStorage.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
// import type { ItemType } from "@prisma/client";

// Schema items handled by itemStorage using Prisma
// Drizzle operations replaced by Prisma in storage layers
import { z } from "zod";

const router = Router();

const bidPlayerSchema = z.object({
  playerId: z.string().uuid("Invalid player ID format"),
  amount: z.number().min(1, "Bid amount must be at least 1"),
});

const listPlayerSchema = z.object({
  playerId: z.string().uuid("Invalid player ID format"),
  price: z.number().min(1, "Price must be at least 1"),
  duration: z.number().min(1).max(72),
});

const buyPlayerSchema = z.object({
  playerId: z.string().uuid("Invalid player ID format"),
});

const equipmentPriceSchema = z.object({
    price: z.number().min(100).max(500000),
});


// Player Marketplace routes
router.get('/listings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketplacePlayers = await storage.players.getMarketplacePlayers();
    res.json({ listings: marketplacePlayers });
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    next(error);
  }
});

router.get('/players', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketplacePlayers = await storage.players.getMarketplacePlayers();
    res.json(marketplacePlayers);
  } catch (error) {
    console.error("Error fetching marketplace players:", error);
    next(error);
  }
});

router.post('/players/bid', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { playerId, amount } = bidPlayerSchema.parse(req.body);

    const player = await storage.players.getPlayerById(parseInt(playerId));
    const userTeam = await storage.teams.getTeamByUserId(userId);

    if (!player || !userTeam) return res.status(404).json({ message: "Player or your team not found" });
    if (!(player as any).isMarketplace) return res.status(400).json({ message: "Player is not on the marketplace." });

    const finances = await teamFinancesStorage.getTeamFinances(userTeam.id);
    if (!finances || (finances.credits || 0) < amount) return res.status(400).json({ message: "Insufficient credits" });

    if (!(player as any).marketplacePrice || amount > (player as any).marketplacePrice) {
      await storage.players.updatePlayer(parseInt(playerId), {
      });
       return res.json({ message: "Offer placed. If it's the highest, it might be accepted or update listing." });
    } else {
       return res.status(400).json({ message: "Your offer must be higher than the current listing/bid." });
    }
  } catch (error) {
    console.error("Error placing bid/offer on player:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid bid data", errors: error.errors });
    next(error);
  }
});

router.post('/players/list', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Your team not found" });

    const { playerId, price, duration } = listPlayerSchema.parse(req.body);
    const player = await storage.players.getPlayerById(parseInt(playerId));

    if (!player || player.teamId !== team.id) return res.status(404).json({ message: "Player not found on your team or does not exist." });

    // Check if player is a taxi squad member (beyond main 12-player roster)
    const allTeamPlayers = await storage.players.getPlayersByTeamId(team.id);
    const sortedPlayers = allTeamPlayers.sort((a: any, b: any) => a.id - b.id); // Consistent ordering
    const playerIndex = sortedPlayers.findIndex((p: any) => p.id === parseInt(playerId));
    const isTaxiSquadPlayer = playerIndex >= 12;

    if (isTaxiSquadPlayer) {
      return res.status(400).json({ message: "Cannot list taxi squad players on the marketplace. Only main roster players can be listed." });
    }

    const teamPlayers = allTeamPlayers;

    if (teamPlayers.length <= 10) return res.status(400).json({ message: "Team must have at least 10 active players to list one." });

    const listingFee = Math.floor(price * 0.02);
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < listingFee) return res.status(400).json({ message: `Insufficient credits for listing fee of ${listingFee}.` });

    await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - listingFee });

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + duration);

    await storage.players.updatePlayer(parseInt(playerId), {
    });
    res.json({ success: true, message: "Player listed successfully." });
  } catch (error) {
    console.error("Error listing player:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
    next(error);
  }
});

router.post('/players/buy', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const buyerUserId = req.user.claims.sub;
    const buyerTeam = await storage.teams.getTeamByUserId(buyerUserId);
    if (!buyerTeam) return res.status(404).json({ message: "Your team not found." });

    const { playerId } = buyPlayerSchema.parse(req.body);
    const playerToBuy = await storage.players.getPlayerById(parseInt(playerId));

    if (!playerToBuy) return res.status(404).json({ message: "Player not available for purchase or price not set." });
    if (playerToBuy.teamId === buyerTeam.id) return res.status(400).json({ message: "Cannot buy a player already on your team."});

    const buyerTeamPlayers = await storage.players.getPlayersByTeamId(buyerTeam.id);
    if (buyerTeamPlayers.length >= 15) return res.status(400).json({ message: "Your team roster is full (15 players max)." });

    const buyerFinances = await teamFinancesStorage.getTeamFinances(buyerTeam.id);
    const price = 1000;
    const transactionFee = Math.floor(price * 0.05);
    const totalPrice = price + transactionFee;

    if (!buyerFinances || (buyerFinances.credits || 0) < totalPrice) return res.status(400).json({ message: `Insufficient credits. Required: ${totalPrice}, Available: ${buyerFinances.credits || 0}` });

    if (playerToBuy.teamId) {
        const sellerTeam = await storage.teams.getTeamById(playerToBuy.teamId);
        if (sellerTeam) {
            const sellerFinances = await teamFinancesStorage.getTeamFinances(sellerTeam.id);
            const saleAmountForSeller = price;
            if (sellerFinances) {
                 await teamFinancesStorage.updateTeamFinances(sellerTeam.id, {
                    credits: (sellerFinances.credits || 0) + saleAmountForSeller
                });
            }
        }
    }

    await teamFinancesStorage.updateTeamFinances(buyerTeam.id, { credits: (buyerFinances.credits || 0) - totalPrice });

    await storage.players.updatePlayer(parseInt(playerId), {
      teamId: buyerTeam.id,
    } as any);
    res.json({ success: true, message: `${(playerToBuy as any).firstName} ${(playerToBuy as any).lastName} purchased successfully!` });
  } catch (error) {
    console.error("Error buying player:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid player ID", errors: error.errors });
    next(error);
  }
});

router.post('/players/:playerId/remove-listing', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Your team not found." });

    const { playerId } = req.params;
    const player = await storage.players.getPlayerById(parseInt(playerId));

    if (!player || player.teamId !== team.id) return res.status(404).json({ message: "Player not found on your listings." });

    const penaltyFee = 1000;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);

    if (finances && (finances.credits || 0) < penaltyFee) return res.status(400).json({ message: `Insufficient credits for penalty fee of ${penaltyFee}.`});
    if (finances) await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - penaltyFee });

    await storage.players.updatePlayer(parseInt(playerId), {
    } as any);
    res.json({ success: true, message: "Player listing removed successfully." });
  } catch (error) {
    console.error("Error removing player listing:", error);
    next(error);
  }
});


// Equipment Marketplace Routes
router.get('/equipment', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketItems = await itemStorage.getMarketplaceItems("EQUIPMENT");
    res.json(marketItems);
  } catch (error) {
    console.error("Error fetching equipment marketplace:", error);
    next(error);
  }
});

router.post('/equipment/:itemId/buy', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const buyerUserId = req.user.claims.sub;

    const buyerTeam = await storage.teams.getTeamByUserId(buyerUserId);
    if (!buyerTeam) return res.status(404).json({ message: "Your team not found." });

    const itemToBuy = await itemStorage.getItemById(parseInt(itemId));
    if (!itemToBuy) return res.status(404).json({ message: "Equipment not available for purchase or price not set." });

    const buyerFinances = await teamFinancesStorage.getTeamFinances(buyerTeam.id);
    const price = 1000;

    if (!buyerFinances || (buyerFinances.credits || 0) < price) return res.status(400).json({ message: `Insufficient credits. Required: ${price}, Available: ${buyerFinances.credits || 0}` });

    if ((itemToBuy as any).teamId) {
        const sellerTeam = await storage.teams.getTeamById((itemToBuy as any).teamId);
        if (sellerTeam) {
            const sellerFinances = await teamFinancesStorage.getTeamFinances(sellerTeam.id);
            if (sellerFinances) await teamFinancesStorage.updateTeamFinances(sellerTeam.id, { credits: (sellerFinances.credits || 0) + price });
        }
    }
    await teamFinancesStorage.updateTeamFinances(buyerTeam.id, { credits: (buyerFinances.credits || 0) - price });
    await itemStorage.updateItem(parseInt(itemId), { });

    res.json({ success: true, message: `Successfully purchased ${itemToBuy.name} for ${price} credits.` });
  } catch (error) {
    console.error("Error buying equipment:", error);
    next(error);
  }
});

router.post('/equipment/:itemId/sell', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { price } = equipmentPriceSchema.parse(req.body);
    const sellerUserId = req.user.claims.sub;

    const sellerTeam = await storage.teams.getTeamByUserId(sellerUserId);
    if (!sellerTeam) return res.status(404).json({ message: "Your team not found." });

    const itemToSell = await itemStorage.getItemById(parseInt(itemId));
    if (!itemToSell || (itemToSell as any).teamId !== sellerTeam.id) return res.status(404).json({ message: "Equipment not found on your team." });

    await itemStorage.updateItem(parseInt(itemId), { });
    res.json({ success: true, message: `${itemToSell.name} listed for ${price} credits.` });
  } catch (error) {
    console.error("Error listing equipment:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid price data", errors: error.errors });
    next(error);
  }
});

export default router;
