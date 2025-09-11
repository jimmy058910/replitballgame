/**
 * Query Options for TanStack Query v5
 * Following 2025 best practices for type-safe queries
 */

import { queryOptions, skipToken } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type {
  TeamWithDetails,
  MarketplaceResponse,
  MarketplaceDashboardResponse,
  ContractsResponse,
  ContractCalculationResponse
} from './apiTypes';
import type { Team, Player, Staff, Tournament } from '@shared/types/models';

// ============================================================================
// TEAM QUERIES
// ============================================================================

export const teamQueryOptions = {
  myTeam: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/teams/my'],
    queryFn: authenticated
      ? async (): Promise<TeamWithDetails> => {
          const response = await apiRequest('/api/teams/my');
          return response as TeamWithDetails;
        }
      : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),

  // For legacy "myTeam" key compatibility
  myTeamLegacy: () => queryOptions({
    queryKey: ['myTeam'],
    queryFn: async (): Promise<Team> => {
      const response = await apiRequest('/api/teams/my');
      return response as Team;
    },
    staleTime: 5 * 60 * 1000,
  }),

  teamById: (teamId: string | number) => queryOptions({
    queryKey: ['/api/teams', teamId],
    queryFn: async (): Promise<Team> => {
      const response = await apiRequest(`/api/teams/${teamId}`);
      return response as Team;
    },
    staleTime: 5 * 60 * 1000,
  }),

  teamFinances: (teamId: string | number) => queryOptions({
    queryKey: ['/api/teams', teamId, 'finances'],
    queryFn: async () => {
      const response = await apiRequest(`/api/teams/${teamId}/finances`);
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
  }),

  teamContracts: (teamId: string | number) => queryOptions({
    queryKey: ['/api/teams', teamId, 'contracts'],
    queryFn: async (): Promise<ContractsResponse> => {
      const response = await apiRequest(`/api/teams/${teamId}/contracts`);
      return response as ContractsResponse;
    },
    staleTime: 60 * 1000,
  }),

  teamMatches: (teamId?: string | number) => queryOptions({
    queryKey: ['teamMatches', teamId],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest('/api/team-matches');
          return response as any[];
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),
};

// ============================================================================
// MARKETPLACE QUERIES
// ============================================================================

export const marketplaceQueryOptions = {
  listings: (page: number = 1, filters: Record<string, any> = {}) => queryOptions({
    queryKey: ['/api/enhanced-marketplace/listings', page, filters],
    queryFn: async (): Promise<MarketplaceResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });
      const response = await apiRequest(`/api/enhanced-marketplace/listings?${params}`);
      return response as MarketplaceResponse;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  }),

  dashboard: () => queryOptions({
    queryKey: ['/api/enhanced-marketplace/dashboard'],
    queryFn: async (): Promise<MarketplaceDashboardResponse> => {
      const response = await apiRequest('/api/enhanced-marketplace/dashboard');
      return response as MarketplaceDashboardResponse;
    },
    refetchInterval: 30 * 1000,
  }),
};

// ============================================================================
// PLAYER QUERIES
// ============================================================================

export const playerQueryOptions = {
  playerById: (playerId: string | number) => queryOptions({
    queryKey: ['/api/players', playerId],
    queryFn: async (): Promise<Player> => {
      const response = await apiRequest(`/api/players/${playerId}`);
      return response as Player;
    },
    staleTime: 5 * 60 * 1000,
  }),

  playersByTeam: (teamId: string | number) => queryOptions({
    queryKey: ['/api/teams', teamId, 'players'],
    queryFn: async (): Promise<Player[]> => {
      const response = await apiRequest(`/api/teams/${teamId}/players`);
      return response as Player[];
    },
    staleTime: 60 * 1000,
  }),

  contractCalculation: (playerId: string | number) => queryOptions({
    queryKey: ['/api/players', playerId, 'contract-calculation'],
    queryFn: async (): Promise<ContractCalculationResponse> => {
      const response = await apiRequest(`/api/players/${playerId}/contract-calculation`);
      return response as ContractCalculationResponse;
    },
    staleTime: 30 * 1000,
  }),
};

// ============================================================================
// TOURNAMENT QUERIES
// ============================================================================

