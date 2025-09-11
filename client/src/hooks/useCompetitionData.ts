/**
 * Optimized Competition Data Hook
 * Consolidates 10+ useQuery calls from Competition.tsx into a single performant hook
 * Uses useQueries pattern for parallel data fetching with proper memoization
 */

import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { teamQueries, leagueQueries, matchQueries, tournamentQueries } from '@/lib/api/queries';
import clientLogger, { ClientPerformanceMonitor } from '@/utils/clientLogger';

interface CompetitionDataOptions {
  teamId?: string;
  division?: string;
  subdivision?: string;
  enabled?: boolean;
}

interface CompetitionData {
  // Data
  team: any;
  standings: any;
  schedule: any;
  liveMatches: any;
  tournaments: any;
  statistics: any;
  playerStats: any;
  teamFinances: any;
  league: any;
  upcomingMatches: any;
  
  // Loading states
  isLoading: boolean;
  hasError: boolean;
  
  // Individual loading states for granular UI control
  teamLoading: boolean;
  standingsLoading: boolean;
  scheduleLoading: boolean;
  tournamentsLoading: boolean;
  
  // Actions
  refetchAll: () => void;
  joinTournament: (tournamentId: string) => Promise<void>;
  leaveTournament: (tournamentId: string) => Promise<void>;
  refreshStandings: () => void;
}

