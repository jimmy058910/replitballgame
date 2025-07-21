import { prisma } from '../db.js';

export class AdvancedTacticalEffectsService {

  /**
   * Field size effects configuration
   */
  static readonly FIELD_SIZE_EFFECTS = {
    Standard: {
      name: 'Standard Field',
      description: 'The default, balanced field with no special modifiers',
      effects: {
        passRangeModifier: 1.0,
        staminaDepletionModifier: 1.0,
        blockerEngagementModifier: 1.0,
        powerBonusModifier: 0,
        passAccuracyModifier: 1.0,
        kickAccuracyModifier: 1.0
      }
    },
    Large: {
      name: 'Large Field',
      description: 'A wider and longer field favoring speed & passing',
      effects: {
        passRangeModifier: 1.3, // +30% pass range
        staminaDepletionModifier: 1.25, // +25% stamina depletion
        blockerEngagementModifier: 0.9, // -10% blocker engagement
        powerBonusModifier: 0,
        passAccuracyModifier: 1.1, // +10% pass accuracy
        kickAccuracyModifier: 1.15 // +15% kick accuracy
      }
    },
    Small: {
      name: 'Small Field',
      description: 'A cramped, narrow field favoring power & defense',
      effects: {
        passRangeModifier: 0.7, // -30% pass range
        staminaDepletionModifier: 0.9, // -10% stamina depletion
        blockerEngagementModifier: 1.4, // +40% blocker engagement
        powerBonusModifier: 3, // +3 power for tackle contests
        passAccuracyModifier: 0.8, // -20% pass accuracy for long passes
        kickAccuracyModifier: 0.75 // -25% kick accuracy
      }
    }
  };

  /**
   * Tactical focus effects configuration
   */
  static readonly TACTICAL_FOCUS_EFFECTS = {
    Balanced: {
      name: 'Balanced Approach',
      description: 'Standard approach with default AI behavior',
      effects: {
        offensiveAggressiveness: 1.0,
        defensivePositioning: 1.0,
        passRiskTolerance: 1.0,
        runningDepth: 1.0,
        defensiveVulnerability: 1.0
      }
    },
    'All-Out Attack': {
      name: 'All-Out Attack',
      description: 'High-risk, high-reward offensive approach',
      effects: {
        offensiveAggressiveness: 1.5, // +50% aggressive play
        defensivePositioning: 0.7, // -30% defensive positioning
        passRiskTolerance: 1.4, // +40% willing to attempt risky passes
        runningDepth: 1.3, // +30% deeper routes
        defensiveVulnerability: 1.6 // +60% vulnerable to counters
      }
    },
    'Defensive Wall': {
      name: 'Defensive Wall',
      description: 'Conservative, low-risk defensive approach',
      effects: {
        offensiveAggressiveness: 0.6, // -40% aggressive play
        defensivePositioning: 1.4, // +40% better defensive positioning
        passRiskTolerance: 0.5, // -50% risk tolerance
        runningDepth: 0.7, // -30% shorter routes
        defensiveVulnerability: 0.6 // -40% less vulnerable
      }
    }
  };

  /**
   * Calculate game situation based on score and time
   */
  static calculateGameSituation(
    homeScore: number,
    awayScore: number,
    timeRemaining: number,
    totalTime: number,
    isHomeTeam: boolean
  ): 'winning_big' | 'losing_big' | 'late_close' | 'normal' {
    const teamScore = isHomeTeam ? homeScore : awayScore;
    const opponentScore = isHomeTeam ? awayScore : homeScore;
    const scoreDiff = teamScore - opponentScore;
    const timeElapsed = totalTime - timeRemaining;
    const isSecondHalf = timeElapsed > (totalTime * 0.5);
    const isLateGame = timeRemaining <= (totalTime * 0.15); // Final 15% of game

    // Winning/losing big in second half
    if (isSecondHalf && Math.abs(scoreDiff) >= 2) {
      return scoreDiff >= 2 ? 'winning_big' : 'losing_big';
    }

    // Late and close game
    if (isLateGame && Math.abs(scoreDiff) <= 1) {
      return 'late_close';
    }

    return 'normal';
  }

