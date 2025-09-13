/**
 * GAME SYSTEMS ROUTES
 * Exposes all the comprehensive game mechanics systems
 * TAP generation, Daily Progression, Power/Camaraderie calculations, Staff Effects, Anti-Pay-to-Win
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../services/rbacService.js';
import { logger } from '../services/loggingService.js';
import { PlayerGenerationService } from '../services/playerGenerationService.js';
import { DailyProgressionService } from '../services/dailyProgressionService.js';
import { PowerCalculationService } from '../services/powerCalculationService.js';
import { StaffEffectsService } from '../services/staffEffectsService.js';
import { AntiPayToWinService } from '../services/antiPayToWinService.js';

const router = Router();

// =============================================================================
// TAP (TOTAL ATTRIBUTE POINTS) PLAYER GENERATION ROUTES
// =============================================================================

/**
 * Generate player using TAP system
 * POST /game-systems/generate-player
 */
router.post('/generate-player', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { type, race, role, ageRange } = req.body;
    
    const player = PlayerGenerationService.generatePlayer({
      type: type || 'basic_tryout',
      race,
      role,
      ageRange
    });
    
    logger.info('Generated player using TAP system', {
      userId: req.user.claims.sub,
      playerType: type,
      tapUsed: player.tapUsed,
      tapAvailable: player.tapAvailable,
      playerName: player.name
    });
    
    res.json({
      success: true,
      player,
      tapInfo: {
        totalAvailable: player.tapAvailable,
        totalUsed: player.tapUsed,
        efficiency: Math.round((player.tapUsed / player.tapAvailable) * 100)
      }
    });
  } catch (error) {
    logger.error('Failed to generate player', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Generate multiple players for analysis
 * POST /game-systems/generate-multiple-players
 */
router.post('/generate-multiple-players', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { count = 5, type = 'basic_tryout' } = req.body;
    
    if (count > 20) {
      return res.status(400).json({ error: 'Cannot generate more than 20 players at once' });
    }
    
    const players = PlayerGenerationService.generateMultiplePlayers(count, { type });
    
    res.json({
      success: true,
      players,
      summary: {
        count: players.length,
        averageTAP: Math.round(players.reduce((sum, p) => sum + p.tapAvailable, 0) / players.length),
        averagePotential: Math.round((players.reduce((sum, p) => sum + p.potentialRating, 0) / players.length) * 10) / 10
      }
    });
  } catch (error) {
    logger.error('Failed to generate multiple players', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// DAILY PROGRESSION SYSTEM ROUTES
// =============================================================================

/**
 * Get daily progression eligibility report
 * GET /game-systems/daily-progression/eligibility
 */
router.get('/daily-progression/eligibility', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await DailyProgressionService.getProgressionEligibilityReport();
    
    res.json({
      success: true,
      eligibilityReport: report,
      summary: {
        totalPlayersChecked: report.length,
        eligiblePlayers: report.filter(p => p.eligibleStats.length > 0).length,
        averageProgressionChance: report.length > 0 
          ? Math.round((report.reduce((sum, p) => sum + p.progressionChance, 0) / report.length) * 10) / 10 
          : 0
      }
    });
  } catch (error) {
    logger.error('Failed to get progression eligibility report', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Manually trigger player progression (admin/testing)
 * POST /game-systems/daily-progression/trigger/:playerId
 */
router.post('/daily-progression/trigger/:playerId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    
    const result = await DailyProgressionService.triggerManualProgression(playerId);
    
    if (result.success) {
      logger.info('Manual progression triggered', {
        userId: req.user.claims.sub,
        playerId,
        progression: result.progression
      });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to trigger manual progression', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Run daily progression for all players (admin only)
 * POST /game-systems/daily-progression/run-all
 */
router.post('/daily-progression/run-all', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // TODO: Add admin permission check
    // const hasPermission = await RBACService.hasPermission(req.user.claims.sub, Permission.ADMIN_GAME_SYSTEMS);
    // if (!hasPermission) {
    //   return res.status(403).json({ error: 'Admin permission required' });
    // }
    
    const result = await DailyProgressionService.processDailyProgression();
    
    logger.info('Daily progression run completed', {
      userId: req.user.claims.sub,
      ...result
    });
    
    res.json({
      success: true,
      message: 'Daily progression completed',
      results: result
    });
  } catch (error) {
    logger.error('Failed to run daily progression', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// POWER & CAMARADERIE CALCULATION ROUTES
// =============================================================================

/**
 * Calculate team power (CAR system)
 * GET /game-systems/power/:teamId
 */
router.get('/power/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const teamPower = await PowerCalculationService.calculateTeamPower(teamId);
    
    if (!teamPower) {
      return res.status(404).json({ error: 'Team not found or has no players' });
    }
    
    res.json({
      success: true,
      teamPower,
      explanation: {
        calculation: 'Team Power = Average of top 9 players\' CAR (Core Athleticism Rating)',
        carFormula: 'CAR = Average(Speed, Power, Agility, Throwing, Catching, Kicking)',
        powerTier: teamPower.powerTier
      }
    });
  } catch (error) {
    logger.error('Failed to calculate team power', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Calculate team camaraderie
 * GET /game-systems/camaraderie/:teamId
 */
router.get('/camaraderie/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const camaraderieData = await PowerCalculationService.calculateTeamCamaraderie(teamId);
    
    if (!camaraderieData) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({
      success: true,
      camaraderie: camaraderieData,
      explanation: {
        calculation: 'Team Camaraderie = Average of individual player camaraderie scores',
        factors: ['Years on team (loyalty)', 'Team success (win percentage)', 'Head Coach leadership']
      }
    });
  } catch (error) {
    logger.error('Failed to calculate team camaraderie', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get league power rankings
 * GET /game-systems/power-rankings
 */
router.get('/power-rankings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const rankings = await PowerCalculationService.getLeaguePowerRankings(limit);
    
    res.json({
      success: true,
      rankings,
      summary: {
        totalTeams: rankings.length,
        averagePower: rankings.length > 0 
          ? Math.round((rankings.reduce((sum, t) => sum + t.teamPower, 0) / rankings.length) * 10) / 10 
          : 0,
        tierDistribution: this.getTierDistribution(rankings)
      }
    });
  } catch (error) {
    logger.error('Failed to get power rankings', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// STAFF EFFECTS SYSTEM ROUTES
// =============================================================================

/**
 * Get team staff effects analysis
 * GET /game-systems/staff-effects/:teamId
 */
router.get('/staff-effects/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const staffAnalysis = await StaffEffectsService.calculateTeamStaffEffects(teamId);
    
    if (!staffAnalysis) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({
      success: true,
      staffAnalysis,
      systemInfo: {
        description: 'Staff attributes use 1-40 scale with specific effects per role',
        staffTypes: ['HEAD_COACH (motivation, development)', 'TRAINER (teaching)', 'RECOVERY_SPECIALIST (physiology)', 'SCOUT (talent identification, potential assessment)']
      }
    });
  } catch (error) {
    logger.error('Failed to get staff effects analysis', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get staff hiring recommendations
 * GET /game-systems/staff-recommendations/:teamId
 */
router.get('/staff-recommendations/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const recommendations = await StaffEffectsService.getStaffHiringRecommendations(teamId);
    
    res.json({
      success: true,
      recommendations,
      guidance: {
        priority: 'Head Coach → Recovery Specialist → Trainers → Scouts',
        minimumQuality: 'Aim for 25+ attributes for meaningful impact',
        maximumImpact: 'Elite staff (35+ attributes) provide significant advantages'
      }
    });
  } catch (error) {
    logger.error('Failed to get staff recommendations', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// ANTI-PAY-TO-WIN VERIFICATION ROUTES
// =============================================================================

/**
 * Get store compliance report
 * GET /game-systems/anti-pay-to-win/store-report
 */
router.get('/anti-pay-to-win/store-report', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = AntiPayToWinService.generateComprehensiveReport();
    
    res.json({
      success: true,
      complianceReport: report,
      principles: {
        description: 'Anti-pay-to-win principles ensure fair gameplay',
        prohibited: ['Permanent stat increases', 'Core gameplay bypasses', 'Progression shortcuts', 'Exclusive advantages'],
        allowed: ['Temporary consumables', 'Equipment (purchasable with credits)', 'Recovery items', 'Tournament entries', 'Cosmetics']
      }
    });
  } catch (error) {
    logger.error('Failed to generate anti-pay-to-win report', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Verify gem exchange rates
 * GET /game-systems/anti-pay-to-win/exchange-rates
 */
router.get('/anti-pay-to-win/exchange-rates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = AntiPayToWinService.verifyGemExchangeRates();
    
    res.json({
      success: true,
      exchangeRateAnalysis: analysis,
      guidelines: {
        compliantRatios: '1:200 to 1:300 (anti-pay-to-win)',
        concerningRatios: '1:350+ (monitor for impact)',
        prohibitedRatios: '1:500+ (promotes pay-to-win)'
      }
    });
  } catch (error) {
    logger.error('Failed to verify exchange rates', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// COMPREHENSIVE SYSTEM STATUS ROUTE
// =============================================================================

/**
 * Get comprehensive game systems status
 * GET /game-systems/status
 */
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Run compliance check
    const complianceReport = AntiPayToWinService.generateComprehensiveReport();
    
    const systemStatus = {
      tapSystem: {
        status: 'OPERATIONAL',
        description: 'Total Attribute Points system for balanced player generation'
      },
      dailyProgression: {
        status: 'OPERATIONAL',
        description: '3 AM daily reset with age-based progression chances'
      },
      powerCalculations: {
        status: 'OPERATIONAL',
        description: 'Core Athleticism Rating (CAR) and team power calculations'
      },
      camaraderieSystem: {
        status: 'OPERATIONAL',
        description: 'Team camaraderie based on loyalty, success, and coaching'
      },
      staffEffects: {
        status: 'OPERATIONAL',
        description: 'Complete staff system with 1-40 scale attributes and effects'
      },
      antiPayToWin: {
        status: complianceReport.overallCompliance ? 'COMPLIANT' : 'VIOLATIONS_DETECTED',
        description: 'Store and systems verified for fair gameplay principles',
        healthScore: complianceReport.storeAnalysis.storeHealthScore
      }
    };
    
    const overallHealth = Object.values(systemStatus).every(s => 
      s.status === 'OPERATIONAL' || s.status === 'COMPLIANT'
    ) ? 'HEALTHY' : 'ISSUES_DETECTED';
    
    res.json({
      success: true,
      overallHealth,
      systems: systemStatus,
      compliance: {
        storeCompliance: complianceReport.overallCompliance,
        healthScore: complianceReport.storeAnalysis.storeHealthScore,
        criticalViolations: complianceReport.storeAnalysis.violations.filter(v => v.severity === 'CRITICAL').length
      },
      documentation: {
        gameSystemsDoc: 'All systems implemented per Consolidated Game Mechanics & Systems specification',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get game systems status', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTierDistribution(rankings: any[]) {
  const tiers = {
    'Elite': 0,
    'Championship': 0,
    'Competitive': 0,
    'Developing': 0,
    'Foundation': 0,
    'Rebuilding': 0
  };
  
  for (const team of rankings) {
    if (tiers.hasOwnProperty(team.powerTier)) {
      (tiers as any)[team.powerTier]++;
    }
  }
  
  return tiers;
}

export default router;