import { Router } from "express.js";
import { prisma } from "../db.js";
import { isAuthenticated } from "../googleAuth.js";
import logger from '../utils/logger.js';
import { tournamentFlowService } from "../services/tournamentFlowService.js";
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from "../services/matchStateManager.js";

const router = Router();

// Emergency tournament fix endpoint
router.post('/start-tournament-matches/:tournamentId', isAuthenticated, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournamentIdNum = parseInt(tournamentId);
    
    logger.info(`Starting tournament matches for tournament ${tournamentId}`);
    
    // Get all scheduled matches for this tournament
    const matches = await prisma.game.findMany({
      where: {
        tournamentId: tournamentIdNum,
        status: 'IN_PROGRESS'
      },
      orderBy: {
        round: 'asc'
      }
    });
    
    logger.info(`Found ${matches.length} IN_PROGRESS matches for tournament ${tournamentId}`);
    
    // Start live simulation for each match
    for (const match of matches) {
      try {
        const { matchStateManager } = await import('../services/matchStateManager');
        await matchStateManager.startLiveMatch(match.id.toString());
        logger.info(`Started live simulation for match ${match.id}`);
      } catch (error: any) {
        console.error(`Error starting match ${match.id}:`, error);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Started ${matches.length} tournament matches`,
      matches: matches.map(m => ({ id: m.id, round: m.round }))
    });
    
  } catch (error) {
    console.error('Error starting tournament matches:', error);
    res.status(500).json({ error: 'Failed to start tournament matches' });
  }
});

export default router;