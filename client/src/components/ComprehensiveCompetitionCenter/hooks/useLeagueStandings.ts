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
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isScoutingModalOpen, setIsScoutingModalOpen] = useState(false);
  
  // Division standings
  const { data: divisionStandings = [], isLoading: standingsLoading, error: standingsError } = useQuery({
    ...leagueQueryOptions.standings(team?.division ?? 8),
    enabled: !!team?.division,
    select: (data: any[]) => {
      if (!Array.isArray(data)) return [];
      
      return data
        .filter(team => team && typeof team.wins === 'number')
        .map((team: any, index: number) => ({
          ...team,
          position: index + 1,
          gamesPlayed: (team.wins || 0) + (team.losses || 0) + (team.draws || 0),
          totalScores: team.goalsFor || team.totalScores || 0,
          scoresAgainst: team.goalsAgainst || team.scoresAgainst || 0,
          scoreDifference: (team.goalsFor || team.totalScores || 0) - (team.goalsAgainst || team.scoresAgainst || 0)
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
  const { data: globalRankings = [], isLoading: rankingsLoading } = useQuery(
    worldQueryOptions.globalRankings()
  );
  
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