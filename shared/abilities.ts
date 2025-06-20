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
  // BASIC TIER ABILITIES
  "swift_feet": {
    id: "swift_feet",
    name: "Swift Feet",
    description: "Enhanced running speed and acceleration",
    tier: "basic",
    raceAffinities: ["elf", "fae"],
    positionAffinities: ["runner", "receiver"],
    statBonuses: { speed: 3, agility: 2 }
  },
  "iron_grip": {
    id: "iron_grip",
    name: "Iron Grip",
    description: "Exceptional ball handling and catching ability",
    tier: "basic",
    raceAffinities: ["dwarf", "orc"],
    positionAffinities: ["receiver", "quarterback"],
    statBonuses: { catching: 4 }
  },
  "strong_arm": {
    id: "strong_arm",
    name: "Strong Arm",
    description: "Increased throwing power and accuracy",
    tier: "basic",
    raceAffinities: ["orc", "human"],
    positionAffinities: ["quarterback"],
    statBonuses: { throwing: 4, power: 2 }
  },
  "iron_will": {
    id: "iron_will",
    name: "Iron Will",
    description: "Mental fortitude and leadership under pressure",
    tier: "basic",
    raceAffinities: ["human", "dwarf"],
    positionAffinities: ["captain", "quarterback"],
    statBonuses: { leadership: 3, stamina: 2 }
  },
  "nimble_dodge": {
    id: "nimble_dodge",
    name: "Nimble Dodge",
    description: "Enhanced evasion and mobility",
    tier: "basic",
    raceAffinities: ["elf", "fae"],
    positionAffinities: ["runner", "receiver"],
    statBonuses: { agility: 4, speed: 1 }
  },
  "power_block": {
    id: "power_block",
    name: "Power Block",
    description: "Devastating blocking and tackling strength",
    tier: "basic",
    raceAffinities: ["orc", "dwarf"],
    positionAffinities: ["blocker", "defender"],
    statBonuses: { power: 4, stamina: 1 }
  },

  // ADVANCED TIER ABILITIES
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
    raceAffinities: ["fae", "lumina"],
    positionAffinities: ["receiver"],
    statBonuses: { catching: 8, agility: 2 },
    prerequisites: ["iron_grip"]
  },
  "lightning_step": {
    id: "lightning_step",
    name: "Lightning Step",
    description: "Burst of incredible speed",
    tier: "advanced",
    raceAffinities: ["elf", "fae"],
    positionAffinities: ["runner", "receiver"],
    statBonuses: { speed: 7, agility: 3 },
    prerequisites: ["swift_feet", "nimble_dodge"]
  },
  "cannon_arm": {
    id: "cannon_arm",
    name: "Cannon Arm",
    description: "Incredible throwing power and precision",
    tier: "advanced",
    raceAffinities: ["orc", "titan"],
    positionAffinities: ["quarterback"],
    statBonuses: { throwing: 8, power: 3 },
    prerequisites: ["strong_arm"]
  },
  "immovable_object": {
    id: "immovable_object",
    name: "Immovable Object",
    description: "Unstoppable blocking force",
    tier: "advanced",
    raceAffinities: ["titan", "dwarf"],
    positionAffinities: ["blocker"],
    statBonuses: { power: 8, stamina: 4 },
    prerequisites: ["power_block"]
  },
  "sixth_sense": {
    id: "sixth_sense",
    name: "Sixth Sense",
    description: "Supernatural awareness of field dynamics",
    tier: "advanced",
    raceAffinities: ["lumina", "fae"],
    positionAffinities: ["defender", "captain"],
    statBonuses: { agility: 5, leadership: 4 },
    prerequisites: ["nimble_dodge", "iron_will"]
  },

  // GODLY TIER ABILITIES
  "omniscience": {
    id: "omniscience",
    name: "Omniscience",
    description: "Perfect field awareness and strategic foresight",
    tier: "godly",
    raceAffinities: ["lumina"],
    positionAffinities: ["captain", "quarterback"],
    statBonuses: { 
      leadership: 10, throwing: 5, agility: 5, 
      speed: 3, catching: 3, stamina: 5 
    },
    prerequisites: ["field_general", "sixth_sense"]
  },
  "void_hands": {
    id: "void_hands",
    name: "Void Hands",
    description: "Catches that defy physics and reality",
    tier: "godly",
    raceAffinities: ["fae", "lumina"],
    positionAffinities: ["receiver"],
    statBonuses: { 
      catching: 12, agility: 6, speed: 4, 
      throwing: 2, leadership: 2 
    },
    prerequisites: ["magnetic_hands", "lightning_step"]
  },
  "perfect_accuracy": {
    id: "perfect_accuracy",
    name: "Perfect Accuracy",
    description: "Throws that never miss their intended target",
    tier: "godly",
    raceAffinities: ["lumina", "elf"],
    positionAffinities: ["quarterback"],
    statBonuses: { 
      throwing: 12, leadership: 5, speed: 3, 
      agility: 4, catching: 3 
    },
    prerequisites: ["cannon_arm", "field_general"]
  },
  "unstoppable_force": {
    id: "unstoppable_force",
    name: "Unstoppable Force",
    description: "Nothing can stop this player's advance",
    tier: "godly",
    raceAffinities: ["titan", "orc"],
    positionAffinities: ["runner", "blocker"],
    statBonuses: { 
      power: 12, speed: 6, stamina: 8, 
      agility: 2, leadership: 3 
    },
    prerequisites: ["immovable_object", "lightning_step"]
  },
  "divine_transcendence": {
    id: "divine_transcendence",
    name: "Divine Transcendence",
    description: "Mastery of all aspects of the game",
    tier: "godly",
    raceAffinities: ["lumina"],
    positionAffinities: ["captain"],
    statBonuses: { 
      speed: 8, power: 8, throwing: 8, catching: 8, 
      kicking: 8, stamina: 8, leadership: 10, agility: 8 
    },
    prerequisites: ["omniscience", "void_hands", "perfect_accuracy"]
  }
};

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

function getPlayerRole(player: any): string {
  // Simple role determination based on stats
  const { throwing, speed, power, leadership, catching, agility } = player;
  
  if (throwing > 70 && leadership > 60) return "quarterback";
  if (speed > 70 && agility > 65) return "runner";
  if (catching > 70 && speed > 60) return "receiver";
  if (power > 70 && agility < 50) return "blocker";
  if (leadership > 75) return "captain";
  
  return "defender";
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