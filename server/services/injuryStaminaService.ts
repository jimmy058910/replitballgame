import { db } from '../db';
import { players, staff } from '../../shared/schema';
import { eq, sql, and } from 'drizzle-orm';

export interface InjuryStaminaSettings {
  // Game mode base injury chances
  leagueInjuryChance: number;
  tournamentInjuryChance: number;
  exhibitionInjuryChance: number;
  
  // Daily stamina depletion by game mode
  leagueStaminaDepletion: number;
  tournamentStaminaDepletion: number;
  exhibitionStaminaDepletion: number;
  
  // Recovery settings
  baseInjuryRecovery: number;
  baseStaminaRecovery: number;
  
  // Injury recovery thresholds
  minorInjuryRP: number;
  moderateInjuryRP: number;
  severeInjuryRP: number;
}

const DEFAULT_SETTINGS: InjuryStaminaSettings = {
  leagueInjuryChance: 20,
  tournamentInjuryChance: 5,
  exhibitionInjuryChance: 15, // Allow injuries during match for realism
  
  leagueStaminaDepletion: 30,
  tournamentStaminaDepletion: 10,
  exhibitionStaminaDepletion: 0, // No persistent daily stamina cost
  
  baseInjuryRecovery: 50,
  baseStaminaRecovery: 20,
  
  minorInjuryRP: 100,
  moderateInjuryRP: 300,
  severeInjuryRP: 750,
};

export class InjuryStaminaService {
  private settings: InjuryStaminaSettings;

