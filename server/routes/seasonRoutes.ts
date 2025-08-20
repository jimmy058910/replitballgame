import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js'; // Adjusted path
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod"; // For validation

// Import asyncHandler for error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// Import timezone utilities for current cycle calculation
import { getServerTimeInfo, EASTERN_TIMEZONE, getEasternTimeAsDate } from "../../shared/timezone.js";

// Zod Schemas for validation
const playoffStartSchema = z.object({
    division: z.number().min(1).max(8),
});

const contractNegotiationSchema = z.object({
    playerId: z.string().uuid(),
    teamId: z.string().uuid(), // Should ideally be derived from user or verified against user's team
    salary: z.number().min(1),
    duration: z.number().min(1).max(5), // Example: 1-5 year contracts
    // bonuses: z.record(z.any()).optional(),
    // contractType: z.string().optional(),
});

const sponsorshipNegotiationSchema = z.object({
    teamId: z.string().uuid(), // Should be derived/verified
    sponsorName: z.string().min(1),
    dealType: z.string().min(1),
    value: z.number().min(1),
    duration: z.number().min(1).max(5),
    // bonusConditions: z.record(z.any()).optional(),
});


// ===== SEASON CHAMPIONSHIPS & PLAYOFFS ROUTES =====
router.get('/current', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const season = await storage.seasons.getCurrentSeason(); // Assumes this returns the active season
    if (!season) {
        // If no active season, might create one or return specific status
        return res.status(404).json({ message: "No active season found. Please start a new season." });
    }
    res.json(season);
  } catch (error) {
    console.error("Error fetching current season:", error);
    next(error);
  }
});

// DEBUG: Test route to verify routing works
router.get('/debug-test', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 [DEBUG] Debug test route called!');
  res.json({ success: true, message: 'Debug test route working', timestamp: new Date().toISOString() });
});

// Get current season cycle (day-by-day info)
// Get current week info (simple week data for SuperUser page)
router.get('/current-week', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await storage.seasons.getCurrentSeason();
    let week = 1;
    let season = "Season 0";
    
    if (currentSeason) {
      week = Math.ceil((currentSeason.currentDay || 1) / 7) || 1; // Simple week calculation
      season = `Season ${currentSeason.seasonNumber || 0}`;
    }
    
    res.json({ 
      week,
      season,
      currentDay: currentSeason?.currentDay || 1
    });
  } catch (error) {
    console.error("Error fetching current week:", error);
    next(error);
  }
});

