import type { Express } from "express";
// Domain routes (new domain-driven architecture)
import domainRoutes from "../domains";
import authRoutes from "./authRoutes";
import teamRoutes from "./teamRoutes";
import playerRoutes from "./playerRoutes";
import staffRoutes from "./staffRoutes";
import leagueRoutes from "./leagueRoutes";
import matchRoutes from "./matchRoutes";
import marketplaceRoutes from "./marketplaceRoutes";
import auctionRoutes from "./auctionRoutes";
import storeRoutes from "./storeRoutes";
import stadiumRoutes from "./stadiumRoutes";
import tournamentRoutes from "./tournamentRoutes";
import tournamentRewardRoutes from "./tournamentRewardRoutes";
import newTournamentRoutes from "./newTournamentRoutes";
import exhibitionRoutes from "./exhibitionRoutes";
import notificationRoutes from "./notificationRoutes";
import injuryRoutes from "./injuryRoutes";
import injuryStaminaRoutes from "./injuryStaminaRoutes";
import seasonRoutes from "./seasonRoutes";
import inventoryRoutes from "./inventoryRoutes";
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
import enhancedMarketplaceRoutes from "./enhancedMarketplaceRoutes";
import playerAgingRetirementRoutes from "./playerAgingRetirementRoutes";
import { dailyProgressionRoutes } from "./dailyProgressionRoutes";
import stadiumAtmosphereRoutes from "./stadiumAtmosphereRoutes";
import seasonalFlowRoutes from "./seasonalFlowRoutes";
import dailyTournamentRoutes from "./dailyTournamentRoutes";
import contractInitializerRoutes from "./contractInitializerRoutes";
import equipmentRoutes from "./equipmentRoutes";
import tryoutRoutes from "./tryoutRoutes";
import lateSignupRoutes from "./lateSignupRoutes";
import tournamentStatusRoutes from "./tournamentStatusRoutes";
import tournamentFixRoutes from "./tournamentFixRoutes";
import tournamentHistoryRoutes from "./tournamentHistoryRoutes";
import demoRoutes from "./demoRoutes";
import ndaRoutes from "./ndaRoutes";
import worldRoutes from "./worldRoutes";
import leagueMatchesRoutes from "./leagueMatchesRoutes";
import teamTrendsRoutes from "./teamTrendsRoutes";
import dataVisualizationRoutes from "./dataVisualizationRoutes";
import shareableMomentsRoutes from "./shareableMomentsRoutes";
import careerHighlightsRoutes from "./careerHighlightsRoutes";
import referralRoutes from "./referralRoutes";
import criticalAlertsRoutes from "./criticalAlertsRoutes";
import enhancedMatchRoutes from "./enhancedMatchRoutes";
import liveMatchRoutes from "./liveMatchRoutes";
import testRoutes from "./testRoutes";


