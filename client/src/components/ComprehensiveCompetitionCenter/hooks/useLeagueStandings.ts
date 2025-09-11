/**
 * League standings data and logic hook
 * Handles division standings, scouting, and Greek alphabet subdivisions
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  leagueQueryOptions,
  scoutingQueryOptions,
  worldQueryOptions
} from '@/lib/api/queryOptions';

export interface UseLeagueStandingsResult {
  // Standings data
  divisionStandings: any[];
  standingsLoading: boolean;
  standingsError: any;
  
  // Global rankings
  globalRankings: any[];
  rankingsLoading: boolean;
  
  // Scouting modal state
  selectedTeamId: number | null;
  isScoutingModalOpen: boolean;
  scoutingData: any;
  scoutingLoading: boolean;
  
  // Actions
  openScoutingModal: (teamId: number) => void;
  closeScoutingModal: () => void;
}

/**
 * League standings hook with scouting integration
 */
export const useLeagueStandings = (team: any): UseLeagueStandingsResult => {
  // Debug logging
  console.log('🏆 useLeagueStandings - Team data:', { 
    team, 
    division: team?.division, 
    subdivision: team?.subdivision,
    teamId: team?.id 
  });

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isScoutingModalOpen, setIsScoutingModalOpen] = useState(false);
  
  // Division standings
  const { data: divisionStandings = [], isLoading: standingsLoading, error: standingsError } = useQuery({
    ...leagueQueryOptions.standings(team?.division ?? 8),
    enabled: !!team?.division,
    select: (data: any) => {
      // Handle the wrapped response format {success: true, standings: [...]}
      const standings = data?.standings || data || [];
      if (!Array.isArray(standings)) return [];
      
      return standings
        .filter(standing => standing && typeof standing.wins === 'number')
        .map((standing: any) => ({
          id: standing.teamId,
          name: standing.teamName,
          wins: standing.wins,
          losses: standing.losses,
          draws: standing.draws,
          points: standing.points,
          gamesPlayed: standing.gamesPlayed,
          totalScores: standing.totalScores || 0,
          scoresAgainst: standing.scoresAgainst || 0,
          scoreDifference: standing.scoreDifference || 0,
          position: standing.rank
        }))
        .sort((a: any, b: any) => {
          // Sort by points (desc), then by goal difference (desc), then by goals for (desc)
          if (b.points !== a.points) return b.points - a.points;
          if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference;
          return b.totalScores - a.totalScores;
        });
    }
  });
  
  // Global rankings
  const { data: globalRankings = [], isLoading: rankingsLoading } = useQuery({
    ...worldQueryOptions.globalRankings(!!team),
    enabled: !!team
  });
  
  // Scouting data
  const { data: scoutingData, isLoading: scoutingLoading } = useQuery(
    selectedTeamId ? scoutingQueryOptions.teamData(selectedTeamId) : { enabled: false } as any
  );
  
  const openScoutingModal = (teamId: number) => {
    setSelectedTeamId(teamId);
    setIsScoutingModalOpen(true);
  };
  
  const closeScoutingModal = () => {
    setSelectedTeamId(null);
    setIsScoutingModalOpen(false);
  };
  
  // Debug logging for current state
  console.log('🏆 useLeagueStandings - Current state:', { 
    teamDivision: team?.division,
    divisionStandingsLength: divisionStandings.length,
    standingsLoading,
    standingsError,
    rawData: divisionStandings
  });

  return {
    divisionStandings,
    standingsLoading,
    standingsError,
    globalRankings,
    rankingsLoading,
    selectedTeamId,
    isScoutingModalOpen,
    scoutingData,
    scoutingLoading,
    openScoutingModal,
    closeScoutingModal
  };
};