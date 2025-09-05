/**
 * Quick script to fix Oakland Cougars statistics using TeamStatisticsIntegrityService
 * This will sync all team statistics with actual game results
 */

import { getPrismaClient } from '../database.js';
import { TeamStatisticsIntegrityService } from '../services/teamStatisticsIntegrityService.js';
import logger from '../utils/logger.js';

async function fixOaklandCougarsStats() {
  console.log('🔧 Starting Oakland Cougars statistics fix...');
  
  try {
    const prisma = await getPrismaClient();
    
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: { contains: 'Oakland Cougars' } },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      }
    });
    
    if (!oaklandCougars) {
      console.error('❌ Oakland Cougars not found in database');
      return;
    }
    
    console.log('✅ Found Oakland Cougars:', oaklandCougars);
    
    // Run comprehensive statistics synchronization
    const result = await TeamStatisticsIntegrityService.syncTeamStatistics(oaklandCougars.id);
    
    console.log('✅ Statistics synchronization completed!');
    console.log('📊 Results:', {
      teamName: result.teamName,
      before: result.before,
      after: result.after,
      gamesProcessed: result.gamesProcessed,
      discrepancies: result.discrepanciesFound
    });
    
  } catch (error) {
    console.error('❌ Error fixing Oakland Cougars stats:', error);
  } finally {
    process.exit(0);
  }
}

fixOaklandCougarsStats();