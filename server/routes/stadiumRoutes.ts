import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { isAuthenticated } from '../googleAuth';
import {
  calculateFanLoyalty,
  calculateHomeAdvantage,
  calculateAttendance,
  calculateGameRevenue,
  getAvailableFacilityUpgrades,
  calculateFacilityQuality,
  getAtmosphereDescription
} from "@shared/stadiumSystem";

const router = Router();

// Get stadium data for authenticated user
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get user's team
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "No team found for current user" 
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
        name: `${team.name} Stadium`,
        level: 1,
        capacity: 15000,
        fieldSize: 'standard',
        lightingLevel: 1,
        concessionsLevel: 1,
        parkingLevel: 1,
        merchandisingLevel: 1,
        vipSuitesLevel: 1,
        screensLevel: 1,
        securityLevel: 1,
        maintenanceCost: 5000
        }
      });
      
      stadium = newStadium;
    }

    // Get available upgrades
    const availableUpgrades = getAvailableFacilityUpgrades(stadium);
    
    // Get stadium events (last 10) - use empty array if no events table
    const events = []; // Placeholder until stadiumEvent table is implemented

    // Calculate stadium atmosphere and fan loyalty
    const facilityQuality = calculateFacilityQuality(stadium);
    const teamRecord = `${team.wins || 0}-${team.losses || 0}-${team.draws || 0}`;
    const fanLoyalty = calculateFanLoyalty(
      50, // Start with 50 base loyalty 
      teamRecord,
      facilityQuality,
      0, // winStreak
      50 // Assume mid-season performance for now
    );
    const homeAdvantage = calculateHomeAdvantage(stadium, fanLoyalty);
    const atmosphereDescription = getAtmosphereDescription(fanLoyalty, facilityQuality);

    res.json({
      success: true,
      data: {
        stadium,
        availableUpgrades,
        events,
        atmosphere: {
          fanLoyalty,
          homeAdvantage,
          facilityQuality,
          description: atmosphereDescription
        }
      }
    });
  } catch (error) {
    console.error("Error fetching stadium data:", error);
    next(error);
  }
});

// Facility upgrade route
const upgradeSchema = z.object({
  facilityType: z.enum(['concessions', 'parking', 'merchandising', 'vipSuites', 'screens', 'lighting', 'security']),
  upgradeLevel: z.number().int().min(1).max(5)
});

router.post('/upgrade', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { facilityType, upgradeLevel } = upgradeSchema.parse(req.body);

    // Get user's team
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "No team found for current user" 
      });
    }

    // Get stadium
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });

    if (!stadium) {
      return res.status(404).json({ 
        success: false, 
        message: "No stadium found for team" 
      });
    }

    // Get team finances
    const finances = await prisma.teamFinance.findFirst({
      where: { teamId: team.id }
    });

    if (!finances) {
      return res.status(404).json({ 
        success: false, 
        message: "Team finances not found" 
      });
    }

    // Get available upgrades and find the specific one
    const availableUpgrades = getAvailableFacilityUpgrades(stadium);
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
    if ((finances.credits || 0) < upgrade.upgradeCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits. Cost: ${upgrade.upgradeCost}, Available: ${finances.credits || 0}` 
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
    await prisma.teamFinance.update({
      where: { teamId: team.id },
      data: { 
        credits: (finances.credits || 0) - upgrade.upgradeCost 
      }
    });

    res.json({
      success: true,
      message: `${upgrade.name} upgraded successfully!`,
      remainingCredits: (finances.credits || 0) - upgrade.upgradeCost
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

// Field size change route  
const fieldSizeSchema = z.object({ 
  fieldSize: z.enum(["standard", "large", "small"]) 
});

router.post('/field-size', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { fieldSize } = fieldSizeSchema.parse(req.body);

    // Get user's team
    const userProfile = await prisma.userProfile.findFirst({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }
    
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "No team found for current user" 
      });
    }

    // Get stadium
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: team.id }
    });

    if (!stadium) {
      return res.status(404).json({ 
        success: false, 
        message: "No stadium found for team" 
      });
    }

    // Get team finances
    const finances = await prisma.teamFinance.findFirst({
      where: { teamId: team.id }
    });

    if (!finances) {
      return res.status(404).json({ 
        success: false, 
        message: "Team finances not found" 
      });
    }

    const changeCost = 75000;
    if ((finances.credits || 0) < changeCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits. Cost: ${changeCost}, Available: ${finances.credits || 0}` 
      });
    }

    // Update stadium field size
    await prisma.stadium.update({
      where: { id: stadium.id },
      data: { fieldSize, updatedAt: new Date() }
    });

    // Deduct credits
    await prisma.teamFinance.update({
      where: { teamId: team.id },
      data: { 
        credits: (finances.credits || 0) - changeCost 
      }
    });

    res.json({
      success: true,
      message: `Field size changed to ${fieldSize} successfully!`,
      remainingCredits: (finances.credits || 0) - changeCost
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

// Revenue calculation route
router.get('/revenue/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params.teamId;
    
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
    const teamRecord = `${team.wins || 0}-${team.losses || 0}-${team.draws || 0}`;
    const fanLoyalty = calculateFanLoyalty(
      50, // Start with 50 base loyalty 
      teamRecord,
      facilityQuality,
      0, // winStreak
      50 // Assume mid-season performance for now
    );

    const attendanceData = calculateAttendance(stadium, fanLoyalty, team.division || 8, 0, 50, false, 'good');
    const revenue = calculateGameRevenue(stadium, attendanceData.attendance, fanLoyalty);

    res.json({
      success: true,
      data: {
        stadium,
        fanLoyalty,
        projectedAttendance: attendanceData,
        projectedRevenue: revenue
      }
    });
  } catch (error) {
    console.error("Error calculating stadium revenue:", error);
    next(error);
  }
});

export default router;