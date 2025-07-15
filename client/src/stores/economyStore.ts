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
  
  // Actions
  setTeamFinances: (finances: any) => void;
  setDailyStoreItems: (items: any[]) => void;
  setMarketplaceListings: (listings: any[]) => void;
  updateCredits: (amount: number) => void;
  updateGems: (amount: number) => void;
  addPurchase: (item: any, cost: number, currency: 'credits' | 'gems') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
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
    
    reset: () => set({
      teamFinances: null,
      dailyStoreItems: [],
      marketplaceListings: [],
      isLoading: false,
      error: null,
      lastUpdate: null
    })
  }))
);