export const tournamentQueryOptions = {
  active: () => queryOptions({
    queryKey: ['/api/tournaments/active'],
    queryFn: async (): Promise<Tournament[]> => {
      const response = await apiRequest('/api/tournaments/active');
      return response as Tournament[];
    },
    refetchInterval: 60 * 1000, // Refresh every minute
  }),

  byId: (tournamentId?: string | number) => queryOptions({
    queryKey: ['/api/tournaments', tournamentId],
    queryFn: tournamentId 
      ? async (): Promise<Tournament> => {
          const response = await apiRequest(`/api/tournaments/${tournamentId}`);
          return response as Tournament;
        }
      : skipToken,
    staleTime: 30 * 1000,
  }),

  standings: (tournamentId?: string | number) => queryOptions({
    queryKey: ['/api/tournaments', tournamentId, 'standings'],
    queryFn: tournamentId
      ? async () => {
          const response = await apiRequest(`/api/tournaments/${tournamentId}/standings`);
          return response;
        }
      : skipToken,
    refetchInterval: 30 * 1000,
  }),

  // New tournament status queries for TournamentStatus.tsx
  myActive: () => queryOptions({
    queryKey: ['/api/tournament-status/my-active'],
    queryFn: async () => {
      const response = await apiRequest('/api/tournament-status/my-active');
      return response as Array<{
        id: string;
        name: string;
        type: string;
        division: number;
        status: string;
        currentParticipants: number;
        maxParticipants: number;
        spotsRemaining: number;
        isFull: boolean;
        isReadyToStart: boolean;
        timeUntilStart: number;
        timeUntilStartText: string;
        registrationDeadline: string;
        tournamentStartTime: string;
        entryFeeCredits: number;
        entryFeeGems: number;
        prizes: any;
        entryTime: string;
        placement: number | null;
        participantCount: number;
        currentStage: string | null;
      }>;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  }),

  status: (tournamentId?: string | number) => queryOptions({
    queryKey: ['/api/tournament-status', String(tournamentId), 'status'],
    queryFn: tournamentId 
      ? async () => {
          const response = await apiRequest(`/api/tournament-status/${String(tournamentId)}/status`);
          return response as {
            id: string;
            name: string;
            type: string;
            division: number;
            status: string;
            currentParticipants: number;
            maxParticipants: number;
            spotsRemaining: number;
            isFull: boolean;
            isReadyToStart: boolean;
            timeUntilStart: number;
            timeUntilStartText: string;
            registrationDeadline: string;
            tournamentStartTime: string;
            entryFeeCredits: number;
            entryFeeGems: number;
            prizes: any;
            participants: Array<{
              teamId: string;
              teamName: string;
              division: number;
              entryTime: string;
              placement: number | null;
            }>;
            userTeamRegistered: boolean;
            userTeamEntry: {
              entryTime: string;
              placement: number | null;
            };
            matches?: Array<{
              id: string;
              round: string;
              homeTeam: { id: string; name: string; seed?: number };
              awayTeam: { id: string; name: string; seed?: number };
              homeScore?: number;
              awayScore?: number;
              status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
              startTime?: string;
              winner?: string;
            }>;
          };
        }
      : skipToken,
    refetchInterval: 15 * 1000, // Refresh every 15 seconds
  }),

  available: (teamId?: string) => queryOptions({
    queryKey: ['/api/tournaments/available', teamId],
    queryFn: teamId
      ? async (): Promise<Tournament[]> => {
          const response = await apiRequest('/api/tournaments/available');
          return response as Tournament[];
        }
      : skipToken,
  }),

  myTournaments: (teamId?: string) => queryOptions({
    queryKey: ['/api/new-tournaments/my-tournaments', teamId],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest('/api/new-tournaments/my-tournaments');
          return response as any;
        }
      : skipToken,
  }),

  history: (teamId?: string) => queryOptions({
    queryKey: ['/api/tournament-history', teamId],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest('/api/tournament-history');
          return response as any[];
        }
      : skipToken,
  }),

  dailyStatus: (division?: number) => queryOptions({
    queryKey: [`/api/tournaments/daily-division/status/${division || 8}`],
    queryFn: division
      ? async () => {
          const response = await apiRequest(`/api/tournaments/daily-division/status/${division}`);
          return response as any;
        }
      : skipToken,
    refetchInterval: 60 * 1000, // Refresh every minute for live updates
  }),

  bracket: (tournamentId?: string) => queryOptions({
    queryKey: [`/api/tournaments/${tournamentId}/matches`],
    queryFn: tournamentId
      ? async () => {
          const response = await apiRequest(`/api/tournaments/${tournamentId}/matches`);
          return response as any;
        }
      : skipToken,
    refetchInterval: 30 * 1000, // Update every 30 seconds for live bracket updates
  }),

  availableTournaments: (teamId?: string) => queryOptions({
    queryKey: ['/api/new-tournaments/available'],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest('/api/new-tournaments/available');
          return response as any;
        }
      : skipToken,
  }),

  tournamentsByAvailability: (teamDivision?: number, isAuthenticated?: boolean) => queryOptions({
    queryKey: ['/api/tournaments/available'],
    queryFn: (teamDivision && isAuthenticated)
      ? async () => {
          const response = await apiRequest('/api/tournaments/available');
          return response as any[];
        }
      : skipToken,
  }),
};

