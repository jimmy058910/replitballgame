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
    overtimeEnabled: true,
    overtime: {
      type: 'timed_then_sudden_death',
      timedPeriodMinutes: 10,
      maxTimedPeriods: 1,
      suddenDeathAfterTied: true
    }
  },
  TOURNAMENT: {
    totalMinutes: 40,
    halfMinutes: 20,
    overtimeEnabled: true,
    overtime: {
      type: 'timed_then_sudden_death',
      timedPeriodMinutes: 10,
      maxTimedPeriods: 1,
      suddenDeathAfterTied: true
    }
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
 * Get overtime duration in minutes
 */
export function getOvertimeDurationMinutes(matchType: MatchType): number | null {
  const config = DURATION_CONFIG[matchType];
  return config.overtime?.timedPeriodMinutes || null;
}

/**
 * Check if match supports sudden death
 */
export function supportsSuddenDeath(matchType: MatchType): boolean {
  const config = DURATION_CONFIG[matchType];
  return config.overtime?.suddenDeathAfterTied || false;
}

/**
 * Get overtime type description
 */
export function getOvertimeTypeDisplay(matchType: MatchType): string | null {
  if (!supportsOvertime(matchType)) return null;
  
  const overtimeMinutes = getOvertimeDurationMinutes(matchType);
  const hasSuddenDeath = supportsSuddenDeath(matchType);
  
  if (overtimeMinutes && hasSuddenDeath) {
    return `${overtimeMinutes}-minute overtime, then sudden death`;
  } else if (overtimeMinutes) {
    return `${overtimeMinutes}-minute overtime`;
  }
  
  return 'sudden death';
}

/**
 * Get display name for match duration
 */
export function getMatchDurationDisplay(matchType: MatchType): string {
  const totalMinutes = getGameDurationMinutes(matchType);
  const halfMinutes = getHalfDurationMinutes(matchType);
  
  let display = `${totalMinutes} minutes (${halfMinutes}×2)`;
  
  const overtimeDisplay = getOvertimeTypeDisplay(matchType);
  if (overtimeDisplay) {
    display += ` + ${overtimeDisplay}`;
  }
  
  return display;
}

/**
 * Convert legacy boolean isExhibition to MatchType
 */
export function getMatchTypeFromExhibition(isExhibition: boolean): MatchType {
  return isExhibition ? 'EXHIBITION' : 'LEAGUE';
}