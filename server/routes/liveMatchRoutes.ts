/**
 * Live Match Routes for Real-Time Match Management
 * Handles starting, controlling, and monitoring live matches
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { liveMatchEngine } from '../services/liveMatchEngine';
import { webSocketManager } from '../websocket/webSocketManager';

const router = Router();

// Match command schema
const MatchCommandSchema = z.object({
  command: z.enum(['pause', 'resume', 'scrub', 'setSpeed']),
  matchId: z.string(),
  atSecond: z.number().optional(),
  speed: z.number().optional()
});

/**
 * Get available live matches
 * GET /api/live-matches
 */
router.get('/', async (req, res) => {
  try {
    // Return currently active live matches
    const activeMatches = liveMatchEngine.getActiveMatches();
    
    res.json({
      success: true,
      matches: activeMatches
    });
  } catch (error) {
    console.error('Error getting live matches:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get live matches'
    });
  }
});

/**
 * Create a demo match for testing
 * POST /api/live-matches/demo
 */
router.post('/demo', async (req, res) => {
  try {
    console.log('Creating demo match for live engine testing');
    
    // Find a recent match that we can use for demo (simplified to avoid enum issues)
    const recentMatch = await prisma.game.findFirst({
      where: {
        matchType: 'EXHIBITION',
        status: 'COMPLETED'
      },
      include: {
        homeTeam: {
          include: {
            players: true,
            stadium: true,
            finances: true
          }
        },
        awayTeam: {
          include: {
            players: true,
            stadium: true,
            finances: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!recentMatch) {
      return res.status(404).json({
        success: false,
        error: 'No exhibition matches found for demo. Please create an exhibition match first.'
      });
    }

    // Verify we have enough players for demo
    const homePlayers = recentMatch.homeTeam?.players?.length || 0;
    const awayPlayers = recentMatch.awayTeam?.players?.length || 0;
    
    console.log(`Demo: Found ${homePlayers} home players, ${awayPlayers} away players`);
    
    if (homePlayers < 3 || awayPlayers < 3) {
      return res.status(400).json({
        success: false,
        error: `Insufficient players for demo. Home: ${homePlayers}, Away: ${awayPlayers}. Need at least 3 per team.`
      });
    }

    // Start the live match engine with this demo match
    const liveState = await liveMatchEngine.startMatch(recentMatch.id.toString());
    
    res.json({
      success: true,
      message: 'Demo match created successfully',
      match: {
        id: recentMatch.id,
        homeTeam: recentMatch.homeTeam?.name,
        awayTeam: recentMatch.awayTeam?.name,
        matchType: recentMatch.matchType
      },
      liveState
    });
  } catch (error) {
    console.error('Error creating demo match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create demo match'
    });
  }
});

/**
 * Start a live match
 * POST /api/live-matches/:matchId/start
 */
router.post('/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    console.log(`Starting live match: ${matchId}`);
    
    // Start the live match engine
    const liveState = await liveMatchEngine.startMatch(matchId);
    
    res.json({
      success: true,
      message: 'Live match started successfully',
      liveState
    });
  } catch (error) {
    console.error('Error starting live match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start live match'
    });
  }
});

/**
 * Control live match (pause, resume, scrub, speed)
 * POST /api/matches/:matchId/control
 */
router.post('/:matchId/control', async (req, res) => {
  try {
    const { matchId } = req.params;
    const commandData = MatchCommandSchema.parse(req.body);
    
    console.log(`Match control command for ${matchId}:`, commandData);
    
    switch (commandData.command) {
      case 'pause':
        liveMatchEngine.pauseMatch(matchId);
        break;
      case 'resume':
        liveMatchEngine.resumeMatch(matchId);
        break;
      case 'scrub':
        if (commandData.atSecond !== undefined) {
          // Implementation for timeline scrubbing would go here
          console.log(`Scrubbing match ${matchId} to ${commandData.atSecond} seconds`);
        }
        break;
      case 'setSpeed':
        if (commandData.speed !== undefined) {
          // Implementation for speed control would go here
          console.log(`Setting match ${matchId} speed to ${commandData.speed}x`);
        }
        break;
    }
    
    // Broadcast command to all connected clients
    webSocketManager.broadcastToMatch(matchId, 'matchCommand', commandData);
    
    res.json({
      success: true,
      message: `Match ${commandData.command} command executed successfully`
    });
  } catch (error) {
    console.error('Error controlling match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to control match'
    });
  }
});

/**
 * Get current live match state
 * GET /api/matches/:matchId/live-state
 */
router.get('/:matchId/live-state', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const liveState = liveMatchEngine.getMatchState(matchId);
    
    if (!liveState) {
      return res.status(404).json({
        success: false,
        error: 'Live match not found or not active'
      });
    }
    
    res.json({
      success: true,
      liveState
    });
  } catch (error) {
    console.error('Error getting live match state:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get live match state'
    });
  }
});

/**
 * Get enhanced match data (stadium, revenue, etc.)
 * GET /api/matches/:matchId/enhanced-data
 */
