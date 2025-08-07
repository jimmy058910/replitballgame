import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
// playerStorage imported via storage index
import { userStorage } from "../storage/userStorage";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { leagueStorage } from "../storage/leagueStorage"; // For currentSeason
import { matchStorage } from "../storage/matchStorage"; // For getMatchesByDivision
import { seasonStorage } from "../storage/seasonStorage"; // For getCurrentSeason
import { isAuthenticated } from "../googleAuth";
import { prisma } from "../db";
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
import { generateRandomName } from "@shared/names";
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
    });

    // storage.teams.createTeam should handle default finances, but if specific AI finances
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

      const { firstName, lastName } = generateRandomName(playerRace.toLowerCase());
      const playerData = generateRandomPlayer(
        `${firstName} ${lastName}`,
        playerRace.toLowerCase(),
        team.id,
        position
      );
      await storage.players.createPlayer({
        ...playerData,
        teamId: team.id,
      } as any);
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
    
    // Get the user's team to determine their subdivision
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    const userSubdivision = userTeam?.subdivision || 'eta';
    
    // Only get teams from the user's subdivision
    let teamsInDivision = await storage.teams.getTeamsByDivisionAndSubdivision(division, userSubdivision);

    if (teamsInDivision.length === 0) {
      await createAITeamsForDivision(division);
      teamsInDivision = await storage.teams.getTeamsByDivisionAndSubdivision(division, userSubdivision);
    }

    // Get all completed league matches for this division to calculate real goals
    const completedMatches = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        status: 'COMPLETED',
        OR: [
          { homeTeamId: { in: teamsInDivision.map(t => t.id) } },
          { awayTeamId: { in: teamsInDivision.map(t => t.id) } }
        ]
      }
    });

    // Enhanced standings with streak and additional stats
    const enhancedTeams = teamsInDivision.map((team) => {
      // Calculate REAL goal difference from actual completed matches
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      completedMatches.forEach(match => {
        if (match.homeTeamId === team.id) {
          goalsFor += match.homeScore || 0;
          goalsAgainst += match.awayScore || 0;
        } else if (match.awayTeamId === team.id) {
          goalsFor += match.awayScore || 0; 
          goalsAgainst += match.homeScore || 0;
        }
      });
      
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
        draws: draws || 0, // Ensure draws is returned as a number
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
      });

      // storage.teams.createTeam handles default finances
      // await teamFinancesStorage.createTeamFinances({ // Use teamFinancesStorage
      //   teamId: team.id,
      //   credits: 100000 + Math.floor(Math.random() * 100000),
      //   season: 1
      // });

      const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
      const positions = ["PASSER", "RUNNER", "BLOCKER"];
      for (let j = 0; j < 12; j++) {
        const race = races[Math.floor(Math.random() * races.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        // Generate proper names instead of "AI Player" 
        const { firstName, lastName } = generateRandomName(race.toLowerCase());
        const playerData = generateRandomPlayer(
            `${firstName} ${lastName}`,
            race.toLowerCase(),
            team.id,
            position
        );
        await storage.players.createPlayer({
            ...playerData,
            teamId: team.id,
        } as any);
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
    // Get current season from database to get the actual currentDay
    const currentSeason = await seasonStorage.getCurrentSeason(); // Use seasonStorage
    let currentDayInCycle = 5; // Default fallback
    
    if (currentSeason && typeof currentSeason.currentDay === 'number') {
      currentDayInCycle = currentSeason.currentDay;
    } else {
      // Fallback to calculation if no database value
      const startDate = new Date("2025-07-13");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDayInCycle = (daysSinceStart % 17) + 1;
    }

    if (!currentSeason) {
      return res.json({ schedule: {}, totalDays: 17, currentDay: currentDayInCycle, message: "No active season found." });
    }

    // Get user's team to determine their subdivision
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userTeam = await prisma.team.findFirst({
      where: { userProfileId: req.user.claims.sub },
      select: { id: true, division: true, subdivision: true }
    });

    if (!userTeam) {
      return res.json({ schedule: {}, totalDays: 17, currentDay: null, message: "No team found." });
    }

    // Get all matches for the user's division and subdivision
    const divisionMatches = await matchStorage.getMatchesByDivision(userTeam.division as any);
    
    // ✅ CRITICAL FIX: Filter out exhibition games - only show league games
    const leagueMatches = divisionMatches.filter(match => match.matchType === 'LEAGUE');
    
    // Get all teams in the user's subdivision
    const subdivisionTeams = await prisma.team.findMany({
      where: { 
        division: userTeam.division,
        subdivision: userTeam.subdivision 
      },
      select: { id: true }
    });
    
    const subdivisionTeamIds = subdivisionTeams.map(team => team.id);

    // Show user's team games + fill to exactly 4 games per day
    const userTeamMatches = leagueMatches.filter(match => 
      Number(match.homeTeamId) === Number(userTeam.id) || Number(match.awayTeamId) === Number(userTeam.id)
    );
    
    // Filter other matches to only include games within the user's subdivision
    const otherMatches = leagueMatches.filter(match => {
      const isNotUserTeam = Number(match.homeTeamId) !== Number(userTeam.id) && Number(match.awayTeamId) !== Number(userTeam.id);
      const bothTeamsInSubdivision = subdivisionTeamIds.includes(Number(match.homeTeamId)) && subdivisionTeamIds.includes(Number(match.awayTeamId));
      return isNotUserTeam && bothTeamsInSubdivision;
    });
    
    const allMatches = [...userTeamMatches, ...otherMatches];
    


    // Look up team names for all matches
    const teamIds = new Set<number>();
    allMatches.forEach(match => {
      if (match.homeTeamId) teamIds.add(Number(match.homeTeamId));
      if (match.awayTeamId) teamIds.add(Number(match.awayTeamId));
    });

    const teams = await prisma.team.findMany({
      where: { id: { in: [...teamIds] } },
      select: { id: true, name: true }
    });

    const teamNamesMap = new Map();
    teams.forEach(team => {
      teamNamesMap.set(Number(team.id), team.name);
    });

    const scheduleByDay: { [key: number]: any[] } = {};

    for (let day = 1; day <= 14; day++) {
      const dayMatches = allMatches.filter(match => {
        if (match.gameDate) {
          // Use simple UTC date comparison for day calculation
          const gameDate = new Date(match.gameDate);
          const gameDateUTC = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
          const seasonStart = new Date("2025-07-13");
          const seasonStartUTC = new Date(seasonStart.getFullYear(), seasonStart.getMonth(), seasonStart.getDate());
          const daysDiff = Math.floor((gameDateUTC.getTime() - seasonStartUTC.getTime()) / (1000 * 60 * 60 * 24));
          const gameDayInCycle = (daysDiff % 17) + 1;
          

          
          return gameDayInCycle === day;
        }
        return false;
      });

      if (dayMatches.length > 0) {
        // Ensure exactly 4 games per day: user's team games first, then fill to 4 total
        const userTeamDayMatches = dayMatches.filter(match => 
          Number(match.homeTeamId) === Number(userTeam.id) || Number(match.awayTeamId) === Number(userTeam.id)
        );
        const otherDayMatches = dayMatches.filter(match => {
          const isNotUserTeam = Number(match.homeTeamId) !== Number(userTeam.id) && Number(match.awayTeamId) !== Number(userTeam.id);
          const bothTeamsInSubdivision = subdivisionTeamIds.includes(Number(match.homeTeamId)) && subdivisionTeamIds.includes(Number(match.awayTeamId));
          return isNotUserTeam && bothTeamsInSubdivision;
        });
        
        // Take user's team games + fill to 4 games total
        const limitedMatches = [...userTeamDayMatches, ...otherDayMatches].slice(0, 4);
        
        scheduleByDay[day] = limitedMatches.map((match, index) => ({
          id: match.id ? Number(match.id) : index,
          homeTeamId: match.homeTeamId ? Number(match.homeTeamId) : 0,
          awayTeamId: match.awayTeamId ? Number(match.awayTeamId) : 0,
          homeTeamName: teamNamesMap.get(match.homeTeamId) || "Home",
          awayTeamName: teamNamesMap.get(match.awayTeamId) || "Away",
          scheduledTime: match.gameDate ? new Date(match.gameDate) : new Date(),
          scheduledTimeFormatted: match.gameDate ? formatEasternTime(new Date(match.gameDate), 'h:mm A') : "TBD",
          isLive: match.status === 'IN_PROGRESS',
          canWatch: match.status === 'IN_PROGRESS' || match.status === 'COMPLETED',
          status: match.status || 'SCHEDULED',
          homeScore: match.homeScore,
          awayScore: match.awayScore
        }));
      } else {
        scheduleByDay[day] = [];
      }
    }

    res.json({
      schedule: scheduleByDay,
      totalDays: 17,
      currentDay: currentDayInCycle
    });
  } catch (error) {
    console.error("Error getting daily schedule:", error);
    next(error);
  }
});

