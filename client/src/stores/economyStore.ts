import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Economy store for financial data
interface EconomyState {
  // Financial data
  teamFinances: {
    credits: number;
    gems: number;
    totalValue: number;
    weeklyIncome: number;
    weeklyExpenses: number;
  } | null;
  
  // Store data
  dailyStoreItems: any[];
  marketplaceListings: any[];
  
  // State
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isConnected: boolean;
  
  // Actions
  setTeamFinances: (finances: any) => void;
  setDailyStoreItems: (items: any[]) => void;
  setMarketplaceListings: (listings: any[]) => void;
  updateCredits: (amount: number) => void;
  updateGems: (amount: number) => void;
  addPurchase: (item: any, cost: number, currency: 'credits' | 'gems') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  reset: () => void;
  
  // WebSocket methods
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  refreshData: () => Promise<void>;
}

export const useEconomyStore = create<EconomyState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    teamFinances: null,
    dailyStoreItems: [],
    marketplaceListings: [],
    isLoading: false,
    error: null,
    lastUpdate: null,
    isConnected: false,
    
    // Actions
    setTeamFinances: (finances) => set({ 
      teamFinances: finances,
      lastUpdate: new Date()
    }),
    
    setDailyStoreItems: (items) => set({ 
      dailyStoreItems: items,
      lastUpdate: new Date()
    }),
    
    setMarketplaceListings: (listings) => set({ 
      marketplaceListings: listings,
      lastUpdate: new Date()
    }),
    
    updateCredits: (amount) => set((state) => ({
      teamFinances: state.teamFinances ? {
        ...state.teamFinances,
        credits: amount
      } : null,
      lastUpdate: new Date()
    })),
    
    updateGems: (amount) => set((state) => ({
      teamFinances: state.teamFinances ? {
        ...state.teamFinances,
        gems: amount
      } : null,
      lastUpdate: new Date()
    })),
    
    addPurchase: (item, cost, currency) => set((state) => {
      if (!state.teamFinances) return state;
      
      const newFinances = { ...state.teamFinances };
      if (currency === 'credits') {
        newFinances.credits = Math.max(0, newFinances.credits - cost);
      } else {
        newFinances.gems = Math.max(0, newFinances.gems - cost);
      }
      
      return {
        teamFinances: newFinances,
        lastUpdate: new Date()
      };
    }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error, isLoading: false }),
    
    setConnectionStatus: (connected) => set({ isConnected: connected }),
    
    reset: () => set({
      teamFinances: null,
      dailyStoreItems: [],
      marketplaceListings: [],
      isLoading: false,
      error: null,
      lastUpdate: null,
      isConnected: false
    }),
    
    // WebSocket connection methods
    connectWebSocket: async () => {
      try {
        set({ isLoading: true, error: null });
        // Simulate WebSocket connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ isConnected: true, isLoading: false });
        console.log('Economy WebSocket connected');
      } catch (error) {
        set({ error: 'Failed to connect to economy WebSocket', isLoading: false });
      }
    },
    
    disconnectWebSocket: () => {
      set({ isConnected: false });
      console.log('Economy WebSocket disconnected');
    },
    
    refreshData: async () => {
      try {
        set({ isLoading: true });
        // Simulate data refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ 
          teamFinances: {
            credits: 125000,
            gems: 45,
            totalValue: 2400000,
            weeklyIncome: 15000,
            weeklyExpenses: 8500
          },
          dailyStoreItems: [
            { id: 1, name: 'Training Boost', price: 5000, currency: 'credits' },
            { id: 2, name: 'Recovery Potion', price: 15, currency: 'gems' }
          ],
          marketplaceListings: [
            { id: 1, playerName: 'John Smith', currentBid: 25000, timeLeft: '2h 15m' },
            { id: 2, playerName: 'Mike Johnson', currentBid: 18000, timeLeft: '1h 45m' }
          ],
          lastUpdate: new Date(),
          isLoading: false 
        });
      } catch (error) {
        set({ error: 'Failed to refresh economy data', isLoading: false });
      }
    }
  }))
);