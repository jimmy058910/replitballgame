import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { userStorage } from "../storage/userStorage";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { leagueStorage } from "../storage/leagueStorage"; // For currentSeason
import { matchStorage } from "../storage/matchStorage"; // For getMatchesByDivision
import { isAuthenticated } from "../replitAuth";
import {
  generateLeagueGameSchedule,
  generateDailyGameTimes,
  getNextLeagueGameSlot,
  isWithinSchedulingWindow,
  formatEasternTime,
  LEAGUE_GAME_START_HOUR,
  LEAGUE_GAME_END_HOUR
} from "@shared/timezone";
import { generateRandomPlayer } from "../services/leagueService";
import gameConfig from "../config/game_config.json";
// import { ABILITIES, rollForAbility } from "@shared/abilities"; // Only if used directly in AI team gen

const router = Router();

// TODO: Move to AiTeamService
async function createAITeamsForDivision(division: number) {
  const aiTeamNames = gameConfig.aiTeamNames;
  const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];

  for (let i = 0; i < 8; i++) {
    const teamName = aiTeamNames[i % aiTeamNames.length] || `Division ${division} Team ${i + 1}`;

    const aiUser = await userStorage.upsertUser({ // Use userStorage
      userId: `ai_user_div${division}_team${i}_${Date.now()}`,
      email: `ai_div${division}_team${i}_${Date.now()}@realmrivalry.ai`,
      firstName: "AI",
      lastName: "Coach",
      profileImageUrl: null
    });

    const team = await storage.teams.createTeam({ // Use teamStorage
      name: teamName,
      userId: aiUser.userId,
      division: division,
      subdivision: "main", // AI teams default to main subdivision
      wins: Math.floor(Math.random() * 5),
      losses: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 2),
      points: Math.floor(Math.random() * 15),
      formation: JSON.stringify({ starters: [], substitutes: [] }),
      substitutionOrder: JSON.stringify({})
    });

    // storage.teams.createTeam should handle default finances, but if specific AI finances:
    // await teamFinancesStorage.createTeamFinances({ // Use teamFinancesStorage
    //   teamId: team.id,
    //   credits: 50000 + Math.floor(Math.random() * 50000),
    //   premiumCurrency: Math.floor(Math.random() * 100)
    // });

    const { generateRandomName } = await import("@shared/names");

    // Define required position distribution: 2 passers, 3 runners, 3 blockers, 4 additional
    const requiredPositions = [
      "Passer", "Passer", // 2 passers
      "Runner", "Runner", "Runner", // 3 runners  
      "Blocker", "Blocker", "Blocker" // 3 blockers
    ];
    
    // For the remaining 4 players (12 total - 8 required), ensure we don't exceed limits
    const additionalPositions = ["Passer", "Runner", "Blocker"];
    for (let i = 0; i < 4; i++) {
      let position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
      
      // Count current positions
      const currentCount = requiredPositions.filter(p => p === position).length;
      
      // Prevent overstocking: max 3 passers, max 4 runners, max 4 blockers
      if ((position === "Passer" && currentCount >= 3) ||
          (position === "Runner" && currentCount >= 4) ||
          (position === "Blocker" && currentCount >= 4)) {
        // Try other positions
        const alternatives = additionalPositions.filter(p => {
          const count = requiredPositions.filter(pos => pos === p).length;
          return (p === "Passer" && count < 3) ||
                 (p === "Runner" && count < 4) ||
                 (p === "Blocker" && count < 4);
        });
        if (alternatives.length > 0) {
          position = alternatives[Math.floor(Math.random() * alternatives.length)];
        }
      }
      
      requiredPositions.push(position);
    }

    for (let j = 0; j < 12; j++) {
      const playerRace = races[Math.floor(Math.random() * races.length)];
      const nameData = generateRandomName(playerRace.toLowerCase());
      const position = requiredPositions[j];

      const playerData = generateRandomPlayer(
        `${nameData.firstName} ${nameData.lastName}`,
        playerRace.toLowerCase(),
        team.id
      );

      await storage.players.createPlayer({ // Use playerStorage
        ...playerData,
        position: position,
        abilities: JSON.stringify([])
      });
    }
  }
}

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


