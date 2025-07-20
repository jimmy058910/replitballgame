import { describe, it, expect } from 'vitest';
import {
  calculateTacticalModifiers,
  determineGameSituation,
  canChangeFieldSize,
  calculateTacticalEffectiveness,
  FIELD_SIZE_CONFIG,
  TACTICAL_FOCUS_CONFIG,
  getFieldSizeInfo,
  getTacticalFocusInfo,
  type FieldSize,
  type TacticalFocus,
  type GameState,
  type TeamTacticalInfo
} from '../tacticalSystem';

describe('Tactical System Tests', () => {
  describe('Field Size Configuration', () => {
    it('should have correct field size configurations', () => {
      expect(FIELD_SIZE_CONFIG.standard).toBeDefined();
      expect(FIELD_SIZE_CONFIG.large).toBeDefined();
      expect(FIELD_SIZE_CONFIG.small).toBeDefined();
      
      // Standard field should have no modifiers
      expect(FIELD_SIZE_CONFIG.standard.passRangeModifier).toBe(1.0);
      expect(FIELD_SIZE_CONFIG.standard.staminaDepletionModifier).toBe(1.0);
      
      // Large field should favor speed and passing
      expect(FIELD_SIZE_CONFIG.large.passRangeModifier).toBeGreaterThan(1.0);
      expect(FIELD_SIZE_CONFIG.large.staminaDepletionModifier).toBeGreaterThan(1.0);
      
      // Small field should favor power and defense
      expect(FIELD_SIZE_CONFIG.small.blockerRangeModifier).toBeGreaterThan(1.0);
      expect(FIELD_SIZE_CONFIG.small.powerBonusModifier).toBeGreaterThan(0);
    });

    it('should provide field size info correctly', () => {
      const standardInfo = getFieldSizeInfo('standard');
      expect(standardInfo.name).toBe('Standard Field');
      expect(standardInfo.strategicFocus).toBe('All-around');
      
      const largeInfo = getFieldSizeInfo('large');
      expect(largeInfo.name).toBe('Large Field');
      expect(largeInfo.strategicFocus).toBe('Speed & Passing');
    });
  });

  describe('Tactical Focus Configuration', () => {
    it('should have correct tactical focus configurations', () => {
      expect(TACTICAL_FOCUS_CONFIG.balanced).toBeDefined();
      expect(TACTICAL_FOCUS_CONFIG.all_out_attack).toBeDefined();
      expect(TACTICAL_FOCUS_CONFIG.defensive_wall).toBeDefined();
      
      // Balanced should be neutral
      expect(TACTICAL_FOCUS_CONFIG.balanced.runnerRouteDepthModifier).toBe(1.0);
      expect(TACTICAL_FOCUS_CONFIG.balanced.passerRiskToleranceModifier).toBe(1.0);
      
      // All-out attack should increase offensive stats
      expect(TACTICAL_FOCUS_CONFIG.all_out_attack.runnerRouteDepthModifier).toBeGreaterThan(1.0);
      expect(TACTICAL_FOCUS_CONFIG.all_out_attack.passerRiskToleranceModifier).toBeGreaterThan(1.0);
      
      // Defensive wall should be conservative
      expect(TACTICAL_FOCUS_CONFIG.defensive_wall.runnerRouteDepthModifier).toBeLessThan(1.0);
      expect(TACTICAL_FOCUS_CONFIG.defensive_wall.passerRiskToleranceModifier).toBeLessThan(1.0);
    });

    it('should provide tactical focus info correctly', () => {
      const balancedInfo = getTacticalFocusInfo('balanced');
      expect(balancedInfo.name).toBe('Balanced');
      expect(balancedInfo.description).toBe('Standard approach');
      
      const attackInfo = getTacticalFocusInfo('all_out_attack');
      expect(attackInfo.name).toBe('All-Out Attack');
      expect(attackInfo.description).toBe('High-risk, high-reward offense');
    });
  });

  describe('Game Situation Detection', () => {
    it('should detect normal game situation', () => {
      const gameState: GameState = {
        homeScore: 1,
        awayScore: 1,
        gameTime: 600, // 10 minutes
        maxTime: 1200, // 20 minutes
        currentHalf: 1
      };
      
      expect(determineGameSituation(gameState)).toBe('normal');
    });

    it('should detect late close game situation', () => {
      const gameState: GameState = {
        homeScore: 2,
        awayScore: 2,
        gameTime: 1080, // 18 minutes (final 2 minutes)
        maxTime: 1200, // 20 minutes
        currentHalf: 2
      };
      
      expect(determineGameSituation(gameState)).toBe('late_close');
    });

    it('should detect winning big situation', () => {
      const gameState: GameState = {
        homeScore: 3,
        awayScore: 0,
        gameTime: 800, // 13+ minutes (second half)
        maxTime: 1200, // 20 minutes
        currentHalf: 2
      };
      
      expect(determineGameSituation(gameState)).toBe('winning_big');
    });

    it('should detect losing big situation', () => {
      const gameState: GameState = {
        homeScore: 0,
        awayScore: 3,
        gameTime: 800, // 13+ minutes (second half)
        maxTime: 1200, // 20 minutes
        currentHalf: 2
      };
      
      expect(determineGameSituation(gameState)).toBe('losing_big');
    });
  });

  describe('Field Size Change Rules', () => {
    it('should allow field size change on day 1', () => {
      expect(canChangeFieldSize(1)).toBe(true);
    });

    it('should allow field size change during off-season', () => {
      expect(canChangeFieldSize(16)).toBe(true);
      expect(canChangeFieldSize(17)).toBe(true);
    });

    it('should not allow field size change during season', () => {
      expect(canChangeFieldSize(5)).toBe(false);
      expect(canChangeFieldSize(10)).toBe(false);
      expect(canChangeFieldSize(15)).toBe(false);
    });
  });

  describe('Tactical Modifiers Calculation', () => {
    it('should calculate basic tactical modifiers correctly', () => {
      const teamInfo: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const modifiers = calculateTacticalModifiers(teamInfo, gameState, true);
      
      // Standard balanced setup should have neutral modifiers
      expect(modifiers.passRangeModifier).toBe(1.0);
      expect(modifiers.staminaDepletionModifier).toBe(1.0);
      expect(modifiers.runnerRouteDepthModifier).toBe(1.0);
      expect(modifiers.passerRiskToleranceModifier).toBe(1.0);
    });

    it('should apply coach effectiveness to tactical modifiers', () => {
      const highCoachTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'all_out_attack',
        camaraderie: 50,
        headCoachTactics: 100, // Maximum coach skill
        isHomeTeam: true
      };

      const lowCoachTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'all_out_attack',
        camaraderie: 50,
        headCoachTactics: 0, // Minimum coach skill
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const highCoachModifiers = calculateTacticalModifiers(highCoachTeam, gameState, true);
      const lowCoachModifiers = calculateTacticalModifiers(lowCoachTeam, gameState, true);

      // High coach should amplify the all-out attack benefits
      expect(highCoachModifiers.runnerRouteDepthModifier).toBeGreaterThan(lowCoachModifiers.runnerRouteDepthModifier);
    });

    it('should apply field size advantages only for home team', () => {
      const teamInfo: TeamTacticalInfo = {
        fieldSize: 'large',
        tacticalFocus: 'balanced',
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const homeModifiers = calculateTacticalModifiers(teamInfo, gameState, true);
      const awayModifiers = calculateTacticalModifiers(teamInfo, gameState, false);

      // Home team should get large field advantages
      expect(homeModifiers.passRangeModifier).toBeGreaterThan(1.0);
      // Away team should not get field advantages (treated as standard)
      expect(awayModifiers.passRangeModifier).toBe(1.0);
    });

    it('should apply clutch performance modifiers based on camaraderie', () => {
      const highCamaraderieTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 90,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const lowCamaraderieTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 10,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      // Late close game situation
      const gameState: GameState = {
        homeScore: 2,
        awayScore: 2,
        gameTime: 1080, // Final 2 minutes
        maxTime: 1200,
        currentHalf: 2
      };

      const highCamaraderieModifiers = calculateTacticalModifiers(highCamaraderieTeam, gameState, true);
      const lowCamaraderieModifiers = calculateTacticalModifiers(lowCamaraderieTeam, gameState, true);

      // High camaraderie should provide clutch bonus
      expect(highCamaraderieModifiers.clutchPerformanceModifier).toBeGreaterThan(1.0);
      // Low camaraderie should provide clutch penalty
      expect(lowCamaraderieModifiers.clutchPerformanceModifier).toBeLessThan(1.0);
    });
  });

  describe('Tactical Effectiveness Calculation', () => {
    const mockRoster = [
      { speed: 30, power: 20, throwing: 25 },
      { speed: 25, power: 25, throwing: 20 },
      { speed: 20, power: 30, throwing: 15 },
      { speed: 28, power: 22, throwing: 30 },
      { speed: 32, power: 18, throwing: 28 },
      { speed: 26, power: 28, throwing: 22 }
    ];

    it('should calculate effectiveness for speed-based team on large field', () => {
      const speedyTeam: TeamTacticalInfo = {
        fieldSize: 'large',
        tacticalFocus: 'all_out_attack',
        camaraderie: 70,
        headCoachTactics: 80,
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const effectiveness = calculateTacticalEffectiveness(speedyTeam, mockRoster, gameState);
      
      expect(effectiveness.overallEffectiveness).toBeGreaterThanOrEqual(0.5);
      expect(effectiveness.fieldSizeEffectiveness).toBeGreaterThanOrEqual(0.5);
      expect(effectiveness.tacticalFocusEffectiveness).toBeGreaterThanOrEqual(0.5);
    });

    it('should provide recommendations for suboptimal setups', () => {
      const suboptimalTeam: TeamTacticalInfo = {
        fieldSize: 'large',
        tacticalFocus: 'all_out_attack',
        camaraderie: 30, // Low camaraderie
        headCoachTactics: 20, // Poor coach
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const effectiveness = calculateTacticalEffectiveness(suboptimalTeam, mockRoster, gameState);
      
      expect(effectiveness.recommendations.length).toBeGreaterThan(0);
      expect(effectiveness.overallEffectiveness).toBeLessThan(0.6);
    });

    it('should recognize power-based teams work well with small fields', () => {
      const powerTeam: TeamTacticalInfo = {
        fieldSize: 'small',
        tacticalFocus: 'defensive_wall',
        camaraderie: 60,
        headCoachTactics: 70,
        isHomeTeam: true
      };

      const powerRoster = [
        { speed: 20, power: 35, throwing: 15 },
        { speed: 18, power: 38, throwing: 12 },
        { speed: 22, power: 32, throwing: 18 },
        { speed: 19, power: 36, throwing: 14 },
        { speed: 21, power: 34, throwing: 16 },
        { speed: 17, power: 39, throwing: 13 }
      ];

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const effectiveness = calculateTacticalEffectiveness(powerTeam, powerRoster, gameState);
      
      expect(effectiveness.fieldSizeEffectiveness).toBeGreaterThan(0.7);
    });
  });

  describe('Situational Tactical Adjustments', () => {
    it('should override tactical focus when losing big', () => {
      const teamInfo: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'defensive_wall', // Conservative, but should be overridden
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const losingBigGameState: GameState = {
        homeScore: 0,
        awayScore: 3,
        gameTime: 800, // Second half
        maxTime: 1200,
        currentHalf: 2
      };

      const modifiers = calculateTacticalModifiers(teamInfo, losingBigGameState, true);
      
      // Should override defensive wall with desperate attack
      expect(modifiers.runnerRouteDepthModifier).toBeGreaterThan(1.4);
      expect(modifiers.passerRiskToleranceModifier).toBeGreaterThan(1.8);
      expect(modifiers.desperationModifier).toBeGreaterThan(1.0);
    });

    it('should apply conservative modifiers when winning big', () => {
      const teamInfo: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'all_out_attack', // Aggressive, but should be toned down
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const winningBigGameState: GameState = {
        homeScore: 3,
        awayScore: 0,
        gameTime: 800, // Second half
        maxTime: 1200,
        currentHalf: 2
      };

      const modifiers = calculateTacticalModifiers(teamInfo, winningBigGameState, true);
      
      // Should apply conservative play
      expect(modifiers.conservativePlayModifier).toBeGreaterThan(1.0);
      expect(modifiers.riskToleranceModifier).toBeLessThan(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing team data gracefully', () => {
      const incompleteTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      expect(() => calculateTacticalModifiers(incompleteTeam, gameState, true)).not.toThrow();
    });

    it('should handle extreme coach ratings', () => {
      const extremeCoachTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'all_out_attack',
        camaraderie: 50,
        headCoachTactics: 200, // Way above normal range
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const modifiers = calculateTacticalModifiers(extremeCoachTeam, gameState, true);
      
      // Should handle extreme values without breaking
      expect(modifiers.runnerRouteDepthModifier).toBeGreaterThan(1.0);
      expect(modifiers.runnerRouteDepthModifier).toBeLessThan(10.0); // Reasonable upper bound
    });

    it('should handle zero-length roster', () => {
      const teamInfo: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 50,
        headCoachTactics: 50,
        isHomeTeam: true
      };

      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      expect(() => calculateTacticalEffectiveness(teamInfo, [], gameState)).not.toThrow();
    });
  });
});