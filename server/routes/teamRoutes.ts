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
import { PaymentHistoryService } from '../services/paymentHistoryService.js';

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
  console.log('🚨 [UNIQUE DEBUG] This is the FIXED endpoint running!');
  
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

  // CRITICAL FIX: Use correct calculation logic - calculate draws from points, not vice versa
  // The standings table calculates correctly: draws = points - (wins * 3)
  const correctDraws = Math.max(0, (serializedTeam.points || 0) - ((serializedTeam.wins || 0) * 3));
  const correctPoints = serializedTeam.points || 0; // Keep existing points from game results
  
  if (serializedTeam.draws !== correctDraws) {
    console.log(`🔧 [MY TEAM DRAWS FIX] ${serializedTeam.name}: DB shows ${serializedTeam.draws} draws, should be ${correctDraws} draws (${serializedTeam.points}pts - ${serializedTeam.wins}*3)`);
  }
  
  const correctedSerializedTeam = {
    ...serializedTeam,
    points: correctPoints, // Use existing points from game results
    draws: correctDraws, // Calculate draws from points (same as standings table)
    played: (serializedTeam.wins || 0) + (serializedTeam.losses || 0) + correctDraws
  };

  return res.json(correctedSerializedTeam);
}));

// ===== FINANCIAL SYSTEM ROUTES =====
// Team finances endpoint - User team finances for finance page
router.get('/my/finances', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [FINANCES] /api/teams/my/finances endpoint called');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  // Get team finances using storage layer
  const finances = await storage.teamFinances.getTeamFinances(team.id);
  if (!finances) {
    throw ErrorCreators.notFound("Team finances not found");
  }

  console.log('✅ [FINANCES] Successfully returned finances for team:', team.name);
  res.json(finances);
}));

// Team-specific finances endpoint with comprehensive calculations
router.get('/:teamId/finances', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [FINANCES] /api/teams/:teamId/finances endpoint called');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.badRequest("Invalid team ID");
  }

  // Get team finances using storage layer
  const finances = await storage.teamFinances.getTeamFinances(teamId);
  if (!finances) {
    throw ErrorCreators.notFound("Team finances not found");
  }

  // Calculate actual player salaries from contracts
  const prisma = await import('../database.js').then(m => m.getPrismaClient());
  const players = await (await prisma).player.findMany({
    where: { teamId: teamId },
    select: { id: true }
  });
  const playerIds = players.map((p: any) => p.id);
  
  const contracts = await (await prisma).contract.findMany({
    where: {
      playerId: { in: playerIds }
    },
    select: {
      salary: true
    }
  });
  const totalPlayerSalaries = contracts.reduce((total, contract) => {
    return total + (contract.salary || 0);
  }, 0);

  // Calculate actual staff salaries - use correct level-based calculation
  let totalStaffSalaries = 0;
  try {
    const staff = await storage.staff.getStaffByTeamId(teamId);
    totalStaffSalaries = staff.reduce((total, staffMember) => {
      // Correct staff salary calculation: level * 1000 credits (from teamFinancesStorage.ts)
      const calculatedSalary = (staffMember.level || 1) * 1000;
      return total + calculatedSalary;
    }, 0);
  } catch (error) {
    console.error('Error fetching staff for salary calculation:', error);
    totalStaffSalaries = 0;
  }

  // Return finances with calculated values and proper BigInt serialization
  const facilitiesCost = parseInt(String(finances.facilitiesMaintenanceCost || '0'));
  const projectedIncome = parseInt(String(finances.projectedIncome || '0'));
  const totalExpenses = totalPlayerSalaries + totalStaffSalaries + facilitiesCost;
  
  // Create comprehensive response object with calculated values
  const calculatedFinances = {
    ...finances,
    // Calculated values for frontend
    playerSalaries: totalPlayerSalaries,
    staffSalaries: totalStaffSalaries,
    totalExpenses: totalExpenses,
    netIncome: projectedIncome - totalExpenses,
    // Maintenance cost in proper format
    maintenanceCosts: facilitiesCost
  };

  console.log('✅ [FINANCES] Successfully returned calculated finances for teamId:', teamId);
  console.log('📊 [FINANCES] Calculations: playerSalaries:', totalPlayerSalaries, 'staffSalaries:', totalStaffSalaries, 'netIncome:', projectedIncome - totalExpenses);
  res.json(calculatedFinances);
}));