// This function will be called by server/index.ts to set up all routes.
// It replaces the direct app.use calls that would have been in server/index.ts
// or the single registerRoutes function from the old server/routes.ts.
export function registerAllRoutes(app: Express): void {
  console.log('🔍 [registerAllRoutes] Starting route registration...');
  
  // Mount domain routes (new architecture)
  app.use("/api/v2", domainRoutes);
  console.log('🔍 [registerAllRoutes] Registered /api/v2 routes');
  
  // Legacy routes (existing system)
  app.use("/api/auth", authRoutes);
  console.log('🔍 [registerAllRoutes] Registered /api/auth routes');
  
  app.use("/api/teams", teamRoutes); // Note: some routes like /api/teams/division/:division were moved to leagueRoutes
  console.log('🔍 [registerAllRoutes] Registered /api/teams routes');
  app.use("/api/teams", teamTrendsRoutes); // Enhanced team trends for product-led growth data storytelling
  app.use("/api/players", playerRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/leagues", leagueRoutes); // This will also cover /api/teams/division/:division if it's there
  app.use("/api/matches", matchRoutes);
  app.use("/api/enhanced-matches", enhancedMatchRoutes); // Enhanced match engine API endpoints
  app.use("/api/live-matches", liveMatchRoutes); // Live match engine with WebSocket support
  app.use("/api/team-matches", leagueMatchesRoutes); // League matches for team recent matches display
  app.use("/api/marketplace", marketplaceRoutes);
  // Add marketplace stats alias
  app.use("/api/marketplace", dynamicMarketplaceRoutes);
  // Enhanced marketplace with anti-sniping and escrow system
  app.use("/api/enhanced-marketplace", enhancedMarketplaceRoutes);
  app.use("/api/auctions", auctionRoutes);
  app.use("/api/store", storeRoutes);
  app.use("/api/stadium", stadiumRoutes); // Covers /api/stadium and /api/stadium/revenue
  app.use("/api/tournaments", tournamentRoutes);
  app.use("/api/tournament-rewards", tournamentRewardRoutes);
  app.use("/api/daily-tournaments", dailyTournamentRoutes);
  app.use("/api/new-tournaments", newTournamentRoutes);
  app.use("/api/exhibitions", exhibitionRoutes);
  app.use("/api/notifications", notificationRoutes); // Covers /api/notifications and /api/demo/notifications
  app.use("/api/injuries", injuryRoutes); // Covers /api/injuries, /api/medical-staff, /api/conditioning
  app.use("/api/injury-stamina", injuryStaminaRoutes); // Covers comprehensive injury & stamina system
  app.use("/api/seasons", seasonRoutes); // Covers /api/seasons, /api/playoffs, /api/contracts, /api/sponsorships
  app.use("/api/inventory", inventoryRoutes); // Covers team inventory management
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
  app.use("/api/tactical", tacticalRoutes); // Covers /api/tactical/formation endpoint
  app.use("/api/help", helpRoutes); // Covers help documentation and manual
  app.use("/api/aging", agingRoutes); // Covers player aging system and progression mechanics
  app.use("/api/world", worldRoutes); // Covers global rankings, world statistics, and hall of fame
  app.use("/api/consumables", consumableRoutes); // Covers consumable system for league game enhancements
  app.use("/api/player-skills", playerSkillsRoutes); // Covers player skills system and progression
  app.use("/api/dynamic-marketplace", dynamicMarketplaceRoutes); // Covers dynamic auction marketplace with bidding
  app.use("/api/player-aging", playerAgingRetirementRoutes); // Covers player aging, progression, and retirement system
  app.use("/api/stadium-atmosphere", stadiumAtmosphereRoutes); // Covers integrated stadium, finance & atmosphere system
  app.use("/api/seasonal-flow", seasonalFlowRoutes); // Covers seasonal flow algorithm for 17-day competitive cycles
  app.use("/api/daily-progression", dailyProgressionRoutes); // Covers daily player progression and development system
  app.use("/api/contracts", contractInitializerRoutes); // Covers contract initialization and management
  app.use("/api/equipment", equipmentRoutes); // Equipment management
  app.use("/api/tryouts", tryoutRoutes); // Covers tryout system and candidate generation
  app.use("/api/late-signup", lateSignupRoutes);
  app.use("/api/tournament-status", tournamentStatusRoutes); // Covers late signup system for shortened Division 8 seasons
  app.use("/api/tournament-fix", tournamentFixRoutes); // Emergency tournament fix endpoints
  app.use("/api/tournament-history", tournamentHistoryRoutes); // Tournament history for completed tournaments
  app.use("/api/demo", demoRoutes); // Demo endpoints using real match simulation
  app.use("/api/nda", ndaRoutes); // NDA acceptance endpoints for pre-alpha testing
  app.use("/api/referrals", referralRoutes); // User referral system and tracking
  app.use("/api/data-viz", dataVisualizationRoutes); // Phase 3 Product-Led Growth Framework data visualization
  app.use("/api/shareable-moments", shareableMomentsRoutes); // Phase 4 Product-Led Growth Framework shareable moments (legacy)
  app.use("/api/career-highlights", careerHighlightsRoutes); // Enhanced Career Highlights system with expanded categories
  app.use("/api/alerts", criticalAlertsRoutes); // Team HQ critical alerts system for injuries, stamina, and contracts
  app.use("/api", testRoutes); // Test endpoints for system validation

  // Add missing /api/me endpoint that frontend expects (redirect to auth/user)
  app.get("/api/me", (req, res) => {
    // Forward to the actual auth endpoint
    res.redirect(307, "/api/auth/user");
  });

  // Reminder: The original server/routes.ts also contained helper functions and Stripe init.
  // Stripe init is now in paymentRoutes.ts.
  // Helper functions (calculateTeamPower, createAITeamsForDivision, etc.) were moved
  // into their respective route files temporarily, with TODOs to move them to services.
  // The main `registerRoutes` function from the old file is effectively replaced by this.
  // The old `createServer(app)` is still handled in `server/index.ts`.
}
