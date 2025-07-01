import { Router } from "express";
import { awardsService } from "../services/awardsService";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../utils/asyncHandler";
import { requirePermission } from "../utils/rbac";

const router = Router();

// Get MVP awards for a player
router.get("/mvp/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const mvpAwards = await awardsService.getPlayerMVPAwards(playerId);
  res.json(mvpAwards);
}));

// Get season awards for a player
router.get("/season/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const seasonAwards = await awardsService.getPlayerSeasonAwards(playerId);
  res.json(seasonAwards);
}));

// Get all awards for a player (MVP + Season)
router.get("/player/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const allAwards = await awardsService.getPlayerAllAwards(playerId);
  res.json(allAwards);
}));

// Get team awards
router.get("/team/:teamId", isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const teamAwards = await awardsService.getTeamAwards(teamId);
  res.json(teamAwards);
}));

// Get team season history
router.get("/team/:teamId/history", isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const history = await awardsService.getTeamSeasonHistory(teamId);
  res.json(history);
}));

// Award MVP for a match (admin only)
router.post("/mvp/:matchId", isAuthenticated, requirePermission("manage_matches"), asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const mvpAward = await awardsService.awardMatchMVP(matchId);
  res.json(mvpAward);
}));

// Calculate season awards (admin only)
router.post("/season/:seasonId/calculate", isAuthenticated, requirePermission("manage_seasons"), asyncHandler(async (req, res) => {
  const { seasonId } = req.params;
  
  const [seasonAwards, teamAwards] = await Promise.all([
    awardsService.calculateSeasonAwards(seasonId),
    awardsService.calculateTeamAwards(seasonId)
  ]);
  
  res.json({
    seasonAwards,
    teamAwards,
    message: `Calculated ${seasonAwards.length} season awards and ${teamAwards.length} team awards`
  });
}));

// Create team season history (admin only)
router.post("/team/:teamId/history", isAuthenticated, requirePermission("manage_seasons"), asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { seasonId, seasonNumber, divisionId } = req.body;
  
  const history = await awardsService.createTeamSeasonHistory(teamId, seasonId, seasonNumber, divisionId);
  res.json(history);
}));

export { router as awardsRoutes };