import { describe, it, expect } from 'vitest';
import {
  calculateTacticalModifiers,
  determineGameSituation,
  calculateTacticalEffectiveness,
  canChangeFieldSize,
  type FieldSize,
  type TacticalFocus,
  type GameState,
  type TeamTacticalInfo
} from '../tacticalSystem';

describe('Full Game Integration Tests', () => {
  
  describe('Complete Match Simulation with Tactical System', () => {
    const mockHomeTeam: TeamTacticalInfo = {
      fieldSize: 'large',
      tacticalFocus: 'all_out_attack',
      camaraderie: 85,
      headCoachTactics: 75,
      isHomeTeam: true
    };

    const mockAwayTeam: TeamTacticalInfo = {
      fieldSize: 'standard', // Away team doesn't benefit from home field
      tacticalFocus: 'defensive_wall', 
      camaraderie: 60,
      headCoachTactics: 50,
      isHomeTeam: false
    };

    const mockRoster = [
      { speed: 35, power: 25, throwing: 30, catching: 32, kicking: 20, stamina: 30, agility: 34, leadership: 25 },
      { speed: 30, power: 28, throwing: 35, catching: 30, kicking: 25, stamina: 32, agility: 28, leadership: 30 },
      { speed: 32, power: 30, throwing: 25, catching: 35, kicking: 18, stamina: 35, agility: 36, leadership: 22 },
      { speed: 25, power: 38, throwing: 20, catching: 25, kicking: 30, stamina: 35, agility: 20, leadership: 35 },
      { speed: 28, power: 35, throwing: 18, catching: 22, kicking: 28, stamina: 38, agility: 25, leadership: 32 },
      { speed: 33, power: 22, throwing: 32, catching: 28, kicking: 22, stamina: 30, agility: 35, leadership: 25 }
    ];

    it('should handle complete match progression with tactical changes', () => {
      // Test early game (normal situation)
      const earlyGameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 180, // 3 minutes
        maxTime: 1200, // 20 minutes
        currentHalf: 1
      };

      const earlyHomeModifiers = calculateTacticalModifiers(mockHomeTeam, earlyGameState, true);
      const earlyAwayModifiers = calculateTacticalModifiers(mockAwayTeam, earlyGameState, false);

      // Home team should benefit from large field and aggressive tactics
      expect(earlyHomeModifiers.passRangeModifier).toBeGreaterThan(1.0);
      expect(earlyHomeModifiers.runnerRouteDepthModifier).toBeGreaterThan(1.0);
      
      // Away team should have conservative modifiers
      expect(earlyAwayModifiers.runnerRouteDepthModifier).toBeLessThan(1.0);
      expect(earlyAwayModifiers.passerRiskToleranceModifier).toBeLessThan(1.0);

      // Test halftime situation
      const halftimeState: GameState = {
        homeScore: 1,
        awayScore: 1,
        gameTime: 600, // 10 minutes (halftime)
        maxTime: 1200,
        currentHalf: 1
      };

      const halftimeModifiers = calculateTacticalModifiers(mockHomeTeam, halftimeState, true);
      expect(halftimeModifiers.passRangeModifier).toBeGreaterThan(1.0);

      // Test late game close situation
      const lateCloseState: GameState = {
        homeScore: 2,
        awayScore: 2,
        gameTime: 1080, // 18 minutes (final 2 minutes)
        maxTime: 1200,
        currentHalf: 2
      };

      const lateCloseModifiers = calculateTacticalModifiers(mockHomeTeam, lateCloseState, true);
      
      // High camaraderie team should get clutch bonus
      expect(lateCloseModifiers.clutchPerformanceModifier).toBeGreaterThan(1.0);

      // Test losing big situation (desperate)
      const losingBigState: GameState = {
        homeScore: 0,
        awayScore: 3,
        gameTime: 900, // 15 minutes
        maxTime: 1200,
        currentHalf: 2
      };

      const desperateModifiers = calculateTacticalModifiers(mockHomeTeam, losingBigState, true);
      
      // Should override normal tactics with desperation
      expect(desperateModifiers.desperationModifier).toBeGreaterThan(1.0);
      expect(desperateModifiers.runnerRouteDepthModifier).toBeGreaterThan(1.4);
    });

    it('should provide meaningful tactical effectiveness analysis', () => {
      const gameState: GameState = {
        homeScore: 1,
        awayScore: 0,
        gameTime: 300,
        maxTime: 1200,
        currentHalf: 1
      };

      const homeEffectiveness = calculateTacticalEffectiveness(mockHomeTeam, mockRoster, gameState);
      const awayEffectiveness = calculateTacticalEffectiveness(mockAwayTeam, mockRoster, gameState);

      // Home team with large field and speed-focused roster should be effective
      expect(homeEffectiveness.overallEffectiveness).toBeGreaterThan(0.6);
      expect(homeEffectiveness.fieldSizeEffectiveness).toBeGreaterThan(0.6);

      // Away team with defensive tactics should have different strengths
      expect(awayEffectiveness.overallEffectiveness).toBeGreaterThan(0.4);
      expect(awayEffectiveness.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle field size change restrictions correctly during season', () => {
      // Season start and off-season should allow changes
      expect(canChangeFieldSize(1)).toBe(true);
      expect(canChangeFieldSize(16)).toBe(true);
      expect(canChangeFieldSize(17)).toBe(true);

      // Mid-season should not allow changes
      expect(canChangeFieldSize(8)).toBe(false);
      expect(canChangeFieldSize(14)).toBe(false);
      expect(canChangeFieldSize(15)).toBe(false);
    });

    it('should demonstrate coach impact on tactical effectiveness', () => {
      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200,
        currentHalf: 1
      };

      const eliteCoachTeam: TeamTacticalInfo = {
        ...mockHomeTeam,
        headCoachTactics: 95
      };

      const poorCoachTeam: TeamTacticalInfo = {
        ...mockHomeTeam,
        headCoachTactics: 15
      };

      const eliteModifiers = calculateTacticalModifiers(eliteCoachTeam, gameState, true);
      const poorModifiers = calculateTacticalModifiers(poorCoachTeam, gameState, true);

      // Elite coach should amplify tactical benefits significantly
      const eliteEffectiveness = calculateTacticalEffectiveness(eliteCoachTeam, mockRoster, gameState);
      const poorEffectiveness = calculateTacticalEffectiveness(poorCoachTeam, mockRoster, gameState);

      expect(eliteEffectiveness.overallEffectiveness).toBeGreaterThan(poorEffectiveness.overallEffectiveness);
    });

    it('should verify complete tactical modifier coverage', () => {
      const testGameState: GameState = {
        homeScore: 1,
        awayScore: 2,
        gameTime: 1050, // Late game
        maxTime: 1200,
        currentHalf: 2
      };

      const testTeam: TeamTacticalInfo = {
        fieldSize: 'small',
        tacticalFocus: 'balanced',
        camaraderie: 70,
        headCoachTactics: 65,
        isHomeTeam: true
      };

      const modifiers = calculateTacticalModifiers(testTeam, testGameState, true);

      // Verify all modifier properties exist and have reasonable values
      expect(typeof modifiers.passRangeModifier).toBe('number');
      expect(typeof modifiers.staminaDepletionModifier).toBe('number');
      expect(typeof modifiers.runnerRouteDepthModifier).toBe('number');
      expect(typeof modifiers.passerRiskToleranceModifier).toBe('number');
      expect(typeof modifiers.blockerRangeModifier).toBe('number');
      expect(typeof modifiers.powerBonusModifier).toBe('number');
      expect(typeof modifiers.clutchPerformanceModifier).toBe('number');
      
      // All modifiers should be positive
      expect(modifiers.passRangeModifier).toBeGreaterThan(0);
      expect(modifiers.staminaDepletionModifier).toBeGreaterThan(0);
      expect(modifiers.runnerRouteDepthModifier).toBeGreaterThan(0);
      expect(modifiers.passerRiskToleranceModifier).toBeGreaterThan(0);
      expect(modifiers.blockerRangeModifier).toBeGreaterThan(0);
      expect(modifiers.powerBonusModifier).toBeGreaterThanOrEqual(0);
      expect(modifiers.clutchPerformanceModifier).toBeGreaterThan(0);
    });
  });

  describe('Advanced Tactical Scenarios', () => {
    it('should handle extreme camaraderie effects', () => {
      const gameState: GameState = {
        homeScore: 1,
        awayScore: 1,
        gameTime: 1140, // Final minute
        maxTime: 1200,
        currentHalf: 2
      };

      const highCamaraderieTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 95,
        headCoachTactics: 60,
        isHomeTeam: true
      };

      const lowCamaraderieTeam: TeamTacticalInfo = {
        fieldSize: 'standard',
        tacticalFocus: 'balanced',
        camaraderie: 15,
        headCoachTactics: 60,
        isHomeTeam: true
      };

      const highModifiers = calculateTacticalModifiers(highCamaraderieTeam, gameState, true);
      const lowModifiers = calculateTacticalModifiers(lowCamaraderieTeam, gameState, true);

      // High camaraderie should provide significant clutch bonus
      expect(highModifiers.clutchPerformanceModifier).toBeGreaterThan(1.1);
      
      // Low camaraderie should impose penalty
      expect(lowModifiers.clutchPerformanceModifier).toBeLessThan(0.9);
    });

    it('should verify home field advantage is exclusive to home team', () => {
      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 300,
        maxTime: 1200,
        currentHalf: 1
      };

      const teamConfig: TeamTacticalInfo = {
        fieldSize: 'large',
        tacticalFocus: 'all_out_attack',
        camaraderie: 70,
        headCoachTactics: 60,
        isHomeTeam: true
      };

      const homeModifiers = calculateTacticalModifiers(teamConfig, gameState, true);
      const awayModifiers = calculateTacticalModifiers(teamConfig, gameState, false);

      // Home team should benefit from large field
      expect(homeModifiers.passRangeModifier).toBeGreaterThan(1.0);
      expect(homeModifiers.staminaDepletionModifier).toBeGreaterThan(1.0);

      // Away team should not get field advantages (treated as standard)
      expect(awayModifiers.passRangeModifier).toBe(1.0);
      expect(awayModifiers.staminaDepletionModifier).toBe(1.0);
    });
  });

  describe('Real-world Game Performance Simulation', () => {
    it('should simulate a complete 20-minute match with tactical progression', () => {
      const homeTeam: TeamTacticalInfo = {
        fieldSize: 'small',
        tacticalFocus: 'defensive_wall',
        camaraderie: 80,
        headCoachTactics: 70,
        isHomeTeam: true
      };

      const timeProgression = [0, 300, 600, 900, 1050, 1140, 1200]; // Key timestamps
      const scores = [
        { home: 0, away: 0 },
        { home: 1, away: 0 },
        { home: 1, away: 1 },
        { home: 2, away: 1 },
        { home: 2, away: 2 },
        { home: 2, away: 2 },
        { home: 3, away: 2 }
      ];

      for (let i = 0; i < timeProgression.length; i++) {
        const gameState: GameState = {
          homeScore: scores[i].home,
          awayScore: scores[i].away,
          gameTime: timeProgression[i],
          maxTime: 1200,
          currentHalf: timeProgression[i] < 600 ? 1 : 2
        };

        const modifiers = calculateTacticalModifiers(homeTeam, gameState, true);
        const situation = determineGameSituation(gameState);

        // Verify modifiers change appropriately throughout the match
        expect(modifiers.passRangeModifier).toBeGreaterThan(0);
        expect(modifiers.blockerRangeModifier).toBeGreaterThan(1.0); // Small field advantage for home team
        expect(['normal', 'late_close', 'winning_big', 'losing_big']).toContain(situation);

        // Late game situations should trigger special modifiers
        if (timeProgression[i] > 1000 && Math.abs(scores[i].home - scores[i].away) <= 1) {
          expect(modifiers.clutchPerformanceModifier).not.toBe(1.0);
        }
      }
    });
  });
});