import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../replitAuth";
import { PrismaClient } from "@prisma/client";

const router = Router();

// Tournament history endpoint - completely separate from other tournament routes
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    
    // Use Prisma directly to get team and tournament history
    const prisma = new PrismaClient();
    
    try {
      // Get team first using Prisma - lookup by userId string, not id
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: userId },
        include: { Team: true }
      });
      
      if (!userProfile?.Team?.id) {
        return res.json([]);
      }
      
      const teamId = userProfile.Team.id;
      
      // Get tournament entries for the team
      const tournamentEntries = await prisma.tournamentEntry.findMany({
        where: { teamId: teamId },
        include: { 
          tournament: true
        },
        orderBy: { registeredAt: 'desc' }
      });

      // Include all completed tournaments, regardless of finalRank
      const history = tournamentEntries
        .filter((entry: any) => entry.tournament?.status === 'COMPLETED')
        .map((entry: any) => ({
          id: entry.tournamentId,
          tournamentId: entry.tournament.tournamentId,
          teamId: entry.teamId,
          registeredAt: entry.registeredAt,
          finalRank: entry.finalRank,
          rewardsClaimed: entry.rewardsClaimed,
          tournament: entry.tournament,
          placement: entry.finalRank || null
        }));
      
      console.log(`Found ${tournamentEntries.length} tournament entries for team ${teamId}, ${history.length} completed tournaments`);
      res.json(history);
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      res.json([]);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    next(error);
  }
});

export default router;