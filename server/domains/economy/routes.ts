import { Router } from 'express';
import { z } from 'zod';
import { EconomyDomainService } from './service';
import { economySchemas } from './schemas';
import { validateRequest } from '../core/validation';
import { requireAuth } from '../auth/middleware';
import { commonSchemas } from '../core/validation';

const router = Router();

// Get daily store items
router.get('/store/daily',
  requireAuth,
  async (req, res, next) => {
    try {
      const items = await EconomyDomainService.getDailyStoreItems();
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }
);

// Purchase item
router.post('/store/purchase',
  requireAuth,
  validateRequest({
    body: economySchemas.purchaseRequest.extend({
      teamId: commonSchemas.teamId
    })
  }),
  async (req, res, next) => {
    try {
      const { teamId, ...purchaseData } = req.body;
      const success = await EconomyDomainService.purchaseItem(teamId, purchaseData);
      
      res.json({
        success,
        message: success ? 'Item purchased successfully' : 'Purchase failed'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get marketplace listings
router.get('/marketplace',
  requireAuth,
  validateRequest({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(50).default(20)
    })
  }),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const listings = await EconomyDomainService.getMarketplaceListings(Number(page), Number(limit));
      
      res.json({
        success: true,
        data: listings,
        pagination: {
          page,
          limit,
          hasMore: listings.length === Number(limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Place bid
router.post('/marketplace/bid',
  requireAuth,
  validateRequest({
    body: economySchemas.bidRequest.extend({
      teamId: commonSchemas.teamId
    })
  }),
  async (req, res, next) => {
    try {
      const { teamId, ...bidData } = req.body;
      const success = await EconomyDomainService.placeBid(teamId, bidData);
      
      res.json({
        success,
        message: success ? 'Bid placed successfully' : 'Bid failed'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get financial summary
router.get('/finances/:teamId',
  requireAuth,
  validateRequest({
    params: z.object({ teamId: commonSchemas.teamId })
  }),
  async (req, res, next) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const summary = await EconomyDomainService.getFinancialSummary(teamId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
);

// Watch ad
router.post('/ads/watch',
  requireAuth,
  validateRequest({
    body: z.object({ teamId: commonSchemas.teamId })
  }),
  async (req, res, next) => {
    try {
      const { teamId } = req.body;
      const reward = await EconomyDomainService.watchAd(teamId);
      
      res.json({
        success: true,
        data: reward
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;