/**
 * Property Access Type Guards
 * 
 * Safe property access utilities for Realm Rivalry
 */

import type { Player, Team, TeamFinances, PlayerMatchStats } from '@shared/types/models';

/**
 * Type guard for checking if an object has finances
 */
export function hasFinances(obj: any): obj is { finances: TeamFinances } {
  return obj && typeof obj === 'object' && obj.finances && typeof obj.finances === 'object';
}

/**
 * Type guard for checking if a player has contract information
 */
export function hasContract(player: any): player is Player & { contract: { salary: number } } {
  return player && 
         typeof player === 'object' && 
         player.contract && 
         typeof player.contract === 'object' &&
         typeof player.contract.salary === 'number';
}

/**
 * Safe team name access
 */
export function getTeamName(team: Team | undefined | null): string {
  return team?.name ?? 'Unknown Team';
}

/**
 * Safe player full name construction
 */
export function getPlayerFullName(player: Player | undefined | null): string {
  if (!player) return 'Unknown Player';
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || 'Unknown Player';
}

/**
 * Safe credit formatting
 */
export function formatCredits(credits: bigint | number | string | undefined | null): string {
  if (credits == null) return '0₡';
  
  const amount = typeof credits === 'bigint' ? Number(credits) : 
                 typeof credits === 'string' ? Number(credits) : 
                 credits;
                 
  if (isNaN(amount)) return '0₡';
  
  return `${amount.toLocaleString()}₡`;
}

/**
 * Safe team finances access
 */
export function getTeamCredits(team: Team | undefined | null): number {
  if (!hasFinances(team)) return 0;
  const credits = team.finances.credits;
  return typeof credits === 'bigint' ? Number(credits) : Number(credits ?? 0);
}

/**
 * Safe player stats access for match stats
 */
export function getPlayerStatValue(stats: PlayerMatchStats | undefined | null, field: keyof PlayerMatchStats): number {
  if (!stats) return 0;
  const value = stats[field];
  return typeof value === 'number' ? value : 0;
}

/**
 * Safe match property access
 */
export function getMatchTeamName(match: any, isHome: boolean): string {
  if (!match) return 'Unknown Team';
  
  const teamProperty = isHome ? 'homeTeam' : 'awayTeam';
  const team = match[teamProperty];
  
  if (team?.name) return team.name;
  
  // Fallback to ID-based lookup
  const teamNameProperty = isHome ? 'homeTeamName' : 'awayTeamName';
  return match[teamNameProperty] ?? 'Unknown Team';
}

/**
 * Safe array access with default
 */
export function safeArrayAccess<T>(array: T[] | undefined | null, index: number): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
}

/**
 * Type guard for marketplace listings
 */
export function hasMarketplaceFields(listing: any): listing is { 
  currentBid?: string | number; 
  startBid?: string | number;
  buyNowPrice?: string | number;
  timeRemaining?: number;
  bidCount?: number;
} {
  return listing && typeof listing === 'object';
}

/**
 * Safe marketplace bid amount parsing
 */
export function getMarketplaceBidAmount(listing: any): number {
  if (!hasMarketplaceFields(listing)) return 0;
  
  const currentBid = listing.currentBid;
  const startBid = listing.startBid;
  
  const current = typeof currentBid === 'string' ? parseInt(currentBid) : Number(currentBid ?? 0);
  const start = typeof startBid === 'string' ? parseInt(startBid) : Number(startBid ?? 0);
  
  return Math.max(current, start, 0);
}