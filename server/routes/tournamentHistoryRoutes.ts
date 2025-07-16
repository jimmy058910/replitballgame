import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Tournament history endpoint - completely separate from other tournament routes
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);

    // Use storage to get tournament history
    try {
      const tournamentEntries = await storage.tournaments.getTournamentEntries(team.id);
      const history = tournamentEntries
        .filter(entry => entry.tournament?.status === 'COMPLETED')
        .map(entry => ({
          ...entry.tournament,
          yourPlacement: entry.finalRank,
          prizeWon: entry.finalRank === 1 ? 1500 : entry.finalRank === 2 ? 500 : 0
        }));
      res.json(history);
    } catch (storageError) {
      console.log("Storage method failed, returning empty history:", storageError);
      res.json([]);
    }
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    next(error);
  }
});

export default router;