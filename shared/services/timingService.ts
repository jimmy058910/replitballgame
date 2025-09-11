/**
 * COMPREHENSIVE TIMING SERVICE
 * 
 * Centralized service for all time-related calculations in Realm Rivalry.
 * Implements proper 3AM EDT boundary logic for season day advancement.
 * 
 * This service ensures unified timing across:
 * - Frontend components (headers, dashboards)
 * - Backend APIs (season routes, automation)
 * - Database operations (data consistency)
 * - Automation services (daily tasks, match scheduling)
 */

import { calculateCurrentSeasonDay, calculateCurrentSeasonNumber, getCurrentSeasonInfo } from '../dayCalculation.js';

export interface SeasonTiming {
  currentDay: number;
  seasonNumber: number;
  phase: 'REGULAR_SEASON' | 'PLAYOFFS' | 'OFF_SEASON' | 'UNKNOWN';
  description: string;
  daysRemaining: number;
  isSchedulingWindow: boolean;
  nextDayAdvancement: Date;
  easternTime: Date;
  serverTime: Date;
}

export interface TimingServiceConfig {
  enableLogging?: boolean;
  fallbackStartDate?: string;
  logPrefix?: string;
}

export class TimingService {
  private config: TimingServiceConfig;
  private static instance: TimingService;

  constructor(config: TimingServiceConfig = {}) {
    this.config = {
      enableLogging: true,
      fallbackStartDate: "2025-09-05T07:00:00.000Z",
      logPrefix: "⏰ [TIMING SERVICE]",
      ...config
    };
  }

  /**
   * Get singleton instance of timing service
   */
  static getInstance(config?: TimingServiceConfig): TimingService {
    if (!TimingService.instance) {
      TimingService.instance = new TimingService(config);
    }
    return TimingService.instance;
  }

  /**
   * Calculate comprehensive season timing information
   */
  calculateSeasonTiming(seasonStartDate?: Date): SeasonTiming {
    const startDate = seasonStartDate || new Date(this.config.fallbackStartDate!);
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    if (this.config.enableLogging) {
      console.log(`${this.config.logPrefix} Calculating timing for season start: ${startDate.toISOString()}`);
    }

    // Get calculated values using our proven 3AM EDT logic
    const currentDay = calculateCurrentSeasonDay(startDate);
    const seasonNumber = calculateCurrentSeasonNumber(startDate);

    // Determine phase and description
    const { phase, description, daysRemaining } = this.getPhaseInfo(currentDay);

    // Calculate next day advancement (next 3AM EDT)
    const nextDayAdvancement = this.calculateNextDayAdvancement(easternTime);

    // Check if we're in scheduling window (4PM-10PM EDT)
    const isSchedulingWindow = this.isInSchedulingWindow(easternTime);

    const timing: SeasonTiming = {
      currentDay,
      seasonNumber,
      phase,
      description,
      daysRemaining,
      isSchedulingWindow,
      nextDayAdvancement,
      easternTime,
      serverTime: now
    };

    if (this.config.enableLogging) {
      console.log(`${this.config.logPrefix} Calculated timing:`, {
        currentDay: timing.currentDay,
        phase: timing.phase,
        description: timing.description,
        nextAdvancement: timing.nextDayAdvancement.toISOString(),
        isSchedulingWindow: timing.isSchedulingWindow
      });
    }

    return timing;
  }

  /**
   * Get phase information for a given day
   */
  private getPhaseInfo(currentDay: number): { phase: SeasonTiming['phase'], description: string, daysRemaining: number } {
    if (currentDay >= 1 && currentDay <= 14) {
      return {
        phase: 'REGULAR_SEASON',
        description: `Regular Season - Day ${currentDay} of 14`,
        daysRemaining: 14 - currentDay
      };
    } else if (currentDay === 15) {
      return {
        phase: 'PLAYOFFS',
        description: 'Playoff Day 1 - Semifinals',
        daysRemaining: 2
      };
    } else if (currentDay === 16) {
      return {
        phase: 'PLAYOFFS',
        description: 'Playoff Day 2 - Championship',
        daysRemaining: 1
      };
    } else if (currentDay === 17) {
      return {
        phase: 'OFF_SEASON',
        description: 'Season Complete - Awards & Preparation',
        daysRemaining: 0
      };
    } else {
      return {
        phase: 'UNKNOWN',
        description: `Day ${currentDay} - Phase Unknown`,
        daysRemaining: 0
      };
    }
  }

  /**
   * Calculate when the next day advancement will occur (next 3AM EDT)
   */
  private calculateNextDayAdvancement(easternTime: Date): Date {
    const tomorrow = new Date(easternTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0); // Next 3AM EDT
    return tomorrow;
  }

  /**
   * Check if current time is within scheduling window (4PM-10PM EDT)
   */
  private isInSchedulingWindow(easternTime: Date): boolean {
    const hour = easternTime.getHours();
    return hour >= 16 && hour < 22; // 4PM to 10PM EDT
  }

  /**
   * Get current season timing for a season object
   */
  getSeasonTiming(season: { startDate?: Date | string | null }): SeasonTiming {
    let startDate: Date;
    
    if (season.startDate) {
      startDate = typeof season.startDate === 'string' ? new Date(season.startDate) : season.startDate;
    } else {
      startDate = new Date(this.config.fallbackStartDate!);
    }

    return this.calculateSeasonTiming(startDate);
  }

  /**
   * Override season data with calculated timing values
   */
  applyTimingToSeason<T extends { currentDay?: number; seasonNumber?: number }>(
    season: T, 
    seasonStartDate?: Date
  ): T & { currentDay: number; seasonNumber: number } {
    const timing = this.calculateSeasonTiming(seasonStartDate);
    
    return {
      ...season,
      currentDay: timing.currentDay,
      seasonNumber: timing.seasonNumber
    };
  }

  /**
   * Validate that timing calculations are working correctly
   */
  validateTiming(seasonStartDate: Date): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const timing = this.calculateSeasonTiming(seasonStartDate);
      
      if (timing.currentDay < 1 || timing.currentDay > 17) {
        errors.push(`Invalid currentDay: ${timing.currentDay} (must be 1-17)`);
      }
      
      if (timing.seasonNumber < 1) {
        errors.push(`Invalid seasonNumber: ${timing.seasonNumber} (must be >= 1)`);
      }
      
      if (!['REGULAR_SEASON', 'PLAYOFFS', 'OFF_SEASON', 'UNKNOWN'].includes(timing.phase)) {
        errors.push(`Invalid phase: ${timing.phase}`);
      }
      
      if (timing.nextDayAdvancement <= timing.serverTime) {
        errors.push(`Next day advancement ${timing.nextDayAdvancement.toISOString()} is not in the future`);
      }
      
    } catch (error) {
      errors.push(`Calculation failed: ${error}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Export singleton instance for easy access
 */
export const timingService = TimingService.getInstance();

/**
 * Convenience function for quick access to season timing
 */
export function getSeasonTiming(seasonStartDate?: Date): SeasonTiming {
  return timingService.calculateSeasonTiming(seasonStartDate);
}

/**
 * Convenience function to override season data with calculated values
 */
export function applyCalculatedTiming<T extends { currentDay?: number; seasonNumber?: number }>(
  season: T, 
  seasonStartDate?: Date
): T & { currentDay: number; seasonNumber: number } {
  return timingService.applyTimingToSeason(season, seasonStartDate);
}