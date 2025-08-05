/**
 * CACHE-ENABLED ROUTE INTEGRATION
 * Apply caching to specific high-traffic routes for compute optimization
 */

import { Router } from 'express';
import { cacheResponse } from './cacheMiddleware';

// Team routes with caching
export function applyCacheToTeamRoutes(router: Router): Router {
  // Cache team data for 5 minutes
  router.use(['/my', '/my/players', '/my/staff'], cacheResponse(300));
  
  // Cache division/league data for 10 minutes  
  router.use(['/division/:division'], cacheResponse(600));
  
  return router;
}

// Player routes with caching
export function applyCacheToPlayerRoutes(router: Router): Router {
  // Cache player lists for 3 minutes
  router.use(['/:teamId/players'], cacheResponse(180));
  
  return router;
}

// League routes with caching
export function applyCacheToLeagueRoutes(router: Router): Router {
  // Cache league standings for 8 minutes
  router.use(['/standings', '/divisions'], cacheResponse(480));
  
  return router;
}

// Season data caching
export function applyCacheToSeasonRoutes(router: Router): Router {
  // Cache current season data for 15 minutes
  router.use(['/current-cycle'], cacheResponse(900));
  
  return router;
}

// General cache settings for commonly accessed endpoints
export const HIGH_TRAFFIC_CACHE_SETTINGS = {
  userProfile: 300,     // 5 minutes
  teamData: 300,        // 5 minutes  
  playerLists: 180,     // 3 minutes
  leagueStandings: 480, // 8 minutes
  seasonInfo: 900,      // 15 minutes
  matchHistory: 600     // 10 minutes
};