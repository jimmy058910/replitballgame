/**
 * API Response Types
 * 
 * Standardized type definitions for API responses
 * Following industry best practices for type safety
 * 
 * @module ApiTypes
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}