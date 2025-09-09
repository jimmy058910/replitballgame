import { Router } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { storage } from '../storage/index.js';
import { 
  FIELD_SIZE_CONFIG, 
  TACTICAL_FOCUS_CONFIG, 
  canChangeFieldSize, 
  calculateTacticalEffectiveness,
  getFieldSizeInfo,
  getTacticalFocusInfo 
} from "../../shared/tacticalSystem.js";
import { getPrismaClient } from "../database.js";
import { SeasonalFlowService } from '../services/seasonalFlowService.js';
import { CamaraderieService } from '../services/camaraderieService.js';
import type { Team } from '@shared/types/models';


const router = Router();

// Get team's current formation
router.get("/formation", requireAuth, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage?.players.getPlayersByTeamId(team.id);
    
    // Get formation from team data - formation data is stored in team record
    let formation = { starters: [], substitutes: [], flexSubs: [] };
    
    if (team.formation_data) {
      try {
        // Parse the JSON formation data
        const parsedFormation = typeof team.formation_data === 'string' 
          ? JSON.parse(team.formation_data) 
          : team.formation_data;
        
        formation = {
          starters: parsedFormation.starters || [],
          substitutes: parsedFormation.substitutes || [],
          flexSubs: parsedFormation.flexSubs || []
        };
        
        console.log(`✅ [FORMATION] Loaded formation for team ${team.name}:`, {
          starters: formation.starters.length,
          substitutes: formation.substitutes.length,
          flexSubs: formation.flexSubs.length
        });
      } catch (error) {
        console.error('❌ [FORMATION] Failed to parse formation data:', error);
        formation = { starters: [], substitutes: [], flexSubs: [] };
      }
    }
    
    res.json({
      formation: formation,
      players: players,
      teamId: team.id,
      teamName: team.name
    });
  } catch (error) {
    console.error("Error fetching team formation:", error);
    res.status(500).json({ error: "Failed to fetch team formation" });
  }
});

// Get team's current tactical setup
router.get("/team-tactics", requireAuth, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage?.players.getPlayersByTeamId(team.id);
    const staff = await storage.staff.getStaffByTeamId(team.id);
    const headCoach = staff.find((s: any) => s.type === "HEAD_COACH");
    
    // Get current season day to check if field size can be changed
    const currentDay = await SeasonalFlowService.getCurrentDay();
    const canChangeField = canChangeFieldSize(currentDay);
    
    const fieldSize = (team.homeField || "STANDARD").toLowerCase() as any;
    const tacticalFocus = (team?.tacticalFocus || "BALANCED").toLowerCase() as any;
    
    // Get proper team camaraderie using the service (filters active roster players only)
    const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());
    
    const tacticalSetup = {
      fieldSize,
      tacticalFocus,
      canChangeFieldSize: canChangeField,
      fieldSizeInfo: getFieldSizeInfo(fieldSize),
      tacticalFocusInfo: getTacticalFocusInfo(tacticalFocus),
      headCoachTactics: headCoach?.motivation || headCoach?.tactics || 50,
      teamCamaraderie: teamCamaraderie,
    };

    // Calculate effectiveness
    const effectiveness = calculateTacticalEffectiveness(
      {
        fieldSize,
        tacticalFocus,
        camaraderie: teamCamaraderie,
        headCoachTactics: headCoach?.motivation || headCoach?.tactics || 50,
        isHomeTeam: true,
      },
      players,
      { homeScore: 0, awayScore: 0, gameTime: 0, maxTime: 1200, currentHalf: 1 }
    );

    res.json({
      ...tacticalSetup,
      effectiveness,
      availableFieldSizes: Object.keys(FIELD_SIZE_CONFIG),
      availableTacticalFoci: Object.keys(TACTICAL_FOCUS_CONFIG),
    });
  } catch (error) {
    console.error("Error fetching team tactics:", error);
    res.status(500).json({ error: "Failed to fetch team tactics" });
  }
});

// Update team's field size (only during off-season or day 1)
router.post("/update-field-size", requireAuth, async (req: any, res) => {
  try {
    const { fieldSize } = req.body;
    
    if (!["standard", "large", "small"].includes(fieldSize)) {
      return res.status(400).json({ error: "Invalid field size" });
    }

    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if field size can be changed
    const currentDay = await SeasonalFlowService.getCurrentDay();
    if (!canChangeFieldSize(currentDay)) {
      return res.status(400).json({ 
        error: "Field size can only be changed on Day 1 or after Day 14 (off-season)" 
      });
    }

    await storage.teams.updateTeam(team.id, { homeField: fieldSize.toUpperCase() });
    
    const updatedTeam = await storage.teams.getTeamById(team.id);
    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found after update" });
    }
    
    res.json({
      message: "Field size updated successfully",
      fieldSize: updatedTeam.homeField,
      fieldSizeInfo: getFieldSizeInfo((updatedTeam.homeField || "standard").toLowerCase() as any),
    });
  } catch (error) {
    console.error("Error updating field size:", error);
    res.status(500).json({ error: "Failed to update field size" });
  }
});

