/**
 * UNIFIED TIMEZONE SERVICE - Industry Standard Implementation
 * 
 * This service provides centralized timezone management for ALL game operations:
 * - League games (4PM-10PM EDT)  
 * - Game day resets (3AM EDT)
 * - Tournaments, playoffs, notifications
 * - All date/time calculations
 * 
 * Uses moment-timezone for reliable EDT/EST handling across all environments.
 */

import moment from 'moment-timezone';
import { 
  EASTERN_TIMEZONE, 
  LEAGUE_GAME_START_HOUR, 
  LEAGUE_GAME_END_HOUR,
  getEasternTime,
  getEasternTimeForDate,
  generateDailyGameTimes,
  formatEasternTime,
  getCurrentGameDayRange 
} from '../../shared/timezone.js';

export class TimezoneService {
  /**
   * Get current Eastern Time as moment object
   */
  static getCurrentEDT(): moment.Moment {
    return getEasternTime();
  }

  /**
   * Get current Eastern Time as native Date object (properly converted from EDT to UTC)
   */
  static getCurrentEDTAsDate(): Date {
    return getEasternTime().toDate();
  }

  /**
   * Convert any date to Eastern Time
   */
  static convertToEDT(date: Date): moment.Moment {
    return getEasternTimeForDate(date);
  }

  /**
   * Create properly scheduled league game times in EDT
   * This is the AUTHORITATIVE method for all league game scheduling
   */
  static createLeagueGameTimes(day: number, date: Date): Date[] {
    const easternTime = moment(date).tz(EASTERN_TIMEZONE);
    
    // Use the sophisticated daily game time generation from timezone.ts
    // This handles the proper 4PM-10PM EDT window with 15-minute intervals
    const dailyTimes = generateDailyGameTimes(day);
    
    // Map the times to the specific date
    return dailyTimes.map(time => {
      const gameTime = moment(time).tz(EASTERN_TIMEZONE);
      // Set to the correct date but keep the EDT time
      gameTime.year(easternTime.year());
      gameTime.month(easternTime.month());
      gameTime.date(easternTime.date());
      
      return gameTime.toDate(); // This automatically converts EDT to UTC for database storage
    });
  }

  /**
   * Create a specific EDT time for a given date
   * @param date - The date to set the time on
   * @param hour - Hour in EDT (0-23)
   * @param minute - Minute (0-59)
   * @param second - Second (0-59, default 0)
   */
  static createEDTTime(date: Date, hour: number, minute: number, second: number = 0): Date {
    const edtMoment = moment(date).tz(EASTERN_TIMEZONE);
    edtMoment.hour(hour).minute(minute).second(second).millisecond(0);
    return edtMoment.toDate();
  }

  /**
   * Check if current time is within league game window (4PM-10PM EDT)
   */
  static isWithinLeagueGameWindow(): boolean {
    const edtTime = this.getCurrentEDT();
    const hour = edtTime.hour();
    return hour >= LEAGUE_GAME_START_HOUR && hour < LEAGUE_GAME_END_HOUR;
  }

  /**
   * Get the current game day (resets at 3AM EDT)
   */
  static getCurrentGameDay(): { start: Date; end: Date } {
    return getCurrentGameDayRange();
  }

  /**
   * Format a date in Eastern Time
   */
  static formatEDT(date: Date, format: string = 'YYYY-MM-DD h:mm A z'): string {
    return formatEasternTime(date, format);
  }

  /**
   * Get time until next game day reset (3AM EDT)
   */
  static getTimeUntilGameDayReset(): { hours: number; minutes: number } {
    const edtTime = this.getCurrentEDT();
    const currentHour = edtTime.hour();
    
    let nextReset;
    if (currentHour < 3) {
      // Before 3AM today, next reset is today at 3AM
      nextReset = edtTime.clone().hour(3).minute(0).second(0);
    } else {
      // After 3AM today, next reset is tomorrow at 3AM
      nextReset = edtTime.clone().add(1, 'day').hour(3).minute(0).second(0);
    }
    
    const diff = nextReset.diff(edtTime, 'minutes');
    return {
      hours: Math.floor(diff / 60),
      minutes: diff % 60
    };
  }

  /**
   * Get comprehensive server time info for debugging and monitoring
   */
  static getServerTimeInfo() {
    const edtTime = this.getCurrentEDT();
    const systemTime = moment();
    const utcTime = moment.utc();
    
    return {
      systemTime: systemTime.toDate(),
      systemTimezone: systemTime.format('z'),
      utcTime: utcTime.toDate(),
      edtTime: edtTime.toDate(),
      edtFormatted: edtTime.format('YYYY-MM-DD h:mm:ss A z'),
      isLeagueGameWindow: this.isWithinLeagueGameWindow(),
      gameWindowHours: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 EDT`,
      timeUntilGameDayReset: this.getTimeUntilGameDayReset(),
      timezone: EASTERN_TIMEZONE
    };
  }

  /**
   * CRITICAL: Fix existing games with incorrect times
   * This method updates games that were created with system timezone instead of EDT
   */
  static fixGameTimeToEDT(incorrectDate: Date, targetHour: number, targetMinute: number): Date {
    // Take the date part but set the time to proper EDT
    const edtMoment = moment(incorrectDate).tz(EASTERN_TIMEZONE);
    edtMoment.hour(targetHour).minute(targetMinute).second(0).millisecond(0);
    return edtMoment.toDate();
  }

  /**
   * Validate that a date is within acceptable league game hours
   */
  static isValidLeagueGameTime(date: Date): boolean {
    const edtTime = this.convertToEDT(date);
    const hour = edtTime.hour();
    return hour >= LEAGUE_GAME_START_HOUR && hour < LEAGUE_GAME_END_HOUR;
  }
}

// Export commonly used functions as standalone exports for compatibility
export const getCurrentEDT = TimezoneService.getCurrentEDT;
export const getCurrentEDTAsDate = TimezoneService.getCurrentEDTAsDate;
export const createLeagueGameTimes = TimezoneService.createLeagueGameTimes;
export const formatEDT = TimezoneService.formatEDT;
export const createEDTTime = TimezoneService.createEDTTime;
export const getServerTimeInfo = TimezoneService.getServerTimeInfo;