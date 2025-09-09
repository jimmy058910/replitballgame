import type { Prisma } from "../db";
import { generateRandomName, getFullName } from "../../shared/names.js";
import { generatePotential } from "../../shared/potentialSystem.js";
import gameConfig from "../config/game_config.json" with { type: "json" };
import type { Player } from '@shared/types/models';


export function generateRandomPlayer(name: string | null, race: string, teamId: number, position?: string): any {
  // Convert race to lowercase for switch statement, but store original for return
  const originalRace = race;
  const lowerRace = race.toLowerCase();
  
  // Generate race-appropriate name if not provided
  const { firstName, lastName } = (name && name.trim()) ? 
    { firstName: name.split(' ')[0] || name, lastName: name.split(' ')[1] || "Unknown" } :
    generateRandomName(lowerRace);
  
  const fullName = getFullName(firstName, lastName);
  const ageConfig = gameConfig.gameParameters.playerGeneration.ageRange;
  const statConfig = gameConfig.gameParameters.playerGeneration.statRange;
  
  // For initial team creation, bias towards early 20s (20-32 range, most in early 20s)
  // Using weighted random: 60% chance for age 20-25, 40% chance for age 26-32
  let baseAge: number;
  if (Math.random() < 0.6) {
    // Early career players (age 20-25)
    baseAge = 20 + Math.floor(Math.random() * 6);
  } else {
    // More experienced players (age 26-32)
    baseAge = 26 + Math.floor(Math.random() * 7);
  }
  
  // Generate base attributes using configurable ranges
  const statRange = statConfig.max - statConfig.min;
  const baseStats = {
    speed: statConfig.min + Math.floor(Math.random() * statRange),
    power: statConfig.min + Math.floor(Math.random() * statRange),
    throwing: statConfig.min + Math.floor(Math.random() * statRange),
    catching: statConfig.min + Math.floor(Math.random() * statRange),
    kicking: statConfig.min + Math.floor(Math.random() * statRange),
    stamina: statConfig.min + Math.floor(Math.random() * statRange),
    leadership: statConfig.min + Math.floor(Math.random() * statRange),
    agility: statConfig.min + Math.floor(Math.random() * statRange),
  };

  // Apply racial modifiers using lowercase race
  switch (lowerRace) {
    case "sylvan":
      baseStats.speed += 3;
      baseStats.agility += 4;
      baseStats.power -= 2;
      break;
    case "gryll":
      baseStats.power += 5;
      baseStats.stamina += 3;
      baseStats.speed -= 3;
      baseStats.agility -= 2;
      break;
    case "lumina":
      baseStats.throwing += 4;
      baseStats.leadership += 3;
      baseStats.stamina -= 1;
      break;
    case "umbra":
      baseStats.speed += 2;
      baseStats.agility += 3;
      baseStats.power -= 3;
      baseStats.leadership -= 1;
      break;
    case "human":
      // Humans are balanced, small bonus to all
      Object.keys(baseStats).forEach(key => {
        baseStats[key as keyof typeof baseStats] += 1;
      });
      break;
  }

  // Cap at 40
  Object.keys(baseStats).forEach(key => {
    baseStats[key as keyof typeof baseStats] = Math.min(40, baseStats[key as keyof typeof baseStats]);
  });

  // Map position to PlayerRole enum - define function first
  const getPlayerRole = (position: string) => {
    switch (position) {
      case "passer":
        return "PASSER";
      case "runner":
        return "RUNNER";
      case "blocker":
        return "BLOCKER";
      default:
        return "RUNNER"; // Default to runner
    }
  };

  // Use unified potential generation system
  const potentialRating = generatePotential({ 
    type: 'veteran_pool', // Default to veteran pool for league generation
    ageModifier: baseAge <= 23 ? 0.2 : (baseAge >= 30 ? -0.3 : 0)
  });
  
  // Calculate salary using dynamic formula based on specifications:
  // Base Formula: (Total Attributes × 50) + (Potential × 1000) + Random Variance (0-500)
  const totalAttributes = Object.values(baseStats).reduce((a, b) => a + b, 0);
  const baseSalary = (totalAttributes * 50) + (potentialRating * 1000) + (Math.random() * 500);
  
  // Age Modifiers
  let ageFactor = 1.0;
  if (baseAge < 24) {
    ageFactor = 1.1; // Young players (+10%)
  } else if (baseAge >= 30) {
    ageFactor = 0.9; // Veterans (-10%)
  }
  
  // Position Multipliers
  let positionMultiplier = 1.0;
  const playerPosition = getPlayerRole(position || 'runner');
  switch (playerPosition) {
    case 'PASSER':
      positionMultiplier = 1.3; // Highest paid
      break;
    case 'RUNNER':
      positionMultiplier = 1.2;
      break;
    case 'BLOCKER':
      positionMultiplier = 1.0; // Base rate
      break;
  }
  
  const salary = Math.floor(baseSalary * ageFactor * positionMultiplier);

  return {
    team: {
      connect: {
        id: teamId
      }
    },
    firstName,
    lastName,
    race: originalRace.toUpperCase() as any, // Store race in uppercase for enum consistency
    role: getPlayerRole(position || "runner"),
    age: baseAge,
    ...baseStats,
    staminaAttribute: baseStats.stamina, // Map stamina to staminaAttribute
    potentialRating: parseFloat(potentialRating.toFixed(1)), // Use unified potential rating
    camaraderieScore: 7.5, // Initial camaraderie
  } as any;
}