// Utility endpoint to fix teams with missing players
router.post('/fix-team-players/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    
    // Get team info
    const team = await storage.teams.getTeamById(Number(teamId));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Check if team already has players
    const existingPlayers = await storage.players.getPlayersByTeamId(Number(teamId));
    if (existingPlayers.length > 0) {
      return res.status(400).json({ message: "Team already has players" });
    }
    
    // Generate players for the team with proper position distribution
    const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
    
    // Define required position distribution: 3 passers, 4 runners, 5 blockers
    const requiredPositions = [
      "PASSER", "PASSER", "PASSER", // 3 passers
      "RUNNER", "RUNNER", "RUNNER", "RUNNER", // 4 runners  
      "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER" // 5 blockers
    ];
    
    for (let j = 0; j < 12; j++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const position = requiredPositions[j];
      
      // Generate proper names instead of "AI Player"
      const { firstName, lastName } = generateRandomName(race.toLowerCase());
      const playerData = generateRandomPlayer(
        `${firstName} ${lastName}`,
        race.toLowerCase(),
        team.id,
        position
      );
      await storage.players.createPlayer({
        ...playerData,
        teamId: team.id,
      } as any);
    }
    
    res.json({ message: `Added 12 players to team ${team.name}` });
  } catch (error) {
    console.error("Error fixing team players:", error);
    next(error);
  }
});

