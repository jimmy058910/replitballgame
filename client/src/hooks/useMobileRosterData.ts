/**
 * Optimized Mobile Roster Data Hook
 * Consolidates 7+ useQuery calls from MobileRosterHQ.tsx into a single performant hook
 * Implements proper memoization and performance tracking for 40+ hook optimization
 */

import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { teamQueries, playerQueries, injuryQueries, contractQueries } from '@/lib/api/queries';
import clientLogger, { ClientPerformanceMonitor } from '@/utils/clientLogger';
import type { Player, Team, Injury, Contract, Staff } from '@shared/types/models';

interface MobileRosterDataOptions {
  teamId?: string;
  enabled?: boolean;
  autoRefresh?: boolean;
}

interface RosterFilters {
  position?: string;
  injuryStatus?: 'healthy' | 'injured' | 'all';
  contractStatus?: 'active' | 'expiring' | 'all';
  sortBy?: 'name' | 'overall' | 'salary' | 'age';
  sortOrder?: 'asc' | 'desc';
}

interface MobileRosterData {
  // Core data
  team: Team | null;
  players: Player[];
  staff: Staff[];
  injuries: Injury[];
  contracts: Contract[];
  
  // Filtered and processed data
  filteredPlayers: Player[];
  healthyPlayers: Player[];
  injuredPlayers: Player[];
  starterPlayers: Player[];
  benchPlayers: Player[];
  
  // Statistics
  rosterStats: {
    totalPlayers: number;
    healthyCount: number;
    injuredCount: number;
    averageAge: number;
    totalSalary: number;
    averageOverall: number;
  };
  
  // Loading states
  isLoading: boolean;
  hasError: boolean;
  playersLoading: boolean;
  injuriesLoading: boolean;
  
  // Filter management
  filters: RosterFilters;
  setFilters: (filters: Partial<RosterFilters>) => void;
  clearFilters: () => void;
  
  // Actions
  refetchAll: () => void;
  releasePlayer: (playerId: string) => Promise<void>;
  moveToTaxi: (playerId: string) => Promise<void>;
  promoteFromTaxi: (playerId: string) => Promise<void>;
  updateLineup: (lineup: any) => Promise<void>;
}

const defaultFilters: RosterFilters = {
  injuryStatus: 'all',
  contractStatus: 'all',
  sortBy: 'overall',
  sortOrder: 'desc'
};

