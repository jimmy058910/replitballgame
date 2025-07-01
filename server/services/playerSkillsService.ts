import { db } from '../db.js';
import { players, skills, playerSkills } from '../../shared/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { getPlayerRole } from '../../shared/playerUtils.js';

export class PlayerSkillsService {
  /**
   * Calculate a player's skill-up chance based on their leadership stat
   */
  static calculateSkillUpChance(player: any): number {
    const BASE_CHANCE = 5; // 5% base chance
    const LEADERSHIP_MODIFIER = 0.25; // 0.25% per leadership point
    return BASE_CHANCE + (player.leadership * LEADERSHIP_MODIFIER);
  }

  /**
   * Check if a player is eligible for a specific skill
   */
  static isEligibleForSkill(player: any, skill: any): boolean {
    // Universal skills - always eligible
    if (skill.category === 'Universal') {
      return true;
    }

    // Role-specific skills
    if (skill.category === 'Role') {
      const playerRole = getPlayerRole(player);
      return skill.roleRequirement === playerRole;
    }

    // Race-specific skills
    if (skill.category === 'Race') {
      return skill.raceRequirement === player.race;
    }

    return false;
  }

  /**
   * Get all skills a player is eligible for but doesn't have
   */
  static async getEligibleSkills(playerId: string): Promise<any[]> {
    // Get player data
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    if (!player) return [];

    // Get all skills
    const allSkills = await db.select().from(skills);

    // Get player's current skills
    const currentPlayerSkills = await db
      .select({ skillId: playerSkills.skillId })
      .from(playerSkills)
      .where(eq(playerSkills.playerId, playerId));

    const currentSkillIds = currentPlayerSkills.map(ps => ps.skillId);

    // Filter to eligible skills the player doesn't have
    return allSkills.filter(skill => 
      !currentSkillIds.includes(skill.id) && 
      this.isEligibleForSkill(player, skill)
    );
  }

  /**
   * Get all skills a player currently has with their tiers
   */
  static async getPlayerSkills(playerId: string): Promise<any[]> {
    const result = await db
      .select({
        id: playerSkills.id,
        skillId: playerSkills.skillId,
        currentTier: playerSkills.currentTier,
        acquiredAt: playerSkills.acquiredAt,
        lastUpgraded: playerSkills.lastUpgraded,
        name: skills.name,
        description: skills.description,
        type: skills.type,
        category: skills.category,
        tier1Effect: skills.tier1Effect,
        tier2Effect: skills.tier2Effect,
        tier3Effect: skills.tier3Effect,
        tier4Effect: skills.tier4Effect,
        tier1StatBonus: skills.tier1StatBonus,
        tier2StatBonus: skills.tier2StatBonus,
        tier3StatBonus: skills.tier3StatBonus,
        tier4StatBonus: skills.tier4StatBonus,
      })
      .from(playerSkills)
      .innerJoin(skills, eq(playerSkills.skillId, skills.id))
      .where(eq(playerSkills.playerId, playerId))
      .orderBy(desc(playerSkills.acquiredAt));

    return result;
  }

  /**
   * Count how many skills a player currently has
   */
  static async getPlayerSkillCount(playerId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(playerSkills)
      .where(eq(playerSkills.playerId, playerId));

    return result[0]?.count || 0;
  }

