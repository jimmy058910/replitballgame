/**
 * Centralized data fetching hook for Competition Center
 * Optimizes React Query usage and reduces component complexity
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { 
  teamQueryOptions,
  seasonQueryOptions,
  leagueQueryOptions,
  matchQueryOptions,
  tournamentQueryOptions
} from '@/lib/api/queryOptions';

export interface UseCompetitionDataResult {
  // Team data
  team: any;
  teamLoading: boolean;
  teamError: any;
  
  // Season data
  seasonData: any;
  
  // Match data
  liveMatches: any[];
  upcomingMatches: any[];
  recentMatches: any[];
  dailySchedule: any;
  
  // Overall loading state
  isLoading: boolean;
  hasError: boolean;
}

/**
 * Primary data hook for Competition Center components
 * Fetches all essential competition-related data
 */
export const useCompetitionData = (): UseCompetitionDataResult => {
  const { isAuthenticated } = useAuth();
  
  // Core team data  
  const { data: team, isLoading: teamLoading, error: teamError } = useQuery(
    isAuthenticated ? teamQueryOptions.myTeam(isAuthenticated) : { enabled: false } as any
  );
  
  // Season data - use proper typing to avoid TS errors
  const { data: seasonData } = useQuery(
    (team as any)?.id ? seasonQueryOptions.current() : { enabled: false } as any
  );
  
  // Match data
  const { data: liveMatches = [] } = useQuery(matchQueryOptions.live());
  const { data: upcomingMatches = [] } = useQuery(
    (team as any)?.id ? matchQueryOptions.upcoming() : { enabled: false } as any
  );
  const { data: recentMatches = [] } = useQuery(
    (team as any)?.id ? matchQueryOptions.recent() : { enabled: false } as any
  );
  const { data: dailySchedule } = useQuery(matchQueryOptions.dailySchedule());
  
  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    team,
    teamLoading,
    teamError,
    seasonData,
    liveMatches,
    upcomingMatches,
    recentMatches,
    dailySchedule,
    isLoading: teamLoading,
    hasError: !!teamError
  }), [
    team,
    teamLoading,
    teamError,
    seasonData,
    liveMatches,
    upcomingMatches,
    recentMatches,
    dailySchedule
  ]);
};