import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { AgingService } from '../services/agingService.js';
import { ErrorCreators, asyncHandler, logInfo } from '../services/errorService.js';
import { z } from "zod";
import { getPrismaClient } from "../database.js";

const router = Router();

/**
 * Get aging statistics for the league
 */
router.get('/statistics', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const stats = await AgingService.getAgingStatistics();
  
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * Process end-of-season aging (Admin only)
 */
router.post('/process-season-aging', requireAuth, asyncHandler(async (req: any, res: Response) => {
  logInfo('Starting manual end-of-season aging process', {
    triggeredBy: req.user.claims.sub,
    requestId: req.requestId
  });

  const results = await AgingService.processEndOfSeasonAging();
  
  // Categorize results for reporting
  const summary = {
    totalProcessed: results.length,
    retired: results.filter(r => r.action === 'retired').length,
    declined: results.filter(r => r.action === 'declined').length,
    aged: results.filter(r => r.action === 'aged').length,
    retiredPlayers: results.filter(r => r.action === 'retired').map(r => ({
      name: r.playerName,
      details: r.details
    })),
    declinedPlayers: results.filter(r => r.action === 'declined').map(r => ({
      name: r.playerName,
      details: r.details
    }))
  };

  logInfo('End-of-season aging process completed', {
    summary,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: 'End-of-season aging process completed successfully',
    data: summary,
    fullResults: results
  });
}));

/**
 * Get retirement calculation for a specific player
 */
const playerIdSchema = z.object({
  playerId: z.string().uuid()
});

router.get('/player/:playerId/retirement-chance', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { playerId } = playerIdSchema.parse(req.params);
  
  const prisma = await getPrismaClient();
  const player = await prisma.player.findFirst({
    where: { id: parseInt(playerId) }
  });
  
  if (!player) {
    throw ErrorCreators.notFound('Player not found');
  }

  const retirementCalc = AgingService.calculateRetirementChance(player);
  const declineCalc = AgingService.calculateStatDecline(player);

  res.json({
    success: true,
    data: {
      player: {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        age: player.age,
        careerInjuries: player.careerInjuries || 0,
        gamesPlayedLastSeason: player.gamesPlayedLastSeason || 0
      },
      retirement: retirementCalc,
      decline: declineCalc
    }
  });
}));

/**
 * Simulate aging for a specific player - for testing
 */
router.post('/player/:playerId/simulate-aging', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { playerId } = playerIdSchema.parse(req.params);
  
  const prisma = await getPrismaClient();
  const player = await prisma.player.findFirst({
    where: { id: parseInt(playerId) }
  });
  
  if (!player) {
    throw ErrorCreators.notFound('Player not found');
  }

  const result = await AgingService.processPlayerAging(player);

  logInfo('Player aging simulation completed', {
    playerId,
    playerName: result.playerName,
    action: result.action,
    details: result.details,
    requestId: req.requestId
  });

  res.json({
    success: true,
    message: 'Player aging simulation completed',
    data: result
  });
}));

/**
 * Increment career injuries for a player (for injury system integration)
 */
router.post('/player/:playerId/injury', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { playerId } = playerIdSchema.parse(req.params);
  
  await AgingService.incrementCareerInjuries(playerId);
  
  res.json({
    success: true,
    message: 'Career injury count updated'
  });
}));

/**
 * Increment games played for a player (for match system integration)
 */
router.post('/player/:playerId/game-played', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { playerId } = playerIdSchema.parse(req.params);
  
  await AgingService.incrementGamesPlayed(playerId);
  
  res.json({
    success: true,
    message: 'Games played count updated'
  });
}));

export default router;