import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { matchStorage } from "../storage/matchStorage";
import { exhibitionGameStorage } from "../storage/exhibitionGameStorage";
import { isAuthenticated } from "../replitAuth";
import { matchStateManager } from "../services/matchStateManager";
import { z } from "zod";

// TODO: Move to TeamService or similar
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;
  const playersWithPower = players.map(player => ({
    ...player,
    // CAR = Average(Speed, Power, Agility, Throwing, Catching, Kicking)
    individualPower: Math.round(((player.speed || 20) + (player.power || 20) + (player.agility || 20) + 
                                (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20)) / 6)
  }));
  const topPlayers = playersWithPower
    .sort((a, b) => b.individualPower - a.individualPower)
    .slice(0, 9);
  const totalPower = topPlayers.reduce((sum, player) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

const router = Router();

const challengeSchema = z.object({
    opponentId: z.string().uuid("Invalid opponent ID format"),
});

// Exhibition routes
router.get('/stats', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.status(404).json({ message: "Team not found." });

    const gamesPlayedToday = await exhibitionGameStorage.getExhibitionGamesPlayedTodayByTeam(team.id);
    // Further stats like wins/losses would require storing results in exhibitionGames table
    // or linking them to the generic 'matches' table if they are also stored there.
    // For now, providing a simplified version.
    const allExhibitionGames = await exhibitionGameStorage.getExhibitionGamesByTeam(team.id, 1000); // Get all for win rate

    let wins = 0;
    let losses = 0;
    let draws = 0;
    allExhibitionGames.forEach(game => {
        if (game.result === 'win') wins++; // Assuming 'result' field exists
        else if (game.result === 'loss') losses++;
        else if (game.result === 'draw') draws++;
    });
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    res.json({
      gamesPlayedToday: gamesPlayedToday.length,
      totalWins: wins, totalLosses: losses, totalDraws: draws, totalGames, winRate,
      chemistryGained: 0, // Placeholder
      rewardsEarned: { credits: 0, items: 0 } // Placeholder
    });
  } catch (error) {
    console.error("Error fetching exhibition stats:", error);
    next(error);
  }
});

router.get('/available-opponents', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || team.division === undefined) return res.status(404).json({ message: "Team or team division not found." });

    const divisionTeams = await storage.teams.getTeamsByDivision(team.division || 1);
    const opponents = divisionTeams.filter(t => t.id !== team.id && t.userId !== userId);

    if (opponents.length === 0) {
      return res.status(404).json({ message: "No opponents available in your division right now." });
    }

    const opponentsWithDetails = await Promise.all(opponents.map(async (opponent) => {
        const oppPlayers = await storage.players.getPlayersByTeamId(opponent.id);
        const opponentPower = calculateTeamPower(oppPlayers);
        return {
            id: opponent.id, name: opponent.name, division: opponent.division,
            teamPower: opponentPower,
            rewards: { credits: Math.floor(Math.random() * 500) + 200, experience: Math.floor(Math.random() * 100) + 50 },
        };
    }));
    res.json(opponentsWithDetails);
  } catch (error) {
    console.error("Error fetching available exhibition opponents:", error);
    next(error);
  }
});

