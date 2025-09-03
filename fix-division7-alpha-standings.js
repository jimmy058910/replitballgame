#!/usr/bin/env node

/**
 * CRITICAL FIX: Division 7 Alpha Standings Correction
 * 
 * Issue: 6 teams have played 2 games, 2 teams have played 1 game, 
 * but standings show all teams with only 1 game played.
 * 
 * This script directly fixes the standings based on completed game results.
 */

import { PrismaClient } from '@prisma/client';

async function fixDivision7AlphaStandings() {
  const prisma = new PrismaClient();
  
  console.log('🔍 DIVISION 7 ALPHA STANDINGS FIX');
  console.log('==================================');
  
  try {
    // Get Division 7 Alpha teams
    const teams = await prisma.team.findMany({
      where: { 
        division: 7,
        subdivision: 'alpha'
      },
      select: { 
        id: true, 
        name: true, 
        wins: true, 
        losses: true, 
        draws: true, 
        points: true 
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`🔍 Found ${teams.length} Division 7 Alpha teams:`);
    teams.forEach(team => {
      console.log(`  - ${team.name} (ID: ${team.id}): ${team.wins}W-${team.losses}L-${team.draws}D = ${team.points} pts`);
    });
    
    // Get ALL completed league games involving these teams
    const teamIds = teams.map(t => t.id);
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } }
        ]
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`\n📋 Found ${completedGames.length} completed league games involving Division 7 Alpha teams:`);
    
    // Calculate correct records from completed games
    const correctRecords = new Map();
    teams.forEach(team => {
      correctRecords.set(team.id, {
        name: team.name,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0
      });
    });
    
    completedGames.forEach((game, index) => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      console.log(`${index + 1}. ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name} (Game ${game.id})`);
      
      // Only count if both teams are in Division 7 Alpha
      const homeInDiv7Alpha = teamIds.includes(game.homeTeamId);
      const awayInDiv7Alpha = teamIds.includes(game.awayTeamId);
      
      if (homeInDiv7Alpha) {
        const homeRecord = correctRecords.get(game.homeTeamId);
        homeRecord.gamesPlayed++;
        if (homeScore > awayScore) {
          homeRecord.wins++;
        } else if (homeScore < awayScore) {
          homeRecord.losses++;
        } else {
          homeRecord.draws++;
        }
      }
      
      if (awayInDiv7Alpha) {
        const awayRecord = correctRecords.get(game.awayTeamId);
        awayRecord.gamesPlayed++;
        if (awayScore > homeScore) {
          awayRecord.wins++;
        } else if (awayScore < homeScore) {
          awayRecord.losses++;
        } else {
          awayRecord.draws++;
        }
      }
    });
    
    console.log('\n📊 APPLYING STANDINGS CORRECTIONS:');
    console.log('===================================');
    
    let correctionCount = 0;
    
    for (const team of teams) {
      const correct = correctRecords.get(team.id);
      const correctPoints = (correct.wins * 3) + (correct.draws * 1);
      
      const needsUpdate = (
        team.wins !== correct.wins ||
        team.losses !== correct.losses ||
        team.draws !== correct.draws ||
        team.points !== correctPoints
      );
      
      if (needsUpdate) {
        console.log(`🔧 CORRECTING ${team.name}:`);
        console.log(`   From: ${team.wins}W-${team.losses}L-${team.draws}D = ${team.points} pts`);
        console.log(`   To:   ${correct.wins}W-${correct.losses}L-${correct.draws}D = ${correctPoints} pts`);
        
        await prisma.team.update({
          where: { id: team.id },
          data: {
            wins: correct.wins,
            losses: correct.losses,
            draws: correct.draws,
            points: correctPoints
          }
        });
        
        correctionCount++;
        console.log(`   ✅ Updated successfully`);
      } else {
        console.log(`✅ ${team.name}: Already correct (${correct.wins}W-${correct.losses}L-${correct.draws}D = ${correctPoints} pts)`);
      }
    }
    
    console.log(`\n🎉 STANDINGS FIX COMPLETE!`);
    console.log(`📈 Corrected ${correctionCount} teams out of ${teams.length} total`);
    
    // Verify the fix by checking Oakland Cougars specifically
    const oakland = await prisma.team.findFirst({
      where: {
        name: { contains: 'Oakland' },
        division: 7,
        subdivision: 'alpha'
      },
      select: { name: true, wins: true, losses: true, draws: true, points: true }
    });
    
    if (oakland) {
      console.log(`\n🔍 VERIFICATION - Oakland Cougars: ${oakland.wins}W-${oakland.losses}L-${oakland.draws}D = ${oakland.points} pts`);
      if (oakland.wins === 1 && oakland.losses === 1) {
        console.log(`✅ Oakland Cougars record is now correct: 1W-1L (should be after beating Earth Guardians and losing to Azure Dragons)`);
      } else {
        console.log(`❌ Oakland Cougars record is still incorrect - expected 1W-1L`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing Division 7 Alpha standings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDivision7AlphaStandings()
  .then(() => {
    console.log('\n🎯 Division 7 Alpha standings fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Division 7 Alpha standings fix failed:', error);
    process.exit(1);
  });