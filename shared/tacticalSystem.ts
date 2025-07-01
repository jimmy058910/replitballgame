/**
 * Advanced Team Tactics & Strategy System
 * Implements multi-layered tactical system for text-based sports simulation
 */

export type FieldSize = "standard" | "large" | "small";
export type TacticalFocus = "balanced" | "all_out_attack" | "defensive_wall";
export type GameSituation = "winning_big" | "losing_big" | "late_close" | "normal";

export interface TacticalModifiers {
  // Field Size Effects
  passRangeModifier: number;
  staminaDepletionModifier: number;
  blockerRangeModifier: number;
  powerBonusModifier: number;
  longPassAccuracyPenalty: number;
  
  // Tactical Focus Effects
  runnerRouteDepthModifier: number;
  passerRiskToleranceModifier: number;
  blockerAggressionModifier: number;
  defensiveLinePositionModifier: number;
  
  // Situational Effects
  riskToleranceModifier: number;
  conservativePlayModifier: number;
  desperationModifier: number;
  clutchPerformanceModifier: number;
}

export interface GameState {
  homeScore: number;
  awayScore: number;
  gameTime: number; // seconds elapsed
  maxTime: number; // total game time
  currentHalf: 1 | 2;
}

export interface TeamTacticalInfo {
  fieldSize: FieldSize;
  tacticalFocus: TacticalFocus;
  camaraderie: number;
  headCoachTactics: number;
  isHomeTeam: boolean;
}

/**
 * Field Size Configurations
 */
export const FIELD_SIZE_CONFIG: Record<FieldSize, {
  name: string;
  description: string;
  strategicFocus: string;
  passRangeModifier: number;
  staminaDepletionModifier: number;
  blockerRangeModifier: number;
  powerBonusModifier: number;
  longPassAccuracyPenalty: number;
}> = {
  standard: {
    name: "Standard Field",
    description: "The default, balanced field",
    strategicFocus: "All-around",
    passRangeModifier: 1.0,
    staminaDepletionModifier: 1.0,
    blockerRangeModifier: 1.0,
    powerBonusModifier: 0.0,
    longPassAccuracyPenalty: 0.0,
  },
  large: {
    name: "Large Field",
    description: "A wider and longer field",
    strategicFocus: "Speed & Passing",
    passRangeModifier: 1.3,
    staminaDepletionModifier: 1.25,
    blockerRangeModifier: 1.0,
    powerBonusModifier: 0.0,
    longPassAccuracyPenalty: 0.0,
  },
  small: {
    name: "Small Field",
    description: "A cramped, narrow field",
    strategicFocus: "Power & Defense",
    passRangeModifier: 1.0,
    staminaDepletionModifier: 1.0,
    blockerRangeModifier: 1.4,
    powerBonusModifier: 3.0,
    longPassAccuracyPenalty: 0.25,
  },
};

/**
 * Tactical Focus Configurations
 */
export const TACTICAL_FOCUS_CONFIG: Record<TacticalFocus, {
  name: string;
  description: string;
  runnerRouteDepthModifier: number;
  passerRiskToleranceModifier: number;
  blockerAggressionModifier: number;
  defensiveLinePositionModifier: number;
}> = {
  balanced: {
    name: "Balanced",
    description: "Standard approach",
    runnerRouteDepthModifier: 1.0,
    passerRiskToleranceModifier: 1.0,
    blockerAggressionModifier: 1.0,
    defensiveLinePositionModifier: 1.0,
  },
  all_out_attack: {
    name: "All-Out Attack",
    description: "High-risk, high-reward offense",
    runnerRouteDepthModifier: 1.4,
    passerRiskToleranceModifier: 1.6,
    blockerAggressionModifier: 1.3,
    defensiveLinePositionModifier: 0.7, // Closer to midfield = more vulnerable
  },
  defensive_wall: {
    name: "Defensive Wall",
    description: "Conservative, low-risk approach",
    runnerRouteDepthModifier: 0.7,
    passerRiskToleranceModifier: 0.5,
    blockerAggressionModifier: 0.8,
    defensiveLinePositionModifier: 1.4, // Deeper defensive line
  },
};

/**
 * Determines current game situation based on score and time
 */