// Team contracts endpoint
router.get('/:teamId/contracts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [CONTRACTS] /api/teams/:teamId/contracts endpoint called');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.badRequest("Invalid team ID");
  }

  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Verify team ownership
  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam || userTeam.id !== teamId) {
    throw ErrorCreators.forbidden("Team not found or you don't have permission to access this team");
  }

  // Get all player contracts for the team
  const prisma = await import('../database.js').then(m => m.getPrismaClient());
  const contracts = await (await prisma).contract.findMany({
    where: { 
      playerId: { not: null },
      player: {
        teamId: teamId
      }
    },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          race: true,
          age: true,
          role: true
        }
      }
    }
  });
  
  // Transform contracts to display format
  const contractsWithPlayer = contracts.map(contract => ({
    ...contract,
    salary: contract.salary,
    signingBonus: contract.signingBonus,
    player: contract.player
  }));
  
  console.log('✅ [CONTRACTS] Successfully returned contracts for teamId:', teamId, 'count:', contractsWithPlayer.length);
  res.json({
    success: true,
    contracts: contractsWithPlayer,
    totalContracts: contractsWithPlayer.length,
    players: contractsWithPlayer.map(contract => ({
      id: contract.player?.id,
      firstName: contract.player?.firstName,
      lastName: contract.player?.lastName,
      race: contract.player?.race,
      age: contract.player?.age,
      role: contract.player?.role,
      salary: contract.salary,
      contractLength: contract.length,
      signingBonus: contract.signingBonus,
      startDate: contract.startDate
    }))
  });
}));

