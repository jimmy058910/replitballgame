import { Router } from "express";
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { tournamentFlowService } from '../services/tournamentFlowService.js';
import { QuickMatchSimulation } from '../services/enhancedSimulationEngine.js';
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from '../services/matchStateManager.js';

const router = Router();

// Emergency tournament fix endpoint
router.post('/start-tournament-matches/:tournamentId', requireAuth, async (req, res) => {
  try {
    const prisma = await getPrismaClient();
    const { tournamentId } = req.params;
    const tournamentIdNum = parseInt(tournamentId);
    
    console.log(`Starting tournament matches for tournament ${tournamentId}`);
    
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
    
    console.log(`Found ${matches.length} IN_PROGRESS matches for tournament ${tournamentId}`);
    
    // Start instant simulation for each match
    for (const match of matches) {
      try {
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away
          }
        });
        
        console.log(`Completed instant simulation for match ${match.id} - Score: ${simulationResult.finalScore.home}-${simulationResult.finalScore.away}`);
      } catch (error: any) {
        console.error(`Error simulating match ${match.id}:`, error);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Started ${matches.length} tournament matches`,
      matches: matches.map((m: any) => ({ id: m.id, round: m.round }))
    });
    
  } catch (error) {
    console.error('Error starting tournament matches:', error);
    res.status(500).json({ error: 'Failed to start tournament matches' });
  }
});

export default router;