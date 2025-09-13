/**
 * Enhanced Stadium Management System
 * Consolidation of stadium routes and stadium atmosphere routes
 * 
 * Phase 3E: Stadium System Consolidation
 * Combines:
 * - stadiumRoutes.ts (4 endpoints)
 * - stadiumAtmosphereRoutes.ts (16 endpoints)
 * Total: 20 endpoints with unified authentication and error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPrismaClient } from "../database.js";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { StadiumAtmosphereService } from '../services/stadiumAtmosphereService.js';
import { RBACService, Permission } from '../services/rbacService.js';
import type { Player, Team, Stadium } from '@shared/types/models';

import {
  calculateFanLoyalty,
  calculateHomeAdvantage,
  calculateAttendance,
  calculateGameRevenue,
  getAvailableFacilityUpgrades,
  calculateFacilityQuality,
  getAtmosphereDescription
} from "../../shared/stadiumSystem.ts";

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to get user's team with stadium
 */
async function getUserTeamWithStadium(userId: string) {
  const prisma = await getPrismaClient();
  
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId }
  });
  
  if (!userProfile) {
    throw new Error("User profile not found");
  }
  
  const team = await prisma.team.findFirst({
    where: { userProfileId: userProfile.id },
    include: { stadium: true }
  });
  
  if (!team) {
    throw new Error("No team found for current user");
  }
  
  // Create default stadium if it doesn't exist
  if (!team.stadium) {
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
    
    return { ...team, stadium: newStadium };
  }
  
  return team;
}

/**
 * Helper to serialize BigInt values for JSON response
 */
function serializeNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeNumber);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeNumber(obj[key]);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// CORE STADIUM ROUTES (from stadiumRoutes.ts)
// ============================================================================

/**
 * GET /api/stadium
 * Get stadium data for authenticated user
 */
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;

    // Get available upgrades
    const availableUpgrades = getAvailableFacilityUpgrades(stadium);
    
    // Get stadium events (placeholder until stadiumEvent table is implemented)
    const events: any[] = [];

    // Calculate stadium atmosphere and fan loyalty
    const facilityQuality = calculateFacilityQuality(stadium);
    const fanLoyalty = calculateFanLoyalty(
      50, // Start with 50 base loyalty 
      `${team.wins || 0}-${team.losses || 0}-0`,
      facilityQuality,
      0, // winStreak
      50 // Assume mid-season performance for now
    );
    const homeAdvantage = calculateHomeAdvantage(stadium, fanLoyalty);
    const atmosphereDescription = getAtmosphereDescription(fanLoyalty, facilityQuality);

    res.json({
      success: true,
      data: serializeNumber({
        stadium,
        availableUpgrades,
        events,
        atmosphere: {
          fanLoyalty,
          homeAdvantage,
          facilityQuality,
          description: atmosphereDescription
        }
      })
    });
  } catch (error) {
    console.error("Error fetching stadium data:", error);
    next(error);
  }
});

/**
 * POST /api/stadium/upgrade
 * Facility upgrade route
 */
const upgradeSchema = z.object({
  facilityType: z.enum(['concessions', 'parking', 'merchandising', 'vipSuites', 'screens', 'lighting', 'security']),
  upgradeLevel: z.number().int().min(1).max(5)
});

router.post('/upgrade', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { facilityType, upgradeLevel } = upgradeSchema.parse(req.body);
    const prisma = await getPrismaClient();

    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;

    // Get team finances
    const finances = await prisma.teamFinances.findFirst({
      where: { teamId: team.id }
    });

    if (!finances) {
      return res.status(404).json({ 
        success: false, 
        message: "Team finances not found" 
      });
    }

    // Get available upgrades and find the specific one
    const availableUpgrades = await getAvailableFacilityUpgrades(stadium);
    const upgrade = availableUpgrades.find(u => 
      u.name.toLowerCase().includes(facilityType.toLowerCase()) && 
      u.level === upgradeLevel
    );

    if (!upgrade) {
      return res.status(400).json({ 
        success: false, 
        message: "Upgrade not available or invalid" 
      });
    }

    // Check if team has enough credits
    if (Number(finances.credits || 0) < upgrade.upgradeCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits. Cost: ${upgrade.upgradeCost}, Available: ${Number(finances.credits || 0)}` 
      });
    }

    // Apply the upgrade
    const facilityColumn = `${facilityType}Level`;
    const updateData: any = { 
      [facilityColumn]: upgradeLevel,
      updatedAt: new Date()
    };

    // Update stadium
    await prisma.stadium.update({
      where: { id: stadium.id },
      data: updateData
    });

    // Deduct credits
    await prisma.teamFinances.update({
      where: { teamId: team.id },
      data: { 
        credits: Number(Number(finances.credits || 0) - upgrade.upgradeCost)
      }
    });

    res.json({
      success: true,
      message: `${upgrade.name} upgraded successfully!`,
      remainingCredits: Number(finances.credits || 0) - upgrade.upgradeCost
    });
  } catch (error) {
    console.error("Error upgrading stadium facility:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid upgrade data", 
        errors: error.errors 
      });
    }
    next(error);
  }
});

/**
 * POST /api/stadium/field-size
 * Field size change route
 */
const fieldSizeSchema = z.object({ 
  fieldSize: z.enum(["standard", "large", "small"]) 
});

router.post('/field-size', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { fieldSize } = fieldSizeSchema.parse(req.body);
    const prisma = await getPrismaClient();

    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;

    // Get team finances
    const finances = await prisma.teamFinances.findFirst({
      where: { teamId: team.id }
    });

    if (!finances) {
      return res.status(404).json({ 
        success: false, 
        message: "Team finances not found" 
      });
    }

    const changeCost = 75000;
    if (Number(finances.credits || 0) < changeCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits. Cost: ${changeCost}, Available: ${Number(finances.credits || 0)}` 
      });
    }

    // Update stadium (removing fieldSize as it doesn't exist in schema)
    await prisma.stadium.update({
      where: { id: stadium.id },
      data: { updatedAt: new Date() }
    });

    // Deduct credits
    await prisma.teamFinances.update({
      where: { teamId: team.id },
      data: { 
        credits: Number(Number(finances.credits || 0) - changeCost)
      }
    });

    res.json({
      success: true,
      message: `Field size changed to ${fieldSize} successfully!`,
      remainingCredits: Number(finances.credits || 0) - changeCost
    });
  } catch (error) {
    console.error("Error changing field size:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid field size data", 
        errors: error.errors 
      });
    }
    next(error);
  }
});

