import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { 
  FIELD_SIZE_CONFIG, 
  TACTICAL_FOCUS_CONFIG, 
  canChangeFieldSize, 
  calculateTacticalEffectiveness,
  getFieldSizeInfo,
  getTacticalFocusInfo 
} from "../../shared/tacticalSystem";
import { prisma } from "../db";
import { SeasonalFlowService } from "../services/seasonalFlowService";
import { CamaraderieService } from "../services/camaraderieService";

const router = Router();

// Get team's current formation
router.get("/formation", isAuthenticated, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage.players.getPlayersByTeamId(team.id);
    
    // Get formation from team data - formation data is stored in team record
    const formation = team.formation_data || { starters: [], substitutes: [] };
    
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
router.get("/team-tactics", isAuthenticated, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage.players.getPlayersByTeamId(team.id);
    const staff = await storage.staff.getStaffByTeamId(team.id);
    const headCoach = staff.find((s: any) => s.type === "HEAD_COACH");
    
    // Get current season day to check if field size can be changed
    const currentDay = SeasonalFlowService.getCurrentDay();
    const canChangeField = canChangeFieldSize(currentDay);
    
    const fieldSize = (team.homeField || "standard").toLowerCase() as any;
    const tacticalFocus = (team.tacticalFocus || "balanced").toLowerCase() as any;
    
    // Get proper team camaraderie using the service (filters active roster players only)
    const teamCamaraderie = await CamaraderieService.getTeamCamaraderie(team.id.toString());
    
    const tacticalSetup = {
      fieldSize,
      tacticalFocus,
      canChangeFieldSize: canChangeField,
      fieldSizeInfo: getFieldSizeInfo(fieldSize),
      tacticalFocusInfo: getTacticalFocusInfo(tacticalFocus),
      headCoachTactics: headCoach?.motivationRating || headCoach?.coachingRating || 50,
      teamCamaraderie: teamCamaraderie,
    };

    // Calculate effectiveness
    const effectiveness = calculateTacticalEffectiveness(
      {
        fieldSize,
        tacticalFocus,
        camaraderie: teamCamaraderie,
        headCoachTactics: headCoach?.motivationRating || headCoach?.coachingRating || 50,
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
router.post("/update-field-size", isAuthenticated, async (req: any, res) => {
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
    const currentDay = SeasonalFlowService.getCurrentDay();
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
router.post("/update-tactical-focus", isAuthenticated, async (req: any, res) => {
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
      tacticalFocus: updatedTeam.tacticalFocus,
      tacticalFocusInfo: getTacticalFocusInfo((updatedTeam.tacticalFocus || "balanced") as any),
    });
  } catch (error) {
    console.error("Error updating tactical focus:", error);
    res.status(500).json({ error: "Failed to update tactical focus" });
  }
});

// Get all available tactical options with descriptions
router.get("/tactical-options", isAuthenticated, async (req: any, res) => {
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
router.get("/tactical-analysis", isAuthenticated, async (req: any, res) => {
  try {
    const team = await storage.teams.getTeamByUserId(req.user.claims.sub);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const players = await storage.players.getPlayersByTeamId(team.id);
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
            headCoachTactics: headCoach?.motivationRating || headCoach?.coachingRating || 50,
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
    analyses.sort((a, b) => b.overallEffectiveness - a.overallEffectiveness);
    
    res.json({
      currentSetup: {
        fieldSize: team.fieldSize || "standard",
        tacticalFocus: team.tacticalFocus || "balanced",
      },
      analyses,
      bestSetup: analyses[0],
    });
  } catch (error) {
    console.error("Error analyzing tactics:", error);
    res.status(500).json({ error: "Failed to analyze tactics" });
  }
});

export default router;