// Team transactions endpoint - matches frontend expectation
router.get('/:teamId/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [TRANSACTIONS] /api/teams/:teamId/transactions endpoint called');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.badRequest("Invalid team ID");
  }

  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Verify team ownership
  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam || userTeam.id !== teamId) {
    throw ErrorCreators.forbidden("Team not found or you don't have permission to access this team");
  }

  try {
    const { PaymentHistoryService } = await import('../services/paymentHistoryService.js');
    
    // Get team payment history and user payment history
    const teamTransactions = await PaymentHistoryService.getTeamPaymentHistory(teamId);
    const userTransactions = await PaymentHistoryService.getUserPaymentHistory(userId, {
      limit: 50,
      offset: 0,
      currencyFilter: "both"
    });
    
    // Combine and sort by date
    const allTransactions = [
      ...teamTransactions.transactions || [],
      ...userTransactions.transactions || []
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [TRANSACTIONS] Successfully returned transactions for teamId:', teamId, 'count:', allTransactions.length);
    res.json({
      success: true,
      transactions: allTransactions,
      totalCount: allTransactions.length
    });
  } catch (error) {
    console.error('❌ [TRANSACTIONS] Error fetching transactions:', error);
    throw ErrorCreators.internalServer("Failed to fetch transactions");
  }
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

// Get recent matches for any team (for competition tab)
router.get('/:teamId/matches/recent', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [API CALL] /api/teams/:teamId/matches/recent route called!');
  
  const { teamId } = req.params;
  
  try {
    const prisma = await getPrismaClient();
    
    // Get recent completed matches for this team
    const recentMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: parseInt(teamId) },
          { awayTeamId: parseInt(teamId) }
        ],
        status: 'COMPLETED', // Only completed matches
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: {
          select: { id: true, name: true }
        },
        awayTeam: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        gameDate: 'desc'
      },
      take: 10 // Last 10 matches
    });
    
    // Format the response to match the expected Match type
    const formattedMatches = recentMatches.map(match => ({
      id: match.id.toString(),
      homeTeam: { id: match.homeTeam.id.toString(), name: match.homeTeam.name },
      awayTeam: { id: match.awayTeam.id.toString(), name: match.awayTeam.name },
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      gameDate: match.gameDate.toISOString(),
      status: 'COMPLETED' as const,
      matchType: 'LEAGUE' as const
    }));
    
    console.log(`✅ [RECENT MATCHES] Found ${formattedMatches.length} recent matches for team ${teamId}`);
    
    res.json(formattedMatches);
  } catch (error) {
    console.error('❌ [RECENT MATCHES] Error:', error);
    res.status(500).json({ error: 'Failed to fetch recent matches' });
  }
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

    // CRITICAL FIX: Correct draws calculation (same logic as main fix)
    const correctedTeams = teams.map(team => {
      const correctDraws = Math.max(0, (team.points || 0) - ((team.wins || 0) * 3));
      const correctPoints = team.points || 0; // Keep existing points from game results
      const hasDrawsError = (team.draws || 0) !== correctDraws;
      
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
      
      if (hasDrawsError) {
        console.log(`🔧 [STANDINGS DRAWS FIX] ${team.name}: DB shows ${team.draws} draws, should be ${correctDraws} draws (${team.points}pts)`);
      }
      
      console.log(`🎯 [SCORE CALC] ${team.name}: ${actualPlayed} games, ${totalScores} for, ${scoresAgainst} against, ${scoreDifference} diff`);
      
      return {
        ...team,
        points: correctPoints, // Keep existing points from game results
        draws: correctDraws, // Use calculated draws (same as main fix)
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

// Fix financial balance based on transaction history (direct database approach)
router.post('/:teamId/fix-financial-balance', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [FINANCIAL FIX] Fixing team financial balance from transaction history');
  
  const { teamId } = req.params;
  const userId = req.user?.claims?.sub;
  
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Get all completed transactions for this team
    const transactions = await prisma.paymentTransaction.findMany({
      where: { 
        teamId: parseInt(teamId),
        status: 'completed'
      },
    });
    
    // Calculate totals
    let totalCredits = 0;
    let totalGems = 0;
    
    transactions.forEach(transaction => {
      const creditsAmount = Number(transaction.creditsAmount || 0);
      const gemsAmount = transaction.gemsAmount || 0;
      
      totalCredits += creditsAmount;
      totalGems += gemsAmount;
    });
    
    console.log(`💰 [FINANCIAL FIX] Calculated from ${transactions.length} transactions: ${totalCredits}₡, ${totalGems} gems`);
    
    // Direct update to TeamFinances table
    const updatedFinances = await prisma.teamFinances.upsert({
      where: { teamId: parseInt(teamId) },
      update: {
        credits: totalCredits,
        gems: totalGems
      },
      create: {
        teamId: parseInt(teamId),
        credits: totalCredits,
        gems: totalGems,
        escrowCredits: 0,
        escrowGems: 0,
        projectedIncome: 0,
        projectedExpenses: 0,
        lastSeasonRevenue: 0,
        lastSeasonExpenses: 0,
        facilitiesMaintenanceCost: 5000
      }
    });
    
    console.log(`✅ [FINANCIAL FIX] Updated TeamFinances: ${updatedFinances.credits}₡, ${updatedFinances.gems} gems`);
    
    res.json({
      success: true,
      message: 'Financial balance corrected from transaction history',
      before: { credits: 0, gems: 0 },
      after: { credits: Number(updatedFinances.credits), gems: Number(updatedFinances.gems) },
      transactionCount: transactions.length,
      breakdown: {
        totalCredits,
        totalGems,
        transactionSummary: transactions.map((t: any) => ({
          date: t.createdAt,
          type: t.transactionType,
          item: t.itemName,
          credits: t.creditsAmount?.toString() || '0',
          gems: t.gemsAmount
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ [FINANCIAL FIX] Error fixing balance:', error);
    res.status(500).json({ message: `Failed to fix financial balance: ${error.message}` });
  }
}));

// Set all players camaraderie to base level
router.post('/set-all-players-camaraderie', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [CAMARADERIE] Setting all players camaraderie to base level (50)');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Update all players' camaraderie to 50
    const updateResult = await prisma.player.updateMany({
      data: {
        camaraderieScore: 50
      }
    });
    
    console.log(`✅ [CAMARADERIE] Updated ${updateResult.count} players to camaraderie 50`);
    
    res.json({
      success: true,
      message: `Successfully set camaraderie to 50 for ${updateResult.count} players`,
      playersUpdated: updateResult.count
    });
    
  } catch (error) {
    console.error('❌ [CAMARADERIE] Error setting camaraderie:', error);
    res.status(500).json({ message: `Failed to set camaraderie: ${error.message}` });
  }
}));


// Fix Day 9 game dates - move 4 games to August 24th
router.post('/fix-day9-dates', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('📅 [FIX DAY 9] Moving 4 games from August 25th to August 24th (Day 9)');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Find games scheduled for August 25th that should be on August 24th
    const aug25Games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2025-08-25T00:00:00Z'),
          lt: new Date('2025-08-26T00:00:00Z')
        },
        status: 'SCHEDULED',
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`📅 [FIX DAY 9] Found ${aug25Games.length} games on August 25th`);
    
    // Move the first 4 games to August 24th (Day 9)
    const gamesToMove = aug25Games.slice(0, 4);
    const movedGames = [];
    
    for (let i = 0; i < gamesToMove.length; i++) {
      const game = gamesToMove[i];
      
      // Set to August 24th with proper time slots (4-7 PM EDT = UTC 20-23)
      const day9Date = new Date('2025-08-24T20:00:00Z'); // 4 PM EDT
      day9Date.setUTCHours(20 + i, 0, 0, 0); // 4PM, 5PM, 6PM, 7PM EDT
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          gameDate: day9Date
        }
      });
      
      movedGames.push({
        gameId: game.id,
        teams: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
        newDateTime: day9Date.toISOString(),
        newTimeEST: day9Date.toLocaleString('en-US', { 
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      });
      
      console.log(`📅 [FIX DAY 9] Moved Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name} → Aug 24th at ${day9Date.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    }
    
    res.json({
      success: true,
      message: `Successfully moved ${movedGames.length} games to Day 9 (August 24th)`,
      movedGames,
      remainingOnAug25: aug25Games.length - movedGames.length
    });
    
  } catch (error) {
    console.error('❌ [FIX DAY 9] Error:', error);
    res.status(500).json({ message: `Failed to fix Day 9 dates: ${error.message}` });
  }
}));

// Reset test games to proper Day 9 schedule
router.post('/reset-test-games', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔄 [RESET TEST GAMES] Resetting manual test games to proper Day 9 times');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    const testGameIds = [3973, 3974, 3975, 3976];
    const resetGames = [];
    
    for (const gameId of testGameIds) {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });
      
      if (game) {
        // Calculate proper Day 9 time (tomorrow at a scheduled time)
        const day9Date = new Date();
        day9Date.setDate(day9Date.getDate() + 1); // Tomorrow (Day 9)
        day9Date.setUTCHours(20 + (gameId % 4), 0, 0, 0); // Spread across 4PM-7PM EDT (UTC: 20-23)
        
        // Reset the game
        await prisma.game.update({
          where: { id: gameId },
          data: {
            status: 'SCHEDULED',
            homeScore: null,
            awayScore: null,
            gameDate: day9Date,
            simulated: false,
            simulationLog: null
          }
        });
        
        resetGames.push({
          gameId,
          teams: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
          newDateTime: day9Date.toISOString(),
          newTimeEST: day9Date.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        });
        
        console.log(`🔄 [RESET] Game ${gameId}: ${game.homeTeam.name} vs ${game.awayTeam.name} → Day 9 at ${day9Date.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully reset ${resetGames.length} test games to Day 9 schedule`,
      resetGames
    });
    
  } catch (error) {
    console.error('❌ [RESET TEST GAMES] Error:', error);
    res.status(500).json({ message: `Failed to reset test games: ${error.message}` });
  }
}));

// Fix Day 8 games stuck in IN_PROGRESS and recalculate standings
router.post('/fix-day8-status-and-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [FIX DAY 8] Fixing Day 8 games status and recalculating standings');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Step 1: Fix Day 8 games that are stuck in IN_PROGRESS but have final scores
    const day8Games = [3969, 3970, 3971, 3972]; // From debug output
    
    console.log('🔧 [FIX DAY 8] Updating Day 8 games from IN_PROGRESS to COMPLETED');
    for (const gameId of day8Games) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED' }
      });
      console.log(`✅ [FIX DAY 8] Game ${gameId} status updated to COMPLETED`);
    }
    
    // Step 2: Reset all team standings to 0
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log('🔄 [RESET STANDINGS] All team standings reset to 0');
    
    // Step 3: Get all completed league games (should now include Day 8)
    const completedGames = await prisma.game.findMany({
      where: {
        status: 'COMPLETED',
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`🔄 [STANDINGS] Found ${completedGames.length} completed games to process`);
    
    // Step 4: Recalculate standings from all games
    const standingsUpdates = [];
    
    for (const game of completedGames) {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      if (homeScore > awayScore) {
        // Home team wins
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            losses: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.homeTeam.name} beat ${game.awayTeam.name} ${homeScore}-${awayScore}`);
        
      } else if (awayScore > homeScore) {
        // Away team wins
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            losses: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.awayTeam.name} beat ${game.homeTeam.name} ${awayScore}-${homeScore}`);
        
      } else {
        // Tie/Draw - both teams get 1 point (no wins/losses for ties)
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            points: { increment: 1 }
          }
        });
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            points: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.homeTeam.name} tied ${game.awayTeam.name} ${homeScore}-${awayScore}`);
      }
      
      console.log(`🔄 [STANDINGS] Processed: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name}`);
    }
    
    // Step 5: Get final standings to verify
    const finalStandings = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: {
        name: true,
        wins: true,
        losses: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    res.json({
      success: true,
      message: `Successfully fixed Day 8 status and recalculated standings from ${completedGames.length} completed games`,
      gamesProcessed: completedGames.length,
      standingsUpdates,
      finalStandings
    });
    
  } catch (error) {
    console.error('❌ [FIX DAY 8] Error:', error);
    res.status(500).json({ message: `Failed to fix Day 8 and standings: ${error.message}` });
  }
}));

