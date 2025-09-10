import { Router, type Request, type Response, type NextFunction } from "express";

console.log('🔍 [teamRoutes.ts] Module loading...');
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod";
import { ErrorCreators, asyncHandler } from '../services/errorService.js';
import { DatabaseService } from "../database/DatabaseService.js";
import { TeamNameValidator } from '../services/teamNameValidation.js';
import { CamaraderieService } from '../services/camaraderieService.js';
import { cacheResponse } from "../middleware/cacheMiddleware.js";
import { PaymentHistoryService } from '../services/paymentHistoryService.js';
import type { Player, Team, TeamFinances, League } from '@shared/types/models';


const router = Router();

// Calculate team power from players
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;

  const playersWithPower = players.map(player => ({
    ...player,
    individualPower: Math.round(((player?.speed ?? 20) + (player?.power ?? 20) + (player?.agility ?? 20) + 
                                (player?.throwing ?? 20) + (player?.catching ?? 20) + (player?.kicking ?? 20) + 
                                (player?.staminaAttribute ?? 20) + (player?.leadership ?? 20)) / 8)
  }));

  const topPlayers = playersWithPower
    .sort((a: any, b: any) => (b?.individualPower ?? 0) - (a?.individualPower ?? 0))
    .slice(0, 9);

  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + (player?.individualPower ?? 0), 0);
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
    projectId: admin?.apps?.[0]?.options?.projectId ?? 'none',
    hasServiceAccount: !!(admin?.apps?.[0]?.options?.credential),
    nodeEnv: process.env.NODE_ENV,
    viteFirebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
    timestamp: new Date()
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
  
  const userId = req?.user?.uid;
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

  console.log('✅ Team found! playersCount:', team?.playersCount, 'players.length:', team.players?.length);

  // Use team object directly (working approach from debug endpoint)  
  const teamPower = calculateTeamPower(team?.players || []);
  
  // Calculate real-time camaraderie
  const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());

  // Team object already has players with contracts from serializeTeamData()
  const serializedTeam = { 
    ...team, 
    teamPower, 
    teamCamaraderie 
  };

  if (serializedTeam?.finances) {
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

  // CRITICAL FIX: Get real-time statistics from completed games instead of stale database values
  console.log(`🔍 [DEBUG] About to calculate real-time stats for team: ${team.name} (ID: ${team.id})`);
  console.log(`🔍 [DEBUG] Current database values: ${serializedTeam.wins}W-${serializedTeam.draws}D-${serializedTeam.losses}L-${serializedTeam.points}pts`);
  
  const { calculateTeamStatisticsFromGames } = await import('../utils/teamStatisticsCalculator.js');
  
  let correctedSerializedTeam;
  
  try {
    // Calculate real statistics from actual game results
    const realTimeStats = await calculateTeamStatisticsFromGames(
      parseInt(team.id.toString()), 
      team.name
    );
    
    console.log(`🔧 [REAL-TIME STATS] ${serializedTeam.name}: DB shows ${serializedTeam.wins}W-${serializedTeam.draws}D-${serializedTeam.losses}L, Real: ${realTimeStats.wins}W-${realTimeStats.draws}D-${realTimeStats.losses}L`);
    
    // Use real-time statistics instead of stale database values
    correctedSerializedTeam = {
      ...serializedTeam,
      wins: realTimeStats.wins,
      losses: realTimeStats.losses, 
      draws: realTimeStats.draws,
      points: realTimeStats.points,
      played: realTimeStats.gamesPlayed
    };
    
  } catch (statsError) {
    console.error('❌ [STATS ERROR] Failed to calculate real-time stats, using database values:', statsError);
    
    // Fallback to database values if stats calculation fails
    correctedSerializedTeam = {
      ...serializedTeam,
      played: (serializedTeam.wins || 0) + (serializedTeam.losses || 0) + (serializedTeam.draws || 0)
    };
  }

  return res.json(correctedSerializedTeam);
}));

