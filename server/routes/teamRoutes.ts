import { Router, type Request, type Response, type NextFunction } from "express";

console.log('🔍 [teamRoutes.ts] Module loading...');
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod";
import { ErrorCreators, asyncHandler } from '../services/errorService.js';
import { getPrismaClient } from "../database.js";
import { TeamNameValidator } from '../services/teamNameValidation.js';
import { CamaraderieService } from '../services/camaraderieService.js';
import { cacheResponse } from "../middleware/cacheMiddleware.js";

const router = Router();

// Calculate team power from players
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: Math.round(((player.speed || 20) + (player.power || 20) + (player.agility || 20) + 
                                (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20) + 
                                (player.staminaAttribute || 20) + (player.leadership || 20)) / 8)
  }));

  const topPlayers = playersWithPower
    .sort((a: any, b: any) => b.individualPower - a.individualPower)
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}

// Team creation schema
const createTeamSchema = z.object({
  teamName: z.string().min(1).max(50),
  ndaAgreed: z.boolean().optional()
});

// Firebase test endpoint
router.get('/firebase-test', asyncHandler(async (req: Request, res: Response) => {
  const admin = await import('firebase-admin');
  
  const config = {
    firebaseAppsCount: admin.apps.length,
    projectId: admin.apps[0]?.options?.projectId || 'none',
    hasServiceAccount: !!admin.apps[0]?.options?.credential,
    nodeEnv: process.env.NODE_ENV,
    viteFirebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Firebase Admin SDK Configuration Check',
    config
  });
}));

// Get user's team - PRIMARY ROUTE (with auth)
router.get('/my', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/my route called!');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  const team = await storage.teams.getTeamByUserId(userId);
  
  if (!team) {
    console.log('❌ No team found for userId:', userId);
    return res.status(404).json({ 
      message: "Team not found", 
      needsTeamCreation: true 
    });
  }

  console.log('✅ Team found! playersCount:', team.playersCount, 'players.length:', team.players?.length);

  // Use team object directly (working approach from debug endpoint)  
  const teamPower = calculateTeamPower(team.players || []);
  
  // Calculate real-time camaraderie
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

  // Team object already has players with contracts from serializeTeamData()
  const serializedTeam = { 
    ...team, 
    teamPower, 
    teamCamaraderie 
  };

  if (serializedTeam.finances) {
    serializedTeam.finances = {
      ...serializedTeam.finances,
      credits: serializedTeam.finances.credits?.toString() || '0',
      gems: serializedTeam.finances.gems?.toString() || '0',
      escrowCredits: serializedTeam.finances.escrowCredits?.toString() || '0',
      escrowGems: serializedTeam.finances.escrowGems?.toString() || '0',
      projectedIncome: serializedTeam.finances.projectedIncome?.toString() || '0',
      projectedExpenses: serializedTeam.finances.projectedExpenses?.toString() || '0',
      lastSeasonRevenue: serializedTeam.finances.lastSeasonRevenue?.toString() || '0',
      lastSeasonExpenses: serializedTeam.finances.lastSeasonExpenses?.toString() || '0',
      facilitiesMaintenanceCost: serializedTeam.finances.facilitiesMaintenanceCost?.toString() || '0'
    };
  }

  // CRITICAL FIX: Apply same points calculation fix to /api/teams/my endpoint
  const correctPoints = (serializedTeam.wins || 0) * 3 + (serializedTeam.draws || 0) * 1;
  const hasPointsError = serializedTeam.points !== correctPoints;
  
  if (hasPointsError) {
    console.log(`🔧 [MY TEAM POINTS FIX] ${serializedTeam.name}: DB shows ${serializedTeam.points} pts, should be ${correctPoints} pts (${serializedTeam.wins}W)`);
  }
  
  const correctedSerializedTeam = {
    ...serializedTeam,
    points: correctPoints, // Use calculated points for consistency
    draws: serializedTeam.draws || 0, // Ensure draws is never null
    played: (serializedTeam.wins || 0) + (serializedTeam.losses || 0) + (serializedTeam.draws || 0)
  };

  return res.json(correctedSerializedTeam);
}));

// Get user's next opponent
router.get('/my/next-opponent', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub;
  if (!userId) {
    console.log('❌ User ID extraction failed. req.user:', req.user);
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  // For now, return placeholder until next opponent logic is implemented
  return res.json({ 
    message: "Next opponent feature coming soon",
    teamId: team.id 
  });
}));

