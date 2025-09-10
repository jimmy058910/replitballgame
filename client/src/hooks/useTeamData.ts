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
import type { Team } from '@shared/types/models';


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
  draws?: number;
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
    queryKey: ['/api/teams/my'], // Fixed: Stable query key for proper caching
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes - team data changes infrequently
    gcTime: 1000 * 60 * 5, // 5 minute cache
    refetchOnMount: false, // Use cached data on mount
    refetchOnWindowFocus: false, // Don't refetch on focus
  });
};

/**
 * Hook for upcoming matches  
 * Industry standard: Optimistic UI with background refresh
 * Shows cached data immediately, fetches fresh data in background
 */
export const useUpcomingMatches = (team: Team | undefined, isAuthenticated: boolean) => {
  return useQuery<UpcomingMatch[]>({
    queryKey: ['/api/teams/my/matches/upcoming'], // Standard query key
    enabled: !!team?.id && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes - matches change infrequently during day
    gcTime: 1000 * 60 * 10, // 10 minute cache
    refetchOnMount: false, // Use cached data
    refetchOnWindowFocus: false, // Don't constantly refetch
  });
};



// ===== CACHE MANAGEMENT UTILITIES =====

/**
 * Hook to provide cache invalidation utilities
 */
export const useTeamCacheManager = () => {
  const queryClient = useQueryClient();

  const invalidateUpcomingMatches = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
  };

  const invalidateAllTeamData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
    queryClient.invalidateQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['/api/teams/my-schedule/comprehensive'] });
  };

  const forceCacheRefresh = async () => {
    // Remove all cached data and force fresh fetch
    queryClient.removeQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
    queryClient.removeQueries({ queryKey: ['/api/teams/my'] });
    
    // Force immediate refetch
    await queryClient.refetchQueries({ 
      queryKey: ['/api/teams/my/matches/upcoming'],
      type: 'active'
    });
  };

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
    
    // Force immediate fresh fetch of critical data
    await queryClient.refetchQueries({ queryKey: ['/api/teams/my/matches/upcoming'] });
  };

  return {
    invalidateTeamData,
    invalidateMatchData,
    clearStaleTeamCache,
    invalidateUpcomingMatches,
    invalidateAllTeamData,
    forceCacheRefresh,
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


  const isLoading = teamLoading || (!!team && matchesLoading);
  const hasError = teamError || matchesError;

  // Debug logging for dashboard data
  console.log('🔍 [useTeamDashboardData] Debug:', {
    teamLoading,
    teamData: !!team,
    teamId: team?.id,
    teamError: !!teamError,
    matchesLoading,
    upcomingMatchesCount: upcomingMatches?.length || 0,
    matchesError: !!matchesError,

    isAuthenticated,
    isReady: !!team && !isLoading
  });

  if (upcomingMatches && upcomingMatches.length > 0) {
    console.log('🎯 [useTeamDashboardData] Upcoming matches data:', upcomingMatches.map(match => ({
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      gameDate: match.gameDate,
      matchType: match.matchType
    })));
  }

  return {
    team,
    upcomingMatches,

    isLoading,
    hasError,
    isReady: !!team && !isLoading, // Safe to render when we have team and not loading
  };
};