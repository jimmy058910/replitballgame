import type { Prisma } from "../../generated/prisma";
import { generateRandomName, getFullName } from "@shared/names";
import gameConfig from "../config/game_config.json";

export function generateRandomPlayer(name: string | null, race: string, teamId: string, position?: string): Prisma.PlayerCreateInput {
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
  const baseAge = ageConfig.min + Math.floor(Math.random() * (ageConfig.max - ageConfig.min + 1));
  
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

  // Generate individual stat potentials (15-40 range like stats)
  const generateIndividualPotential = () => 15 + Math.random() * 25; // 15-40 range for individual stat potentials
  
  // Generate overall potential stars using original config (0.5-5.0 range)
  const potentialConfig = gameConfig.gameParameters.playerGeneration.potentialRange;
  const generateOverallPotential = () => potentialConfig.min + Math.random() * (potentialConfig.max - potentialConfig.min);

  // Calculate overall potential stars based on position and individual potentials
  const potentials = {
    speed: generateIndividualPotential(),
    power: generateIndividualPotential(),
    throwing: generateIndividualPotential(),
    catching: generateIndividualPotential(),
    kicking: generateIndividualPotential(),
    stamina: generateIndividualPotential(),
    leadership: generateIndividualPotential(),
    agility: generateIndividualPotential()
  };
  
  // Use the generated overall potential instead of calculating from individual potentials
  const overallPotential = generateOverallPotential();
  
  // Calculate salary based on stats and age using configurable parameters
  const salaryConfig = gameConfig.gameParameters.playerGeneration.salaryMultipliers;
  const avgStat = Object.values(baseStats).reduce((a, b) => a + b, 0) / 8;
  const baseSalary = 1000 + (avgStat * salaryConfig.basePerStat) + (Math.random() * salaryConfig.randomVariance);
  const ageFactor = baseAge > 25 ? salaryConfig.veteranPenalty : salaryConfig.youngPlayerBonus;
  const salary = Math.floor(baseSalary * ageFactor);

  // Map position to PlayerRole enum
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

  return {
    teamId,
    firstName,
    lastName,
    name: fullName,
    race: originalRace.toLowerCase(), // Store race in lowercase for consistency
    role: getPlayerRole(position || "runner"),
    position: position || "runner", // Default to runner if no position specified
    age: baseAge,
    ...baseStats,
    staminaAttribute: baseStats.stamina, // Map stamina to staminaAttribute
    potentialRating: parseFloat(overallPotential.toFixed(1)),
    speedPotential: potentials.speed.toString(),
    powerPotential: potentials.power.toString(),
    throwingPotential: potentials.throwing.toString(),
    catchingPotential: potentials.catching.toString(),
    kickingPotential: potentials.kicking.toString(),
    staminaPotential: potentials.stamina.toString(),
    leadershipPotential: potentials.leadership.toString(),
    agilityPotential: potentials.agility.toString(),
    overallPotentialStars: overallPotential.toFixed(1),
    salary,
    contractValue: salary * 3, // 3 year contract value
    camaraderie: 50, // Initial camaraderie
    yearsOnTeam: 0,  // New player, 0 years on team
  };
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

export async function processEndOfSeasonSkillProgression(playerId: string): Promise<void> {
  // Import storage after function definition to avoid circular dependency
  const { storage } = await import("../storage/index");
  
  try {
    const player = await storage.getPlayerById(playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    // Calculate progression chance based on age, potential, and activity
    const baseChance = 0.15; // 15% base chance
    const potentialModifier = (parseFloat(player.overallPotentialStars) - 2.5) * 0.05;
    const ageModifier = player.age <= 23 ? 0.10 : (player.age <= 27 ? 0.05 : -0.05);
    const activityModifier = (player.gamesPlayedLastSeason || 0) >= 8 ? 0.05 : -0.05;
    
    const progressionChance = Math.max(0, baseChance + potentialModifier + ageModifier + activityModifier);
    
    // Check if player progresses this season
    if (Math.random() < progressionChance) {
      // Determine which stat to improve based on potential and position
      const eligibleStats = ['speed', 'power', 'throwing', 'catching', 'kicking', 'stamina', 'leadership', 'agility'];
      const statWeights = eligibleStats.map(stat => {
        const currentValue = player[stat as keyof typeof player] as number;
        const potential = parseFloat(player[`${stat}Potential` as keyof typeof player] as string || "25");
        
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
            await storage.updatePlayer(playerId, {
              [statEntry.stat]: newValue
            });
            
            console.log(`Player ${player.name} improved ${statEntry.stat} from ${currentValue} to ${newValue}`);
            break;
          }
        }
      }
    }
    
    // Reset games played counter for next season
    await storage.updatePlayer(playerId, {
      gamesPlayedLastSeason: 0
    });
    
  } catch (error) {
    console.error(`Error processing skill progression for player ${playerId}:`, error);
    throw error;
  }
}