export function calculatePlayerValue(player: any): number {
  const avgStat = (
    player.speed + player.power + player.throwing + player.catching +
    player.kicking + player.stamina + player.leadership + player.agility
  ) / 8;
  
  const avgPotential = (
    parseFloat(player.speedPotential || "25") + parseFloat(player.powerPotential || "25") +
    parseFloat(player.throwingPotential || "25") + parseFloat(player.catchingPotential || "25") +
    parseFloat(player.kickingPotential || "25") + parseFloat(player.staminaPotential || "25") +
    parseFloat(player.leadershipPotential || "25") + parseFloat(player.agilityPotential || "25")
  ) / 8;
  
  // Base value calculation
  const baseValue = avgStat * 1000 + avgPotential * 500;
  
  // Age factor (peak performance around 25)
  let ageFactor: number;
  if (player.age <= 23) {
    ageFactor = 1.0; // Young players
  } else if (player.age <= 27) {
    ageFactor = 1.2; // Prime age players
  } else if (player.age <= 30) {
    ageFactor = 1.0; // Still good players
  } else {
    ageFactor = Math.max(0.5, (35 - player.age) / 10); // Declining players
  }
  
  return Math.floor(baseValue * ageFactor);
}

export async function processEndOfSeasonSkillProgression(playerId: number): Promise<void> {
  // Import storage after function definition to avoid circular dependency
  const { storage } = await import("../storage/index");
  
  try {
    const player = await storage?.players.getPlayerById(playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    // Calculate progression chance based on age, potential, and activity
    const baseChance = 0.15; // 15% base chance
    const potentialModifier = ((player.potentialRating || 2.5) - 2.5) * 0.05;
    const ageModifier = player.age <= 23 ? 0.10 : (player.age <= 27 ? 0.05 : -0.05);
    const activityModifier = 0;
    
    const progressionChance = Math.max(0, baseChance + potentialModifier + ageModifier + activityModifier);
    
    // Check if player progresses this season
    if (Math.random() < progressionChance) {
      // Determine which stat to improve based on potential and position
      const eligibleStats = ['speed', 'power', 'throwing', 'catching', 'kicking', 'stamina', 'leadership', 'agility'];
      const statWeights = eligibleStats.map(stat => {
        const currentValue = player[stat as keyof typeof player] as number;
        const potential = 25;
        
        // Higher potential and lower current value = higher chance to improve
        const potentialGap = Math.max(0, potential - currentValue);
        return { stat, weight: potentialGap };
      });
      
      // Filter out stats that can't improve (at or above potential)
      const viableStats = statWeights.filter(s => s.weight > 0);
      
      if (viableStats.length > 0) {
        // Weighted random selection
        const totalWeight = viableStats.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const statEntry of viableStats) {
          random -= statEntry.weight;
          if (random <= 0) {
            const currentValue = player[statEntry.stat as keyof typeof player] as number;
            const newValue = Math.min(40, currentValue + 1); // Cap at 40
            
            // Update the player's stat
            await storage?.players.updatePlayer(playerId, {
              [statEntry.stat]: newValue
            });
            
            console.log(`Player ${player.firstName} ${player.lastName} improved ${statEntry.stat} from ${currentValue} to ${newValue}`);
            break;
          }
        }
      }
    }
    
    // Reset games played counter for next season
    await storage?.players.updatePlayer(playerId, {
    });
    
  } catch (error) {
    console.error(`Error processing skill progression for player ${playerId}:`, error);
    throw error;
  }
}


