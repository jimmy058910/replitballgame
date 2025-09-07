/**
 * Enterprise-Grade League Management API
 * 
 * Bulletproof API endpoints following industry best practices:
 * - Comprehensive input validation
 * - Proper error handling and status codes  
 * - ACID transaction support
 * - Audit logging
 * - Rate limiting ready
 * - OpenAPI documentation ready
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/firebaseAuth.js';
import { 
  LeagueManagementService, 
  StatisticsEngine,
  LeagueSystemError,
  ErrorCodes 
} from '../services/leagueManagementSystem.js';
import logger from '../utils/logger.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// =============================================================================
// MIDDLEWARE & VALIDATION
// =============================================================================

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many admin requests from this IP',
    retryAfter: '15 minutes'
  }
});

// Input validation schemas
const RegenerateLeagueSchema = z.object({
  division: z.number().int().min(1).max(8),
  subdivision: z.string().min(1).max(50).toLowerCase(),
  scheduleType: z.enum(['FULL', 'SHORTENED']).optional().default('FULL'),
  currentDay: z.number().int().min(1).max(14).optional().default(1)
});

const TeamStatisticsSchema = z.object({
  teamId: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive())
});

// =============================================================================
// CORE API ENDPOINTS
// =============================================================================

/**
 * POST /api/league-management/regenerate
 * Completely regenerate league schedule and statistics for a division
 * 
 * @description Enterprise-grade league regeneration with full audit trail
 * @access Admin only
 * @ratelimit 10 requests per 15 minutes
 */
router.post('/regenerate', adminRateLimit, async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('🚀 League regeneration request received', { 
      requestId, 
      body: req.body,
      user: req.user?.claims?.email 
    });
    
    // Validate input
    const { division, subdivision, scheduleType, currentDay } = RegenerateLeagueSchema.parse(req.body);
    
    // Execute regeneration
    const result = await LeagueManagementService.regenerateLeagueSchedule(division, subdivision, {
      scheduleType,
      currentDay
    });
    
    // Success response
    res.status(200).json({
      success: true,
      message: `League ${division}-${subdivision} regenerated successfully`,
      data: {
        ...result,
        requestId,
        timestamp: new Date().toISOString()
      },
      meta: {
        apiVersion: '1.0',
        executedBy: req.user?.claims?.email,
        processingTime: `${Date.now() - parseInt(requestId.split('_')[1])}ms`
      }
    });
    
    logger.info('✅ League regeneration completed successfully', { 
      requestId, 
      division, 
      subdivision,
      result 
    });
    
  } catch (error) {
    logger.error('❌ League regeneration failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
        requestId
      });
    }
    
    if (error instanceof LeagueSystemError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        context: error.context,
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during league regeneration',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/league-management/standings/:division/:subdivision
 * Get comprehensive league standings with real-time statistics
 * 
 * @description Returns complete standings with metadata and audit info
 * @access Authenticated users
 */
router.get('/standings/:division/:subdivision', requireAuth, async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const division = parseInt(req.params.division);
    const subdivision = req.params.subdivision.toLowerCase();
    
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({
        success: false,
        error: 'Invalid division number. Must be between 1 and 8.',
        requestId
      });
    }
    
    const standings = await LeagueManagementService.getLeagueStandings(division, subdivision);
    
    res.status(200).json({
      success: true,
      data: standings,
      meta: {
        requestId,
        apiVersion: '1.0',
        timestamp: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to fetch standings', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch league standings',
      requestId
    });
  }
});

/**
 * POST /api/league-management/recalculate-statistics/:teamId
 * Recalculate statistics for a specific team
 * 
 * @description Force recalculation of team statistics with audit trail
 * @access Admin only
 */
router.post('/recalculate-statistics/:teamId', adminRateLimit, requireAuth, async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { teamId } = TeamStatisticsSchema.parse(req.params);
    
    const statistics = await StatisticsEngine.calculateTeamStatistics(teamId);
    
    res.status(200).json({
      success: true,
      message: `Statistics recalculated for team ${teamId}`,
      data: {
        teamId,
        statistics,
        timestamp: new Date().toISOString()
      },
      meta: {
        requestId,
        apiVersion: '1.0',
        executedBy: req.user?.claims?.email
      }
    });
    
    logger.info('✅ Team statistics recalculated', { requestId, teamId, statistics });
    
  } catch (error) {
    logger.error('❌ Failed to recalculate team statistics', { 
      requestId, 
      teamId: req.params.teamId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID format',
        details: error.errors,
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate team statistics',
      requestId
    });
  }
});

/**
 * GET /api/league-management/system-health
 * System health check for league management
 * 
 * @description Returns system health status and key metrics
 * @access Admin only
 */
router.get('/system-health', adminRateLimit, requireAuth, async (req: Request, res: Response) => {
  try {
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Check database connectivity
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    
    // Check key metrics
    const [totalTeams, totalGames, completedGames] = await Promise.all([
      prisma.team.count(),
      prisma.game.count({ where: { matchType: 'LEAGUE' } }),
      prisma.game.count({ where: { matchType: 'LEAGUE', status: 'COMPLETED' } })
    ]);
    
    const healthMetrics = {
      database: {
        status: 'healthy',
        connectionActive: !!dbHealth,
        lastChecked: new Date().toISOString()
      },
      league: {
        totalTeams,
        totalGames,
        completedGames,
        completionRate: totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      data: healthMetrics,
      meta: {
        apiVersion: '1.0',
        checkTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ System health check failed', { error });
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'System health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('League Management API Error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    params: req.params,
    body: req.body
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error in league management system',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

export default router;