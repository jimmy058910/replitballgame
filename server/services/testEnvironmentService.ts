/**
 * Test Environment Service - Comprehensive Testing Infrastructure
 * Manages isolated test data and match simulation scenarios
 */

import TestDataFactory from '../utils/testDataFactory';
import { storage } from '../storage';

// Simple logging functions
const logInfo = (message: string) => console.log(`[TEST-INFO] ${message}`);
const logError = (message: string) => console.error(`[TEST-ERROR] ${message}`);

interface TestSession {
  id: string;
  name: string;
  description: string;
  teams: any[];
  matches: any[];
  createdAt: Date;
  status: 'active' | 'completed' | 'archived';
}

interface TestResult {
  sessionId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  expectedOutcome: string;
  actualOutcome: string;
  matchedExpectation: boolean;
  duration: number;
  performance: {
    simulationTime: number;
    memoryUsed: number;
    eventsGenerated: number;
  };
  timestamp: Date;
}

export class TestEnvironmentService {
  private static testSessions: Map<string, TestSession> = new Map();
  private static testResults: TestResult[] = [];

  /**
   * Create a new test session with generated teams and scenarios
   */
  static async createTestSession(config: {
    name: string;
    description: string;
    teamCount: number;
    powerDistribution: 'balanced' | 'varied' | 'extreme';
    includeEdgeCases: boolean;
  }): Promise<TestSession> {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logInfo(`Creating test session: ${config.name} with ${config.teamCount} teams`);

    // Generate teams based on power distribution
    const teams = this.generateTeamsForSession(config.teamCount, config.powerDistribution);
    
    // Generate match scenarios
    const matches = this.generateMatchScenarios(teams, config.includeEdgeCases);

    const session: TestSession = {
      id: sessionId,
      name: config.name,
      description: config.description,
      teams,
      matches,
      createdAt: new Date(),
      status: 'active'
    };

    this.testSessions.set(sessionId, session);
    
    logInfo(`Test session created: ${sessionId} with ${teams.length} teams and ${matches.length} match scenarios`);
    
    return session;
  }

  /**
   * Generate teams for test session based on power distribution
   */
  private static generateTeamsForSession(teamCount: number, distribution: 'balanced' | 'varied' | 'extreme'): any[] {
    const teams = [];
    
    const powerLevels = this.getPowerDistribution(teamCount, distribution);
    
    for (let i = 0; i < teamCount; i++) {
      const powerLevel = powerLevels[i];
      const team = TestDataFactory.generateTestTeam({ 
        powerLevel,
        stadiumLevel: this.randomChoice(['basic', 'medium', 'advanced'])
      });
      
      team.testId = `team_${i + 1}`;
      team.id = 1000 + i; // Test team IDs start at 1000
      teams.push(team);
    }

    return teams;
  }

  /**
   * Get power level distribution for teams
   */
  private static getPowerDistribution(teamCount: number, distribution: 'balanced' | 'varied' | 'extreme'): ('weak' | 'average' | 'strong' | 'elite')[] {
    const distributions = {
      balanced: () => Array(teamCount).fill('average'),
      varied: () => {
        const levels = [];
        const perCategory = Math.floor(teamCount / 4);
        levels.push(...Array(perCategory).fill('weak'));
        levels.push(...Array(perCategory).fill('average'));
        levels.push(...Array(perCategory).fill('strong'));
        levels.push(...Array(teamCount - (perCategory * 3)).fill('elite'));
        return this.shuffleArray(levels);
      },
      extreme: () => {
        const levels = [];
        const half = Math.floor(teamCount / 2);
        levels.push(...Array(half).fill('weak'));
        levels.push(...Array(teamCount - half).fill('elite'));
        return this.shuffleArray(levels);
      }
    };

    return distributions[distribution]();
  }

