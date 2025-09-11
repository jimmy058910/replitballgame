#!/usr/bin/env tsx

/**
 * ROSTER FIX SCRIPT
 * Comprehensive script to fix the Oakland Cougars roster:
 * - Update existing 9 players with proper racial names and corrected stats
 * - Add 3 additional players to reach 12-player minimum
 * - Add contracts to all players
 * - Ensure proper role distribution (3 Passers, 4 Runners, 4 Blockers)
 */

import { PrismaClient } from '../prisma/generated/client/index.js';
import { generateRandomName } from '../shared/names.js';

const prisma = new PrismaClient();

// EXACT racial bonuses from leagueService.ts
const RACIAL_BONUSES = {
  SYLVAN: { speed: 3, agility: 4, power: -2 },
  GRYLL: { power: 5, staminaAttribute: 3, speed: -3, agility: -2 },
  LUMINA: { throwing: 4, leadership: 3, staminaAttribute: -1 },
  UMBRA: { speed: 2, agility: 3, power: -3, leadership: -1 },
  HUMAN: { speed: 1, power: 1, agility: 1, throwing: 1, catching: 1, kicking: 1, staminaAttribute: 1, leadership: 1 }
};

// Generate player stats using EXACT specifications from game_config.json and leagueService.ts
function generatePlayerStats(race: string) {
  const racialBonus = RACIAL_BONUSES[race as keyof typeof RACIAL_BONUSES] || {};
  
  // EXACT base range from game_config.json: 8-28
  const baseRange = { min: 8, max: 28 }; 

  // Generate base stats within correct range
  const stats = {
    speed: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    power: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    agility: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    throwing: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    catching: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    kicking: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    staminaAttribute: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    leadership: Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min,
    potentialRating: Math.random() * 4.5 + 0.5 // 0.5-5.0 stars as per potentialSystem.ts
  };

  // Apply racial bonuses (cap at 40 as per existing code)
  Object.entries(racialBonus).forEach(([stat, bonus]) => {
    if (stats[stat as keyof typeof stats] !== undefined) {
      stats[stat as keyof typeof stats] = Math.min(40, Math.max(1, stats[stat as keyof typeof stats] + bonus));
    }
  });

  return stats;
}

// Calculate realistic salary based on CAR (Core Athleticism Rating) from documentation
function calculateCAR(stats: any): number {
  const coreStats = [
    stats.speed,
    stats.power, 
    stats.agility,
    stats.throwing,
    stats.catching,
    stats.kicking
  ];
  
  return coreStats.reduce((sum, stat) => sum + stat, 0) / coreStats.length;
}

// Generate age using EXACT distribution from leagueService.ts
function generateAge() {
  // Weighted random: 60% chance for age 20-25, 40% chance for age 26-32
  if (Math.random() < 0.6) {
    return 20 + Math.floor(Math.random() * 6); // 20-25
  } else {
    return 26 + Math.floor(Math.random() * 7); // 26-32
  }
}

