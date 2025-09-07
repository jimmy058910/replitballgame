/**
 * Data Integrity API Routes
 * 
 * Comprehensive solution for maintaining data integrity across the system.
 * Follows industry standards with proper error handling, validation, and monitoring.
 * 
 * NO BAND-AIDS: These endpoints provide complete solutions for data consistency
 * issues with full transaction support, logging, and audit trails.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { TeamStatisticsIntegrityService } from '../services/enhancedStatisticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Input validation schemas
const TeamIdSchema = z.object({
  teamId: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0, {
    message: "Team ID must be a positive integer"
  })
});

const DivisionSchema = z.object({
  division: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val >= 1 && val <= 8, {
    message: "Division must be between 1 and 8"
  })
});

const SyncRequestSchema = z.object({
  teamId: z.number().int().positive().optional(),
  division: z.number().int().min(1).max(8).optional(),
  scope: z.enum(['team', 'division', 'all']).default('team')
}).refine(data => {
  if (data.scope === 'team' && !data.teamId) {
    return false;
  }
  if (data.scope === 'division' && !data.division) {
    return false;
  }
  return true;
}, {
  message: "Invalid scope configuration: team scope requires teamId, division scope requires division"
});

/**
 * Sync team statistics for specific team
 * POST /api/integrity/sync/team/:teamId
 */
router.post('/sync/team/:teamId', asyncHandler(async (req: Request, res: Response) => {
  logger.info('[IntegrityAPI] Team statistics sync requested', { 
    teamId: req.params.teamId,
    userAgent: req.get('User-Agent'),
    ip: req.ip 
  });
  
  try {
    // Validate input
    const { teamId } = TeamIdSchema.parse({ teamId: req.params.teamId });
    
    // Execute comprehensive sync
    const startTime = Date.now();
    const result = await TeamStatisticsIntegrityService.syncTeamStatistics(teamId);
    const duration = Date.now() - startTime;
    
    logger.info('[IntegrityAPI] Team statistics sync completed', {
      teamId,
      success: result.success,
      discrepanciesFound: result.discrepanciesFound.length,
      gamesProcessed: result.gamesProcessed,
      duration
    });
    
    res.json({
      success: true,
      message: `Team statistics synchronized successfully`,
      data: {
        teamId: result.teamId,
        teamName: result.teamName,
        before: result.before,
        after: result.after,
        gamesProcessed: result.gamesProcessed,
        discrepanciesFound: result.discrepanciesFound,
        changesApplied: result.discrepanciesFound.length > 0,
        timestamp: result.timestamp
      },
      metadata: {
        processingTime: duration,
        endpoint: 'sync/team',
        version: '1.0'
      }
    });
    
  } catch (error) {
    logger.error('[IntegrityAPI] Team statistics sync failed', {
      teamId: req.params.teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        message: 'Invalid team ID provided'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Team statistics sync failed',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Sync team statistics for entire division
 * POST /api/integrity/sync/division/:division
 */
router.post('/sync/division/:division', asyncHandler(async (req: Request, res: Response) => {
  logger.info('[IntegrityAPI] Division statistics sync requested', { 
    division: req.params.division 
  });
  
  try {
    // Validate input
    const { division } = DivisionSchema.parse({ division: req.params.division });
    
    // Execute comprehensive sync
    const startTime = Date.now();
    const results = await TeamStatisticsIntegrityService.syncDivisionStatistics(division);
    const duration = Date.now() - startTime;
    
    const summary = {
      totalTeams: results.length,
      teamsWithDiscrepancies: results.filter(r => r.discrepanciesFound.length > 0).length,
      totalGamesProcessed: results.reduce((sum, r) => sum + r.gamesProcessed, 0),
      totalDiscrepancies: results.reduce((sum, r) => sum + r.discrepanciesFound.length, 0)
    };
    
    logger.info('[IntegrityAPI] Division statistics sync completed', {
      division,
      summary,
      duration
    });
    
    res.json({
      success: true,
      message: `Division ${division} statistics synchronized successfully`,
      data: {
        division,
        summary,
        results: results.map(r => ({
          teamId: r.teamId,
          teamName: r.teamName,
          discrepanciesFound: r.discrepanciesFound.length,
          changesApplied: r.discrepanciesFound.length > 0,
          gamesProcessed: r.gamesProcessed
        })),
        detailedResults: results // Full results for debugging
      },
      metadata: {
        processingTime: duration,
        endpoint: 'sync/division',
        version: '1.0'
      }
    });
    
  } catch (error) {
    logger.error('[IntegrityAPI] Division statistics sync failed', {
      division: req.params.division,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        message: 'Invalid division provided'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Division statistics sync failed',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Health check endpoint - identify teams with discrepancies
 * GET /api/integrity/health
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  logger.info('[IntegrityAPI] Statistics health check requested');
  
  try {
    const startTime = Date.now();
    const healthReport = await TeamStatisticsIntegrityService.healthCheck();
    const duration = Date.now() - startTime;
    
    logger.info('[IntegrityAPI] Statistics health check completed', {
      ...healthReport,
      duration
    });
    
    res.json({
      success: true,
      message: 'Statistics health check completed',
      data: healthReport,
      recommendations: healthReport.teamsWithDiscrepancies > 0 
        ? [`${healthReport.teamsWithDiscrepancies} teams need statistics synchronization`]
        : ['All team statistics are accurate'],
      metadata: {
        processingTime: duration,
        endpoint: 'health',
        version: '1.0'
      }
    });
    
  } catch (error) {
    logger.error('[IntegrityAPI] Statistics health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Quick fix for Oakland Cougars (specific case)
 * POST /api/integrity/fix/oakland-cougars
 */
router.post('/fix/oakland-cougars', asyncHandler(async (req: Request, res: Response) => {
  logger.info('[IntegrityAPI] Oakland Cougars specific fix requested');
  
  try {
    // Find Oakland Cougars team
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    const oaklandCougars = await prisma.team.findFirst({
      where: {
        name: {
          contains: 'Oakland Cougars',
          mode: 'insensitive'
        }
      }
    });
    
    if (!oaklandCougars) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        message: 'Oakland Cougars team not found in the database'
      });
    }
    
    // Execute comprehensive sync for Oakland Cougars
    const result = await TeamStatisticsIntegrityService.syncTeamStatistics(oaklandCougars.id);
    
    logger.info('[IntegrityAPI] Oakland Cougars fix completed', {
      teamId: result.teamId,
      discrepanciesFound: result.discrepanciesFound.length,
      gamesProcessed: result.gamesProcessed
    });
    
    res.json({
      success: true,
      message: 'Oakland Cougars statistics fixed successfully',
      data: {
        teamId: result.teamId,
        teamName: result.teamName,
        statisticsFixed: result.discrepanciesFound.length > 0,
        discrepanciesFound: result.discrepanciesFound,
        before: result.before,
        after: result.after,
        gamesProcessed: result.gamesProcessed
      },
      note: 'The team header should now display the correct statistics matching the standings table',
      metadata: {
        endpoint: 'fix/oakland-cougars',
        version: '1.0'
      }
    });
    
  } catch (error) {
    logger.error('[IntegrityAPI] Oakland Cougars fix failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Oakland Cougars fix failed',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;