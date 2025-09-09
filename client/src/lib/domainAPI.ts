// Domain API client for new domain-driven architecture
import { apiRequest } from './queryClient';

// Re-export apiRequest for direct usage
export { apiRequest };

// Tournament domain API
export const tournamentAPI = {
  // Register for tournament
  register: async (teamId: number, data: { division: number; paymentType?: string }) => {
    return apiRequest(`/api/v2/tournaments/register`, 'POST', { ...data, teamId });
  },

  // Get tournament history
  getHistory: async (teamId: number) => {
    return apiRequest(`/api/v2/tournaments/history/${teamId}`, 'GET');
  },

  // Get active tournaments
  getActive: async (teamId: number) => {
    return apiRequest(`/api/v2/tournaments/active/${teamId}`, 'GET');
  },

  // Get tournament status
  getStatus: async (tournamentId: number) => {
    return apiRequest(`/api/v2/tournaments/status/${tournamentId}`, 'GET');
  },

  // Force start tournament (admin only)
  forceStart: async (tournamentId: number) => {
    return apiRequest(`/api/v2/tournaments/force-start/${tournamentId}`, 'POST');
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
    return apiRequest(`/api/v2/matches/create`, 'POST', data);
  },

  // Get match by ID
  getById: async (matchId: number) => {
    return apiRequest(`/api/v2/matches/${matchId}`, 'GET');
  },

  // Get live matches
  getLive: async () => {
    return apiRequest(`/api/v2/matches/live`, 'GET');
  },

  // Start match
  start: async (matchId: number) => {
    return apiRequest(`/api/v2/matches/${matchId}/start`, 'POST');
  },

  // Update match state
  updateState: async (matchId: number, update: {
    gameTime?: number;
    homeScore?: number;
    awayScore?: number;
    status?: string;
  }) => {
    return apiRequest(`/api/v2/matches/${matchId}/state`, 'PUT', update);
  }
};

// Economy domain API
export const economyAPI = {
  // Get daily store items
  getDailyStore: async () => {
    return apiRequest(`/api/v2/economy/store/daily`, 'GET');
  },

  // Purchase item
  purchaseItem: async (teamId: number, data: {
    itemId: string;
    quantity: number;
    paymentMethod: 'credits' | 'gems';
  }) => {
    return apiRequest(`/api/v2/economy/store/purchase`, 'POST', { ...data, teamId });
  },

  // Get marketplace listings
  getMarketplace: async (page: number = 1, limit: number = 20) => {
    return apiRequest(`/api/v2/economy/marketplace?page=${page}&limit=${limit}`, 'GET');
  },

  // Place bid
  placeBid: async (teamId: number, data: {
    listingId: number;
    amount: number;
  }) => {
    return apiRequest(`/api/v2/economy/marketplace/bid`, 'POST', { ...data, teamId });
  },

  // Get financial summary
  getFinances: async (teamId: number) => {
    return apiRequest(`/api/v2/economy/finances/${teamId}`, 'GET');
  },

  // Watch ad
  watchAd: async (teamId: number) => {
    return apiRequest(`/api/v2/economy/ads/watch`, 'POST', { teamId });
  }
};

// Auth domain API
export const authAPI = {
  // Get user profile (protected)
  getProfile: async () => {
    return apiRequest(`/api/v2/auth/user`, 'GET');
  },

  // Update user profile (protected)
  updateProfile: async (data: {
    username?: string;
    avatar?: string;
  }) => {
    return apiRequest(`/api/v2/auth/user`, 'PUT', data);
  },

  // Health check (public)
  healthCheck: async () => {
    return apiRequest(`/api/v2/auth/health`, 'GET');
  },

  // Demo public endpoint
  demoPublic: async () => {
    return apiRequest(`/api/v2/auth/demo/public`, 'GET');
  },

  // Demo protected endpoint
  demoProtected: async () => {
    return apiRequest(`/api/v2/auth/demo/protected`, 'GET');
  }
};

// Helper function to check domain API health
export const checkDomainHealth = async () => {
  try {
    const response = await apiRequest(`/api/v2/health`, 'GET');
    return response.success;
  } catch (error) {
    console.error('Domain health check failed:', error);
    return false;
  }
};