// Get user's comprehensive schedule (all games: League, Tournament, Exhibition)
router.get('/my-schedule/comprehensive', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/my-schedule/comprehensive route called!');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  console.log('🔍 [DEBUG] Final userId for comprehensive schedule:', userId);

  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  // Fetch ALL games for the user's team across all match types
  const allGames = await storage.matches.getMatchesByTeamId(team.id);

  // Transform games to match expected frontend format
  const transformedGames = allGames.map((game: any) => ({
    id: game.id,
    homeTeam: {
      id: game.homeTeam.id,
      name: game.homeTeam.name
    },
    awayTeam: {
      id: game.awayTeam.id,
      name: game.awayTeam.name
    },
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    gameDate: game.gameDate,
    status: game.status,
    matchType: game.matchType,
    tournamentId: game.tournamentId,
    round: game.round
  }));

  console.log(`✅ [COMPREHENSIVE SCHEDULE] Found ${transformedGames.length} total games for team ${team.name}`);
  
  return res.json(transformedGames);
}));

// Get upcoming matches for authenticated user's team (for header display)
router.get('/my/matches/upcoming', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/my/matches/upcoming route called!');
  
  // DEBUG: Log what user ID the middleware is actually providing
  console.log('🔍 [DEBUG] req.user:', req.user);
  const authUserId = req.user?.uid || req.user?.claims?.sub;
  console.log('🔍 [DEBUG] Extracted authUserId:', authUserId);
  
  // Use the authenticated user ID directly (same pattern as /my route)
  const userId = authUserId || 'dev-user-123';
  console.log('🔍 [DEBUG] Final userId for upcoming matches:', userId);
  
  const team = await storage.teams.getTeamByUserId(userId);
  console.log('🔍 [DEBUG] Team lookup result:', team?.name, 'ID:', team?.id);
  
  if (!team) {
    console.log('❌ [UPCOMING MATCHES] No team found for user:', userId);
    throw ErrorCreators.notFound("No team found for user");
  }

  // Get all matches for the team (same method as comprehensive schedule)
  const allMatches = await storage.matches.getMatchesByTeamId(team.id);
  
  // Filter for upcoming matches (not simulated and in the future)
  const now = new Date();
  const upcomingMatches = allMatches
    .filter((match: any) => 
      !match.simulated && 
      match.status === 'SCHEDULED' &&
      new Date(match.gameDate) > now
    )
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
    .slice(0, 5) // Return only next 5 upcoming matches
    .map((match: any) => ({
      id: match.id.toString(),
      homeTeam: { 
        id: match.homeTeam.id.toString(), 
        name: match.homeTeam.name 
      },
      awayTeam: { 
        id: match.awayTeam.id.toString(), 
        name: match.awayTeam.name 
      },
      gameDate: match.gameDate,
      matchType: match.matchType
    }));

  console.log(`✅ [UPCOMING MATCHES] Team ${team.name} - Total matches: ${allMatches.length}, Upcoming: ${upcomingMatches.length}`);
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    console.log(`🎯 [NEXT MATCH] ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name} on ${nextMatch.gameDate}`);
  }
  
  return res.json(upcomingMatches);
}));

// Get upcoming matches for team (for header display) - LEGACY ENDPOINT
router.get('/:teamId/matches/upcoming', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  // Get authenticated user and verify team ownership
  const userId = req.user?.uid || req.user?.claims?.sub;
  const team = await storage.teams.getTeamByUserId(userId);
  
  if (!team || team.id !== teamId) {
    throw ErrorCreators.forbidden("Access denied to this team's matches");
  }

  // Get all matches for the team (same method as comprehensive schedule)
  const allMatches = await storage.matches.getMatchesByTeamId(teamId);
  
  // Filter for upcoming matches (not simulated and in the future)
  const now = new Date();
  const upcomingMatches = allMatches
    .filter((match: any) => 
      !match.simulated && 
      match.status === 'SCHEDULED' &&
      new Date(match.gameDate) > now
    )
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime())
    .slice(0, 5) // Return only next 5 upcoming matches
    .map((match: any) => ({
      id: match.id.toString(),
      homeTeam: { 
        id: match.homeTeam.id.toString(), 
        name: match.homeTeam.name 
      },
      awayTeam: { 
        id: match.awayTeam.id.toString(), 
        name: match.awayTeam.name 
      },
      gameDate: match.gameDate,
      matchType: match.matchType
    }));

  console.log(`✅ [UPCOMING MATCHES] Team ${team.name} - Total matches: ${allMatches.length}, Upcoming: ${upcomingMatches.length}`);
  if (upcomingMatches.length > 0) {
    const nextMatch = upcomingMatches[0];
    console.log(`🎯 [NEXT MATCH] ${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name} on ${nextMatch.gameDate}`);
  }
  
  return res.json(upcomingMatches);
}));

