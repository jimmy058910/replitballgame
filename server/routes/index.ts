import type { Express } from "express";
// Domain routes (new domain-driven architecture) - TEMPORARILY DISABLED FOR STEP 4 FIX
// REASON: Domain imports failing in production due to complex import chains
// Will re-enable after Step 4 infrastructure is stable
// import domainRoutes from "../domains/index.js";
import authRoutes from "./authRoutes.js";
import teamRoutes from "./teamRoutes.js";
import playerRoutes from "./playerRoutes.js";
import staffRoutes from "./staffRoutes.js";
import leagueRoutes from "./leagueRoutes.js";
import matchRoutes from "./matchRoutes.js";
import marketplaceRoutes from "./marketplaceRoutes.js";
import auctionRoutes from "./auctionRoutes.js";
import storeRoutes from "./storeRoutes.js";
import stadiumRoutes from "./stadiumRoutes.js";
import tournamentRoutes from "./tournamentRoutes.js";
import tournamentRewardRoutes from "./tournamentRewardRoutes.js";
import newTournamentRoutes from "./newTournamentRoutes.js";
import exhibitionRoutes from "./exhibitionRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import injuryRoutes from "./injuryRoutes.js";
import injuryStaminaRoutes from "./injuryStaminaRoutes.js";
import seasonRoutes from "./seasonRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import { systemRoutes } from "./systemRoutes.js";
import superuserRoutes from "./superuserRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import adSystemRoutes from "./adSystemRoutes.js";
import scoutingRoutes from "./scoutingRoutes.js";
import camaraderieRoutes from "./camaraderieRoutes.js";
import statsRoutes from "./statsRoutes.js";
import teamNameRoutes from "./teamNameRoutes.js";
import paymentHistoryRoutes from "./paymentHistoryRoutes.js";
import tacticalRoutes from "./tacticalRoutes.js";
import helpRoutes from "./helpRoutes.js";
import agingRoutes from "./agingRoutes.js";
import consumableRoutes from "./consumableRoutes.js";
import playerSkillsRoutes from "./playerSkillsRoutes.js";
import dynamicMarketplaceRoutes from "./dynamicMarketplaceRoutes.js";
import enhancedMarketplaceRoutes from "./enhancedMarketplaceRoutes.js";
import playerAgingRetirementRoutes from "./playerAgingRetirementRoutes.js";
import { dailyProgressionRoutes } from "./dailyProgressionRoutes.js";
import stadiumAtmosphereRoutes from "./stadiumAtmosphereRoutes.js";
import seasonalFlowRoutes from "./seasonalFlowRoutes.js";
import dailyTournamentRoutes from "./dailyTournamentRoutes.js";
import contractInitializerRoutes from "./contractInitializerRoutes.js";
import equipmentRoutes from "./equipmentRoutes.js";
import tryoutRoutes from "./tryoutRoutes.js";
import lateSignupRoutes from "./lateSignupRoutes.js";
import tournamentStatusRoutes from "./tournamentStatusRoutes.js";
import tournamentFixRoutes from "./tournamentFixRoutes.js";
import tournamentHistoryRoutes from "./tournamentHistoryRoutes.js";
import ndaRoutes from "./ndaRoutes.js";
import worldRoutes from "./worldRoutes.js";
import leagueMatchesRoutes from "./leagueMatchesRoutes.js";
import { manualStandingsFixRouter } from "./manualStandingsFix.js";
import teamTrendsRoutes from "./teamTrendsRoutes.js";
import databaseTestRoutes from "./database-test.js";
import debugEnvRoutes from "./debug-env.js";
import dataVisualizationRoutes from "./dataVisualizationRoutes.js";
import shareableMomentsRoutes from "./shareableMomentsRoutes.js";
import careerHighlightsRoutes from "./careerHighlightsRoutes.js";
import referralRoutes from "./referralRoutes.js";
import criticalAlertsRoutes from "./criticalAlertsRoutes.js";
import enhancedMatchRoutes from "./enhancedMatchRoutes.js";
import testRoutes from "./testRoutes.js";
import cacheRoutes from "./cacheRoutes.js";
import quickCacheTest from "./quickCacheTest.js";
import testAutomationRoutes from "./testAutomationRoutes.js";
import resetRoutes from "./resetRoutes.js";
import lateRegistrationRoutes from "./lateRegistrationRoutes.js";
import manualStandingsComplete from "./manualStandingsComplete.js";
import cleanupTournamentRoutes from "./cleanupTournamentRoutes.js";
import simpleCleanupRoutes from "./simpleCleanupRoutes.js";


