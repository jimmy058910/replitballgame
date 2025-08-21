import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
// playerStorage imported via storage index
import { userStorage } from '../storage/userStorage.js';
import { teamFinancesStorage } from '../storage/teamFinancesStorage.js';
import { leagueStorage } from '../storage/leagueStorage.js'; // For currentSeason
import { matchStorage } from '../storage/matchStorage.js'; // For getMatchesByDivision
import { seasonStorage } from '../storage/seasonStorage.js'; // For getCurrentSeason
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import {
  generateLeagueGameSchedule,
  generateDailyGameTimes,
  getNextLeagueGameSlot,
  isWithinSchedulingWindow,
  formatEasternTime,
  LEAGUE_GAME_START_HOUR,
  LEAGUE_GAME_END_HOUR
} from "../../shared/timezone.js";
import { generateRandomPlayer } from '../services/leagueService.js';
import { generateRandomName } from "../../shared/names.js";
import gameConfig from "../config/game_config.json" with { type: "json" };
// import { ABILITIES, rollForAbility } from "../../shared/abilities.js"; // Only if used directly in AI team gen

const router = Router();

/**
 * Generate late signup schedule for Division 8 teams - Days 6-14 only
 */
async function generateLateSignupScheduleForTeam(userTeam: any, currentDay: number, currentSeason: any): Promise<any> {
  console.log('🎯 [LATE SIGNUP SCHEDULE] Generating for team:', userTeam.name, 'in subdivision:', userTeam.subdivision);
  
  // Get all matches for the user's Division 8 subdivision
  const prisma = await getPrismaClient();
  const subdivisionTeams = await prisma.team.findMany({
    where: { 
      division: 8,
      subdivision: userTeam.subdivision 
    },
    select: { id: true, name: true }
  });
  
  const subdivisionTeamIds = subdivisionTeams.map(team => team.id);
  
  // Get matches only for Days 6-14 (late signup period)
  const matches = await prisma.game.findMany({
    where: {
      matchType: 'LEAGUE',
      OR: [
        { homeTeamId: { in: subdivisionTeamIds } },
        { awayTeamId: { in: subdivisionTeamIds } }
      ],
      // Filter by date range - Days 6-14 
      gameDate: {
        gte: getDateForDay(currentSeason, 6), // Start Day 6
        lt: getDateForDay(currentSeason, 15) // Include all of Day 14 (less than Day 15)
      }
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } }
    },
    orderBy: { gameDate: 'asc' }
  });
  
  console.log('🎯 [LATE SIGNUP SCHEDULE] Found', matches.length, 'matches for Days 6-14');
  
  // Group matches by day
  const schedule: any = {};
  const startDate = currentSeason.startDate || new Date('2025-08-16');
  
  // Initialize all days 6-14
  for (let day = 6; day <= 14; day++) {
    schedule[day] = [];
  }
  
  // Process matches and assign to correct days
  matches.forEach(match => {
    const daysSinceStart = Math.floor((match.gameDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayNumber = daysSinceStart + 1;
    
    // Only include Days 6-14
    if (dayNumber >= 6 && dayNumber <= 14) {
      const formattedMatch = {
        id: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        gameDate: match.gameDate,
        scheduledTime: match.gameDate.toISOString(),
        scheduledTimeFormatted: formatGameTime(match.gameDate),
        matchType: match.matchType,
        status: 'SCHEDULED', // FIXED: Force all late signup matches to SCHEDULED status
        simulated: match.simulated || false,
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0
      };
      
      if (!schedule[dayNumber]) {
        schedule[dayNumber] = [];
      }
      schedule[dayNumber].push(formattedMatch);
    }
  });
  
  console.log('🎯 [LATE SIGNUP SCHEDULE] Schedule organized by days:', Object.keys(schedule).map(day => `Day ${day}: ${schedule[day].length} games`).join(', '));
  
  // CRITICAL FIX: Check if schedule is incomplete and force regeneration
  const totalGames = Object.values(schedule).flat().length;
  const expectedGames = 36; // 9 days × 4 games per day for 8 teams
  
  if (totalGames < expectedGames) {
    console.log('⚠️ [INCOMPLETE SCHEDULE] Detected incomplete schedule:', totalGames, '/', expectedGames, 'games');
    console.log('🔄 [FORCE REGENERATION] Clearing existing games and regenerating complete schedule...');
    
    // Clear existing games for this subdivision
    await prisma.game.deleteMany({
      where: {
        matchType: 'LEAGUE',
        OR: [
          { homeTeamId: { in: subdivisionTeamIds } },
          { awayTeamId: { in: subdivisionTeamIds } }
        ]
      }
    });
    
    // Force regeneration with corrected patterns
    const { LateSignupService } = await import('../services/lateSignupService.js');
    await LateSignupService.generateShortenedSeasonSchedule(userTeam.subdivision, subdivisionTeams);
    
    console.log('✅ [FORCE REGENERATION] Schedule regenerated - fetching updated games...');
    
    // Fetch ALL games for this subdivision and filter in JavaScript to ensure Day 14 games are included
    const allSubdivisionMatches = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        OR: [
          { homeTeamId: { in: subdivisionTeamIds } },
          { awayTeamId: { in: subdivisionTeamIds } }
        ]
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`🔍 [ALL GAMES DEBUG] Found ${allSubdivisionMatches.length} total subdivision games`);
    
    // Filter for Days 6-14 in JavaScript to ensure Day 14 games are included
    const regeneratedMatches = allSubdivisionMatches.filter(match => {
      const baseDate = new Date('2025-08-16T00:00:00.000Z'); // Day 1
      const daysSinceStart = Math.floor((match.gameDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysSinceStart + 1;
      const isInRange = dayNumber >= 6 && dayNumber <= 14;
      
      if (isInRange) {
        console.log(`🔍 [FILTER DEBUG] Game ${match.id}: gameDate=${match.gameDate.toISOString()}, dayNumber=${dayNumber} - INCLUDED`);
      }
      
      return isInRange;
    });
    
    // Rebuild schedule with regenerated games
    const newSchedule: any = {};
    for (let day = 6; day <= 14; day++) {
      newSchedule[day] = [];
    }
    
    regeneratedMatches.forEach(match => {
      const daysSinceStart = Math.floor((match.gameDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysSinceStart + 1;
      
      console.log(`🔍 [DEBUG] Game ${match.id}: gameDate=${match.gameDate.toISOString()}, startDate=${startDate.toISOString()}, daysSinceStart=${daysSinceStart}, dayNumber=${dayNumber}`);
      
      if (dayNumber >= 6 && dayNumber <= 14) {
        const formattedMatch = {
          id: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          gameDate: match.gameDate,
          scheduledTime: match.gameDate.toISOString(),
          scheduledTimeFormatted: formatGameTime(match.gameDate),
          matchType: match.matchType,
          status: 'SCHEDULED', // FIXED: Force regenerated matches to SCHEDULED status
          simulated: match.simulated || false,
          homeScore: match.homeScore || 0,
          awayScore: match.awayScore || 0
        };
        
        if (!newSchedule[dayNumber]) {
          newSchedule[dayNumber] = [];
        }
        newSchedule[dayNumber].push(formattedMatch);
      }
    });
    
    console.log('🎯 [REGENERATED] Final schedule:', Object.keys(newSchedule).map(day => `Day ${day}: ${newSchedule[day].length} games`).join(', '));
    
    return {
      schedule: newSchedule,
      currentDay,
      totalDays: 17,
      lateSignup: true,
      gameRange: 'Days 6-14 (Late Signup)',
      message: `Complete late signup schedule - ${Object.values(newSchedule).flat().length} total games from Days 6-14 (REGENERATED)`
    };
  }
  
  return {
    schedule,
    currentDay,
    totalDays: 17,
    lateSignup: true,
    gameRange: 'Days 6-14 (Late Signup)',
    message: `Late signup schedule - ${Object.values(schedule).flat().length} total games from Days 6-14`
  };
}

/**
 * Get date for a specific day in the season - FIXED to return midnight dates
 */
function getDateForDay(season: any, dayNumber: number): Date {
  // Ensure we start with a clean midnight date
  const baseDate = new Date('2025-08-16T00:00:00.000Z'); // Day 1 at midnight UTC
  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + (dayNumber - 1));
  return targetDate;
}

/**
 * Format game time to Eastern Time - CORRECTED for proper UTC to EDT conversion
 */
function formatGameTime(date: Date): string {
  // Direct conversion from UTC to Eastern Time
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

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

    if (!aiUser) {
      console.log(`❌ Failed to create AI user for division ${division}, team ${i}`);
      continue;
    }

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

    const { generateRandomName } = await import("../../shared/names.js");

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
      const currentCount = requiredPositions.filter((p: any) => p === position).length;
      
      // Prevent overstocking: max 3 passers, max 4 runners, max 4 blockers
      if ((position === "Passer" && currentCount >= 3) ||
          (position === "Runner" && currentCount >= 4) ||
          (position === "Blocker" && currentCount >= 4)) {
        // Try other positions
        const alternatives = additionalPositions.filter((p: any) => {
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
    .sort((a: any, b: any) => b.individualPower - a.individualPower)
    .slice(0, 9);
  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}


// League routes
router.get('/:division/standings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  console.log(`\n🏆 [STANDINGS API] ========== REQUEST RECEIVED ==========`);
  console.log(`🔍 [STANDINGS API] Division: ${req.params.division}`);
  console.log(`🔍 [STANDINGS API] User: ${req.user?.claims?.sub}`);
  console.log(`🔍 [STANDINGS API] Headers: ${JSON.stringify(req.headers.authorization?.substring(0, 50))}`);
  
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      console.log(`❌ [STANDINGS API] Invalid division: ${req.params.division}`);
      return res.status(400).json({ message: "Invalid division parameter" });
    }
    
    // Get the user's team to determine their subdivision
    const userId = req.user?.claims?.sub;
    if (!userId) {
      console.log(`❌ [STANDINGS API] No userId in token`);
      return res.status(401).json({ message: "Authentication required" });
    }
    
    console.log(`🔍 [STANDINGS API] Looking for team with userId: ${userId}`);
    
    let userTeam = await storage.teams.getTeamByUserId(userId);
    let userSubdivision = userTeam?.subdivision || 'main'; // Default to main where teams exist
    
    console.log(`🔍 [STANDINGS API] User team found:`, {
      teamFound: !!userTeam,
      teamName: userTeam?.name,
      teamId: userTeam?.id,
      teamDivision: userTeam?.division,
      teamSubdivision: userTeam?.subdivision,
      defaultSubdivision: userSubdivision
    });
    
    // FLEXIBLE USER MATCHING: If no team found, try to find any team in main subdivision
    // This handles authentication mismatches during development
    if (!userTeam) {
      console.log(`⚠️ [STANDINGS API] No team found for userId ${userId}, checking main subdivision`);
      const teamsInMain = await storage.teams.getTeamsByDivisionAndSubdivision(division, 'main');
      if (teamsInMain.length > 0) {
        console.log(`✅ [STANDINGS API] Found ${teamsInMain.length} teams in main subdivision`);
        userSubdivision = 'main';
      }
    }
    
    // Only get teams from the user's subdivision
    console.log(`🔍 [STANDINGS DEBUG] About to query with subdivision: "${userSubdivision}"`);
    let teamsInDivision = await storage.teams.getTeamsByDivisionAndSubdivision(division, userSubdivision);
    console.log(`🔍 [STANDINGS DEBUG] Query returned ${teamsInDivision.length} teams for subdivision: "${userSubdivision}"`);

    if (teamsInDivision.length === 0) {
      await createAITeamsForDivision(division);
      teamsInDivision = await storage.teams.getTeamsByDivisionAndSubdivision(division, userSubdivision);
    }

    // CRITICAL: Hard cap at exactly 8 teams per subdivision
    if (teamsInDivision.length > 8) {
      console.log(`⚠️ [STANDINGS API] Found ${teamsInDivision.length} teams in subdivision, limiting to 8`);
      teamsInDivision = teamsInDivision.slice(0, 8);
    }
    
    console.log(`✅ Found ${teamsInDivision.length} teams in Division ${division}`);
    console.log(`✅ Returning standings for ${teamsInDivision.length} teams: [${teamsInDivision.map(t => `'${t.name}'`).join(', ')}]`);

    // Get all completed league matches for this division to calculate real goals
    const prisma = await getPrismaClient();
    const completedMatches = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        status: 'COMPLETED',
        OR: [
          { homeTeamId: { in: teamsInDivision.map((t: any) => t.id) } },
          { awayTeamId: { in: teamsInDivision.map((t: any) => t.id) } }
        ]
      }
    });

    // Enhanced standings with streak and additional stats
    const enhancedTeams = teamsInDivision.map((team) => {
      // Calculate REAL score totals from actual completed matches (using "scores" not "goals")
      let totalScores = 0;
      let scoresAgainst = 0;
      
      completedMatches.forEach((match: any) => {
        if (match.homeTeamId === team.id) {
          totalScores += match.homeScore || 0;
          scoresAgainst += match.awayScore || 0;
        } else if (match.awayTeamId === team.id) {
          totalScores += match.awayScore || 0; 
          scoresAgainst += match.homeScore || 0;
        }
      });
      
      const scoreDifference = totalScores - scoresAgainst;
      
      // Calculate current streak based on recent form
      const wins = team.wins || 0;
      const losses = team.losses || 0;
      // Calculate draws from points since draws field doesn't exist in database
      // Formula: draws = (total_points - wins*3) / 1
      const totalPoints = team.points || 0;
      const draws = Math.max(0, totalPoints - (wins * 3));
      
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
        draws: draws, // Use calculated draws value
        currentStreak,
        streakType,
        form: form.slice(0, Math.min(5, totalGames)),
        totalScores, // TS column
        scoresAgainst, // SA column  
        scoreDifference, // SD column (TS - SA)
        played: totalGames
      };
    });

    const sortedTeams = enhancedTeams.sort((a: any, b: any) => {
      const aPoints = a.points || 0;
      const bPoints = b.points || 0;
      const aWins = a.wins || 0;
      const bWins = b.wins || 0;
      const aLosses = a.losses || 0;
      const bLosses = b.losses || 0;
      const aScoreDiff = a.scoreDifference || 0;
      const bScoreDiff = b.scoreDifference || 0;

      if (bPoints !== aPoints) return bPoints - aPoints;
      if (bScoreDiff !== aScoreDiff) return bScoreDiff - aScoreDiff;
      if (bWins !== aWins) return bWins - aWins;
      return aLosses - bLosses;
    });

    console.log(`✅ [STANDINGS API] Returning enhanced standings:`, {
      count: sortedTeams.length,
      subdivision: userSubdivision,
      teams: sortedTeams.map(t => ({ 
        id: t.id, 
        name: t.name, 
        points: t.points, 
        wins: t.wins, 
        losses: t.losses,
        subdivision: t.subdivision 
      }))
    });
    console.log(`🏆 [STANDINGS API] ========== REQUEST COMPLETE ==========\n`);
    res.json(sortedTeams);
  } catch (error) {
    console.error('❌ [STANDINGS API] ERROR:', error);
    console.log(`💥 [STANDINGS API] ========== REQUEST FAILED ==========\n`);
    next(error);
  }
});


