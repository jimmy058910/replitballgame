/**
 * Stadium Effects Calculator
 * Calculates home field advantage and crowd effects
 * Based on stadium capacity, fan loyalty, and attendance
 */

import { configManager } from './configManager';

export interface StadiumEffects {
  intimidationFactor: number;    // 0-100 scale
  noiseLevel: number;           // 0-10 scale
  homeFieldAdvantage: number;   // 0.0-0.09 (0% to 9% win probability boost)
  crowdDensity: number;         // 0.0-1.0 scale
  moraleBoost: number;          // 0.0-0.15 (0% to 15% morale boost)
  attendanceRate: number;       // 0.0-1.0 scale
  actualAttendance: number;     // Number of attendees
}

export interface StadiumData {
  capacity: number;
  fanLoyalty: number;           // 0-100 scale
  lightingLevel: number;        // 1-5 scale
  screenLevel: number;          // 1-5 scale
  concessionLevel: number;      // 1-5 scale
  parkingLevel: number;         // 1-5 scale
  vipSuitesLevel: number;       // 1-5 scale
  merchandisingLevel: number;   // 1-5 scale
}

export class StadiumEffectsCalculator {
  private config = configManager.getStadium();

  /**
   * Calculate comprehensive stadium effects
   */
  calculateStadiumEffects(stadium: StadiumData, isHomeTeam: boolean = true): StadiumEffects {
    const attendanceRate = this.calculateAttendanceRate(stadium.fanLoyalty);
    const calculatedAttendance = Math.floor(stadium.capacity * attendanceRate);
    const actualAttendance = Math.min(calculatedAttendance, stadium.capacity); // Ensure attendance never exceeds capacity
    const crowdDensity = attendanceRate;
    
    const intimidationFactor = this.calculateIntimidationFactor(stadium.fanLoyalty, crowdDensity);
    const noiseLevel = this.calculateNoiseLevel(actualAttendance, stadium.capacity);
    const homeFieldAdvantage = isHomeTeam ? this.calculateHomeFieldAdvantage(intimidationFactor) : 0;
    const moraleBoost = isHomeTeam ? this.calculateMoraleBoost(intimidationFactor) : 0;

    return {
      intimidationFactor,
      noiseLevel,
      homeFieldAdvantage,
      crowdDensity,
      moraleBoost,
      attendanceRate,
      actualAttendance
    };
  }

  /**
   * Calculate attendance rate based on fan loyalty
   */
  private calculateAttendanceRate(fanLoyalty: number): number {
    const config = this.config.atmosphere;
    const loyaltyFactor = fanLoyalty / 100;
    
    // S-curve for attendance based on loyalty
    const attendanceRate = config.min_attendance_rate + 
      (config.max_attendance_rate - config.min_attendance_rate) * 
      Math.pow(loyaltyFactor, config.attendance_loyalty_factor);
    
    return Math.min(Math.max(attendanceRate, config.min_attendance_rate), config.max_attendance_rate);
  }

  /**
   * Calculate intimidation factor (0-100)
   */
  private calculateIntimidationFactor(fanLoyalty: number, crowdDensity: number): number {
    const baseFactor = fanLoyalty * this.config.home_field.loyalty_multiplier;
    const densityBonus = crowdDensity * 20; // Up to 20 point bonus for full capacity
    
    return Math.min(Math.max(baseFactor + densityBonus, 0), 100);
  }

  /**
   * Calculate noise level (0-10)
   */
  private calculateNoiseLevel(actualAttendance: number, capacity: number): number {
    const attendanceRatio = actualAttendance / capacity;
    const baseNoise = Math.pow(attendanceRatio, 0.5) * 10;
    
    return Math.min(Math.max(baseNoise, 0), 10);
  }

  /**
   * Calculate home field advantage (0.0-0.09)
   */
  private calculateHomeFieldAdvantage(intimidationFactor: number): number {
    const config = this.config.home_field;
    const advantagePercent = intimidationFactor / 100;
    
    const homeFieldAdvantage = config.base_advantage + 
      (config.max_advantage - config.base_advantage) * advantagePercent;
    
    return Math.min(Math.max(homeFieldAdvantage, 0), config.max_advantage);
  }

  /**
   * Calculate morale boost for home team (0.0-0.15)
   */
  private calculateMoraleBoost(intimidationFactor: number): number {
    const moralePercent = intimidationFactor / 100;
    return moralePercent * this.config.crowd_effects.morale_boost;
  }

  /**
   * Calculate stat penalties for away team
   */
  calculateAwayPenalties(stadiumEffects: StadiumEffects): {
    passingAccuracyPenalty: number;
    concentrationPenalty: number;
  } {
    const passingAccuracyPenalty = stadiumEffects.noiseLevel * this.config.crowd_effects.noise_penalty;
    const concentrationPenalty = stadiumEffects.intimidationFactor * 0.001; // Minor concentration penalty
    
    return {
      passingAccuracyPenalty,
      concentrationPenalty
    };
  }

  /**
   * Calculate defensive bonuses for home team
   */
  calculateDefensiveBonuses(stadiumEffects: StadiumEffects): {
    tackleBonus: number;
    interceptionBonus: number;
    moraleBonus: number;
  } {
    const tackleBonus = stadiumEffects.intimidationFactor * this.config.crowd_effects.intimidation_bonus * 0.01;
    const interceptionBonus = stadiumEffects.intimidationFactor * this.config.crowd_effects.intimidation_bonus * 0.005;
    const moraleBonus = stadiumEffects.moraleBoost;
    
    return {
      tackleBonus,
      interceptionBonus,
      moraleBonus
    };
  }

  /**
   * Get descriptive tier for intimidation factor
   */
  getIntimidationTier(intimidationFactor: number): string {
    if (intimidationFactor >= 80) return "Deafening";
    if (intimidationFactor >= 60) return "Intimidating";
    if (intimidationFactor >= 40) return "Energetic";
    if (intimidationFactor >= 20) return "Supportive";
    return "Quiet";
  }

  /**
   * Get descriptive tier for crowd density
   */
  getCrowdDensityTier(crowdDensity: number): string {
    if (crowdDensity >= 0.9) return "Packed";
    if (crowdDensity >= 0.75) return "Nearly Full";
    if (crowdDensity >= 0.6) return "Well Attended";
    if (crowdDensity >= 0.4) return "Moderate";
    return "Sparse";
  }
}

// Export singleton instance
export const stadiumEffectsCalculator = new StadiumEffectsCalculator();
export default stadiumEffectsCalculator;