// League routes
router.get('/:division/standings', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division parameter" });
    }
    let teamsInDivision = await storage.teams.getTeamsByDivision(division); // Use teamStorage

    if (teamsInDivision.length === 0) {
      await createAITeamsForDivision(division);
      teamsInDivision = await storage.teams.getTeamsByDivision(division); // Use teamStorage
    }

    // Enhanced standings with streak and additional stats
    const enhancedTeams = teamsInDivision.map((team) => {
      // Calculate goal difference (using wins/losses as proxy for now)
      const goalsFor = (team.wins || 0) * 2 + (team.draws || 0); // Rough approximation
      const goalsAgainst = (team.losses || 0) * 2 + (team.draws || 0);
      const goalDifference = goalsFor - goalsAgainst;
      
      // Calculate current streak based on recent form
      const wins = team.wins || 0;
      const losses = team.losses || 0;
      const draws = team.draws || 0;
      
      // Simple streak calculation based on win/loss ratio
      let streakType = 'N';
      let currentStreak = 0;
      
      if (wins > losses) {
        streakType = 'W';
        currentStreak = Math.max(1, Math.min(wins - losses, 5));
      } else if (losses > wins) {
        streakType = 'L';
        currentStreak = Math.max(1, Math.min(losses - wins, 5));
      } else if (draws > 0) {
        streakType = 'D';
        currentStreak = Math.min(draws, 3);
      }
      
      // Generate form string based on overall record
      const totalGames = wins + losses + draws;
      let form = 'N/A';
      if (totalGames > 0) {
        const winRate = wins / totalGames;
        if (winRate >= 0.8) form = 'WWWWW';
        else if (winRate >= 0.6) form = 'WWWDL';
        else if (winRate >= 0.4) form = 'WLDWL';
        else if (winRate >= 0.2) form = 'LLWLL';
        else form = 'LLLLL';
      }

      return {
        ...team,
        currentStreak,
        streakType,
        form: form.slice(0, Math.min(5, totalGames)),
        goalsFor,
        goalsAgainst,
        goalDifference,
        played: totalGames
      };
    });

    const sortedTeams = enhancedTeams.sort((a, b) => {
      const aPoints = a.points || 0;
      const bPoints = b.points || 0;
      const aWins = a.wins || 0;
      const bWins = b.wins || 0;
      const aLosses = a.losses || 0;
      const bLosses = b.losses || 0;
      const aGoalDiff = a.goalDifference || 0;
      const bGoalDiff = b.goalDifference || 0;

      if (bPoints !== aPoints) return bPoints - aPoints;
      if (bGoalDiff !== aGoalDiff) return bGoalDiff - aGoalDiff;
      if (bWins !== aWins) return bWins - aWins;
      return aLosses - bLosses;
    });

    res.json(sortedTeams);
  } catch (error) {
    console.error("Error fetching standings:", error);
    next(error);
  }
});

router.get('/teams/:division', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division parameter" });
    }

    let teamsInDivision = await storage.teams.getTeamsByDivision(division); // Use teamStorage

    if (teamsInDivision.length === 0) {
      await createAITeamsForDivision(division);
      teamsInDivision = await storage.teams.getTeamsByDivision(division); // Use teamStorage
    }

    const teamsWithPower = await Promise.all(teamsInDivision.map(async (team) => {
      const teamPlayers = await storage.players.getPlayersByTeamId(team.id); // Use playerStorage
      const teamPower = calculateTeamPower(teamPlayers);
      return { ...team, teamPower };
    }));

    res.json(teamsWithPower);
  } catch (error) {
    console.error("Error fetching division teams:", error);
    next(error);
  }
});

