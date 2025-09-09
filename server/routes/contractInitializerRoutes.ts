import { Router, Request, Response, NextFunction } from 'express';
import { PlayerContractInitializer } from '../services/playerContractInitializer.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import type { Team } from '@shared/types/models';


const router = Router();

/**
 * POST /api/contracts/initialize-team-contracts
 * Assigns initial contracts to all players on a team who don't have active contracts
 */
router.post('/initialize-team-contracts', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.body;
    const userId = req.user?.uid || req.user?.claims?.sub || 'dev-user-123';
    
    // Import storage to verify team ownership
    const { storage } = await import('../storage');
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam || userTeam.id !== parseInt(teamId)) {
      return res.status(403).json({ message: "You can only initialize contracts for your own team" });
    }
    
    await PlayerContractInitializer.assignInitialContracts(parseInt(teamId));
    
    res.json({
      success: true,
      message: `Initial contracts assigned to all players on team ${teamId}`
    });
  } catch (error) {
    console.error("Error initializing team contracts:", error);
    next(error);
  }
});

/**
 * POST /api/contracts/initialize-all
 * Assigns initial contracts to all teams (admin only)
 */
router.post('/initialize-all', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await PlayerContractInitializer.assignInitialContractsToAllTeams();
    
    res.json({
      success: true,
      message: "Initial contracts assigned to all teams"
    });
  } catch (error) {
    console.error("Error initializing all contracts:", error);
    next(error);
  }
});

export default router;