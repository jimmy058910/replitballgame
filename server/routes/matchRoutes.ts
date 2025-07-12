import { Router, type Request, type Response, type NextFunction } from "express";
import { matchStorage } from "../storage/matchStorage";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { isAuthenticated } from "../replitAuth";
import { simulateMatch as fullMatchSimulation } from "../services/matchSimulation";
import { matchStateManager } from "../services/matchStateManager";

const router = Router();

// Match routes
router.get('/live', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveMatches = await matchStorage.getLiveMatches(); // Use matchStorage

    // Team names should now be populated by getLiveMatches if implemented in matchStorage
    // If not, the mapping here is still okay.
    const enhancedMatches = await Promise.all(liveMatches.map(async (match) => {
      const homeTeamName = match.homeTeamName || (await storage.teams.getTeamById(match.homeTeamId))?.name || "Home Team";
      const awayTeamName = match.awayTeamName || (await storage.teams.getTeamById(match.awayTeamId))?.name || "Away Team";
      return { ...match, homeTeamName, awayTeamName };
    }));

    res.json(enhancedMatches);
  } catch (error) {
    console.error("Error fetching live matches:", error);
    next(error);
  }
});

router.get('/:matchId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    const match = await matchStorage.getMatchById(matchIdNum); // Use matchStorage

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // matchStorage.getMatchById might already enhance with team names.
    const homeTeamName = match.homeTeamName || (await storage.teams.getTeamById(match.homeTeamId))?.name || "Home";
    const awayTeamName = match.awayTeamName || (await storage.teams.getTeamById(match.awayTeamId))?.name || "Away";

    if (match.status === 'IN_PROGRESS') {
      const liveState = await matchStateManager.syncMatchState(matchIdNum);
      if (liveState) {
        return res.json({
          ...match, homeTeamName, awayTeamName,
          liveState: {
            gameTime: liveState.gameTime, currentHalf: liveState.currentHalf,
            team1Score: liveState.homeScore, team2Score: liveState.awayScore,
            recentEvents: liveState.gameEvents.slice(-10),
            maxTime: liveState.maxTime, isRunning: liveState.status === 'live'
          }
        });
      }
    }
    res.json({ ...match, homeTeamName, awayTeamName });
  } catch (error) {
    console.error("Error fetching match:", error);
    next(error);
  }
});

// Enhanced match data endpoint for real-time simulation data
router.get('/:matchId/enhanced-data', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    const match = await matchStorage.getMatchById(matchIdNum);
    
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Get live match state if available
    const liveState = await matchStateManager.syncMatchState(matchIdNum);
    
    if (!liveState) {
      return res.status(404).json({ message: "Enhanced data not available for this match" });
    }

    // Get team data for enhanced atmospheric effects
    const homeTeam = await storage.teams.getTeamById(match.homeTeamId);
    const awayTeam = await storage.teams.getTeamById(match.awayTeamId);
    
    // Get stadium data for atmospheric effects
    const homeStadium = homeTeam ? await storage.stadiums.getStadiumByTeamId(homeTeam.id) : null;
    
    // Calculate atmospheric effects
    const atmosphereEffects = {
      homeFieldAdvantage: homeStadium ? Math.min(homeStadium.capacity / 1000, 10) : 0,
      crowdNoise: Math.floor(Math.random() * 40) + 60, // 60-100%
      intimidationFactor: Math.floor(Math.random() * 20) + 10, // 10-30
      fieldSize: homeStadium?.fieldSize || "Standard",
      attendance: homeStadium ? Math.floor(homeStadium.capacity * 0.8) : 12000,
      fanLoyalty: Math.floor(Math.random() * 30) + 70 // 70-100%
    };

    // Get tactical effects (basic implementation)
    const tacticalEffects = {
      homeTeamFocus: homeTeam?.tacticalFocus || "Balanced",
      awayTeamFocus: awayTeam?.tacticalFocus || "Balanced",
      homeTeamModifiers: {
        passing: homeTeam?.tacticalFocus === "Passing" ? 2 : 0,
        rushing: homeTeam?.tacticalFocus === "Rushing" ? 2 : 0,
        defense: homeTeam?.tacticalFocus === "Defense" ? 2 : 0
      },
      awayTeamModifiers: {
        passing: awayTeam?.tacticalFocus === "Passing" ? 2 : 0,
        rushing: awayTeam?.tacticalFocus === "Rushing" ? 2 : 0,
        defense: awayTeam?.tacticalFocus === "Defense" ? 2 : 0
      }
    };

    // Get player stats from live state
    const playerStats = {};
    liveState.playerStats.forEach((stats, playerId) => {
      playerStats[playerId] = {
        scores: stats.scores,
        passingAttempts: stats.passingAttempts,
        passesCompleted: stats.passesCompleted,
        passingYards: stats.passingYards,
        carrierYards: stats.carrierYards,
        catches: stats.catches,
        receivingYards: stats.receivingYards,
        drops: stats.drops,
        tackles: stats.tackles,
        knockdownsInflicted: stats.knockdownsInflicted,
        interceptionsCaught: stats.interceptionsCaught,
        fumblesLost: stats.fumblesLost
      };
    });

    // Identify MVP players (basic implementation)
    const mvpPlayers = {
      home: "TBD", // Could be calculated based on stats
      away: "TBD"
    };

    // Calculate gamePhase including halftime detection
    let gamePhase = "early";
    if (liveState.currentHalf === 1 && liveState.gameTime >= (liveState.maxTime * 0.48) && liveState.gameTime <= (liveState.maxTime * 0.52)) {
      gamePhase = "halftime";
    } else if (liveState.gameTime < (liveState.maxTime * 0.33)) {
      gamePhase = "early";
    } else if (liveState.gameTime < (liveState.maxTime * 0.66)) {
      gamePhase = "mid";
    } else if (liveState.gameTime < (liveState.maxTime * 0.9)) {
      gamePhase = "late";
    } else {
      gamePhase = "clutch";
    }

    const enhancedData = {
      atmosphereEffects,
      tacticalEffects,
      playerStats,
      mvpPlayers,
      gamePhase,
      possession: {
        teamId: liveState.possessingTeamId,
        startTime: liveState.possessionStartTime
      },
      teamStats: {
        home: liveState.teamStats.get(match.homeTeamId) || {},
        away: liveState.teamStats.get(match.awayTeamId) || {}
      }
    };

    res.json(enhancedData);
  } catch (error) {
    console.error("Error fetching enhanced match data:", error);
    next(error);
  }
});

