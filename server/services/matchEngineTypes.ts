/**
 * @file matchEngineTypes.ts
 * @description Contains the internal type definitions for the new match engine.
 * Used by the engine and related services like commentary.
 */

import { PlayerMatchStats } from '../../shared/types/LiveMatchState';
import { DeterministicRNG } from '../utils/deterministicRNG';

/**
 * Represents the internal state of a player during a match.
 * This is more detailed than the client-facing FieldPlayer.
 */
export interface InternalPlayerState {
  id: string;
  name: string;
  role: 'Passer' | 'Runner' | 'Blocker';
  baseStats: {
    speed: number;
    power: number;
    throwing: number;
    catching: number;
    kicking: number;
    stamina: number;
    agility: number;
    leadership: number;
  };
  race: string;
  skills: string[];

  // Dynamic state
  onField: boolean;
  currentStamina: number;
  position: { x: number; y: number };
  fatiguePenalty: number;
  activeBonuses: Record<string, number>;

  // Match stats
  stats: PlayerMatchStats;
}

/**
 * Represents the internal state of the match being simulated.
 */
export interface InternalMatchState {
  matchId: string;
  rng: DeterministicRNG;
  gameTime: number;
  maxTime: number;
  homeTeam: { id: string; players: Map<string, InternalPlayerState>; onField: string[]; };
  awayTeam: { id: string; players: Map<string, InternalPlayerState>; onField: string[]; };

  // Game situation
  possession: 'home' | 'away';
  ballCarrierId?: string;
  gamePhase: 'early' | 'middle' | 'late' | 'clutch';
}
