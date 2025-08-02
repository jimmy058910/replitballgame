import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Hybrid architecture API configuration
// Production: Direct Cloud Run URL, Development: Relative URLs
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://realm-rivalry-backend-o6fd46yesq-ul.a.run.app'
  : '';

console.log('🔗 QueryClient API Configuration:', {
  baseUrl: API_BASE_URL,
  environment: import.meta.env.PROD ? 'production' : 'development',
  viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  prodMode: import.meta.env.PROD
});

export async function apiRequest<T>(
  endpoint: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    
    const res = await fetch(url, {
      credentials: "include",
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
