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
    const match = await matchStorage.getMatchById(matchId); // Use matchStorage

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // matchStorage.getMatchById might already enhance with team names.
    const homeTeamName = match.homeTeamName || (await storage.teams.getTeamById(match.homeTeamId))?.name || "Home";
    const awayTeamName = match.awayTeamName || (await storage.teams.getTeamById(match.awayTeamId))?.name || "Away";

    if (match.status === 'live') {
      const liveState = await matchStateManager.syncMatchState(matchId);
      if (liveState) {
        return res.json({
          ...match, homeTeamName, awayTeamName,
          liveState: {
            gameTime: liveState.gameTime, currentHalf: liveState.currentHalf,
            team1Score: liveState.team1Score, team2Score: liveState.team2Score,
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
    const teamMatches = await matchStorage.getMatchesByTeamId(teamId); // Use matchStorage
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
    if (match.status !== 'live') return res.status(400).json({ message: "Match is not live. Cannot simulate play." });

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

export default router;