// Auto-find and start match against similar USER team
router.post('/find-match', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // Calculate user team power
    const userPlayers = await storage.players.getPlayersByTeamId(userTeam.id);
    const userTeamPower = calculateTeamPower(userPlayers);

    // Find potential opponents - prioritize USER teams (teams with real userId)
    const allTeams = await storage.teams.getTeams();
    const userTeams = allTeams.filter((t: any) => 
      t.id !== userTeam.id && 
      t.userId && 
      t.userId !== userId &&
      t.userId !== null && 
      !t.userId.startsWith('ai_') // Exclude AI teams
    );

    let bestOpponent = null;
    let bestScore = Infinity;

    // Find best match based on Division and Power Rating similarity
    for (const opponent of userTeams) {
      const opponentPlayers = await storage.players.getPlayersByTeamId(opponent.id);
      const opponentPower = calculateTeamPower(opponentPlayers);
      
      // Scoring: prefer same division, similar power rating
      let score = 0;
      
      // Division matching (heavily weighted)
      if (opponent.division === (userTeam.division || 1)) {
        score += 0; // Perfect match
      } else {
        score += Math.abs((opponent.division || 1) - (userTeam.division || 1)) * 50; // Heavy penalty for different divisions
      }
      
      // Power rating similarity
      score += Math.abs(opponentPower - userTeamPower) * 2;
      
      if (score < bestScore) {
        bestScore = score;
        bestOpponent = opponent;
      }
    }

    // If no good user teams found, fall back to AI teams in same division
    if (!bestOpponent) {
      const divisionTeams = await storage.teams.getTeamsByDivision(userTeam.division || 1);
      const aiTeams = divisionTeams.filter(t => 
        t.id !== userTeam.id && 
        (!t.userId || t.userId.startsWith('ai_'))
      );
      
      if (aiTeams.length > 0) {
        bestOpponent = aiTeams[Math.floor(Math.random() * aiTeams.length)];
      }
    }

    if (!bestOpponent) {
      return res.status(404).json({ message: "No suitable opponents found. Try again later or use manual opponent selection." });
    }

    // Create and start the match
    const match = await matchStorage.createMatch({
      homeTeamId: userTeam.id,
      awayTeamId: bestOpponent.id,
      matchType: "exhibition",
      status: "scheduled",
      scheduledTime: new Date(),
      gameDay: 0,
    });

    const liveMatchState = await matchStateManager.startLiveMatch(match.id, true);

    // Create exhibition game record
    await exhibitionGameStorage.createExhibitionGame({
      teamId: userTeam.id,
      opponentTeamId: bestOpponent.id,
    });

    const isUserTeam = bestOpponent.userId && !bestOpponent.userId.startsWith('ai_');
    
    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${bestOpponent.name} started!`,
      opponentType: isUserTeam ? 'user' : 'ai',
      opponentName: bestOpponent.name,
      liveState: liveMatchState
    });
  } catch (error) {
    console.error("Error finding exhibition match:", error);
    next(error);
  }
});

router.post('/challenge', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { opponentId } = challengeSchema.parse(req.body);

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Your team not found." });

    const opponentTeam = await storage.teams.getTeamById(opponentId);
    if (!opponentTeam) return res.status(404).json({ message: "Opponent team not found." });
    if (opponentTeam.id === userTeam.id) return res.status(400).json({ message: "Cannot challenge your own team." });

    // TODO: Exhibition credits check
    // const teamFinances = await teamFinancesStorage.getTeamFinances(userTeam.id);
    // if ((teamFinances?.exhibitionCredits || 0) <= 0) { /* ... */ }
    // await teamFinancesStorage.updateTeamFinances(userTeam.id, { exhibitionCredits: (teamFinances?.exhibitionCredits || 0) - 1 });

    const match = await matchStorage.createMatch({
      homeTeamId: userTeam.id, awayTeamId: opponentTeam.id,
      matchType: "exhibition", status: "scheduled",
      homeTeamName: userTeam.name, awayTeamName: opponentTeam.name, // Denormalize names
      scheduledTime: new Date(), gameDay: 0,
    });

    const liveMatchState = await matchStateManager.startLiveMatch(match.id, true);

    // Also create a record in exhibitionGames table for tracking
    await exhibitionGameStorage.createExhibitionGame({
        teamId: userTeam.id, // The team initiating the challenge
        opponentTeamId: opponentTeam.id,
        matchId: match.id, // Link to the match table if needed
        // result and score will be updated upon match completion
    });

    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${opponentTeam.name} started! Game is now live.`,
      liveState: liveMatchState
    });
  } catch (error) {
    console.error("Error creating exhibition challenge:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid opponent ID.", errors: error.errors });
    next(error);
  }
});

router.get('/recent', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);

    // Fetch from exhibitionGames table directly for this team
    const recentExhibitionGames = await exhibitionGameStorage.getExhibitionGamesByTeam(team.id, 10);

    // If more details are needed (like opponent name not stored in exhibitionGames), fetch from matches
    const detailedGames = await Promise.all(recentExhibitionGames.map(async (eg) => {
        if (eg.matchId) {
            const matchDetails = await matchStorage.getMatchById(eg.matchId);
            return { ...eg, ...matchDetails, opponentName: matchDetails?.awayTeamId === team.id ? matchDetails?.homeTeamName : matchDetails?.awayTeamName };
        }
        return eg;
    }));

    res.json(detailedGames);
  } catch (error) {
    console.error("Error fetching recent exhibition games:", error);
    next(error);
  }
});

export default router;
