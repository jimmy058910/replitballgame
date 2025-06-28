import { storage } from "./storage";
import type { InsertSkill } from "@shared/schema";

const skillsData: Omit<InsertSkill, 'id'>[] = [
  // Universal Skills
  {
    name: "Second Wind",
    description: "When in-game stamina drops below 20%, instantly recover stamina points",
    type: "Passive",
    category: "Universal",
    roleRestriction: null,
    raceRestriction: null,
    tierEffects: {
      1: { staminaRecovery: 10, triggerOnce: true },
      2: { staminaRecovery: 15, triggerOnce: true },
      3: { staminaRecovery: 20, triggerOnce: true },
      4: { staminaRecovery: 25, triggerOnce: true }
    },
    triggerCondition: "stamina < 20"
  },
  {
    name: "Clutch Performer",
    description: "In the final 2 minutes of a half, gain attribute bonuses",
    type: "Passive",
    category: "Universal",
    roleRestriction: null,
    raceRestriction: null,
    tierEffects: {
      1: { allAttributesBonus: 1 },
      2: { allAttributesBonus: 2 },
      3: { allAttributesBonus: 3 },
      4: { allAttributesBonus: 4 }
    },
    triggerCondition: "timeRemaining <= 120"
  },
  {
    name: "Durable",
    description: "Reduce the chance of receiving a lasting injury from any single tackle",
    type: "Passive",
    category: "Universal",
    roleRestriction: null,
    raceRestriction: null,
    tierEffects: {
      1: { injuryResistance: 5 },
      2: { injuryResistance: 10 },
      3: { injuryResistance: 15 },
      4: { injuryResistance: 20 }
    },
    triggerCondition: null
  },
  {
    name: "Quick Recovery",
    description: "Increases the amount of daily stamina recovered during the daily reset",
    type: "Passive",
    category: "Universal",
    roleRestriction: null,
    raceRestriction: null,
    tierEffects: {
      1: { dailyStaminaBonus: 10 },
      2: { dailyStaminaBonus: 20 },
      3: { dailyStaminaBonus: 30 },
      4: { dailyStaminaBonus: 40 }
    },
    triggerCondition: null
  },

  // Role-Specific Skills - Passer
  {
    name: "Deadeye",
    description: "Reduces pass inaccuracy from the throwing stat",
    type: "Passive",
    category: "Role",
    roleRestriction: "Passer",
    raceRestriction: null,
    tierEffects: {
      1: { passAccuracyBonus: 15 },
      2: { passAccuracyBonus: 25 },
      3: { passAccuracyBonus: 35 },
      4: { passAccuracyBonus: 50 }
    },
    triggerCondition: null
  },
  {
    name: "Pocket Presence",
    description: "When pressured, chance to automatically evade, giving more time to throw",
    type: "Active",
    category: "Role",
    roleRestriction: "Passer",
    raceRestriction: null,
    tierEffects: {
      1: { evadeChance: 10 },
      2: { evadeChance: 15 },
      3: { evadeChance: 20 },
      4: { evadeChance: 25 }
    },
    triggerCondition: "underPressure"
  },

  // Role-Specific Skills - Runner
  {
    name: "Juke Move",
    description: "On a tackle attempt, chance to completely evade the tackler",
    type: "Active",
    category: "Role",
    roleRestriction: "Runner",
    raceRestriction: null,
    tierEffects: {
      1: { evadeChance: 10 },
      2: { evadeChance: 15 },
      3: { evadeChance: 20 },
      4: { evadeChance: 25 }
    },
    triggerCondition: "tackleAttempt"
  },
  {
    name: "Truck Stick",
    description: "On a tackle attempt, chance to run through the defender, causing them to stumble",
    type: "Active",
    category: "Role",
    roleRestriction: "Runner",
    raceRestriction: null,
    tierEffects: {
      1: { breakTackleChance: 10 },
      2: { breakTackleChance: 15 },
      3: { breakTackleChance: 20 },
      4: { breakTackleChance: 25 }
    },
    triggerCondition: "tackleAttempt"
  },

  // Role-Specific Skills - Blocker
  {
    name: "Pancake Block",
    description: "A successful aggressive tackle has a chance to cause a longer knockdown duration",
    type: "Active",
    category: "Role",
    roleRestriction: "Blocker",
    raceRestriction: null,
    tierEffects: {
      1: { knockdownChance: 25 },
      2: { knockdownChance: 40 },
      3: { knockdownChance: 55 },
      4: { knockdownChance: 70 }
    },
    triggerCondition: "successfulBlock"
  },
  {
    name: "Bodyguard",
    description: "Increases the blocking engagement radius when supporting a teammate with the ball",
    type: "Passive",
    category: "Role",
    roleRestriction: "Blocker",
    raceRestriction: null,
    tierEffects: {
      1: { blockingRadiusBonus: 10 },
      2: { blockingRadiusBonus: 15 },
      3: { blockingRadiusBonus: 20 },
      4: { blockingRadiusBonus: 25 }
    },
    triggerCondition: null
  },

  // Race-Specific Skills - Sylvan
  {
    name: "Photosynthesis",
    description: "Slightly increases in-game stamina recovery rate",
    type: "Passive",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Sylvan",
    tierEffects: {
      1: { staminaRegenRate: 5 },
      2: { staminaRegenRate: 8 },
      3: { staminaRegenRate: 12 },
      4: { staminaRegenRate: 15 }
    },
    triggerCondition: null
  },

  // Race-Specific Skills - Gryll
  {
    name: "Unshakeable",
    description: "When targeted by a block or non-carrier tackle, gain a bonus to your Agility",
    type: "Passive",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Gryll",
    tierEffects: {
      1: { agilityBonus: 3 },
      2: { agilityBonus: 6 },
      3: { agilityBonus: 9 },
      4: { agilityBonus: 12 }
    },
    triggerCondition: "beingBlocked"
  },
  {
    name: "Master Craftsman",
    description: "Equipment worn by this player receives a bonus to all its positive stat effects",
    type: "Passive",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Gryll",
    tierEffects: {
      1: { equipmentBonus: 5 },
      2: { equipmentBonus: 10 },
      3: { equipmentBonus: 15 },
      4: { equipmentBonus: 20 }
    },
    triggerCondition: null
  },

  // Race-Specific Skills - Lumina
  {
    name: "Healing Light",
    description: "Once per game, after this player scores, a random injured teammate recovers injury points",
    type: "Active",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Lumina",
    tierEffects: {
      1: { healingAmount: 20 },
      2: { healingAmount: 30 },
      3: { healingAmount: 40 },
      4: { healingAmount: 50 }
    },
    triggerCondition: "afterScoring"
  },

  // Race-Specific Skills - Umbra
  {
    name: "Shadow Step",
    description: "When running with the ball, chance to become stealthed, making you untargetable by Blockers",
    type: "Active",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Umbra",
    tierEffects: {
      1: { stealthChance: 5 },
      2: { stealthChance: 8 },
      3: { stealthChance: 12 },
      4: { stealthChance: 15 }
    },
    triggerCondition: "runningWithBall"
  },

  // Race-Specific Skills - Human
  {
    name: "Adaptable",
    description: "Allows the player to learn 1 skill from a different role's skill list",
    type: "Passive",
    category: "Race",
    roleRestriction: null,
    raceRestriction: "Human",
    tierEffects: {
      1: { crossRoleEffectiveness: 50 },
      2: { crossRoleEffectiveness: 65 },
      3: { crossRoleEffectiveness: 80 },
      4: { crossRoleEffectiveness: 100 }
    },
    triggerCondition: null
  }
];

export async function seedSkills() {
  console.log("Seeding skills...");
  
  try {
    // Check if skills already exist
    const existingSkills = await storage.getAllSkills();
    if (existingSkills.length > 0) {
      console.log("Skills already seeded, skipping...");
      return;
    }
    
    // Insert all skills
    for (const skill of skillsData) {
      await storage.createSkill(skill);
      console.log(`Created skill: ${skill.name}`);
    }
    
    console.log(`Successfully seeded ${skillsData.length} skills!`);
  } catch (error) {
    console.error("Error seeding skills:", error);
    throw error;
  }
}

// Allow running from command line
seedSkills()
  .then(() => {
    console.log("Skills seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Skills seeding failed:", error);
    process.exit(1);
  });