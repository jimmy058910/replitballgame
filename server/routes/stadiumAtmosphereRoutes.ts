import { Router } from 'express';
import { StadiumAtmosphereService } from '../services/stadiumAtmosphereService';
import { isAuthenticated } from '../replitAuth';
import { RBACService } from '../services/rbacService';

const router = Router();

/**
 * GET /api/stadium-atmosphere/team/:teamId/analytics
 * Get comprehensive stadium analytics for a team
 */
router.get('/team/:teamId/analytics', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const analytics = await StadiumAtmosphereService.getStadiumAnalytics(teamId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting stadium analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stadium analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/team/:teamId/matchday
 * Calculate matchday atmosphere for a home game
 */
router.get('/team/:teamId/matchday', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const atmosphere = await StadiumAtmosphereService.calculateMatchdayAtmosphere(teamId);
    
    res.json({
      success: true,
      data: atmosphere
    });
  } catch (error) {
    console.error('Error calculating matchday atmosphere:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate matchday atmosphere',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/team/:teamId/revenue
 * Calculate projected home game revenue
 */
router.get('/team/:teamId/revenue', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const revenue = await StadiumAtmosphereService.calculateHomeGameRevenue(teamId);
    
    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Error calculating home game revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate home game revenue',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/stadium-atmosphere/team/:teamId/loyalty/calculate
 * Calculate end-of-season loyalty for a team
 */
router.post('/team/:teamId/loyalty/calculate', isAuthenticated, RBACService.requirePermission('manage_teams'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const loyaltyUpdate = await StadiumAtmosphereService.calculateEndOfSeasonLoyalty(teamId, season);
    
    res.json({
      success: true,
      data: loyaltyUpdate
    });
  } catch (error) {
    console.error('Error calculating end-of-season loyalty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate end-of-season loyalty',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/stadium-atmosphere/league/loyalty/process
 * Process league-wide end-of-season loyalty updates
 */
router.post('/league/loyalty/process', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const results = await StadiumAtmosphereService.processLeagueEndOfSeasonLoyalty(season);
    
    res.json({
      success: true,
      data: results,
      message: `Processed loyalty updates for ${results.teamsProcessed} teams`
    });
  } catch (error) {
    console.error('Error processing league loyalty updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process league loyalty updates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/upgrade-cost/:upgradeType
 * Calculate cost for a stadium upgrade
 */
router.get('/upgrade-cost/:upgradeType', isAuthenticated, async (req, res) => {
  try {
    const { upgradeType } = req.params;
    const { currentLevel, currentCapacity } = req.query;
    
    const level = parseInt(currentLevel as string) || 0;
    const capacity = currentCapacity ? parseInt(currentCapacity as string) : undefined;
    
    const cost = StadiumAtmosphereService.calculateUpgradeCost(
      upgradeType as any,
      level,
      capacity
    );
    
    res.json({
      success: true,
      data: {
        upgradeType,
        currentLevel: level,
        currentCapacity: capacity,
        upgradeCost: cost
      }
    });
  } catch (error) {
    console.error('Error calculating upgrade cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate upgrade cost',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/player/:playerId/car
 * Calculate Core Athleticism Rating for a player
 */
router.get('/player/:playerId/car', isAuthenticated, async (req, res) => {
  try {
    // This would need to fetch player data first
    // For now, return the calculation method
    res.json({
      success: true,
      data: {
        formula: 'CAR = (Speed + Power + Agility + Throwing + Catching + Kicking) / 6',
        note: 'Player data needed to calculate actual CAR'
      }
    });
  } catch (error) {
    console.error('Error calculating player CAR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate player CAR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/power-tier/:teamPower
 * Get team power tier information
 */
router.get('/power-tier/:teamPower', isAuthenticated, async (req, res) => {
  try {
    const teamPower = parseInt(req.params.teamPower);
    
    if (isNaN(teamPower)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team power value'
      });
    }
    
    const tier = StadiumAtmosphereService.getTeamPowerTier(teamPower);
    
    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    console.error('Error getting team power tier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team power tier',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/stadium-atmosphere/apply-crowd-debuff
 * Apply crowd noise debuff to away team players
 */
router.post('/apply-crowd-debuff', isAuthenticated, async (req, res) => {
  try {
    const { awayPlayers, crowdNoiseDebuff } = req.body;
    
    if (!Array.isArray(awayPlayers) || typeof crowdNoiseDebuff !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Away players array and crowd noise debuff number required'
      });
    }
    
    const debuffedPlayers = StadiumAtmosphereService.applyCrowdNoiseDebuff(awayPlayers, crowdNoiseDebuff);
    
    res.json({
      success: true,
      data: {
        originalPlayers: awayPlayers,
        debuffedPlayers,
        crowdNoiseDebuff
      }
    });
  } catch (error) {
    console.error('Error applying crowd debuff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply crowd debuff',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/config
 * Get stadium atmosphere system configuration
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        loyaltyConfig: StadiumAtmosphereService.LOYALTY_CONFIG,
        upgradeConfig: StadiumAtmosphereService.UPGRADE_CONFIG,
        powerTiers: StadiumAtmosphereService.POWER_TIERS,
        description: 'Stadium Atmosphere System Configuration and Constants'
      }
    });
  } catch (error) {
    console.error('Error getting stadium atmosphere config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stadium atmosphere config',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;