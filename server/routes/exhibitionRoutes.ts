import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { matchStorage } from "../storage/matchStorage";
import { exhibitionGameStorage } from "../storage/exhibitionGameStorage";
import { isAuthenticated } from "../replitAuth";
import { matchStateManager } from "../services/matchStateManager";
import { z } from "zod";
import { MatchType } from "../../generated/prisma";
import { prisma } from "../db";

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

    // Get exhibition games from exhibition_games table (completed games)
    const gamesCreatedToday = await exhibitionGameStorage.getExhibitionGamesPlayedTodayByTeam(team.id);
    
    // ALSO get pending exhibition matches from matches table created today (EST)
    const allMatches = await storage.matches.getMatchesByTeamId(team.id);
    console.log(`[DEBUG] Retrieved ${allMatches.length} total matches for team ${team.id}`);
    const exhibitionMatches = allMatches.filter(match => match.matchType === 'EXHIBITION');
    console.log(`[DEBUG] Found ${exhibitionMatches.length} exhibition matches out of ${allMatches.length} total matches`);
    
    // Use proper Eastern Time-based calculation that matches the 3AM reset time
    const { getCurrentGameDayRange } = await import('../../shared/timezone');
    const { start: todayStart, end: todayEnd } = getCurrentGameDayRange();
    
    console.log(`[DEBUG] Game Day Range: Start: ${todayStart.toISOString()}, End: ${todayEnd.toISOString()}`);
    
    // Get ALL exhibition matches from current game day (pending + completed) using Eastern Time calculation
    const allExhibitionMatchesToday = allMatches.filter(match => {
      if (match.matchType !== 'EXHIBITION') return false;
      if (!match.createdAt) return false;
      
      // Use the same game day calculation as the daily reset
      const matchDate = new Date(match.createdAt);
      const isToday = matchDate >= todayStart && matchDate <= todayEnd;
      
      console.log(`[DEBUG] Match ${match.id}: Created: ${matchDate.toISOString()}, IsToday: ${isToday}`);
      
      return isToday;
    });
    
    // Get all exhibition games for historical stats
    const allExhibitionGames = await exhibitionGameStorage.getExhibitionGamesByTeam(team.id, 1000);

    let wins = 0;
    let losses = 0;
    let draws = 0;
    allExhibitionGames.forEach(game => {
        if (game.result === 'win') wins++;
        else if (game.result === 'loss') losses++;
        else if (game.result === 'draw') draws++;
    });
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // Calculate games used today - ALL exhibition matches created today (pending + completed)
    const totalGamesUsedToday = allExhibitionMatchesToday.length;
    const freeGamesLimit = 3;
    const exhibitionEntriesUsedToday = Math.max(0, totalGamesUsedToday - freeGamesLimit);

    res.json({
      gamesPlayedToday: totalGamesUsedToday, // Total games used today (pending + completed)
      exhibitionEntriesUsedToday: exhibitionEntriesUsedToday,
      totalWins: wins, 
      totalLosses: losses, 
      totalDraws: draws, 
      totalGames, 
      winRate,
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

    const divisionTeams = await storage.teams.getTeamsInDivision(team.division || 1);
    const opponents = divisionTeams.filter((t: any) => t.id !== team.id && t.userId !== userId);

    if (opponents.length === 0) {
      return res.status(404).json({ message: "No opponents available in your division right now." });
    }

    // Shuffle opponents and take only 6 random teams
    const shuffledOpponents = opponents.sort(() => 0.5 - Math.random());
    const selectedOpponents = shuffledOpponents.slice(0, 6);

    // Get global rankings for ranking calculation
    const allTeams = await storage.teams.getAllTeamsWithStats();
    
    // Helper functions for global ranking calculation
    const getDivisionMultiplier = (division: number) => {
      const multipliers = [2.0, 1.8, 1.6, 1.4, 1.2, 1.1, 1.0, 0.9];
      return multipliers[Math.max(0, Math.min(division - 1, multipliers.length - 1))];
    };

    const calculateSimpleStrengthOfSchedule = (team: any, teams: any[]) => {
      const divisionTeams = teams.filter(t => t.division === team.division && t.id !== team.id);
      if (divisionTeams.length === 0) return 20;
      const avgOpponentPower = divisionTeams.reduce((sum, t) => sum + (t.teamPower || 20), 0) / divisionTeams.length;
      return Math.min(50, avgOpponentPower);
    };

    const calculateSimpleRecentForm = (team: any) => {
      const totalGames = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
      if (totalGames === 0) return 0;
      const winPercentage = (team.wins || 0) / totalGames;
      const expectedWinRate = team.division <= 4 ? 0.5 : 0.4;
      return Math.max(-1, Math.min(1, (winPercentage - expectedWinRate) * 2));
    };

    const calculateSimpleHealthFactor = (team: any) => {
      const expectedPower = team.division <= 4 ? 28 : 20;
      const powerRatio = Math.min(1, (team.teamPower || 20) / expectedPower);
      return Math.max(0.5, powerRatio);
    };

    const opponentsWithDetails = await Promise.all(selectedOpponents.map(async (opponent) => {
        const oppPlayers = await storage.players.getPlayersByTeamId(opponent.id);
        const opponentPower = calculateTeamPower(oppPlayers);
        
        // Calculate global ranking using Enhanced True Strength Rating algorithm
        const divisionMultiplier = getDivisionMultiplier(opponent.division);
        const winPercentage = opponent.wins + opponent.losses + opponent.draws > 0 
          ? opponent.wins / (opponent.wins + opponent.losses + opponent.draws) 
          : 0;
        
        const strengthOfSchedule = calculateSimpleStrengthOfSchedule({...opponent, teamPower: opponentPower}, allTeams);
        const recentFormBias = calculateSimpleRecentForm(opponent);
        const healthFactor = calculateSimpleHealthFactor({...opponent, teamPower: opponentPower});
        
        // Enhanced True Strength Rating Algorithm
        const baseRating = opponentPower * 10;               // Base: 40% weight (250 max)
        const divisionBonus = divisionMultiplier * 100;      // Division: 15% weight (200 max)
        const recordBonus = winPercentage * 120;             // Record: 18% weight (120 max)
        const sosBonus = strengthOfSchedule * 1.5;           // SOS: 15% weight (~75 avg)
        const camaraderieBonus = (opponent.camaraderie || 50) * 2; // Chemistry: 12% weight (200 max)
        const recentFormBonus = recentFormBias * 30;         // Recent Form: ±30 range
        const healthBonus = healthFactor * 50;               // Health: 50 max

        const trueStrengthRating = baseRating + divisionBonus + recordBonus + sosBonus + camaraderieBonus + recentFormBonus + healthBonus;
        
        // Calculate global rank by comparing with all teams
        const rankedTeams = allTeams.map(t => {
          const tPlayers = t.players || [];
          const tPower = tPlayers.length > 0 ? calculateTeamPower(tPlayers) : (t.teamPower || 20);
          const tDivisionMultiplier = getDivisionMultiplier(t.division);
          const tWinPercentage = t.wins + t.losses + t.draws > 0 ? t.wins / (t.wins + t.losses + t.draws) : 0;
          const tSOS = calculateSimpleStrengthOfSchedule({...t, teamPower: tPower}, allTeams);
          const tRecentForm = calculateSimpleRecentForm(t);
          const tHealthFactor = calculateSimpleHealthFactor({...t, teamPower: tPower});
          
          const tTrueStrength = (tPower * 10) + (tDivisionMultiplier * 100) + (tWinPercentage * 120) + 
                               (tSOS * 1.5) + ((t.camaraderie || 50) * 2) + (tRecentForm * 30) + (tHealthFactor * 50);
          
          return { id: t.id, trueStrengthRating: tTrueStrength };
        }).sort((a, b) => b.trueStrengthRating - a.trueStrengthRating);
        
        const globalRank = rankedTeams.findIndex(t => t.id === opponent.id) + 1;
        
        return {
            id: opponent.id, 
            name: opponent.name, 
            division: opponent.division,
            teamPower: opponentPower,
            averagePower: opponentPower, // Frontend compatibility
            globalRank: globalRank
        };
    }));
    
    res.json(opponentsWithDetails);
  } catch (error) {
    console.error("Error fetching available exhibition opponents:", error);
    next(error);
  }
});

