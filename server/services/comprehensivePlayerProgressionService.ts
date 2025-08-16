import { getPrismaClient } from "../database.js";
import type { Player, Staff } from "@prisma/client";

/**
 * Comprehensive Player Aging and Progression System
 * Based on detailed specifications for minutes-played progression, 
 * staff effects, camaraderie integration, and organic career arcs.
 */
export class ComprehensivePlayerProgressionService {
  
  // Core configuration constants
  private static readonly CONFIG = {
    // Daily Progression
    DAILY_BASE_CHANCE: 5, // Base 5% chance per roll
    ACTIVITY_SCORE_DIVISOR: 5, // Divide activity score by 5 to get number of rolls
    
    // Match type activity score multipliers
    LEAGUE_MINUTES_MULTIPLIER: 10, // (LeagueMinutes/40) * 10
    TOURNAMENT_MINUTES_MULTIPLIER: 7, // (TournamentMinutes/40) * 7
    EXHIBITION_MINUTES_MULTIPLIER: 2, // (ExhibitionMinutes/40) * 2
    PERFORMANCE_BONUS: 5, // +5 for standout performance
    
    // Age modifiers for progression
    AGE_MODIFIERS: {
      YOUTH: { min: 16, max: 23, bonus: 15 }, // +15% for ages 16-23
      PRIME: { min: 24, max: 30, bonus: 5 }, // +5% for ages 24-30
      VETERAN: { min: 31, max: 33, penalty: -20 }, // -20% for ages 31-33
      OLD: { min: 34, max: 99, penalty: -20 } // -20% for ages 34+ (physical stats locked)
    },
    
    // Potential modifiers (10-point scale)
    POTENTIAL_MODIFIERS: {
      1: 5, // 1-2 stars: +5%
      2: 5,
      3: 10, // 3-4 stars: +10%
      4: 10,
      5: 20, // 5-6 stars: +20%
      6: 20,
      7: 30, // 7-8 stars: +30%
      8: 30,
      9: 40, // 9-10 stars: +40%
      10: 40
    },
    
    // Physical stats that can't improve after age 34
    PHYSICAL_STATS: ['speed', 'agility', 'power'],
    
    // All core attributes
    CORE_ATTRIBUTES: ['speed', 'agility', 'power', 'throwing', 'catching', 'kicking', 'leadership', 'stamina'],
    
    // Age-related decline
    DECLINE_BASE_RATE: 2.5, // (age - 30) * 2.5%
    DECLINE_STAT_WEIGHTS: {
      speed: 2, // 2x more likely to decline
      agility: 2, // 2x more likely to decline
      power: 1 // 1x likelihood
    },
    
    // Retirement system
    RETIREMENT_BASE_CHANCES: {
      35: 5, 36: 8, 37: 12, 38: 18, 39: 25,
      40: 35, 41: 50, 42: 65, 43: 80, 44: 95, 45: 100
    },
    INJURY_RETIREMENT_MULTIPLIER: 2, // +2% per career injury
    LOW_USAGE_THRESHOLDS: {
      SEVERE: { threshold: 5, penalty: 15 }, // <5 games worth of minutes: +15%
      MODERATE: { threshold: 10, penalty: 5 } // <10 games worth of minutes: +5%
    },
    
    // Season constants
    SEASON_TOTAL_MINUTES: 560 // 14 games * 40 minutes
  };

