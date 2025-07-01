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
import exhibitionRoutes from "./exhibitionRoutes";
import notificationRoutes from "./notificationRoutes";
import injuryRoutes from "./injuryRoutes";
import seasonRoutes from "./seasonRoutes";
import { systemRoutes } from "./systemRoutes";
import superuserRoutes from "./superuserRoutes";
import paymentRoutes from "./paymentRoutes";
import adSystemRoutes from "./adSystemRoutes";
import scoutingRoutes from "./scoutingRoutes";
import camaraderieRoutes from "./camaraderieRoutes";

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
  app.use("/api/exhibitions", exhibitionRoutes);
  app.use("/api/notifications", notificationRoutes); // Covers /api/notifications and /api/demo/notifications
  app.use("/api/injuries", injuryRoutes); // Covers /api/injuries, /api/medical-staff, /api/conditioning
  app.use("/api/seasons", seasonRoutes); // Covers /api/seasons, /api/playoffs, /api/contracts, /api/sponsorships
  app.use("/api/season", seasonRoutes); // Frontend calls /api/season/current-cycle
  app.use("/api/system", systemRoutes); // Covers /api/system and /api/server
  app.use("/api/server", systemRoutes); // Covers /api/server endpoints like /api/server/time
  app.use("/api/superuser", superuserRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/ads", adSystemRoutes);
  app.use("/api/scouting", scoutingRoutes); // Covers /api/teams/:teamId/scout and /api/teams/scoutable
  app.use("/api/camaraderie", camaraderieRoutes); // Covers team and player camaraderie management

  // Reminder: The original server/routes.ts also contained helper functions and Stripe init.
  // Stripe init is now in paymentRoutes.ts.
  // Helper functions (calculateTeamPower, createAITeamsForDivision, etc.) were moved
  // into their respective route files temporarily, with TODOs to move them to services.
  // The main `registerRoutes` function from the old file is effectively replaced by this.
  // The old `createServer(app)` is still handled in `server/index.ts`.
}