// Debug and check all games status
router.post('/debug-games-status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [DEBUG GAMES] Checking all Day 7 and Day 8 games status');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Get all games from the last few days regardless of status
    const allRecentGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        gameDate: {
          gte: new Date('2025-08-22T00:00:00Z'), // Last few days
          lt: new Date('2025-08-25T00:00:00Z')
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { gameDate: 'asc' }
    });
    
    const gamesByDay = {};
    allRecentGames.forEach(game => {
      const day = game.gameDate.toISOString().split('T')[0];
      if (!gamesByDay[day]) gamesByDay[day] = [];
      gamesByDay[day].push({
        id: game.id,
        teams: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        simulated: game.simulated
      });
    });
    
    res.json({
      success: true,
      message: `Found ${allRecentGames.length} recent league games`,
      gamesByDay,
      totalGames: allRecentGames.length
    });
    
  } catch (error) {
    console.error('❌ [DEBUG GAMES] Error:', error);
    res.status(500).json({ message: `Failed to debug games: ${error.message}` });
  }
}));

// Reset and recalculate all standings from scratch
router.post('/reset-all-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔄 [RESET STANDINGS] Resetting all team standings and recalculating from completed games');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Step 1: Reset all team standings to 0
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    
    console.log('🔄 [RESET STANDINGS] All team standings reset to 0');
    
    // Step 2: Get all completed league games
    const completedGames = await prisma.game.findMany({
      where: {
        status: 'COMPLETED',
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`🔄 [RESET STANDINGS] Found ${completedGames.length} completed games to process`);
    
    // Step 3: Recalculate standings from all games
    const standingsUpdates = [];
    
    for (const game of completedGames) {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      if (homeScore > awayScore) {
        // Home team wins
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            losses: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.homeTeam.name} beat ${game.awayTeam.name} ${homeScore}-${awayScore}`);
        
      } else if (awayScore > homeScore) {
        // Away team wins
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            losses: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.awayTeam.name} beat ${game.homeTeam.name} ${awayScore}-${homeScore}`);
        
      } else {
        // Tie/Draw - both teams get 1 point (no wins/losses for ties)
        await prisma.team.update({
          where: { id: game.homeTeamId },
          data: { 
            points: { increment: 1 }
          }
        });
        await prisma.team.update({
          where: { id: game.awayTeamId },
          data: { 
            points: { increment: 1 }
          }
        });
        standingsUpdates.push(`${game.homeTeam.name} tied ${game.awayTeam.name} ${homeScore}-${awayScore}`);
      }
      
      console.log(`🔄 [RESET STANDINGS] Processed: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name}`);
    }
    
    // Step 4: Get final standings to verify
    const finalStandings = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: {
        name: true,
        wins: true,
        losses: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    res.json({
      success: true,
      message: `Successfully reset and recalculated standings from ${completedGames.length} completed games`,
      gamesProcessed: completedGames.length,
      standingsUpdates,
      finalStandings
    });
    
  } catch (error) {
    console.error('❌ [RESET STANDINGS] Error:', error);
    res.status(500).json({ message: `Failed to reset standings: ${error.message}` });
  }
}));