router.post('/create-ai-teams', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { division = 8, count = 15 } = req.body;

    const aiTeamBaseNames = gameConfig.aiTeamNames;
    const createdTeams = [];

    for (let i = 0; i < count; i++) {
      const teamName = aiTeamBaseNames[i % aiTeamBaseNames.length] + ` ${Math.floor(Math.random() * 1000)}`;

      const aiUser = await userStorage.upsertUser({ // Use userStorage
        userId: `ai-user-${Date.now()}-${i}`,
        email: `ai${i}-${Date.now()}@realm-rivalry.com`,
        firstName: `AI`,
        lastName: `Coach ${i + 1}`,
        profileImageUrl: null
      });

      // AI user created successfully

      const team = await storage.teams.createTeam({ // Use teamStorage
        name: teamName,
        userId: aiUser.userId,
        division: division,
        wins: Math.floor(Math.random() * 5),
        losses: Math.floor(Math.random() * 5),
        draws: Math.floor(Math.random() * 2),
        points: 0,
        teamPower: 60 + Math.floor(Math.random() * 20)
      });
      const calculatedPoints = (team.wins || 0) * 3 + (team.draws || 0);
      await storage.teams.updateTeam(team.id, { points: calculatedPoints }); // Use teamStorage

      // storage.teams.createTeam handles default finances
      // await teamFinancesStorage.createTeamFinances({ // Use teamFinancesStorage
      //   teamId: team.id,
      //   credits: 100000 + Math.floor(Math.random() * 100000),
      //   season: 1
      // });

      const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
      for (let j = 0; j < 12; j++) {
        const race = races[Math.floor(Math.random() * races.length)];
        await storage.players.createPlayer(generateRandomPlayer("AI Player", race, team.id)); // Use playerStorage
      }
      createdTeams.push(team);
    }

    res.status(201).json({
      message: `Created ${createdTeams.length} AI teams for Division ${division}`,
      teams: createdTeams.map(t => ({ id: t.id, name: t.name, division: t.division }))
    });
  } catch (error) {
    console.error("Error creating AI teams:", error);
    next(error);
  }
});

// Scheduling routes
router.get('/next-slot', isAuthenticated, (req: Request, res: Response) => {
  try {
    const nextSlot = getNextLeagueGameSlot();
    res.json({
      nextSlot: nextSlot ? formatEasternTime(nextSlot) : null,
      nextSlotDate: nextSlot,
      isWithinWindow: isWithinSchedulingWindow(),
      schedulingWindow: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 Eastern`
    });
  } catch (error) {
    console.error("Error getting next league slot:", error);
    res.status(500).json({ message: "Failed to get next league slot" });
  }
});

router.post('/schedule', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { numberOfGames, startDate } = req.body;
    if (numberOfGames && (typeof numberOfGames !== 'number' || numberOfGames <= 0 || numberOfGames > 100)) {
        return res.status(400).json({ message: "Invalid number of games (must be 1-100)." });
    }
    if (startDate && isNaN(new Date(startDate).getTime())) {
        return res.status(400).json({ message: "Invalid start date." });
    }

    const games = numberOfGames || 1;
    const schedule = generateLeagueGameSchedule(games, startDate ? new Date(startDate) : undefined);

    res.json({
      schedule: schedule.map(date => ({
        scheduledTime: formatEasternTime(date),
        scheduledDate: date,
        isWithinWindow: true
      })),
      totalGames: games,
      schedulingWindow: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 Eastern`
    });
  } catch (error) {
    console.error("Error generating league schedule:", error);
    res.status(500).json({ message: "Failed to generate league schedule" });
  }
});

router.get('/daily-schedule', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await leagueStorage.getCurrentSeason(); // Use leagueStorage
    if (!currentSeason) {
      return res.json({ schedule: {}, totalDays: 17, currentDay: null, message: "No active season found." });
    }

    const allMatches = [];
    for (let division = 1; division <= 8; division++) {
      const divisionMatches = await matchStorage.getMatchesByDivision(division); // Use matchStorage
      allMatches.push(...divisionMatches);
    }

    const scheduleByDay: { [key: number]: any[] } = {};
    const currentDayFromSeason = (currentSeason as any).currentDay || 1;

    for (let day = 1; day <= 17; day++) {
      const dayMatches = allMatches.filter(match => match.gameDay === day);

      if (dayMatches.length > 0) {
        const dailyGameTimes = generateDailyGameTimes(day);

        scheduleByDay[day] = dayMatches.slice(0, 4).map((match, index) => ({
          ...match,
          homeTeamName: match.homeTeamName || "Home",
          awayTeamName: match.awayTeamName || "Away",
          scheduledTime: dailyGameTimes[index % dailyGameTimes.length],
          scheduledTimeFormatted: formatEasternTime(dailyGameTimes[index % dailyGameTimes.length]),
          isLive: match.status === 'live',
          canWatch: match.status === 'live' || match.status === 'completed'
        }));
      } else {
        scheduleByDay[day] = [];
      }
    }

    res.json({
      schedule: scheduleByDay,
      totalDays: 17,
      currentDay: currentDayFromSeason
    });
  } catch (error) {
    console.error("Error getting daily schedule:", error);
    next(error);
  }
});

export default router;
