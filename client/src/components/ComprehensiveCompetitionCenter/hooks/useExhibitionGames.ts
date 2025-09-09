/**
 * Exhibition games hook with instant matches and opponent selection
 * Handles exhibition history, token management, and match creation
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../hooks/use-toast';
import { exhibitionQueryOptions } from '@/lib/api/queryOptions';
import { apiRequest } from '@/lib/queryClient';

export interface UseExhibitionGamesResult {
  // Exhibition data
  exhibitionStats: any;
  exhibitionHistory: any[];
  availableOpponents: any[];
  
  // UI state
  showOpponentSelect: boolean;
  setShowOpponentSelect: (show: boolean) => void;
  
  // Actions
  startInstantMatch: any;
  challengeOpponent: any;
  buyExhibitionToken: any;
}

/**
 * Exhibition games system hook
 */
export const useExhibitionGames = (team: any): UseExhibitionGamesResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI state
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);
  
  // Exhibition data queries - use proper boolean enabled pattern
  const { data: exhibitionStats } = useQuery(
    exhibitionQueryOptions.stats(!!team?.id)
  );
  
  const { data: exhibitionHistory = [] } = useQuery(
    exhibitionQueryOptions.recent(!!team?.id)
  );
  
  const { data: availableOpponents = [] } = useQuery(
    exhibitionQueryOptions.availableOpponents(!!team?.id)
  );
  
  // Mutations
  const startInstantMatch = useMutation({
    mutationFn: async () => {
      if (!team?.id) throw new Error('No team found');
      const response = await apiRequest(`/api/exhibitions/instant?teamId=${team.id}`, 'POST');
      return response;
    },
    onSuccess: (data) => {
      if (data?.gameId) {
        window.open(`/live-match/${data.gameId}`, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['exhibitions'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      toast({
        title: "Match Creation Failed",
        description: error?.message || "Unable to create instant match",
        variant: "destructive",
      });
    }
  });
  
  const challengeOpponent = useMutation({
    mutationFn: async (opponentId: string) => {
      if (!team?.id) throw new Error('No team found');
      const response = await apiRequest(`/api/exhibitions/challenge?teamId=${team.id}&opponentId=${parseInt(opponentId)}`, 'POST');
      return response;
    },
    onSuccess: (data) => {
      if (data?.gameId) {
        window.open(`/live-match/${data.gameId}`, '_blank');
      }
      setShowOpponentSelect(false);
      queryClient.invalidateQueries({ queryKey: ['exhibitions'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      toast({
        title: "Challenge Failed",
        description: error?.message || "Unable to challenge opponent",
        variant: "destructive",
      });
    }
  });
  
  const buyExhibitionToken = useMutation({
    mutationFn: async () => {
      if (!team?.id) throw new Error('No team found');
      const response = await apiRequest(`/api/exhibitions/buy-token?teamId=${team.id}`, 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Token Purchased!",
        description: "Successfully purchased exhibition token for 1000₡",
      });
      queryClient.invalidateQueries({ queryKey: ['exhibitions'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error?.message || "Unable to purchase exhibition token",
        variant: "destructive",
      });
    }
  });
  
  return {
    exhibitionStats,
    exhibitionHistory,
    availableOpponents,
    showOpponentSelect,
    setShowOpponentSelect,
    startInstantMatch,
    challengeOpponent,
    buyExhibitionToken
  };
};