// ===== FINANCIAL SYSTEM ROUTES =====
// Team finances endpoint - User team finances for finance page
router.get('/my/finances', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [FINANCES] /api/teams/my/finances endpoint called');
  
  const userId = req?.user?.uid;
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
    throw ErrorCreators.validation("Invalid team ID");
  }

  // REFACTORED: Use EnhancedTeamManagementService for clean service layer architecture
  const { EnhancedTeamManagementService } = await import('../services/enhancedTeamManagementService.js');
  const comprehensiveFinances = await EnhancedTeamManagementService.calculateComprehensiveFinances(teamId);
  
  // Create response object maintaining API compatibility
  const calculatedFinances = {
    ...comprehensiveFinances.rawFinances,
    // Calculated values for frontend
    playerSalaries: comprehensiveFinances.playerSalaries,
    staffSalaries: comprehensiveFinances.staffSalaries,
    totalExpenses: comprehensiveFinances.totalExpenses,
    netIncome: comprehensiveFinances.netIncome,
    // Maintenance cost in proper format
    maintenanceCosts: comprehensiveFinances.maintenanceCosts
  };

  console.log('✅ [FINANCES] Successfully returned calculated finances for teamId:', teamId);
  console.log('📊 [FINANCES] Calculations: playerSalaries:', comprehensiveFinances.playerSalaries, 'staffSalaries:', comprehensiveFinances.staffSalaries, 'netIncome:', comprehensiveFinances.netIncome);
  res.json(calculatedFinances);
}));

// Team contracts endpoint
router.get('/:teamId/contracts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [CONTRACTS] /api/teams/:teamId/contracts endpoint called');
  
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) {
    throw ErrorCreators.validation("Invalid team ID");
  }

  const userId = req?.user?.uid;
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
    throw ErrorCreators.validation("Invalid team ID");
  }

  const userId = req?.user?.uid;
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
      ...(Array.isArray(teamTransactions) ? teamTransactions : teamTransactions?.transactions || []),
      ...(Array.isArray(userTransactions) ? userTransactions : userTransactions?.transactions || [])
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [TRANSACTIONS] Successfully returned transactions for teamId:', teamId, 'count:', allTransactions.length);
    res.json({
      success: true,
      transactions: allTransactions,
      totalCount: allTransactions.length
    });
  } catch (error) {
    console.error('❌ [TRANSACTIONS] Error fetching transactions:', error);
    throw ErrorCreators.internal("Failed to fetch transactions");
  }
}));

// EXTRACTED TO teamMatchesRoutes.ts: All match-related routes
// - /my/next-opponent
// - /my-schedule/comprehensive  
// - /:teamId/matches/recent
// - /my/matches/upcoming
// - /:teamId/matches/upcoming

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
// ARCHIVED: Legacy debug route for fixing opponent data

// REMOVED: Duplicate standings route that conflicts with leagueRoutes.ts enhanced version
// The enhanced standings calculation is handled in /api/leagues/:division/standings


