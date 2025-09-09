/**
 * Optimized Query Hook
 * Enhanced version of TanStack Query with intelligent caching and invalidation
 */
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  endpoint: string;
  params?: Record<string, any>;
  staleTime?: number;
  cacheTime?: number;
  tags?: string[];
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  retry?: boolean | number;
  retryDelay?: number;
  background?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useOptimizedQuery<T = any>({
  endpoint,
  params,
  staleTime = 5 * 60 * 1000, // 5 minutes default
  cacheTime = 10 * 60 * 1000, // 10 minutes default
  tags = [],
  enabled = true,
  refetchOnWindowFocus = false,
  refetchOnMount = true,
  refetchOnReconnect = true,
  retry = 3,
  retryDelay = 1000,
  background = false,
  onSuccess,
  onError,
  ...options
}: OptimizedQueryOptions<T>) {
  const queryClient = useQueryClient();
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate query key with params
  const queryKey = params
    ? [endpoint, params]
    : [endpoint];

  // Add tags to query key for cache invalidation
  const queryKeyWithTags = tags.length > 0 
    ? [...queryKey, ...tags]
    : queryKey;

  const query = useQuery({
    queryKey: queryKeyWithTags,
    queryFn: async () => {
      const url = params 
        ? `${endpoint}?${new URLSearchParams(params).toString()}`
        : endpoint;
      
      const response = await apiRequest('GET', url);
      return response.json();
    },
    staleTime,
    cacheTime,
    enabled,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    retryDelay: (attemptIndex: number) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
    onSuccess,
    onError,
    ...options,
  });

  // Background refresh for real-time data
  useEffect(() => {
    if (background && !query.isLoading && query.data) {
      backgroundTimerRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: queryKeyWithTags });
      }, staleTime);
    }

    return () => {
      if (backgroundTimerRef.current) {
        clearInterval(backgroundTimerRef.current);
      }
    };
  }, [background, query.isLoading, query.data, queryClient, queryKeyWithTags, staleTime]);

  // Invalidate cache by tags
  const invalidateByTags = (tagsToInvalidate: string[]) => {
    tagsToInvalidate.forEach(tag => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(tag)
      });
    });
  };

  // Prefetch related data
  const prefetch = async (relatedEndpoint: string, relatedParams?: Record<string, any>) => {
    const prefetchKey = relatedParams
      ? [relatedEndpoint, relatedParams]
      : [relatedEndpoint];

    await queryClient.prefetchQuery({
      queryKey: prefetchKey,
      queryFn: async () => {
        const url = relatedParams
          ? `${relatedEndpoint}?${new URLSearchParams(relatedParams).toString()}`
          : relatedEndpoint;
        
        const response = await apiRequest('GET', url);
        return response.json();
      },
      staleTime,
    });
  };

  return {
    ...query,
    invalidateByTags,
    prefetch,
    queryKey: queryKeyWithTags,
  };
}

// Hook for real-time data with aggressive caching
export function useRealTimeQuery<T = any>(
  endpoint: string,
  options?: Omit<OptimizedQueryOptions<T>, 'staleTime' | 'cacheTime' | 'background'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    background: true,
    refetchOnWindowFocus: true,
    ...options,
  });
}

// Hook for static data with long-term caching
export function useStaticQuery<T = any>(
  endpoint: string,
  options?: Omit<OptimizedQueryOptions<T>, 'staleTime' | 'cacheTime'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
}

// Hook for user-specific data
export function useUserQuery<T = any>(
  endpoint: string,
  options?: Omit<OptimizedQueryOptions<T>, 'tags'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    tags: ['user'],
    ...options,
  });
}

// Hook for team-specific data
export function useTeamQuery<T = any>(
  endpoint: string,
  teamId?: number,
  options?: Omit<OptimizedQueryOptions<T>, 'tags' | 'params'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    params: teamId ? { teamId } : undefined,
    tags: ['team', teamId ? `team-${teamId}` : ''].filter(Boolean),
    ...options,
  });
}

// Hook for match-specific data
export function useMatchQuery<T = any>(
  endpoint: string,
  matchId?: number,
  options?: Omit<OptimizedQueryOptions<T>, 'tags' | 'params'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    params: matchId ? { matchId } : undefined,
    tags: ['match', matchId ? `match-${matchId}` : ''].filter(Boolean),
    ...options,
  });
}

// Hook for players-specific data
export function usePlayersQuery<T = any>(
  endpoint: string,
  teamId?: number,
  options?: Omit<OptimizedQueryOptions<T>, 'tags' | 'params'>
) {
  return useOptimizedQuery<T>({
    endpoint,
    params: teamId ? { teamId } : undefined,
    tags: ['players', teamId ? `players-${teamId}` : ''].filter(Boolean),
    ...options,
  });
}

// Hook for cache invalidation utilities
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };
  
  const invalidateByKey = (queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
  };
  
  const invalidateByTags = (tags: string[]) => {
    tags.forEach(tag => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(tag)
      });
    });
  };
  
  const invalidateTeamData = (teamId?: number) => {
    const tags = ['team', teamId ? `team-${teamId}` : ''].filter(Boolean);
    invalidateByTags(tags);
  };
  
  const invalidatePlayerData = (teamId?: number) => {
    const tags = ['players', teamId ? `players-${teamId}` : ''].filter(Boolean);
    invalidateByTags(tags);
  };
  
  return {
    invalidateAll,
    invalidateByKey,
    invalidateByTags,
    invalidateTeamData,
    invalidatePlayerData,
  };
}

export default useOptimizedQuery;