router.get('/teams/:division', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/create-ai-teams', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

      if (!aiUser) {
        console.log(`❌ Failed to create AI user for team ${i}`);
        continue;
      }
      
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
      teams: createdTeams.map((t: any) => ({ id: t.id, name: t.name, division: t.division }))
    });
  } catch (error) {
    console.error("Error creating AI teams:", error);
    next(error);
  }
});

// Scheduling routes
router.get('/next-slot', requireAuth, (req: Request, res: Response) => {
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

router.post('/schedule', requireAuth, (req: Request, res: Response) => {
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

router.get('/daily-schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get current season from database to get the actual currentDay
    const currentSeason = await seasonStorage.getCurrentSeason(); // Use seasonStorage
    let currentDayInCycle = 5; // Default fallback
    
    console.log('🔍 [LEAGUE ROUTES] Season data:', { 
      currentDay: currentSeason?.currentDay, 
      type: typeof currentSeason?.currentDay,
      fullSeason: currentSeason 
    });
    
    if (currentSeason && typeof currentSeason.currentDay === 'number') {
      currentDayInCycle = currentSeason.currentDay;
      console.log('✅ [LEAGUE ROUTES] Using database value:', currentDayInCycle);
    } else {
      // Fallback to calculation if no database value
      const startDate = new Date("2025-07-13");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDayInCycle = (daysSinceStart % 17) + 1;
      console.log('⚠️ [LEAGUE ROUTES] Using calculated value:', { currentDayInCycle, daysSinceStart });
    }

    if (!currentSeason) {
      return res.json({ schedule: {}, totalDays: 17, currentDay: currentDayInCycle, message: "No active season found." });
    }

    // Get user's team to determine their subdivision
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
      return res.json({ schedule: {}, totalDays: 17, currentDay: null, message: "No team found." });
    }

    // CRITICAL FIX: Check if user is in Division 8 (late signup division)
    if (userTeam.division === 8) {
      console.log('🎯 [LATE SIGNUP] User team is in Division 8 - generating shortened schedule for Days 6-14');
      
      // Import late signup service
      const { LateSignupService } = await import('../services/lateSignupService.js');
      
      // Generate/get late signup schedule for Days 6-14
      const lateSignupSchedule = await generateLateSignupScheduleForTeam(userTeam, currentDayInCycle, currentSeason);
      
      console.log('✅ [LATE SIGNUP] Generated schedule:', { 
        totalGames: Object.values(lateSignupSchedule.schedule).flat().length,
        dayRange: Object.keys(lateSignupSchedule.schedule).join('-'),
        currentDay: currentDayInCycle 
      });
      
      return res.json(lateSignupSchedule);
    }

    // Get all matches for the user's division and subdivision
    const divisionMatches = await matchStorage.getMatchesByDivision(userTeam.division as any);
    
    // ✅ CRITICAL FIX: Filter out exhibition games - only show league games
    const leagueMatches = divisionMatches.filter((match: any) => match.matchType === 'LEAGUE');
    
    // Get all teams in the user's subdivision
    const prisma = await getPrismaClient();
    const subdivisionTeams = await prisma.team.findMany({
      where: { 
        division: userTeam.division,
        subdivision: userTeam.subdivision 
      },
      select: { id: true }
    });
    
    const subdivisionTeamIds = subdivisionTeams.map((team: any) => team.id);

    // Show user's team games + fill to exactly 4 games per day
    const userTeamMatches = leagueMatches.filter((match: any) => 
      Number(match.homeTeamId) === Number(userTeam.id) || Number(match.awayTeamId) === Number(userTeam.id)
    );
    
    // Filter other matches to only include games within the user's subdivision
    const otherMatches = leagueMatches.filter((match: any) => {
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
    teams.forEach((team: { id: number; name: string }) => {
      teamNamesMap.set(Number(team.id), team.name);
    });

    const scheduleByDay: { [key: number]: any[] } = {};

    // Day 5 = Aug 20th (today), Day 6 = Aug 21st, etc.
    // Database games are Aug 24-Sep 2, so they should map to Days 9-18
    for (let day = 1; day <= 17; day++) {
      const dayMatches = allMatches.filter((match: any) => {
        if (match.gameDate) {
          const gameDate = new Date(match.gameDate);
          const gameDateUTC = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
          
          // Day 5 = Aug 20th, so calculate from that base
          const day5Date = new Date("2025-08-20"); // Day 5 = Aug 20th (today)
          const day5DateUTC = new Date(day5Date.getFullYear(), day5Date.getMonth(), day5Date.getDate());
          const daysDiff = Math.floor((gameDateUTC.getTime() - day5DateUTC.getTime()) / (1000 * 60 * 60 * 24));
          const gameDayInSchedule = daysDiff + 5; // Aug 20th = Day 5
          
          console.log(`🎯 [SCHEDULE] Game ${match.id} on ${gameDate.toDateString()} = Day ${gameDayInSchedule}`);
          
          return gameDayInSchedule === day;
        }
        return false;
      });

      if (dayMatches.length > 0) {
        // Ensure exactly 4 games per day: user's team games first, then fill to 4 total
        const userTeamDayMatches = dayMatches.filter((match: any) => 
          Number(match.homeTeamId) === Number(userTeam.id) || Number(match.awayTeamId) === Number(userTeam.id)
        );
        const otherDayMatches = dayMatches.filter((match: any) => {
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
          status: match.status || 'SCHEDULED', // Keep original logic for regular schedule
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
router.post('/fix-team-players/:teamId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/update-subdivision/:teamId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/fix-existing-players/:teamId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/create-additional-teams', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
      
      if (!aiUser) {
        console.log(`❌ Failed to create AI user for ${teamName}`);
        continue;
      }
      
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
router.get('/:division/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division parameter" });
    }

    // Get teams in this division to filter matches
    const teamsInDivision = await storage.teams.getTeamsByDivision(division);
    const teamIds = teamsInDivision.map((team: any) => team.id);

    // Get all league matches involving teams in this division
    const prisma = await getPrismaClient();
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
    const scheduleMatches = matches.map((match: any) => ({
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

// Admin endpoint to move Storm Breakers to beta subdivision
router.post('/admin/move-storm-breakers', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔧 [ADMIN] Moving Storm Breakers 346 to beta subdivision...');
    
    const prisma = await getPrismaClient();
    
    // Find Storm Breakers 346
    const stormBreakers = await prisma.team.findFirst({
      where: {
        name: 'Storm Breakers 346',
        division: 8
      }
    });
    
    if (!stormBreakers) {
      return res.status(404).json({ message: 'Storm Breakers 346 not found' });
    }
    
    console.log(`📍 Found Storm Breakers 346 in subdivision: ${stormBreakers.subdivision}`);
    
    // Move to beta subdivision
    const updatedTeam = await prisma.team.update({
      where: { id: stormBreakers.id },
      data: { subdivision: 'beta' }
    });
    
    console.log(`✅ Moved Storm Breakers 346 from '${stormBreakers.subdivision}' to '${updatedTeam.subdivision}'`);
    
    // Get updated counts
    const alphaCount = await prisma.team.count({
      where: { division: 8, subdivision: 'alpha' }
    });
    
    const betaCount = await prisma.team.count({
      where: { division: 8, subdivision: 'beta' }
    });
    
    res.json({
      success: true,
      message: `Storm Breakers 346 moved to ${updatedTeam.subdivision} subdivision`,
      counts: {
        alpha: alphaCount,
        beta: betaCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error moving Storm Breakers:', error);
    next(error);
  }
});

// SCHEDULE GENERATION ENDPOINT
router.post('/generate-schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔧 === GENERATING COMPLETE SCHEDULE ===');
    
    const prisma = await getPrismaClient();
    
    // Get all teams in Division 8, Subdivision Alpha
    const teams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Found ${teams.length} teams:`, teams.map(t => t.name));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, found ${teams.length}`);
    }
    
    // Clear existing games
    console.log('🧹 Clearing existing games...');
    const deletedGames = await prisma.game.deleteMany();
    console.log(`✅ Deleted ${deletedGames.count} existing games`);
    
    // Generate correct schedule: Days 5-14 (10 days)
    console.log('⚽ Generating schedule for Days 5-14...');
    
    const scheduledGames = [];
    const baseDate = new Date("2025-08-20");
    
    // For each day (Days 5-14)
    for (let day = 5; day <= 14; day++) {
      console.log(`📅 Generating Day ${day}...`);
      
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() + day - 1);
      
      // Create 4 matches where each team plays once
      // With 8 teams, we need to pair them: [1v2, 3v4, 5v6, 7v8]
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      
      const dayMatches = [];
      for (let i = 0; i < 8; i += 2) {
        dayMatches.push({
          home: shuffledTeams[i],
          away: shuffledTeams[i + 1]
        });
      }
      
      console.log(`  Day ${day} matches:`, dayMatches.map(m => `${m.home.name} vs ${m.away.name}`));
      
      // Schedule the 4 matches with correct times
      for (let timeSlot = 0; timeSlot < dayMatches.length; timeSlot++) {
        const match = dayMatches[timeSlot];
        
        // Times: 4:00, 4:15, 4:30, 4:45 PM EDT
        const matchDate = new Date(gameDate);
        const startHour = 16; // 4 PM
        const startMinute = timeSlot * 15; // 0, 15, 30, 45 minutes
        
        matchDate.setHours(startHour, startMinute, 0, 0);
        
        const gameData = {
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          gameDate: matchDate,
          matchType: 'LEAGUE' as const,
          status: 'SCHEDULED' as const,
          homeScore: 0,
          awayScore: 0
        };
        
        const createdGame = await prisma.game.create({ data: gameData });
        scheduledGames.push(createdGame);
        
        console.log(`    ✅ ${match.home.name} vs ${match.away.name} at ${matchDate.toLocaleString()}`);
      }
    }
    
    console.log(`✅ SCHEDULE GENERATION COMPLETE`);
    console.log(`📊 Total games created: ${scheduledGames.length}`);
    console.log(`📅 Days covered: 5-14 (10 days)`);
    console.log(`⏰ Times: 4:00, 4:15, 4:30, 4:45 PM EDT each day`);
    
    res.json({
      success: true,
      gamesCreated: scheduledGames.length,
      message: `Successfully generated ${scheduledGames.length} games for Days 5-14`,
      schedule: scheduledGames.map(g => ({
        id: g.id,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        gameDate: g.gameDate,
        matchType: g.matchType,
        status: g.status
      }))
    });
    
  } catch (error) {
    console.error('❌ Schedule generation failed:', error);
    next(error);
  }
});

export default router;
