#!/usr/bin/env node

/**
 * Comprehensive Team Statistics Synchronization Script
 * 
 * Fixes systemic data integrity issues by:
 * 1. Recalculating ALL team statistics from actual completed games
 * 2. Updating Team table with accurate W-D-L-Points data
 * 3. Providing detailed audit report of discrepancies found
 * 
 * ADDRESSES: Competition page showing inconsistent W-D-L statistics
 * between header display and standings table across all teams.
 */

import { getPrismaClient } from '../database.js';
import { TeamStatisticsCalculator } from '../services/enhancedStatisticsService.js';
import type { Team } from '@shared/types/models';


interface TeamDiscrepancy {
  teamId: number;
  teamName: string;
  database: {
    wins: number;
    losses: number; 
    draws: number;
    points: number;
  };
  calculated: {
    wins: number;
    losses: number;
    draws: number; 
    points: number;
    gamesPlayed: number;
  };
  discrepancyFound: boolean;
}

async function syncAllTeamStatistics() {
  console.log('🚀 Starting comprehensive team statistics synchronization...');
  
  const prisma = await getPrismaClient();
  
  try {
    // Get all teams in the current season
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        division: true,
        subdivision: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      },
      orderBy: [
        { division: 'asc' },
        { subdivision: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`📊 Found ${teams.length} teams to analyze...`);

    const discrepancies: TeamDiscrepancy[] = [];
    const updates: Array<{ teamId: number; stats: any }> = [];

    // Analyze each team
    for (const team of teams) {
      console.log(`🔍 Analyzing ${team.name} (Division ${team.division}-${team.subdivision || 'main'})...`);
      
      try {
        // Calculate real-time statistics from games
        const realStats = await TeamStatisticsCalculator.calculateTeamStatisticsFromGames(
          team.id,
          team.name
        );

        const discrepancy: TeamDiscrepancy = {
          teamId: team.id,
          teamName: team.name,
          database: {
            wins: team.wins || 0,
            losses: team.losses || 0,
            draws: team.draws || 0,
            points: team.points || 0
          },
          calculated: realStats,
          discrepancyFound: false
        };

        // Check for discrepancies
        if (
          team.wins !== realStats.wins ||
          team.losses !== realStats.losses ||
          team.draws !== realStats.draws ||
          team.points !== realStats.points
        ) {
          discrepancy.discrepancyFound = true;
          console.log(`❌ DISCREPANCY FOUND: ${team.name}`);
          console.log(`   Database: ${team.wins}W-${team.draws}D-${team.losses}L (${team.points}pts)`);
          console.log(`   Calculated: ${realStats.wins}W-${realStats.draws}D-${realStats.losses}L (${realStats.points}pts)`);
          
          // Prepare update
          updates.push({
            teamId: team.id,
            stats: {
              wins: realStats.wins,
              losses: realStats.losses,
              draws: realStats.draws,
              points: realStats.points
            }
          });
        } else {
          console.log(`✅ CORRECT: ${team.name} statistics are accurate`);
        }

        discrepancies.push(discrepancy);

      } catch (error) {
        console.error(`❌ Failed to analyze ${team.name}:`, error);
      }
    }

    // Report findings
    const problemTeams = discrepancies.filter(d => d.discrepancyFound);
    console.log('\n' + '='.repeat(60));
    console.log('📋 AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Teams with correct statistics: ${teams.length - problemTeams.length}`);
    console.log(`❌ Teams with incorrect statistics: ${problemTeams.length}`);
    
    if (problemTeams.length > 0) {
      console.log('\n🔧 DISCREPANCIES FOUND:');
      problemTeams.forEach(team => {
        const db = team.database;
        const calc = team.calculated;
        console.log(`\n${team.teamName}:`);
        console.log(`  Database:   ${db.wins}W-${db.draws}D-${db.losses}L (${db.points}pts)`);
        console.log(`  Should be:  ${calc.wins}W-${calc.draws}D-${calc.losses}L (${calc.points}pts)`);
      });

      // Apply updates
      console.log('\n🔄 Updating team statistics in database...');
      let updateCount = 0;
      
      for (const update of updates) {
        try {
          await prisma.team.update({
            where: { id: update.teamId },
            data: update.stats
          });
          updateCount++;
          console.log(`   ✅ Updated team ${update.teamId}`);
        } catch (error) {
          console.error(`   ❌ Failed to update team ${update.teamId}:`, error);
        }
      }

      console.log(`\n🎯 Successfully updated ${updateCount}/${updates.length} teams`);
    }

    console.log('\n✅ Team statistics synchronization completed!');
    
    return {
      totalTeams: teams.length,
      discrepanciesFound: problemTeams.length,
      updatesApplied: updates.length
    };

  } catch (error) {
    console.error('❌ Fatal error during synchronization:', error);
    throw error;
  }
}

// Execute the synchronization if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllTeamStatistics()
    .then(result => {
      console.log(`\n🎉 Synchronization complete! ${result.updatesApplied} teams updated.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Synchronization failed:', error);
      process.exit(1);
    });
}

export { syncAllTeamStatistics };