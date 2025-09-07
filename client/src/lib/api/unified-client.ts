/**
 * Unified API Client
 * Centralized API integration with consistent error handling and caching
 */

import { QueryClient, useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { isUnauthorizedError } from '@/lib/authUtils';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Error Types
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data?: any): ApiError {
    const message = data?.error || data?.message || response.statusText || 'An error occurred';
    const code = data?.code || response.status.toString();
    return new ApiError(response.status, code, message, data);
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isValidation(): boolean {
    return this.status === 400;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

// Request Configuration
export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
  retry?: boolean;
}

// Core API Client Class
export class UnifiedApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  private getAuthToken: () => Promise<string | null>;

  constructor(
    baseUrl: string = '/api',
    getAuthToken: () => Promise<string | null> = async () => null
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.getAuthToken = getAuthToken;
  }

  // Build URL with query parameters
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  // Core request method
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      params,
      timeout = 30000,
      retry = true,
      headers = {},
      ...fetchConfig
    } = config;

    // Get auth token
    const token = await this.getAuthToken();
    
    // Build headers
    const requestHeaders: HeadersInit = {
      ...this.defaultHeaders,
      ...headers,
    };
    
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Build URL
    const url = this.buildUrl(endpoint, params);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      // Handle errors
      if (!response.ok) {
        throw ApiError.fromResponse(response, data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(408, 'TIMEOUT', 'Request timed out');
        }
        throw new ApiError(0, 'NETWORK', error.message);
      }
      
      throw new ApiError(0, 'UNKNOWN', 'An unexpected error occurred');
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, params?: Record<string, any>, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
      params,
    });
  }

  async post<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }
}

// Create default client instance
let defaultClient: UnifiedApiClient | null = null;

export function getApiClient(): UnifiedApiClient {
  if (!defaultClient) {
    defaultClient = new UnifiedApiClient();
  }
  return defaultClient;
}

// React Hooks for API Integration
export interface UseApiQueryOptions<TData = any> extends Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'> {
  params?: Record<string, any>;
  config?: RequestConfig;
}

export interface UseApiMutationOptions<TData = any, TVariables = any> 
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'> {
  config?: RequestConfig;
}

// Query Hook
export function useApiQuery<TData = any>(
  endpoint: string | null,
  options?: UseApiQueryOptions<TData>
) {
  const { isAuthenticated, getToken } = useAuth();
  const client = new UnifiedApiClient('/api', getToken);

  return useQuery<TData, ApiError>({
    queryKey: endpoint ? [endpoint, options?.params] : ['disabled'],
    queryFn: async () => {
      if (!endpoint) throw new Error('Endpoint is required');
      return client.get<TData>(endpoint, options?.params, options?.config);
    },
    enabled: !!endpoint && isAuthenticated && (options?.enabled !== false),
    retry: (failureCount, error) => {
      if (error.isUnauthorized()) return false;
      if (error.isNotFound()) return false;
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes default
    ...options,
  });
}

// Mutation Hook
export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: UseApiMutationOptions<TData, TVariables>
) {
  const { getToken } = useAuth();
  const client = new UnifiedApiClient('/api', getToken);

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      switch (method) {
        case 'POST':
          return client.post<TData>(endpoint, variables, options?.config);
        case 'PUT':
          return client.put<TData>(endpoint, variables, options?.config);
        case 'PATCH':
          return client.patch<TData>(endpoint, variables, options?.config);
        case 'DELETE':
          return client.delete<TData>(endpoint, options?.config);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    ...options,
  });
}

// Paginated Query Hook
export function useApiPaginatedQuery<TItem = any>(
  endpoint: string,
  page: number = 1,
  pageSize: number = 20,
  options?: UseApiQueryOptions<PaginatedResponse<TItem>>
) {
  return useApiQuery<PaginatedResponse<TItem>>(
    endpoint,
    {
      ...options,
      params: {
        ...options?.params,
        page,
        pageSize,
      },
    }
  );
}

// Infinite Query Hook (for infinite scroll)
export { useInfiniteQuery as useApiInfiniteQuery } from '@tanstack/react-query';

// Export error handling utilities
export function handleApiError(error: unknown, fallbackMessage = 'An error occurred'): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

// Export cache management utilities
export function invalidateQueries(queryKey: string | string[]) {
  const queryClient = new QueryClient();
  return queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
}

export function prefetchQuery<TData = any>(
  endpoint: string,
  params?: Record<string, any>
) {
  const queryClient = new QueryClient();
  const client = getApiClient();
  
  return queryClient.prefetchQuery({
    queryKey: [endpoint, params],
    queryFn: () => client.get<TData>(endpoint, params),
  });
}