  constructor(settings?: Partial<InjuryStaminaSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Calculate injury chance during a tackle event
   * Based on your formula: base_injury_chance + power_modifier + stamina_modifier
   */
  async calculateTackleInjury(
    tacklePower: number,
    carrierAgility: number,
    carrierInGameStamina: number,
    gameMode: 'league' | 'tournament' | 'exhibition'
  ): Promise<{ hasInjury: boolean; injuryType?: string; recoveryPoints?: number; isTemporary?: boolean }> {
    
    // Get base injury chance based on game mode
    let baseInjuryChance = 0;
    switch (gameMode) {
      case 'league':
        baseInjuryChance = this.settings.leagueInjuryChance;
        break;
      case 'tournament':
        baseInjuryChance = this.settings.tournamentInjuryChance;
        break;
      case 'exhibition':
        baseInjuryChance = this.settings.exhibitionInjuryChance;
        break;
    }

    // Power modifier: Difference between tackler power and carrier agility
    const powerModifier = (tacklePower - carrierAgility) * 0.5;

    // Stamina modifier: Penalty if carrier's stamina is below 50%
    const staminaModifier = carrierInGameStamina < 50 ? 10 : 0;

    // Final injury chance calculation
    const finalInjuryChance = baseInjuryChance + powerModifier + staminaModifier;

    // Roll for injury
    const roll = Math.random() * 100;
    const hasInjury = roll <= finalInjuryChance;

    if (!hasInjury) {
      return { hasInjury: false };
    }

    // For exhibition matches, allow injury calculation but mark as temporary
    if (gameMode === 'exhibition') {
      // Determine injury severity for match simulation but don't persist
      const severityRoll = Math.random() * 100;
      let injuryType: string;
      let recoveryPoints: number;

      if (severityRoll <= 70) {
        injuryType = 'Minor Injury (Temporary)';
        recoveryPoints = this.settings.minorInjuryRP;
      } else if (severityRoll <= 95) {
        injuryType = 'Moderate Injury (Temporary)';
        recoveryPoints = this.settings.moderateInjuryRP;
      } else {
        injuryType = 'Severe Injury (Temporary)';
        recoveryPoints = this.settings.severeInjuryRP;
      }

      return { hasInjury: true, injuryType, recoveryPoints, isTemporary: true };
    }

    // Determine injury severity (70% Minor, 25% Moderate, 5% Severe)
    const severityRoll = Math.random() * 100;
    let injuryType: string;
    let recoveryPoints: number;

    if (severityRoll <= 70) {
      injuryType = 'Minor Injury';
      recoveryPoints = this.settings.minorInjuryRP;
    } else if (severityRoll <= 95) {
      injuryType = 'Moderate Injury';
      recoveryPoints = this.settings.moderateInjuryRP;
    } else {
      injuryType = 'Severe Injury';
      recoveryPoints = this.settings.severeInjuryRP;
    }

    return { hasInjury: true, injuryType, recoveryPoints };
  }

  /**
   * Apply injury to a player
   */
  async applyInjury(playerId: string, injuryType: string, recoveryPoints: number): Promise<void> {
    await db.update(players)
      .set({
        injuryStatus: injuryType,
        injuryRecoveryPointsNeeded: recoveryPoints,
        injuryRecoveryPointsCurrent: 0,
        careerInjuries: sql`${players.careerInjuries} + 1`
      })
      .where(eq(players.id, playerId));
  }

  /**
   * Deplete daily stamina after a match based on game mode
   */
  async depleteStaminaAfterMatch(playerId: string, gameMode: 'league' | 'tournament' | 'exhibition'): Promise<void> {
    let depletion = 0;
    switch (gameMode) {
      case 'league':
        depletion = this.settings.leagueStaminaDepletion;
        break;
      case 'tournament':
        depletion = this.settings.tournamentStaminaDepletion;
        break;
      case 'exhibition':
        return; // No persistent stamina depletion for exhibitions
    }

    await db.update(players)
      .set({
        dailyStaminaLevel: sql`GREATEST(0, ${players.dailyStaminaLevel} - ${depletion})`
      })
      .where(eq(players.id, playerId));
  }

  /**
   * Set in-game stamina at match start based on daily stamina level
   */
  async setMatchStartStamina(playerId: string, gameMode: 'league' | 'tournament' | 'exhibition'): Promise<void> {
    if (gameMode === 'exhibition') {
      // Exhibitions always start at 100% stamina
      await db.update(players)
        .set({ inGameStamina: 100 })
        .where(eq(players.id, playerId));
    } else {
      // League and tournament use daily stamina level
      await db.update(players)
        .set({ inGameStamina: sql`${players.dailyStaminaLevel}` })
        .where(eq(players.id, playerId));
    }
  }

  /**
   * Use a recovery item on a player (max 2 per day)
   */
  async useRecoveryItem(
    playerId: string, 
    itemType: 'stamina' | 'injury', 
    effectValue: number
  ): Promise<{ success: boolean; message: string }> {
    
    // Get current player state
    const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (!player.length) {
      return { success: false, message: "Player not found" };
    }

    const currentPlayer = player[0];
    
    // Check daily item usage limit
    const dailyItemsUsed = currentPlayer.dailyItemsUsed || 0;
    if (dailyItemsUsed >= 2) {
      return { success: false, message: "Daily item usage limit reached (2 items per day)" };
    }

    // Check if item is appropriate
    if (itemType === 'injury' && currentPlayer.injuryStatus === 'Healthy') {
      return { success: false, message: "Cannot use injury items on healthy players" };
    }

    // Apply item effect
    const updateData: any = {
      dailyItemsUsed: dailyItemsUsed + 1
    };

    if (itemType === 'stamina') {
      const currentStamina = currentPlayer.dailyStaminaLevel || 0;
      updateData.dailyStaminaLevel = Math.min(100, currentStamina + effectValue);
    } else if (itemType === 'injury') {
      const currentRecovery = currentPlayer.injuryRecoveryPointsCurrent || 0;
      const newRecoveryPoints = currentRecovery + effectValue;
      updateData.injuryRecoveryPointsCurrent = newRecoveryPoints;
      
      // Check if injury is healed
      const recoveryNeeded = currentPlayer.injuryRecoveryPointsNeeded || 0;
      if (newRecoveryPoints >= recoveryNeeded) {
        updateData.injuryStatus = 'Healthy';
        updateData.injuryRecoveryPointsNeeded = 0;
        updateData.injuryRecoveryPointsCurrent = 0;
      }
    }

    await db.update(players).set(updateData).where(eq(players.id, playerId));
    
    return { success: true, message: `${itemType} item applied successfully` };
  }

  /**
   * Daily reset process (scheduled for 3 AM)
   * Handles natural recovery for all players
   */
  async performDailyReset(): Promise<void> {
    // Reset daily items used for all players
    await db.update(players).set({ dailyItemsUsed: 0 });

    // Get all players for individual processing
    const allPlayers = await db.select().from(players);

    for (const player of allPlayers) {
      const updates: any = {};

      // Natural injury recovery with Recovery Specialist bonus
      if (player.injuryStatus !== 'Healthy') {
        const currentRecovery = player.injuryRecoveryPointsCurrent || 0;
        
        // Calculate recovery bonus from Recovery Specialist
        let recoveryBonus = 0;
        try {
          if (player.teamId) {
            const recoverySpecialist = await db.select()
              .from(staff)
              .where(and(
                eq(staff.teamId, player.teamId),
                eq(staff.type, 'recovery_specialist')
              ))
              .limit(1);
            
            if (recoverySpecialist.length > 0) {
              const specialist = recoverySpecialist[0];
              // Recovery Specialist bonus: (PhysicalRating / 40) * 2 additional recovery points
              recoveryBonus = (specialist.physicalRating || 0) / 40 * 2;
            }
          }
        } catch (error) {
          console.error('Error calculating Recovery Specialist bonus:', error);
        }
        
        const totalRecovery = this.settings.baseInjuryRecovery + recoveryBonus;
        const newRecoveryPoints = currentRecovery + totalRecovery;
        updates.injuryRecoveryPointsCurrent = newRecoveryPoints;

        // Check if injury is healed
        const recoveryNeeded = player.injuryRecoveryPointsNeeded || 0;
        if (newRecoveryPoints >= recoveryNeeded) {
          updates.injuryStatus = 'Healthy';
          updates.injuryRecoveryPointsNeeded = 0;
          updates.injuryRecoveryPointsCurrent = 0;
        }
      }

      // Natural stamina recovery (stat-based)
      const statBonusRecovery = player.stamina * 0.5;
      const totalRecovery = this.settings.baseStaminaRecovery + statBonusRecovery;
      const currentStamina = player.dailyStaminaLevel ?? 100;
      updates.dailyStaminaLevel = Math.min(100, currentStamina + totalRecovery);

      // Apply updates if any changes needed
      if (Object.keys(updates).length > 0) {
        await db.update(players).set(updates).where(eq(players.id, player.id));
      }
    }
  }

  /**
   * Get injury effects for match simulation
   */
  getInjuryEffects(injuryStatus: string): { speedDebuff: number; agilityDebuff: number; powerDebuff: number; canPlay: boolean } {
    switch (injuryStatus) {
      case 'Minor Injury':
        return { speedDebuff: 2, agilityDebuff: 2, powerDebuff: 0, canPlay: true };
      case 'Moderate Injury':
        return { speedDebuff: 5, agilityDebuff: 5, powerDebuff: 3, canPlay: true };
      case 'Severe Injury':
        return { speedDebuff: 0, agilityDebuff: 0, powerDebuff: 0, canPlay: false };
      default:
        return { speedDebuff: 0, agilityDebuff: 0, powerDebuff: 0, canPlay: true };
    }
  }

  /**
   * Check if player can participate in league/tournament matches
   */
  canPlayInCompetitive(injuryStatus: string): boolean {
    return injuryStatus !== 'Severe Injury';
  }
}

export const injuryStaminaService = new InjuryStaminaService();