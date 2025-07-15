import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Tournament store for real-time updates
interface TournamentState {
  // Current tournament data
  activeTournaments: any[];
  tournamentHistory: any[];
  
  // Real-time status
  selectedTournament: any | null;
  isLoading: boolean;
  error: string | null;
  
  // WebSocket connection status
  isConnected: boolean;
  lastUpdate: Date | null;
  
  // Actions
  setActiveTournaments: (tournaments: any[]) => void;
  setTournamentHistory: (history: any[]) => void;
  selectTournament: (tournament: any) => void;
  updateTournamentStatus: (tournamentId: number, status: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  clearError: () => void;
  reset: () => void;
  
  // WebSocket methods
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  refreshData: () => Promise<void>;
}

export const useTournamentStore = create<TournamentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeTournaments: [],
    tournamentHistory: [],
    selectedTournament: null,
    isLoading: false,
    error: null,
    isConnected: false,
    lastUpdate: null,
    
    // Actions
    setActiveTournaments: (tournaments) => set({ 
      activeTournaments: tournaments,
      lastUpdate: new Date()
    }),
    
    setTournamentHistory: (history) => set({ 
      tournamentHistory: history,
      lastUpdate: new Date()
    }),
    
    selectTournament: (tournament) => set({ 
      selectedTournament: tournament 
    }),
    
    updateTournamentStatus: (tournamentId, status) => set((state) => ({
      activeTournaments: state.activeTournaments.map(t => 
        t.id === tournamentId ? { ...t, ...status } : t
      ),
      selectedTournament: state.selectedTournament?.id === tournamentId 
        ? { ...state.selectedTournament, ...status } 
        : state.selectedTournament,
      lastUpdate: new Date()
    })),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error, isLoading: false }),
    
    setConnectionStatus: (connected) => set({ isConnected: connected }),
    
    clearError: () => set({ error: null }),
    
    reset: () => set({
      activeTournaments: [],
      tournamentHistory: [],
      selectedTournament: null,
      isLoading: false,
      error: null,
      isConnected: false,
      lastUpdate: null
    }),
    
    // WebSocket connection methods
    connectWebSocket: async () => {
      try {
        set({ isLoading: true, error: null });
        // Simulate WebSocket connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ isConnected: true, isLoading: false });
        console.log('Tournament WebSocket connected');
      } catch (error) {
        set({ error: 'Failed to connect to tournament WebSocket', isLoading: false });
      }
    },
    
    disconnectWebSocket: () => {
      set({ isConnected: false });
      console.log('Tournament WebSocket disconnected');
    },
    
    refreshData: async () => {
      try {
        set({ isLoading: true });
        // Simulate data refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ 
          activeTournaments: [
            { id: 1, name: 'Daily Cup', status: 'REGISTRATION_OPEN', participants: 6 },
            { id: 2, name: 'Mid-Season Classic', status: 'IN_PROGRESS', participants: 8 }
          ],
          lastUpdate: new Date(),
          isLoading: false 
        });
      } catch (error) {
        set({ error: 'Failed to refresh tournament data', isLoading: false });
      }
    }
  }))
);