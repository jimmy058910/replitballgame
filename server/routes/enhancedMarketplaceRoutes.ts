import { Router } from 'express';
import { EnhancedMarketplaceService } from '../services/enhancedMarketplaceService.js';
import { isAuthenticated } from '../replitAuth.js';
import { prisma } from '../db.js';

const router = Router();

/**
 * GET /api/enhanced-marketplace/listings
 * Get marketplace listings with advanced filtering
 */
router.get('/listings', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      role: req.query.role as string,
      race: req.query.race as string,
      minAge: req.query.minAge ? parseInt(req.query.minAge as string) : undefined,
      maxAge: req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined,
      minPower: req.query.minPower ? parseInt(req.query.minPower as string) : undefined,
      maxPower: req.query.maxPower ? parseInt(req.query.maxPower as string) : undefined,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
      sortBy: req.query.sortBy as string || 'expiryTimestamp',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
    };

    const result = await EnhancedMarketplaceService.getListings(filters);
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedListings = result.listings.map((listing: any) => ({
      ...listing,
      startBid: listing.startBid.toString(),
      buyNowPrice: listing.buyNowPrice?.toString(),
      minBuyNowPrice: listing.minBuyNowPrice.toString(),
      currentBid: listing.currentBid?.toString(),
      listingFee: listing.listingFee.toString(),
      escrowAmount: listing.escrowAmount.toString()
    }));

    res.json({
      ...result,
      listings: serializedListings
    });
  } catch (error) {
    console.error('Error fetching enhanced marketplace listings:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

/**
 * POST /api/enhanced-marketplace/listings
 * Create a new marketplace listing
 */
router.post('/listings', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userProfile = await prisma.userProfile.findFirst({
      where: { userId },
      include: { Team: true }
    });

    if (!userProfile || !userProfile.Team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const { playerId, startBid, buyNowPrice, durationHours } = req.body;

    if (!playerId || !startBid || !buyNowPrice || !durationHours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listing = await EnhancedMarketplaceService.createListing(
      userProfile.Team.id,
      parseInt(playerId),
      parseInt(startBid),
      parseInt(buyNowPrice),
      parseInt(durationHours)
    );

    // Convert BigInt fields for response
    const serializedListing = {
      ...listing,
      startBid: listing.startBid.toString(),
      buyNowPrice: listing.buyNowPrice?.toString(),
      minBuyNowPrice: listing.minBuyNowPrice.toString(),
      listingFee: listing.listingFee.toString()
    };

    res.status(201).json({ listing: serializedListing });
  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create listing' });
  }
});

/**
 * POST /api/enhanced-marketplace/listings/:listingId/bid
 * Place a bid on a listing
 */
router.post('/listings/:listingId/bid', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userProfile = await prisma.userProfile.findFirst({
      where: { userId },
      include: { Team: true }
    });

    if (!userProfile || !userProfile.Team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const listingId = parseInt(req.params.listingId);
    const { bidAmount } = req.body;

    if (!bidAmount) {
      return res.status(400).json({ error: 'Bid amount is required' });
    }

    const result = await EnhancedMarketplaceService.placeBid(
      userProfile.Team.id,
      listingId,
      parseInt(bidAmount)
    );

    // Convert BigInt fields for response
    const serializedResult = {
      ...result,
      bid: {
        ...result.bid,
        bidAmount: result.bid.bidAmount.toString(),
        escrowAmount: result.bid.escrowAmount.toString()
      }
    };

    res.json(serializedResult);
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to place bid' });
  }
});

/**
 * POST /api/enhanced-marketplace/listings/:listingId/buy-now
 * Buy now a listing instantly
 */
router.post('/listings/:listingId/buy-now', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userProfile = await prisma.userProfile.findFirst({
      where: { userId },
      include: { Team: true }
    });

    if (!userProfile || !userProfile.Team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const listingId = parseInt(req.params.listingId);
    const result = await EnhancedMarketplaceService.buyNow(userProfile.Team.id, listingId);

    res.json(result);
  } catch (error) {
    console.error('Error buying now:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to buy now' });
  }
});

/**
 * GET /api/enhanced-marketplace/dashboard
 * Get team's marketplace dashboard
 */