router.post('/:matchId/complete-now', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // TODO: Add SuperUser/Admin check
    const { matchId } = req.params;
    await matchStateManager.stopMatch(matchId);
    res.json({ message: "Match completion process initiated successfully" });
  } catch (error) {
    console.error("Error completing match:", error);
    next(error);
  }
});

router.get('/team/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const teamMatches = await matchStorage.getMatchesByTeamId(parseInt(teamId)); // Use matchStorage
    res.json(teamMatches);
  } catch (error) {
    console.error("Error fetching team matches:", error);
    next(error);
  }
});

router.post('/:id/simulate', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const match = await matchStorage.getMatchById(id); // Use matchStorage

    if (!match) return res.status(404).json({ message: "Match not found" });

    const homeTeam = await storage.teams.getTeamById(match.homeTeamId); // Use teamStorage
    const awayTeam = await storage.teams.getTeamById(match.awayTeamId); // Use teamStorage
    if (!homeTeam || !awayTeam) return res.status(404).json({ message: "One or both teams for the match not found." });

    const homeTeamPlayers = await storage.players.getPlayersByTeamId(match.homeTeamId); // Use playerStorage
    const awayTeamPlayers = await storage.players.getPlayersByTeamId(match.awayTeamId); // Use playerStorage
    if (homeTeamPlayers.length < 1 || awayTeamPlayers.length < 1) {
        return res.status(400).json({ message: "One or both teams do not have enough players to simulate." });
    }

    const result = await fullMatchSimulation(homeTeamPlayers, awayTeamPlayers);

    await matchStorage.updateMatch(id, { // Use matchStorage
      homeScore: result.homeScore, awayScore: result.awayScore,
      status: "completed", gameData: result.gameData as any,
      completedAt: new Date(),
    });
    res.json(result);
  } catch (error) {
    console.error("Error simulating match:", error);
    next(error);
  }
});

router.get('/:matchId/simulation-old', (req, res) => {
  res.status(410).json({ message: "This match simulation endpoint is deprecated. Use text-based match viewing." });
});
router.get('/:matchId/simulation', (req, res) => {
  res.status(410).json({ message: "This match simulation endpoint is deprecated. Use text-based match viewing." });
});

