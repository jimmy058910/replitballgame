import { Router, type Request, type Response, type NextFunction } from "express";
// playerStorage imported via storage index
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { itemStorage } from "../storage/itemStorage";
import { isAuthenticated } from "../replitAuth";
// import { db } from "../db"; // Direct DB access for items might be replaced by itemStorage calls
// import { items as itemsTable } from "@shared/schema"; // Schema items can be imported by itemStorage
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
router.get('/listings', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketplacePlayers = await storage.players.getMarketplacePlayers();
    res.json({ listings: marketplacePlayers });
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    next(error);
  }
});

router.get('/players', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketplacePlayers = await storage.players.getMarketplacePlayers();
    res.json(marketplacePlayers);
  } catch (error) {
    console.error("Error fetching marketplace players:", error);
    next(error);
  }
});

router.post('/players/bid', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { playerId, amount } = bidPlayerSchema.parse(req.body);

    const player = await storage.players.getPlayerById(playerId);
    const userTeam = await storage.teams.getTeamByUserId(userId);

    if (!player || !userTeam) return res.status(404).json({ message: "Player or your team not found" });
    if (!player.isMarketplace) return res.status(400).json({ message: "Player is not on the marketplace." });

    const finances = await teamFinancesStorage.getTeamFinances(userTeam.id);
    if (!finances || (finances.credits || 0) < amount) return res.status(400).json({ message: "Insufficient credits" });

    if (!player.marketplacePrice || amount > player.marketplacePrice) {
      await storage.players.updatePlayer(playerId, {
        marketplacePrice: amount,
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

router.post('/players/list', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Your team not found" });

    const { playerId, price, duration } = listPlayerSchema.parse(req.body);
    const player = await storage.players.getPlayerById(playerId);

    if (!player || player.teamId !== team.id) return res.status(404).json({ message: "Player not found on your team or does not exist." });
    if (player.isMarketplace) return res.status(400).json({ message: "Player is already listed." });

    // Check if player is a taxi squad member (beyond main 12-player roster)
    const teamPlayers = await storage.players.getPlayersByTeamId(team.id);
    const sortedPlayers = teamPlayers.sort((a, b) => a.id - b.id); // Consistent ordering
    const playerIndex = sortedPlayers.findIndex(p => p.id === playerId);
    const isTaxiSquadPlayer = playerIndex >= 12;

    if (isTaxiSquadPlayer) {
      return res.status(400).json({ message: "Cannot list taxi squad players on the marketplace. Only main roster players can be listed." });
    }

    const teamPlayers = await storage.players.getPlayersByTeamId(team.id);
    const playersOnMarket = (await storage.players.getAllPlayersByTeamId(team.id)).filter(p => p.isMarketplace).length;

    if (teamPlayers.length <= 10) return res.status(400).json({ message: "Team must have at least 10 active players to list one." });
    if (playersOnMarket >= 3) return res.status(400).json({ message: "Maximum 3 players from your team can be on market." });

    const listingFee = Math.floor(price * 0.02);
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < listingFee) return res.status(400).json({ message: `Insufficient credits for listing fee of ${listingFee}.` });

    await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - listingFee });

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + duration);

    await storage.players.updatePlayer(playerId, {
      isMarketplace: true, marketplacePrice: price, marketplaceEndTime: endTime, updatedAt: new Date(),
    });
    res.json({ success: true, message: "Player listed successfully." });
  } catch (error) {
    console.error("Error listing player:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
    next(error);
  }
});

router.post('/players/buy', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const buyerUserId = req.user.claims.sub;
    const buyerTeam = await storage.teams.getTeamByUserId(buyerUserId);
    if (!buyerTeam) return res.status(404).json({ message: "Your team not found." });

    const { playerId } = buyPlayerSchema.parse(req.body);
    const playerToBuy = await storage.players.getPlayerById(playerId);

    if (!playerToBuy || !playerToBuy.isMarketplace || !playerToBuy.marketplacePrice) return res.status(404).json({ message: "Player not available for purchase or price not set." });
    if (playerToBuy.teamId === buyerTeam.id) return res.status(400).json({ message: "Cannot buy a player already on your team."});

    const buyerTeamPlayers = await storage.players.getPlayersByTeamId(buyerTeam.id);
    if (buyerTeamPlayers.length >= 15) return res.status(400).json({ message: "Your team roster is full (15 players max)." });

    const buyerFinances = await teamFinancesStorage.getTeamFinances(buyerTeam.id);
    const price = playerToBuy.marketplacePrice;
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

    await storage.players.updatePlayer(playerId, {
      teamId: buyerTeam.id, isMarketplace: false, marketplacePrice: null, marketplaceEndTime: null, updatedAt: new Date(),
    });
    res.json({ success: true, message: `${playerToBuy.name} purchased successfully!` });
  } catch (error) {
    console.error("Error buying player:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid player ID", errors: error.errors });
    next(error);
  }
});