// ============================================================================
// SEASON QUERIES  
// ============================================================================

export const seasonQueryOptions = {
  current: () => queryOptions({
    queryKey: ['/api/seasons/current'],
    queryFn: async () => {
      const response = await apiRequest('/api/seasons/current');
      return response;
    },
    staleTime: 5 * 60 * 1000,
  }),

  flow: () => queryOptions({
    queryKey: ['/api/seasonal-flow'],
    queryFn: async () => {
      const response = await apiRequest('/api/seasonal-flow');
      return response;
    },
    refetchInterval: 60 * 1000,
  }),

  currentCycle: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/seasons/current-cycle'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/seasons/current-cycle');
          return response as {
            season: string;
            currentDay: number;
            phase: string;
            description: string;
            daysUntilPlayoffs?: number;
            daysUntilNewSeason?: number;
          };
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),

  seasonalData: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/seasonal-data`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/seasonal-data`);
          return response;
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),
};

// ============================================================================
// LEAGUE QUERIES
// ============================================================================

export const leagueQueryOptions = {
  standings: (division?: number) => queryOptions({
    queryKey: [`/api/leagues/${division || 8}/standings`],
    queryFn: division
      ? async () => {
          const response = await apiRequest(`/api/leagues/${division}/standings`) as any;
          // Extract standings array from wrapped response
          return response?.standings || response || [];
        }
      : skipToken,
    staleTime: 0, // Always fetch fresh data
  }),

  schedule: (division?: number) => queryOptions({
    queryKey: [`/api/leagues/${division || 8}/schedule`],
    queryFn: division
      ? async () => {
          const response = await apiRequest(`/api/leagues/${division}/schedule`);
          return response as any;
        }
      : skipToken,
    refetchInterval: 5 * 60 * 1000,
  }),

  comprehensiveSchedule: () => queryOptions({
    queryKey: ["teams", "my", "schedule", "comprehensive"],
    queryFn: async () => {
      const response = await apiRequest('/api/teams/my/schedule');
      return response as any[];
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes only
  }),
};

// ============================================================================
// EXHIBITION QUERIES
// ============================================================================

export const exhibitionQueryOptions = {
  stats: (enabled?: boolean) => queryOptions({
    queryKey: ['/api/exhibitions/stats'],
    queryFn: enabled
      ? async () => {
          const response = await apiRequest('/api/exhibitions/stats');
          return response as any;
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),

  recent: (enabled?: boolean) => queryOptions({
    queryKey: ['/api/exhibitions/recent'],
    queryFn: enabled
      ? async () => {
          const response = await apiRequest('/api/exhibitions/recent');
          return response as any;
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),

  availableOpponents: (enabled?: boolean) => queryOptions({
    queryKey: ['/api/exhibitions/available-opponents'],
    queryFn: enabled
      ? async () => {
          const response = await apiRequest('/api/exhibitions/available-opponents');
          return response as any;
        }
      : skipToken,
    staleTime: 30 * 1000,
  }),
};

// ============================================================================
// MATCH QUERIES
// ============================================================================

export const matchQueryOptions = {
  upcoming: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/matches/upcoming`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/matches/upcoming`);
          return response as any[];
        }
      : skipToken,
  }),

  recent: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/matches/recent`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/matches/recent`);
          return response as any[];
        }
      : skipToken,
  }),

  live: () => queryOptions({
    queryKey: ['/api/matches/live'],
    queryFn: async () => {
      const response = await apiRequest('/api/matches/live');
      return response as any[];
    },
    refetchInterval: 30 * 1000, // 30 seconds for live updates
  }),

  dailySchedule: () => queryOptions({
    queryKey: ['/api/leagues/daily-schedule'],
    queryFn: async () => {
      const response = await apiRequest('/api/leagues/daily-schedule');
      return response as any;
    },
    refetchInterval: 5 * 60 * 1000, // Update every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  }),
};

// ============================================================================
// SCOUTING QUERIES
// ============================================================================

export const scoutingQueryOptions = {
  teamData: (teamId?: string | number) => queryOptions({
    queryKey: [`/api/teams/${teamId}/scouting`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/scouting`);
          return response as any;
        }
      : skipToken,
  }),
};

// ============================================================================
// WORLD QUERIES
// ============================================================================

export const worldQueryOptions = {
  globalRankings: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/world/global-rankings'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/world/global-rankings');
          return response as Array<{
            id: string;
            name: string;
            division: number;
            globalRank: number;
            rating: number;
          }>;
        }
      : skipToken,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  }),

  statistics: () => queryOptions({
    queryKey: ['/api/world/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/world/statistics');
      return response as {
        totalTeams: number;
        totalPlayers: number;
        divisionLeaders: Record<string, any>;
        bestRecords: any[];
        strongestPlayers: any[];
      };
    },
    refetchInterval: 60 * 1000, // Refresh every minute
  }),
};

// ============================================================================
// TEAM TRENDS & SEASONAL QUERIES
// ============================================================================

export const trendsQueryOptions = {
  teamTrends: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/teams/trends'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/teams/trends');
          return response as {
            powerTrend: 'up' | 'down' | 'stable';
            powerChange: number;
            camaraderieTrend: 'up' | 'down' | 'stable';
            camaraderieChange: number;
            formTrend: 'up' | 'down' | 'stable';
            narrative: string;
            weeklyHighlight: string;
          };
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),
};

export const financeQueryOptions = {
  myTeamFinances: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/teams/finances/my'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/teams/finances/my');
          return response as {
            credits: number;
            gems: number;
            weeklyIncome: number;
            weeklyExpenses: number;
            stadiumRevenue: number;
            sponsorshipRevenue: number;
            salariesExpense: number;
          };
        }
      : skipToken,
    staleTime: 30 * 1000, // 30 seconds
  }),

  teamFinances: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/finances`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/finances`);
          return response as {
            credits: number;
            gems: number;
          };
        }
      : skipToken,
    staleTime: 30 * 1000,
  }),
};

// ============================================================================
// STAFF QUERIES
// ============================================================================

export const staffQueryOptions = {
  list: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/staff'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/staff');
          return response as {
            staff: (Staff & { contract?: { salary: number; duration: number; remainingYears: number } | null })[];
            totalStaffCost: number;
            totalStaffMembers: number;
          };
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),
};

// ============================================================================
// STADIUM QUERIES
// ============================================================================

export const stadiumQueryOptions = {
  byTeam: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/stadium`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/stadium`);
          return response as any;
        }
      : skipToken,
    staleTime: 5 * 60 * 1000,
  }),
};

// ============================================================================
// TAXI SQUAD QUERIES
// ============================================================================

export const taxiSquadQueryOptions = {
  byTeam: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/taxi-squad`],
    queryFn: teamId
      ? async (): Promise<Player[]> => {
          const response = await apiRequest(`/api/teams/${teamId}/taxi-squad`);
          return response as Player[];
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),
};

// ============================================================================
// STATS QUERIES
// ============================================================================

export const statsQueryOptions = {
  playerLeaderboards: () => queryOptions({
    queryKey: ['/api/stats/leaderboards/players'],
    queryFn: async () => {
      const response = await apiRequest('/api/stats/leaderboards/players');
      return response as {
        scoring: any[];
        passing: any[];
        rushing: any[];
        defense: any[];
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),

  teamLeaderboards: () => queryOptions({
    queryKey: ['/api/stats/leaderboards/teams'],
    queryFn: async () => {
      const response = await apiRequest('/api/stats/leaderboards/teams');
      return response as {
        scoring: any[];
        offense: any[];
        defense: any[];
      };
    },
    staleTime: 5 * 60 * 1000,
  }),

  playerStats: (playerId?: string) => queryOptions({
    queryKey: ['/api/stats/player', playerId],
    queryFn: playerId
      ? async () => {
          const response = await apiRequest(`/api/stats/player/${playerId}`);
          return response as any;
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),

  teamStats: (teamId?: string) => queryOptions({
    queryKey: ['/api/stats/team', teamId],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/stats/team/${teamId}`);
          return response as any;
        }
      : skipToken,
    staleTime: 60 * 1000,
  }),
};

// ============================================================================
// STORE QUERIES
// ============================================================================

export const storeQueryOptions = {
  gemStore: () => queryOptions({
    queryKey: ['/api/store/'],
    queryFn: async () => {
      const response = await apiRequest('/api/store/');
      return response as { consumables: any[] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),

  unifiedStore: () => queryOptions({
    queryKey: ['/api/store/items'],
    queryFn: async () => {
      const response = await apiRequest('/api/store/items');
      return response as { dailyItems: any[] };
    },
    staleTime: 60 * 1000, // 1 minute
  }),

  gemPackages: () => queryOptions({
    queryKey: ['/api/store/gem-packages'],
    queryFn: async () => {
      const response = await apiRequest('/api/store/gem-packages');
      return response as { data: any[] };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  }),

  realmPass: () => queryOptions({
    queryKey: ['/api/store/realm-pass'],
    queryFn: async () => {
      const response = await apiRequest('/api/store/realm-pass');
      return response as { data: any };
    },
    staleTime: 10 * 60 * 1000,
  }),
};

// ============================================================================
// CONTRACT QUERIES
// ============================================================================

export const contractQueryOptions = {
  byTeamId: (teamId?: string) => queryOptions({
    queryKey: ['/api/contracts', teamId],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/contracts?teamId=${teamId}`);
          return response as Array<{
            id: string;
            playerId: string;
            teamId: string;
            salary: number;
            duration: number;
            remainingYears: number;
            contractType: string;
            signedDate: string;
            expiryDate: string;
            bonuses?: {
              performance?: number;
              playoff?: number;
              championship?: number;
            };
            player?: {
              id: string;
              firstName: string;
              lastName: string;
              race?: string;
              position?: string;
              overall?: number;
              role?: string;
            };
          }>;
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),

  templates: () => queryOptions({
    queryKey: ['/api/contracts/templates'],
    queryFn: async () => {
      const response = await apiRequest('/api/contracts/templates');
      return response as Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        duration: number;
        avgSalary: number;
      }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  }),
};

// ============================================================================
// SERVER & UTILITY QUERIES  
// ============================================================================

export const serverQueryOptions = {
  time: () => queryOptions({
    queryKey: ['/api/server/time'],
    queryFn: async () => {
      const response = await apiRequest('/api/server/time');
      return response as { data: any };
    },
    refetchInterval: 2 * 60 * 1000, // Update every 2 minutes
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  }),

  nextMatch: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/next-match`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/next-match`);
          return response as {
            id: string;
            opponent: string;
            gameDate: string;
            isHome: boolean;
            matchType: string;
          };
        }
      : skipToken,
    staleTime: 5 * 60 * 1000,
  }),
};

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

export const inventoryQueryOptions = {
  teamInventory: (teamId?: string) => queryOptions({
    queryKey: [`/api/inventory/${teamId}`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/inventory/${teamId}`);
          return response as Array<{
            id: string;
            itemType: string;
            name: string;
            description: string;
            quantity: number;
            rarity: string;
            category: string;
            effects?: Record<string, any>;
            usageCount?: number;
            maxUsage?: number;
          }>;
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),

  activeBoosts: (teamId?: string) => queryOptions({
    queryKey: [`/api/teams/${teamId}/active-boosts`],
    queryFn: teamId
      ? async () => {
          const response = await apiRequest(`/api/teams/${teamId}/active-boosts`);
          return response as Array<{
            id: string;
            itemName: string;
            description: string;
            expiresAt: string;
            effects: Record<string, number>;
            remainingTime: number;
          }>;
        }
      : skipToken,
    staleTime: 30 * 1000, // 30 seconds for active boosts
  }),
};

// ============================================================================
// PLAYOFF & CHAMPIONSHIP QUERIES
// ============================================================================

export const playoffQueryOptions = {
  byDivision: (division?: number) => queryOptions({
    queryKey: ['/api/playoffs', division],
    queryFn: division
      ? async () => {
          const response = await apiRequest(`/api/playoffs?division=${division}`);
          return response as Array<{
            id: string;
            homeTeam: { id: string; name: string };
            awayTeam: { id: string; name: string };
            round: string;
            status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
            homeScore?: number;
            awayScore?: number;
            gameTime?: string;
            winner?: string;
          }>;
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),
};

export const camaraderieQueryOptions = {
  summary: (authenticated?: boolean) => queryOptions({
    queryKey: ['/api/camaraderie/summary'],
    queryFn: authenticated
      ? async () => {
          const response = await apiRequest('/api/camaraderie/summary');
          return response as {
            teamCamaraderie: number;
            status: string;
          };
        }
      : skipToken,
    staleTime: 60 * 1000, // 1 minute
  }),
};

export const championshipQueryOptions = {
  history: () => queryOptions({
    queryKey: ['/api/seasons/champions'],
    queryFn: async () => {
      const response = await apiRequest('/api/seasons/champions');
      return response as Array<{
        id: string;
        season: string;
        division: number;
        status: string;
        championTeam?: {
          id: string;
          name: string;
          division: number;
          wins?: number;
          losses?: number;
        };
      }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - championship history doesn't change often
  }),
};