// Fix financial balance based on transaction history (direct database approach)
router.post('/:teamId/fix-financial-balance', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [FINANCIAL FIX] Fixing team financial balance from transaction history');
  
  const { teamId } = req.params;
  const userId = req.user?.claims?.sub;
  
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [FINANCIAL FIX] Error fixing balance:', error);
    res.status(500).json({ message: `Failed to fix financial balance: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Set all players camaraderie to base level
router.post('/set-all-players-camaraderie', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [CAMARADERIE] Setting all players camaraderie to base level (50)');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [CAMARADERIE] Error setting camaraderie:', error);
    res.status(500).json({ message: `Failed to set camaraderie: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));


// Fix Day 9 game dates - move 4 games to August 24th
router.post('/fix-day9-dates', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('📅 [FIX DAY 9] Moving 4 games from August 25th to August 24th (Day 9)');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [FIX DAY 9] Error:', error);
    res.status(500).json({ message: `Failed to fix Day 9 dates: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Reset test games to proper Day 9 schedule
router.post('/reset-test-games', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔄 [RESET TEST GAMES] Resetting manual test games to proper Day 9 times');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [RESET TEST GAMES] Error:', error);
    res.status(500).json({ message: `Failed to reset test games: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Fix Day 8 games stuck in IN_PROGRESS and recalculate standings
router.post('/fix-day8-status-and-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [FIX DAY 8] Fixing Day 8 games status and recalculating standings');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
    // Step 1: Fix Day 8 games that are stuck in IN_PROGRESS but have final scores
    const day8Games = [3969, 3970, 3971, 3972]; // From debug output
    
    console.log('🔧 [FIX DAY 8] Updating Day 8 games from IN_PROGRESS to COMPLETED');
    for (const gameId of day8Games) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'COMPLETED' }
      });
      console.log(`✅ [FIX DAY 8] Game ${gameId} status updated to COMPLETED`);
      
      // BULLETPROOF STANDINGS UPDATE: Automatically update when game marked completed
      try {
        const { StandingsUpdateService } = await import('../services/standingsUpdateService.js');
        await StandingsUpdateService.onGameCompleted(gameId);
        console.log(`✅ [FIX DAY 8] Standings updated for game ${gameId}`);
      } catch (standingsError) {
        console.error(`❌ [FIX DAY 8] Error updating standings for game ${gameId}:`, standingsError);
      }
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
    
  } catch (error: unknown) {
    console.error('❌ [FIX DAY 8] Error:', error);
    res.status(500).json({ message: `Failed to fix Day 8 and standings: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Debug and check all games status
router.post('/debug-games-status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 [DEBUG GAMES] Checking all Day 7 and Day 8 games status');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [DEBUG GAMES] Error:', error);
    res.status(500).json({ message: `Failed to debug games: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Reset and recalculate all standings from scratch
router.post('/reset-all-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🚨 [COMPREHENSIVE RESET v2] This is the COMPREHENSIVE reset-all-standings endpoint running!');
  console.log('🔄 [COMPREHENSIVE RESET v2] Clearing games, resetting season, and generating 14-game schedule');
  console.log('🔧 [COMPREHENSIVE RESET v2] Full Division 7 Alpha reset with proper scheduling');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  console.log(`🔍 [DEBUG] Looking for userId: "${userId}"`);
  
  try {
    const prisma = await DatabaseService.getInstance();
    
    // Step 0: Get user's team to determine division/subdivision scope
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId },
      include: { Team: true }
    });

    console.log(`🔍 [DEBUG] UserProfile found:`, userProfile?.id, 'Team count:', userProfile?.Team?.length || 0);

    if (!userProfile || !userProfile.Team[0]) {
      return res.status(404).json({ error: "User team not found" });
    }

    const userTeam = userProfile.Team[0];
    const targetDivision = userTeam.division;
    const targetSubdivision = userTeam.subdivision;

    console.log(`🎯 [RESET STANDINGS] Resetting standings for Division ${targetDivision} ${targetSubdivision} ONLY`);

    // Step 1: Reset ONLY teams in the same division/subdivision
    await prisma.team.updateMany({
      where: {
        division: targetDivision,
        subdivision: targetSubdivision
      },
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    
    console.log(`🔄 [RESET STANDINGS] Division ${targetDivision} ${targetSubdivision} team standings reset to 0`);
    
    // Step 2: Get teams in this division/subdivision
    const subdivisionTeams = await prisma.team.findMany({
      where: {
        division: targetDivision,
        subdivision: targetSubdivision
      },
      select: { id: true }
    });

    const teamIds = subdivisionTeams.map(team => team.id);
    console.log(`🎯 [RESET STANDINGS] Found ${teamIds.length} teams in Division ${targetDivision} ${targetSubdivision}: ${teamIds.join(', ')}`);

    // STEP 3: CLEAR ALL GAMES FOR THIS SUBDIVISION
    const deletedGames = await prisma.game.deleteMany({
      where: {
        // Delete ALL games involving teams in this subdivision
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } }
        ]
      }
    });
    
    console.log(`🗑️ [COMPREHENSIVE RESET] CLEARED ${deletedGames.count} games for Division ${targetDivision} ${targetSubdivision}`);
    
    // STEP 4: RESET SEASON TO DAY 1
    const currentSeason = await prisma.season.findFirst({
      where: { phase: 'REGULAR_SEASON' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (currentSeason) {
      await prisma.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: 1 }
      });
      console.log(`📅 [COMPREHENSIVE RESET] Reset season ${currentSeason.id} to Day 1`);
    }
    
    // STEP 5: GENERATE 14-GAME ROUND-ROBIN SCHEDULE
    if (!currentSeason) {
      return res.status(404).json({ error: 'No active season found for schedule generation' });
    }
    
    // Find or create schedule for this subdivision
    let schedule = await prisma.schedule.findFirst({
      where: {
        seasonId: currentSeason.id,
        division: targetDivision,
        subdivision: targetSubdivision
      }
    });
    
    if (!schedule) {
      schedule = await prisma.schedule.create({
        data: {
          seasonId: currentSeason.id,
          division: targetDivision,
          subdivision: targetSubdivision,
          isActive: true
        }
      });
    }
    
    console.log(`📋 [COMPREHENSIVE RESET] Using schedule ID: ${schedule.id}`);
    
    // Generate 14-game round-robin schedule
    const games = [];
    const teams = subdivisionTeams;
    const seasonStartDate = new Date(currentSeason.startDate);
    
    // Round-robin algorithm: 8 teams, 14 days, 4 games per day
    function generateRoundRobinSchedule(teams: any[]) {
      const schedule = [];
      const n = teams.length; // 8 teams
      const totalRounds = (n - 1) * 2; // 14 rounds for double round-robin
      
      for (let round = 0; round < 14; round++) {
        const dayGames = [];
        
        // Use a simple round-robin pairing algorithm
        for (let i = 0; i < n / 2; i++) {
          let home = (round + i) % n;
          let away = (round + n - 1 - i) % n;
          
          // For second half of season, swap home/away
          if (round >= 7) {
            [home, away] = [away, home];
          }
          
          if (home !== away) {
            dayGames.push({
              home: teams[home],
              away: teams[away]
            });
          }
        }
        
        schedule.push(dayGames);
      }
      
      return schedule;
    }
    
    const roundRobinSchedule = generateRoundRobinSchedule(teams);
    
    // Convert to database format
    for (let day = 0; day < 14; day++) {
      const dayGames = roundRobinSchedule[day];
      
      for (const matchup of dayGames) {
        games.push({
          homeTeamId: matchup.home.id,
          awayTeamId: matchup.away.id,
          gameDate: new Date(seasonStartDate.getTime() + (day * 24 * 60 * 60 * 1000)),
          scheduleId: schedule.id,
          matchType: 'LEAGUE' as const,
          status: 'SCHEDULED' as const,
          simulated: false,
          homeScore: 0,
          awayScore: 0
        });
      }
      
      console.log(`📅 [COMPREHENSIVE RESET] Day ${day + 1}: ${dayGames.length} games scheduled`);
    }
    
    // Insert all games
    const createdGames = await prisma.game.createMany({
      data: games
    });
    
    console.log(`✅ [COMPREHENSIVE RESET] Created ${createdGames.count} new games`);
    
    // STEP 6: VERIFY SCHEDULE AND PROVIDE COMPREHENSIVE FEEDBACK
    const finalStandings = await prisma.team.findMany({
      where: { division: targetDivision, subdivision: targetSubdivision },
      select: {
        id: true,
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
    
    // Verify schedule requirements
    const gameStats: Record<number, { name: string; total: number; home: number; away: number; opponents: Set<number> }> = {};
    
    for (const team of finalStandings) {
      gameStats[team.id] = {
        name: team.name,
        total: 0,
        home: 0,
        away: 0,
        opponents: new Set()
      };
    }
    
    for (const game of games) {
      gameStats[game.homeTeamId].total++;
      gameStats[game.homeTeamId].home++;
      gameStats[game.homeTeamId].opponents.add(game.awayTeamId);
      
      gameStats[game.awayTeamId].total++;
      gameStats[game.awayTeamId].away++;
      gameStats[game.awayTeamId].opponents.add(game.homeTeamId);
    }
    
    const verification = finalStandings.map(team => {
      const stats = gameStats[team.id];
      return {
        name: stats.name,
        games: stats.total,
        home: stats.home,
        away: stats.away,
        opponents: stats.opponents.size,
        valid: stats.total === 14 && stats.home === 7 && stats.away === 7 && stats.opponents.size === 7
      };
    });
    
    res.json({
      success: true,
      message: `🎉 COMPREHENSIVE RESET COMPLETE for Division ${targetDivision} ${targetSubdivision}`,
      resetSummary: {
        division: targetDivision,
        subdivision: targetSubdivision,
        teamsReset: finalStandings.length,
        gamesCleared: deletedGames.count,
        gamesCreated: createdGames.count,
        seasonDay: 1,
        scheduleId: schedule.id
      },
      verification,
      finalStandings: finalStandings.map(team => ({
        name: team.name,
        record: `${team.wins}W-${team.losses}L-${team.points}pts`
      }))
    });
    
  } catch (error: unknown) {
    console.error('❌ [RESET STANDINGS] Error:', error);
    res.status(500).json({ message: `Failed to reset standings: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Fix completed games standings update
router.post('/fix-completed-standings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [STANDINGS FIX] Updating standings for completed games that were missed');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
    
  } catch (error: unknown) {
    console.error('❌ [STANDINGS FIX] Error:', error);
    res.status(500).json({ message: `Failed to fix standings: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Fix Day 8 games with proper simulation
router.post('/fix-day8-games', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [DAY 8 FIX] Fixing Day 8 games with proper simulation');
  
  const userId = req?.user?.uid;
  if (!userId) {
    throw ErrorCreators.unauthorized("User ID not found in token");
  }
  
  try {
    const prisma = await DatabaseService.getInstance();
    
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
        const { QuickMatchSimulation } = await import('../services/enhancedSimulationEngine.js');
        
        // Run the full match simulation
        const simulationResult = await QuickMatchSimulation.runQuickSimulation(
          game.id.toString()
        );
        
        // Update the game with proper scores and simulation data
        await prisma.game.update({
          where: { id: game.id },
          data: {
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away,
            simulationLog: JSON.stringify(simulationResult),
            simulated: true,
            status: 'COMPLETED'
          }
        });
        
        // Update team records
        const homeWin = simulationResult.finalScore.home > simulationResult.finalScore.away;
        const awayWin = simulationResult.finalScore.away > simulationResult.finalScore.home;
        const isDraw = simulationResult.finalScore.home === simulationResult.finalScore.away;
        
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
          score: `${simulationResult.finalScore.home}-${simulationResult.finalScore.away}`,
          result: homeWin ? 'HOME_WIN' : awayWin ? 'AWAY_WIN' : 'DRAW'
        });
        
        console.log(`✅ [DAY 8 FIX] Fixed: ${game.homeTeam.name} ${simulationResult.finalScore.home}-${simulationResult.finalScore.away} ${game.awayTeam.name}`);
        
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
    
  } catch (error: unknown) {
    console.error('❌ [DAY 8 FIX] Error fixing Day 8 games:', error);
    res.status(500).json({ message: `Failed to fix Day 8 games: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Add transactions route that matches frontend expectations
// EXTRACTED TO teamContractsRoutes.ts: GET /transactions
// EXTRACTED TO teamCoreRoutes.ts: GET /:id

console.log('🔍 [teamRoutes.ts] Router configured with routes, exporting...');
console.log('🔍 [teamRoutes.ts] Router stack length:', router.stack.length);

// EXTRACTED TO teamManagementRoutes.ts: All team management routes
// - Staff management (get, debug, cleanup-duplicates, add-missing-scout)
// - Tryouts system (recruiting)  
// - Formation management (get/put formation)
// - Player management (get players, taxi squad operations)
// - Seasonal data tracking

// Quick fix for Oakland Cougars statistics synchronization
router.post('/fix-oakland-stats', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔧 [FIX] Oakland Cougars statistics fix requested');
  
  try {
    const { fixOaklandCougarsStats } = await import('../scripts/quickFix.js');
    const result = await fixOaklandCougarsStats();
    
    console.log('✅ [FIX] Oakland Cougars statistics fix completed');
    res.json(result);
  } catch (error) {
    console.error('❌ [FIX] Oakland Cougars fix failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;