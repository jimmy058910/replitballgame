/**
 * Game Time Utilities
 * Centralized game duration configuration based on match type
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load game config
let gameConfig: any = null;
try {
  const configPath = join(__dirname, '../config/game_config.json');
  gameConfig = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Failed to load game config:', error);
}

export type MatchType = 'EXHIBITION' | 'LEAGUE' | 'PLAYOFF' | 'TOURNAMENT';

/**
 * Get game duration in seconds based on match type
 */
export function getGameDurationSeconds(matchType: MatchType): number {
  const durations = gameConfig?.gameParameters?.matchSettings?.gameDuration;
  
  if (!durations) {
    console.warn('Game config not loaded, using fallback durations');
    // Fallback durations if config fails
    switch (matchType) {
      case 'EXHIBITION': return 1800; // 30 minutes
      case 'LEAGUE': return 2400; // 40 minutes  
      case 'PLAYOFF':
      case 'TOURNAMENT': return 2400; // 40 minutes
      default: return 2400;
    }
  }

  switch (matchType) {
    case 'EXHIBITION':
      return durations.exhibition.totalMinutes * 60;
    case 'LEAGUE':
      return durations.league.totalMinutes * 60;
    case 'PLAYOFF':
    case 'TOURNAMENT':
      return durations.tournament.totalMinutes * 60;
    default:
      return durations.league.totalMinutes * 60;
  }
}

/**
 * Get game duration in minutes based on match type
 */
export function getGameDurationMinutes(matchType: any): number {
  return getGameDurationSeconds(matchType) / 60;
}

/**
 * Get half duration in seconds based on match type
 */
export function getHalfDurationSeconds(matchType: any): number {
  const durations = gameConfig?.gameParameters?.matchSettings?.gameDuration;
  
  if (!durations) {
    // Fallback half durations if config fails
    switch (matchType) {
      case 'EXHIBITION': return 900; // 15 minutes
      case 'LEAGUE': return 1200; // 20 minutes
      case 'PLAYOFF':
      case 'TOURNAMENT': return 1200; // 20 minutes
      default: return 1200;
    }
  }

  switch (matchType) {
    case 'EXHIBITION':
      return durations.exhibition.halfMinutes * 60;
    case 'LEAGUE':
      return durations.league.halfMinutes * 60;
    case 'PLAYOFF':
    case 'TOURNAMENT':
      return durations.tournament.halfMinutes * 60;
    default:
      return durations.league.halfMinutes * 60;
  }
}

/**
 * Get half duration in minutes based on match type
 */
export function getHalfDurationMinutes(matchType: any): number {
  return getHalfDurationSeconds(matchType) / 60;
}

/**
 * Check if match type supports overtime
 */
export function supportsOvertime(matchType: any): boolean {
  const durations = gameConfig?.gameParameters?.matchSettings?.gameDuration;
  
  switch (matchType) {
    case 'PLAYOFF':
    case 'TOURNAMENT':
      return durations?.tournament?.overtimeEnabled ?? true;
    case 'EXHIBITION':
    case 'LEAGUE':
    default:
      return false;
  }
}

/**
 * Get display name for match duration
 */
export function getMatchDurationDisplay(matchType: any): string {
  const totalMinutes = getGameDurationMinutes(matchType);
  const halfMinutes = getHalfDurationMinutes(matchType);
  
  let display = `${totalMinutes} minutes (${halfMinutes}×2)`;
  
  if (supportsOvertime(matchType)) {
    display += ' + overtime';
  }
  
  return display;
}