// Update team's tactical focus (can be changed before any match)
router.post("/update-tactical-focus", requireAuth, async (req: any, res) => {
  try {
    const { tacticalFocus } = req.body;
    
    if (!["balanced", "all_out_attack", "defensive_wall"].includes(tacticalFocus)) {
      return res.status(400).json({ error: "Invalid tactical focus" });
    }

    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    await storage.teams.updateTeam(team.id, { tacticalFocus: tacticalFocus.toUpperCase() });
    
    const updatedTeam = await storage.teams.getTeamById(team.id);
    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found after update" });
    }
    
    res.json({
      message: "Tactical focus updated successfully",
      tacticalFocus: updatedTeam?.tacticalFocus,
      tacticalFocusInfo: getTacticalFocusInfo((updatedTeam?.tacticalFocus || "balanced") as any),
    });
  } catch (error) {
    console.error("Error updating tactical focus:", error);
    res.status(500).json({ error: "Failed to update tactical focus" });
  }
});

// Get all available tactical options with descriptions
router.get("/tactical-options", requireAuth, async (req: any, res) => {
  try {
    res.json({
      fieldSizes: FIELD_SIZE_CONFIG,
      tacticalFoci: TACTICAL_FOCUS_CONFIG,
    });
  } catch (error) {
    console.error("Error fetching tactical options:", error);
    res.status(500).json({ error: "Failed to fetch tactical options" });
  }
});

// Analyze tactical effectiveness for current roster
router.get("/tactical-analysis", requireAuth, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage?.players.getPlayersByTeamId(team.id);
    const staff = await storage.staff.getStaffByTeamId(team.id);
    const headCoach = staff.find((s: any) => s.type === "HEAD_COACH");
    
    // Get proper team camaraderie using the service
    const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());
    
    // Analyze all combinations
    const analyses = [];
    
    for (const fieldSize of Object.keys(FIELD_SIZE_CONFIG)) {
      for (const tacticalFocus of Object.keys(TACTICAL_FOCUS_CONFIG)) {
        const effectiveness = calculateTacticalEffectiveness(
          {
            fieldSize: fieldSize as any,
            tacticalFocus: tacticalFocus as any,
            camaraderie: teamCamaraderie,
            headCoachTactics: headCoach?.motivation || headCoach?.tactics || 50,
            isHomeTeam: true,
          },
          players,
          { homeScore: 0, awayScore: 0, gameTime: 0, maxTime: 1200, currentHalf: 1 }
        );
        
        analyses.push({
          fieldSize,
          tacticalFocus,
          ...effectiveness,
          fieldSizeInfo: getFieldSizeInfo(fieldSize as any),
          tacticalFocusInfo: getTacticalFocusInfo(tacticalFocus as any),
        });
      }
    }
    
    // Sort by overall effectiveness
    analyses.sort((a: any, b: any) => b.overallEffectiveness - a.overallEffectiveness);
    
    res.json({
      currentSetup: {
        fieldSize: team?.fieldSize || "standard",
        tacticalFocus: team?.tacticalFocus || "balanced",
      },
      analyses,
      bestSetup: analyses[0],
    });
  } catch (error) {
    console.error("Error analyzing tactics:", error);
    res.status(500).json({ error: "Failed to analyze tactics" });
  }
});

// Save team formation
router.post("/formation", requireAuth, async (req: any, res) => {
  try {
    const { starters, substitutes, flexSubs } = req.body;
    
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Validate formation data
    if (!Array.isArray(starters)) {
      return res.status(400).json({ error: "Starters array is required" });
    }

    // Validate no duplicate players in starters
    const starterIds = starters.map(p => p.id).filter(Boolean);
    const uniqueStarterIds = new Set(starterIds);
    
    if (starterIds.length !== uniqueStarterIds.size) {
      return res.status(400).json({ error: "Duplicate players not allowed in starting formation" });
    }

    // Validate all players belong to the team
    const allPlayerIds = [
      ...starterIds,
      ...(Array.isArray(substitutes) ? substitutes.map(p => p.id).filter(Boolean) : []),
      ...(Array.isArray(flexSubs) ? flexSubs.map(p => p.id).filter(Boolean) : [])
    ];

    const prisma = await getPrismaClient();
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: team.id, id: { in: allPlayerIds.map(id => parseInt(id)) } }
    });

    if (teamPlayers.length !== allPlayerIds.length) {
      return res.status(400).json({ error: "Some players do not belong to your team" });
    }

    // Save formation data to team record
    const formationData = {
      starters: starters.map(p => ({ id: p.id, position: p.position })),
      substitutes: substitutes || [],
      flexSubs: flexSubs || [],
      updatedAt: new Date().toISOString()
    };

    await storage.teams.updateTeam(team.id, { 
      formation_data: JSON.stringify(formationData) 
    });

    console.log(`✅ [FORMATION] Saved formation for team ${team.name}:`, {
      starters: formationData.starters.length,
      substitutes: formationData.substitutes.length, 
      flexSubs: formationData.flexSubs.length
    });

    res.json({
      success: true,
      message: "Formation saved successfully",
      formation: formationData
    });
  } catch (error) {
    console.error("Error saving formation:", error);
    res.status(500).json({ error: "Failed to save formation" });
  }
});

export default router;