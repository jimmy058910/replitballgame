// API configuration for hybrid architecture - USE RELATIVE URLS FOR FIREBASE PROXY
const API_BASE_URL = '';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  // WebSocket through same domain for Firebase proxy
  WEBSOCKET_URL: (typeof window !== 'undefined' ? 
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws'
    : 'ws://localhost:5000/ws'
  )
};

console.log('🔗 API Configuration:', {
  baseUrl: API_CONFIG.BASE_URL,
  websocketUrl: API_CONFIG.WEBSOCKET_URL,
  environment: import.meta.env.PROD ? 'production' : 'development',
  viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  prodMode: import.meta.env.PROD
});

// Enhanced fetch wrapper with proper error handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`✅ API Response: ${endpoint}`, data);
      return data;
    }
    
    return response;
  } catch (error) {
    console.error(`❌ API Request Failed: ${endpoint}`, error);
    throw error;
  }
};

export default apiRequest;