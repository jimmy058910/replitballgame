/**
 * API Configuration for Environment-Specific Backend Routing
 * 
 * Development: Uses local Replit server with dev database
 * Production: Uses Cloud Run backend with prod database
 */

// Detect environment based on URL
function getEnvironment() {
  const hostname = window.location.hostname;
  
  if (hostname === 'realmrivalry.com' || hostname === 'www.realmrivalry.com') {
    return 'production';
  } else if (hostname.includes('replit.dev')) {
    return 'development';
  } else if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    return 'development';
  } else {
    // Default to development for unknown hosts
    return 'development';
  }
}

// Get the appropriate API base URL
export function getApiBaseUrl(): string {
  const environment = getEnvironment();
  
  if (environment === 'production') {
    // Production: Use Cloud Run backend
    return 'https://realm-rivalry-unified-o6fd46yesq-uc.a.run.app';
  } else {
    // Development: Use local Replit server
    return window.location.origin;
  }
}

// Get full API URL for a specific endpoint
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

// Environment info for debugging
export function getEnvironmentInfo() {
  return {
    hostname: window.location.hostname,
    environment: getEnvironment(),
    apiBaseUrl: getApiBaseUrl(),
    isDevelopment: getEnvironment() === 'development',
    isProduction: getEnvironment() === 'production'
  };
}

// Export for use in components
export const API_CONFIG = {
  getApiUrl,
  getApiBaseUrl,
  getEnvironmentInfo,
  environment: getEnvironment()
};