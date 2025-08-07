import { prisma } from '../db';
import { getGameDurationMinutes, type MatchType } from '../utils/gameTimeUtils';

export interface InjuryStaminaSettings {
  // Game mode base injury chances
  leagueInjuryChance: number;
  tournamentInjuryChance: number;
  exhibitionInjuryChance: number;
  
  // New unified stamina system constants
  baseDepletion: number; // Dbase = 20 (unified for league and tournament)
  staminaScalingConstant: number; // K = 0.30 (depletion scaling)
  // Note: maxMinutes is now dynamically calculated per match type
  
  // Recovery settings
  baseInjuryRecovery: number;
  baseStaminaRecovery: number; // Rbase = 20
  recoveryScalingConstant: number; // Kr = 0.20 (recovery scaling)
  
  // Injury recovery thresholds
  minorInjuryRP: number;
  moderateInjuryRP: number;
  severeInjuryRP: number;
}

const DEFAULT_SETTINGS: InjuryStaminaSettings = {
  leagueInjuryChance: 20,
  tournamentInjuryChance: 5,
  exhibitionInjuryChance: 15, // Allow injuries during match for realism
  
  // New unified stamina constants per specification
  baseDepletion: 20, // Dbase = 20 (unified for both league and tournament)
  staminaScalingConstant: 0.30, // K = 0.30 (stamina depletion scaling)
  // Note: maxMinutes now calculated dynamically per match type
  
  baseInjuryRecovery: 50,
  baseStaminaRecovery: 20, // Rbase = 20 (base daily recovery)
  recoveryScalingConstant: 0.20, // Kr = 0.20 (recovery scaling)
  
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
    gameMode: 'league' | 'tournament' | 'exhibition',
    forceInjury: boolean = false
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

    // Roll for injury (or force injury for testing)
    const roll = Math.random() * 100;
    const hasInjury = forceInjury || roll <= finalInjuryChance;

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
    // Convert injury type to enum value
    let injuryStatus = 'HEALTHY';
    if (injuryType === 'Minor Injury') {
      injuryStatus = 'MINOR_INJURY';
    } else if (injuryType === 'Moderate Injury') {
      injuryStatus = 'MODERATE_INJURY';
    } else if (injuryType === 'Severe Injury') {
      injuryStatus = 'SEVERE_INJURY';
    }
    
    await prisma.player.update({
      where: { id: parseInt(playerId) },
      data: {
        injuryStatus: injuryStatus as 'HEALTHY' | 'MINOR_INJURY' | 'MODERATE_INJURY' | 'SEVERE_INJURY',
        injuryRecoveryPointsNeeded: recoveryPoints,
        injuryRecoveryPointsCurrent: 0,
        careerInjuries: {
          increment: 1
        }
      }
    });
  }

  /**
   * Calculate stamina depletion using the new unified formula with dynamic match duration
   * Formula: Loss = [Dbase × (1 - K×S/40)] × (M/Mmax) × (1-Ccoach)
   */
  calculateStaminaDepletion(
    stamina: number,
    minutesPlayed: number,
    matchType: 'league' | 'tournament' | 'exhibition',
    coachBonus: number = 0
  ): number {
    const S = stamina;
    const M = minutesPlayed;
    const Mmax = getGameDurationMinutes(matchType as MatchType); // Dynamic based on match type
    const Dbase = this.settings.baseDepletion; // 20
    const K = this.settings.staminaScalingConstant; // 0.30
    const Ccoach = Math.min(0.15, coachBonus); // Cap at 15%

    // Zero minutes = zero loss (DNP protection)
    if (M <= 0) {
      return 0;
    }

    // Calculate stamina scaling factor (1 - K×S/40)
    const staminaFactor = 1 - (K * S / 40);
    
    // Calculate minutes ratio (M/Mmax)
    const minutesRatio = M / Mmax;
    
    // Calculate coach factor (1-Ccoach)
    const coachFactor = 1 - Ccoach;
    
    // Apply formula
    let loss = Dbase * staminaFactor * minutesRatio * coachFactor;
    
    // Apply protected floor of 5 stamina loss minimum (only when M > 0)
    loss = Math.max(5, loss);
    
    return Math.round(loss * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Deplete daily stamina after a match using the new unified formula
   */
  async depleteStaminaAfterMatch(
    playerId: string, 
    gameMode: 'league' | 'tournament' | 'exhibition',
    minutesPlayed: number = 40 // Default to full match if not specified
  ): Promise<void> {
    if (gameMode === 'exhibition') {
      return; // No persistent stamina depletion for exhibitions
    }

    // Get current player data including stamina attribute and team info for coach bonus
    const player = await prisma.player.findUnique({
      where: { id: parseInt(playerId) },
      select: { 
        dailyStaminaLevel: true,
        staminaAttribute: true,
        teamId: true
      }
    });
    
    if (!player) {
      console.warn(`Player ${playerId} not found for stamina depletion`);
      return;
    }

    // Get coach conditioning bonus
    let coachBonus = 0;
    if (player.teamId) {
      const headCoach = await prisma.staff.findFirst({
        where: { 
          teamId: player.teamId, 
          type: 'HEAD_COACH' 
        },
        select: { motivation: true, development: true }
      });
      
      if (headCoach) {
        // Coach bonus calculation: average of motivation and development, scaled to 0-0.15 range
        const coachEffectiveness = (headCoach.motivation + headCoach.development) / 2;
        coachBonus = Math.min(0.15, coachEffectiveness / 40 * 0.15); // Scale from 0-40 to 0-0.15
      }
    }

    // Calculate stamina loss using new formula
    const staminaLoss = this.calculateStaminaDepletion(
      player.staminaAttribute || 20,
      minutesPlayed,
      gameMode, // Pass match type for dynamic duration calculation
      coachBonus
    );
    
    const currentStamina = player.dailyStaminaLevel || 100;
    const newStaminaLevel = Math.max(0, currentStamina - staminaLoss);
    
    console.log(`[NEW STAMINA FORMULA] Player ${playerId}: ${gameMode} match`);
    console.log(`  - Stamina Attr: ${player.staminaAttribute}, Minutes: ${minutesPlayed}, Coach Bonus: ${(coachBonus * 100).toFixed(1)}%`);
    console.log(`  - Loss Calculated: ${staminaLoss.toFixed(1)}, New Level: ${newStaminaLevel.toFixed(1)}`);
    
    await prisma.player.update({
      where: { id: parseInt(playerId) },
      data: {
        dailyStaminaLevel: newStaminaLevel
      }
    });
  }

  /**
   * Set in-game stamina at match start based on daily stamina level
   */
  async setMatchStartStamina(playerId: string, gameMode: 'league' | 'tournament' | 'exhibition'): Promise<void> {
    if (gameMode === 'exhibition') {
      // Exhibitions always start at 100% stamina
      await prisma.player.update({
        where: { id: parseInt(playerId) },
        data: { dailyStaminaLevel: 100 }
      });
    } else {
      // League and tournament use daily stamina level
      const player = await prisma.player.findUnique({
        where: { id: parseInt(playerId) },
        select: { dailyStaminaLevel: true }
      });
      
      if (player) {
        await prisma.player.update({
          where: { id: parseInt(playerId) },
          data: { dailyStaminaLevel: player.dailyStaminaLevel || 100 }
        });
      }
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
    const currentPlayer = await prisma.player.findUnique({
      where: { id: parseInt(playerId) }
    });
    if (!currentPlayer) {
      return { success: false, message: "Player not found" };
    }
    
    // Check daily item usage limit
    const dailyItemsUsed = currentPlayer.dailyItemsUsed || 0;
    if (dailyItemsUsed >= 2) {
      return { success: false, message: "Daily item usage limit reached (2 items per day)" };
    }

    // Check if item is appropriate
    if (itemType === 'injury' && currentPlayer.injuryStatus === 'HEALTHY') {
      return { success: false, message: "Cannot use injury items on healthy players" };
    }
    
    // Check if stamina item is appropriate
    if (itemType === 'stamina') {
      const currentStamina = currentPlayer.dailyStaminaLevel || 0;
      if (currentStamina >= 100) {
        return { success: false, message: "Cannot use stamina items on players at full stamina" };
      }
    }

    // Apply item effect
    const updateData: any = {
      dailyItemsUsed: dailyItemsUsed + 1
    };

    if (itemType === 'stamina') {
      const currentStamina = currentPlayer.dailyStaminaLevel || 0;
      const newStamina = Math.min(100, currentStamina + effectValue);
      updateData.dailyStaminaLevel = newStamina;
    } else if (itemType === 'injury') {
      const currentRecovery = currentPlayer.injuryRecoveryPointsCurrent || 0;
      const newRecoveryPoints = currentRecovery + effectValue;
      updateData.injuryRecoveryPointsCurrent = newRecoveryPoints;
      
      // Check if injury is healed
      const recoveryNeeded = currentPlayer.injuryRecoveryPointsNeeded || 0;
      if (newRecoveryPoints >= recoveryNeeded) {
        updateData.injuryStatus = 'HEALTHY';
        updateData.injuryRecoveryPointsNeeded = 0;
        updateData.injuryRecoveryPointsCurrent = 0;
      }
    }

    await prisma.player.update({
      where: { id: parseInt(playerId) },
      data: updateData
    });
    
    return { success: true, message: `${itemType} item applied successfully` };
  }

  /**
   * Daily reset process (scheduled for 3 AM)
   * Handles natural recovery for all players
   */
  async performDailyReset(): Promise<void> {
    // Reset daily items used for all players
    await prisma.player.updateMany({
      data: { dailyItemsUsed: 0 }
    });

    // Get all players for individual processing
    const allPlayers = await prisma.player.findMany();

    for (const player of allPlayers) {
      const updates: any = {};

      // Natural injury recovery with Recovery Specialist bonus
      if (player.injuryStatus !== 'HEALTHY') {
        const currentRecovery = player.injuryRecoveryPointsCurrent || 0;
        
        // Calculate recovery bonus from Recovery Specialist
        let recoveryBonus = 0;
        try {
          if (player.teamId) {
            const recoverySpecialist = await prisma.staff.findFirst({
              where: {
                teamId: player.teamId,
                type: 'RECOVERY_SPECIALIST'
              }
            });
            
            if (recoverySpecialist) {
              // Recovery Specialist bonus: (PhysicalRating / 40) * 2 additional recovery points
              recoveryBonus = (recoverySpecialist.physiology || 0) / 40 * 2;
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
          updates.injuryStatus = 'HEALTHY';
          updates.injuryRecoveryPointsNeeded = 0;
          updates.injuryRecoveryPointsCurrent = 0;
        }
      }

      // New unified stamina recovery formula: Recovery = Rbase + Kr×S + Ccoach×10
      const S = player.staminaAttribute || 20;
      const Rbase = this.settings.baseStaminaRecovery; // 20
      const Kr = this.settings.recoveryScalingConstant; // 0.20
      
      // Get coach conditioning bonus
      let Ccoach = 0;
      try {
        if (player.teamId) {
          const headCoach = await prisma.staff.findFirst({
            where: { 
              teamId: player.teamId, 
              type: 'HEAD_COACH' 
            },
            select: { motivation: true, development: true }
          });
          
          if (headCoach) {
            // Coach bonus calculation: average of motivation and development, scaled to 0-0.15 range
            const coachEffectiveness = (headCoach.motivation + headCoach.development) / 2;
            Ccoach = Math.min(0.15, coachEffectiveness / 40 * 0.15); // Scale from 0-40 to 0-0.15
          }
        }
      } catch (error) {
        console.error('Error calculating coach stamina recovery bonus:', error);
      }
      
      // Apply new recovery formula: Recovery = Rbase + Kr×S + Ccoach×10
      const calculatedRecovery = Rbase + (Kr * S) + (Ccoach * 10);
      
      const currentStamina = player.dailyStaminaLevel ?? 100;
      const staminaDeficit = 100 - currentStamina;
      
      // Recovery is capped at current deficit (no overheal)
      const actualRecovery = Math.min(calculatedRecovery, staminaDeficit);
      
      if (actualRecovery > 0) {
        updates.dailyStaminaLevel = Math.min(100, currentStamina + actualRecovery);
      }

      // Apply updates if any changes needed
      if (Object.keys(updates).length > 0) {
        await prisma.player.update({
          where: { id: player.id },
          data: updates
        });
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

  /**
   * Process daily recovery for all players (called by automation system)
   */
  static async processDailyRecovery(): Promise<{
    playersProcessed: number;
    injuriesHealed: number;
    staminaRestored: number;
    errors: string[];
  }> {
    console.log('[INJURY STAMINA SERVICE] Starting daily recovery process...');
    const startTime = Date.now();
    const errors: string[] = [];
    let playersProcessed = 0;
    let injuriesHealed = 0;
    let staminaRestored = 0;

    try {
      // Get all players with injuries or low stamina
      const playersNeedingRecovery = await prisma.player.findMany({
        where: {
          OR: [
            { injuryStatus: { not: 'HEALTHY' } },
            { dailyStaminaLevel: { lt: 100 } }
          ],
          isOnMarket: false // Only process active roster players
        }
      });

      console.log(`[INJURY STAMINA SERVICE] Found ${playersNeedingRecovery.length} players needing recovery`);

      for (const player of playersNeedingRecovery) {
        try {
          let playerUpdated = false;
          const updateData: any = {};

          // Process injury recovery
          if (player.injuryStatus !== 'HEALTHY' && player.injuryRecoveryPointsCurrent !== null) {
            const baseRecovery = 50; // Base daily recovery points
            const newRecoveryPoints = (player.injuryRecoveryPointsCurrent || 0) + baseRecovery;

            // Check if injury is healed
            const requiredRP = InjuryStaminaService.getRequiredRecoveryPoints(player.injuryStatus);
            if (newRecoveryPoints >= requiredRP) {
              updateData.injuryStatus = 'HEALTHY';
              updateData.injuryRecoveryPointsCurrent = 0;
              updateData.injuryRecoveryPointsNeeded = 0;
              injuriesHealed++;
              console.log(`[INJURY STAMINA SERVICE] ${player.firstName} ${player.lastName} recovered from ${player.injuryStatus}`);
            } else {
              updateData.injuryRecoveryPointsCurrent = newRecoveryPoints;
            }
            playerUpdated = true;
          }

          // Process stamina recovery using new unified formula: Recovery = Rbase + Kr×S + Ccoach×10
          if (player.dailyStaminaLevel < 100) {
            const S = player.staminaAttribute || 20;
            const Rbase = 20; // Base daily recovery
            const Kr = 0.20; // Recovery scaling constant
            
            // Get coach conditioning bonus
            let Ccoach = 0;
            try {
              if (player.teamId) {
                const headCoach = await prisma.staff.findFirst({
                  where: { 
                    teamId: player.teamId, 
                    type: 'HEAD_COACH' 
                  },
                  select: { motivation: true, development: true }
                });
                
                if (headCoach) {
                  const coachEffectiveness = (headCoach.motivation + headCoach.development) / 2;
                  Ccoach = Math.min(0.15, coachEffectiveness / 40 * 0.15);
                }
              }
            } catch (error) {
              console.error('Error calculating coach bonus in static recovery:', error);
            }
            
            // Apply new recovery formula: Recovery = Rbase + Kr×S + Ccoach×10
            const calculatedRecovery = Rbase + (Kr * S) + (Ccoach * 10);
            
            const currentStamina = player.dailyStaminaLevel || 0;
            const staminaDeficit = 100 - currentStamina;
            
            // Recovery is capped at current deficit (no overheal)
            const actualRecovery = Math.min(calculatedRecovery, staminaDeficit);
            
            if (actualRecovery > 0) {
              const newStamina = Math.min(100, currentStamina + actualRecovery);
              updateData.dailyStaminaLevel = newStamina;
              staminaRestored++;
              playerUpdated = true;
            }
          }

          // Update player if needed
          if (playerUpdated) {
            await prisma.player.update({
              where: { id: player.id },
              data: updateData
            });
          }

          playersProcessed++;

        } catch (error) {
          const errorMsg = `Failed to process recovery for player ${player.firstName} ${player.lastName} (${player.id}): ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[INJURY STAMINA SERVICE] ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[INJURY STAMINA SERVICE] Completed in ${duration}ms. Processed ${playersProcessed} players, ${injuriesHealed} injuries healed, ${staminaRestored} stamina restored`);

      return {
        playersProcessed,
        injuriesHealed,
        staminaRestored,
        errors
      };

    } catch (error) {
      console.error('[INJURY STAMINA SERVICE] Fatal error in daily recovery:', error);
      throw error;
    }
  }

  /**
   * Get required recovery points for injury type
   */
  private static getRequiredRecoveryPoints(injuryStatus: string): number {
    switch (injuryStatus) {
      case 'Minor Injury': return 100;
      case 'Moderate Injury': return 300;
      case 'Severe Injury': return 750;
      default: return 0;
    }
  }
}

export const injuryStaminaService = new InjuryStaminaService();