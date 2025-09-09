import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Team, TeamFinances } from '@shared/types/models';


// Type-safe wrapper for useQuery that handles API requests with proper typing
export function useTypedQuery<T>(
  queryKey: (string | number)[],
  options: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> = {}
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey,
    queryFn: () => apiRequest(queryKey[0] as string),
    ...options
  });
}

// Specialized hooks for common API patterns
export function useTeamQuery() {
  return useTypedQuery<import('@shared/types/api').Team>(['/api/teams/my']);
}

export function useTeamFinancesQuery(teamId?: string) {
  return useTypedQuery<import('@shared/types/api').TeamFinances>(
    [`/api/teams/${teamId}/finances`],
    { enabled: !!teamId }
  );
}

export function useStoreItemsQuery() {
  return useTypedQuery<{ dailyItems: import('@shared/types/api').StoreItem[] }>(
    ['/api/store/items']
  );
}

export function useLeagueStandingsQuery(teamId?: string) {
  return useTypedQuery<import('@shared/types/api').LeagueStanding[]>(
    [`/api/leagues/${teamId}/standings`],
    { enabled: !!teamId }
  );
}