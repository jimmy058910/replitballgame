/**
 * Type Guards for API Responses
 * Following 2025 TypeScript best practices for runtime validation
 */

import type { 
  Player, 
  Team, 
  Contract, 
  MarketplaceListing,
  MarketplaceBid,
  Staff,
  TeamFinances
} from '@shared/types/models';

// ============================================================================
// MARKETPLACE API RESPONSES
// ============================================================================

export interface MarketplaceApiResponse {
  listings?: Array<MarketplaceListing & {
    sellerTeam?: { name: string; id: number };
    currentHighBidderTeam?: { name: string; id: number };
    startBid?: string | number;
    buyNowPrice?: string | number;
    currentBid?: string | number;
    listingStatus?: string;
    expiryTimestamp?: string;
    auctionExtensions?: number;
    bidCount?: number;
    timeRemaining?: number;
    player?: Player;
  }>;
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export function isMarketplaceApiResponse(data: unknown): data is MarketplaceApiResponse {
  return typeof data === 'object' && data !== null;
}

// ============================================================================
// CONTRACTS API RESPONSES
// ============================================================================

export interface ContractsApiResponse {
  players?: Array<{
    id: string | number;
    firstName: string;
    lastName: string;
    role: string;
    salary: number;
    contractLength?: number;
    contractId?: string | number;
    playerId?: string | number;
  }>;
  staff?: Array<{
    id: string | number;
    firstName: string;
    lastName: string;
    type: string;
    salary: number;
    contractLength?: number;
  }>;
}

export function isContractsApiResponse(data: unknown): data is ContractsApiResponse {
  return typeof data === 'object' && data !== null;
}

// ============================================================================
// TEAM API RESPONSES
// ============================================================================

export interface TeamApiResponse extends Team {
  players?: Player[];
  staff?: Staff[];
  finances?: TeamFinances;
}

export function isTeamApiResponse(data: unknown): data is TeamApiResponse {
  return typeof data === 'object' && data !== null && 'id' in data;
}

// ============================================================================
// DASHBOARD API RESPONSES
// ============================================================================

export interface DashboardApiResponse {
  team?: Team;
  finances?: TeamFinances;
  recentMatches?: any[];
  upcomingMatches?: any[];
  notifications?: any[];
  achievements?: any[];
}

export function isDashboardApiResponse(data: unknown): data is DashboardApiResponse {
  return typeof data === 'object' && data !== null;
}

// ============================================================================
// GENERIC HELPERS
// ============================================================================

/**
 * Safely cast unknown API response with type guard
 */
export function safeApiCast<T>(
  data: unknown, 
  guard: (data: unknown) => data is T
): T | null {
  return guard(data) ? data : null;
}

/**
 * Type guard for array responses
 */
export function isArrayResponse<T>(
  data: unknown,
  itemGuard?: (item: unknown) => item is T
): data is T[] {
  if (!Array.isArray(data)) return false;
  if (!itemGuard) return true;
  return data.every(item => itemGuard(item));
}

/**
 * Type guard for paginated responses
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export function isPaginatedResponse<T>(
  data: unknown,
  itemGuard?: (item: unknown) => item is T
): data is PaginatedResponse<T> {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as any;
  
  return (
    Array.isArray(obj.items) &&
    typeof obj.pagination === 'object' &&
    typeof obj.pagination.page === 'number' &&
    typeof obj.pagination.totalPages === 'number'
  );
}