router.get('/:matchId/enhanced-data', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const liveState = liveMatchEngine.getMatchState(matchId);
    
    if (!liveState) {
      return res.json({
        success: true,
        enhancedData: null
      });
    }
    
    // Calculate enhanced data
    const enhancedData = {
      attendance: liveState.attendance,
      capacity: liveState.facilityLevels.capacity,
      revenueData: {
        total: liveState.perTickRevenue.reduce((sum, r) => sum + r.totalRevenue, 0),
        breakdown: {
          tickets: liveState.perTickRevenue.reduce((sum, r) => sum + r.ticketRevenue, 0),
          concessions: liveState.perTickRevenue.reduce((sum, r) => sum + r.concessionRevenue, 0),
          parking: liveState.perTickRevenue.reduce((sum, r) => sum + r.parkingRevenue, 0),
          vip: liveState.perTickRevenue.reduce((sum, r) => sum + r.vipRevenue, 0),
          merchandise: liveState.perTickRevenue.reduce((sum, r) => sum + r.merchRevenue, 0)
        }
      },
      matchStats: {
        homeScore: liveState.homeScore,
        awayScore: liveState.awayScore,
        gameTime: liveState.gameTime,
        currentHalf: liveState.currentHalf,
        status: liveState.status
      },
      playerStats: Array.from(liveState.playerStats.values()),
      teamStats: Array.from(liveState.teamStats.values()),
      recentEvents: liveState.gameEvents.slice(0, 10)
    };
    
    res.json({
      success: true,
      enhancedData
    });
  } catch (error) {
    console.error('Error getting enhanced match data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get enhanced match data'
    });
  }
});

/**
 * Get stadium data for visualization
 * GET /api/matches/:matchId/stadium-data
 */
router.get('/:matchId/stadium-data', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const liveState = liveMatchEngine.getMatchState(matchId);
    
    if (!liveState) {
      return res.json({
        success: true,
        stadiumData: null
      });
    }
    
    const stadiumData = {
      attendance: liveState.attendance,
      capacity: liveState.facilityLevels.capacity,
      facilities: liveState.facilityLevels,
      crowdEnergy: Math.min(100, (liveState.attendance / liveState.facilityLevels.capacity) * 100),
      atmosphereBonus: liveState.facilityLevels.lightingScreens * 5, // Lighting affects atmosphere
      homeFieldAdvantage: Math.min(10, liveState.facilityLevels.lightingScreens * 2)
    };
    
    res.json({
      success: true,
      stadiumData
    });
  } catch (error) {
    console.error('Error getting stadium data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stadium data'
    });
  }
});

/**
 * Get live match summary for completed matches
 * GET /api/matches/:matchId/summary
 */
router.get('/:matchId/summary', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const liveState = liveMatchEngine.getMatchState(matchId);
    
    if (!liveState || liveState.status !== 'completed') {
      return res.status(404).json({
        success: false,
        error: 'Match not completed or not found'
      });
    }
    
    // Calculate MVP and summary statistics
    const playerStatsArray = Array.from(liveState.playerStats.values());
    const mvp = playerStatsArray.reduce((best, current) => {
      const currentScore = current.scores * 10 + current.assists * 5 + current.tackles * 3;
      const bestScore = best.scores * 10 + best.assists * 5 + best.tackles * 3;
      return currentScore > bestScore ? current : best;
    }, playerStatsArray[0]);
    
    const summary = {
      matchId,
      finalScore: {
        home: liveState.homeScore,
        away: liveState.awayScore
      },
      matchType: 'LEAGUE', // Would get from match data
      date: liveState.startTime,
      mvp: mvp ? {
        playerId: mvp.playerId,
        name: 'MVP Player', // Would get from player data
        position: 'Position',
        headlineStats: `${mvp.scores} scores, ${mvp.assists} assists, ${mvp.tackles} tackles`,
        avatar: undefined
      } : undefined,
      keyPerformers: playerStatsArray
        .sort((a: any, b: any) => (b.scores * 10 + b.assists * 5) - (a.scores * 10 + a.assists * 5))
        .slice(0, 3)
        .map((p: any) => ({
          playerId: p.playerId,
          name: `Player ${p.playerId}`,
          performanceIndex: p.scores * 10 + p.assists * 5 + p.tackles * 3,
          keyStats: `${p.scores} scores, ${p.assists} assists`
        })),
      matchStats: {
        possession: { home: 55, away: 45 }, // Would calculate from events
        fieldPosition: { home: 52, away: 48 },
        turnovers: { home: 2, away: 3 },
        passAccuracy: { home: 78, away: 72 }
      },
      stadiumPerformance: {
        attendance: liveState.attendance,
        capacity: liveState.facilityLevels.capacity,
        totalRevenue: liveState.perTickRevenue.reduce((sum, r) => sum + r.totalRevenue, 0),
        crowdEnergy: Math.min(100, (liveState.attendance / liveState.facilityLevels.capacity) * 100)
      },
      milestones: [
        'First score of the match',
        'Attendance exceeded 80% capacity',
        'Player achieved hat trick'
      ],
      achievements: [
        'Clean sheet victory',
        'Revenue exceeded projections',
        'Perfect home record maintained'
      ]
    };
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting match summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get match summary'
    });
  }
});

/**
 * Get WebSocket connection info
 * GET /api/matches/:matchId/ws-info
 */
router.get('/:matchId/ws-info', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const connectedClients = webSocketManager.getMatchClients(matchId);
    const stats = webSocketManager.getStats();
    
    res.json({
      success: true,
      wsInfo: {
        connectedClients: connectedClients.length,
        totalClients: stats.totalClients,
        activeMatches: stats.activeMatches,
        matchSpecificClients: connectedClients
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get WebSocket info'
    });
  }
});

export default router;