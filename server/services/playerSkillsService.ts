import { getPrismaClient } from "../database.js";
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
    const prisma = await getPrismaClient();
    // Get player data
    const player = await prisma.player.findFirst({
      where: { id: parseInt(playerId) }
    });
    if (!player) return [];

    // Get all skills
    const allSkills = await prisma.skill.findMany();

    // Get player's current skills
    const currentPlayerSkills = await prisma.playerSkillLink.findMany({
      where: { playerId: parseInt(playerId) },
      select: { skillId: true }
    });

    const currentSkillIds = currentPlayerSkills.map((ps: any) => ps.skillId);

    // Filter to eligible skills the player doesn't have
    return allSkills.filter((skill: any) => 
      !currentSkillIds.includes(skill.id) && 
      this.isEligibleForSkill(player, skill)
    );
  }

  /**
   * Get all skills a player currently has with their tiers
   */
  static async getPlayerSkills(playerId: string): Promise<any[]> {
    const result = await prisma.playerSkillLink.findMany({
      where: { playerId: parseInt(playerId) },
      include: {
        skill: true
      }
    });

    return result.map((ps: any) => ({
      id: ps.id,
      skillId: ps.skillId,
      currentTier: ps.currentTier,
      acquiredAt: ps.acquiredAt,
      name: ps.skill.name,
      description: ps.skill.description,
      type: ps.skill.type,
      category: ps.skill.category,
      tiers: ps.skill.tiers
    }));
  }

  /**
   * Count how many skills a player currently has
   */
  static async getPlayerSkillCount(playerId: string): Promise<number> {
    const result = await prisma.playerSkillLink.count({
      where: { playerId: parseInt(playerId) }
    });

    return result || 0;
  }

  /**
   * Acquire a new skill for a player (Tier 1)
   */
  static async acquireSkill(playerId: string, skillId: number): Promise<boolean> {
    try {
      // Check if player already has this skill
      const existing = await prisma.playerSkillLink.findFirst({
        where: {
          playerId: parseInt(playerId),
          skillId: skillId
        }
      });

      if (existing) {
        return false; // Already has this skill
      }

      // Check skill limit (3 max)
      const currentCount = await this.getPlayerSkillCount(playerId);
      if (currentCount >= 3) {
        return false; // Skill limit reached
      }

      // Add the skill at Tier 1
      await prisma.playerSkillLink.create({
        data: {
          playerId: parseInt(playerId),
          skillId,
          currentTier: 1,
          acquiredAt: new Date(),
        }
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
      const currentSkill = await prisma.playerSkillLink.findFirst({
        where: {
          playerId: parseInt(playerId),
          skillId: skillId
        }
      });

      if (!currentSkill || currentSkill.currentTier >= 4) {
        return false; // Skill not found or already max tier
      }

      // Upgrade to next tier
      await prisma.playerSkillLink.update({
        where: { id: currentSkill.id },
        data: {
          currentTier: currentSkill.currentTier + 1,
        }
      });

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
        const upgradableSkills = currentSkills.filter((skill: any) => skill.currentTier < 4);

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
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: parseInt(teamId) }
    });

    const results = [];
    let skillUpsOccurred = 0;

    for (const player of teamPlayers) {
      const skillUpChance = this.calculateSkillUpChance(player);
      const rolled = Math.random() * 100;
      const success = rolled < skillUpChance;

      const result = {
        playerId: player.id.toString(),
        playerName: `${player.firstName} ${player.lastName}`,
        skillUpChance,
        rolled,
        success,
      };

      if (success) {
        const skillUpResult = await this.processSkillUpEvent(player.id.toString());
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
          if (key in passiveEffects) {
            passiveEffects[key as keyof typeof passiveEffects] += statBonus[key];
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
    return await prisma.skill.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Get skill by ID
   */
  static async getSkillById(skillId: number): Promise<any | null> {
    const skill = await prisma.skill.findFirst({
      where: { id: skillId }
    });
    return skill || null;
  }
}