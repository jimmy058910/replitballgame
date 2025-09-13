/**
 * DAILY PROGRESSION SYSTEM
 * Implements 3 AM daily reset with small attribute progression chances
 * As per Game Mechanics Doc: "Each day, every player has a small chance (1% + AgeModifier) to gain +1 in a random, eligible attribute"
 */

import { DatabaseService } from '../database/DatabaseService.js';
import { logger } from './loggingService.js';

export interface DailyProgressionResult {
  playersProcessed: number;
  progressionsOccurred: number;
  progressionDetails: Array<{
    playerId: number;
    playerName: string;
    attribute: string;
    oldValue: number;
    newValue: number;
    ageModifier: number;
  }>;
  errors: string[];
}

export interface PlayerProgressionCheck {
  playerId: number;
  name: string;
  age: number;
  currentStats: Record<string, number>;
  progressionChance: number;
  eligibleStats: string[];
}

/**
 * Daily Progression Service
 */
export class DailyProgressionService {
  
  /**
   * All 8 player attributes that can progress
   */
  static readonly ALL_ATTRIBUTES = [
    'speed', 'power', 'throwing', 'catching', 'kicking', 
    'staminaAttribute', 'leadership', 'agility'
  ];

  /**
   * Age modifier configuration for daily progression
   */
  static readonly AGE_MODIFIERS = {
    getModifier: (age: number): number => {
      if (age <= 23) return 2.0; // Young players: +2%
      if (age <= 27) return 1.0; // Prime players: +1% 
      if (age <= 32) return 0.0; // Veteran players: +0%
      return -0.5; // Old players: -0.5%
    }
  };

  /**
   * Base daily progression chance (1% per Game Mechanics Doc)
   */
  static readonly BASE_PROGRESSION_CHANCE = 1.0; // 1%