router.get('/current-cycle', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  console.log('🔥 [SEASON ROUTES] /current-cycle called - this is seasonRoutes.ts');
  try {
    console.log('🔍 [current-cycle] Starting route...');
    // Get current season from database to get the actual currentDay
    const currentSeason = await storage.seasons.getCurrentSeason();
    let currentDayInCycle = 5; // Default fallback
    let seasonNumber = 0; // Default season number
    
    console.log('🔍 [current-cycle] Season data from database:', JSON.stringify(currentSeason, null, 2));
    console.log('🔍 [current-cycle] Type of currentDay:', typeof currentSeason?.currentDay);
    console.log('🔍 [current-cycle] Value of currentDay:', currentSeason?.currentDay);
    
    if (currentSeason && typeof currentSeason.currentDay === 'number') {
      currentDayInCycle = currentSeason.currentDay;
      seasonNumber = currentSeason.seasonNumber || 0;
      console.log('✅ [current-cycle] Using database value:', { currentDayInCycle, seasonNumber });
    } else {
      // Fallback to calculation if no database value
      const startDate = new Date("2025-07-13");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDayInCycle = (daysSinceStart % 17) + 1;
      seasonNumber = Math.floor(daysSinceStart / 17);
      console.log('⚠️ [current-cycle] Using calculated value:', { currentDayInCycle, seasonNumber, daysSinceStart });
    }
    
    // Determine the phase and dynamic content based on current day in cycle
    let phase = "Regular Season";
    let phaseTitle = "Regular Season";
    let description = "";
    let dynamicDetail = "";
    let daysUntilPlayoffs = 0;
    let daysUntilNewSeason = 0;
    let countdownText = "";

    if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
      // Phase 1: Regular Season (Days 1-14)
      phase = "Regular Season";
      phaseTitle = "Regular Season";
      description = "Compete in your division to earn a spot in the playoffs.";
      
      // Dynamic detail based on specific day
      if (currentDayInCycle === 1) {
        dynamicDetail = "A new season begins! Your first match is today.";
      } else if (currentDayInCycle === 14) {
        dynamicDetail = "Final day of the regular season! Secure your playoff spot!";
      } else {
        dynamicDetail = "The league grind continues. Every game counts.";
      }
      
      daysUntilPlayoffs = 15 - currentDayInCycle;
      countdownText = `${daysUntilPlayoffs} Days Until Playoffs`;
      
    } else if (currentDayInCycle === 15) {
      // Phase 2: Playoffs (Day 15)
      phase = "Playoffs";
      phaseTitle = "Championship Day";
      description = "The top 4 teams from each league compete for the title.";
      dynamicDetail = "It's win or go home! Semifinals and the Championship will be decided today.";
      daysUntilPlayoffs = 0;
      daysUntilNewSeason = 2; // Days 16-17 remaining
      countdownText = "Next Round Simulates In: [HH:MM:SS]"; // TODO: Add real-time countdown
      
    } else if (currentDayInCycle >= 16 && currentDayInCycle <= 17) {
      // Phase 3: Off-Season (Days 16-17)
      phase = "Off-Season";
      phaseTitle = "Off-Season: Management Phase";
      description = "Build your dynasty. Sign contracts, recruit new talent, and set your strategy.";
      
      // Dynamic detail based on specific day
      if (currentDayInCycle === 16) {
        dynamicDetail = "Contract negotiations are open! Secure your key players for next season.";
        daysUntilNewSeason = 1;
      } else if (currentDayInCycle === 17) {
        dynamicDetail = "Final day to prepare. The league re-shuffle and new season schedule will be announced at 3 AM.";
        daysUntilNewSeason = 0;
      }
      
      daysUntilPlayoffs = 0;
      countdownText = daysUntilNewSeason > 0 ? `New Season Begins In: ${daysUntilNewSeason} Days` : "New Season Begins Tomorrow at 3 AM";
    }

    console.log('🔍 [SEASON ROUTES] About to return response:', {
      currentDay: currentDayInCycle,
      seasonNumber,
      phase,
      source: 'seasonRoutes.ts'
    });

    res.json({
      season: `Season ${seasonNumber}`,
      seasonNumber,
      currentDay: currentDayInCycle,
      phase,
      phaseTitle,
      description,
      dynamicDetail,
      countdownText,
      daysUntilPlayoffs,
      daysUntilNewSeason,
      seasonYear: seasonNumber,
      seasonStatus: "active",
      // Legacy fields for backward compatibility
      details: dynamicDetail,
      // DEBUG MARKER to confirm this endpoint is being called
      debugSource: "seasonRoutes.ts-current-cycle",
      debugTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching current season cycle:", error);
    next(error);
  }
});

router.get('/champions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For now, return empty array as championship history isn't implemented yet
    const history: any[] = [];
    res.json(history);
  } catch (error) {
    console.error("Error fetching championship history:", error);
    next(error);
  }
});

router.get('/playoffs/:division', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
        return res.status(400).json({ message: "Invalid division number." });
    }
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason || !currentSeason.id) {
      return res.json([]); // No active season, no playoffs
    }
    // For now, return empty array as playoffs aren't fully implemented
    const playoffsData: any[] = [];
    res.json(playoffsData);
  } catch (error) {
    console.error("Error fetching playoffs:", error);
    next(error);
  }
});

router.post('/:seasonId/playoffs/start', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Add SuperUser/Admin check for starting playoffs
    const { seasonId } = req.params;
    const { division } = playoffStartSchema.parse(req.body);

    // For now, simplified implementation - playoffs not fully implemented
    res.status(501).json({ message: "Playoff system is not yet implemented. This feature is coming soon." });
  } catch (error) {
    console.error("Error starting playoffs:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid playoff start data", errors: error.errors });
    }
    next(error);
  }
});

// ===== CONTRACT SYSTEM ROUTES =====
router.get('/contracts/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Use Prisma directly for now
    const { prisma } = await import('../db.js');
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { player: { teamId } },
          { staff: { teamId } }
        ]
      },
      include: {
        player: true,
        staff: true
      }
    });
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    next(error);
  }
});

