import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";

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
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const prisma = await getPrismaClient();
    
    // For development: Show all completed tournaments
    // In production, this would be filtered by user's team
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log('🔍 [TOURNAMENT HISTORY] Development mode: showing all completed tournaments');
      
      const completedTournaments = await prisma.tournament.findMany({
        where: { status: 'COMPLETED' },
        include: {
          entries: {
            include: {
              team: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`Found ${completedTournaments.length} completed tournaments`);
      
      const history = completedTournaments.map((tournament: any) => ({
        id: tournament.id,
        tournamentId: tournament.tournamentId,
        name: tournament.name,
        type: tournament.type,
        status: tournament.status,
        division: tournament.division,
        seasonDay: tournament.seasonDay,
        entryFeeCredits: tournament.entryFeeCredits ? tournament.entryFeeCredits.toString() : null,
        entryFeeGems: tournament.entryFeeGems,
        prizePoolJson: tournament.prizePoolJson,
        registrationEndTime: tournament.registrationEndTime,
        startTime: tournament.startTime,
        endTime: tournament.endTime,
        createdAt: tournament.createdAt,
        participants: tournament.entries.map((entry: any) => ({
          teamId: entry.teamId,
          teamName: entry.team.name,
          finalRank: entry.finalRank,
          registeredAt: entry.registeredAt
        }))
      }));
      
      res.json(history);
      return;
    }
    
    // Production logic: Get user's team and their tournament history
    const userProfile = await storage.users.getUser(userId);
    const team = userProfile ? await storage.teams.getTeamByUserId(userId) : null;
    
    if (!team) {
      res.json([]);
      return;
    }
    
    // Get tournament entries for the team using Prisma directly  
    const tournamentEntries = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
      include: { 
        tournament: true
      },
      orderBy: { registeredAt: 'desc' }
    });
    
    console.log(`Raw tournament entries for team ${team.id}:`, tournamentEntries.map((e: any) => ({
      id: e.id,
      tournamentId: e.tournamentId,
      teamId: e.teamId,
      finalRank: e.finalRank,
      registeredAt: e.registeredAt,
      tournament: e.tournament ? {
        name: e.tournament.name,
        type: e.tournament.type,
        status: e.tournament.status
      } : null
    })));

    // Include all completed tournaments, regardless of finalRank
    const history = tournamentEntries
      .filter((entry: any) => entry.tournament?.status === 'COMPLETED')
      .map((entry: any) => ({
        id: entry.tournamentId,
        tournamentId: entry.tournament.tournamentId,
        teamId: entry.teamId,
        registeredAt: entry.registeredAt?.toISOString() || entry.registeredAt,
        finalRank: entry.finalRank,
        placement: entry.finalRank,
        rewardsClaimed: entry.rewardsClaimed,
        tournament: {
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
          endTime: entry.tournament.endTime,
          createdAt: entry.tournament.createdAt,
          updatedAt: entry.tournament.updatedAt
        },
        creditsWon: entry.finalRank === 1 ? 1500 : entry.finalRank === 2 ? 500 : 0,
        gemsWon: 0,
        trophyWon: entry.finalRank !== null && entry.finalRank >= 1 && entry.finalRank <= 3,
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