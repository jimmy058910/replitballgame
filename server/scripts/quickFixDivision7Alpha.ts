#!/usr/bin/env node

/**
 * Quick Fix Script for Division 7 Alpha Schedule Regeneration
 * Directly calls the enterprise league management system to resolve missing games
 */

import { LeagueManagementService } from '../services/leagueManagementSystem.js';

async function fixDivision7Alpha() {
  console.log('🚀 Starting Division 7 Alpha quick fix...');
  
  try {
    // Use enterprise system to regenerate full schedule
    const result = await LeagueManagementService.regenerateLeagueSchedule(7, 'alpha', {
      scheduleType: 'FULL',
      currentDay: 1
    });
    
    console.log('✅ SUCCESS: Division 7 Alpha schedule regenerated!');
    console.log(`📊 Results:`, {
      teamsProcessed: result.teamsProcessed,
      gamesGenerated: result.gamesGenerated,
      scheduleType: result.scheduleType,
      gameDays: result.gameDays,
      statisticsUpdated: result.statisticsUpdated,
      auditId: result.auditId
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ FAILED: Division 7 Alpha quick fix failed:', error);
    process.exit(1);
  }
}

// Execute the fix
fixDivision7Alpha();