export function useMobileRosterData(options: MobileRosterDataOptions = {}): MobileRosterData {
  const { teamId, enabled = true, autoRefresh = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter state management
  const [filters, setFiltersState] = useState<RosterFilters>(defaultFilters);
  
  // Performance tracking
  const performanceId = useMemo(() => `roster_${Date.now()}`, []);
  
  useMemo(() => {
    clientLogger.startPerformanceTracking(performanceId);
  }, [performanceId]);

  // Consolidated data queries using useQueries for parallel execution
  const queries = useQueries({
    queries: [
      // Team data with players
      {
        ...teamQueries.withPlayers(teamId),
        enabled: enabled && !!teamId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: autoRefresh ? 5 * 60 * 1000 : false, // 5 minutes if auto-refresh
        meta: { priority: 'high' }
      },
      
      // Team staff
      {
        queryKey: ['team-staff', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/staff`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 10 * 60 * 1000, // 10 minutes (staff changes less frequently)
        meta: { priority: 'medium' }
      },
      
      // Player injuries
      {
        ...injuryQueries.byTeam(teamId),
        enabled: enabled && !!teamId,
        staleTime: 1 * 60 * 1000, // 1 minute (injuries need frequent updates)
        refetchInterval: autoRefresh ? 2 * 60 * 1000 : false, // 2 minutes
        meta: { priority: 'high' }
      },
      
      // Player contracts
      {
        ...contractQueries.byTeam(teamId),
        enabled: enabled && !!teamId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        meta: { priority: 'medium' }
      },
      
      // Team chemistry/camaraderie data
      {
        queryKey: ['team-chemistry', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/chemistry`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        meta: { priority: 'low' }
      },
      
      // Tactical formation data
      {
        queryKey: ['team-tactics', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/tactics`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        meta: { priority: 'low' }
      },
      
      // Recent performance data
      {
        queryKey: ['team-recent-performance', teamId],
        queryFn: () => teamId ? fetch(`/api/teams/${teamId}/recent-performance`).then(r => r.json()) : null,
        enabled: enabled && !!teamId,
        staleTime: 15 * 60 * 1000, // 15 minutes
        meta: { priority: 'low' }
      }
    ],
    
    combine: (results) => {
      const [
        teamResult,
        staffResult,
        injuriesResult,
        contractsResult,
        chemistryResult,
        tacticsResult,
        performanceResult
      ] = results;
      
      // Extract data with null safety
      const team = teamResult.data as Team | null;
      const players = (team?.players || []) as Player[];
      const staff = (staffResult.data || []) as Staff[];
      const injuries = (injuriesResult.data || []) as Injury[];
      const contracts = (contractsResult.data || []) as Contract[];
      
      // Performance tracking when all data is loaded
      if (results.every(r => !r.isLoading)) {
        clientLogger.endPerformanceTracking(
          performanceId,
          'Mobile roster data loaded',
          {
            component: 'useMobileRosterData',
            playerCount: players.length,
            teamId
          }
        );
      }
      
      return {
        team,
        players,
        staff,
        injuries,
        contracts,
        
        // Loading states
        isLoading: results.some(r => r.isLoading),
        hasError: results.some(r => r.isError),
        playersLoading: teamResult.isLoading,
        injuriesLoading: injuriesResult.isLoading,
        
        // Query results for advanced control
        queryResults: results
      };
    }
  });

  // Memoized filtered and processed data
  const processedData = useMemo(() => {
    const { players, injuries } = queries;
    
    if (!players || !Array.isArray(players)) {
      return {
        filteredPlayers: [],
        healthyPlayers: [],
        injuredPlayers: [],
        starterPlayers: [],
        benchPlayers: [],
        rosterStats: {
          totalPlayers: 0,
          healthyCount: 0,
          injuredCount: 0,
          averageAge: 0,
          totalSalary: 0,
          averageOverall: 0
        }
      };
    }
    
    // Create injury lookup for performance
    const injuryLookup = new Set((injuries || []).map(i => i.playerId));
    
    // Apply filters
    let filteredPlayers = [...players];
    
    // Filter by position
    if (filters.position && filters.position !== 'all') {
      filteredPlayers = filteredPlayers.filter(p => p.position === filters.position);
    }
    
    // Filter by injury status
    if (filters.injuryStatus !== 'all') {
      filteredPlayers = filteredPlayers.filter(p => {
        const isInjured = injuryLookup.has(p.id);
        return filters.injuryStatus === 'injured' ? isInjured : !isInjured;
      });
    }
    
    // Sort players
    if (filters.sortBy) {
      filteredPlayers.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filters.sortBy) {
          case 'name':
            aValue = a.firstName + ' ' + a.lastName;
            bValue = b.firstName + ' ' + b.lastName;
            break;
          case 'overall':
            aValue = (a.speed + a.power + a.throwing + a.catching + a.kicking) / 5;
            bValue = (b.speed + b.power + b.throwing + b.catching + b.kicking) / 5;
            break;
          case 'age':
            aValue = a.age;
            bValue = b.age;
            break;
          case 'salary':
            aValue = a.salary || 0;
            bValue = b.salary || 0;
            break;
          default:
            return 0;
        }
        
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return filters.sortOrder === 'desc' ? -result : result;
      });
    }
    
    // Categorize players
    const healthyPlayers = players.filter(p => !injuryLookup.has(p.id));
    const injuredPlayers = players.filter(p => injuryLookup.has(p.id));
    const starterPlayers = players.filter(p => p.isStarter);
    const benchPlayers = players.filter(p => !p.isStarter);
    
    // Calculate statistics
    const totalPlayers = players.length;
    const healthyCount = healthyPlayers.length;
    const injuredCount = injuredPlayers.length;
    const averageAge = totalPlayers > 0 ? players.reduce((sum, p) => sum + (p.age || 0), 0) / totalPlayers : 0;
    const totalSalary = players.reduce((sum, p) => sum + (p.salary || 0), 0);
    const averageOverall = totalPlayers > 0 
      ? players.reduce((sum, p) => sum + ((p.speed + p.power + p.throwing + p.catching + p.kicking) / 5), 0) / totalPlayers 
      : 0;
    
    return {
      filteredPlayers,
      healthyPlayers,
      injuredPlayers,
      starterPlayers,
      benchPlayers,
      rosterStats: {
        totalPlayers,
        healthyCount,
        injuredCount,
        averageAge: Math.round(averageAge * 10) / 10,
        totalSalary,
        averageOverall: Math.round(averageOverall * 10) / 10
      }
    };
  }, [queries.players, queries.injuries, filters]);

  // Player management mutations
  const releasePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await fetch(`/api/players/${playerId}/release`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to release player');
      return response.json();
    },
    onSuccess: (data, playerId) => {
      clientLogger.info('Player released successfully', {
        playerId,
        teamId,
        component: 'useMobileRosterData'
      });
      toast({
        title: "Player Released",
        description: "Player has been released from the team.",
      });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    },
    onError: (error: Error) => {
      clientLogger.error('Failed to release player', error, {
        component: 'useMobileRosterData',
        teamId
      });
      toast({
        title: "Error",
        description: "Failed to release player. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Filter management functions
  const setFilters = useCallback((newFilters: Partial<RosterFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    clientLogger.info('Roster filters updated', {
      component: 'useMobileRosterData',
      filters: newFilters
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    clientLogger.info('Roster filters cleared', {
      component: 'useMobileRosterData'
    });
  }, []);

  // Return memoized result
  return useMemo(() => ({
    ...queries,
    ...processedData,
    
    // Filter management
    filters,
    setFilters,
    clearFilters,
    
    // Actions
    refetchAll: () => {
      clientLogger.info('Mobile roster data refetch triggered', {
        component: 'useMobileRosterData',
        teamId
      });
      queries.queryResults?.forEach(result => result.refetch());
    },
    
    releasePlayer: async (playerId: string) => {
      try {
        await releasePlayerMutation.mutateAsync(playerId);
      } catch (error) {
        // Error already handled in mutation
      }
    },
    
    moveToTaxi: async (playerId: string) => {
      // TODO: Implement taxi squad functionality
      clientLogger.info('Move to taxi requested', { playerId, teamId });
    },
    
    promoteFromTaxi: async (playerId: string) => {
      // TODO: Implement taxi squad functionality
      clientLogger.info('Promote from taxi requested', { playerId, teamId });
    },
    
    updateLineup: async (lineup: any) => {
      // TODO: Implement lineup update functionality
      clientLogger.info('Lineup update requested', { teamId, lineup });
    }
  }), [queries, processedData, filters, setFilters, clearFilters, releasePlayerMutation, teamId]);
}

/**
 * Lightweight hook for roster header/summary data
 * Used when full roster data is not needed
 */
export function useRosterSummary(teamId?: string) {
  return useQuery({
    queryKey: ['roster-summary', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const response = await fetch(`/api/teams/${teamId}/roster-summary`);
      return response.json();
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => ({
      totalPlayers: data?.playerCount || 0,
      healthyPlayers: data?.healthyCount || 0,
      injuredPlayers: data?.injuredCount || 0,
      averageOverall: data?.averageOverall || 0,
      teamSalary: data?.totalSalary || 0
    })
  });
}