/**
 * TIME FIX ROUTES - Critical Alpha Readiness Endpoints
 * 
 * These routes provide admin endpoints to fix the timezone issues
 * and ensure all game times are properly displayed in EDT.
 */

import { Router, Request, Response } from 'express';
import { TimezoneService } from '../services/timezoneService.js';
import { requireAuth } from '../middleware/firebaseAuth.js';

const router = Router();

/**
 * GET /api/time-fix/analyze - Analyze current game time distribution
 */
router.get('/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🕐 [TIME-FIX] Analyzing game time distribution...');
    
    // Get server time info
    const timeInfo = TimezoneService.getServerTimeInfo();
    
    // Get Prisma client using dynamic import (consistent with other routes)
    const { getPrismaClient } = await import('../database.js');
    console.log('🔍 [TIME-FIX] getPrismaClient function:', typeof getPrismaClient);
    const prisma = await getPrismaClient();
    console.log('🔍 [TIME-FIX] Prisma client:', typeof prisma, !!prisma, !!prisma?.game);
    
    // Get all games
    const allGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    // Analyze time distribution
    const gamesByHour = new Map<number, any[]>();
    let validGameCount = 0;
    let invalidGameCount = 0;

    for (const game of allGames) {
      const edtTime = TimezoneService.convertToEDT(game.gameDate);
      const hour = edtTime.hour();
      
      if (!gamesByHour.has(hour)) {
        gamesByHour.set(hour, []);
      }
      gamesByHour.get(hour)!.push({
        id: game.id,
        homeTeam: game.homeTeam.name,
        awayTeam: game.awayTeam.name,
        gameDate: game.gameDate,
        edtTime: edtTime.format('YYYY-MM-DD h:mm A z')
      });

      if (TimezoneService.isValidLeagueGameTime(game.gameDate)) {
        validGameCount++;
      } else {
        invalidGameCount++;
      }
    }

    // Convert to array for response
    const hourlyDistribution = Array.from(gamesByHour.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, games]) => ({
        hour,
        timeDisplay: `${hour.toString().padStart(2, '0')}:xx`,
        gameCount: games.length,
        isValidLeagueTime: hour >= 16 && hour < 22, // 4PM-10PM EDT
        games: games.slice(0, 3) // Show first 3 games as examples
      }));

    res.json({
      success: true,
      serverTimeInfo: timeInfo,
      gameAnalysis: {
        totalGames: allGames.length,
        validGames: validGameCount,
        invalidGames: invalidGameCount,
        needsFix: invalidGameCount > 0,
        hourlyDistribution
      }
    });

  } catch (error) {
    console.error('❌ [TIME-FIX] Error analyzing games:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze game times',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/time-fix/fix-all - Fix all games to have proper EDT times
 */
router.post('/fix-all', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 [TIME-FIX] Starting comprehensive game time fixes...');

    // Get Prisma client using dynamic import (consistent with other routes)
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();

    // Get all games with invalid times
    const allGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    const gamesWithInvalidTimes = allGames.filter(game => 
      !TimezoneService.isValidLeagueGameTime(game.gameDate)
    );

    if (gamesWithInvalidTimes.length === 0) {
      return res.json({
        success: true,
        message: 'All games already have proper EDT times! No fixes needed.',
        gamesFixed: 0,
        totalGames: allGames.length
      });
    }

    console.log(`🔧 [TIME-FIX] Found ${gamesWithInvalidTimes.length} games to fix`);

    // Fix invalid games using proper 15-minute intervals from timezone service
    const fixedGames = [];
    
    // Create a map to group games by day to ensure proper daily time distribution
    const gamesByDate = new Map<string, any[]>();
    for (const game of gamesWithInvalidTimes) {
      const originalEDT = TimezoneService.convertToEDT(game.gameDate);
      const dateKey = originalEDT.format('YYYY-MM-DD');
      
      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, []);
      }
      gamesByDate.get(dateKey)!.push(game);
    }
    
    // Process games by date, using proper daily time slots with 15-minute intervals
    for (const [dateKey, gamesForDate] of gamesByDate.entries()) {
      // Use Day 1 pattern for all dates during fix (5:15, 5:30, 5:45, 6:00 PM EDT)
      const properTimes = [
        { hour: 17, minute: 15 },  // 5:15 PM EDT
        { hour: 17, minute: 30 },  // 5:30 PM EDT  
        { hour: 17, minute: 45 },  // 5:45 PM EDT
        { hour: 18, minute: 0 },   // 6:00 PM EDT
        { hour: 18, minute: 15 },  // 6:15 PM EDT (additional if needed)
        { hour: 18, minute: 30 },  // 6:30 PM EDT (additional if needed)
        { hour: 18, minute: 45 },  // 6:45 PM EDT (additional if needed)
        { hour: 19, minute: 0 },   // 7:00 PM EDT (additional if needed)
      ];
      
      // Assign games to time slots in 15-minute intervals
      for (let i = 0; i < gamesForDate.length; i++) {
        const game = gamesForDate[i];
        const originalEDT = TimezoneService.convertToEDT(game.gameDate);
        
        // Cycle through available time slots
        const timeSlot = properTimes[i % properTimes.length];
        
        // Create the corrected EDT time with proper 15-minute intervals
        const correctedDate = TimezoneService.createEDTTime(game.gameDate, timeSlot.hour, timeSlot.minute);
      
        // Update the game in the database
        await prisma.game.update({
          where: { id: game.id },
          data: { gameDate: correctedDate }
        });
        
        const correctedEDT = TimezoneService.convertToEDT(correctedDate);
        
        fixedGames.push({
          id: game.id,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          beforeTime: originalEDT.format('h:mm A z'),
          afterTime: correctedEDT.format('h:mm A z')
        });
        
        console.log(`  ✅ Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        console.log(`     ${originalEDT.format('h:mm A z')} → ${correctedEDT.format('h:mm A z')}`);
      }
    }

    console.log(`🎉 [TIME-FIX] Successfully fixed ${fixedGames.length} games!`);

    res.json({
      success: true,
      message: `Successfully fixed ${fixedGames.length} games to proper EDT times!`,
      gamesFixed: fixedGames.length,
      totalGames: allGames.length,
      fixedGames: fixedGames.slice(0, 10), // Return first 10 as examples
      allGamesNowValid: true
    });

  } catch (error) {
    console.error('❌ [TIME-FIX] Error fixing game times:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fix game times',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/time-fix/server-info - Get detailed server time information
 */
router.get('/server-info', requireAuth, async (req: Request, res: Response) => {
  try {
    const timeInfo = TimezoneService.getServerTimeInfo();
    
    res.json({
      success: true,
      serverTime: timeInfo
    });

  } catch (error) {
    console.error('❌ [TIME-FIX] Error getting server time info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get server time info',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/time-fix/redistribute - Force redistribute games to proper 15-minute intervals
 */
router.post('/redistribute', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 [TIME-FIX] Force redistributing all games to proper 15-minute intervals...');

    // Get Prisma client using dynamic import (consistent with other routes)
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();

    // Get ALL games regardless of validity to redistribute them properly
    const allGames = await prisma.game.findMany({
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });

    console.log(`🔧 [TIME-FIX] Redistributing ${allGames.length} games to 15-minute intervals`);

    // Create a map to group games by day for proper time distribution
    const gamesByDate = new Map<string, any[]>();
    for (const game of allGames) {
      const originalEDT = TimezoneService.convertToEDT(game.gameDate);
      const dateKey = originalEDT.format('YYYY-MM-DD');
      
      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, []);
      }
      gamesByDate.get(dateKey)!.push(game);
    }

    const redistributedGames = [];
    
    // Process games by date, using proper daily time slots with 15-minute intervals
    for (const [dateKey, gamesForDate] of gamesByDate.entries()) {
      // Use proper 15-minute interval pattern (5:15, 5:30, 5:45, 6:00, 6:15, etc.)
      const properTimes = [
        { hour: 17, minute: 15 },  // 5:15 PM EDT
        { hour: 17, minute: 30 },  // 5:30 PM EDT  
        { hour: 17, minute: 45 },  // 5:45 PM EDT
        { hour: 18, minute: 0 },   // 6:00 PM EDT
        { hour: 18, minute: 15 },  // 6:15 PM EDT
        { hour: 18, minute: 30 },  // 6:30 PM EDT
        { hour: 18, minute: 45 },  // 6:45 PM EDT
        { hour: 19, minute: 0 },   // 7:00 PM EDT
        { hour: 19, minute: 15 },  // 7:15 PM EDT
        { hour: 19, minute: 30 },  // 7:30 PM EDT
        { hour: 19, minute: 45 },  // 7:45 PM EDT
        { hour: 20, minute: 0 },   // 8:00 PM EDT
      ];
      
      // Assign games to time slots in 15-minute intervals
      for (let i = 0; i < gamesForDate.length; i++) {
        const game = gamesForDate[i];
        const originalEDT = TimezoneService.convertToEDT(game.gameDate);
        
        // Cycle through available time slots
        const timeSlot = properTimes[i % properTimes.length];
        
        // Create the corrected EDT time with proper 15-minute intervals
        const correctedDate = TimezoneService.createEDTTime(game.gameDate, timeSlot.hour, timeSlot.minute);
      
        // Update the game in the database
        await prisma.game.update({
          where: { id: game.id },
          data: { gameDate: correctedDate }
        });
        
        const correctedEDT = TimezoneService.convertToEDT(correctedDate);
        
        redistributedGames.push({
          id: game.id,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          beforeTime: originalEDT.format('h:mm A z'),
          afterTime: correctedEDT.format('h:mm A z')
        });
        
        console.log(`  ✅ Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        console.log(`     ${originalEDT.format('h:mm A z')} → ${correctedEDT.format('h:mm A z')}`);
      }
    }

    console.log(`🎉 [TIME-FIX] Successfully redistributed ${redistributedGames.length} games to 15-minute intervals!`);

    res.json({
      success: true,
      message: `Successfully redistributed ${redistributedGames.length} games to proper 15-minute intervals!`,
      gamesRedistributed: redistributedGames.length,
      totalGames: allGames.length,
      redistributedGames: redistributedGames.slice(0, 10), // Return first 10 as examples
      proper15MinuteIntervals: true
    });

  } catch (error) {
    console.error('❌ [TIME-FIX] Error redistributing game times:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to redistribute game times',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;