// This function will be called by server/index.ts to set up all routes.
// It replaces the direct app.use calls that would have been in server/index.ts
// or the single registerRoutes function from the old server/routes.ts.
export async function registerAllRoutes(app: Express): Promise<void> {
  console.log('🔍 [registerAllRoutes] Starting route registration...');
  
  // CRITICAL FIX: Add API route middleware precedence to prevent Vite interference
  app.use('/api/*', (req: any, res: any, next: any) => {
    // Override Vite's Content-Type at response time, not request time
    const originalJson = res.json;
    res.json = function(obj: any) {
      res.setHeader('Content-Type', 'application/json');
      return originalJson.call(this, obj);
    };
    
    const originalSend = res.send;  
    res.send = function(body: any) {
      if (typeof body === 'object') {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalSend.call(this, body);
    };
    
    next();
  });
  
  // Mount domain routes (new architecture) - TEMPORARILY DISABLED FOR STEP 4 DEPLOYMENT FIX
  // app.use("/api/v2", domainRoutes);
  // Add basic /api/v2 test endpoint to ensure API routing works
  app.get("/api/v2", (req: any, res: any) => {
    res.json({
      success: true,
      message: "Step 4 API routing is working!",
      timestamp: new Date().toISOString(),
      version: "Step 4 Deployment Test"
    });
  });
  console.log('🔍 [registerAllRoutes] Registered /api/v2 routes');
  
  // Legacy routes (existing system) - CRITICAL: Register teamRoutes with higher priority
  app.use("/api/auth", authRoutes);
  console.log('🔍 [registerAllRoutes] Registered /api/auth routes');
  
  console.log('🔍 [registerAllRoutes] About to dynamically import teamRoutes...');
  try {
    const teamRoutesModule = await import("./teamRoutes.js");
    const teamRoutesRouter = teamRoutesModule.default;
    console.log('🔍 [registerAllRoutes] teamRoutes imported successfully, type:', typeof teamRoutesRouter);
    
    // CRITICAL FIX: Register specific routes first to prevent conflicts
    app.use("/api/teams", teamRoutesRouter); 
    console.log('✅ [registerAllRoutes] Registered /api/teams routes successfully');
    
    // Add explicit route logging for debugging
    app.use('/api/teams/*', (req: any, res: any, next: any) => {
      console.log(`🔍 [ROUTE DEBUG] Handling ${req.method} ${req.originalUrl}`);
      next();
    });
    
  } catch (teamImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to import teamRoutes:', teamImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', teamImportError.stack);
  }
  // REMOVED DUPLICATE: app.use("/api/teams", teamTrendsRoutes); - Causes route conflict with standings endpoint
  app.use("/api/players", playerRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/leagues", leagueRoutes); // This will also cover /api/teams/division/:division if it's there
  app.use("/api/team-trends", teamTrendsRoutes); // Enhanced team trends for product-led growth data storytelling (moved from /api/teams to avoid conflict)
  app.use("/api/matches", matchRoutes);
  app.use("/api/enhanced-matches", enhancedMatchRoutes); // Enhanced match engine API endpoints
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
  app.use("/api/reset", resetRoutes); // Schedule reset and regeneration endpoints  
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
  console.log('🔍 [registerAllRoutes] About to register late signup routes...');
  try {
    console.log('🔍 [registerAllRoutes] lateSignupRoutes type:', typeof lateSignupRoutes);
    console.log('🔍 [registerAllRoutes] lateSignupRoutes:', lateSignupRoutes?.constructor?.name);
    app.use("/api/late-signup", lateSignupRoutes);
    app.use("/api/late-registration", lateRegistrationRoutes);
    console.log('✅ [registerAllRoutes] Late signup and registration routes registered successfully');
  } catch (error: any) {
    console.error('❌ [registerAllRoutes] Failed to register late signup routes:', error.message);
  }

  // Admin routes for testing and manual triggers
  console.log('🔍 [registerAllRoutes] About to register admin routes...');
  try {
    const adminRoutesModule = await import("./adminRoutes.js");
    const adminRoutes = adminRoutesModule.default;
    app.use("/api/admin", adminRoutes);
    console.log('✅ [registerAllRoutes] Admin routes registered successfully');
  } catch (adminImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to import admin routes:', adminImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', adminImportError.stack);
  }
  app.use("/api/tournament-status", tournamentStatusRoutes); // Covers late signup system for shortened Division 8 seasons
  app.use("/api/tournament-fix", tournamentFixRoutes); // Emergency tournament fix endpoints
  app.use("/api/tournament-history", tournamentHistoryRoutes); // Tournament history for completed tournaments
  app.use("/api/nda", ndaRoutes); // NDA acceptance endpoints for pre-alpha testing
  app.use("/api/referrals", referralRoutes); // User referral system and tracking
  app.use("/api/data-viz", dataVisualizationRoutes); // Phase 3 Product-Led Growth Framework data visualization
  app.use("/api/shareable-moments", shareableMomentsRoutes); // Phase 4 Product-Led Growth Framework shareable moments (legacy)
  app.use("/api/career-highlights", careerHighlightsRoutes); // Enhanced Career Highlights system with expanded categories
  app.use("/api/alerts", criticalAlertsRoutes); // Team HQ critical alerts system for injuries, stamina, and contracts
  app.use("/api", databaseTestRoutes); // Database connectivity test endpoint
  app.use("/api", debugEnvRoutes); // Debug environment variables endpoint
  app.use("/api", testRoutes); // Test endpoints for system validation
  app.use("/api/test-automation", testAutomationRoutes); // Test automation trigger endpoints
  app.use("/api/admin", resetRoutes); // Admin reset and scheduling functionality
  app.use("/api/cache", cacheRoutes); // Cache management and statistics
  app.use("/api/cache-test", quickCacheTest); // Cache testing and demonstration
  app.use("/api/manual-standings", manualStandingsComplete); // Complete comprehensive standings fix
  app.use("/api/tournament-cleanup", cleanupTournamentRoutes); // Emergency cleanup for stuck tournament registrations
  app.use("/api/simple-cleanup", simpleCleanupRoutes); // Simple cleanup using working Prisma patterns

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