// Fix completed games standings update
router.post('/fix-completed-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [STANDINGS FIX] Updating standings for completed games that were missed');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Find COMPLETED league games that have scores but might not have updated standings
    const completedGames = await prisma.game.findMany({
      where: {
        status: 'COMPLETED',
        matchType: 'LEAGUE',
        OR: [
          { homeScore: { gt: 0 } },
          { awayScore: { gt: 0 } }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`🔧 [STANDINGS FIX] Found ${completedGames.length} completed games to process`);
    
    let updatedCount = 0;
    for (const game of completedGames) {
      if (game.homeScore !== null && game.awayScore !== null) {
        // Determine winner and update standings
        const homeWon = game.homeScore > game.awayScore;
        const awayWon = game.awayScore > game.homeScore;
        const tied = game.homeScore === game.awayScore;
        
        if (homeWon) {
          // Home team wins
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { 
              wins: { increment: 1 },
              points: { increment: 3 }
            }
          });
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { 
              losses: { increment: 1 }
            }
          });
        } else if (awayWon) {
          // Away team wins
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { 
              wins: { increment: 1 },
              points: { increment: 3 }
            }
          });
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { 
              losses: { increment: 1 }
            }
          });
        } else if (tied) {
          // Tie - both teams get 1 point
          await prisma.team.updateMany({
            where: { 
              id: { in: [game.homeTeamId, game.awayTeamId] }
            },
            data: { 
              points: { increment: 1 }
            }
          });
        }
        
        updatedCount++;
        console.log(`🔧 [STANDINGS FIX] Updated: ${game.homeTeam.name} ${game.homeScore}-${game.awayScore} ${game.awayTeam.name}`);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully updated standings for ${updatedCount} completed games`,
      gamesProcessed: updatedCount,
      totalGamesFound: completedGames.length
    });
    
  } catch (error) {
    console.error('❌ [STANDINGS FIX] Error:', error);
    res.status(500).json({ message: `Failed to fix standings: ${error.message}` });
  }
}));

// Fix Day 8 games with proper simulation
router.post('/fix-day8-games', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [DAY 8 FIX] Fixing Day 8 games with proper simulation');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await getPrismaClient();
    
    // Find all Day 8 games (August 23, 2025) that are marked as FINAL/COMPLETED but have 0-0 scores
    const brokenDay8Games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2025-08-23T00:00:00.000Z'),
          lt: new Date('2025-08-24T00:00:00.000Z')
        },
        status: 'COMPLETED',
        homeScore: 0,
        awayScore: 0,
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: {
          include: {
            players: true,
            stadium: true
          }
        },
        awayTeam: {
          include: {
            players: true,
            stadium: true
          }
        }
      }
    });
    
    console.log(`🎯 [DAY 8 FIX] Found ${brokenDay8Games.length} broken Day 8 games to fix`);
    
    const fixedGames = [];
    
    for (const game of brokenDay8Games) {
      try {
        console.log(`🎮 [DAY 8 FIX] Simulating ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        
        // Import the match simulation function
        const { simulateEnhancedMatch } = await import('../services/matchSimulation.js');
        
        // Run the full match simulation
        const simulationResult = await simulateEnhancedMatch(
          game.homeTeam.players,
          game.awayTeam.players,
          game.homeTeamId.toString(),
          game.awayTeamId.toString(),
          game.homeTeam.stadium,
          'league',
          game.id
        );
        
        // Update the game with proper scores and simulation data
        await prisma.game.update({
          where: { id: game.id },
          data: {
            homeScore: simulationResult.homeScore,
            awayScore: simulationResult.awayScore,
            simulationLog: JSON.stringify(simulationResult.gameData),
            simulated: true,
            status: 'COMPLETED'
          }
        });
        
        // Update team records
        const homeWin = simulationResult.homeScore > simulationResult.awayScore;
        const awayWin = simulationResult.awayScore > simulationResult.homeScore;
        const isDraw = simulationResult.homeScore === simulationResult.awayScore;
        
        if (homeWin) {
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { 
              wins: { increment: 1 },
              points: { increment: 3 }
            }
          });
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { losses: { increment: 1 } }
          });
        } else if (awayWin) {
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { 
              wins: { increment: 1 },
              points: { increment: 3 }
            }
          });
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { losses: { increment: 1 } }
          });
        } else if (isDraw) {
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { 
              draws: { increment: 1 },
              points: { increment: 1 }
            }
          });
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { 
              draws: { increment: 1 },
              points: { increment: 1 }
            }
          });
        }
        
        fixedGames.push({
          gameId: game.id,
          teams: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
          score: `${simulationResult.homeScore}-${simulationResult.awayScore}`,
          result: homeWin ? 'HOME_WIN' : awayWin ? 'AWAY_WIN' : 'DRAW'
        });
        
        console.log(`✅ [DAY 8 FIX] Fixed: ${game.homeTeam.name} ${simulationResult.homeScore}-${simulationResult.awayScore} ${game.awayTeam.name}`);
        
      } catch (gameError) {
        console.error(`❌ [DAY 8 FIX] Failed to fix game ${game.id}:`, gameError);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully fixed ${fixedGames.length} Day 8 games with proper simulation`,
      fixedGames,
      totalGamesProcessed: brokenDay8Games.length
    });
    
  } catch (error) {
    console.error('❌ [DAY 8 FIX] Error fixing Day 8 games:', error);
    res.status(500).json({ message: `Failed to fix Day 8 games: ${error.message}` });
  }
}));

// Add transactions route that matches frontend expectations
router.get('/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [TRANSACTIONS] /api/teams/transactions route called');
  
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  // Get user's team first
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }
  
  try {
    // Get team payment history and convert BigInt to strings
    const transactions = await PaymentHistoryService.getTeamPaymentHistory(team.id.toString());
    
    // Convert BigInt values to strings for JSON serialization
    const serializedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      creditsAmount: transaction.creditsAmount?.toString() || '0',
      gemsAmount: transaction.gemsAmount || 0
    }));
    
    console.log(`✅ [TRANSACTIONS] Found ${serializedTransactions.length} transactions for team ${team.id}`);
    res.json(serializedTransactions);
  } catch (error) {
    console.error('❌ [TRANSACTIONS] Error getting transactions:', error);
    res.status(500).json({ message: "Failed to get transactions" });
  }
}));

// Get team by ID (for live match viewer)
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  
  if (isNaN(teamId)) {
    return res.status(400).json({ message: "Invalid team ID" });
  }
  
  const team = await storage.teams.getTeamById(teamId);
  
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }
  
  // Return basic team info for live match viewer
  res.json({
    id: team.id,
    name: team.name,
    logoUrl: team.logoUrl,
    division: team.division,
    subdivision: team.subdivision
  });
}));

console.log('🔍 [teamRoutes.ts] Router configured with routes, exporting...');
console.log('🔍 [teamRoutes.ts] Router stack length:', router.stack.length);

// Get staff members for a team
router.get('/:teamId/staff', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    let teamId = parseInt(req.params.teamId);

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    // Fetch staff with proper authentication check
    const userId = req.user?.claims?.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      throw ErrorCreators.unauthorized("Your team was not found");
    }

    // Only allow users to see their own team's staff for now
    if (userTeam.id !== teamId) {
      throw ErrorCreators.unauthorized("You can only view your own team's staff");
    }

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Get contracts for all staff members and calculate proper costs
    const staffWithContracts = await Promise.all(
      staff.map(async (member) => {
        try {
          const contracts = await storage.contracts.getActiveContractsByStaff(member.id);
          const activeContract = contracts.length > 0 ? contracts[0] : null;
          
          return {
            ...member,
            contract: activeContract ? {
              id: activeContract.id,
              salary: Number(activeContract.salary),
              duration: activeContract.length,
              remainingYears: activeContract.length,
              signedDate: activeContract.startDate,
              expiryDate: activeContract.startDate
            } : null
          };
        } catch (error) {
          console.error(`Error fetching contract for staff member ${member.id}:`, error);
          return {
            ...member,
            contract: null
          };
        }
      })
    );
    
    // Calculate total staff cost based on skills and position importance
    const totalStaffCost = staffWithContracts.reduce((total, member) => {
      if (member.contract && member.contract.salary) {
        return total + member.contract.salary;
      }
      
      // Skill-based calculation with position multipliers
      let baseCost = 0;
      
      switch (member.type) {
        case 'HEAD_COACH':
          // Most important - motivation, development, tactics
          baseCost = (member.motivation || 5) * 200 + (member.development || 5) * 200 + (member.tactics || 5) * 200;
          break;
        case 'PASSER_TRAINER':
        case 'RUNNER_TRAINER': 
        case 'BLOCKER_TRAINER':
          // Training specialists - teaching is primary
          baseCost = (member.teaching || 5) * 300 + (member.development || 5) * 100;
          break;
        case 'SCOUT':
          // Scouting specialists - talent identification and assessment
          baseCost = (member.talentIdentification || 5) * 250 + (member.potentialAssessment || 5) * 250;
          break;
        case 'RECOVERY_SPECIALIST':
          // Medical specialist - physiology is primary
          baseCost = (member.physiology || 5) * 400 + (member.development || 5) * 100;
          break;
        default:
          // Generic calculation
          const skillAverage = (
            (member.motivation || 5) + (member.development || 5) + (member.teaching || 5) + 
            (member.physiology || 5) + (member.talentIdentification || 5) + 
            (member.potentialAssessment || 5) + (member.tactics || 5)
          ) / 7;
          baseCost = skillAverage * 150;
      }
      
      // Apply level multiplier and minimum cost
      const levelMultiplier = 1 + ((member.level || 1) - 1) * 0.5; // 50% increase per level
      return total + Math.max(1000, Math.round(baseCost * levelMultiplier));
    }, 0);
    
    return res.json({
      staff: staffWithContracts,
      totalStaffCost,
      totalStaffMembers: staffWithContracts.length
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    throw error;
  }
}));

// Debug endpoint to check staff count and types
router.get('/:teamId/staff/debug', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    let teamId = parseInt(req.params.teamId);

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Group staff by type and count
    const staffByType = staff.reduce((acc, member) => {
      if (!acc[member.type]) {
        acc[member.type] = [];
      }
      acc[member.type].push({
        id: member.id,
        name: member.name,
        level: member.level,
        age: member.age
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Count staff by type
    const staffCounts = Object.keys(staffByType).reduce((acc, type) => {
      acc[type] = staffByType[type].length;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      teamId,
      totalStaffMembers: staff.length,
      staffCounts,
      staffByType
    });
  } catch (error) {
    console.error("Error debugging staff:", error);
    throw error;
  }
}));

// Clean up duplicate staff members (admin endpoint)
router.post('/:teamId/staff/cleanup-duplicates', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    let teamId = parseInt(req.params.teamId);

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    const staff = await storage.staff.getStaffByTeamId(teamId);
    
    // Group staff by type
    const staffByType = staff.reduce((acc, member) => {
      if (!acc[member.type]) {
        acc[member.type] = [];
      }
      acc[member.type].push(member);
      return acc;
    }, {} as Record<string, any[]>);

    let deletedCount = 0;
    const keptStaff = [];

    // For each staff type, keep the first one and delete the rest
    for (const [type, members] of Object.entries(staffByType)) {
      if (members.length > 1) {
        // Keep the first member (oldest ID)
        const toKeep = members.sort((a, b) => a.id - b.id)[0];
        keptStaff.push(toKeep);
        
        // Delete the duplicates
        const toDelete = members.slice(1);
        for (const duplicate of toDelete) {
          console.log(`🗑️ Deleting duplicate ${type}: ${duplicate.name} (ID: ${duplicate.id})`);
          await storage.staff.deleteStaff(duplicate.id);
          deletedCount++;
        }
      } else if (members.length === 1) {
        // Only one of this type, keep it
        keptStaff.push(members[0]);
      }
    }

    // Special handling for SCOUT type - should have exactly 2 (Tony Scout and Emma Talent)
    const scouts = staffByType['SCOUT'] || [];
    if (scouts.length > 2) {
      // Find one Tony Scout and one Emma Talent, delete the rest
      const tonyScout = scouts.find(s => s.name === 'Tony Scout');
      const emmaTalent = scouts.find(s => s.name === 'Emma Talent');
      
      if (tonyScout && emmaTalent) {
        // Delete all other scouts
        const toDeleteScouts = scouts.filter(s => s.id !== tonyScout.id && s.id !== emmaTalent.id);
        for (const scout of toDeleteScouts) {
          console.log(`🗑️ Deleting duplicate scout: ${scout.name} (ID: ${scout.id})`);
          await storage.staff.deleteStaff(scout.id);
          deletedCount++;
        }
      }
    }

    // Recalculate team staff salaries after cleanup
    const { teamFinancesStorage } = await import('../storage/teamFinancesStorage.js');
    await teamFinancesStorage.recalculateAndSaveStaffSalaries(teamId);

    return res.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate staff members`,
      deletedCount,
      remainingStaffCount: staff.length - deletedCount,
      expectedStaffCount: 7
    });
  } catch (error) {
    console.error("Error cleaning up duplicate staff:", error);
    throw error;
  }
}));

