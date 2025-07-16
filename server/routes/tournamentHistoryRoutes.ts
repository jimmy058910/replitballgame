import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../replitAuth";
import { prisma } from "../db";

const router = Router();

// Helper function to handle BigInt serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToString(obj[key]);
    }
    return result;
  }
  return obj;
}

// Tournament history endpoint - completely separate from other tournament routes
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    // Get user's team using existing storage
    const userProfile = await storage.users.getUser(userId);
    const team = userProfile ? await storage.teams.getTeamByUserId(userId) : null;
    
    if (!team) {
      return res.json([]);
    }
    
    // Get tournament entries for the team using Prisma directly
    const tournamentEntries = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
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
        tournament: {
          ...entry.tournament,
          id: entry.tournament.id,
          tournamentId: entry.tournament.tournamentId,
          name: entry.tournament.name,
          type: entry.tournament.type,
          status: entry.tournament.status,
          division: entry.tournament.division,
          seasonDay: entry.tournament.seasonDay,
          entryFeeCredits: entry.tournament.entryFeeCredits ? entry.tournament.entryFeeCredits.toString() : null,
          entryFeeGems: entry.tournament.entryFeeGems,
          prizePoolJson: entry.tournament.prizePoolJson,
          registrationEndTime: entry.tournament.registrationEndTime,
          startTime: entry.tournament.startTime,
          completionTime: entry.tournament.completionTime,
          createdAt: entry.tournament.createdAt,
          updatedAt: entry.tournament.updatedAt
        },
        placement: entry.finalRank || null,
        creditsWon: entry.finalRank === 1 ? 1500 : entry.finalRank === 2 ? 500 : 0,
        gemsWon: 0,
        entryTime: entry.registeredAt
      }));
    
    console.log(`Found ${tournamentEntries.length} tournament entries for team ${team.id} (${team.name}), ${history.length} completed tournaments`);
    
    // Custom JSON serializer to handle BigInt values
    const serializedHistory = JSON.stringify(history, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(serializedHistory);
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;