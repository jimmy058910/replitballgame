/**
 * API Response Types
 * Centralized type definitions for all API responses
 * Following TYPESCRIPT_MIGRATION_GUIDE.md patterns
 */

import type { 
  Player, 
  Team, 
  Contract, 
  Staff,
  TeamFinances,
  MarketplaceListing,
  MarketplaceBid
} from '@shared/types/models';

// ============================================================================
// TEAM API RESPONSES
// ============================================================================

export interface TeamWithDetails extends Team {
  players?: PlayerWithContract[];
  staff?: StaffWithContract[];
  finances?: TeamFinances;
}

export interface PlayerWithContract extends Player {
  salary?: number;
  contractLength?: number;
  signedAt?: string | Date;
  contract?: Contract;
}

export interface StaffWithContract extends Staff {
  salary?: number;
  contractLength?: number;
  signedAt?: string | Date;
}

// ============================================================================
// MARKETPLACE API RESPONSES
// ============================================================================

export interface MarketplaceListingWithDetails extends MarketplaceListing {
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
}

export interface MarketplaceResponse {
  listings?: MarketplaceListingWithDetails[];
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface MarketplaceDashboardResponse {
  team?: Team;
  finances?: TeamFinances;
  myListings?: MarketplaceListingWithDetails[];
  myBids?: MarketplaceBid[];
  stats?: {
    totalSales: number;
    totalPurchases: number;
    activeListings: number;
    activeBids: number;
  };
}

// ============================================================================
// CONTRACT API RESPONSES
// ============================================================================

export interface ContractCalculationResponse {
  value: number;
  minimumOffer: number;
  maximumOffer: number;
  marketAverage: number;
  demandMultiplier: number;
}

export interface ContractsResponse {
  players?: PlayerWithContract[];
  staff?: StaffWithContract[];
  totalSalary?: number;
  salaryCap?: number;
}

// ============================================================================
// GENERIC TYPED API REQUEST
// ============================================================================

/**
 * Type-safe API request wrapper
 * Use this for all API calls to ensure proper typing
 */
export async function typedApiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}