// Get next opponent for team (unified next match display)
router.get('/my/next-opponent', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub || 'dev-user-123';
  const team = await storage.teams.getTeamByUserId(userId);
  
  if (!team) {
    throw ErrorCreators.forbidden("No team found for user");
  }

  // Get all matches for the team (same method as working endpoints)
  const allMatches = await storage.matches.getMatchesByTeamId(team.id);
  
  // Filter for upcoming matches (same logic as working endpoints)
  const now = new Date();
  const upcomingMatches = allMatches
    .filter((match: any) => 
      !match.simulated && 
      match.status === 'SCHEDULED' &&
      new Date(match.gameDate) > now
    )
    .sort((a: any, b: any) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

  if (upcomingMatches.length === 0) {
    return res.json({
      nextOpponent: "No matches scheduled",
      name: "TBD",
      hasMatch: false,
      timeUntil: "No matches scheduled"
    });
  }

  const nextMatch = upcomingMatches[0];
  const isHome = nextMatch.homeTeam.id === team.id;
  const opponent = isHome ? nextMatch.awayTeam : nextMatch.homeTeam;
  
  // Calculate time until match
  const gameDate = new Date(nextMatch.gameDate);
  const diffTime = gameDate.getTime() - now.getTime();
  let timeUntil = "Loading...";
  
  if (diffTime > 0) {
    const hours = Math.floor(diffTime / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 1) {
      timeUntil = `${minutes}m`;
    } else if (hours < 24) {
      timeUntil = `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      timeUntil = `${days}d ${remainingHours}h`;
    }
  }

  console.log(`🎯 [NEXT OPPONENT API] ${team.name} next opponent: ${opponent.name} (${isHome ? 'Home' : 'Away'}) in ${timeUntil}`);

  return res.json({
    nextOpponent: opponent.name,
    name: opponent.name,
    gameDate: nextMatch.gameDate,
    isHome: isHome,
    homeGame: isHome,
    matchType: nextMatch.matchType || 'League',
    division: opponent.division || 8,
    timeUntil: timeUntil,
    hasMatch: true
  });
}));

// Shadow Runners fix completed - route can be removed in future cleanup

// Team creation endpoint
router.post('/create', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid || req.user?.claims?.sub;
  if (!userId) {
    console.log('❌ User ID extraction failed. req.user:', req.user);
    throw ErrorCreators.unauthorized("User ID not found in token");
  }

  const { teamName, ndaAgreed } = createTeamSchema.parse(req.body);

  // Validate team name
  const validationResult = await TeamNameValidator.validateTeamName(teamName);
  if (!validationResult.isValid) {
    throw ErrorCreators.validation(validationResult.error || "Invalid team name");
  }

  // Check if user already has a team
  const existingTeam = await storage.teams.getTeamByUserId(userId);
  if (existingTeam) {
    throw ErrorCreators.conflict("User already has a team");
  }

  // Check and record NDA acceptance
  if (!ndaAgreed) {
    throw ErrorCreators.forbidden("You must accept the Non-Disclosure Agreement to participate in pre-alpha testing");
  }

  // Create team with complete roster and staff
  const newTeam = await storage.teams.createTeam({
    name: teamName,
    userId: userId
  });

  res.json({
    success: true,
    message: "Team created successfully",
    team: newTeam
  });
}));

// ADMIN: Fix match opponent data (temporary endpoint)
router.get('/fix-opponent-debug', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 ADMIN FIX ENDPOINT REACHED!');
  try {
    console.log('🔧 ADMIN: Starting match opponent fix...');
    
    // Find teams by manually querying
    const allTeams = await storage.db.team.findMany({
      where: {
        name: {
          in: ['Oakland Cougars', 'Shadow Runners 197', 'Iron Wolves 686']
        }
      }
    });
    
    const oaklandCougars = allTeams.find(t => t.name === 'Oakland Cougars');
    const shadowRunners = allTeams.find(t => t.name === 'Shadow Runners 197');
    const ironWolves = allTeams.find(t => t.name === 'Iron Wolves 686');
    
    if (!oaklandCougars || !shadowRunners || !ironWolves) {
      return res.status(404).json({ 
        error: 'Could not find all required teams',
        found: {
          oakland: !!oaklandCougars,
          shadowRunners: !!shadowRunners,
          ironWolves: !!ironWolves
        }
      });
    }
    
    // Find today's match for Oakland Cougars
    const today = new Date('2025-08-21T00:00:00.000Z');
    const tomorrow = new Date('2025-08-22T00:00:00.000Z');
    
    const todaysMatch = await storage.db.game.findFirst({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    if (!todaysMatch) {
      return res.status(404).json({ error: 'No match found for Oakland Cougars today' });
    }
    
    console.log('🎯 Found today\'s match:', {
      id: todaysMatch.id,
      homeTeam: todaysMatch.homeTeam.name,
      awayTeam: todaysMatch.awayTeam.name,
      gameDate: todaysMatch.gameDate
    });
    
    // Check if we need to update the opponent
    let needsUpdate = false;
    let updateData: any = {};
    
    if (todaysMatch.homeTeamId === oaklandCougars.id && todaysMatch.awayTeamId === shadowRunners.id) {
      // Oakland home vs Shadow Runners - change away team to Iron Wolves
      updateData.awayTeamId = ironWolves.id;
      needsUpdate = true;
      console.log('🔧 Will update away team from Shadow Runners 197 to Iron Wolves 686');
    } else if (todaysMatch.awayTeamId === oaklandCougars.id && todaysMatch.homeTeamId === shadowRunners.id) {
      // Shadow Runners home vs Oakland away - change home team to Iron Wolves
      updateData.homeTeamId = ironWolves.id;
      needsUpdate = true;
      console.log('🔧 Will update home team from Shadow Runners 197 to Iron Wolves 686');
    }
    
    if (needsUpdate) {
      // Update the match using Prisma directly
      const updatedMatch = await storage.db.game.update({
        where: { id: todaysMatch.id },
        data: updateData,
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });
      
      console.log('✅ Match updated successfully:', {
        id: updatedMatch.id,
        homeTeam: updatedMatch.homeTeam.name,
        awayTeam: updatedMatch.awayTeam.name
      });
      
      return res.json({
        success: true,
        message: 'Match opponent updated from Shadow Runners 197 to Iron Wolves 686',
        before: {
          homeTeam: todaysMatch.homeTeam.name,
          awayTeam: todaysMatch.awayTeam.name
        },
        after: {
          homeTeam: updatedMatch.homeTeam.name,
          awayTeam: updatedMatch.awayTeam.name
        }
      });
    } else {
      return res.json({
        success: false,
        message: 'Match does not involve Shadow Runners 197, no update needed',
        currentMatch: {
          homeTeam: todaysMatch.homeTeam.name,
          awayTeam: todaysMatch.awayTeam.name
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing match opponent:', error);
    return res.status(500).json({ 
      error: 'Failed to fix match opponent', 
      details: error.message 
    });
  }
}));

// CRITICAL FIX: Add standings route directly to teamRoutes
// This fixes the Vite interception issue by providing direct access
router.get('/:division/standings', async (req: Request, res: Response) => {
  console.log(`🏆 [DIRECT STANDINGS] Division ${req.params.division} standings requested`);
  
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division" });
    }

    const prisma = await getPrismaClient();
    
    // Get all teams in Division 8 Alpha (where Oakland Cougars is)
    const teams = await prisma.team.findMany({
      where: { 
        division: division,
        subdivision: 'alpha' // Oakland Cougars is in alpha
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });

    console.log(`✅ [DIRECT STANDINGS] Found ${teams.length} teams in Division ${division} Alpha`);
    
    // Get all matches with scores (completed games) - simplified query
    const completedMatches = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null }, // Games with actual scores
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    console.log(`🎮 [STANDINGS] Found ${completedMatches.length} completed league matches for score calculations`);
    
    // Debug log to see what games we found
    console.log(`🎯 [STANDINGS DEBUG] Found ${completedMatches.length} completed matches`);
    if (completedMatches.length > 0) {
      console.log(`🎯 [STANDINGS DEBUG] Sample completed match:`, {
        id: completedMatches[0].id,
        homeTeam: completedMatches[0].homeTeam.name,
        awayTeam: completedMatches[0].awayTeam.name,
        homeScore: completedMatches[0].homeScore,
        awayScore: completedMatches[0].awayScore,
        status: completedMatches[0].status,
        gameDate: completedMatches[0].gameDate
      });
    }

    // CRITICAL FIX: Correct points calculation and score calculations
    const correctedTeams = teams.map(team => {
      const correctPoints = (team.wins || 0) * 3 + (team.draws || 0) * 1;
      const hasPointsError = team.points !== correctPoints;
      
      // Calculate actual scores from completed games
      const teamMatches = completedMatches.filter(match => 
        match.homeTeamId === team.id || match.awayTeamId === team.id
      );
      
      let totalScores = 0;
      let scoresAgainst = 0;
      
      teamMatches.forEach(match => {
        if (match.homeTeamId === team.id) {
          totalScores += match.homeScore || 0;
          scoresAgainst += match.awayScore || 0;
        } else {
          totalScores += match.awayScore || 0;
          scoresAgainst += match.homeScore || 0;
        }
      });
      
      const scoreDifference = totalScores - scoresAgainst;
      const actualPlayed = teamMatches.length; // Only count COMPLETED games
      
      if (hasPointsError) {
        console.log(`🔧 [POINTS FIX] ${team.name}: DB shows ${team.points} pts, should be ${correctPoints} pts (${team.wins}W)`);
      }
      
      console.log(`🎯 [SCORE CALC] ${team.name}: ${actualPlayed} games, ${totalScores} for, ${scoresAgainst} against, ${scoreDifference} diff`);
      
      return {
        ...team,
        points: correctPoints, // Use calculated points for consistency
        draws: team.draws || 0, // Ensure draws is never null
        played: actualPlayed, // Only count simulated games
        totalScores,
        scoresAgainst,
        scoreDifference
      };
    });
    
    // Helper function to calculate head-to-head record between two teams
    const getHeadToHeadRecord = (teamA: any, teamB: any) => {
      const h2hMatches = completedMatches.filter((match: any) => 
        (match.homeTeamId === teamA.id && match.awayTeamId === teamB.id) ||
        (match.homeTeamId === teamB.id && match.awayTeamId === teamA.id)
      );
      
      let teamAWins = 0;
      let teamBWins = 0;
      let draws = 0;
      
      h2hMatches.forEach((match: any) => {
        const homeScore = match.homeScore || 0;
        const awayScore = match.awayScore || 0;
        
        if (homeScore > awayScore) {
          if (match.homeTeamId === teamA.id) teamAWins++;
          else teamBWins++;
        } else if (awayScore > homeScore) {
          if (match.awayTeamId === teamA.id) teamAWins++;
          else teamBWins++;
        } else {
          draws++;
        }
      });
      
      return {
        teamAWins,
        teamBWins,
        draws,
        totalMatches: h2hMatches.length
      };
    };

    // Sort corrected teams using comprehensive tiebreaker rules
    correctedTeams.sort((a, b) => {
      // 1. Primary: Points (3 for win, 1 for draw, 0 for loss)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. First Tiebreaker: Head-to-head record
      if (a.points === b.points) {
        const h2h = getHeadToHeadRecord(a, b);
        if (h2h.totalMatches > 0) {
          // If teams have played each other, use head-to-head wins
          if (h2h.teamAWins !== h2h.teamBWins) {
            return h2h.teamBWins - h2h.teamAWins; // More wins for team B = higher position for B
          }
        }
      }
      
      // 3. Second Tiebreaker: Score Difference (SD = Total Scores - Scores Against)
      if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference;
      
      // 4. Third Tiebreaker: Total Scores (offensive output)
      if (b.totalScores !== a.totalScores) return b.totalScores - a.totalScores;
      
      // 5. Fourth Tiebreaker: Wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      
      // 6. Final Tiebreaker: Fewer losses
      const aLosses = a.losses || 0;
      const bLosses = b.losses || 0;
      return aLosses - bLosses;
    });
    
    if (correctedTeams.length > 0) {
      const oakland = correctedTeams.find(t => t.name === 'Oakland Cougars');
      if (oakland) {
        console.log(`🎯 [DIRECT STANDINGS] Oakland Cougars: ${oakland.wins}W-${oakland.losses}L (${oakland.points} pts - CORRECTED)`);
      }
    }

    res.json(correctedTeams);
  } catch (error) {
    console.error('❌ [DIRECT STANDINGS] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

console.log('🔍 [teamRoutes.ts] Router configured with routes, exporting...');
console.log('🔍 [teamRoutes.ts] Router stack length:', router.stack.length);

export default router;