router.get('/salary-cap/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Simplified implementation - calculate from team's current contracts
    const { prisma } = await import('../db.js');
    
    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) },
      include: {
        players: {
          include: {
            contract: {
              where: {
                startDate: { lte: new Date() }
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }
    
    const totalSalary = (team as any).players?.reduce((sum: number, player: any) => {
      const latestContract = player.contract[0];
      return sum + (latestContract?.salary || 0);
    }, 0) || 0;
    
    // Division-based salary cap
    const capLimit = (team.division ?? 8) <= 3 ? 65000 : 45000;
    
    const capInfo = {
      teamId,
      totalSalary,
      capLimit,
      capSpace: capLimit - totalSalary,
      division: team.division
    };
    
    res.json(capInfo);
  } catch (error) {
    console.error("Error fetching salary cap:", error);
    next(error);
  }
});

router.post('/contracts/negotiate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found." });

    const { playerId, salary, duration } = contractNegotiationSchema.omit({teamId: true}).parse(req.body);

    const { prisma } = await import('../db.js');
    const player = await prisma.player.findUnique({ where: { id: parseInt(playerId) } });
    if(!player || player.teamId !== userTeam.id) {
        return res.status(403).json({ message: "Player not on your team or does not exist." });
    }

    // Create new contract
    const contract = await prisma.contract.create({
      data: {
        playerId: parseInt(playerId),
        salary: salary,
        length: duration,
        startDate: new Date()
      }
    });

    res.status(201).json(contract);
  } catch (error) {
    console.error("Error negotiating contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
    }
    next(error);
  }
});

// ... other contract routes like renew, release, templates (similar structure)

// ===== SPONSORSHIP SYSTEM ROUTES =====
router.get('/sponsorships/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // For now, return empty array as sponsorships aren't implemented yet
    const sponsorships: any[] = [];
    res.json(sponsorships);
  } catch (error) {
    console.error("Error fetching team sponsorships:", error);
    next(error);
  }
});

router.post('/sponsorships/negotiate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found." });

    const { sponsorName, dealType, value, duration } = sponsorshipNegotiationSchema.omit({teamId:true}).parse(req.body);

    // For now, simplified sponsorship system - not fully implemented
    res.status(501).json({ message: "Sponsorship system is not yet implemented. This feature is coming soon." });
  } catch (error) {
    console.error("Error negotiating sponsorship:", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid sponsorship data", errors: error.errors });
    }
    next(error);
  }
});

// ... other sponsorship routes like renew, available sponsors

// MANUAL TESTING ROUTE - Game Catch-Up Mechanism
router.post('/test-catch-up', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Import the automation service for manual testing
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService');
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Check for missed matches that need to be started
    const now = new Date();
    const { prisma } = await import('../db.js');
    
    const missedMatches = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        gameDate: {
          lt: now
        },
        matchType: 'LEAGUE'
      },
      select: {
        id: true,
        gameDate: true,
        homeTeamId: true,
        awayTeamId: true
      }
    });
    
    if (missedMatches.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No missed matches found that need to be started',
        missedMatches: 0
      });
    }
    
    // Manually trigger the catch-up mechanism
    await automationService['catchUpOnMissedMatches']();
    
    res.json({ 
      success: true, 
      message: `Catch-up mechanism triggered successfully for ${missedMatches.length} missed matches`,
      missedMatches: missedMatches.length,
      matchDetails: missedMatches.map((match: any) => ({
        id: match.id,
        gameDate: match.gameDate,
        minutesPastDue: Math.floor((now.getTime() - match.gameDate.getTime()) / (1000 * 60))
      }))
    });
  } catch (error) {
    console.error("Error testing catch-up mechanism:", error);
    next(error);
  }
});

