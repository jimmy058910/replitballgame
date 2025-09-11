#!/usr/bin/env node

// Database analysis script for Oakland Cougars roster
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRoster() {
  try {
    console.log('🔍 Analyzing Oakland Cougars (Team ID: 1) Roster...\n');

    // Get team info
    const team = await prisma.team.findUnique({
      where: { id: 1 },
      select: { name: true, location: true }
    });

    if (!team) {
      console.log('❌ Team ID 1 not found');
      return;
    }

    console.log(`🏈 Team: ${team.location} ${team.name}\n`);

    // Get all players for team 1
    const players = await prisma.player.findMany({
      where: { teamId: 1 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        race: true,
        role: true,
        age: true,
        experience: true,
        // Core stats
        speed: true,
        strength: true,
        agility: true,
        accuracy: true,
        awareness: true,
        endurance: true,
        // Position-specific stats
        passing: true,
        catching: true,
        tackling: true,
        blocking: true,
        leadership: true,
        vision: true,
        // Contract info
        contract: {
          select: {
            salary: true,
            yearsRemaining: true,
            totalValue: true,
            signedDate: true
          }
        }
      }
    });

    console.log(`👥 Total Players: ${players.length}`);
    
    if (players.length === 0) {
      console.log('❌ No players found for this team');
      return;
    }

    // Analyze role distribution
    const roleDistribution = players.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Role Distribution:');
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} players`);
    });

    // Analyze racial distribution
    const raceDistribution = players.reduce((acc, player) => {
      acc[player.race] = (acc[player.race] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🌍 Racial Distribution:');
    Object.entries(raceDistribution).forEach(([race, count]) => {
      console.log(`  ${race}: ${count} players`);
    });

    // Contract analysis
    const playersWithContracts = players.filter(p => p.contract);
    const playersWithoutContracts = players.filter(p => !p.contract);

    console.log(`\n💰 Contract Status:`);
    console.log(`  Players with contracts: ${playersWithContracts.length}`);
    console.log(`  Players without contracts: ${playersWithoutContracts.length}`);

    if (playersWithoutContracts.length > 0) {
      console.log('\n❌ Players without contracts:');
      playersWithoutContracts.forEach(player => {
        console.log(`  - ${player.firstName} ${player.lastName} (${player.role})`);
      });
    }

    // Stats analysis
    console.log('\n📈 Stats Analysis:');
    
    const coreStats = ['speed', 'strength', 'agility', 'accuracy', 'awareness', 'endurance'];
    const positionStats = ['passing', 'catching', 'tackling', 'blocking', 'leadership', 'vision'];
    
    coreStats.forEach(stat => {
      const values = players.map(p => p[stat]).filter(v => v !== null && v !== undefined);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        console.log(`  ${stat}: ${min}-${max} (avg: ${avg})`);
      }
    });

    // Detailed player list
    console.log('\n📋 Detailed Player Roster:');
    console.log('=' .repeat(120));
    console.log(
      'ID'.padEnd(4) +
      'Name'.padEnd(25) + 
      'Race'.padEnd(12) + 
      'Role'.padEnd(10) + 
      'Age'.padEnd(4) + 
      'Exp'.padEnd(4) +
      'SPD'.padEnd(4) + 
      'STR'.padEnd(4) + 
      'AGL'.padEnd(4) + 
      'ACC'.padEnd(4) + 
      'AWR'.padEnd(4) + 
      'END'.padEnd(4) +
      'Contract'.padEnd(12)
    );
    console.log('=' .repeat(120));

    players.forEach(player => {
      const name = `${player.firstName} ${player.lastName}`;
      const contractStatus = player.contract ? 
        `${Math.round(player.contract.salary / 1000)}k/${player.contract.yearsRemaining}y` : 
        'NO CONTRACT';
      
      console.log(
        player.id.toString().padEnd(4) +
        name.padEnd(25) + 
        (player.race || 'N/A').padEnd(12) + 
        (player.role || 'N/A').padEnd(10) + 
        (player.age || 'N/A').toString().padEnd(4) + 
        (player.experience || 'N/A').toString().padEnd(4) +
        (player.speed || 'N/A').toString().padEnd(4) + 
        (player.strength || 'N/A').toString().padEnd(4) + 
        (player.agility || 'N/A').toString().padEnd(4) + 
        (player.accuracy || 'N/A').toString().padEnd(4) + 
        (player.awareness || 'N/A').toString().padEnd(4) + 
        (player.endurance || 'N/A').toString().padEnd(4) +
        contractStatus.padEnd(12)
      );
    });

    // Check roster requirements
    console.log('\n✅ Roster Requirements Analysis:');
    console.log(`📏 Minimum roster size (12): ${players.length >= 12 ? '✅ PASS' : '❌ FAIL'} (${players.length}/12)`);
    console.log(`🏃 Passers (need 3): ${(roleDistribution['Passer'] || 0) >= 3 ? '✅ PASS' : '❌ FAIL'} (${roleDistribution['Passer'] || 0}/3)`);
    console.log(`🏃 Runners (need 4): ${(roleDistribution['Runner'] || 0) >= 4 ? '✅ PASS' : '❌ FAIL'} (${roleDistribution['Runner'] || 0}/4)`);
    console.log(`🛡️ Blockers (need 4): ${(roleDistribution['Blocker'] || 0) >= 4 ? '✅ PASS' : '❌ FAIL'} (${roleDistribution['Blocker'] || 0}/4)`);
    console.log(`💰 All players have contracts: ${playersWithoutContracts.length === 0 ? '✅ PASS' : '❌ FAIL'}`);

    // Check stat ranges
    const hasInvalidStats = players.some(player => {
      const coreStatValues = coreStats.map(stat => player[stat]).filter(v => v !== null && v !== undefined);
      return coreStatValues.some(val => val < 35 || val > 85);
    });

    console.log(`📊 Stat ranges (35-85): ${!hasInvalidStats ? '✅ PASS' : '❌ FAIL'}`);

    if (hasInvalidStats) {
      console.log('\n⚠️ Players with invalid stat ranges:');
      players.forEach(player => {
        const invalidStats = coreStats.filter(stat => {
          const val = player[stat];
          return val !== null && val !== undefined && (val < 35 || val > 85);
        });
        if (invalidStats.length > 0) {
          console.log(`  ${player.firstName} ${player.lastName}: ${invalidStats.map(s => `${s}=${player[s]}`).join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing roster:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeRoster().catch(console.error);