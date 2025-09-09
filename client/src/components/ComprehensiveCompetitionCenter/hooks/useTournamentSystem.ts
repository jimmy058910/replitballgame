/**
 * Tournament system hook with registration, history, and bracket management
 * Handles daily tournaments, Mid-Season Cup, and tournament modals
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../providers/AuthProvider';
import { useToast } from '../../../hooks/use-toast';
import { tournamentQueryOptions } from '@/lib/api/queryOptions';
import { apiRequest } from '@/lib/queryClient';

export interface UseTournamentSystemResult {
  // Tournament data
  tournaments: any[];
  availableTournaments: any[];
  myTournaments: any[];
  tournamentHistory: any[];
  currentTournamentStatus: any;
  tournamentBracket: any;
  
  // Loading states
  isHistoryLoading: boolean;
  isCurrentTournamentLoading: boolean;
  
  // Modal states
  isBracketModalOpen: boolean;
  isDetailsModalOpen: boolean;
  
  // Time management
  currentTime: Date;
  
  // Actions
  openBracketModal: () => void;
  closeBracketModal: () => void;
  openDetailsModal: () => void;
  closeDetailsModal: () => void;
  registerDailyTournament: any;
  registerMidSeasonCup: any;
  
  // Utility functions
  calculateTimeRemaining: (registrationEndTime: string | null) => number;
  formatTournamentCountdown: (registrationEndTime: string | null) => string;
}

/**
 * Comprehensive tournament system hook
 */
export const useTournamentSystem = (team: any): UseTournamentSystemResult => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal states
  const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Time management for countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Tournament data queries
  const { data: tournaments = [] } = useQuery(
    tournamentQueryOptions.tournamentsByAvailability(team?.division ?? 8, isAuthenticated)
  );
  
  const { data: availableTournaments = [] } = useQuery(
    tournamentQueryOptions.availableTournaments(team?.id ? String(team.id) : undefined)
  );
  
  const { data: myTournaments = [] } = useQuery(
    tournamentQueryOptions.myTournaments(team?.id ? String(team.id) : undefined)
  );
  
  const { data: tournamentHistory = [], isLoading: isHistoryLoading } = useQuery(
    tournamentQueryOptions.history(team?.id ? String(team.id) : undefined)
  );
  
  const { data: currentTournamentStatus, isLoading: isCurrentTournamentLoading } = useQuery(
    tournamentQueryOptions.dailyStatus(team?.division ?? 8)
  );
  
  const { data: tournamentBracket } = useQuery(
    tournamentQueryOptions.bracket(
      currentTournamentStatus?.hasActiveTournament ? 
      (currentTournamentStatus?.tournamentId ?? 0) : undefined
    )
  );
  
  // Mutations
  const registerDailyTournament = useMutation({
    mutationFn: async () => {
      if (!team?.id) throw new Error('No team found');
      const response = await apiRequest(`/api/tournaments/daily/register?teamId=${team.id}`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for daily tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error?.message || "Unable to register for tournament",
        variant: "destructive",
      });
    }
  });
  
  const registerMidSeasonCup = useMutation({
    mutationFn: async (paymentMethod: 'credits' | 'gems') => {
      if (!team?.id) throw new Error('No team found');
      const response = await apiRequest(`/api/tournaments/midseason/register?teamId=${team.id}&paymentMethod=${paymentMethod}`, 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Mid-Season Cup!",
      });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error?.message || "Unable to register for Mid-Season Cup",
        variant: "destructive",
      });
    }
  });
  
  // Utility functions
  const calculateTimeRemaining = (registrationEndTime: string | null): number => {
    if (!registrationEndTime) return 0;
    const endTime = new Date(registrationEndTime).getTime();
    const now = currentTime.getTime();
    return Math.max(0, endTime - now);
  };
  
  const formatTournamentCountdown = (registrationEndTime: string | null) => {
    const timeRemaining = calculateTimeRemaining(registrationEndTime);
    
    if (timeRemaining <= 0) {
      return "Starting soon...";
    }
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };
  
  // Modal actions
  const openBracketModal = () => setIsBracketModalOpen(true);
  const closeBracketModal = () => setIsBracketModalOpen(false);
  const openDetailsModal = () => setIsDetailsModalOpen(true);
  const closeDetailsModal = () => setIsDetailsModalOpen(false);
  
  return {
    tournaments,
    availableTournaments,
    myTournaments,
    tournamentHistory,
    currentTournamentStatus,
    tournamentBracket,
    isHistoryLoading,
    isCurrentTournamentLoading,
    isBracketModalOpen,
    isDetailsModalOpen,
    currentTime,
    openBracketModal,
    closeBracketModal,
    openDetailsModal,
    closeDetailsModal,
    registerDailyTournament,
    registerMidSeasonCup,
    calculateTimeRemaining,
    formatTournamentCountdown
  };
};