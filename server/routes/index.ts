import type { Express } from "express";
import authRoutes from "./authRoutes.js";
import modularTeamRoutes from "./teams/index.js";
import modularLeagueRoutes from "./leagues/index.js";
// CONSOLIDATED: All player routes now in enhancedPlayerRoutes.js
import enhancedPlayerRoutes from "./enhancedPlayerRoutes.js";
import staffRoutes from "./staffRoutes.js";
// CONSOLIDATED: All league routes now in enhancedLeagueRoutes.js
import enhancedLeagueRoutes from "./enhancedLeagueRoutes.js";
// CONSOLIDATED: matchRoutes moved to enhancedMatchRoutes.js
// REMOVED: import marketplaceRoutes from "./marketplaceRoutes.js"; (unused - replaced by dynamicMarketplaceRoutes)
import auctionRoutes from "./auctionRoutes.js";
// CONSOLIDATED: storeRoutes moved to enhancedFinanceRoutes.js
// CONSOLIDATED: Stadium routes now in enhancedStadiumRoutes.js
import enhancedStadiumRoutes from "./enhancedStadiumRoutes.js";
// CONSOLIDATED: All tournament routes now in enhancedTournamentRoutes.js
import enhancedTournamentRoutes from "./enhancedTournamentRoutes.js";
import exhibitionRoutes from "./exhibitionRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
// CONSOLIDATED: Injury routes now in enhancedInjuryRoutes.js
import enhancedInjuryRoutes from "./enhancedInjuryRoutes.js";
// PHASE 3H: Consolidated finance system (paymentRoutes + paymentHistoryRoutes + adSystemRoutes + storeRoutes)
import enhancedFinanceRoutes from "./enhancedFinanceRoutes.js";
// CONSOLIDATED: All season routes now in enhancedSeasonRoutes.js
import enhancedSeasonRoutes from "./enhancedSeasonRoutes.js";
// CONSOLIDATED: Inventory, equipment, consumable routes now in enhancedInventoryRoutes.js
import enhancedInventoryRoutes from "./enhancedInventoryRoutes.js";
import { systemRoutes } from "./systemRoutes.js";
import superuserRoutes from "./superuserRoutes.js";
// CONSOLIDATED: paymentRoutes moved to enhancedFinanceRoutes.js
// CONSOLIDATED: adSystemRoutes moved to enhancedFinanceRoutes.js
import scoutingRoutes from "./scoutingRoutes.js";
import camaraderieRoutes from "./camaraderieRoutes.js";
import statsRoutes from "./statsRoutes.js";
import teamNameRoutes from "./teamNameRoutes.js";
// CONSOLIDATED: paymentHistoryRoutes moved to enhancedFinanceRoutes.js
import tacticalRoutes from "./tacticalRoutes.js";
import helpRoutes from "./helpRoutes.js";
import agingRoutes from "./agingRoutes.js";
// CONSOLIDATED: consumableRoutes moved to enhancedInventoryRoutes.js
// CONSOLIDATED: playerSkillsRoutes moved to enhancedPlayerRoutes.js
// REMOVED: import dynamicMarketplaceRoutes from "./dynamicMarketplaceRoutes.js"; (consolidated into enhancedMarketplaceRoutes)
import enhancedMarketplaceRoutes from "./enhancedMarketplaceRoutes.js";
// CONSOLIDATED: playerAgingRetirementRoutes moved to enhancedPlayerRoutes.js
import { dailyProgressionRoutes } from "./dailyProgressionRoutes.js";
// CONSOLIDATED: stadiumAtmosphereRoutes moved to enhancedStadiumRoutes.js
// CONSOLIDATED: seasonalFlowRoutes moved to enhancedSeasonRoutes.js
// CONSOLIDATED: dailyTournamentRoutes moved to enhancedTournamentRoutes.js
import contractInitializerRoutes from "./contractInitializerRoutes.js";
// Development API for In-Memoria MCP integration and insights
import developmentRoutes from "./developmentRoutes.js";
// CONSOLIDATED: equipmentRoutes moved to enhancedInventoryRoutes.js
import tryoutRoutes from "./tryoutRoutes.js";
import lateSignupRoutes from "./lateSignupRoutes.js";
// CONSOLIDATED: tournamentStatusRoutes, tournamentFixRoutes, tournamentHistoryRoutes moved to enhancedTournamentRoutes.js
import ndaRoutes from "./ndaRoutes.js";
import worldRoutes from "./worldRoutes.js";
// CONSOLIDATED: leagueMatchesRoutes moved to enhancedLeagueRoutes.js
import teamTrendsRoutes from "./teamTrendsRoutes.js";
import databaseTestRoutes from "./database-test.js";
import debugEnvRoutes from "./debug-env.js";
import dataVisualizationRoutes from "./dataVisualizationRoutes.js";
import shareableMomentsRoutes from "./shareableMomentsRoutes.js";
import careerHighlightsRoutes from "./careerHighlightsRoutes.js";
import referralRoutes from "./referralRoutes.js";
import criticalAlertsRoutes from "./criticalAlertsRoutes.js";
// PHASE 3I: Consolidated match system (matchRoutes + enhancedMatchRoutes)
import enhancedMatchRoutes from "./enhancedMatchRoutes.js";
import testRoutes from "./testRoutes.js";
import cacheRoutes from "./cacheRoutes.js";
import quickCacheTest from "./quickCacheTest.js";
import testAutomationRoutes from "./testAutomationRoutes.js";
import resetRoutes from "./resetRoutes.js";
import lateRegistrationRoutes from "./lateRegistrationRoutes.js";
import manualStandingsComplete from "./manualStandingsComplete.js";
// CONSOLIDATED: cleanupTournamentRoutes moved to enhancedTournamentRoutes.js
import simpleCleanupRoutes from "./simpleCleanupRoutes.js";
import integrityRoutes from "./integrityRoutes.js";
import timeFixRoutes from "./timeFixRoutes.js";
import { devRoutes } from "./development/devRoutes.js";
import { emergencyRoutes } from "./admin/emergencyRoutes.js";
import gameSystemsRoutes from "./gameSystemsRoutes.js";
import type { Player, Team, Stadium, League } from '@shared/types/models';



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
  
  // API v2 endpoint placeholder for future use
  app.get("/api/v2", (req: any, res: any) => {
    res.json({
      success: true,
      message: "API v2 endpoint active",
      timestamp: new Date().toISOString()
    });
  });
  console.log('🔍 [registerAllRoutes] Registered /api/v2 routes');
  
  // Legacy routes (existing system) - CRITICAL: Register teamRoutes with higher priority
  app.use("/api/auth", authRoutes);
  console.log('🔍 [registerAllRoutes] Registered /api/auth routes');
  
  console.log('🔍 [registerAllRoutes] Registering modular team routes...');
  try {
    // Use new modular team structure (replaces monolithic teamRoutes.ts)
    app.use("/api/teams", modularTeamRoutes); 
    console.log('✅ [registerAllRoutes] Registered modular /api/teams routes successfully');
    
    // Add explicit route logging for debugging
    app.use('/api/teams/*', (req: any, res: any, next: any) => {
      console.log(`🔍 [ROUTE DEBUG] Handling ${req.method} ${req.originalUrl}`);
      next();
    });
    
  } catch (teamImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to import modular team routes:', teamImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', teamImportError.stack);
  }
  // REMOVED DUPLICATE: app.use("/api/teams", teamTrendsRoutes); - Causes route conflict with standings endpoint
  // CONSOLIDATED PLAYER ROUTES: All player functionality in one enhanced system
  app.use("/api/players", enhancedPlayerRoutes);
  app.use("/api/staff", staffRoutes);
  // MODULAR LEAGUE ROUTES: New modular league system with standings and schedules
  console.log('🔍 [registerAllRoutes] Registering modular league routes...');
  try {
    app.use("/api/leagues", modularLeagueRoutes); // Modular league operations, standings, schedules
    console.log('✅ [registerAllRoutes] Registered modular /api/leagues routes successfully');
  } catch (leagueImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to import modular league routes:', leagueImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', leagueImportError.stack);
  }
  // Backward compatibility paths - all route to enhancedLeagueRoutes
  app.use("/api/league-management", enhancedLeagueRoutes); // Enterprise-grade league management (admin operations)
  app.use("/api/team-matches", enhancedLeagueRoutes); // League matches for team recent matches display
  app.use("/api/team-trends", teamTrendsRoutes); // Enhanced team trends for product-led growth data storytelling (moved from /api/teams to avoid conflict)
  // CONSOLIDATED: Match system now in enhancedMatchRoutes
  app.use("/api/matches", enhancedMatchRoutes);
  app.use("/api/enhanced-matches", enhancedMatchRoutes); // Backward compatibility for enhanced match routes
  // Consolidated marketplace - Enhanced marketplace handles all functionality
  app.use("/api/marketplace", enhancedMarketplaceRoutes);
  // Enhanced marketplace with anti-sniping and escrow system (same routes as /api/marketplace for compatibility)
  app.use("/api/enhanced-marketplace", enhancedMarketplaceRoutes);
  app.use("/api/auctions", auctionRoutes);
  // CONSOLIDATED: Store system now in enhancedFinanceRoutes
  app.use("/api/store", enhancedFinanceRoutes);
  app.use("/api/stadium", enhancedStadiumRoutes); // Consolidated stadium and atmosphere routes
  // CONSOLIDATED TOURNAMENT ROUTES: All tournament functionality in one enhanced system
  app.use("/api/tournaments", enhancedTournamentRoutes);
  // Backward compatibility paths - all route to enhancedTournamentRoutes
  app.use("/api/tournament-rewards", enhancedTournamentRoutes);
  app.use("/api/daily-tournaments", enhancedTournamentRoutes);
  app.use("/api/new-tournaments", enhancedTournamentRoutes);
  app.use("/api/exhibitions", exhibitionRoutes);
  app.use("/api/notifications", notificationRoutes); // Covers /api/notifications and /api/demo/notifications
  app.use("/api/injuries", enhancedInjuryRoutes); // Consolidated injury and stamina management
  app.use("/api/injury-stamina", enhancedInjuryRoutes); // Backward compatibility for stamina routes
  // CONSOLIDATED SEASON ROUTES: All season functionality in one enhanced system
  app.use("/api/seasons", enhancedSeasonRoutes); // Covers seasons, playoffs, contracts, sponsorships
  app.use("/api/inventory", enhancedInventoryRoutes); // Consolidated inventory, equipment, consumables
  app.use("/api/season", enhancedSeasonRoutes); // Frontend calls /api/season/current-cycle
  app.use("/api/system", systemRoutes); // Covers /api/system and /api/server
  app.use("/api/server", systemRoutes); // Covers /api/server endpoints like /api/server/time
  app.use("/api/superuser", superuserRoutes);
  // CONSOLIDATED: Payment and ad systems now in enhancedFinanceRoutes
  app.use("/api/payments", enhancedFinanceRoutes);
  app.use("/api/ads", enhancedFinanceRoutes);
  app.use("/api/reset", resetRoutes); // Schedule reset and regeneration endpoints  
  app.use("/api/scouting", scoutingRoutes); // Covers /api/teams/:teamId/scout and /api/teams/scoutable
  app.use("/api/camaraderie", camaraderieRoutes); // Covers team and player camaraderie management
  app.use("/api/stats", statsRoutes); // Covers comprehensive player and team statistics
  app.use("/api/team-names", teamNameRoutes); // Covers team name validation and suggestions
  // CONSOLIDATED: Payment history now in enhancedFinanceRoutes
  app.use("/api/payment-history", enhancedFinanceRoutes); // Covers payment transaction history and tracking
  app.use("/api/tactics", tacticalRoutes); // Covers team tactical system and strategy management
  app.use("/api/tactical", tacticalRoutes); // Covers /api/tactical/formation endpoint
  app.use("/api/help", helpRoutes); // Covers help documentation and manual
  app.use("/api/aging", agingRoutes); // Covers player aging system and progression mechanics
  app.use("/api/world", worldRoutes); // Covers global rankings, world statistics, and hall of fame
  app.use("/api/consumables", enhancedInventoryRoutes); // Backward compatibility for consumables
  // CONSOLIDATED: Player skills now in enhancedPlayerRoutes at /api/players
  app.use("/api/player-skills", enhancedPlayerRoutes); // Backward compatibility
  // REMOVED: Duplicate dynamicMarketplaceRoutes registration (already mounted at /api/marketplace above)
  // CONSOLIDATED: Player aging now in enhancedPlayerRoutes at /api/players
  app.use("/api/player-aging", enhancedPlayerRoutes); // Backward compatibility
  app.use("/api/stadium-atmosphere", enhancedStadiumRoutes); // Backward compatibility for atmosphere routes
  // CONSOLIDATED: Seasonal flow now in enhancedSeasonRoutes
  app.use("/api/seasonal-flow", enhancedSeasonRoutes); // Backward compatibility for seasonal flow
  app.use("/api/daily-progression", dailyProgressionRoutes); // Covers daily player progression and development system
  app.use("/api/game-systems", gameSystemsRoutes); // Comprehensive game mechanics: TAP, Power, Staff Effects, Anti-Pay-to-Win
  app.use("/api/contracts", contractInitializerRoutes); // Covers contract initialization and management
  app.use("/api/equipment", enhancedInventoryRoutes); // Backward compatibility for equipment
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

  // Development routes for Oakland Cougars and dev fixtures (development environment only)
  console.log('🔍 [registerAllRoutes] About to register development routes...');
  try {
    app.use("/api/dev", devRoutes);
    console.log('✅ [registerAllRoutes] Development routes registered successfully');
  } catch (devImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to register development routes:', devImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', devImportError.stack);
  }

  // Emergency administrative routes (heavily protected)
  console.log('🔍 [registerAllRoutes] About to register emergency admin routes...');
  try {
    app.use("/api/admin/emergency", emergencyRoutes);
    console.log('✅ [registerAllRoutes] Emergency admin routes registered successfully');
  } catch (devImportError: any) {
    console.error('❌ [registerAllRoutes] Failed to register development routes:', devImportError.message);
    console.error('❌ [registerAllRoutes] Error stack:', devImportError.stack);
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
  // CONSOLIDATED: All tournament management endpoints now in enhancedTournamentRoutes
  app.use("/api/tournament-status", enhancedTournamentRoutes); // Tournament status & match management
  app.use("/api/tournament-fix", enhancedTournamentRoutes); // Emergency tournament fixes
  app.use("/api/tournament-history", enhancedTournamentRoutes); // Tournament history
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
  app.use("/api/development", developmentRoutes); // In-Memoria MCP integration and development insights
  app.use("/api/manual-standings", manualStandingsComplete); // Complete comprehensive standings fix
  app.use("/api/tournament-cleanup", enhancedTournamentRoutes); // Tournament cleanup & maintenance
  app.use("/api/simple-cleanup", simpleCleanupRoutes); // Simple cleanup using working Prisma patterns
  app.use("/api/integrity", integrityRoutes); // Data integrity management and team statistics synchronization
  app.use("/api/time-fix", timeFixRoutes); // Critical Alpha Readiness: Fix all game times to proper EDT

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
