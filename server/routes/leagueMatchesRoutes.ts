import express from 'express';
import { isAuthenticated } from '../googleAuth';
import { storage } from '../storage';
import { prisma } from '../db';

const router = express.Router();

/**
 * Get recent league matches for the authenticated user's team
 */
router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    console.log(`🔍 Fetching league matches for team ${team.id} (${team.name})`);

    // Get all matches for this team (both home and away)
    const allMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Get last 20 matches
    });

    console.log(`📊 Found ${allMatches.length} total matches for team ${team.id}`);

    // Filter for league matches (exclude exhibition and tournament matches)
    const leagueMatches = allMatches.filter(match => 
      match.matchType === 'LEAGUE' || match.matchType === null || match.matchType === undefined
    );

    console.log(`🏆 Found ${leagueMatches.length} league matches (filtered from ${allMatches.length} total)`);

    // Get opponent team data for each match
    const matchesWithOpponents = await Promise.all(
      leagueMatches.map(async (match) => {
        const opponentId = match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId;
        const opponentTeam = await storage.teams.getTeamById(opponentId);
        
        // Determine result
        let result = "pending";
        if (match.status === "COMPLETED") {
          const isHome = match.homeTeamId === team.id;
          const teamScore = isHome ? match.homeScore : match.awayScore;
          const opponentScore = isHome ? match.awayScore : match.homeScore;
          
          if (teamScore > opponentScore) result = "win";
          else if (teamScore < opponentScore) result = "loss";
          else result = "draw";
        } else if (match.status === "IN_PROGRESS") {
          result = "in_progress";
        }

        return {
          id: match.id,
          matchType: match.matchType || "LEAGUE",
          status: match.status,
          result,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          completedAt: match.completedAt,
          createdAt: match.createdAt,
          gameDate: match.gameDate,
          opponentTeam: opponentTeam ? { 
            id: opponentTeam.id, 
            name: opponentTeam.name 
          } : { 
            id: opponentId, 
            name: "Unknown Team" 
          }
        };
      })
    );

    console.log(`✅ Returning ${matchesWithOpponents.length} league matches with opponent data`);
    res.json(matchesWithOpponents);
  } catch (error) {
    console.error("Error fetching league matches:", error);
    next(error);
  }
});

export default router;