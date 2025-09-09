
import type { Player } from "./types/models";
import { getPlayerRole as getPlayerRoleUtil } from "./playerUtils";

export interface Ability {
  id: string;
  name: string;
  description: string;
  tier: "basic" | "advanced" | "godly";
  raceAffinities: string[]; // races more likely to get this ability
  positionAffinities: string[]; // positions more likely to get this ability
  statBonuses: {
    speed?: number;
    power?: number;
    throwing?: number;
    catching?: number;
    kicking?: number;
    stamina?: number;
    leadership?: number;
    agility?: number;
  };
  prerequisites?: string[]; // other ability IDs required
  conflictsWith?: string[]; // abilities that cannot coexist
}

import abilitiesData from './config/abilities.json' with { type: "json" };
export const ABILITIES: Record<string, Ability> = abilitiesData;

export function getAbilityById(id: string): Ability | undefined {
  return ABILITIES[id];
}

export function getAbilitiesByTier(tier: "basic" | "advanced" | "godly"): Ability[] {
  return Object.values(ABILITIES).filter(ability => ability.tier === tier);
}

export function getAvailableAbilities(player: any): Ability[] {
  const playerAbilities = player.abilities || [];
  
  return Object.values(ABILITIES).filter(ability => {
    // Check if player already has this ability
    if (playerAbilities.includes(ability.id)) {
      return false;
    }
    
    // Check prerequisites
    if (ability.prerequisites) {
      const hasAllPrereqs = ability.prerequisites.every(prereq => 
        playerAbilities.includes(prereq)
      );
      if (!hasAllPrereqs) {
        return false;
      }
    }
    
    // Check conflicts
    if (ability.conflictsWith) {
      const hasConflict = ability.conflictsWith.some(conflict => 
        playerAbilities.includes(conflict)
      );
      if (hasConflict) {
        return false;
      }
    }
    
    return true;
  });
}

export function calculateAbilityChance(ability: Ability, player: any): number {
  let baseChance = 0;
  
  // Base chance by tier
  switch (ability.tier) {
    case "basic": baseChance = 0.25; break;
    case "advanced": baseChance = 0.05; break;
    case "godly": baseChance = 0.01; break;
  }
  
  // Race affinity bonus
  if (ability.raceAffinities.includes(player.race)) {
    baseChance *= 2;
  }
  
  // Position affinity bonus
  const playerRole = getPlayerRole(player);
  if (ability.positionAffinities.includes(playerRole)) {
    baseChance *= 1.5;
  }
  
  return Math.min(baseChance, 0.8); // Cap at 80%
}

function getPlayerRole(player: Player): string {
  return getPlayerRoleUtil(player);
}

export function rollForAbility(player: any): Ability | null {
  const availableAbilities = getAvailableAbilities(player);
  
  for (const ability of availableAbilities) {
    const chance = calculateAbilityChance(ability, player);
    if (Math.random() < chance) {
      return ability;
    }
  }
  
  return null;
}