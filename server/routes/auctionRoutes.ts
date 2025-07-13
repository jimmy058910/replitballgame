import { Router, type Request, type Response, type NextFunction } from "express";
import { auctionStorage } from "../storage/auctionStorage";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { notificationStorage } from "../storage/notificationStorage"; // For notifications
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
// import { NotificationService } from "../services/notificationService"; // Preferred over direct storage for notifications

const router = Router();

const createAuctionSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  startingBid: z.number().min(100, "Starting bid must be at least 100"),
  duration: z.number().min(1).max(72),
});

const placeBidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be positive"),
});

// Auction routes
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Consider adding pagination parameters from req.query if needed
    const auctions = await auctionStorage.getActiveAuctions();
    res.json(auctions);
  } catch (error) {
    console.error("Error fetching auctions:", error);
    next(error);
  }
});

router.post('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Your team not found." });

    const { playerId, startingBid, duration } = createAuctionSchema.parse(req.body);

    const player = await storage.players.getPlayerById(playerId);
    if (!player || player.teamId !== team.id) return res.status(404).json({ message: "Player not found on your team or does not exist." });
    if (player.isMarketplace) return res.status(400).json({ message: "Player is currently listed on the direct marketplace. Remove before auctioning." });

    const existingPlayerAuctions = await auctionStorage.getAuctionsByPlayer(playerId, true);
    if (existingPlayerAuctions.length > 0) return res.status(400).json({ message: "This player is already in an active auction." });

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + duration);

    const auctionData = {
      playerId, sellerId: team.id, startingBid,
      currentBid: startingBid, endTime, status: 'active' as 'active',
      bidsCount: 0,
    };

    const auction = await auctionStorage.createAuction(auctionData);
    // Consider marking player as 'inAuction' via storage.players.updatePlayer if needed

    res.status(201).json(auction);
  } catch (error) {
    console.error("Error creating auction:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid auction data", errors: error.errors });
    next(error);
  }
});

router.post('/:id/bid', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const bidderTeam = await storage.teams.getTeamByUserId(userId);
    if (!bidderTeam) return res.status(404).json({ message: "Your team (bidder) not found." });

    const auctionId = req.params.id;
    const { amount } = placeBidSchema.parse(req.body);

    const auction = await auctionStorage.getAuctionById(auctionId);
    if (!auction || auction.status !== 'active') return res.status(404).json({ message: "Auction not found or not active." });
    if (auction.sellerId === bidderTeam.id) return res.status(400).json({ message: "Cannot bid on your own auction." });

    const finances = await teamFinancesStorage.getTeamFinances(bidderTeam.id);
    if (!finances || (finances.credits || 0) < amount) return res.status(400).json({ message: "Insufficient credits to place this bid." });

    const currentHighestBidAmount = auction.currentBid || auction.startingBid || 0;
    if (amount <= currentHighestBidAmount) return res.status(400).json({ message: `Bid must be higher than the current bid of ${currentHighestBidAmount}.` });

    const previousTopBid = await auctionStorage.getWinningBidForAuction(auctionId); // Get explicitly winning bid

    const bid = await auctionStorage.createBid({
      auctionId, bidderId: bidderTeam.id, bidAmount: amount, isWinning: true, timestamp: new Date(),
    });

    // Mark previous winning bid (if any, and not by current bidder) as not winning
    if (previousTopBid && previousTopBid.bidderId !== bidderTeam.id) {
        await auctionStorage.markBidAsNotWinning(previousTopBid.id);
        const previousBidderTeam = await storage.teams.getTeamById(previousTopBid.bidderId);
        const auctionedPlayer = await storage.players.getPlayerById(auction.playerId);
        if (previousBidderTeam && auctionedPlayer) {
            // Using notificationStorage directly for now as planned
            await notificationStorage.createNotification({
                userId: previousBidderTeam.userId,
                type: 'auction_outbid',
                title: `Outbid on ${auctionedPlayer.name}!`,
                message: `You have been outbid on ${auctionedPlayer.name}. New bid is ${amount} credits.`,
                priority: 'high',
                actionUrl: `/marketplace/auctions/${auctionId}`,
                metadata: { auctionId, playerName: auctionedPlayer.name, newBid: amount }
            });
        }
    }

    await auctionStorage.updateAuction(auctionId, {
      currentBid: amount, topBidderId: bidderTeam.id, bidsCount: (auction.bidsCount || 0) + 1,
    });
    await auctionStorage.markBidAsWinning(bid.id); // Ensure current bid is marked winning

    const sellerTeam = await storage.teams.getTeamById(auction.sellerId);
    const auctionedPlayerInfo = await storage.players.getPlayerById(auction.playerId);
    if (sellerTeam && auctionedPlayerInfo) {
        await notificationStorage.createNotification({
            userId: sellerTeam.userId,
            type: 'auction_new_bid',
            title: `New Bid on ${auctionedPlayerInfo.name}!`,
            message: `Your auction for ${auctionedPlayerInfo.name} received a bid of ${amount} credits.`,
            priority: 'medium',
            actionUrl: `/marketplace/auctions/${auctionId}`,
            metadata: { auctionId, playerName: auctionedPlayerInfo.name, newBid: amount, bidderName: bidderTeam.name }
        });
    }

    res.status(201).json(bid);
  } catch (error) {
    console.error("Error placing bid:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid bid data", errors: error.errors });
    next(error);
  }
});

export default router;
