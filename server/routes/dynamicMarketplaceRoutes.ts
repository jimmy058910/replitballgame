import { Router } from 'express';
import { DynamicMarketplaceService } from '../services/dynamicMarketplaceService.js';
import { isAuthenticated } from '../replitAuth.js';
import { teams } from '../../shared/schema.js';
import { db } from '../db.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get active marketplace listings
router.get('/listings', isAuthenticated, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const listings = await DynamicMarketplaceService.getActiveListings(limit, offset);
    
    res.json({ listings });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// Get specific listing details with bid history
router.get('/listings/:listingId', isAuthenticated, async (req: any, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const listing = await DynamicMarketplaceService.getListingDetails(listingId);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (error) {
    console.error('Error fetching listing details:', error);
    res.status(500).json({ error: 'Failed to fetch listing details' });
  }
});

// Get user's team listings
router.get('/my-listings', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const listings = await DynamicMarketplaceService.getTeamListings(team.id);
    
    res.json({ listings });
  } catch (error) {
    console.error('Error fetching team listings:', error);
    res.status(500).json({ error: 'Failed to fetch team listings' });
  }
});

// List a player for auction
router.post('/list-player', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { playerId, startBid, durationHours, buyNowPrice } = req.body;

    // Validation
    if (!playerId || !startBid || !durationHours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (startBid < 100) {
      return res.status(400).json({ error: 'Start bid must be at least 100 credits' });
    }

    const validDurations = [12, 24, 72, 168]; // 12h, 24h, 3d, 7d
    if (!validDurations.includes(durationHours)) {
      return res.status(400).json({ error: 'Invalid auction duration' });
    }

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await DynamicMarketplaceService.listPlayer(
      team.id,
      playerId,
      startBid,
      durationHours,
      buyNowPrice
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Player listed successfully',
        listingId: result.listingId 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error listing player:', error);
    res.status(500).json({ error: 'Failed to list player' });
  }
});

// Place a bid on a listing
router.post('/listings/:listingId/bid', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const listingId = parseInt(req.params.listingId);
    const { bidAmount } = req.body;

    if (!bidAmount || bidAmount < 1) {
      return res.status(400).json({ error: 'Invalid bid amount' });
    }

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await DynamicMarketplaceService.placeBid(
      team.id,
      listingId,
      bidAmount
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        newExpiryTime: result.newExpiryTime
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Buy now - instant purchase
router.post('/listings/:listingId/buy-now', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const listingId = parseInt(req.params.listingId);

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await DynamicMarketplaceService.buyNow(team.id, listingId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error with buy-now purchase:', error);
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
});

// Calculate minimum buy-now price for a player (helper endpoint)
router.get('/calculate-min-price/:playerId', isAuthenticated, async (req: any, res) => {
  try {
    const { playerId } = req.params;
    
    const { players } = await import('../../shared/schema.js');
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const minimumPrice = DynamicMarketplaceService.calculateMinimumBuyNowPrice(player);
    
    res.json({ minimumPrice });
  } catch (error) {
    console.error('Error calculating minimum price:', error);
    res.status(500).json({ error: 'Failed to calculate minimum price' });
  }
});

// Get team's marketplace stats
router.get('/team-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const activeListings = await DynamicMarketplaceService.getTeamActiveListings(team.id);
    const playerCount = await DynamicMarketplaceService.getTeamPlayerCount(team.id);
    
    res.json({
      activeListings,
      maxListings: 3,
      playerCount,
      minPlayersRequired: 10,
      canListMore: activeListings < 3 && playerCount > 10
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

// Get general marketplace statistics
router.get('/stats', isAuthenticated, async (req: any, res) => {
  try {
    const stats = await DynamicMarketplaceService.getMarketplaceStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace stats' });
  }
});

// Get user's bids
router.get('/my-bids', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's team
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const bids = await DynamicMarketplaceService.getUserBids(team.id);
    res.json({ bids });
  } catch (error) {
    console.error('Error fetching user bids:', error);
    res.status(500).json({ error: 'Failed to fetch user bids' });
  }
});

// Admin endpoint: Process expired auctions
router.post('/admin/process-expired', isAuthenticated, async (req: any, res) => {
  try {
    // Add admin permission check here if needed
    const results = await DynamicMarketplaceService.processExpiredAuctions();
    
    res.json({
      message: 'Expired auctions processed',
      results
    });
  } catch (error) {
    console.error('Error processing expired auctions:', error);
    res.status(500).json({ error: 'Failed to process expired auctions' });
  }
});

export default router;