import { useEffect } from 'react';
import { useTournamentStore } from '@/stores/tournamentStore';
// matchStore import removed - using quick simulation only
import { useEconomyStore } from '@/stores/economyStore';

// Hook to set up real-time updates across all stores
export function useRealTimeUpdates() {
  const tournamentStore = useTournamentStore();
  // matchStore removed - using quick simulation only
  const economyStore = useEconomyStore();

  useEffect(() => {
    // Initialize WebSocket connections
    const initializeConnections = async () => {
      try {
        // Initialize tournament WebSocket
        await tournamentStore.connectWebSocket();
        
        // Initialize match WebSocket
        // matchStore.connectWebSocket() removed
        
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
      // matchStore.disconnectWebSocket() removed
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
      // matchStore connection check removed
      if (!economyStore.isConnected) {
        economyStore.refreshData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [tournamentStore.isConnected, economyStore.isConnected]);

  return {
    tournamentConnected: tournamentStore.isConnected,
    matchConnected: false, // matchStore removed
    economyConnected: economyStore.isConnected,
    allConnected: tournamentStore.isConnected && economyStore.isConnected
  };
}