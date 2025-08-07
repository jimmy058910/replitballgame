import { useEffect } from 'react';
import { useTournamentStore } from '@/stores/tournamentStore';
import { useMatchStore } from '@/stores/matchStore';
import { useEconomyStore } from '@/stores/economyStore';

// Hook to set up real-time updates across all stores
export function useRealTimeUpdates() {
  const tournamentStore = useTournamentStore();
  const matchStore = useMatchStore();
  const economyStore = useEconomyStore();

  useEffect(() => {
    // Initialize WebSocket connections
    const initializeConnections = async () => {
      try {
        // Initialize tournament WebSocket
        await tournamentStore.connectWebSocket();
        
        // Initialize match WebSocket
        await matchStore.connectWebSocket();
        
        // Initialize economy WebSocket  
        await economyStore.connectWebSocket();
        
        console.log('Real-time connections initialized');
      } catch (error) {
        console.error('Failed to initialize real-time connections:', error);
      }
    };

    initializeConnections();

    // Cleanup connections on unmount
    return () => {
      tournamentStore.disconnectWebSocket();
      matchStore.disconnectWebSocket();
      economyStore.disconnectWebSocket();
    };
  }, []);

  // Set up periodic data refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh data periodically if not connected
      if (!tournamentStore.isConnected) {
        tournamentStore.refreshData();
      }
      if (!matchStore.isConnected) {
        matchStore.refreshData();
      }
      if (!economyStore.isConnected) {
        economyStore.refreshData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [tournamentStore.isConnected, matchStore.isConnected, economyStore.isConnected]);

  return {
    tournamentConnected: tournamentStore.isConnected,
    matchConnected: matchStore.isConnected,
    economyConnected: economyStore.isConnected,
    allConnected: tournamentStore.isConnected && matchStore.isConnected && economyStore.isConnected
  };
}