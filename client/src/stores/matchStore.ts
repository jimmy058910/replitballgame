import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Match store for real-time updates
interface MatchState {
  // Current match data
  liveMatches: any[];
  matchHistory: any[];
  
  // Real-time status
  selectedMatch: any | null;
  isLoading: boolean;
  error: string | null;
  
  // WebSocket connection
  isConnected: boolean;
  lastUpdate: Date | null;
  
  // Match simulation state
  simulationEvents: any[];
  currentGameTime: number;
  currentScore: { home: number; away: number };
  
  // Actions
  setLiveMatches: (matches: any[]) => void;
  setMatchHistory: (history: any[]) => void;
  selectMatch: (match: any) => void;
  updateMatchState: (matchId: number, update: any) => void;
  addSimulationEvent: (event: any) => void;
  updateScore: (home: number, away: number) => void;
  updateGameTime: (time: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  clearSimulation: () => void;
  reset: () => void;
  
  // WebSocket methods
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  refreshData: () => Promise<void>;
}

export const useMatchStore = create<MatchState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    liveMatches: [],
    matchHistory: [],
    selectedMatch: null,
    isLoading: false,
    error: null,
    isConnected: false,
    lastUpdate: null,
    simulationEvents: [],
    currentGameTime: 0,
    currentScore: { home: 0, away: 0 },
    
    // Actions
    setLiveMatches: (matches) => set({ 
      liveMatches: matches,
      lastUpdate: new Date()
    }),
    
    setMatchHistory: (history) => set({ 
      matchHistory: history,
      lastUpdate: new Date()
    }),
    
    selectMatch: (match) => set({ 
      selectedMatch: match,
      simulationEvents: [],
      currentGameTime: match?.gameTime || 0,
      currentScore: {
        home: match?.homeScore || 0,
        away: match?.awayScore || 0
      }
    }),
    
    updateMatchState: (matchId, update) => set((state) => ({
      liveMatches: state.liveMatches.map(m => 
        m.id === matchId ? { ...m, ...update } : m
      ),
      selectedMatch: state.selectedMatch?.id === matchId 
        ? { ...state.selectedMatch, ...update } 
        : state.selectedMatch,
      lastUpdate: new Date()
    })),
    
    addSimulationEvent: (event) => set((state) => ({
      simulationEvents: [...state.simulationEvents, event]
    })),
    
    updateScore: (home, away) => set({ 
      currentScore: { home, away },
      lastUpdate: new Date()
    }),
    
    updateGameTime: (time) => set({ 
      currentGameTime: time,
      lastUpdate: new Date()
    }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error, isLoading: false }),
    
    setConnectionStatus: (connected) => set({ isConnected: connected }),
    
    clearSimulation: () => set({
      simulationEvents: [],
      currentGameTime: 0,
      currentScore: { home: 0, away: 0 }
    }),
    
    reset: () => set({
      liveMatches: [],
      matchHistory: [],
      selectedMatch: null,
      isLoading: false,
      error: null,
      isConnected: false,
      lastUpdate: null,
      simulationEvents: [],
      currentGameTime: 0,
      currentScore: { home: 0, away: 0 }
    }),
    
    // WebSocket connection methods
    connectWebSocket: async () => {
      try {
        set({ isLoading: true, error: null });
        // Simulate WebSocket connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ isConnected: true, isLoading: false });
        console.log('Match WebSocket connected');
      } catch (error) {
        set({ error: 'Failed to connect to match WebSocket', isLoading: false });
      }
    },
    
    disconnectWebSocket: () => {
      set({ isConnected: false });
      console.log('Match WebSocket disconnected');
    },
    
    refreshData: async () => {
      try {
        set({ isLoading: true });
        // Simulate data refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ 
          liveMatches: [
            { id: 1, homeTeam: 'Lions', awayTeam: 'Tigers', status: 'LIVE', gameTime: 450 },
            { id: 2, homeTeam: 'Bears', awayTeam: 'Eagles', status: 'SCHEDULED', gameTime: 0 }
          ],
          lastUpdate: new Date(),
          isLoading: false 
        });
      } catch (error) {
        set({ error: 'Failed to refresh match data', isLoading: false });
      }
    }
  }))
);