// Daily Progression API endpoint - Process daily player progression
router.post('/daily-progression', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { force = false } = req.body;
    
    // Check if daily progression has already run today
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Import required services
    const { prisma } = await import('../db.js');
    
    // For this implementation, we'll simulate the daily progression logic
    // In production, this would be handled by the automation service
    
    const result = {
      playersProcessed: 0,
      attributeGains: 0,
      injuriesHealed: 0,
      contractsExpired: 0,
      lastRun: today.toISOString()
    };
    
    // Get all active players
    const players = await prisma.player.findMany({
      where: {
        isRetired: false
      },
      include: {
        team: true
      }
    });
    
    // Process each player for daily progression
    for (const player of players) {
      result.playersProcessed++;
      
      // Simulate daily progression chance (1% + age modifier)
      const ageModifier = player.age <= 22 ? 0.02 : player.age >= 29 ? -0.01 : 0;
      const progressionChance = 0.01 + ageModifier;
      
      if (Math.random() < progressionChance) {
        // Randomly select an attribute to improve
        const attributes = ['speed', 'power', 'throwing', 'catching', 'kicking', 'staminaAttribute', 'leadership', 'agility'];
        const attributeToImprove = attributes[Math.floor(Math.random() * attributes.length)];
        
        const currentValue = player[attributeToImprove as keyof typeof player] as number;
        if (currentValue < 40) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              [attributeToImprove]: currentValue + 1
            }
          });
          result.attributeGains++;
        }
      }
      
      // Process injury recovery
      if (player.injuryStatus !== 'HEALTHY' && player.injuryRecoveryPointsCurrent > 0) {
        const healingPoints = Math.min(2, player.injuryRecoveryPointsNeeded - player.injuryRecoveryPointsCurrent);
        
        if (healingPoints > 0) {
          const newRecoveryPoints = player.injuryRecoveryPointsCurrent + healingPoints;
          const isHealed = newRecoveryPoints >= player.injuryRecoveryPointsNeeded;
          
          await prisma.player.update({
            where: { id: player.id },
            data: {
              injuryRecoveryPointsCurrent: newRecoveryPoints,
              injuryStatus: isHealed ? 'HEALTHY' : player.injuryStatus
            }
          });
          
          if (isHealed) {
            result.injuriesHealed++;
          }
        }
      }
      
      // Restore stamina (25% base recovery)
      if (player.dailyStaminaLevel < 100) {
        const staminaRecovery = Math.min(25, 100 - player.dailyStaminaLevel);
        await prisma.player.update({
          where: { id: player.id },
          data: {
            dailyStaminaLevel: player.dailyStaminaLevel + staminaRecovery
          }
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Daily progression completed successfully',
      data: result,
      timestamp: today.toISOString()
    });
  } catch (error) {
    console.error("Error processing daily progression:", error);
    next(error);
  }
});

/**
 * EMERGENCY ENDPOINT: Fix Oakland Cougars Schedule
 * Moves games from Days 9-18 to Days 5-14 for late signup requirements
 */
router.post('/fix-oakland-schedule', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🚨 EMERGENCY: Fixing Oakland Cougars schedule - moving from Days 9-18 to Days 5-14');
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!oaklandCougars) {
      return res.status(404).json({
        success: false,
        error: 'Oakland Cougars team not found'
      });
    }
    
    // Find all Oakland Cougars games
    const cougarsGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    if (cougarsGames.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No Oakland Cougars games found'
      });
    }
    
    console.log(`📊 Found ${cougarsGames.length} Oakland Cougars games to fix`);
    
    // Calculate season start for day calculations
    const seasonStart = new Date('2025-08-16T15:40:19.081Z');
    
    // Move games 4 days earlier
    const updates = [];
    for (const game of cougarsGames) {
      const currentDate = new Date(game.gameDate);
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 4); // Move 4 days earlier
      
      const daysDiff = Math.floor((newDate - seasonStart) / (1000 * 60 * 60 * 24));
      const newGameDay = daysDiff + 1;
      
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDate: newDate }
      });
      
      updates.push({
        match: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
        oldDate: currentDate.toISOString().split('T')[0],
        newDate: newDate.toISOString().split('T')[0],
        newGameDay: newGameDay
      });
      
      console.log(`✅ Updated: ${game.homeTeam.name} vs ${game.awayTeam.name} -> Day ${newGameDay} (${newDate.toISOString().split('T')[0]})`);
    }
    
    console.log(`🎉 SUCCESS: Fixed ${updates.length} Oakland Cougars games!`);
    
    res.json({
      success: true,
      message: `Fixed ${updates.length} Oakland Cougars games`,
      data: {
        teamId: oaklandCougars.id,
        teamName: oaklandCougars.name,
        gamesUpdated: updates.length,
        newScheduleRange: 'Days 5-14 (Aug 20-29)',
        updates: updates
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing Oakland Cougars schedule:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}));

export default router;