// Utility endpoint to update team subdivision
router.post('/update-subdivision/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { subdivision } = req.body;
    
    // Get team info
    const team = await storage.teams.getTeamById(Number(teamId));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Update subdivision
    await storage.teams.updateTeam(Number(teamId), { subdivision });
    
    res.json({ message: `Updated team ${team.name} subdivision to ${subdivision}` });
  } catch (error) {
    console.error("Error updating team subdivision:", error);
    next(error);
  }
});

// Utility endpoint to fix existing players' names and positions  
router.post('/fix-existing-players/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    
    // Get team info
    const team = await storage.teams.getTeamById(Number(teamId));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Get existing players
    const players = await storage.players.getPlayersByTeamId(Number(teamId));
    if (players.length === 0) {
      return res.status(400).json({ message: "No players found for this team" });
    }
    
    // Define proper position distribution: 3 passers, 4 runners, 5 blockers
    const requiredPositions = [
      "PASSER", "PASSER", "PASSER", // 3 passers
      "RUNNER", "RUNNER", "RUNNER", "RUNNER", // 4 runners
      "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER" // 5 blockers
    ];
    
    const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
    
    // Update each player with proper name and position
    for (let i = 0; i < Math.min(players.length, 12); i++) {
      const player = players[i];
      const race = races[Math.floor(Math.random() * races.length)];
      const position = requiredPositions[i] || "RUNNER";
      
      // Generate proper race-appropriate name
      const { firstName, lastName } = generateRandomName(race.toLowerCase());
      
      // Update player with new name, race, and position
      await storage.players.updatePlayer(player.id, {
        firstName,
        lastName,
        race: race as any,
        role: position as any,
      });
    }
    
    res.json({ message: `Updated ${Math.min(players.length, 12)} players for team ${team.name}` });
  } catch (error) {
    console.error("Error fixing existing players:", error);
    next(error);
  }
});

// Create additional AI teams for balancing divisions
router.post('/create-additional-teams', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { count, subdivision } = req.body;
    const teamsToCreate = count || 5;
    const targetSubdivision = subdivision || "main";
    
    const aiTeamNames = gameConfig.aiTeamNames;
    const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
    
    for (let i = 0; i < teamsToCreate; i++) {
      const teamName = aiTeamNames[Math.floor(Math.random() * aiTeamNames.length)] + " " + Math.floor(Math.random() * 999);
      
      const aiUser = await userStorage.upsertUser({
        userId: `ai_user_${teamName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        email: `ai_${teamName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}@realmrivalry.ai`,
        firstName: "AI",
        lastName: "Team",
      });
      
      const newTeam = await storage.teams.createTeam({
        userId: aiUser.userId,
        name: teamName,
        division: 8,
        subdivision: targetSubdivision,
      });
      
      // Create players for the team
      const positions = ["PASSER", "PASSER", "PASSER", "RUNNER", "RUNNER", "RUNNER", "RUNNER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER"];
      
      for (let j = 0; j < 12; j++) {
        const race = races[Math.floor(Math.random() * races.length)];
        const position = positions[j];
        const { firstName, lastName } = generateRandomName(race.toLowerCase());
        const playerData = generateRandomPlayer(
            firstName,
            lastName,
            race.toLowerCase() as any
        );
        await storage.players.createPlayer({
            ...playerData,
            teamId: newTeam.id,
        } as any);
      }
    }
    
    res.json({ message: `Created ${teamsToCreate} additional AI teams in subdivision ${targetSubdivision}` });
  } catch (error) {
    console.error("Error creating additional teams:", error);
    next(error);
  }
});

// League schedule endpoint - frontend calls /api/leagues/{division}/schedule
router.get('/:division/schedule', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division parameter" });
    }

    // Get teams in this division to filter matches
    const teamsInDivision = await storage.teams.getTeamsByDivision(division);
    const teamIds = teamsInDivision.map(team => team.id);

    // Get all league matches involving teams in this division
    const matches = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } }
        ]
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    // Transform matches for frontend
    const scheduleMatches = matches.map(match => ({
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      status: match.status,
      gameDate: match.gameDate,
      matchType: match.matchType
    }));

    res.json(scheduleMatches);
  } catch (error) {
    console.error("Error fetching league schedule:", error);
    res.status(500).json({ message: "Failed to fetch league schedule" });
  }
});

export default router;