  /**
   * Process daily progression for all players (run at 3 AM)
   */
  static async processDailyProgression(): Promise<DailyProgressionResult> {
    const prisma = await DatabaseService.getInstance();
    const result: DailyProgressionResult = {
      playersProcessed: 0,
      progressionsOccurred: 0,
      progressionDetails: [],
      errors: []
    };

    try {
      // Get all active players (those with contracts or on teams)
      const players = await prisma.player.findMany({
        where: {
          OR: [
            { teamId: { not: null } }, // Players on teams
            { contract: { isNot: null } } // Players with contracts
          ]
        },
        include: {
          team: {
            select: { name: true }
          }
        }
      });

      logger.info(`Starting daily progression for ${players.length} players`);

      for (const player of players) {
        try {
          result.playersProcessed++;
          
          // Calculate progression chance
          const ageModifier = this.AGE_MODIFIERS.getModifier(player.age || 20);
          const totalChance = this.BASE_PROGRESSION_CHANCE + ageModifier;
          
          // Skip if no chance of progression
          if (totalChance <= 0) continue;
          
          // Roll for progression
          const progressionRoll = Math.random() * 100; // 0-100
          
          if (progressionRoll < totalChance) {
            // Progression occurs! Choose random eligible attribute
            const eligibleStats = this.getEligibleStats(player);
            
            if (eligibleStats.length === 0) {
              // No eligible stats for this player
              continue;
            }
            
            const randomStat = eligibleStats[Math.floor(Math.random() * eligibleStats.length)];
            const oldValue = (player as any)[randomStat] || 1;
            const newValue = Math.min(40, oldValue + 1); // Cap at 40
            
            // Update the player's stat
            await prisma.player.update({
              where: { id: player.id },
              data: {
                [randomStat]: newValue,
                updatedAt: new Date()
              }
            });
            
            // Record the progression
            result.progressionsOccurred++;
            result.progressionDetails.push({
              playerId: player.id,
              playerName: `${player.firstName} ${player.lastName}`,
              attribute: randomStat,
              oldValue,
              newValue,
              ageModifier
            });
            
            logger.info(`Daily progression: ${player.firstName} ${player.lastName} - ${randomStat} ${oldValue} → ${newValue}`, {
              playerId: player.id,
              teamName: player.team?.name,
              age: player.age,
              progressionChance: totalChance
            });

            // Create progression history record
            await this.createProgressionHistory(prisma, {
              playerId: player.id,
              progressionType: 'daily',
              attribute: randomStat,
              oldValue,
              newValue,
              ageModifier,
              totalChance
            });
          }
        } catch (playerError) {
          const errorMsg = `Error processing player ${player.firstName} ${player.lastName}: ${playerError instanceof Error ? playerError.message : String(playerError)}`;
          result.errors.push(errorMsg);
          logger.error('Daily progression player error', {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            error: errorMsg
          });
        }
      }
    } catch (error) {
      const errorMsg = `System error in daily progression: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error('Daily progression system error', { error: errorMsg });
    }

    logger.info('Daily progression completed', {
      playersProcessed: result.playersProcessed,
      progressionsOccurred: result.progressionsOccurred,
      errorCount: result.errors.length
    });

    return result;
  }

  /**
   * Get eligible stats for progression (stats under their potential cap)
   */
  private static getEligibleStats(player: any): string[] {
    const eligible: string[] = [];
    
    for (const stat of this.ALL_ATTRIBUTES) {
      const currentValue = player[stat] || 1;
      
      // Stats can progress if they're under 40 and under potential cap
      if (currentValue < 40) {
        // Calculate potential cap for this stat
        const potentialCap = this.calculateStatPotentialCap(player, stat);
        
        if (currentValue < potentialCap) {
          eligible.push(stat);
        }
      }
    }
    
    return eligible;
  }

  /**
   * Calculate the potential cap for a specific stat
   */
  private static calculateStatPotentialCap(player: any, statName: string): number {
    const potentialRating = player.potentialRating || 2.0;
    
    // Convert potential rating to stat cap (0.5 → 4, 5.0 → 40)
    const baseCap = Math.round(potentialRating * 8);
    
    // Add some variance (±2) to make caps less rigid
    const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
    
    return Math.min(40, Math.max(baseCap + variance, 8)); // Min 8, Max 40
  }

  /**
   * Create progression history record
   */
  private static async createProgressionHistory(
    prisma: any,
    data: {
      playerId: number;
      progressionType: string;
      attribute: string;
      oldValue: number;
      newValue: number;
      ageModifier: number;
      totalChance: number;
    }
  ): Promise<void> {
    try {
      // Create progression history record if the model exists
      // This would need to be added to the Prisma schema
      /*
      await prisma.progressionHistory.create({
        data: {
          playerId: data.playerId,
          progressionType: data.progressionType,
          attribute: data.attribute,
          oldValue: data.oldValue,
          newValue: data.newValue,
          ageModifier: data.ageModifier,
          progressionChance: data.totalChance,
          occurredAt: new Date()
        }
      });
      */
      
      // For now, just log the progression
      logger.info('Progression history created', data);
    } catch (error) {
      logger.error('Failed to create progression history', {
        error: error instanceof Error ? error.message : String(error),
        data
      });
    }
  }

  /**
   * Get daily progression statistics
   */
  static async getDailyProgressionStats(days: number = 7): Promise<{
    totalProgressions: number;
    averagePerDay: number;
    attributeBreakdown: Record<string, number>;
    ageGroupBreakdown: Record<string, number>;
  }> {
    const prisma = await DatabaseService.getInstance();
    
    try {
      // This would require a progressionHistory table
      // For now, return placeholder stats
      return {
        totalProgressions: 0,
        averagePerDay: 0,
        attributeBreakdown: {},
        ageGroupBreakdown: {}
      };
    } catch (error) {
      logger.error('Failed to get progression stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalProgressions: 0,
        averagePerDay: 0,
        attributeBreakdown: {},
        ageGroupBreakdown: {}
      };
    }
  }

  /**
   * Check which players are eligible for daily progression
   */
  static async getProgressionEligibilityReport(): Promise<PlayerProgressionCheck[]> {
    const prisma = await DatabaseService.getInstance();
    const report: PlayerProgressionCheck[] = [];

    try {
      const players = await prisma.player.findMany({
        where: {
          OR: [
            { teamId: { not: null } },
            { contract: { isNot: null } }
          ]
        },
        take: 20 // Limit for performance
      });

      for (const player of players) {
        const ageModifier = this.AGE_MODIFIERS.getModifier(player.age || 20);
        const progressionChance = this.BASE_PROGRESSION_CHANCE + ageModifier;
        const eligibleStats = this.getEligibleStats(player);

        const currentStats: Record<string, number> = {};
        for (const stat of this.ALL_ATTRIBUTES) {
          currentStats[stat] = (player as any)[stat] || 1;
        }

        report.push({
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          age: player.age || 20,
          currentStats,
          progressionChance,
          eligibleStats
        });
      }
    } catch (error) {
      logger.error('Failed to generate progression eligibility report', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return report;
  }

  /**
   * Manually trigger daily progression (for testing/admin)
   */
  static async triggerManualProgression(playerId: number): Promise<{
    success: boolean;
    progression?: {
      attribute: string;
      oldValue: number;
      newValue: number;
    };
    message: string;
  }> {
    const prisma = await DatabaseService.getInstance();

    try {
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        return { success: false, message: 'Player not found' };
      }

      const eligibleStats = this.getEligibleStats(player);
      
      if (eligibleStats.length === 0) {
        return { success: false, message: 'No eligible stats for progression' };
      }

      const randomStat = eligibleStats[Math.floor(Math.random() * eligibleStats.length)];
      const oldValue = (player as any)[randomStat] || 1;
      const newValue = Math.min(40, oldValue + 1);

      await prisma.player.update({
        where: { id: playerId },
        data: {
          [randomStat]: newValue,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        progression: {
          attribute: randomStat,
          oldValue,
          newValue
        },
        message: `${player.firstName} ${player.lastName} gained +1 ${randomStat} (${oldValue} → ${newValue})`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export default DailyProgressionService;