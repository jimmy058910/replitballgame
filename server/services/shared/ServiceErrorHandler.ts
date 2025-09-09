/**
 * Service Error Handler
 * 
 * Standardized error handling service for consistent error patterns across all services.
 * Provides structured logging, error classification, and proper error propagation.
 * 
 * CREATED for Phase 2B: Service Layer Agent implementation
 */

import logger from '../../utils/logger.js';

export interface ServiceErrorDetails {
  service: string;
  method: string;
  operation: string;
  context?: Record<string, any>;
  originalError?: any;
}

export class ServiceError extends Error {
  public readonly service: string;
  public readonly method: string;
  public readonly operation: string;
  public readonly context: Record<string, any>;
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(
    message: string, 
    details: ServiceErrorDetails,
    statusCode: number = 500,
    errorCode: string = 'SERVICE_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ServiceError';
    this.service = details.service;
    this.method = details.method;
    this.operation = details.operation;
    this.context = details.context || {};
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }

    // Log the error immediately with structured data
    this.logError(details.originalError);
  }

  private logError(originalError?: any): void {
    const errorLog = {
      service: this.service,
      method: this.method,
      operation: this.operation,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      context: this.context,
      stack: this.stack,
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : undefined,
      timestamp: new Date().toISOString()
    };

    logger.error(`Service error in ${this.service}.${this.method}`, errorLog);
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      method: this.method,
      operation: this.operation,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      context: this.context,
      isOperational: this.isOperational,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Standardized error handling wrapper for service methods
 */
export const withServiceErrorHandling = async <T>(
  details: ServiceErrorDetails,
  operation: () => Promise<T>
): Promise<T> => {
  try {
    logger.info(`Starting ${details.service}.${details.method}`, {
      operation: details.operation,
      context: details.context
    });

    const result = await operation();

    logger.info(`Completed ${details.service}.${details.method}`, {
      operation: details.operation,
      success: true
    });

    return result;
  } catch (error) {
    // Check if it's already a ServiceError to avoid double wrapping
    if (error instanceof ServiceError) {
      throw error;
    }

    // Create standardized service error
    throw new ServiceError(
      `${details.operation} failed: ${error.message}`,
      {
        ...details,
        originalError: error
      },
      getStatusCodeFromError(error),
      getErrorCodeFromError(error)
    );
  }
};

/**
 * Service error factory for common error types
 */
export const ServiceErrors = {
  validation: (service: string, method: string, message: string, context?: any) => 
    new ServiceError(message, { service, method, operation: 'validation', context }, 400, 'VALIDATION_ERROR'),
  
  notFound: (service: string, method: string, resource: string, context?: any) => 
    new ServiceError(`${resource} not found`, { service, method, operation: 'resource_lookup', context }, 404, 'NOT_FOUND'),
  
  unauthorized: (service: string, method: string, message: string = 'Unauthorized', context?: any) => 
    new ServiceError(message, { service, method, operation: 'authorization', context }, 401, 'UNAUTHORIZED'),
  
  forbidden: (service: string, method: string, message: string = 'Forbidden', context?: any) => 
    new ServiceError(message, { service, method, operation: 'permission_check', context }, 403, 'FORBIDDEN'),
  
  conflict: (service: string, method: string, message: string, context?: any) => 
    new ServiceError(message, { service, method, operation: 'conflict_resolution', context }, 409, 'CONFLICT'),
  
  internal: (service: string, method: string, message: string, context?: any, originalError?: any) => 
    new ServiceError(message, { service, method, operation: 'internal_operation', context, originalError }, 500, 'INTERNAL_ERROR')
};

/**
 * Extract status code from various error types
 */
function getStatusCodeFromError(error: any): number {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  if (error.code === 'P2002') return 409; // Prisma unique constraint
  if (error.code === 'P2025') return 404; // Prisma record not found
  return 500;
}

/**
 * Extract error code from various error types
 */
function getErrorCodeFromError(error: any): string {
  if (error.code) return `EXTERNAL_${error.code}`;
  if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
  if (error.name === 'CastError') return 'CAST_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Express middleware to handle ServiceErrors
 */
export const serviceErrorHandler = (error: any, req: any, res: any, next: any) => {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        service: error.service,
        method: error.method
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle non-ServiceError errors
  logger.error('Unhandled error', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    timestamp: new Date().toISOString()
  });
};