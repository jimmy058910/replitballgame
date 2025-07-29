import { Router } from "express";
import { prisma } from "../db";
import { isAuthenticated } from "../googleAuth";
import logger from '../utils/logger';
import { tournamentFlowService } from "../services/tournamentFlowService";
import { matchStateManager } from "../services/matchStateManager";

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
        await matchStateManager.startLiveMatch(match.id);
        logger.info(`Started live simulation for match ${match.id}`);
      } catch (error) {
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