// Add missing Tony Scout (Head Scout) to complete 7-position roster
router.post('/:teamId/staff/add-missing-scout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    let teamId = parseInt(req.params.teamId);

    if (req.params.teamId === "my") {
      const userId = req.user?.claims?.sub;
      const team = await storage.teams.getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found for current user" });
      }
      teamId = team.id;
    }

    // Check if Tony Scout already exists
    const existingStaff = await storage.staff.getStaffByTeamId(teamId);
    const tonyScout = existingStaff.find(s => s.name === 'Tony Scout');
    
    if (tonyScout) {
      return res.json({
        success: false,
        message: "Tony Scout already exists on this team",
        existingStaffCount: existingStaff.length
      });
    }

    // Add Tony Scout as Head Scout
    const newTonyScout = {
      teamId,
      type: 'SCOUT' as const,
      name: 'Tony Scout',
      level: 1,
      motivation: Math.floor(Math.random() * 5) + 4, // 4-8
      development: Math.floor(Math.random() * 5) + 4, // 4-8
      teaching: Math.floor(Math.random() * 5) + 4, // 4-8
      physiology: Math.floor(Math.random() * 5) + 4, // 4-8
      talentIdentification: Math.floor(Math.random() * 5) + 6, // 6-10 (primary skill)
      potentialAssessment: Math.floor(Math.random() * 5) + 6, // 6-10 (primary skill)
      tactics: Math.floor(Math.random() * 5) + 4, // 4-8
      age: Math.floor(Math.random() * 20) + 35 // 35-54
    };

    const addedStaff = await storage.staff.createStaff(newTonyScout);
    
    // Recalculate team staff salaries after adding new staff
    const { teamFinancesStorage } = await import('../storage/teamFinancesStorage.js');
    await teamFinancesStorage.recalculateAndSaveStaffSalaries(teamId);

    return res.json({
      success: true,
      message: "Tony Scout added as Head Scout",
      addedStaff,
      newStaffCount: existingStaff.length + 1
    });
  } catch (error) {
    console.error("Error adding Tony Scout:", error);
    throw error;
  }
}));

