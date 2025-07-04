import type { Express } from "express";
import authRoutes from "./authRoutes";
import teamRoutes from "./teamRoutes";
import playerRoutes from "./playerRoutes";
import leagueRoutes from "./leagueRoutes";
import matchRoutes from "./matchRoutes";
import marketplaceRoutes from "./marketplaceRoutes";
import auctionRoutes from "./auctionRoutes";
import storeRoutes from "./storeRoutes";
import stadiumRoutes from "./stadiumRoutes";
import tournamentRoutes from "./tournamentRoutes";
import newTournamentRoutes from "./newTournamentRoutes";
import exhibitionRoutes from "./exhibitionRoutes";
import notificationRoutes from "./notificationRoutes";
import injuryRoutes from "./injuryRoutes";
import injuryStaminaRoutes from "./injuryStaminaRoutes";
import seasonRoutes from "./seasonRoutes";
import { systemRoutes } from "./systemRoutes";
import superuserRoutes from "./superuserRoutes";
import paymentRoutes from "./paymentRoutes";
import adSystemRoutes from "./adSystemRoutes";
import scoutingRoutes from "./scoutingRoutes";
import camaraderieRoutes from "./camaraderieRoutes";
import statsRoutes from "./statsRoutes";
import teamNameRoutes from "./teamNameRoutes";
import paymentHistoryRoutes from "./paymentHistoryRoutes";
import tacticalRoutes from "./tacticalRoutes";
import helpRoutes from "./helpRoutes";
import agingRoutes from "./agingRoutes";
import consumableRoutes from "./consumableRoutes";
import playerSkillsRoutes from "./playerSkillsRoutes";
import dynamicMarketplaceRoutes from "./dynamicMarketplaceRoutes";
import playerAgingRetirementRoutes from "./playerAgingRetirementRoutes";
import { dailyProgressionRoutes } from "./dailyProgressionRoutes";
import stadiumAtmosphereRoutes from "./stadiumAtmosphereRoutes";
import seasonalFlowRoutes from "./seasonalFlowRoutes";
import dailyTournamentRoutes from "./dailyTournamentRoutes";

// This function will be called by server/index.ts to set up all routes.
// It replaces the direct app.use calls that would have been in server/index.ts
// or the single registerRoutes function from the old server/routes.ts.
export function registerAllRoutes(app: Express): void {
  app.use("/api/auth", authRoutes);
  app.use("/api/teams", teamRoutes); // Note: some routes like /api/teams/division/:division were moved to leagueRoutes
  app.use("/api/players", playerRoutes);
  app.use("/api/leagues", leagueRoutes); // This will also cover /api/teams/division/:division if it's there
  app.use("/api/matches", matchRoutes);
  app.use("/api/marketplace", marketplaceRoutes);
  app.use("/api/auctions", auctionRoutes);
  app.use("/api/store", storeRoutes);
  app.use("/api/stadium", stadiumRoutes); // Covers /api/stadium and /api/stadium/revenue
  app.use("/api/tournaments", tournamentRoutes);
  app.use("/api/daily-tournaments", dailyTournamentRoutes);
  app.use("/api/new-tournaments", newTournamentRoutes);
  app.use("/api/exhibitions", exhibitionRoutes);
  app.use("/api/notifications", notificationRoutes); // Covers /api/notifications and /api/demo/notifications
  app.use("/api/injuries", injuryRoutes); // Covers /api/injuries, /api/medical-staff, /api/conditioning
  app.use("/api/injury-stamina", injuryStaminaRoutes); // Covers comprehensive injury & stamina system
  app.use("/api/seasons", seasonRoutes); // Covers /api/seasons, /api/playoffs, /api/contracts, /api/sponsorships
  app.use("/api/season", seasonRoutes); // Frontend calls /api/season/current-cycle
  app.use("/api/system", systemRoutes); // Covers /api/system and /api/server
  app.use("/api/server", systemRoutes); // Covers /api/server endpoints like /api/server/time
  app.use("/api/superuser", superuserRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/ads", adSystemRoutes);
  app.use("/api/scouting", scoutingRoutes); // Covers /api/teams/:teamId/scout and /api/teams/scoutable
  app.use("/api/camaraderie", camaraderieRoutes); // Covers team and player camaraderie management
  app.use("/api/stats", statsRoutes); // Covers comprehensive player and team statistics
  app.use("/api/team-names", teamNameRoutes); // Covers team name validation and suggestions
  app.use("/api/payment-history", paymentHistoryRoutes); // Covers payment transaction history and tracking
  app.use("/api/tactics", tacticalRoutes); // Covers team tactical system and strategy management
  app.use("/api/help", helpRoutes); // Covers help documentation and manual
  app.use("/api/aging", agingRoutes); // Covers player aging system and progression mechanics
  app.use("/api/consumables", consumableRoutes); // Covers consumable system for league game enhancements
  app.use("/api/player-skills", playerSkillsRoutes); // Covers player skills system and progression
  app.use("/api/dynamic-marketplace", dynamicMarketplaceRoutes); // Covers dynamic auction marketplace with bidding
  app.use("/api/player-aging", playerAgingRetirementRoutes); // Covers player aging, progression, and retirement system
  app.use("/api/stadium-atmosphere", stadiumAtmosphereRoutes); // Covers integrated stadium, finance & atmosphere system
  app.use("/api/seasonal-flow", seasonalFlowRoutes); // Covers seasonal flow algorithm for 17-day competitive cycles
  app.use("/api/daily-progression", dailyProgressionRoutes); // Covers daily player progression and development system

  // Reminder: The original server/routes.ts also contained helper functions and Stripe init.
  // Stripe init is now in paymentRoutes.ts.
  // Helper functions (calculateTeamPower, createAITeamsForDivision, etc.) were moved
  // into their respective route files temporarily, with TODOs to move them to services.
  // The main `registerRoutes` function from the old file is effectively replaced by this.
  // The old `createServer(app)` is still handled in `server/index.ts`.
}