router.post('/players/:playerId/remove-listing', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Your team not found." });

    const { playerId } = req.params;
    const player = await storage.players.getPlayerById(playerId);

    if (!player || player.teamId !== team.id || !player.isMarketplace) return res.status(404).json({ message: "Player not found on your listings." });

    const penaltyFee = player.marketplacePrice ? Math.floor(player.marketplacePrice * 0.01) : 0;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);

    if (finances && (finances.credits || 0) < penaltyFee) return res.status(400).json({ message: `Insufficient credits for penalty fee of ${penaltyFee}.`});
    if (finances) await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - penaltyFee });

    await storage.players.updatePlayer(playerId, {
      isMarketplace: false, marketplacePrice: null, marketplaceEndTime: null, updatedAt: new Date(),
    });
    res.json({ success: true, message: "Player listing removed successfully." });
  } catch (error) {
    console.error("Error removing player listing:", error);
    next(error);
  }
});


// Equipment Marketplace Routes
router.get('/equipment', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marketItems = await itemStorage.getMarketplaceListedItems('equipment');
    res.json(marketItems);
  } catch (error) {
    console.error("Error fetching equipment marketplace:", error);
    next(error);
  }
});

router.post('/equipment/:itemId/buy', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const buyerUserId = req.user.claims.sub;

    const buyerTeam = await storage.teams.getTeamByUserId(buyerUserId);
    if (!buyerTeam) return res.status(404).json({ message: "Your team not found." });

    const itemToBuy = await itemStorage.getItemById(itemId);
    if (!itemToBuy || !itemToBuy.marketplacePrice) return res.status(404).json({ message: "Equipment not available for purchase or price not set." });

    const buyerFinances = await teamFinancesStorage.getTeamFinances(buyerTeam.id);
    const price = itemToBuy.marketplacePrice;

    if (!buyerFinances || (buyerFinances.credits || 0) < price) return res.status(400).json({ message: `Insufficient credits. Required: ${price}, Available: ${buyerFinances.credits || 0}` });

    if (itemToBuy.teamId) {
        const sellerTeam = await storage.teams.getTeamById(itemToBuy.teamId);
        if (sellerTeam) {
            const sellerFinances = await teamFinancesStorage.getTeamFinances(sellerTeam.id);
            if (sellerFinances) await teamFinancesStorage.updateTeamFinances(sellerTeam.id, { credits: (sellerFinances.credits || 0) + price });
        }
    }
    await teamFinancesStorage.updateTeamFinances(buyerTeam.id, { credits: (buyerFinances.credits || 0) - price });
    await itemStorage.transferItemOwnership(itemId, buyerTeam.id);

    res.json({ success: true, message: `Successfully purchased ${itemToBuy.name} for ${price} credits.` });
  } catch (error) {
    console.error("Error buying equipment:", error);
    next(error);
  }
});

router.post('/equipment/:itemId/sell', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { price } = equipmentPriceSchema.parse(req.body);
    const sellerUserId = req.user.claims.sub;

    const sellerTeam = await storage.teams.getTeamByUserId(sellerUserId);
    if (!sellerTeam) return res.status(404).json({ message: "Your team not found." });

    const itemToSell = await itemStorage.getItemById(itemId);
    if (!itemToSell || itemToSell.teamId !== sellerTeam.id) return res.status(404).json({ message: "Equipment not found on your team." });
    if (itemToSell.marketplacePrice) return res.status(400).json({ message: "Equipment is already listed." });

    await itemStorage.listItemOnMarketplace(itemId, price, sellerTeam.id);
    res.json({ success: true, message: `${itemToSell.name} listed for ${price} credits.` });
  } catch (error) {
    console.error("Error listing equipment:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid price data", errors: error.errors });
    next(error);
  }
});

export default router;
