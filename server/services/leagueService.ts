import type { InsertPlayer } from "@shared/schema";
import { generateRandomName, getFullName } from "@shared/names";

export function generateRandomPlayer(name: string, race: string, teamId: string): InsertPlayer {
  // Generate race-appropriate name if not provided
  const { firstName, lastName } = name ? 
    { firstName: name.split(' ')[0] || name, lastName: name.split(' ')[1] || "Unknown" } :
    generateRandomName(race);
  
  const fullName = getFullName(firstName, lastName);
  const baseAge = 18 + Math.floor(Math.random() * 12); // 18-29 years old
  
  // Generate base attributes (15-35 range)
  const baseStats = {
    speed: 15 + Math.floor(Math.random() * 20),
    power: 15 + Math.floor(Math.random() * 20),
    throwing: 15 + Math.floor(Math.random() * 20),
    catching: 15 + Math.floor(Math.random() * 20),
    kicking: 15 + Math.floor(Math.random() * 20),
    stamina: 15 + Math.floor(Math.random() * 20),
    leadership: 15 + Math.floor(Math.random() * 20),
    agility: 15 + Math.floor(Math.random() * 20),
  };

  // Apply racial modifiers
  switch (race) {
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

  // Generate potential (2.0-5.0 stars)
  const generatePotential = () => 2.0 + Math.random() * 3.0;

  // Calculate salary based on stats and age
  const avgStat = Object.values(baseStats).reduce((a, b) => a + b, 0) / 8;
  const baseSalary = 1000 + (avgStat * 50) + (Math.random() * 500);
  const ageFactor = baseAge > 25 ? 0.9 : 1.1; // Younger players cost more
  const salary = Math.floor(baseSalary * ageFactor);

  return {
    teamId,
    firstName,
    lastName,
    name: fullName,
    race,
    age: baseAge,
    ...baseStats,
    speedPotential: generatePotential().toString(),
    powerPotential: generatePotential().toString(),
    throwingPotential: generatePotential().toString(),
    catchingPotential: generatePotential().toString(),
    kickingPotential: generatePotential().toString(),
    staminaPotential: generatePotential().toString(),
    leadershipPotential: generatePotential().toString(),
    agilityPotential: generatePotential().toString(),
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
  
  // Age factor (younger players worth more)
  const ageFactor = Math.max(0.5, (35 - player.age) / 20);
  
  return Math.floor(baseValue * ageFactor);
}


