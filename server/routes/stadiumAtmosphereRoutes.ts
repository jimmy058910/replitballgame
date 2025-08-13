import { Router } from 'express';
import { StadiumAtmosphereService } from '../services/stadiumAtmosphereService.js';
import { isAuthenticated } from '../googleAuth.js';
import { RBACService, Permission } from '../services/rbacService.js';
import { getPrismaClient } from '../db.js';

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
router.post('/team/:teamId/loyalty/calculate', isAuthenticated, RBACService.requirePermission(Permission.VIEW_ALL_TEAMS), async (req, res) => {
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
router.post('/league/loyalty/process', isAuthenticated, RBACService.requirePermission(Permission.MANAGE_LEAGUES), async (req, res) => {
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
 * GET /api/stadium-atmosphere/stadium-data
 * Get stadium data for current user's team
 */
router.get('/stadium-data', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }

    // Get or create stadium (same logic as /api/stadium route)
    let stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });

    if (!stadium) {
      // Create default stadium
      const newStadium = await prisma.stadium.create({
        data: {
        teamId: team.id,
        capacity: 15000,
        lightingScreensLevel: 1,
        concessionsLevel: 1,
        parkingLevel: 1,
        merchandisingLevel: 1,
        vipSuitesLevel: 1,
        }
      });
      
      stadium = newStadium;
    }
    
    res.json({
      success: true,
      data: {
        capacity: stadium.capacity || 15000,
        concessionLevel: stadium.concessionsLevel || 1,
        parkingLevel: stadium.parkingLevel || 1,
        vipSuitesLevel: stadium.vipSuitesLevel || 1,
        merchandisingLevel: stadium.merchandisingLevel || 1,
        lightingLevel: stadium.lightingScreensLevel || 1,
        fanLoyalty: team.fanLoyalty || 50,
        totalValue: await import('../../shared/stadiumSystem.js').then(({ calculateFacilityQuality }) => {
          const facilityQuality = calculateFacilityQuality(stadium);
          return 100000 + (facilityQuality * 5000); // Proper facility-based valuation
        }).catch(() => 100000), // Fallback to base value if calculation fails
        maintenanceCost: 5000
      }
    });
  } catch (error) {
    console.error('Error getting stadium data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stadium data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/atmosphere-data
 * Get atmosphere data for current user's team
 */
router.get('/atmosphere-data', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }
    
    // Get stadium for attendance calculation
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });
    
    const capacity = stadium?.capacity || 15000;
    const fanLoyalty = team.fanLoyalty || 50;
    const attendancePercentage = Math.min(85, Math.max(35, fanLoyalty * 0.8)); // 35-85% based on loyalty
    const actualAttendance = Math.floor(capacity * (attendancePercentage / 100));
    
    res.json({
      success: true,
      data: {
        fanLoyalty: fanLoyalty,
        loyaltyTrend: 'stable',
        attendancePercentage: attendancePercentage,
        actualAttendance: actualAttendance,
        intimidationFactor: Math.min(10, Math.floor(fanLoyalty / 10)),
        crowdNoise: Math.floor(attendancePercentage * 1.2),
        baseAttendance: 35,
        homeFieldAdvantage: Math.min(10, Math.floor(fanLoyalty / 10))
      }
    });
  } catch (error) {
    console.error('Error getting atmosphere data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get atmosphere data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/revenue-breakdown
 * Get revenue breakdown for current user's team
 */
router.get('/revenue-breakdown', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }
    
    // Basic revenue calculation
    const baseRevenue = 25000;
    const loyaltyMultiplier = (team.fanLoyalty || 50) / 100;
    
    res.json({
      success: true,
      data: {
        ticketSales: Math.floor(baseRevenue * loyaltyMultiplier),
        concessions: Math.floor(baseRevenue * 0.3 * loyaltyMultiplier),
        parking: Math.floor(baseRevenue * 0.2 * loyaltyMultiplier),
        totalRevenue: Math.floor(baseRevenue * 1.5 * loyaltyMultiplier)
      }
    });
  } catch (error) {
    console.error('Error getting revenue breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue breakdown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/upgrade-costs
 * Get upgrade costs for current user's team
 */
router.get('/upgrade-costs', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }

    // Get or create stadium
    let stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });

    if (!stadium) {
      // Create default stadium
      const newStadium = await prisma.stadium.create({
        data: {
        teamId: team.id,
        capacity: 15000,
        lightingScreensLevel: 1,
        concessionsLevel: 1,
        parkingLevel: 1,
        merchandisingLevel: 1,
        vipSuitesLevel: 1,
        }
      });
      
      stadium = newStadium;
    }
    
    res.json({
      success: true,
      data: {
        capacity: 15000, // Fixed ₡15k for +5k seats 
        concessions: 52500 * Math.pow(1.5, (stadium.concessionsLevel || 1) - 1), // 75% increase
        parking: 43750 * Math.pow(1.5, (stadium.parkingLevel || 1) - 1), // 75% increase
        vipSuites: 100000 * Math.pow(1.5, (stadium.vipSuitesLevel || 1) - 1), // Keep as prestige
        merchandising: 70000 * Math.pow(1.5, (stadium.merchandisingLevel || 1) - 1), // 75% increase
        lighting: 60000 * Math.pow(1.5, (stadium.lightingScreensLevel || 1) - 1) // Keep same
      }
    });
  } catch (error) {
    console.error('Error getting upgrade costs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upgrade costs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/loyalty-factors
 * Get loyalty factors for current user's team
 */
router.get('/loyalty-factors', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }
    
    res.json({
      success: true,
      data: {
        currentLoyalty: team.fanLoyalty || 50,
        factors: {
          teamPerformance: 'Based on win/loss record',
          facilityQuality: 'Based on stadium upgrades',
          seasonPerformance: 'Based on league standing'
        }
      }
    });
  } catch (error) {
    console.error('Error getting loyalty factors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get loyalty factors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stadium-atmosphere/team-power-tier
 * Get team power tier for current user's team
 */
router.get('/team-power-tier', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's profile first
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team found for current user'
      });
    }
    
    // Simple team power tier calculation
    const teamPower = 15;
    let tier = 1;
    if (teamPower >= 31) tier = 5;
    else if (teamPower >= 26) tier = 4;
    else if (teamPower >= 21) tier = 3;
    else if (teamPower >= 16) tier = 2;
    
    res.json({
      success: true,
      data: {
        tier,
        name: tier === 5 ? 'Elite' : tier === 4 ? 'Contender' : tier === 3 ? 'Competitive' : tier === 2 ? 'Developing' : 'Foundation',
        description: `Tier ${tier} team performance level`
      }
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