  /**
   * Generate comprehensive match scenarios for testing
   */
  private static generateMatchScenarios(teams: any[], includeEdgeCases: boolean): any[] {
    const scenarios = [];
    let scenarioId = 1;

    // Round-robin matches between all teams
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = teams[i];
        const awayTeam = teams[j];
        
        scenarios.push({
          id: `test_match_${scenarioId++}`,
          homeTeam: homeTeam.testId,
          awayTeam: awayTeam.testId,
          homeTeamData: homeTeam,
          awayTeamData: awayTeam,
          matchType: 'TEST_LEAGUE',
          expectedOutcome: this.predictOutcome(homeTeam, awayTeam),
          scenario: 'round_robin'
        });
      }
    }

    if (includeEdgeCases) {
      // Add edge case scenarios
      scenarios.push(...this.generateEdgeCaseScenarios(teams));
    }

    return scenarios;
  }

  /**
   * Generate edge case test scenarios
   */
  private static generateEdgeCaseScenarios(teams: any[]): any[] {
    const edgeCases = [];
    let caseId = 9000;

    if (teams.length >= 2) {
      const strongTeam = teams.find(t => t.players.some(p => (p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6 > 30));
      const weakTeam = teams.find(t => t.players.some(p => (p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6 < 20));

      if (strongTeam && weakTeam) {
        // Extreme power difference
        edgeCases.push({
          id: `edge_case_${caseId++}`,
          homeTeam: strongTeam.testId,
          awayTeam: weakTeam.testId,
          homeTeamData: strongTeam,
          awayTeamData: weakTeam,
          matchType: 'TEST_EDGE',
          expectedOutcome: 'home_blowout',
          scenario: 'power_imbalance'
        });

        // Reverse for away advantage test
        edgeCases.push({
          id: `edge_case_${caseId++}`,
          homeTeam: weakTeam.testId,
          awayTeam: strongTeam.testId,
          homeTeamData: weakTeam,
          awayTeamData: strongTeam,
          matchType: 'TEST_EDGE',
          expectedOutcome: 'away_win_despite_home',
          scenario: 'overcome_home_advantage'
        });
      }
    }

    return edgeCases;
  }

  /**
   * Predict expected outcome based on team power
   */
  private static predictOutcome(homeTeam: any, awayTeam: any): string {
    const homepower = this.calculateTeamPower(homeTeam);
    const awayPower = this.calculateTeamPower(awayTeam);
    const powerDiff = homepower - awayPower;
    const homeAdvantage = 2; // Home field advantage

    if (powerDiff + homeAdvantage > 8) return 'home_blowout';
    if (powerDiff + homeAdvantage > 3) return 'home_win';
    if (Math.abs(powerDiff) <= 3) return 'close_game';
    if (powerDiff + homeAdvantage < -3) return 'away_win';
    if (powerDiff + homeAdvantage < -8) return 'away_blowout';
    
    return 'unpredictable';
  }

  /**
   * Calculate team power for prediction
   */
  private static calculateTeamPower(team: any): number {
    const topPlayers = team.players
      .map((p: any) => (p.speed + p.power + p.throwing + p.catching + p.kicking + p.agility) / 6)
      .sort((a: number, b: number) => b - a)
      .slice(0, 9); // Top 9 players

    return topPlayers.reduce((sum: number, power: number) => sum + power, 0) / topPlayers.length;
  }

  /**
   * Run a test match and record results
   */
  static async runTestMatch(sessionId: string, matchId: string): Promise<TestResult> {
    const session = this.testSessions.get(sessionId);
    if (!session) {
      throw new Error(`Test session not found: ${sessionId}`);
    }

    const match = session.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error(`Test match not found: ${matchId}`);
    }

    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    logInfo(`Running test match: ${match.homeTeam} vs ${match.awayTeam}`);

    try {
      // Simulate the match using existing match engine
      const simulationResult = await this.simulateTestMatch(match);
      
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      
      const result: TestResult = {
        sessionId,
        matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: simulationResult.homeScore,
        awayScore: simulationResult.awayScore,
        expectedOutcome: match.expectedOutcome,
        actualOutcome: this.determineActualOutcome(simulationResult),
        matchedExpectation: this.checkExpectationMatch(match.expectedOutcome, simulationResult),
        duration: endTime - startTime,
        performance: {
          simulationTime: endTime - startTime,
          memoryUsed: memoryAfter - memoryBefore,
          eventsGenerated: simulationResult.events?.length || 0
        },
        timestamp: new Date()
      };

      this.testResults.push(result);
      
      logInfo(`Test match completed: ${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam} (${result.duration}ms)`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(`Test match failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Simulate a test match (simplified version)
   */
  private static async simulateTestMatch(match: any): Promise<any> {
    // This is a simplified simulation for testing
    // In a real implementation, this would use the actual match engine
    
    const homeTeamPower = this.calculateTeamPower(match.homeTeamData);
    const awayTeamPower = this.calculateTeamPower(match.awayTeamData);
    
    // Add some randomness to make it realistic
    const homeBonus = Math.random() * 6 - 3 + 2; // Home field advantage
    const awayBonus = Math.random() * 6 - 3;
    
    const adjustedHomePower = homeTeamPower + homeBonus;
    const adjustedAwayPower = awayTeamPower + awayBonus;
    
    // Generate scores based on power (simplified)
    const baseScore = 10;
    const homeScore = Math.max(0, Math.round(baseScore + (adjustedHomePower - 20) * 0.5 + Math.random() * 10 - 5));
    const awayScore = Math.max(0, Math.round(baseScore + (adjustedAwayPower - 20) * 0.5 + Math.random() * 10 - 5));
    
    return {
      homeScore,
      awayScore,
      events: this.generateTestEvents(homeScore + awayScore),
      duration: 2400, // 40 minutes
      statistics: {
        homeTeamPower: adjustedHomePower,
        awayTeamPower: adjustedAwayPower,
        powerDifference: adjustedHomePower - adjustedAwayPower
      }
    };
  }

  /**
   * Generate test events for match simulation
   */
  private static generateTestEvents(totalScore: number): any[] {
    const events = [];
    const eventTypes = ['SCORE', 'TURNOVER', 'TIMEOUT', 'SUBSTITUTION', 'INJURY'];
    
    for (let i = 0; i < totalScore + Math.random() * 20; i++) {
      events.push({
        type: this.randomChoice(eventTypes),
        time: Math.floor(Math.random() * 2400),
        description: `Test event ${i + 1}`
      });
    }
    
    return events.sort((a, b) => a.time - b.time);
  }

  /**
   * Determine actual match outcome
   */
  private static determineActualOutcome(result: any): string {
    const scoreDiff = result.homeScore - result.awayScore;
    
    if (scoreDiff > 10) return 'home_blowout';
    if (scoreDiff > 3) return 'home_win';
    if (Math.abs(scoreDiff) <= 3) return 'close_game';
    if (scoreDiff < -3) return 'away_win';
    if (scoreDiff < -10) return 'away_blowout';
    
    return 'tie';
  }

  /**
   * Check if actual outcome matches expectation
   */
  private static checkExpectationMatch(expected: string, result: any): boolean {
    const actual = this.determineActualOutcome(result);
    
    // Exact match
    if (expected === actual) return true;
    
    // Category matches
    const homeWinCategories = ['home_win', 'home_blowout'];
    const awayWinCategories = ['away_win', 'away_blowout'];
    
    if (homeWinCategories.includes(expected) && homeWinCategories.includes(actual)) return true;
    if (awayWinCategories.includes(expected) && awayWinCategories.includes(actual)) return true;
    
    return false;
  }

  /**
   * Get test session analytics
   */
  static getSessionAnalytics(sessionId: string): any {
    const results = this.testResults.filter(r => r.sessionId === sessionId);
    
    if (results.length === 0) {
      return { message: 'No results available' };
    }

    const accuracyRate = (results.filter(r => r.matchedExpectation).length / results.length) * 100;
    const avgSimulationTime = results.reduce((sum, r) => sum + r.performance.simulationTime, 0) / results.length;
    const avgMemoryUsed = results.reduce((sum, r) => sum + r.performance.memoryUsed, 0) / results.length;
    
    return {
      totalMatches: results.length,
      accuracyRate: accuracyRate.toFixed(1) + '%',
      averageSimulationTime: avgSimulationTime.toFixed(2) + 'ms',
      averageMemoryUsage: (avgMemoryUsed / 1024 / 1024).toFixed(2) + 'MB',
      outcomeDistribution: this.getOutcomeDistribution(results),
      performanceMetrics: {
        fastestMatch: Math.min(...results.map(r => r.performance.simulationTime)),
        slowestMatch: Math.max(...results.map(r => r.performance.simulationTime)),
        mostEvents: Math.max(...results.map(r => r.performance.eventsGenerated))
      }
    };
  }

  /**
   * Get outcome distribution for analytics
   */
  private static getOutcomeDistribution(results: TestResult[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach(r => {
      distribution[r.actualOutcome] = (distribution[r.actualOutcome] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Utility functions
   */
  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Clean up test sessions
   */
  static cleanupTestSessions(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.testSessions.entries()) {
      if (session.createdAt < cutoffTime && session.status !== 'active') {
        this.testSessions.delete(sessionId);
        this.testResults = this.testResults.filter(r => r.sessionId !== sessionId);
        logInfo(`Cleaned up test session: ${sessionId}`);
      }
    }
  }

  /**
   * Get all test sessions
   */
  static getAllTestSessions(): TestSession[] {
    return Array.from(this.testSessions.values());
  }

  /**
   * Get test session by ID
   */
  static getTestSession(sessionId: string): TestSession | undefined {
    return this.testSessions.get(sessionId);
  }
}

export default TestEnvironmentService;