export function useCompetitionData(options: CompetitionDataOptions = {}): CompetitionData {
  const { teamId, division, subdivision, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track performance for this hook
  const performanceId = useMemo(() => `competition_${Date.now()}`, []);
  
  // Start performance tracking
  useMemo(() => {
    clientLogger.startPerformanceTracking(performanceId);
  }, [performanceId]);

  // Consolidated data fetching using useQueries for parallel execution
  const queries = useQueries({
    queries: [
      // Team data - highest priority
      {
        ...teamQueries.myTeam(),
        enabled: enabled,
        meta: { priority: 'high' }
      },
      
      // League standings
      {
        ...leagueQueries.standings(division, subdivision),
        enabled: enabled && !!division,
        meta: { priority: 'high' }
      },
      
      // League schedule
      {
        ...leagueQueries.schedule(division, subdivision),
        enabled: enabled && !!division,
        meta: { priority: 'medium' }
      },
      
      // Live matches removed - using quick simulation only
      {
        queryKey: ['live-matches-stub'],
        queryFn: () => Promise.resolve([]),
        enabled: false,
        meta: { priority: 'low' }
      },
      
      // Active tournaments
      {
        ...tournamentQueries.active(),
        enabled: enabled,
        meta: { priority: 'medium' }
      },
      
      // Team statistics (if team ID available)
      {
        queryKey: ['team-statistics', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/statistics`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        meta: { priority: 'low' }
      },
      
      // Player statistics
      {
        queryKey: ['player-statistics', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/player-stats`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        meta: { priority: 'low' }
      },
      
      // Team finances
      {
        queryKey: ['team-finances', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/finances`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        meta: { priority: 'low' }
      },
      
      // League information
      {
        queryKey: ['league-info', division],
        queryFn: () => division ? fetch(`/api/leagues/${division}`).then(r => r.json()) : null,
        enabled: enabled && !!division,
        staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
        meta: { priority: 'low' }
      },
      
      // Upcoming matches
      {
        queryKey: ['upcoming-matches', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/upcoming-matches`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        meta: { priority: 'medium' }
      }
    ],
    
    // Combine results for easy destructuring
    combine: (results) => {
      const [
        teamResult,
        standingsResult,
        scheduleResult,
        liveMatchesResult,
        tournamentsResult,
        statisticsResult,
        playerStatsResult,
        financesResult,
        leagueResult,
        upcomingMatchesResult
      ] = results;

      // Track performance when data is ready
      if (results.every(r => !r.isLoading)) {
        clientLogger.endPerformanceTracking(
          performanceId,
          'Competition data loaded',
          {
            component: 'useCompetitionData',
            queryCount: results.length,
            teamId,
            division,
            subdivision
          }
        );
      }

      return {
        // Data
        team: teamResult.data,
        standings: standingsResult.data,
        schedule: scheduleResult.data,
        liveMatches: liveMatchesResult.data,
        tournaments: tournamentsResult.data,
        statistics: statisticsResult.data,
        playerStats: playerStatsResult.data,
        teamFinances: financesResult.data,
        league: leagueResult.data,
        upcomingMatches: upcomingMatchesResult.data,
        
        // Loading states
        isLoading: results.some(r => r.isLoading),
        hasError: results.some(r => r.isError),
        
        // Individual loading states
        teamLoading: teamResult.isLoading,
        standingsLoading: standingsResult.isLoading,
        scheduleLoading: scheduleResult.isLoading,
        tournamentsLoading: tournamentsResult.isLoading,
        
        // Refetch function
        refetchAll: () => {
          clientLogger.info('Competition data refetch triggered', {
            component: 'useCompetitionData',
            teamId,
            division
          });
          results.forEach(result => result.refetch());
        },
        
        // Individual query results for advanced control
        queryResults: results
      };
    }
  });

  // Tournament management mutations
  const joinTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to join tournament');
      return response.json();
    },
    onSuccess: (data, tournamentId) => {
      clientLogger.info('Tournament joined successfully', {
        tournamentId,
        teamId,
        component: 'useCompetitionData'
      });
      toast({
        title: "Joined Tournament",
        description: "Successfully joined the tournament!",
      });
      // Invalidate tournaments query
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'active'] });
    },
    onError: (error: Error) => {
      clientLogger.error('Failed to join tournament', error, {
        component: 'useCompetitionData',
        teamId
      });
      toast({
        title: "Error",
        description: "Failed to join tournament. Please try again.",
        variant: "destructive",
      });
    }
  });

  const leaveTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/leave`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to leave tournament');
      return response.json();
    },
    onSuccess: (data, tournamentId) => {
      clientLogger.info('Tournament left successfully', {
        tournamentId,
        teamId,
        component: 'useCompetitionData'
      });
      toast({
        title: "Left Tournament",
        description: "Successfully left the tournament.",
      });
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'active'] });
    },
    onError: (error: Error) => {
      clientLogger.error('Failed to leave tournament', error, {
        component: 'useCompetitionData',
        teamId
      });
      toast({
        title: "Error",
        description: "Failed to leave tournament. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Memoized return object for performance
  return useMemo(() => ({
    ...queries,
    
    // Actions with proper error handling
    joinTournament: async (tournamentId: string) => {
      try {
        await joinTournamentMutation.mutateAsync(tournamentId);
      } catch (error) {
        // Error already handled in mutation onError
      }
    },
    
    leaveTournament: async (tournamentId: string) => {
      try {
        await leaveTournamentMutation.mutateAsync(tournamentId);
      } catch (error) {
        // Error already handled in mutation onError  
      }
    },
    
    refreshStandings: () => {
      clientLogger.info('Standings refresh requested', {
        component: 'useCompetitionData',
        division,
        subdivision
      });
      queryClient.invalidateQueries({ 
        queryKey: ['league', 'standings', division, subdivision] 
      });
    }
  }), [queries, joinTournamentMutation, leaveTournamentMutation, queryClient, division, subdivision]);
}

/**
 * Performance optimized hook for Competition page header data
 * Focuses on essential data needed for header display
 */
export function useCompetitionHeader(division?: string, subdivision?: string) {
  return useQueries({
    queries: [
      {
        ...teamQueries.myTeam(),
        select: (data) => ({
          id: data?.id,
          name: data?.name,
          division: data?.division,
          subdivision: data?.subdivision
        })
      },
      {
        ...leagueQueries.standings(division, subdivision),
        select: (data) => data?.slice(0, 5), // Top 5 for header display
        enabled: !!division
      }
    ],
    combine: (results) => ({
      team: results[0].data,
      topStandings: results[1].data,
      isLoading: results.some(r => r.isLoading),
      hasError: results.some(r => r.isError)
    })
  });
}