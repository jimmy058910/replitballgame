import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuth } from 'firebase/auth';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Hybrid architecture API configuration
// Production: Direct Cloud Run URL, Development: Relative URLs to local server
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://realm-rivalry-unified-o6fd46yesq-uc.a.run.app'
  : '';

console.log('🔗 QueryClient API Configuration:', {
  baseUrl: API_BASE_URL,
  environment: import.meta.env.PROD ? 'production' : 'development',
  viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  prodMode: import.meta.env.PROD,
  note: import.meta.env.PROD ? 'Using Cloud Run backend' : 'Using local Replit server'
});

export async function apiRequest<T>(
  endpoint: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get Firebase authentication headers
  let headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      // Get fresh Firebase ID token
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
      console.log('🔐 Added Firebase token to API request');
    }
  } catch (error) {
    console.warn('⚠️ Failed to get Firebase token:', error);
    // Continue without token for unauthenticated endpoints
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  const jsonData = await res.json();
  return jsonData as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get Firebase authentication headers for queries
    let headers: Record<string, string> = {};
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const idToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
        console.log('🔐 Added Firebase token to query');
      }
    } catch (error) {
      console.warn('⚠️ Failed to get Firebase token for query:', error);
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // For 404 errors on team endpoints, return null instead of throwing
    if (res.status === 404 && (queryKey[0] as string).includes('/teams/my')) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry 404, 401, or 429 errors
        if (error.message.includes('404') || error.message.includes('401') || error.message.includes('429')) {
          return false;
        }
        // Retry other errors max 2 times
        return failureCount < 2;
      },
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});
