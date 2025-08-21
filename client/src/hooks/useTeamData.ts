/**
 * Centralized team data management hooks using React Query best practices
 * 
 * Key principles:
 * - Hierarchical query keys (generic -> specific) 
 * - Appropriate staleTime based on data volatility
 * - Consistent cache invalidation patterns
 * - No technical debt or band-aid solutions
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

// ===== QUERY KEY FACTORY =====
// Structured hierarchically for efficient cache invalidation
export const teamQueryKeys = {
  all: ['teams'] as const,
  my: () => [...teamQueryKeys.all, 'my'] as const,
  myDetail: () => [...teamQueryKeys.my(), 'detail'] as const,
  myMatches: () => [...teamQueryKeys.my(), 'matches'] as const,
  myUpcomingMatches: () => [...teamQueryKeys.myMatches(), 'upcoming'] as const,
  mySchedule: () => [...teamQueryKeys.my(), 'schedule'] as const,
  myComprehensiveSchedule: () => [...teamQueryKeys.mySchedule(), 'comprehensive'] as const,
} as const;

// ===== TYPE DEFINITIONS =====
interface Team {
  id: number;
  name: string;
  division: number;
  subdivision?: string;
  teamPower?: number;
  finances?: {
    credits: string;
    gems: string;
  };
  // Include additional properties that may exist
  camaraderie?: number;
  fanLoyalty?: number;
  homeField?: string;
  tacticalFocus?: string;
  leagueId?: number;
  wins?: number;
  losses?: number;
  points?: number;
}

interface UpcomingMatch {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  gameDate: string;
  matchType: string;
}

interface LiveMatch {
  id: string;
  status: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  gameTime?: number;
  matchType: string;
}

// ===== CORE DATA HOOKS =====

/**
 * Hook for authenticated user's team data
 * - Moderate staleTime (2 minutes) since team data changes infrequently
 * - Serves as dependency for other team-related queries
 */
export const useMyTeam = (isAuthenticated: boolean) => {
  return useQuery<Team>({
    queryKey: ['/api/teams/my'], // Use the actual API endpoint
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes - team data changes infrequently
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache longer
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
  });
};

/**
 * Hook for upcoming matches
 * - Short staleTime (30 seconds) since match data is more volatile
 * - Only enabled when team data is available
 */
export const useUpcomingMatches = (team: Team | undefined, isAuthenticated: boolean) => {
  return useQuery<UpcomingMatch[]>({
    queryKey: ['/api/teams/my/matches/upcoming'], // Use the actual API endpoint
    enabled: !!team?.id && isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds - match data changes more frequently
    gcTime: 1000 * 60 * 5, // 5 minutes cache
    refetchInterval: 1000 * 60, // Refetch every minute for live updates
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Important for match data
  });
};

/**
 * Hook for live matches
 * - Very short staleTime (10 seconds) since live data is highly volatile
 */
export const useLiveMatches = (team: Team | undefined, isAuthenticated: boolean) => {
  return useQuery<LiveMatch[]>({
    queryKey: ['matches', 'live'], // Global live matches, not team-specific
    enabled: !!team?.id && isAuthenticated,
    staleTime: 1000 * 10, // 10 seconds - live data is very volatile
    gcTime: 1000 * 60, // 1 minute cache
    refetchInterval: 1000 * 15, // Check every 15 seconds for live matches
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// ===== CACHE MANAGEMENT UTILITIES =====

/**
 * Hook to provide cache invalidation utilities
 */
export const useTeamCacheManager = () => {
  const queryClient = useQueryClient();

  const invalidateTeamData = async () => {
    // Invalidate all team-related queries using actual endpoints
    await queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
  };

  const invalidateMatchData = async () => {
    // Invalidate only match-related queries
    await queryClient.invalidateQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/matches/live'] });
  };

  const clearStaleTeamCache = async () => {
    // Remove stale team data and force fresh fetch
    queryClient.removeQueries({ queryKey: ['/api/teams/my'] });
    queryClient.removeQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
  };

  return {
    invalidateTeamData,
    invalidateMatchData,
    clearStaleTeamCache,
  };
};

// ===== COMPOSITE HOOKS =====

/**
 * High-level hook that combines team and match data
 * Ensures proper loading states and prevents stale data display
 */
export const useTeamDashboardData = (isAuthenticated: boolean) => {
  const { data: team, isLoading: teamLoading, error: teamError } = useMyTeam(isAuthenticated);
  const { data: upcomingMatches, isLoading: matchesLoading, error: matchesError } = useUpcomingMatches(team, isAuthenticated);
  const { data: liveMatches, isLoading: liveLoading } = useLiveMatches(team, isAuthenticated);

  const isLoading = teamLoading || (!!team && matchesLoading);
  const hasError = teamError || matchesError;

  return {
    team,
    upcomingMatches,
    liveMatches,
    isLoading,
    hasError,
    isReady: !!team && !isLoading, // Safe to render when we have team and not loading
  };
};