export function determineGameSituation(gameState: GameState): GameSituation {
  const { homeScore, awayScore, gameTime, maxTime, currentHalf } = gameState;
  const scoreDifference = Math.abs(homeScore - awayScore);
  const timeRemaining = maxTime - gameTime;
  const isSecondHalf = currentHalf === 2;
  const isLateInGame = timeRemaining <= 180; // Final 3 minutes
  const isCloseGame = scoreDifference <= 1;
  
  // Late & Close Game (final 3 minutes, within 1 point)
  if (isLateInGame && isCloseGame) {
    return "late_close";
  }
  
  // Winning/Losing Big (2+ score difference in second half)
  if (isSecondHalf && scoreDifference >= 2) {
    return homeScore > awayScore ? "winning_big" : "losing_big";
  }
  
  return "normal";
}

/**
 * Calculates tactical modifiers based on team setup and game situation
 */
export function calculateTacticalModifiers(
  teamInfo: TeamTacticalInfo,
  gameState: GameState,
  isHomeTeam: boolean = true
): TacticalModifiers {
  const { fieldSize, tacticalFocus, camaraderie, headCoachTactics } = teamInfo;
  const situation = determineGameSituation(gameState);
  
  // Base modifiers from field size (only applies to home team)
  const fieldConfig = FIELD_SIZE_CONFIG[fieldSize];
  const baseFieldMods = isHomeTeam ? fieldConfig : FIELD_SIZE_CONFIG.standard;
  
  // Base modifiers from tactical focus
  const tacticsConfig = TACTICAL_FOCUS_CONFIG[tacticalFocus];
  
  // Coach effectiveness modifier (0.5 to 1.5 based on coach tactics rating)
  const coachEffectiveness = 0.5 + (headCoachTactics / 100);
  
  // Apply coach effectiveness to tactical focus benefits/penalties
  const coachModifiedTactics = {
    runnerRouteDepthModifier: 1.0 + ((tacticsConfig.runnerRouteDepthModifier - 1.0) * coachEffectiveness),
    passerRiskToleranceModifier: 1.0 + ((tacticsConfig.passerRiskToleranceModifier - 1.0) * coachEffectiveness),
    blockerAggressionModifier: 1.0 + ((tacticsConfig.blockerAggressionModifier - 1.0) * coachEffectiveness),
    defensiveLinePositionModifier: 1.0 + ((tacticsConfig.defensiveLinePositionModifier - 1.0) * coachEffectiveness),
  };
  
  // Situational modifiers
  let situationalMods = {
    riskToleranceModifier: 1.0,
    conservativePlayModifier: 1.0,
    desperationModifier: 1.0,
    clutchPerformanceModifier: 1.0,
  };
  
  // Apply situational effects
  switch (situation) {
    case "winning_big":
      situationalMods.conservativePlayModifier = 1.5;
      situationalMods.riskToleranceModifier = 0.6;
      break;
      
    case "losing_big":
      // Override tactical focus with desperation
      coachModifiedTactics.runnerRouteDepthModifier = 1.6;
      coachModifiedTactics.passerRiskToleranceModifier = 2.0;
      coachModifiedTactics.blockerAggressionModifier = 1.4;
      situationalMods.desperationModifier = 1.3;
      break;
      
    case "late_close":
      // Camaraderie and leadership impact
      const camaraderieEffect = (camaraderie - 50) / 100; // -0.5 to +0.5
      situationalMods.clutchPerformanceModifier = 1.0 + (camaraderieEffect * 0.3);
      break;
  }
  
  return {
    // Field Size Effects
    passRangeModifier: baseFieldMods.passRangeModifier,
    staminaDepletionModifier: baseFieldMods.staminaDepletionModifier,
    blockerRangeModifier: baseFieldMods.blockerRangeModifier,
    powerBonusModifier: baseFieldMods.powerBonusModifier,
    longPassAccuracyPenalty: baseFieldMods.longPassAccuracyPenalty,
    
    // Tactical Focus Effects (modified by coach)
    runnerRouteDepthModifier: coachModifiedTactics.runnerRouteDepthModifier,
    passerRiskToleranceModifier: coachModifiedTactics.passerRiskToleranceModifier,
    blockerAggressionModifier: coachModifiedTactics.blockerAggressionModifier,
    defensiveLinePositionModifier: coachModifiedTactics.defensiveLinePositionModifier,
    
    // Situational Effects
    ...situationalMods,
  };
}

