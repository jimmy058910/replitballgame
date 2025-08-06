import { Router } from 'express';
import { z } from 'zod';
import { TournamentDomainService } from './service';
import { tournamentSchemas } from './schemas';
import { validateRequest } from '../core/validation';
import { requireAuth, requireAdmin } from '../auth/middleware';
import { commonSchemas } from '../core/validation';
import { Logger } from '../core/logger';

const router = Router();

// Register for tournament
router.post('/register', 
  requireAuth,
  validateRequest({
    body: tournamentSchemas.registrationRequest,
    params: z.object({ teamId: commonSchemas.teamId })
  }),
  async (req, res, next) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const entry = await TournamentDomainService.registerForTournament(teamId, req.body);
      
      res.json({
        success: true,
        data: entry
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get tournament history
router.get('/history/:teamId',
  requireAuth,
  validateRequest({
    params: z.object({ teamId: commonSchemas.teamId })
  }),
  async (req, res, next) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const history = await TournamentDomainService.getTournamentHistory(teamId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get active tournaments
router.get('/active/:teamId',
  requireAuth,
  validateRequest({
    params: z.object({ teamId: commonSchemas.teamId })
  }),
  async (req, res, next) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const active = await TournamentDomainService.getActiveTournaments(teamId);
      
      res.json({
        success: true,
        data: active
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get tournament status
router.get('/status/:tournamentId',
  requireAuth,
  validateRequest({
    params: z.object({ tournamentId: commonSchemas.tournamentId })
  }),
  async (req, res, next) => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const status = await TournamentDomainService.getTournamentStatus(tournamentId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

// Force start tournament (admin only)
router.post('/force-start/:tournamentId',
  requireAuth,
  requireAdmin,
  validateRequest({
    params: z.object({ tournamentId: commonSchemas.tournamentId })
  }),
  async (req, res, next) => {
    try {
      const tournamentId = req.params.tournamentId;
      
      Logger.logInfo('Force start tournament requested', {
        tournamentId,
        adminUserId: req.user?.claims?.sub
      });
      
      // This would integrate with existing tournament flow service
      // For now, return success
      res.json({
        success: true,
        message: 'Tournament force start initiated'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;