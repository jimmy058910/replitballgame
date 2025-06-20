// Player Abilities System
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

export const ABILITIES: Record<string, Ability> = {
  // Basic Tier Abilities
  "quick_feet": {
    id: "quick_feet",
    name: "Quick Feet",
    description: "Enhanced movement speed and acceleration",
    tier: "basic",
    raceAffinities: ["sylvan", "lumina"],
    positionAffinities: ["runner", "receiver"],
    statBonuses: { speed: 3, agility: 2 }
  },
  "strong_arm": {
    id: "strong_arm",
    name: "Strong Arm",
    description: "Increased throwing power and accuracy",
    tier: "basic",
    raceAffinities: ["human", "gryll"],
    positionAffinities: ["quarterback", "thrower"],
    statBonuses: { throwing: 4, power: 2 }
  },
  "iron_will": {
    id: "iron_will",
    name: "Iron Will",
    description: "Mental toughness and improved leadership",
    tier: "basic",
    raceAffinities: ["human", "umbra"],
    positionAffinities: ["captain", "leader"],
    statBonuses: { leadership: 5, stamina: 2 }
  },
  "sure_hands": {
    id: "sure_hands",
    name: "Sure Hands",
    description: "Reliable catching in all conditions",
    tier: "basic",
    raceAffinities: ["sylvan", "lumina"],
    positionAffinities: ["receiver", "defender"],
    statBonuses: { catching: 4, agility: 1 }
  },
  "endurance": {
    id: "endurance",
    name: "Endurance",
    description: "Superior stamina and recovery",
    tier: "basic",
    raceAffinities: ["gryll", "human"],
    positionAffinities: ["all"],
    statBonuses: { stamina: 5 }
  },

  // Advanced Tier Abilities
  "lightning_reflexes": {
    id: "lightning_reflexes",
    name: "Lightning Reflexes",
    description: "Exceptional reaction time and evasion",
    tier: "advanced",
    raceAffinities: ["sylvan", "lumina"],
    positionAffinities: ["defender", "runner"],
    statBonuses: { agility: 5, speed: 3 },
    prerequisites: ["quick_feet"]
  },
  "cannon_arm": {
    id: "cannon_arm",
    name: "Cannon Arm",
    description: "Devastating throwing power across the field",
    tier: "advanced",
    raceAffinities: ["gryll", "human"],
    positionAffinities: ["quarterback", "thrower"],
    statBonuses: { throwing: 6, power: 4 },
    prerequisites: ["strong_arm"]
  },
  "field_general": {
    id: "field_general",
    name: "Field General",
    description: "Masterful tactical awareness and team coordination",
    tier: "advanced",
    raceAffinities: ["human", "lumina"],
    positionAffinities: ["captain", "quarterback"],
    statBonuses: { leadership: 7, throwing: 2 },
    prerequisites: ["iron_will"]
  },
  "magnetic_hands": {
    id: "magnetic_hands",
    name: "Magnetic Hands",
    description: "Nearly impossible to drop catches",
    tier: "advanced",
    raceAffinities: ["sylvan", "lumina"],
    positionAffinities: ["receiver", "defender"],
    statBonuses: { catching: 7, agility: 2 },
    prerequisites: ["sure_hands"]
  },
  "unstoppable_force": {
    id: "unstoppable_force",
    name: "Unstoppable Force",
    description: "Overwhelming power breaks through any defense",
    tier: "advanced",
    raceAffinities: ["gryll", "umbra"],
    positionAffinities: ["blocker", "runner"],
    statBonuses: { power: 6, stamina: 3 }
  },

  // Godly Tier Abilities
  "time_warp": {
    id: "time_warp",
    name: "Time Warp",
    description: "Supernatural speed that bends time itself",
    tier: "godly",
    raceAffinities: ["sylvan"],
    positionAffinities: ["runner", "receiver"],
    statBonuses: { speed: 10, agility: 8 },
    prerequisites: ["lightning_reflexes"],
    conflictsWith: ["dimensional_arm"]
  },
  "dimensional_arm": {
    id: "dimensional_arm",
    name: "Dimensional Arm",
    description: "Throws that transcend physical limitations",
    tier: "godly",
    raceAffinities: ["lumina"],
    positionAffinities: ["quarterback", "thrower"],
    statBonuses: { throwing: 12, power: 6 },
    prerequisites: ["cannon_arm"],
    conflictsWith: ["time_warp"]
  },
  "mind_meld": {
    id: "mind_meld",
    name: "Mind Meld",
    description: "Psychic connection with all teammates",
    tier: "godly",
    raceAffinities: ["lumina", "umbra"],
    positionAffinities: ["captain", "quarterback"],
    statBonuses: { leadership: 15, catching: 5 },
    prerequisites: ["field_general"]
  },
  "shadow_step": {
    id: "shadow_step",
    name: "Shadow Step",
    description: "Phase through opponents like a shadow",
    tier: "godly",
    raceAffinities: ["umbra"],
    positionAffinities: ["runner", "defender"],
    statBonuses: { agility: 12, speed: 6 },
    prerequisites: ["lightning_reflexes"]
  },
  "titans_strength": {
    id: "titans_strength",
    name: "Titan's Strength",
    description: "Legendary power of ancient titans",
    tier: "godly",
    raceAffinities: ["gryll"],
    positionAffinities: ["blocker", "runner"],
    statBonuses: { power: 15, stamina: 8 },
    prerequisites: ["unstoppable_force"]
  }
};

export function getAbilityById(id: string): Ability | undefined {
  return ABILITIES[id];
}

export function getAbilitiesByTier(tier: "basic" | "advanced" | "godly"): Ability[] {
  return Object.values(ABILITIES).filter(ability => ability.tier === tier);
}

export function getAvailableAbilities(player: any): Ability[] {
  const currentAbilityIds = player.abilities || [];
  const currentAbilities = currentAbilityIds.map(getAbilityById).filter(Boolean);
  
  return Object.values(ABILITIES).filter(ability => {
    // Already has this ability
    if (currentAbilityIds.includes(ability.id)) return false;
    
    // Check conflicts
    if (ability.conflictsWith?.some(conflictId => currentAbilityIds.includes(conflictId))) return false;
    
    // Check prerequisites
    if (ability.prerequisites?.some(prereqId => !currentAbilityIds.includes(prereqId))) return false;
    
    // Check if player already has 3 abilities
    if (currentAbilityIds.length >= 3) return false;
    
    return true;
  });
}

export function calculateAbilityChance(ability: Ability, player: any): number {
  let baseChance = 0;
  
  // Base chances by tier
  switch (ability.tier) {
    case "basic": baseChance = 0.15; break;
    case "advanced": baseChance = 0.05; break;
    case "godly": baseChance = 0.01; break;
  }
  
  // Race affinity bonus
  if (ability.raceAffinities.includes(player.race)) {
    baseChance *= 2;
  }
  
  // Position affinity bonus
  if (ability.positionAffinities.includes(player.position) || ability.positionAffinities.includes("all")) {
    baseChance *= 1.5;
  }
  
  // Age factor (younger players more likely to gain abilities)
  if (player.age < 25) {
    baseChance *= 1.2;
  } else if (player.age > 30) {
    baseChance *= 0.8;
  }
  
  return Math.min(baseChance, 0.5); // Cap at 50%
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