function generateContract(playerStats: any, role: string) {
  const contractLength = Math.floor(Math.random() * 4) + 1; // 1-4 years
  const age = generateAge();
  
  // EXACT salary formula from leagueService.ts
  const totalAttributes = Object.values(playerStats).reduce((a: any, b: any) => 
    typeof a === 'number' && typeof b === 'number' ? a + b : (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0
  ) - playerStats.potentialRating; // Subtract potential since it's not an attribute
  
  const baseSalary = (totalAttributes * 50) + (playerStats.potentialRating * 1000) + (Math.random() * 500);
  
  // Age modifiers
  let ageFactor = 1.0;
  if (age < 24) ageFactor = 1.1; // Young players (+10%)
  else if (age >= 30) ageFactor = 0.9; // Veterans (-10%)
  
  // Position multipliers
  const positionMultipliers: Record<string, number> = {
    'PASSER': 1.3,
    'RUNNER': 1.2,
    'BLOCKER': 1.0
  };
  
  const positionMultiplier = positionMultipliers[role] || 1.0;
  const finalSalary = Math.floor(baseSalary * ageFactor * positionMultiplier);
  
  // Signing bonus based on potential
  const signingBonus = Math.floor(playerStats.potentialRating * 1000); // Up to 5k for 5-star potential

  return {
    salary: finalSalary,
    length: contractLength,
    signingBonus: signingBonus,
    startDate: new Date(),
    age
  };
}

// Player templates for diverse roster (simple - just role and race)
const PLAYER_TEMPLATES = [
  // Existing 9 players to update
  { role: 'PASSER', race: 'LUMINA' },
  { role: 'PASSER', race: 'HUMAN' },
  { role: 'PASSER', race: 'SYLVAN' },
  { role: 'RUNNER', race: 'SYLVAN' },
  { role: 'RUNNER', race: 'UMBRA' },
  { role: 'RUNNER', race: 'HUMAN' },
  { role: 'RUNNER', race: 'SYLVAN' },
  { role: 'BLOCKER', race: 'GRYLL' },
  { role: 'BLOCKER', race: 'GRYLL' },
  
  // 3 new players to add for minimum 12-player roster
  { role: 'BLOCKER', race: 'GRYLL' },
  { role: 'BLOCKER', race: 'HUMAN' },
  { role: 'RUNNER', race: 'UMBRA' } // 5th runner for depth
];

async function fixRoster() {
  try {
    console.log('🔧 Starting Oakland Cougars Roster Fix...\n');

    // Get team ID 1 (Oakland Cougars)
    const team = await prisma.team.findUnique({
      where: { id: 1 },
      select: { id: true, name: true }
    });

    if (!team) {
      console.log('❌ Oakland Cougars team not found');
      return;
    }

    console.log(`🏈 Team: ${team.name}\n`);

    // Get existing players
    const existingPlayers = await prisma.player.findMany({
      where: { teamId: 1 },
      include: { contract: true }
    });

    console.log(`👥 Found ${existingPlayers.length} existing players`);

    // Remove excess players (keep only 15 maximum)
    if (existingPlayers.length > 15) {
      console.log(`\n🗑️ Removing ${existingPlayers.length - 15} excess players to stay within 15-player limit...`);
      
      const playersToRemove = existingPlayers.slice(15);
      for (const player of playersToRemove) {
        // Delete contracts first
        await prisma.contract.deleteMany({
          where: { playerId: player.id }
        });
        
        // Delete player
        await prisma.player.delete({
          where: { id: player.id }
        });
        
        console.log(`  🗑️ Removed: ${player.firstName} ${player.lastName}`);
      }
      
      // Update the list to only include remaining players
      existingPlayers.splice(15);
    }

    // Update existing players to reach exactly 15 (using all 12 templates)
    const playersToUpdate = Math.min(existingPlayers.length, 12);
    console.log(`\n🔄 Updating ${playersToUpdate} existing players with proper racial names and stats...`);
    
    for (let i = 0; i < playersToUpdate; i++) {
      const player = existingPlayers[i];
      const template = PLAYER_TEMPLATES[i];
      
      const { firstName, lastName } = generateRandomName(template.race.toLowerCase());
      const stats = generatePlayerStats(template.race);
      const contractData = generateContract(stats, template.role);

      await prisma.player.update({
        where: { id: player.id },
        data: {
          firstName,
          lastName,
          race: template.race,
          role: template.role,
          age: contractData.age,
          ...stats
        }
      });

      // Add contract if missing
      if (!player.contract) {
        await prisma.contract.create({
          data: {
            salary: contractData.salary,
            length: contractData.length,
            signingBonus: contractData.signingBonus,
            startDate: contractData.startDate,
            playerId: player.id
          }
        });
      }

      console.log(`  ✅ Updated: ${firstName} ${lastName} (${template.race} ${template.role})`);
    }

    // Add new players if we have fewer than 15 total
    const playersNeeded = Math.max(0, 15 - existingPlayers.length);
    if (playersNeeded > 0) {
      console.log(`\n➕ Adding ${playersNeeded} new players to reach 15-player maximum...`);
      
      const newPlayerTemplates = PLAYER_TEMPLATES.slice(playersToUpdate, playersToUpdate + playersNeeded);
      
      for (const template of newPlayerTemplates) {
        const { firstName, lastName } = generateRandomName(template.race.toLowerCase());
        const stats = generatePlayerStats(template.race);
        const contractData = generateContract(stats, template.role);

        const newPlayer = await prisma.player.create({
          data: {
            firstName,
            lastName,
            race: template.race,
            role: template.role,
            age: contractData.age,
            teamId: 1,
            isOnMarket: false,
            isRetired: false,
            ...stats
          }
        });

        // Add contract
        await prisma.contract.create({
          data: {
            salary: contractData.salary,
            length: contractData.length,
            signingBonus: contractData.signingBonus,
            startDate: contractData.startDate,
            playerId: newPlayer.id
          }
        });

        console.log(`  ✅ Added: ${firstName} ${lastName} (${template.race} ${template.role})`);
      }
    }

    // Verify final roster
    console.log('\n📊 Final Roster Verification:');
    
    const finalPlayers = await prisma.player.findMany({
      where: { teamId: 1 },
      include: { contract: true }
    });

    const roleDistribution = finalPlayers.reduce((acc: Record<string, number>, player) => {
      acc[player.role || 'Unknown'] = (acc[player.role || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    const playersWithContracts = finalPlayers.filter(p => p.contract).length;

    console.log(`📏 Total Players: ${finalPlayers.length}/15 max ${finalPlayers.length >= 12 && finalPlayers.length <= 15 ? '✅' : '❌'}`);
    console.log(`🏃 Passers: ${roleDistribution['PASSER'] || 0}/3 min ${(roleDistribution['PASSER'] || 0) >= 3 ? '✅' : '❌'}`);
    console.log(`🏃 Runners: ${roleDistribution['RUNNER'] || 0}/4 min ${(roleDistribution['RUNNER'] || 0) >= 4 ? '✅' : '❌'}`);
    console.log(`🛡️ Blockers: ${roleDistribution['BLOCKER'] || 0}/4 min ${(roleDistribution['BLOCKER'] || 0) >= 4 ? '✅' : '❌'}`);
    console.log(`💰 Players with contracts: ${playersWithContracts}/${finalPlayers.length} ${playersWithContracts === finalPlayers.length ? '✅' : '❌'}`);

    console.log('\n🎉 Roster fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing roster:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixRoster().catch(console.error);