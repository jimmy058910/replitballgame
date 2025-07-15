// Domain API client for new domain-driven architecture
import { apiRequest } from './queryClient';

// Tournament domain API
export const tournamentAPI = {
  // Register for tournament
  register: async (teamId: number, data: { division: number; paymentType?: string }) => {
    return apiRequest('POST', `/api/v2/tournaments/register`, { ...data, teamId });
  },

  // Get tournament history
  getHistory: async (teamId: number) => {
    return apiRequest('GET', `/api/v2/tournaments/history/${teamId}`);
  },

  // Get active tournaments
  getActive: async (teamId: number) => {
    return apiRequest('GET', `/api/v2/tournaments/active/${teamId}`);
  },

  // Get tournament status
  getStatus: async (tournamentId: number) => {
    return apiRequest('GET', `/api/v2/tournaments/status/${tournamentId}`);
  },

  // Force start tournament (admin only)
  forceStart: async (tournamentId: number) => {
    return apiRequest('POST', `/api/v2/tournaments/force-start/${tournamentId}`);
  }
};

// Match domain API
export const matchAPI = {
  // Create match
  create: async (data: {
    homeTeamId: number;
    awayTeamId: number;
    matchType: string;
    scheduledTime?: Date;
    tournamentId?: number;
  }) => {
    return apiRequest('POST', `/api/v2/matches/create`, data);
  },

  // Get match by ID
  getById: async (matchId: number) => {
    return apiRequest('GET', `/api/v2/matches/${matchId}`);
  },

  // Get live matches
  getLive: async () => {
    return apiRequest('GET', `/api/v2/matches/live`);
  },

  // Start match
  start: async (matchId: number) => {
    return apiRequest('POST', `/api/v2/matches/${matchId}/start`);
  },

  // Update match state
  updateState: async (matchId: number, update: {
    gameTime?: number;
    homeScore?: number;
    awayScore?: number;
    status?: string;
  }) => {
    return apiRequest('PUT', `/api/v2/matches/${matchId}/state`, update);
  }
};

// Economy domain API
export const economyAPI = {
  // Get daily store items
  getDailyStore: async () => {
    return apiRequest('GET', `/api/v2/economy/store/daily`);
  },

  // Purchase item
  purchaseItem: async (teamId: number, data: {
    itemId: string;
    quantity: number;
    paymentMethod: 'credits' | 'gems';
  }) => {
    return apiRequest('POST', `/api/v2/economy/store/purchase`, { ...data, teamId });
  },

  // Get marketplace listings
  getMarketplace: async (page: number = 1, limit: number = 20) => {
    return apiRequest('GET', `/api/v2/economy/marketplace?page=${page}&limit=${limit}`);
  },

  // Place bid
  placeBid: async (teamId: number, data: {
    listingId: number;
    amount: number;
  }) => {
    return apiRequest('POST', `/api/v2/economy/marketplace/bid`, { ...data, teamId });
  },

  // Get financial summary
  getFinances: async (teamId: number) => {
    return apiRequest('GET', `/api/v2/economy/finances/${teamId}`);
  },

  // Watch ad
  watchAd: async (teamId: number) => {
    return apiRequest('POST', `/api/v2/economy/ads/watch`, { teamId });
  }
};

// Auth domain API
export const authAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('GET', `/api/v2/auth/user`);
  },

  // Update user profile
  updateProfile: async (data: {
    username?: string;
    avatar?: string;
  }) => {
    return apiRequest('PUT', `/api/v2/auth/user`, data);
  },

  // Health check
  healthCheck: async () => {
    return apiRequest('GET', `/api/v2/auth/health`);
  }
};

// Helper function to check domain API health
export const checkDomainHealth = async () => {
  try {
    const response = await apiRequest('GET', `/api/v2/health`);
    return response.success;
  } catch (error) {
    console.error('Domain health check failed:', error);
    return false;
  }
};