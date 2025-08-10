import { Router } from "express";
import { awardsService } from '../services/awardsService.js';
import { isAuthenticated } from '../googleAuth.js';
import { asyncHandler } from "../utils/asyncHandler";
import { requirePermission, Permission } from "../utils/rbac"; // Add Permission enum import

const router = Router();

// Get MVP awards for a player
router.get("/mvp/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const mvpAwards = await awardsService.getPlayerMVPAwards(parseInt(playerId, 10));
  res.json(mvpAwards);
}));

// Get season awards for a player
router.get("/season/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const seasonAwards = await awardsService.getPlayerSeasonAwards(parseInt(playerId, 10));
  res.json(seasonAwards);
}));

// Get all awards for a player (MVP + Season)
router.get("/player/:playerId", isAuthenticated, asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const allAwards = await awardsService.getPlayerAllAwards(parseInt(playerId, 10));
  res.json(allAwards);
}));

// Get team awards
router.get("/team/:teamId", isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const teamAwards = await awardsService.getTeamAwards(parseInt(teamId, 10));
  res.json(teamAwards);
}));

// Get team season history
router.get("/team/:teamId/history", isAuthenticated, asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const history = await awardsService.getTeamSeasonHistory(parseInt(teamId, 10));
  res.json(history);
}));

// Award MVP for a match (admin only)
router.post("/mvp/:matchId", isAuthenticated, requirePermission(Permission.MANAGE_MATCHES), asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const mvpAward = await awardsService.awardMatchMVP(parseInt(matchId, 10));
  res.json(mvpAward);
}));

// Calculate season awards (admin only)
router.post("/season/:seasonId/calculate", isAuthenticated, requirePermission(Permission.MANAGE_SEASONS), asyncHandler(async (req, res) => {
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
router.post("/team/:teamId/history", isAuthenticated, requirePermission(Permission.MANAGE_SEASONS), asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { seasonId, seasonNumber, divisionId } = req.body;
  
  const history = await awardsService.createTeamSeasonHistory(parseInt(teamId, 10), seasonId, seasonNumber, divisionId);
  res.json(history);
}));

export { router as awardsRoutes };