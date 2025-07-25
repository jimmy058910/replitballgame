import { Router } from 'express';
import { z } from 'zod';
import { MatchDomainService } from './service';
import { matchSchemas } from './schemas';
import { validateRequest } from '../core/validation';
import { requireAuth, requireAdmin } from '../auth/middleware';
import { commonSchemas } from '../core/validation';
import { Logger } from '../core/logger';

const router = Router();

// Create match
router.post('/create',
  requireAuth,
  validateRequest({
    body: matchSchemas.createMatchRequest
  }),
  async (req, res, next) => {
    try {
      const match = await MatchDomainService.createMatch(req.body);
      
      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get match by ID
router.get('/:matchId',
  requireAuth,
  validateRequest({
    params: z.object({ matchId: commonSchemas.matchId })
  }),
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const match = await MatchDomainService.getMatchById(matchId);
      
      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get live matches
router.get('/live',
  requireAuth,
  async (req, res, next) => {
    try {
      const matches = await MatchDomainService.getLiveMatches();
      
      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  }
);

// Start match
router.post('/:matchId/start',
  requireAuth,
  validateRequest({
    params: z.object({ matchId: commonSchemas.matchId })
  }),
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const match = await MatchDomainService.startMatch(matchId);
      
      Logger.logInfo('Match start requested', {
        matchId,
        userId: req.user.userId
      });
      
      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update match state
router.put('/:matchId/state',
  requireAuth,
  validateRequest({
    params: z.object({ matchId: commonSchemas.matchId }),
    body: z.object({
      gameTime: z.number().optional(),
      homeScore: z.number().optional(),
      awayScore: z.number().optional(),
      status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional()
    })
  }),
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const match = await MatchDomainService.updateMatchState(matchId, req.body);
      
      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;