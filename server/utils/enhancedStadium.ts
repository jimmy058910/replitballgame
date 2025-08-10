/**
 * Enhanced Stadium System Integration
 * Integrates stadium effects with match simulation
 */

import { stadiumEffectsCalculator, type StadiumData } from './stadiumEffects.js';
import { configManager } from './configManager.js';
import type { Stadium } from "@prisma/client";

export interface EnhancedStadiumEffects {
  intimidationFactor: number;
  noiseLevel: number;
  homeFieldAdvantage: number;
  crowdDensity: number;
  moraleBoost: number;
  attendanceRate: number;
  actualAttendance: number;
  awayPenalties: {
    passingAccuracyPenalty: number;
    concentrationPenalty: number;
  };
  homeBonuses: {
    tackleBonus: number;
    interceptionBonus: number;
    moraleBonus: number;
  };
  atmosphereDescription: string;
}

export class EnhancedStadiumSystem {
  private config = configManager.getStadium();

  /**
   * Calculate comprehensive stadium effects for match simulation
   */
  calculateEnhancedStadiumEffects(
    stadium: Stadium | null,
    isHomeTeam: boolean = true,
    fanLoyalty: number = 50
  ): EnhancedStadiumEffects {
    const stadiumData: StadiumData = {
      capacity: stadium?.capacity || 15000,
      fanLoyalty,
      lightingLevel: stadium?.lightingScreensLevel || 1,
      screenLevel: stadium?.lightingScreensLevel || 1,
      concessionLevel: stadium?.concessionsLevel || 1,
      parkingLevel: stadium?.parkingLevel || 1,
      vipSuitesLevel: stadium?.vipSuitesLevel || 1,
      merchandisingLevel: stadium?.merchandisingLevel || 1,
    };

    const effects = stadiumEffectsCalculator.calculateStadiumEffects(stadiumData, isHomeTeam);
    const awayPenalties = stadiumEffectsCalculator.calculateAwayPenalties(effects);
    const homeBonuses = stadiumEffectsCalculator.calculateDefensiveBonuses(effects);

    return {
      ...effects,
      awayPenalties,
      homeBonuses,
      atmosphereDescription: this.generateAtmosphereDescription(effects)
    };
  }

  /**
   * Generate descriptive atmosphere text for commentary
   */
  private generateAtmosphereDescription(effects: any): string {
    const intimidationTier = stadiumEffectsCalculator.getIntimidationTier(effects.intimidationFactor);
    const crowdDensityTier = stadiumEffectsCalculator.getCrowdDensityTier(effects.crowdDensity);
    
    return `${crowdDensityTier} crowd creating ${intimidationTier.toLowerCase()} atmosphere`;
  }

  /**
   * Apply stadium effects to player stats during match simulation
   */
  applyStadiumEffectsToPlayer(
    player: any,
    effects: EnhancedStadiumEffects,
    isHomeTeam: boolean
  ): any {
    const modifiedPlayer = { ...player };

    if (isHomeTeam) {
      // Apply home field bonuses
      modifiedPlayer.power += effects.homeBonuses.tackleBonus * 10;
      modifiedPlayer.throwing += effects.homeBonuses.interceptionBonus * 5;
      modifiedPlayer.leadership += effects.homeBonuses.moraleBonus * 10;
    } else {
      // Apply away team penalties
      modifiedPlayer.throwing -= effects.awayPenalties.passingAccuracyPenalty * 10;
      modifiedPlayer.catching -= effects.awayPenalties.concentrationPenalty * 10;
    }

    return modifiedPlayer;
  }

  /**
   * Calculate match outcome probability modification
   */
  calculateMatchProbabilityModification(effects: EnhancedStadiumEffects): number {
    return effects.homeFieldAdvantage;
  }

  /**
   * Get stadium revenue for completed match
   */
  calculateMatchRevenue(effects: EnhancedStadiumEffects, stadium: Stadium | null): number {
    if (!stadium) return 0;

    const config = configManager.getStadium().economy?.stadium_revenue || {
      ticket_price: 25,
      concession_multiplier: 0.8,
      parking_rate: 0.3,
      parking_price: 15
    };
    const attendance = effects.actualAttendance;
    
    // Base ticket revenue
    let revenue = attendance * config.ticket_price;
    
    // Concession revenue
    revenue += attendance * config.concession_multiplier * (stadium.concessionsLevel || 1);
    
    // Parking revenue
    revenue += (attendance * config.parking_rate) * config.parking_price * (stadium.parkingLevel || 1);
    
    // VIP suites revenue
    revenue += (stadium.vipSuitesLevel || 1) * 5000;
    
    return Math.floor(revenue);
  }
}

// Export singleton instance
export const enhancedStadiumSystem = new EnhancedStadiumSystem();
export default enhancedStadiumSystem;