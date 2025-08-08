/**
 * Deterministic Random Number Generator
 * Provides reproducible randomness for match simulation
 * Based on match and season IDs for consistent replay capability
 */

import { createHash } from 'crypto.js';

export class DeterministicRNG {
  private state: number;
  private readonly originalSeed: string;

  constructor(matchId: string, seasonId: string = 'season-0-2025') {
    this.originalSeed = `${matchId}-${seasonId}`;
    this.state = this.hashSeed(this.originalSeed);
  }

  private hashSeed(seed: string): number {
    const hash = createHash('sha256').update(seed).digest('hex');
    // Convert first 8 characters to number
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Linear Congruential Generator
   * Provides consistent pseudo-random numbers
   */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number = 0, max: number = 1): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get current seed for debugging/logging
   */
  getSeed(): string {
    return this.originalSeed;
  }

  /**
   * Reset to original seed
   */
  reset(): void {
    this.state = this.hashSeed(this.originalSeed);
  }
}

export default DeterministicRNG;