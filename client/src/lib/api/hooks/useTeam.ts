/**
 * Team API Hooks
 * Centralized hooks for team-related API operations
 */

import { useApiQuery, useApiMutation, invalidateQueries } from '../unified-client';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Player, Team, TeamFinances, Stadium } from '@shared/types/models';


// Types
export interface Team {
  id: string;
  name: string;
  userProfileId: string;
  division: number;
  subdivision: string;
  teamPower: number;
  camaraderie: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  stadium?: any;
  players?: any[];
  staff?: any[];
}

export interface TeamFinances {
  credits: number;
  gems: number;
  weeklyRevenue?: number;
  weeklyExpenses?: number;
}

export interface TeamStats {
  totalGames: number;
  winRate: number;
  averageGoalsScored: number;
  averageGoalsConceded: number;
  longestWinStreak: number;
  currentStreak: number;
}

// Queries
export function useMyTeam() {
  return useApiQuery<Team>('/teams/my', {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTeam(teamId: string | null) {
  return useApiQuery<Team>(
    teamId ? `/teams/${teamId}` : null,
    {
      staleTime: 1000 * 60 * 5,
    }
  );
}

export function useTeamFinances() {
  return useApiQuery<TeamFinances>('/teams/finances/my', {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useTeamStats(teamId?: string) {
  const endpoint = teamId ? `/teams/${teamId}/stats` : '/teams/my/stats';
  return useApiQuery<TeamStats>(endpoint, {
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useTeamPlayers(teamId?: string) {
  const endpoint = teamId ? `/teams/${teamId}/players` : '/teams/my/players';
  return useApiQuery<any[]>(endpoint, {
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeamStaff(teamId?: string) {
  const endpoint = teamId ? `/teams/${teamId}/staff` : '/teams/my/staff';
  return useApiQuery<any[]>(endpoint, {
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeamSchedule(teamId?: string) {
  const endpoint = teamId ? `/teams/${teamId}/schedule` : '/teams/my/schedule';
  return useApiQuery<any[]>(endpoint, {
    staleTime: 1000 * 60 * 5,
  });
}

export function useTaxiSquad(teamId?: string) {
  const endpoint = teamId ? `/teams/${teamId}/taxi-squad` : '/teams/my/taxi-squad';
  return useApiQuery<any[]>(endpoint, {
    staleTime: 1000 * 60 * 5,
  });
}

// Mutations
export function useUpdateTeamName() {
  const { toast } = useToast();
  
  return useApiMutation<Team, { name: string }>('/teams/my/name', 'PATCH', {
    onSuccess: (data) => {
      toast({
        title: 'Team name updated',
        description: `Your team is now called ${data.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/teams/my'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update team name',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTactics() {
  const { toast } = useToast();
  
  return useApiMutation<any, any>('/teams/my/tactics', 'PUT', {
    onSuccess: () => {
      toast({
        title: 'Tactics updated',
        description: 'Your tactical settings have been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['/teams/my'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update tactics',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function usePromoteTaxiPlayer() {
  const { toast } = useToast();
  
  return useApiMutation<any, { teamId: string; playerId: string }>(
    '/teams/taxi-squad/promote',
    'POST',
    {
      onSuccess: () => {
        toast({
          title: 'Player promoted',
          description: 'Player has been moved to the main roster',
        });
        invalidateQueries(['/teams/my/players', '/teams/my/taxi-squad']);
      },
      onError: (error) => {
        toast({
          title: 'Failed to promote player',
          description: error.message,
          variant: 'destructive',
        });
      },
    }
  );
}

export function useReleasePlayer() {
  const { toast } = useToast();
  
  return useApiMutation<any, { playerId: string }>(
    '/teams/players/release',
    'DELETE',
    {
      onSuccess: () => {
        toast({
          title: 'Player released',
          description: 'Player has been released from your team',
        });
        invalidateQueries(['/teams/my/players']);
      },
      onError: (error) => {
        toast({
          title: 'Failed to release player',
          description: error.message,
          variant: 'destructive',
        });
      },
    }
  );
}

// Stadium operations
export function useUpgradeStadium() {
  const { toast } = useToast();
  
  return useApiMutation<any, { upgradeType: string }>('/teams/stadium/upgrade', 'POST', {
    onSuccess: (data) => {
      toast({
        title: 'Stadium upgraded',
        description: data.message || 'Your stadium has been improved',
      });
      invalidateQueries(['/teams/my', '/teams/finances/my']);
    },
    onError: (error) => {
      toast({
        title: 'Failed to upgrade stadium',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Prefetch utilities
export function prefetchTeamData(teamId?: string) {
  const promises = [];
  
  if (teamId) {
    promises.push(
      queryClient.prefetchQuery({
        queryKey: [`/teams/${teamId}`],
        queryFn: () => fetch(`/api/teams/${teamId}`).then(r => r.json()),
      })
    );
  } else {
    promises.push(
      queryClient.prefetchQuery({
        queryKey: ['/teams/my'],
        queryFn: () => fetch('/api/teams/my').then(r => r.json()),
      })
    );
  }
  
  return Promise.all(promises);
}