  /**
   * Apply situational AI modifiers based on game state
   */
  static applySituationalModifiers(
    baseTacticalEffects: any,
    gameSituation: string,
    teamCamaraderie: number,
    coachTacticsRating: number
  ) {
    const modifiedEffects = { ...baseTacticalEffects };

    switch (gameSituation) {
      case 'winning_big':
        // Protect the lead - conservative play
        modifiedEffects.offensiveAggressiveness *= 0.6;
        modifiedEffects.passRiskTolerance *= 0.4;
        modifiedEffects.runningDepth *= 0.7;
        modifiedEffects.defensivePositioning *= 1.2;
        break;

      case 'losing_big':
        // Desperate measures - all-out attack mode
        modifiedEffects.offensiveAggressiveness *= 1.8;
        modifiedEffects.passRiskTolerance *= 2.0;
        modifiedEffects.runningDepth *= 1.5;
        modifiedEffects.defensiveVulnerability *= 1.8;
        break;

      case 'late_close':
        // Clutch time - camaraderie and leadership effects
        const camaraderieEffect = (teamCamaraderie - 50) / 50; // -1 to +1 scale
        const clutchBonus = 1 + (camaraderieEffect * 0.3); // ±30% based on camaraderie
        
        modifiedEffects.clutchPerformance = clutchBonus;
        modifiedEffects.passAccuracy = clutchBonus;
        modifiedEffects.catchSuccess = clutchBonus;
        modifiedEffects.tackleSuccess = clutchBonus;
        break;
    }

    // Coach tactics rating amplifies/reduces effects
    const coachEffectiveness = Math.max(0.5, Math.min(1.5, coachTacticsRating / 50));
    
    // Apply coach modifier to all tactical effects (except baseline 1.0 values)
    Object.keys(modifiedEffects).forEach(key => {
      if (modifiedEffects[key] !== 1.0) {
        const deviation = modifiedEffects[key] - 1.0;
        modifiedEffects[key] = 1.0 + (deviation * coachEffectiveness);
      }
    });

    return modifiedEffects;
  }

