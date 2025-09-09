/**
 * Unified Type System
 * Single import point for all types
 */

// Main models (source of truth)
export * from './models';

// API types
export * from './api';

// Live match types
export * from './LiveMatchState';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncData<T> = {
  data?: T;
  loading: boolean;
  error?: Error;
};