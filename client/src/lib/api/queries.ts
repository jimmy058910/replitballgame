/**
 * Query Options Factory for TanStack Query v5
 * Based on 2025 best practices for type-safe queries
 */

import { queryOptions, skipToken } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { 
  Player, 
  Team, 
  Staff, 
  Contract, 
  TeamFinances, 
  Stadium, 
  League, 
  Notification,
  MarketplaceListing,
  MarketplaceBid
} from '@shared/types/models';

/**
 * Team Queries
 */
export const teamQueries = {
  myTeam: () =>
    queryOptions({
      queryKey: ['/api/teams/my'],
      queryFn: async () => {
        const response = await apiRequest('/api/teams/my');
        return response as Team;
      },
    }),

  byId: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId],
      queryFn: teamId 
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}`);
            return response as Team;
          }
        : skipToken,
    }),

  finances: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId, 'finances'],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}/finances`);
            return response as TeamFinances;
          }
        : skipToken,
    }),

  stadium: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId, 'stadium'],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}/stadium`);
            return response as Stadium;
          }
        : skipToken,
    }),

  players: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId, 'players'],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}/players`);
            return response as Player[];
          }
        : skipToken,
    }),

  staff: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId, 'staff'],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}/staff`);
            return response as Staff[];
          }
        : skipToken,
    }),
};

/**
 * Player Queries
 */
export const playerQueries = {
  all: () =>
    queryOptions({
      queryKey: ['/api/players'],
      queryFn: async () => {
        const response = await apiRequest('/api/players');
        return response as Player[];
      },
    }),

  byId: (playerId?: string | number) =>
    queryOptions({
      queryKey: ['/api/players', playerId],
      queryFn: playerId
        ? async () => {
            const response = await apiRequest(`/api/players/${playerId}`);
            return response as Player;
          }
        : skipToken,
    }),

  contract: (playerId?: string | number) =>
    queryOptions({
      queryKey: ['/api/players', playerId, 'contract'],
      queryFn: playerId
        ? async () => {
            const response = await apiRequest(`/api/players/${playerId}/contract`);
            return response as Contract;
          }
        : skipToken,
    }),
};

/**
 * League Queries
 */
export const leagueQueries = {
  all: () =>
    queryOptions({
      queryKey: ['/api/leagues'],
      queryFn: async () => {
        const response = await apiRequest('/api/leagues');
        return response as League[];
      },
    }),

  byId: (leagueId?: string | number) =>
    queryOptions({
      queryKey: ['/api/leagues', leagueId],
      queryFn: leagueId
        ? async () => {
            const response = await apiRequest(`/api/leagues/${leagueId}`);
            return response as League;
          }
        : skipToken,
    }),

  standings: (leagueId?: string | number) =>
    queryOptions({
      queryKey: ['/api/leagues', leagueId, 'standings'],
      queryFn: leagueId
        ? async () => {
            const response = await apiRequest(`/api/leagues/${leagueId}/standings`);
            return response as Team[];
          }
        : skipToken,
    }),
};

/**
 * Match Queries
 */
export const matchQueries = {
  live: () =>
    queryOptions({
      queryKey: ['/api/matches/live'],
      queryFn: async () => {
        const response = await apiRequest('/api/matches/live');
        return response as any[]; // TODO: Define Match type
      },
    }),

  byTeam: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/matches/team', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/matches/team/${teamId}`);
            return response as any[]; // TODO: Define Match type
          }
        : skipToken,
    }),
};

/**
 * Marketplace Queries
 */
export const marketplaceQueries = {
  listings: () =>
    queryOptions({
      queryKey: ['/api/dynamic-marketplace/listings'],
      queryFn: async () => {
        const response = await apiRequest('/api/dynamic-marketplace/listings');
        return response as { listings: MarketplaceListing[] };
      },
      refetchInterval: 10000, // Refresh every 10 seconds
    }),

  myListings: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/dynamic-marketplace/my-listings', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest('/api/dynamic-marketplace/my-listings');
            return response as { listings: MarketplaceListing[] };
          }
        : skipToken,
    }),

  myBids: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/dynamic-marketplace/my-bids', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest('/api/dynamic-marketplace/my-bids');
            return response as { bids: MarketplaceBid[] };
          }
        : skipToken,
    }),

  stats: () =>
    queryOptions({
      queryKey: ['/api/dynamic-marketplace/stats'],
      queryFn: async () => {
        const response = await apiRequest('/api/dynamic-marketplace/stats');
        return response as any; // TODO: Define MarketplaceStats type
      },
      staleTime: 60 * 1000, // Consider data fresh for 1 minute
      refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
    }),
};

/**
 * Notification Queries
 */
export const notificationQueries = {
  all: () =>
    queryOptions({
      queryKey: ['/api/notifications'],
      queryFn: async () => {
        const response = await apiRequest('/api/notifications');
        return response as Notification[];
      },
    }),

  unread: () =>
    queryOptions({
      queryKey: ['/api/notifications/unread'],
      queryFn: async () => {
        const response = await apiRequest('/api/notifications/unread');
        return response as Notification[];
      },
    }),
};