  /**
   * Get comprehensive tactical modifiers for a team in a match
   */
  static async getMatchTacticalModifiers(
    teamId: string,
    isHomeTeam: boolean,
    homeScore: number = 0,
    awayScore: number = 0,
    timeRemaining: number = 1200, // 20 minutes default
    totalTime: number = 1200
  ): Promise<{
    fieldEffects: any;
    tacticalEffects: any;
    situationalEffects: any;
    combinedModifiers: any;
    gameSituation: string;
  }> {
    // Get team data
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId) }
    });
    if (!team) {
      throw new Error('Team not found');
    }

    // Get field effects (only for home team) - using homeField instead of non-existent fieldSize
    const fieldSize = isHomeTeam ? (team.homeField || 'STANDARD') : 'STANDARD';
    const fieldEffects = this.FIELD_SIZE_EFFECTS[fieldSize];

    // Get tactical focus effects
    const tacticalFocus = team.tacticalFocus || 'Balanced';
    const baseTacticalEffects = (this.TACTICAL_FOCUS_EFFECTS as any)[tacticalFocus];

    // Get head coach tactics rating
    const headCoach = await prisma.staff.findMany({
      where: {
        teamId: parseInt(teamId),
        type: 'HEAD_COACH'
      }
    });

    const coachTacticsRating = (headCoach[0] as any)?.tactics || 50;

    // Calculate game situation
    const gameSituation = this.calculateGameSituation(
      homeScore, awayScore, timeRemaining, totalTime, isHomeTeam
    );

    // Apply situational modifiers
    const situationalEffects = this.applySituationalModifiers(
      baseTacticalEffects.effects,
      gameSituation,
      (team as any).camaraderie || 50,
      coachTacticsRating
    );

    // Combine all effects
    const combinedModifiers = this.combineAllEffects(
      fieldEffects.effects,
      situationalEffects,
      isHomeTeam
    );

    return {
      fieldEffects: fieldEffects.effects,
      tacticalEffects: baseTacticalEffects.effects,
      situationalEffects,
      combinedModifiers,
      gameSituation
    };
  }

  /**
   * Combine field, tactical, and situational effects
   */
  static combineAllEffects(fieldEffects: any, tacticalEffects: any, isHomeTeam: boolean) {
    const combined = { ...tacticalEffects };

    // Field effects only apply to home team
    if (isHomeTeam) {
      combined.passRangeModifier = (combined.passRangeModifier || 1.0) * fieldEffects.passRangeModifier;
      combined.staminaDepletionModifier = (combined.staminaDepletionModifier || 1.0) * fieldEffects.staminaDepletionModifier;
      combined.blockerEngagementModifier = (combined.blockerEngagementModifier || 1.0) * fieldEffects.blockerEngagementModifier;
      combined.powerBonusModifier = (combined.powerBonusModifier || 0) + fieldEffects.powerBonusModifier;
      combined.passAccuracyModifier = (combined.passAccuracyModifier || 1.0) * fieldEffects.passAccuracyModifier;
      combined.kickAccuracyModifier = (combined.kickAccuracyModifier || 1.0) * fieldEffects.kickAccuracyModifier;
    }

    return combined;
  }

  /**
   * Apply tactical modifiers to player stats during match simulation
   */
  static applyTacticalModifiersToPlayer(
    player: any,
    modifiers: any,
    role: string
  ): any {
    const modifiedPlayer = { ...player };

    // Apply stamina depletion modifier
    if (modifiers.staminaDepletionModifier) {
      modifiedPlayer.staminaDepletionRate = (modifiedPlayer.staminaDepletionRate || 1.0) * modifiers.staminaDepletionModifier;
    }

    // Apply power bonus for tackle contests
    if (modifiers.powerBonusModifier) {
      modifiedPlayer.effectivePower = (modifiedPlayer.power || 0) + modifiers.powerBonusModifier;
    }

    // Apply pass accuracy modifiers for passers
    if (role === 'Passer' && modifiers.passAccuracyModifier) {
      modifiedPlayer.effectiveAccuracy = (modifiedPlayer.throwing || 0) * modifiers.passAccuracyModifier;
    }

    // Apply catching modifiers based on risk tolerance
    if (role === 'Runner' && modifiers.passRiskTolerance) {
      modifiedPlayer.catchingModifier = modifiers.passRiskTolerance;
    }

    // Apply clutch performance modifiers if in late game
    if (modifiers.clutchPerformance) {
      modifiedPlayer.clutchBonus = modifiers.clutchPerformance;
      modifiedPlayer.effectiveAgility = (modifiedPlayer.agility || 0) * modifiers.clutchPerformance;
      modifiedPlayer.effectiveCatching = (modifiedPlayer.catching || 0) * modifiers.clutchPerformance;
    }

    return modifiedPlayer;
  }

  /**
   * Update team field size (only during off-season or Day 1)
   */
  static async updateTeamFieldSize(
    teamId: string,
    fieldSize: 'Standard' | 'Large' | 'Small',
    currentDay: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if field size change is allowed (Days 16-17 or Day 1)
      const canChangeField = currentDay === 1 || currentDay >= 16;
      
      if (!canChangeField) {
        return { 
          success: false, 
          error: 'Field size can only be changed during off-season (Days 16-17) or on Day 1' 
        };
      }

      await prisma.team.update({
        where: { id: parseInt(teamId) },
        data: { homeField: fieldSize }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating field size:', error);
      return { success: false, error: 'Database error' };
    }
  }

  /**
   * Update team tactical focus (can be changed before each match)
   */
  static async updateTeamTacticalFocus(
    teamId: string,
    tacticalFocus: 'Balanced' | 'All-Out Attack' | 'Defensive Wall'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.team.update({
        where: { id: parseInt(teamId) },
        data: { tacticalFocus }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating tactical focus:', error);
      return { success: false, error: 'Database error' };
    }
  }

  /**
   * Get team's current tactical configuration
   */
  static async getTeamTacticalConfiguration(teamId: string): Promise<{
    fieldSize: string;
    tacticalFocus: string;
    fieldEffects: any;
    tacticalEffects: any;
    coachTacticsRating: number;
    teamCamaraderie: number;
  }> {
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId) }
    });
    if (!team) {
      throw new Error('Team not found');
    }

    const headCoach = await prisma.staff.findMany({
      where: {
        teamId: parseInt(teamId),
        type: 'HEAD_COACH'
      }
    });

    const fieldSize = team.homeField || 'STANDARD';
    const tacticalFocus = team.tacticalFocus || 'Balanced';

    return {
      fieldSize,
      tacticalFocus,
      fieldEffects: this.FIELD_SIZE_EFFECTS[fieldSize],
      tacticalEffects: this.TACTICAL_FOCUS_EFFECTS[tacticalFocus],
      coachTacticsRating: headCoach[0]?.tactics || 50,
      teamCamaraderie: team.camaraderie || 50
    };
  }

  /**
   * Analyze tactical effectiveness for a team setup
   */
  static analyzeTacticalEffectiveness(
    fieldSize: string,
    tacticalFocus: string,
    coachTacticsRating: number,
    rosterComposition: { passers: number; runners: number; blockers: number }
  ): {
    overallRating: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const fieldEffects = this.FIELD_SIZE_EFFECTS[fieldSize];
    const tacticalEffects = this.TACTICAL_FOCUS_EFFECTS[tacticalFocus];
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    let effectivenessScore = 50; // Base score

    // Analyze field size vs roster composition
    if (fieldSize === 'Large' && rosterComposition.passers >= 2) {
      strengths.push('Large field complements passing-heavy roster');
      effectivenessScore += 15;
    } else if (fieldSize === 'Small' && rosterComposition.blockers >= 3) {
      strengths.push('Small field amplifies defensive blocking power');
      effectivenessScore += 15;
    }

    // Analyze tactical focus effectiveness
    if (tacticalFocus === 'All-Out Attack' && rosterComposition.runners >= 3) {
      strengths.push('Aggressive tactics suit runner-heavy lineup');
      effectivenessScore += 10;
    } else if (tacticalFocus === 'Defensive Wall' && rosterComposition.blockers >= 4) {
      strengths.push('Defensive tactics maximize blocker potential');
      effectivenessScore += 10;
    }

    // Coach effectiveness impact
    const coachMultiplier = Math.max(0.7, Math.min(1.3, coachTacticsRating / 50));
    effectivenessScore *= coachMultiplier;

    if (coachTacticsRating < 40) {
      weaknesses.push('Low coach tactics rating reduces tactical effectiveness');
      recommendations.push('Consider hiring a coach with higher tactics rating');
    }

    // Field size recommendations
    if (rosterComposition.passers >= 3 && fieldSize !== 'Large') {
      recommendations.push('Consider Large field to maximize passing potential');
    } else if (rosterComposition.blockers >= 4 && fieldSize !== 'Small') {
      recommendations.push('Consider Small field to leverage defensive strength');
    }

    return {
      overallRating: Math.round(Math.max(0, Math.min(100, effectivenessScore))),
      strengths,
      weaknesses,
      recommendations
    };
  }

  /**
   * Get available field sizes and tactical focuses
   */
  static getAvailableOptions() {
    return {
      fieldSizes: Object.keys(this.FIELD_SIZE_EFFECTS),
      tacticalFocuses: Object.keys(this.TACTICAL_FOCUS_EFFECTS),
      fieldSizeDetails: this.FIELD_SIZE_EFFECTS,
      tacticalFocusDetails: this.TACTICAL_FOCUS_EFFECTS
    };
  }
}