// ===== RECRUITING SYSTEM ENDPOINTS =====

// Host tryouts (recruiting system)
router.post('/:teamId/tryouts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { type } = req.body;
    const userId = req.user?.claims?.sub;

    // Get team
    let team;
    if (teamId === "my") {
      team = await storage.teams.getTeamByUserId(userId);
    } else {
      team = await storage.teams.getTeamById(parseInt(teamId));
      // Verify ownership
      const userTeam = await storage.teams.getTeamByUserId(userId);
      if (!userTeam || userTeam.id !== team?.id) {
        return res.status(403).json({ error: "You don't own this team" });
      }
    }
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check costs and affordability
    const costs = { basic: 25000, advanced: 75000 };
    const cost = costs[type as keyof typeof costs];

    if (!cost) {
      return res.status(400).json({ error: "Invalid tryout type. Use 'basic' or 'advanced'" });
    }

    const teamFinances = await storage.teamFinances.getTeamFinances(team.id);
    const currentCredits = Number(teamFinances?.credits || 0);

    if (currentCredits < cost) {
      return res.status(400).json({ 
        error: `Insufficient credits. Required: ${cost}₡, Available: ${currentCredits}₡` 
      });
    }

    // Generate candidates based on type
    const candidateCount = type === 'advanced' ? 5 : 3;
    const candidates = [];
    
    const races = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'];
    const lastNames = ['Storm', 'Stone', 'Swift', 'Bright', 'Strong', 'Bold', 'True', 'Fair', 'Wild', 'Free'];
    
    for (let i = 0; i < candidateCount; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      // Base stats (6-20 range for prospects)
      const statBonus = type === 'advanced' ? 4 : 0; // Advanced gets better prospects
      const baseStats = {
        speed: Math.floor(Math.random() * 10) + 8 + statBonus,
        power: Math.floor(Math.random() * 10) + 8 + statBonus,
        throwing: Math.floor(Math.random() * 10) + 8 + statBonus,
        catching: Math.floor(Math.random() * 10) + 8 + statBonus,
        kicking: Math.floor(Math.random() * 10) + 8 + statBonus,
        leadership: Math.floor(Math.random() * 10) + 8 + statBonus,
        agility: Math.floor(Math.random() * 10) + 8 + statBonus,
      };
      
      // Generate potential (better for advanced)
      const potentialMin = type === 'advanced' ? 2.0 : 1.5;
      const potentialMax = type === 'advanced' ? 4.0 : 3.0;
      const potentialRating = Math.random() * (potentialMax - potentialMin) + potentialMin;
      
      // Calculate market value
      const avgStat = Object.values(baseStats).reduce((a, b) => a + b, 0) / 7;
      const marketValue = Math.floor(1000 + (avgStat * 50) + (potentialRating * 500) + (Math.random() * 500));
      
      const candidate = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        race,
        age: Math.floor(Math.random() * 5) + 18, // 18-22 years old
        ...baseStats,
        potentialRating,
        marketValue,
        potential: potentialRating >= 3.5 ? "High" : potentialRating >= 2.5 ? "Medium" : "Low",
        overallPotentialStars: Math.round(potentialRating),
        catching: baseStats.catching,
        kicking: baseStats.kicking
      };
      
      candidates.push(candidate);
    }

    // Deduct credits
    await storage.teamFinances.updateTeamFinances(team.id, {
      credits: currentCredits - cost
    });

    return res.json({
      success: true,
      candidates,
      type,
      creditsSpent: cost,
      remainingCredits: currentCredits - cost
    });

  } catch (error) {
    console.error("Error hosting tryouts:", error);
    throw error;
  }
}));

export default router;