/**
 * Gets display information for field sizes
 */
export function getFieldSizeInfo(fieldSize: FieldSize) {
  return FIELD_SIZE_CONFIG[fieldSize];
}

/**
 * Gets display information for tactical focus
 */
export function getTacticalFocusInfo(tacticalFocus: TacticalFocus) {
  return TACTICAL_FOCUS_CONFIG[tacticalFocus];
}

/**
 * Validates if field size can be changed (only during off-season or day 1)
 */
export function canChangeFieldSize(currentDay: number): boolean {
  return currentDay === 1 || currentDay >= 16; // Day 1 or off-season (Days 16-17)
}

/**
 * Calculates effectiveness of a tactical setup
 */
export function calculateTacticalEffectiveness(
  teamInfo: TeamTacticalInfo,
  teamRoster: any[], // Player array
  gameState: GameState
): {
  fieldSizeEffectiveness: number;
  tacticalFocusEffectiveness: number;
  overallEffectiveness: number;
  recommendations: string[];
} {
  const modifiers = calculateTacticalModifiers(teamInfo, gameState, teamInfo.isHomeTeam);
  const recommendations: string[] = [];
  
  // Analyze roster composition for field size effectiveness
  const avgSpeed = teamRoster.reduce((sum, p) => sum + (p.speed || 0), 0) / teamRoster.length;
  const avgPower = teamRoster.reduce((sum, p) => sum + (p.power || 0), 0) / teamRoster.length;
  const avgThrowing = teamRoster.reduce((sum, p) => sum + (p.throwing || 0), 0) / teamRoster.length;
  
  let fieldSizeEffectiveness = 0.5; // Base 50%
  
  switch (teamInfo.fieldSize) {
    case "large":
      if (avgSpeed > 25 && avgThrowing > 25) {
        fieldSizeEffectiveness = 0.8;
      } else if (avgSpeed < 20 || avgThrowing < 20) {
        fieldSizeEffectiveness = 0.3;
        recommendations.push("Consider Standard field - your team lacks speed/passing for Large field advantage");
      }
      break;
      
    case "small":
      if (avgPower > 25) {
        fieldSizeEffectiveness = 0.8;
      } else if (avgPower < 20) {
        fieldSizeEffectiveness = 0.3;
        recommendations.push("Consider Standard field - your team lacks power for Small field advantage");
      }
      break;
      
    case "standard":
      fieldSizeEffectiveness = 0.6; // Always decent
      break;
  }
  
  // Analyze tactical focus effectiveness
  let tacticalFocusEffectiveness = 0.5;
  
  switch (teamInfo.tacticalFocus) {
    case "all_out_attack":
      if (avgSpeed > 25 && teamInfo.camaraderie > 60) {
        tacticalFocusEffectiveness = 0.8;
      } else if (teamInfo.camaraderie < 40) {
        tacticalFocusEffectiveness = 0.3;
        recommendations.push("All-Out Attack risky with low team camaraderie");
      }
      break;
      
    case "defensive_wall":
      if (avgPower > 25 && teamInfo.camaraderie > 60) {
        tacticalFocusEffectiveness = 0.8;
      } else if (avgPower < 20) {
        tacticalFocusEffectiveness = 0.4;
        recommendations.push("Defensive Wall less effective without strong defensive players");
      }
      break;
      
    case "balanced":
      tacticalFocusEffectiveness = 0.6; // Always decent
      break;
  }
  
  // Coach impact
  const coachImpact = teamInfo.headCoachTactics / 100;
  tacticalFocusEffectiveness = Math.min(1.0, tacticalFocusEffectiveness + (coachImpact * 0.2));
  
  const overallEffectiveness = (fieldSizeEffectiveness + tacticalFocusEffectiveness) / 2;
  
  if (overallEffectiveness < 0.4) {
    recommendations.push("Consider reviewing your tactical setup - current effectiveness is low");
  }
  
  return {
    fieldSizeEffectiveness,
    tacticalFocusEffectiveness,
    overallEffectiveness,
    recommendations,
  };
}