/**
 * API Response Formatter
 * 
 * Standardized API response formatting service for consistent response patterns.
 * Provides structured success/error responses with metadata and performance tracking.
 * 
 * CREATED for Phase 2B: Service Layer Agent implementation
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
    performance?: {
      duration: number;
      service: string;
      method: string;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
    service?: string;
    method?: string;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ResponseContext {
  service?: string;
  method?: string;
  requestId?: string;
  startTime?: number;
}

/**
 * API Response Formatter Service
 */
export class ApiResponseFormatter {
  
  /**
   * Format successful response with optional metadata
   */
  static success<T>(
    data: T, 
    message?: string, 
    context?: ResponseContext
  ): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: context?.requestId
      }
    };

    // Add performance metadata if available
    if (context?.startTime && context?.service && context?.method) {
      response.metadata!.performance = {
        duration: Date.now() - context.startTime,
        service: context.service,
        method: context.method
      };
    }

    return response;
  }

  /**
   * Format paginated successful response
   */
  static successPaginated<T>(
    data: T[], 
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message?: string,
    context?: ResponseContext
  ): ApiSuccessResponse<T[]> {
    const response = this.success(data, message, context);
    
    response.metadata!.pagination = {
      ...pagination,
      hasNext: (pagination.page * pagination.limit) < pagination.total,
      hasPrev: pagination.page > 1
    };

    return response;
  }

  /**
   * Format error response
   */
  static error(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    context?: ResponseContext
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        message,
        code,
        details,
        service: context?.service,
        method: context?.method
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: context?.requestId
      }
    };
  }

  /**
   * Format validation error response
   */
  static validationError(
    errors: Record<string, string[]> | string[],
    context?: ResponseContext
  ): ApiErrorResponse {
    return this.error(
      'Validation failed',
      'VALIDATION_ERROR',
      { errors },
      context
    );
  }

  /**
   * Format not found error response
   */
  static notFound(
    resource: string,
    context?: ResponseContext
  ): ApiErrorResponse {
    return this.error(
      `${resource} not found`,
      'NOT_FOUND',
      { resource },
      context
    );
  }

  /**
   * Format unauthorized error response
   */
  static unauthorized(
    message: string = 'Authentication required',
    context?: ResponseContext
  ): ApiErrorResponse {
    return this.error(message, 'UNAUTHORIZED', undefined, context);
  }

  /**
   * Format forbidden error response
   */
  static forbidden(
    message: string = 'Access forbidden',
    context?: ResponseContext
  ): ApiErrorResponse {
    return this.error(message, 'FORBIDDEN', undefined, context);
  }

  /**
   * Format internal server error response
   */
  static internalError(
    message: string = 'Internal server error',
    context?: ResponseContext
  ): ApiErrorResponse {
    return this.error(message, 'INTERNAL_ERROR', undefined, context);
  }
}

/**
 * Express middleware to automatically format responses
 */
export const responseFormatterMiddleware = (req: any, res: any, next: any) => {
  // Add response helpers to res object
  res.apiSuccess = (data: any, message?: string) => {
    const context: ResponseContext = {
      requestId: req.id,
      startTime: req.startTime
    };
    return res.json(ApiResponseFormatter.success(data, message, context));
  };

  res.apiSuccessPaginated = (data: any[], pagination: any, message?: string) => {
    const context: ResponseContext = {
      requestId: req.id,
      startTime: req.startTime
    };
    return res.json(ApiResponseFormatter.successPaginated(data, pagination, message, context));
  };

  res.apiError = (message: string, code?: string, details?: any, statusCode: number = 400) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(statusCode).json(ApiResponseFormatter.error(message, code, details, context));
  };

  res.apiValidationError = (errors: any) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(400).json(ApiResponseFormatter.validationError(errors, context));
  };

  res.apiNotFound = (resource: string) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(404).json(ApiResponseFormatter.notFound(resource, context));
  };

  res.apiUnauthorized = (message?: string) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(401).json(ApiResponseFormatter.unauthorized(message, context));
  };

  res.apiForbidden = (message?: string) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(403).json(ApiResponseFormatter.forbidden(message, context));
  };

  res.apiInternalError = (message?: string) => {
    const context: ResponseContext = {
      requestId: req.id
    };
    return res.status(500).json(ApiResponseFormatter.internalError(message, context));
  };

  next();
};

/**
 * Request timing middleware to track performance
 */
export const requestTimingMiddleware = (req: any, res: any, next: any) => {
  req.startTime = Date.now();
  next();
};