// Auto-find and start match against similar USER team
router.post('/instant', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // Check exhibition game limits using proper Eastern Time calculation
    const { getCurrentGameDayRange } = await import('../../shared/timezone');
    const { start: todayStart, end: todayEnd } = getCurrentGameDayRange();

    const allExhibitionMatchesToday = await prisma.game.findMany({
      where: {
        matchType: 'EXHIBITION',
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ],
        gameDate: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const totalGamesUsedToday = allExhibitionMatchesToday.length;
    const freeGamesLimit = 3;

    // If user has exceeded free games, check for exhibition entry items
    if (totalGamesUsedToday >= freeGamesLimit) {
      const exhibitionEntries = await storage.consumables.getTeamConsumables(userTeam.id);
      const exhibitionGameEntries = exhibitionEntries.filter(item => item.item.name === 'Exhibition Game Entry');
      
      if (exhibitionGameEntries.length === 0) {
        return res.status(400).json({ 
          message: "You have used all 3 free exhibition games today. Purchase Exhibition Game Entry items from the store to play more games.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: 0
        });
      }

      // Consume one exhibition entry item
      const entryItem = exhibitionGameEntries[0];
      const consumeSuccess = await storage.consumables.consumeItem(userTeam.id, entryItem.item.id, 1);
      
      if (!consumeSuccess) {
        return res.status(400).json({ 
          message: "Failed to consume exhibition entry item. Please try again.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: exhibitionGameEntries.length
        });
      }
      
      console.log(`🎯 Exhibition entry item consumed for team ${userTeam.id} (${userTeam.name})`);
    }

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

    // Exhibition games: user team is always away (no home field advantage)
    const homeTeamId = bestOpponent.id;
    const awayTeamId = userTeam.id;

    // Create and start the match
    const match = await matchStorage.createMatch({
      homeTeamId,
      awayTeamId,
      matchType: MatchType.EXHIBITION,
      gameDate: new Date(),
    });

    const liveMatchState = await matchStateManager.startLiveMatch(match.id, true);

    // No need to create duplicate exhibition record - the match already exists in Game table

    const isUserTeam = bestOpponent.userId && !bestOpponent.userId.startsWith('ai_');
    
    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${bestOpponent.name} started!`,
      opponentType: isUserTeam ? 'user' : 'ai',
      opponentName: bestOpponent.name,
      isHome: false, // Always away for exhibition games
      liveState: liveMatchState
    });
  } catch (error) {
    console.error("Error finding exhibition match:", error);
    next(error);
  }
});

// Simplified challenge route for testing
router.post('/challenge', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // Check exhibition game limits using proper Eastern Time calculation
    const { getCurrentGameDayRange } = await import('../../shared/timezone');
    const { start: todayStart, end: todayEnd } = getCurrentGameDayRange();

    const allExhibitionMatchesToday = await prisma.game.findMany({
      where: {
        matchType: 'EXHIBITION',
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ],
        gameDate: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const totalGamesUsedToday = allExhibitionMatchesToday.length;
    const freeGamesLimit = 3;

    // If user has exceeded free games, check for exhibition entry items
    if (totalGamesUsedToday >= freeGamesLimit) {
      const exhibitionEntries = await storage.consumables.getTeamConsumables(userTeam.id);
      const exhibitionGameEntries = exhibitionEntries.filter(item => item.item.name === 'Exhibition Game Entry');
      
      if (exhibitionGameEntries.length === 0) {
        return res.status(400).json({ 
          message: "You have used all 3 free exhibition games today. Purchase Exhibition Game Entry items from the store to play more games.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: 0
        });
      }

      // Consume one exhibition entry item
      const entryItem = exhibitionGameEntries[0];
      const consumeSuccess = await storage.consumables.consumeItem(userTeam.id, entryItem.item.id, 1);
      
      if (!consumeSuccess) {
        return res.status(400).json({ 
          message: "Failed to consume exhibition entry item. Please try again.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: exhibitionGameEntries.length
        });
      }
      
      console.log(`🎯 Exhibition entry item consumed for team ${userTeam.id} (${userTeam.name})`);
    }

    // Get available opponents in same division
    const divisionTeams = await storage.teams.getTeamsByDivision(userTeam.division || 1);
    const opponents = divisionTeams.filter(t => t.id !== userTeam.id);
    
    if (opponents.length === 0) {
      return res.status(404).json({ message: "No opponents available in your division." });
    }

    const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)];
    const isHome = Math.random() < 0.5;
    
    // Clean up any existing live matches for this user's team to prevent multiple matches
    console.log(`🧹 Cleaning up any existing live matches for team ${userTeam.id}`);
    await matchStateManager.cleanupTeamMatches(userTeam.id);

    const match = await matchStorage.createMatch({
      homeTeamId: isHome ? userTeam.id : randomOpponent.id,
      awayTeamId: isHome ? randomOpponent.id : userTeam.id,
      matchType: MatchType.EXHIBITION,
      gameDate: new Date(),
    });

    const liveMatchState = await matchStateManager.startLiveMatch(match.id, true);
    
    // No need to create duplicate exhibition record - the match already exists in Game table

    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${randomOpponent.name} started!`,
      opponentName: randomOpponent.name,
      isHome,
      liveState: liveMatchState
    });
  } catch (error) {
    console.error("Error creating exhibition challenge:", error);
    next(error);
  }
});

