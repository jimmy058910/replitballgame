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
    })
  }))
);