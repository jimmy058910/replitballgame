import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type SeasonPhase = 'PRE_SEASON' | 'REGULAR_SEASON' | 'MID_SEASON_CUP' | 'DIVISION_TOURNAMENT' | 'OFF_SEASON';

export interface SeasonalUIState {
  currentPhase: SeasonPhase;
  gameDay: number;
  seasonDay: number;
  primaryActions: string[];
  disabledFeatures: string[];
  dashboardLayout: 'next_match' | 'new_season' | 'tournament' | 'off_season';
  navHighlight: string;
  contextualMessage: string;
}

export interface SeasonalData {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  details: string;
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
}

export function useSeasonalUI() {
  const { data: seasonalData } = useQuery<SeasonalData>({
    queryKey: ["/api/seasons/current-cycle"],
    refetchInterval: 60000, // Refresh every minute
  });

  const seasonalState = useMemo((): SeasonalUIState => {
    if (!seasonalData) {
      return {
        currentPhase: 'REGULAR_SEASON',
        gameDay: 1,
        seasonDay: 1,
        primaryActions: ['view_team'],
        disabledFeatures: [],
        dashboardLayout: 'next_match',
        navHighlight: '', // Navigation highlighting disabled
        contextualMessage: 'Loading season data...'
      };
    }

    const currentDay = seasonalData.currentDay;
    
    // Determine phase based on game day and season state
    let phase: SeasonPhase = 'REGULAR_SEASON';
    let dashboardLayout: SeasonalUIState['dashboardLayout'] = 'next_match';
    let primaryActions: string[] = [];
    let disabledFeatures: string[] = [];
    let navHighlight = ''; // Navigation highlighting disabled entirely
    let contextualMessage = '';

    if (currentDay === 17 || (currentDay === 1 && seasonalData.phase === 'PRE_SEASON')) {
      // Pre-season: Day 17 (3am) - Day 1 (3pm)
      phase = 'PRE_SEASON';
      dashboardLayout = 'new_season';
      primaryActions = ['finalize_roster', 'set_tactics', 'hire_staff'];
      disabledFeatures = ['league_matches', 'tournaments', 'exhibition_games'];
      navHighlight = ''; // Navigation highlighting disabled
      contextualMessage = 'New season preparation phase. Finalize your roster and tactics.';
    } else if (currentDay >= 1 && currentDay <= 14) {
      // Regular season
      phase = 'REGULAR_SEASON';
      dashboardLayout = 'next_match';
      primaryActions = ['check_lineup', 'view_next_opponent', 'manage_stamina'];
      disabledFeatures = ['contract_negotiations', 'taxi_promotions'];
      navHighlight = ''; // Navigation highlighting disabled
      contextualMessage = 'Regular season is active. Focus on league matches and player development.';
    } else if (currentDay === 15) {
      // Division tournament
      phase = 'DIVISION_TOURNAMENT';
      dashboardLayout = 'tournament';
      primaryActions = ['view_bracket', 'set_tournament_tactics', 'scout_opponents'];
      disabledFeatures = ['league_matches', 'exhibition_games'];
      navHighlight = ''; // Navigation highlighting disabled
      contextualMessage = 'Division Tournament! Compete for championship glory.';
    } else if (currentDay === 16) {
      // Off-season
      phase = 'OFF_SEASON';
      dashboardLayout = 'off_season';
      primaryActions = ['negotiate_contracts', 'promote_taxi_squad', 'review_season'];
      disabledFeatures = ['all_matches', 'tournaments'];
      navHighlight = ''; // Navigation highlighting disabled
      contextualMessage = 'Off-season: Contract negotiations and roster management.';
    }

    // Special case for Mid-Season Cup (Day 7 if registered)
    if (currentDay === 7) {
      // Check if team is registered for Mid-Season Cup
      phase = 'MID_SEASON_CUP';
      dashboardLayout = 'tournament';
      primaryActions = ['view_cup_bracket', 'prepare_for_cup'];
      navHighlight = ''; // Navigation highlighting disabled
      contextualMessage = 'Mid-Season Cup active! Compete against division rivals.';
    }

    return {
      currentPhase: phase,
      gameDay: currentDay,
      seasonDay: currentDay,
      primaryActions,
      disabledFeatures,
      dashboardLayout,
      navHighlight,
      contextualMessage
    };
  }, [seasonalData]);

  return {
    seasonalState,
    seasonalData,
    isLoading: !seasonalData
  };
}

// Helper functions for UI components
export function getPhaseDisplayName(phase: SeasonPhase): string {
  switch (phase) {
    case 'PRE_SEASON': return 'Pre-Season Preparation';
    case 'REGULAR_SEASON': return 'Regular Season';
    case 'MID_SEASON_CUP': return 'Mid-Season Cup';
    case 'DIVISION_TOURNAMENT': return 'Division Tournament';
    case 'OFF_SEASON': return 'Off-Season';
    default: return 'Season Active';
  }
}

export function getPrimaryActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'finalize_roster': 'Finalize Roster',
    'set_tactics': 'Set Tactics',
    'hire_staff': 'Hire Staff',
    'check_lineup': 'Check Lineup',
    'view_next_opponent': 'Scout Next Opponent',
    'manage_stamina': 'Manage Player Stamina',
    'view_bracket': 'View Tournament Bracket',
    'set_tournament_tactics': 'Set Tournament Tactics',
    'scout_opponents': 'Scout Tournament Opponents',
    'negotiate_contracts': 'Negotiate Contracts',
    'promote_taxi_squad': 'Promote Taxi Squad Players',
    'review_season': 'Review Season Performance',
    'view_cup_bracket': 'View Cup Bracket',
    'prepare_for_cup': 'Prepare for Cup Match',
    'view_team': 'View Team'
  };
  return labels[action] || action;
}