/**
 * Season Queries
 */
export const seasonQueries = {
  current: () =>
    queryOptions({
      queryKey: ['/api/seasons/current'],
      queryFn: async () => {
        const response = await apiRequest('/api/seasons/current');
        return response as any; // TODO: Define Season type
      },
    }),

  currentCycle: () =>
    queryOptions({
      queryKey: ['/api/seasons/current-cycle'],
      queryFn: async () => {
        const response = await apiRequest('/api/seasons/current-cycle');
        return response as any; // TODO: Define SeasonalCycle type
      },
    }),
};

/**
 * Store Queries
 */
export const storeQueries = {
  creditPackages: () =>
    queryOptions({
      queryKey: ['/api/store/credit-packages'],
      queryFn: async () => {
        const response = await apiRequest('/api/store/credit-packages');
        return response as any[]; // TODO: Define CreditPackage type
      },
    }),

  items: () =>
    queryOptions({
      queryKey: ['/api/store/items'],
      queryFn: async () => {
        const response = await apiRequest('/api/store/items');
        return response as any[]; // TODO: Define StoreItem type
      },
    }),

  consumables: () =>
    queryOptions({
      queryKey: ['/api/store/consumables'],
      queryFn: async () => {
        const response = await apiRequest('/api/store/consumables');
        return response as any[]; // TODO: Define Consumable type
      },
    }),
};

/**
 * Tournament Queries
 */
export const tournamentQueries = {
  active: () =>
    queryOptions({
      queryKey: ['/api/tournaments/active'],
      queryFn: async () => {
        const response = await apiRequest('/api/tournaments/active');
        return response as any[]; // TODO: Define Tournament type
      },
    }),

  byId: (tournamentId?: string | number) =>
    queryOptions({
      queryKey: ['/api/tournaments', tournamentId],
      queryFn: tournamentId
        ? async () => {
            const response = await apiRequest(`/api/tournaments/${tournamentId}`);
            return response as any; // TODO: Define Tournament type
          }
        : skipToken,
    }),

  standings: (tournamentId?: string | number) =>
    queryOptions({
      queryKey: ['/api/tournaments', tournamentId, 'standings'],
      queryFn: tournamentId
        ? async () => {
            const response = await apiRequest(`/api/tournaments/${tournamentId}/standings`);
            return response as any[]; // TODO: Define TournamentStanding type
          }
        : skipToken,
    }),
};

/**
 * Stats Queries
 */
export const statsQueries = {
  playerStats: (playerId?: string | number) =>
    queryOptions({
      queryKey: ['/api/stats/player', playerId],
      queryFn: playerId
        ? async () => {
            const response = await apiRequest(`/api/stats/player/${playerId}`);
            return response as any; // TODO: Define PlayerStats type
          }
        : skipToken,
    }),

  teamStats: (teamId?: string | number) =>
    queryOptions({
      queryKey: ['/api/stats/team', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/stats/team/${teamId}`);
            return response as any; // TODO: Define TeamStats type
          }
        : skipToken,
    }),

  leaderboards: () =>
    queryOptions({
      queryKey: ['/api/stats/leaderboards'],
      queryFn: async () => {
        const response = await apiRequest('/api/stats/leaderboards');
        return response as any; // TODO: Define Leaderboard type
      },
    }),
};

/**
 * Inventory Queries
 */
export const inventoryQueries = {
  myInventory: () =>
    queryOptions({
      queryKey: ['/api/inventory/my'],
      queryFn: async () => {
        const response = await apiRequest('/api/inventory/my');
        return response as any[]; // TODO: Define InventoryItem type
      },
    }),

  consumables: () =>
    queryOptions({
      queryKey: ['/api/consumables'],
      queryFn: async () => {
        const response = await apiRequest('/api/consumables');
        return response as any[]; // TODO: Define Consumable type
      },
    }),
};

/**
 * Finance Queries
 */
export const financeQueries = {
  teamFinances: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/teams', teamId, 'finances'],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/teams/${teamId}/finances`);
            return response as TeamFinances;
          }
        : skipToken,
    }),

  transactions: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/finances/transactions', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/finances/transactions/${teamId}`);
            return response as any[]; // TODO: Define Transaction type
          }
        : skipToken,
    }),
};

/**
 * Contract Queries
 */
export const contractQueries = {
  teamContracts: (teamId?: string) =>
    queryOptions({
      queryKey: ['/api/contracts/team', teamId],
      queryFn: teamId
        ? async () => {
            const response = await apiRequest(`/api/contracts/team/${teamId}`);
            return response as Contract[];
          }
        : skipToken,
    }),

  negotiations: () =>
    queryOptions({
      queryKey: ['/api/contracts/negotiations'],
      queryFn: async () => {
        const response = await apiRequest('/api/contracts/negotiations');
        return response as any[]; // TODO: Define Negotiation type
      },
    }),
};