router.post('/:matchId/simulate-play', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const { speed = 1 } = req.body;

    const match = await matchStorage.getMatchById(matchId); // Use matchStorage
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status !== 'IN_PROGRESS') return res.status(400).json({ message: "Match is not live. Cannot simulate play." });

    const eventTypes = ['pass', 'run', 'tackle', 'score', 'foul', 'interception'];
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const homePlayers = await storage.players.getPlayersByTeamId(match.homeTeamId); // Use playerStorage
    const awayPlayers = await storage.players.getPlayersByTeamId(match.awayTeamId); // Use playerStorage
    const allPlayers = [...homePlayers, ...awayPlayers];
    const randomPlayer = allPlayers.length > 0 ? allPlayers[Math.floor(Math.random() * allPlayers.length)] : { name: "Player", race: "Unknown", id: "unknown" };

    const generateEventDescription = (type: string, playerName: string) => `[${type.toUpperCase()}] ${playerName} attempts a ${type}.`;
    const event = {
      id: `event-${Date.now()}`, type: randomEventType, playerId: randomPlayer.id,
      playerName: randomPlayer.name, playerRace: randomPlayer.race,
      description: generateEventDescription(randomEventType, randomPlayer.name), timestamp: Date.now(),
    };

    let { homeScore = 0, awayScore = 0, gameTime = 0, currentHalf = 1, status } = match.gameData as any || {};
    gameTime += (10 * speed);
    if (randomEventType === 'score') { if (Math.random() < 0.5) homeScore++; else awayScore++; }

    const maxTime = match.matchType === 'exhibition' ? 1200 : 1800;
    if (gameTime >= maxTime) { status = 'completed'; }
    else if (gameTime >= maxTime / 2 && currentHalf === 1) { currentHalf = 2; }

    const updatedGameData = {
        ...(match.gameData as any || {}),
        events: [...((match.gameData as any)?.events || []), event].slice(-20),
        homeScore, awayScore, gameTime, currentHalf, status
    };

    await matchStorage.updateMatch(matchId, { // Use matchStorage
      homeScore, awayScore, status,
      gameData: updatedGameData, lastPlay: event.description,
    });
    res.json({ events: [event], matchUpdate: { homeScore, awayScore, gameTime, currentHalf, status }});
  } catch (error) {
    console.error("Error simulating play:", error);
    next(error);
  }
});

router.post('/:matchId/reset', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    await matchStorage.updateMatch(matchId, { // Use matchStorage
      homeScore: 0, awayScore: 0, status: 'scheduled',
      gameData: { events: [], homeScore: 0, awayScore: 0, gameTime: 0, currentHalf: 1, status: 'scheduled' },
      lastPlay: null, completedAt: null,
    });
    matchStateManager.stopMatch(matchId);
    res.json({ message: "Match reset successfully" });
  } catch (error) {
    console.error("Error resetting match:", error);
    next(error);
  }
});

router.patch('/:id/complete', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;
    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
        return res.status(400).json({ message: "Invalid score format." });
    }

    const match = await matchStorage.getMatchById(id); // Use matchStorage
    if (!match) return res.status(404).json({ message: "Match not found" });

    const updatedMatch = await matchStorage.updateMatch(id, { // Use matchStorage
      status: "completed", homeScore, awayScore,
      completedAt: new Date(),
    });
    // TODO: Notification logic
    res.json(updatedMatch);
  } catch (error) {
    console.error("Error completing match:", error);
    next(error);
  }
});

// Get next league game for a team
router.get('/next-league-game/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    
    // Get the team to ensure it exists
    const team = await storage.teams.getTeamById(parseInt(teamId));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get upcoming matches for this team
    const upcomingMatches = await matchStorage.getUpcomingMatches(parseInt(teamId));
    
    // Filter for league games (non-exhibition, non-tournament)
    const nextLeagueGame = upcomingMatches.find(match => 
      match.matchType === 'league' || match.matchType === 'regular_season'
    );

    if (!nextLeagueGame) {
      return res.status(404).json({ message: "No upcoming league games found" });
    }

    // Get team names for the match
    const homeTeamName = nextLeagueGame.homeTeamName || 
      (await storage.teams.getTeamById(nextLeagueGame.homeTeamId))?.name || "Home Team";
    const awayTeamName = nextLeagueGame.awayTeamName || 
      (await storage.teams.getTeamById(nextLeagueGame.awayTeamId))?.name || "Away Team";

    const enhancedMatch = {
      ...nextLeagueGame,
      homeTeamName,
      awayTeamName,
      isHomeGame: nextLeagueGame.homeTeamId === team.id
    };

    res.json(enhancedMatch);
  } catch (error) {
    console.error("Error fetching next league game:", error);
    next(error);
  }
});

export default router;
