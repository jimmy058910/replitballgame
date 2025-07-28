/**
 * Client-side Game Time Utilities
 * Matches server-side gameTimeUtils configuration for consistency
 */

export type MatchType = 'EXHIBITION' | 'LEAGUE' | 'PLAYOFF' | 'TOURNAMENT';

// Centralized duration configuration matching server-side config
const DURATION_CONFIG = {
  EXHIBITION: {
    totalMinutes: 30,
    halfMinutes: 15,
    overtimeEnabled: false
  },
  LEAGUE: {
    totalMinutes: 40,
    halfMinutes: 20,
    overtimeEnabled: false
  },
  PLAYOFF: {
    totalMinutes: 40,
    halfMinutes: 20,
    overtimeEnabled: true
  },
  TOURNAMENT: {
    totalMinutes: 40,
    halfMinutes: 20,
    overtimeEnabled: true
  }
};

/**
 * Get game duration in seconds based on match type
 */
export function getGameDurationSeconds(matchType: MatchType): number {
  return DURATION_CONFIG[matchType].totalMinutes * 60;
}

/**
 * Get game duration in minutes based on match type
 */
export function getGameDurationMinutes(matchType: MatchType): number {
  return DURATION_CONFIG[matchType].totalMinutes;
}

/**
 * Get half duration in seconds based on match type
 */
export function getHalfDurationSeconds(matchType: MatchType): number {
  return DURATION_CONFIG[matchType].halfMinutes * 60;
}

/**
 * Get half duration in minutes based on match type
 */
export function getHalfDurationMinutes(matchType: MatchType): number {
  return DURATION_CONFIG[matchType].halfMinutes;
}

/**
 * Check if match type supports overtime
 */
export function supportsOvertime(matchType: MatchType): boolean {
  return DURATION_CONFIG[matchType].overtimeEnabled;
}

/**
 * Get display name for match duration
 */
export function getMatchDurationDisplay(matchType: MatchType): string {
  const totalMinutes = getGameDurationMinutes(matchType);
  const halfMinutes = getHalfDurationMinutes(matchType);
  
  let display = `${totalMinutes} minutes (${halfMinutes}×2)`;
  
  if (supportsOvertime(matchType)) {
    display += ' + overtime';
  }
  
  return display;
}

/**
 * Convert legacy boolean isExhibition to MatchType
 */
export function getMatchTypeFromExhibition(isExhibition: boolean): MatchType {
  return isExhibition ? 'EXHIBITION' : 'LEAGUE';
}