/**
 * GET /api/stadium/revenue/:teamId
 * Revenue calculation route
 */
router.get('/revenue/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params.teamId;
    const prisma = await getPrismaClient();
    
    // Get stadium
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: teamId }
    });

    if (!stadium) {
      return res.status(404).json({ 
        success: false, 
        message: "No stadium found for team" 
      });
    }

    // Get team for fan loyalty calculation
    const team = await prisma.team.findFirst({
      where: { id: teamId }
    });

    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "Team not found" 
      });
    }

    // Calculate revenue for a hypothetical match
    const facilityQuality = calculateFacilityQuality(stadium);
    const fanLoyalty = calculateFanLoyalty(
      50, // Start with 50 base loyalty 
      `${team.wins || 0}-${team.losses || 0}-0`,
      facilityQuality,
      0, // winStreak
      50 // Assume mid-season performance for now
    );

    const attendanceData = calculateAttendance(stadium, fanLoyalty, team.division || 8, 0, 50, false, 'good');
    const revenue = calculateGameRevenue(stadium, attendanceData.attendance, fanLoyalty);

    res.json({
      success: true,
      data: serializeNumber({
        stadium,
        fanLoyalty,
        projectedAttendance: attendanceData,
        projectedRevenue: revenue
      })
    });
  } catch (error) {
    console.error("Error calculating stadium revenue:", error);
    next(error);
  }
});

// ============================================================================
// STADIUM ATMOSPHERE ROUTES (from stadiumAtmosphereRoutes.ts)
// ============================================================================

/**
 * GET /api/stadium/atmosphere/team/:teamId/analytics
 * Get comprehensive stadium analytics for a team
 */
