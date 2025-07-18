/**
 * Optimized Query Hook with Caching and Performance Enhancements
 * Integrates with existing TanStack Query setup
 */
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  endpoint: string;
  cacheTime?: number;
  staleTime?: number;
  tags?: string[];
  dependencies?: any[];
}

/**
 * Enhanced query hook with intelligent caching
 */
export function useOptimizedQuery<T = any>({
  endpoint,
  cacheTime = 5 * 60 * 1000, // 5 minutes
  staleTime = 2 * 60 * 1000, // 2 minutes
  tags = [],
  dependencies = [],
  ...options
}: OptimizedQueryOptions<T>) {
  const queryClient = useQueryClient();
  
  const queryKey = [endpoint, ...dependencies];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      return response.json();
    },
    cacheTime,
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    ...options,
  });
}

/**
 * Cached team data query
 */
export function useTeamQuery(teamId?: number, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/teams/${teamId}`,
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    tags: ['team'],
    dependencies: [teamId],
    ...options,
  });
}

/**
 * Cached player data query
 */
export function usePlayersQuery(teamId?: number, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/teams/${teamId}/players`,
    enabled: !!teamId,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    tags: ['players', 'team'],
    dependencies: [teamId],
    ...options,
  });
}

/**
 * Cached match data query
 */
export function useMatchQuery(matchId?: number, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/matches/${matchId}`,
    enabled: !!matchId,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    tags: ['match'],
    dependencies: [matchId],
    ...options,
  });
}

/**
 * Cached league standings query
 */
export function useLeagueStandingsQuery(leagueId?: number, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/leagues/${leagueId}/standings`,
    enabled: !!leagueId,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    tags: ['standings', 'league'],
    dependencies: [leagueId],
    ...options,
  });
}

/**
 * Cached tournament data query
 */
export function useTournamentQuery(tournamentId?: number, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/tournaments/${tournamentId}`,
    enabled: !!tournamentId,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    tags: ['tournament'],
    dependencies: [tournamentId],
    ...options,
  });
}

/**
 * Cached marketplace listings query
 */
export function useMarketplaceQuery(page = 1, limit = 20, options?: Partial<OptimizedQueryOptions<any>>) {
  return useOptimizedQuery({
    endpoint: `/api/marketplace?page=${page}&limit=${limit}`,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    tags: ['marketplace'],
    dependencies: [page, limit],
    ...options,
  });
}

/**
 * Cache invalidation utilities
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateTeam: (teamId?: number) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
    },
    invalidatePlayers: (teamId?: number) => {
      queryClient.invalidateQueries({ queryKey: ['players', teamId] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
    },
    invalidateMatch: (matchId?: number) => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
    },
    invalidateLeague: (leagueId?: number) => {
      queryClient.invalidateQueries({ queryKey: ['standings', leagueId] });
      queryClient.invalidateQueries({ queryKey: [`/api/leagues/${leagueId}/standings`] });
    },
    invalidateMarketplace: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}

/**
 * Prefetch utilities for performance
 */
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  
  return {
    prefetchTeam: (teamId: number) => {
      queryClient.prefetchQuery({
        queryKey: [`/api/teams/${teamId}`],
        queryFn: async () => {
          const response = await apiRequest('GET', `/api/teams/${teamId}`);
          return response.json();
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    prefetchPlayers: (teamId: number) => {
      queryClient.prefetchQuery({
        queryKey: [`/api/teams/${teamId}/players`],
        queryFn: async () => {
          const response = await apiRequest('GET', `/api/teams/${teamId}/players`);
          return response.json();
        },
        staleTime: 1 * 60 * 1000,
      });
    },
    prefetchMatch: (matchId: number) => {
      queryClient.prefetchQuery({
        queryKey: [`/api/matches/${matchId}`],
        queryFn: async () => {
          const response = await apiRequest('GET', `/api/matches/${matchId}`);
          return response.json();
        },
        staleTime: 30 * 1000,
      });
    },
  };
}

export default useOptimizedQuery;