  /**
   * Daily Progression Engine (called at 3 AM reset)
   * Processes activity scores and progression rolls for all players
   */
  static async processDailyProgression(): Promise<{
    playersProcessed: number;
    totalProgressions: number;
    errors: string[];
  }> {
    console.log('[DAILY PROGRESSION] Starting comprehensive daily progression system...');
    const startTime = Date.now();
    const errors: string[] = [];
    let playersProcessed = 0;
    let totalProgressions = 0;

    try {
      const prisma = await getPrismaClient();
      // Get all active (non-retired) players
      const players = await prisma.player.findMany({
        where: { isRetired: false },
        include: {
          team: {
            include: {
              staff: true
            }
          }
        }
      });

      console.log(`[DAILY PROGRESSION] Processing ${players.length} active players...`);

      for (const player of players) {
        try {
          // Calculate daily activity score based on today's matches
          const activityScore = await this.calculateDailyActivityScore(player.id);
          
          if (activityScore > 0) {
            // Process progression rolls based on activity
            const progressionCount = await this.processDailyProgressionRolls(player, activityScore);
            totalProgressions += progressionCount;
            
            console.log(`[DAILY PROGRESSION] Player ${player.firstName} ${player.lastName}: Activity=${activityScore.toFixed(1)}, Progressions=${progressionCount}`);
          }
          
          playersProcessed++;
        } catch (error) {
          const errorMsg = `Failed to process daily progression for player ${player.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[DAILY PROGRESSION] Completed: ${playersProcessed} players, ${totalProgressions} progressions in ${duration}ms`);

      return { playersProcessed, totalProgressions, errors };
    } catch (error) {
      const errorMsg = `Daily progression system failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { playersProcessed, totalProgressions, errors };
    }
  }

  /**
   * Calculate daily activity score for a player based on today's match participation
   */
  private static async calculateDailyActivityScore(playerId: number): Promise<number> {
    // This would be called from match completion to update daily activity
    // For now, return 0 as activity is accumulated when matches complete
    return 0;
  }

  /**
   * Process daily progression rolls for a player based on their activity score
   */
  private static async processDailyProgressionRolls(player: Player & { team: any }, activityScore: number): Promise<number> {
    const rollCount = Math.floor(activityScore / this.CONFIG.ACTIVITY_SCORE_DIVISOR);
    let progressionCount = 0;

    for (let roll = 0; roll < rollCount; roll++) {
      // Select random attribute (excluding physical stats for players 34+)
      const availableAttributes = this.getAvailableAttributesForProgression(player);
      if (availableAttributes.length === 0) continue;

      const selectedAttribute = availableAttributes[Math.floor(Math.random() * availableAttributes.length)];
      
      // Calculate progression chance
      const progressionChance = await this.calculateProgressionChance(player, selectedAttribute);
      
      // Roll for progression
      const randomRoll = Math.random() * 100;
      const success = randomRoll < progressionChance;
      
      if (success) {
        await this.applyStatProgression(player.id, selectedAttribute);
        progressionCount++;
        
        console.log(`[PROGRESSION] ${player.firstName} ${player.lastName}: ${selectedAttribute} +1 (${progressionChance.toFixed(1)}% chance, rolled ${randomRoll.toFixed(1)})`);
      }
    }

    return progressionCount;
  }

  /**
   * Get available attributes for progression (respects physical stat locks)
   */
  private static getAvailableAttributesForProgression(player: Player): string[] {
    const allAttributes = [...this.CONFIG.CORE_ATTRIBUTES];
    
    // Remove physical stats for players 34+
    if (player.age >= 34) {
      return allAttributes.filter(attr => !this.CONFIG.PHYSICAL_STATS.includes(attr));
    }
    
    return allAttributes;
  }

  /**
   * Calculate comprehensive progression chance including all modifiers
   */
  private static async calculateProgressionChance(player: Player & { team: any }, attribute: string): Promise<number> {
    let chance = this.CONFIG.DAILY_BASE_CHANCE;

    // 1. Age Modifier
    const ageModifier = this.getAgeModifier(player.age);
    chance += ageModifier;

    // 2. Potential Modifier
    const potentialRating = Math.round(player.potentialRating * 2); // Convert to 10-point scale
    const potentialModifier = (this.CONFIG.POTENTIAL_MODIFIERS as any)[Math.min(10, Math.max(1, potentialRating))] || 5;
    chance += potentialModifier;

    // 3. Staff Modifier
    const staffModifier = await this.calculateStaffModifier(player.team, attribute);
    chance += staffModifier;

    // 4. Camaraderie Modifier
    const camaraderieModifier = this.calculateCamaraderieModifier(player.team);
    chance += camaraderieModifier;

    // 5. Injury Modifier
    const injuryModifier = this.getInjuryModifier(player);
    chance += injuryModifier;

    // 6. Small luck factor
    const luckFactor = (Math.random() - 0.5) * 2; // -1% to +1%
    chance += luckFactor;

    // Clamp between 1% and 95%
    return Math.max(1, Math.min(95, chance));
  }

  /**
   * Get age-based progression modifier
   */
  private static getAgeModifier(age: number): number {
    const { AGE_MODIFIERS } = this.CONFIG;
    
    if (age >= AGE_MODIFIERS.YOUTH.min && age <= AGE_MODIFIERS.YOUTH.max) {
      return AGE_MODIFIERS.YOUTH.bonus;
    }
    if (age >= AGE_MODIFIERS.PRIME.min && age <= AGE_MODIFIERS.PRIME.max) {
      return AGE_MODIFIERS.PRIME.bonus;
    }
    if (age >= AGE_MODIFIERS.VETERAN.min && age <= AGE_MODIFIERS.VETERAN.max) {
      return AGE_MODIFIERS.VETERAN.penalty;
    }
    return AGE_MODIFIERS.OLD.penalty;
  }

  /**
   * Calculate staff effects on progression
   */
  private static async calculateStaffModifier(team: any, attribute: string): Promise<number> {
    if (!team?.staff) return 0;

    let modifier = 0;

    // Head Coach bonus
    const headCoach = team.staff.find((s: Staff) => s.type === 'HEAD_COACH');
    let coachMultiplier = 1;
    if (headCoach) {
      coachMultiplier = 1 + (headCoach.development || 20) / 100;
    }

    // Trainer bonuses by attribute group
    const trainers = team.staff.filter((s: Staff) => s.type.includes('TRAINER'));
    for (const trainer of trainers) {
      const trainerBonus = (trainer.teaching || 20) * 0.15; // 0.15% per teaching point
      
      // Apply trainer bonus based on attribute type (simplified grouping)
      if (['power', 'stamina'].includes(attribute)) {
        modifier += trainerBonus; // Strength trainer
      } else if (['speed', 'agility'].includes(attribute)) {
        modifier += trainerBonus; // Speed trainer
      } else if (['throwing', 'catching', 'kicking'].includes(attribute)) {
        modifier += trainerBonus; // Technical trainer
      } else if (attribute === 'leadership') {
        modifier += trainerBonus; // Mental trainer
      }
    }

    return modifier * coachMultiplier;
  }

  /**
   * Calculate camaraderie effects on progression
   */
  private static calculateCamaraderieModifier(team: any): number {
    if (!team?.camaraderie) return 0;
    
    // (teamCamaraderie - 50) * 0.05%
    return (team.camaraderie - 50) * 0.05;
  }

  /**
   * Get injury-based progression penalty
   */
  private static getInjuryModifier(player: Player): number {
    switch (player.injuryStatus) {
      case 'MINOR_INJURY': return -5;
      case 'MODERATE_INJURY': return -15;
      case 'SEVERE_INJURY': return -100; // Effectively prevents progression
      default: return 0;
    }
  }

  /**
   * Apply stat progression to player
   */
  private static async applyStatProgression(playerId: number, attribute: string): Promise<void> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;

    const currentValue = (player as any)[attribute] as number;
    const potentialCap = Math.round(player.potentialRating * 8); // Convert to 40-point scale
    const newValue = Math.min(potentialCap, currentValue + 1);

    if (newValue > currentValue) {
      await prisma.player.update({
        where: { id: playerId },
        data: { [attribute]: newValue }
      });
    }
  }

  /**
   * End-of-Season Events (Day 17)
   * Processes aging, decline, and retirement for all players
   */
  static async processEndOfSeasonEvents(): Promise<{
    playersAged: number;
    playersDeclined: number;
    playersRetired: number;
    errors: string[];
  }> {
    console.log('[END-OF-SEASON] Starting comprehensive end-of-season events...');
    const startTime = Date.now();
    const errors: string[] = [];
    let playersAged = 0;
    let playersDeclined = 0;
    let playersRetired = 0;

    try {
      const prisma = await getPrismaClient();
      const players = await prisma.player.findMany({
        where: { isRetired: false }
      });

      console.log(`[END-OF-SEASON] Processing ${players.length} active players...`);

      for (const player of players) {
        try {
          // 1. Age-related stat decline (for players 31+)
          if (player.age >= 31) {
            const declined = await this.processStatDecline(player);
            if (declined) playersDeclined++;
          }

          // 2. Retirement check (for players 35+)
          if (player.age >= 35) {
            const retired = await this.processRetirementCheck(player);
            if (retired) {
              playersRetired++;
              continue; // Skip age increment for retired players
            }
          }

          // 3. Age increment and seasonal reset
          await this.processAgeIncrement(player);
          playersAged++;

        } catch (error) {
          const errorMsg = `Failed to process end-of-season events for player ${player.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[END-OF-SEASON] Completed: ${playersAged} aged, ${playersDeclined} declined, ${playersRetired} retired in ${duration}ms`);

      return { playersAged, playersDeclined, playersRetired, errors };
    } catch (error) {
      const errorMsg = `End-of-season events failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { playersAged: 0, playersDeclined: 0, playersRetired: 0, errors };
    }
  }

  /**
   * Process age-related stat decline
   */
  private static async processStatDecline(player: Player): Promise<boolean> {
    const declineChance = (player.age - 30) * this.CONFIG.DECLINE_BASE_RATE;
    const roll = Math.random() * 100;

    if (roll < declineChance) {
      // Select stat to decline (weighted by decline weights)
      const declineStats = Object.keys(this.CONFIG.DECLINE_STAT_WEIGHTS);
      const weights = Object.values(this.CONFIG.DECLINE_STAT_WEIGHTS);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      
      let randomValue = Math.random() * totalWeight;
      let selectedStat = 'speed';
      
      for (let i = 0; i < declineStats.length; i++) {
        randomValue -= weights[i];
        if (randomValue <= 0) {
          selectedStat = declineStats[i];
          break;
        }
      }

      // Apply decline
      const currentValue = (player as any)[selectedStat] as number;
      const newValue = Math.max(1, currentValue - 1);

      const prisma = await getPrismaClient();
      await prisma.player.update({
        where: { id: player.id },
        data: { [selectedStat]: newValue }
      });

      console.log(`[DECLINE] ${player.firstName} ${player.lastName}: ${selectedStat} declined ${currentValue} → ${newValue} (${declineChance.toFixed(1)}% chance)`);
      return true;
    }

    return false;
  }

  /**
   * Process retirement check
   */
  private static async processRetirementCheck(player: Player): Promise<boolean> {
    // Auto-retire at age 45
    if (player.age >= 45) {
      await this.retirePlayer(player, 'automatic age retirement');
      return true;
    }

    // Calculate retirement chance
    const baseChance = this.CONFIG.RETIREMENT_BASE_CHANCES[player.age as keyof typeof this.CONFIG.RETIREMENT_BASE_CHANCES] || 100;
    const injuryModifier = (player.careerInjuries || 0) * this.CONFIG.INJURY_RETIREMENT_MULTIPLIER;
    const usageModifier = this.calculateUsageRetirementPenalty(player.seasonMinutesTotal || 0);
    
    const totalChance = baseChance + injuryModifier + usageModifier;
    const roll = Math.random() * 100;

    if (roll < totalChance) {
      await this.retirePlayer(player, `retirement at age ${player.age} (${totalChance.toFixed(1)}% chance)`);
      return true;
    }

    return false;
  }

  /**
   * Calculate usage-based retirement penalty
   */
  private static calculateUsageRetirementPenalty(seasonMinutes: number): number {
    const { LOW_USAGE_THRESHOLDS, SEASON_TOTAL_MINUTES } = this.CONFIG;
    
    const minMinutesForSevere = (LOW_USAGE_THRESHOLDS.SEVERE.threshold / 14) * SEASON_TOTAL_MINUTES;
    const minMinutesForModerate = (LOW_USAGE_THRESHOLDS.MODERATE.threshold / 14) * SEASON_TOTAL_MINUTES;
    
    if (seasonMinutes < minMinutesForSevere) {
      return LOW_USAGE_THRESHOLDS.SEVERE.penalty;
    } else if (seasonMinutes < minMinutesForModerate) {
      return LOW_USAGE_THRESHOLDS.MODERATE.penalty;
    }
    
    return 0;
  }

  /**
   * Retire a player
   */
  private static async retirePlayer(player: Player, reason: string): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.player.update({
      where: { id: player.id },
      data: { 
        isRetired: true,
        age: player.age + 1 // Increment age on retirement
      }
    });

    console.log(`[RETIREMENT] ${player.firstName} ${player.lastName}: ${reason}`);
  }

  /**
   * Process age increment and seasonal reset
   */
  private static async processAgeIncrement(player: Player): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.player.update({
      where: { id: player.id },
      data: {
        age: player.age + 1,
        gamesPlayedLastSeason: 0,
        seasonMinutesLeague: 0,
        seasonMinutesTournament: 0,
        seasonMinutesExhibition: 0,
        seasonMinutesTotal: 0
      }
    });
  }

  /**
   * Update player seasonal minutes when a match completes
   * Called from match completion system
   */
  static async updatePlayerSeasonalMinutes(
    playerId: number, 
    minutesPlayed: number, 
    matchType: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION'
  ): Promise<void> {
    const prisma = await getPrismaClient();
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;

    const updates: any = {
      seasonMinutesTotal: (player.seasonMinutesTotal || 0) + minutesPlayed
    };

    switch (matchType) {
      case 'LEAGUE':
        updates.seasonMinutesLeague = (player.seasonMinutesLeague || 0) + minutesPlayed;
        break;
      case 'TOURNAMENT':
        updates.seasonMinutesTournament = (player.seasonMinutesTournament || 0) + minutesPlayed;
        break;
      case 'EXHIBITION':
        updates.seasonMinutesExhibition = (player.seasonMinutesExhibition || 0) + minutesPlayed;
        break;
    }

    await prisma.player.update({
      where: { id: playerId },
      data: updates
    });

    console.log(`[MINUTES UPDATE] Player ${playerId}: +${minutesPlayed.toFixed(1)} ${matchType} minutes (Total: ${updates.seasonMinutesTotal.toFixed(1)})`);
  }
}