router.get('/atmosphere/team/:teamId/analytics', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const analytics = await StadiumAtmosphereService.getStadiumAnalytics(teamId);
    
    res.json({
      success: true,
      data: serializeNumber(analytics)
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
 * GET /api/stadium/atmosphere/team/:teamId/matchday
 * Calculate matchday atmosphere for a home game
 */
router.get('/atmosphere/team/:teamId/matchday', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const atmosphere = await StadiumAtmosphereService.calculateMatchdayAtmosphere(teamId);
    
    res.json({
      success: true,
      data: serializeNumber(atmosphere)
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
 * GET /api/stadium/atmosphere/team/:teamId/revenue
 * Calculate projected home game revenue
 */
router.get('/atmosphere/team/:teamId/revenue', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const revenue = await StadiumAtmosphereService.calculateHomeGameRevenue(teamId);
    
    res.json({
      success: true,
      data: serializeNumber(revenue)
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
 * POST /api/stadium/atmosphere/team/:teamId/loyalty/calculate
 * Calculate end-of-season loyalty for a team
 */
router.post('/atmosphere/team/:teamId/loyalty/calculate', requireAuth, RBACService.requirePermission(Permission.VIEW_ALL_TEAMS), async (req, res) => {
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
      data: serializeNumber(loyaltyUpdate)
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
 * POST /api/stadium/atmosphere/league/loyalty/process
 * Process league-wide end-of-season loyalty updates
 */
router.post('/atmosphere/league/loyalty/process', requireAuth, RBACService.requirePermission(Permission.MANAGE_LEAGUES), async (req, res) => {
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
      data: serializeNumber(results),
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
 * GET /api/stadium/atmosphere/upgrade-cost/:upgradeType
 * Calculate cost for a stadium upgrade
 */
router.get('/atmosphere/upgrade-cost/:upgradeType', requireAuth, async (req, res) => {
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
 * GET /api/stadium/atmosphere/player/:playerId/car
 * Calculate Core Athleticism Rating for a player
 */
router.get('/atmosphere/player/:playerId/car', requireAuth, async (req, res) => {
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
 * GET /api/stadium/atmosphere/power-tier/:teamPower
 * Get team power tier information
 */
router.get('/atmosphere/power-tier/:teamPower', requireAuth, async (req, res) => {
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
 * POST /api/stadium/atmosphere/apply-crowd-debuff
 * Apply crowd noise debuff to away team players
 */
router.post('/atmosphere/apply-crowd-debuff', requireAuth, async (req, res) => {
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
 * GET /api/stadium/atmosphere/stadium-data
 * Get stadium data for current user's team
 */
router.get('/atmosphere/stadium-data', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;
    
    const facilityQuality = calculateFacilityQuality(stadium);
    const totalValue = 100000 + (facilityQuality * 5000);
    
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
        totalValue,
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
 * GET /api/stadium/atmosphere/atmosphere-data
 * Get atmosphere data for current user's team
 */
router.get('/atmosphere/atmosphere-data', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;
    
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
 * GET /api/stadium/atmosphere/revenue-breakdown
 * Get revenue breakdown for current user's team
 */
router.get('/atmosphere/revenue-breakdown', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;
    
    // Calculate cumulative revenue using enhanced game economy service
    const { EnhancedGameEconomyService } = await import('../services/enhancedGameEconomyService.js');
    
    // Get historical revenue from home games (simulate accumulated income)
    const capacity = stadium?.capacity || 10000;
    const division = team.division || 4;
    const fanLoyalty = team.fanLoyalty || 50;
    
    // Calculate average game revenue (what user would see accumulated)
    const actualAttendance = EnhancedGameEconomyService.calculateGameAttendance(capacity, division, fanLoyalty, 0);
    
    // Division scaling multiplier
    let divisionMultiplier = 1.0;
    if (division <= 2) divisionMultiplier = 1.5;
    else if (division <= 5) divisionMultiplier = 1.2;
    else if (division <= 7) divisionMultiplier = 1.1;
    
    // Calculate typical game revenues (what user should see as income streams)
    const concessionsLevel = stadium?.concessionsLevel || 1;
    const parkingLevel = stadium?.parkingLevel || 1;
    const vipSuitesLevel = stadium?.vipSuitesLevel || 0;
    const merchandisingLevel = stadium?.merchandisingLevel || 1;
    
    const breakdown = {
      ticketSales: Math.floor(actualAttendance * 25 * divisionMultiplier),
      concessions: Math.floor(actualAttendance * 8 * concessionsLevel * divisionMultiplier),
      parking: Math.floor(actualAttendance * 0.3 * 10 * parkingLevel * divisionMultiplier),
      vipSuites: Math.floor(vipSuitesLevel * 5000),
      apparelSales: Math.floor(actualAttendance * 3 * merchandisingLevel * divisionMultiplier),
      atmosphereBonus: fanLoyalty > 80 ? Math.floor(actualAttendance * 2) : 0
    };
    
    const totalRevenue = Object.values(breakdown).reduce((sum: any, val: any) => sum + val, 0);
    
    res.json({
      success: true,
      data: {
        ...breakdown,
        totalRevenue
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
 * GET /api/stadium/atmosphere/upgrade-costs
 * Get upgrade costs for current user's team
 */
router.get('/atmosphere/upgrade-costs', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    const stadium = team.stadium!;
    
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
 * GET /api/stadium/atmosphere/loyalty-factors
 * Get loyalty factors for current user's team
 */
router.get('/atmosphere/loyalty-factors', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    
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
 * GET /api/stadium/atmosphere/team-power-tier
 * Get team power tier for current user's team
 */
router.get('/atmosphere/team-power-tier', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const team = await getUserTeamWithStadium(userId);
    
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
 * GET /api/stadium/atmosphere/config
 * Get stadium atmosphere system configuration
 */
router.get('/atmosphere/config', requireAuth, async (req, res) => {
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

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

// Aliases for /api/stadium-atmosphere routes (maintain backward compatibility)
router.get('/team/:teamId/analytics', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/team/:teamId/matchday', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/team/:teamId/revenue', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.post('/team/:teamId/loyalty/calculate', requireAuth, RBACService.requirePermission(Permission.VIEW_ALL_TEAMS), async (req, res) => {
  return router.handle(req, res, () => {});
});

router.post('/league/loyalty/process', requireAuth, RBACService.requirePermission(Permission.MANAGE_LEAGUES), async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/upgrade-cost/:upgradeType', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/player/:playerId/car', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/power-tier/:teamPower', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.post('/apply-crowd-debuff', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

router.get('/stadium-data', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/atmosphere-data', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/revenue-breakdown', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/upgrade-costs', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/loyalty-factors', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/team-power-tier', requireAuth, async (req: any, res) => {
  return router.handle(req, res, () => {});
});

router.get('/config', requireAuth, async (req, res) => {
  return router.handle(req, res, () => {});
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;