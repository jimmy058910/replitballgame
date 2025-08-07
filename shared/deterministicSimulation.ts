// Deterministic Simulation - Seed-based randomness for reproducible results

// Browser-compatible hash function for seed generation
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministic Random Number Generator using Linear Congruential Generator
 * Based on Numerical Recipes algorithm for reproducible randomness
 */
export class SeededRandom {
  private seed: number;
  private current: number;

  constructor(seed: string | number) {
    this.seed = typeof seed === 'string' ? hashSeed(seed) : seed;
    this.current = this.seed;
  }

  // Generate next random number (0 to 1)
  next(): number {
    this.current = (this.current * 1664525 + 1013904223) % 0x100000000;
    return this.current / 0x100000000;
  }

  // Generate integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Generate float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Generate boolean with given probability
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  // Choose random element from array
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  // Shuffle array deterministically
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Reset to original seed
  reset(): void {
    this.current = this.seed;
  }

  // Get current seed for debugging
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Match Simulation Seed Generator
 * Creates deterministic seeds for matches based on teams and date
 */
export class MatchSeedGenerator {
  static createMatchSeed(
    homeTeamId: number,
    awayTeamId: number,
    matchDate: Date | string,
    seasonId?: number
  ): string {
    const dateStr = typeof matchDate === 'string' ? matchDate : matchDate.toISOString().split('T')[0];
    const season = seasonId || new Date().getFullYear();
    return `match_${homeTeamId}_${awayTeamId}_${dateStr}_${season}`;
  }

  static createTournamentSeed(
    tournamentId: number,
    round: number,
    matchIndex: number
  ): string {
    return `tournament_${tournamentId}_${round}_${matchIndex}`;
  }

  static createPlayerProgressionSeed(
    playerId: number,
    date: Date | string,
    progressionType: string
  ): string {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return `progression_${playerId}_${dateStr}_${progressionType}`;
  }

  static createInjurySeed(
    playerId: number,
    matchId: number,
    gameTime: number
  ): string {
    return `injury_${playerId}_${matchId}_${Math.floor(gameTime)}`;
  }
}

/**
 * Deterministic Simulation Context
 * Manages randomness for a specific simulation context
 */
export class SimulationContext {
  private rng: SeededRandom;
  private eventLog: Array<{
    event: string;
    seed: string;
    result: any;
    timestamp: Date;
  }> = [];

  constructor(seed: string) {
    this.rng = new SeededRandom(seed);
  }

  // Generate random value with event logging
  roll(event: string, min: number = 0, max: number = 1): number {
    const result = this.rng.nextFloat(min, max);
    this.logEvent(event, result);
    return result;
  }

  // Generate integer with event logging
  rollInt(event: string, min: number, max: number): number {
    const result = this.rng.nextInt(min, max);
    this.logEvent(event, result);
    return result;
  }

  // Generate boolean with event logging
  rollBool(event: string, probability: number = 0.5): boolean {
    const result = this.rng.nextBool(probability);
    this.logEvent(event, result);
    return result;
  }

  // Choose from array with event logging
  rollChoice<T>(event: string, choices: T[]): T {
    const result = this.rng.choice(choices);
    this.logEvent(event, result);
    return result;
  }

  private logEvent(event: string, result: any): void {
    this.eventLog.push({
      event,
      seed: this.rng.getSeed().toString(),
      result,
      timestamp: new Date()
    });
  }

  // Get event log for debugging
  getEventLog(): typeof this.eventLog {
    return [...this.eventLog];
  }

  // Clear event log
  clearLog(): void {
    this.eventLog = [];
  }

  // Export state for testing
  exportState(): {
    seed: number;
    eventLog: Array<{event: string, seed: string, result: any, timestamp: Date}>;
  } {
    return {
      seed: this.rng.getSeed(),
      eventLog: this.getEventLog()
    };
  }
}

/**
 * Global simulation utilities
 */
export const DeterministicSimulation = {
  // Create a simulation context for a match
  createMatchContext(homeTeamId: number, awayTeamId: number, matchDate: Date): SimulationContext {
    const seed = MatchSeedGenerator.createMatchSeed(homeTeamId, awayTeamId, matchDate);
    return new SimulationContext(seed);
  },

  // Create a simulation context for player progression
  createProgressionContext(playerId: number, date: Date, type: string): SimulationContext {
    const seed = MatchSeedGenerator.createPlayerProgressionSeed(playerId, date, type);
    return new SimulationContext(seed);
  },

  // Create a simulation context for tournament
  createTournamentContext(tournamentId: number, round: number, matchIndex: number): SimulationContext {
    const seed = MatchSeedGenerator.createTournamentSeed(tournamentId, round, matchIndex);
    return new SimulationContext(seed);
  },

  // Validate simulation reproducibility
  validateReproducibility(
    seed: string,
    testFunction: (context: SimulationContext) => any,
    iterations: number = 10
  ): boolean {
    const results: string[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const context = new SimulationContext(seed);
      const result = testFunction(context);
      results.push(JSON.stringify(result));
    }

    // Check if all results are identical
    return results.every((result: string) => result === results[0]);
  }
};