  /**
   * Acquire a new skill for a player (Tier 1)
   */
  static async acquireSkill(playerId: string, skillId: number): Promise<boolean> {
    try {
      // Check if player already has this skill
      const existing = await db
        .select()
        .from(playerSkills)
        .where(and(
          eq(playerSkills.playerId, playerId),
          eq(playerSkills.skillId, skillId)
        ));

      if (existing.length > 0) {
        return false; // Already has this skill
      }

      // Check skill limit (3 max)
      const currentCount = await this.getPlayerSkillCount(playerId);
      if (currentCount >= 3) {
        return false; // Skill limit reached
      }

      // Add the skill at Tier 1
      await db.insert(playerSkills).values({
        playerId,
        skillId,
        currentTier: 1,
        acquiredAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Error acquiring skill:', error);
      return false;
    }
  }

  /**
   * Upgrade an existing skill to the next tier
   */
  static async upgradeSkill(playerId: string, skillId: number): Promise<boolean> {
    try {
      // Get current skill data
      const [currentSkill] = await db
        .select()
        .from(playerSkills)
        .where(and(
          eq(playerSkills.playerId, playerId),
          eq(playerSkills.skillId, skillId)
        ));

      if (!currentSkill || currentSkill.currentTier >= 4) {
        return false; // Skill not found or already max tier
      }

      // Upgrade to next tier
      await db
        .update(playerSkills)
        .set({
          currentTier: currentSkill.currentTier + 1,
          lastUpgraded: new Date(),
        })
        .where(eq(playerSkills.id, currentSkill.id));

      return true;
    } catch (error) {
      console.error('Error upgrading skill:', error);
      return false;
    }
  }

  /**
   * Process skill-up event for a player
   * Returns details about what happened
   */
  static async processSkillUpEvent(playerId: string): Promise<{
    success: boolean;
    action: 'acquired' | 'upgraded' | 'none';
    skillName?: string;
    newTier?: number;
    reason?: string;
  }> {
    try {
      const currentCount = await this.getPlayerSkillCount(playerId);
      
      if (currentCount < 3) {
        // Acquire a new skill
        const eligibleSkills = await this.getEligibleSkills(playerId);
        
        if (eligibleSkills.length === 0) {
          return { success: false, action: 'none', reason: 'No eligible skills available' };
        }

        // Select random eligible skill
        const randomSkill = eligibleSkills[Math.floor(Math.random() * eligibleSkills.length)];
        const acquired = await this.acquireSkill(playerId, randomSkill.id);

        if (acquired) {
          return {
            success: true,
            action: 'acquired',
            skillName: randomSkill.name,
            newTier: 1
          };
        }
      } else {
        // Upgrade existing skill
        const currentSkills = await this.getPlayerSkills(playerId);
        const upgradableSkills = currentSkills.filter(skill => skill.currentTier < 4);

        if (upgradableSkills.length === 0) {
          return { success: false, action: 'none', reason: 'All skills are max tier' };
        }

        // Select random upgradable skill
        const randomSkill = upgradableSkills[Math.floor(Math.random() * upgradableSkills.length)];
        const upgraded = await this.upgradeSkill(playerId, randomSkill.skillId);

        if (upgraded) {
          return {
            success: true,
            action: 'upgraded',
            skillName: randomSkill.name,
            newTier: randomSkill.currentTier + 1
          };
        }
      }

      return { success: false, action: 'none', reason: 'Unknown error' };
    } catch (error) {
      console.error('Error processing skill-up event:', error);
      return { success: false, action: 'none', reason: 'Database error' };
    }
  }

  /**
   * Process end-of-season skill progression for a team
   */
  static async processSeasonSkillProgression(teamId: string): Promise<{
    totalPlayers: number;
    skillUpsOccurred: number;
    results: Array<{
      playerId: string;
      playerName: string;
      skillUpChance: number;
      rolled: number;
      success: boolean;
      action?: 'acquired' | 'upgraded';
      skillName?: string;
      newTier?: number;
    }>;
  }> {
    // Get all players on the team
    const teamPlayers = await db
      .select()
      .from(players)
      .where(eq(players.teamId, teamId));

    const results = [];
    let skillUpsOccurred = 0;

    for (const player of teamPlayers) {
      const skillUpChance = this.calculateSkillUpChance(player);
      const rolled = Math.random() * 100;
      const success = rolled < skillUpChance;

      const result = {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        skillUpChance,
        rolled,
        success,
      };

      if (success) {
        const skillUpResult = await this.processSkillUpEvent(player.id);
        if (skillUpResult.success) {
          skillUpsOccurred++;
          Object.assign(result, {
            action: skillUpResult.action,
            skillName: skillUpResult.skillName,
            newTier: skillUpResult.newTier,
          });
        }
      }

      results.push(result);
    }

    return {
      totalPlayers: teamPlayers.length,
      skillUpsOccurred,
      results,
    };
  }

  /**
   * Get skill effects for a player (used in match simulation)
   */
  static async getPlayerSkillEffects(playerId: string): Promise<{
    passiveEffects: any;
    activeSkills: any[];
  }> {
    const playerSkillsData = await this.getPlayerSkills(playerId);
    
    const passiveEffects = {
      allStats: 0,
      injuryReduction: 0,
      recoveryBonus: 0,
      passAccuracy: 0,
      staminaRecoveryRate: 0,
      defensiveAgility: 0,
      equipmentBonus: 0,
      blockingRadius: 0,
      crossRoleEfficiency: 1.0,
    };

    const activeSkills = [];

    for (const skill of playerSkillsData) {
      const tier = skill.currentTier;
      let statBonus;
      
      switch (tier) {
        case 1: statBonus = skill.tier1StatBonus; break;
        case 2: statBonus = skill.tier2StatBonus; break;
        case 3: statBonus = skill.tier3StatBonus; break;
        case 4: statBonus = skill.tier4StatBonus; break;
        default: continue;
      }

      if (skill.type === 'Passive' && statBonus) {
        // Apply passive effects
        Object.keys(statBonus).forEach(key => {
          if (passiveEffects.hasOwnProperty(key)) {
            passiveEffects[key] += statBonus[key];
          }
        });
      } else if (skill.type === 'Active') {
        // Store active skills for trigger checking
        activeSkills.push({
          name: skill.name,
          effects: statBonus,
          description: skill[`tier${tier}Effect`],
        });
      }
    }

    return { passiveEffects, activeSkills };
  }

  /**
   * Get all skills in database
   */
  static async getAllSkills(): Promise<any[]> {
    return await db.select().from(skills).orderBy(skills.category, skills.name);
  }

  /**
   * Get skill by ID
   */
  static async getSkillById(skillId: number): Promise<any | null> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, skillId));
    return skill || null;
  }
}