router.get('/dashboard', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userProfile = await prisma.userProfile.findFirst({
      where: { userId },
      include: { Team: true }
    });

    if (!userProfile || !userProfile.Team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const dashboard = await EnhancedMarketplaceService.getTeamDashboard(userProfile.Team.id);

    // Convert BigInt fields for response
    const serializedDashboard = {
      ...dashboard,
      myListings: dashboard.myListings.map((listing: any) => ({
        ...listing,
        startBid: listing.startBid.toString(),
        buyNowPrice: listing.buyNowPrice?.toString(),
        currentBid: listing.currentBid?.toString(),
        listingFee: listing.listingFee.toString(),
        escrowAmount: listing.escrowAmount.toString()
      })),
      myBids: dashboard.myBids.map((bid: any) => ({
        ...bid,
        bidAmount: bid.bidAmount.toString(),
        escrowAmount: bid.escrowAmount.toString(),
        listing: {
          ...bid.listing,
          startBid: bid.listing.startBid.toString(),
          buyNowPrice: bid.listing.buyNowPrice?.toString(),
          currentBid: bid.listing.currentBid?.toString()
        }
      })),
      stats: {
        ...dashboard.stats,
        escrowAmount: dashboard.stats.escrowAmount.toString()
      }
    };

    res.json(serializedDashboard);
  } catch (error) {
    console.error('Error fetching marketplace dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace dashboard' });
  }
});

/**
 * GET /api/enhanced-marketplace/listings/:listingId/history
 * Get listing history and bid trail
 */
router.get('/listings/:listingId/history', async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    
    const history = await prisma.listingHistory.findMany({
      where: { listingId },
      include: {
        team: {
          select: { name: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Convert BigInt fields for response
    const serializedHistory = history.map(entry => ({
      ...entry,
      amount: entry.amount?.toString(),
      oldValue: entry.oldValue?.toString(),
      newValue: entry.newValue?.toString()
    }));

    res.json({ history: serializedHistory });
  } catch (error) {
    console.error('Error fetching listing history:', error);
    res.status(500).json({ error: 'Failed to fetch listing history' });
  }
});

/**
 * GET /api/enhanced-marketplace/player/:playerId/valuation
 * Get player market valuation
 */
router.get('/player/:playerId/valuation', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const minBuyNowPrice = EnhancedMarketplaceService.calculateMinimumBuyNowPrice(player);
    const listingFee = EnhancedMarketplaceService.calculateListingFee(minBuyNowPrice * 1.2); // Assume 20% markup
    
    // Check for cached market value
    const cachedValue = await prisma.playerMarketValue.findUnique({
      where: { playerId }
    });

    const carRating = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;

    res.json({
      playerId,
      carRating: Math.round(carRating * 10) / 10,
      potentialRating: player.potentialRating,
      minBuyNowPrice,
      recommendedStartBid: Math.floor(minBuyNowPrice * 0.6),
      recommendedBuyNowPrice: Math.floor(minBuyNowPrice * 1.2),
      listingFee,
      marketValue: cachedValue ? cachedValue.marketValue.toString() : minBuyNowPrice.toString(),
      lastUpdated: cachedValue?.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching player valuation:', error);
    res.status(500).json({ error: 'Failed to fetch player valuation' });
  }
});

/**
 * POST /api/enhanced-marketplace/process-off-season
 * Process off-season conversions (system endpoint)
 */
router.post('/process-off-season', async (req, res) => {
  try {
    await EnhancedMarketplaceService.processOffSeasonConversion();
    res.json({ message: 'Off-season processing completed' });
  } catch (error) {
    console.error('Error processing off-season:', error);
    res.status(500).json({ error: 'Failed to process off-season' });
  }
});

/**
 * POST /api/enhanced-marketplace/process-auto-delist
 * Process auto-delisting (system endpoint)
 */
router.post('/process-auto-delist', async (req, res) => {
  try {
    await EnhancedMarketplaceService.processAutoDelisting();
    res.json({ message: 'Auto-delisting processing completed' });
  } catch (error) {
    console.error('Error processing auto-delisting:', error);
    res.status(500).json({ error: 'Failed to process auto-delisting' });
  }
});

export default router;