// Alias for instant match - frontend calls this endpoint
router.post('/instant-match', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Team not found." });

    // ✅ CRITICAL FIX: Prevent multiple concurrent exhibition matches
    const existingMatch = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ],
        status: 'IN_PROGRESS',
        matchType: 'EXHIBITION'
      }
    });

    if (existingMatch) {
      console.log(`🚫 Team ${userTeam.id} already has active exhibition match ${existingMatch.id}`);
      return res.status(409).json({ 
        message: "You already have an active exhibition match. Please wait for it to complete before starting another.",
        existingMatchId: existingMatch.id 
      });
    }

    // Check exhibition game limits using proper Eastern Time calculation
    const { getCurrentGameDayRange } = await import('../../shared/timezone');
    const { start: todayStart, end: todayEnd } = getCurrentGameDayRange();

    const allExhibitionMatchesToday = await prisma.game.findMany({
      where: {
        matchType: 'EXHIBITION',
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ],
        gameDate: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const totalGamesUsedToday = allExhibitionMatchesToday.length;
    const freeGamesLimit = 3;

    // If user has exceeded free games, check for exhibition entry items
    if (totalGamesUsedToday >= freeGamesLimit) {
      const exhibitionEntries = await storage.consumables.getTeamConsumables(userTeam.id);
      const exhibitionGameEntries = exhibitionEntries.filter(item => item.item.name === 'Exhibition Game Entry');
      
      if (exhibitionGameEntries.length === 0) {
        return res.status(400).json({ 
          message: "You have used all 3 free exhibition games today. Purchase Exhibition Game Entry items from the store to play more games.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: 0
        });
      }

      // Consume one exhibition entry item
      const entryItem = exhibitionGameEntries[0];
      const consumeSuccess = await storage.consumables.consumeItem(userTeam.id, entryItem.item.id, 1);
      
      if (!consumeSuccess) {
        return res.status(400).json({ 
          message: "Failed to consume exhibition entry item. Please try again.",
          freeGamesUsed: totalGamesUsedToday,
          entriesAvailable: exhibitionGameEntries.length
        });
      }
      
      console.log(`🎯 Exhibition entry item consumed for team ${userTeam.id} (${userTeam.name})`);
    }

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

    // Exhibition games: user team is always away (no home field advantage)
    const homeTeamId = bestOpponent.id;
    const awayTeamId = userTeam.id;

    // Create and start the match
    const match = await matchStorage.createMatch({
      homeTeamId,
      awayTeamId,
      matchType: MatchType.EXHIBITION,
      gameDate: new Date(),
    });

    // Start the live match immediately - if this fails, clean up the created match
    let liveMatchState;
    try {
      liveMatchState = await matchStateManager.startLiveMatch(match.id, true);
    } catch (error) {
      console.error(`Failed to start exhibition match ${match.id}, cleaning up:`, error);
      // Clean up the failed match to prevent SCHEDULED exhibitions
      await prisma.game.delete({ where: { id: match.id } });
      throw new Error("Failed to start exhibition match. Please try again.");
    }

    // No need to create duplicate exhibition record - the match already exists in Game table

    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${bestOpponent.name} started!`,
      opponentName: bestOpponent.name,
      isHome: false, // Always away for exhibition games
      liveState: liveMatchState
    });
  } catch (error) {
    console.error("Error creating instant exhibition match:", error);
    next(error);
  }
});

router.post('/challenge-opponent', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { opponentId } = challengeSchema.parse(req.body);

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam || !userTeam.id) return res.status(404).json({ message: "Your team not found." });

    const opponentTeam = await storage.teams.getTeamById(opponentId);
    if (!opponentTeam) return res.status(404).json({ message: "Opponent team not found." });
    if (opponentTeam.id === userTeam.id) return res.status(400).json({ message: "Cannot challenge your own team." });

    // ✅ CRITICAL FIX: Prevent multiple concurrent exhibition matches
    const existingMatch = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ],
        status: 'IN_PROGRESS',
        matchType: 'EXHIBITION'
      }
    });

    if (existingMatch) {
      console.log(`🚫 Team ${userTeam.id} already has active exhibition match ${existingMatch.id}`);
      return res.status(409).json({ 
        message: "You already have an active exhibition match. Please wait for it to complete before starting another.",
        existingMatchId: existingMatch.id 
      });
    }

    // TODO: Exhibition credits check
    // const teamFinances = await teamFinancesStorage.getTeamFinances(userTeam.id);
    // if ((teamFinances?.exhibitionCredits || 0) <= 0) { /* ... */ }
    // await teamFinancesStorage.updateTeamFinances(userTeam.id, { exhibitionCredits: (teamFinances?.exhibitionCredits || 0) - 1 });

    // Exhibition games: user team is always away (no home field advantage)
    const homeTeamId = opponentTeam.id;
    const awayTeamId = userTeam.id;

    const match = await matchStorage.createMatch({
      homeTeamId,
      awayTeamId,
      matchType: MatchType.EXHIBITION, 
      gameDate: new Date(),
    });

    // Start the live match immediately - if this fails, clean up the created match
    let liveMatchState;
    try {
      liveMatchState = await matchStateManager.startLiveMatch(match.id, true);
    } catch (error) {
      console.error(`Failed to start exhibition match ${match.id}, cleaning up:`, error);
      // Clean up the failed match to prevent SCHEDULED exhibitions
      await prisma.game.delete({ where: { id: match.id } });
      throw new Error("Failed to start exhibition match. Please try again.");
    }

    // No need to create duplicate exhibition record - the match already exists in Game table

    res.status(201).json({
      matchId: match.id,
      message: `Exhibition match against ${opponentTeam.name} started! Game is now live.`,
      opponentName: opponentTeam.name,
      isHome: false, // Always away for exhibition games
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

    // Fetch all matches for this team and filter for exhibitions
    const allMatches = await storage.matches.getMatchesByTeamId(team.id);
    const recentMatches = allMatches
      .filter(match => match.matchType === 'EXHIBITION')
      .slice(0, 10);

    // Enhance with complete team information for both home and away teams
    const detailedGames = await Promise.all(recentMatches.map(async (match: any) => {
        const isHome = match.homeTeamId === team.id;
        
        // Fetch both home and away team information
        const homeTeam = await storage.teams.getTeamById(match.homeTeamId);
        const awayTeam = await storage.teams.getTeamById(match.awayTeamId);
        
        let result = 'pending';
        let score = '';
        
        if (match.status === 'COMPLETED') {
          const homeScore = match.homeScore || 0;
          const awayScore = match.awayScore || 0;
          score = `${homeScore} - ${awayScore}`;
          
          if (isHome) {
            result = homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw';
          } else {
            result = awayScore > homeScore ? 'win' : awayScore < homeScore ? 'loss' : 'draw';
          }
        } else if (match.status === 'IN_PROGRESS') {
          result = 'in_progress';
          score = 'Live Match';
        }
        
        // Use proper date field and format it correctly in Eastern Time
        const gameDate = match.gameDate || match.createdAt || new Date();
        const playedDate = new Date(gameDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/New_York'  // Convert to Eastern Time
        });
        
        return { 
            id: match.id,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeScore: match.homeScore || 0,
            awayScore: match.awayScore || 0,
            gameDate: gameDate,
            status: match.status,
            result: result,
            score: score,
            playedDate: playedDate,
            // Include complete team objects for frontend compatibility
            homeTeam: homeTeam ? { 
              id: homeTeam.id, 
              name: homeTeam.name 
            } : null,
            awayTeam: awayTeam ? { 
              id: awayTeam.id, 
              name: awayTeam.name 
            } : null,
            // Legacy fields for backward compatibility
            opponentName: isHome ? (awayTeam?.name || 'Unknown Opponent') : (homeTeam?.name || 'Unknown Opponent'),
            opponentTeam: { 
              name: isHome ? (awayTeam?.name || 'Unknown Opponent') : (homeTeam?.name || 'Unknown Opponent')
            }
        };
    }));

    res.json(detailedGames);
  } catch (error) {
    console.error("Error fetching recent exhibition games:", error);
    next(error);
  }
});

export default router;
