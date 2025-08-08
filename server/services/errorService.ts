import { Request, Response } from 'express.js';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Error types for standardized responses
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR'
}

// Standardized error response interface
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Custom application error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number,
    code?: string,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
export const ErrorCreators = {
  validation: (message: string, details?: any) => 
    new AppError(ErrorType.VALIDATION, message, 400, 'VALIDATION_FAILED', details),
  
  authentication: (message = 'Authentication required') => 
    new AppError(ErrorType.AUTHENTICATION, message, 401, 'AUTH_REQUIRED'),
  
  authorization: (message = 'Insufficient permissions') => 
    new AppError(ErrorType.AUTHORIZATION, message, 403, 'INSUFFICIENT_PERMISSIONS'),

  unauthorized: (message = 'Unauthorized access') => 
    new AppError(ErrorType.AUTHENTICATION, message, 401, 'UNAUTHORIZED_ACCESS'),

  forbidden: (message = 'Forbidden operation') => 
    new AppError(ErrorType.AUTHORIZATION, message, 403, 'FORBIDDEN_OPERATION'),
  
  notFound: (resource: string) => 
    new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404, 'RESOURCE_NOT_FOUND'),
  
  conflict: (message: string) => 
    new AppError(ErrorType.CONFLICT, message, 409, 'RESOURCE_CONFLICT'),
  
  rateLimit: (message = 'Too many requests') => 
    new AppError(ErrorType.RATE_LIMIT, message, 429, 'RATE_LIMIT_EXCEEDED'),
  
  database: (message = 'Database operation failed') => 
    new AppError(ErrorType.DATABASE, message, 500, 'DB_ERROR'),
  
  externalService: (service: string, message?: string) => 
    new AppError(ErrorType.EXTERNAL_SERVICE, message || `${service} service unavailable`, 503, 'EXTERNAL_SERVICE_ERROR'),
  
  internal: (message = 'Internal server error') => 
    new AppError(ErrorType.INTERNAL, message, 500, 'INTERNAL_ERROR')
};

// Sanitize error details for logging (remove sensitive data)
function sanitizeErrorForLogging(error: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  
  if (typeof error !== 'object' || error === null) {
    return error;
  }

  const sanitized = { ...error };
  
  // Remove sensitive fields
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeErrorForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

// Structured logging function
export function logError(error: Error | AppError, req?: Request, additionalContext?: any): void {
  const timestamp = new Date().toISOString();
  const sanitizedContext = additionalContext ? sanitizeErrorForLogging(additionalContext) : {};
  
  const logEntry = {
    timestamp,
    level: 'ERROR',
    message: error.message,
    type: error instanceof AppError ? error.type : ErrorType.INTERNAL,
    statusCode: error instanceof AppError ? error.statusCode : 500,
    code: error instanceof AppError ? error.code : undefined,
    stack: isDevelopment ? error.stack : undefined,
    request: req ? {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any)?.user?.claims?.sub || undefined
    } : undefined,
    context: Object.keys(sanitizedContext).length > 0 ? sanitizedContext : undefined
  };

  // In production, use structured logging (JSON)
  if (isProduction) {
    console.error(JSON.stringify(logEntry));
  } else {
    // In development, use more readable format
    console.error(`[ERROR] ${timestamp} - ${error.message}`);
    if (error.stack && isDevelopment) {
      console.error(error.stack);
    }
    if (req) {
      console.error(`Request: ${req.method} ${req.url}`);
    }
    if (Object.keys(sanitizedContext).length > 0) {
      console.error('Context:', sanitizedContext);
    }
  }
}

// Log info messages with structure
export function logInfo(message: string, context?: any): void {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? sanitizeErrorForLogging(context) : {};
  
  const logEntry = {
    timestamp,
    level: 'INFO',
    message,
    context: Object.keys(sanitizedContext).length > 0 ? sanitizedContext : undefined
  };

  if (isProduction) {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[INFO] ${timestamp} - ${message}`);
    if (Object.keys(sanitizedContext).length > 0) {
      console.log('Context:', sanitizedContext);
    }
  }
}

// Create standardized error response
// Comprehensive BigInt serialization utility for error handling
function serializeBigIntValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigIntValues);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigIntValues(value);
    }
    return serialized;
  }
  
  return obj;
}

export function createErrorResponse(error: AppError, requestId?: string): ErrorResponse {
  // Sanitize error details to handle BigInt values
  const sanitizedDetails = isDevelopment && error.details ? serializeBigIntValues(error.details) : undefined;
  
  return {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      code: error.code,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

// Handle different error types and convert to AppError
export function normalizeError(error: any): AppError {
  // If already an AppError, return as is
  if (error instanceof AppError) {
    return error;
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return ErrorCreators.validation('Invalid request data', {
      issues: error.issues?.map((issue: any) => ({
        path: issue.path?.join('.'),
        message: issue.message
      }))
    });
  }

  // Handle database constraint errors
  if (error.code === '23505') { // PostgreSQL unique constraint
    return ErrorCreators.conflict('Resource already exists');
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key constraint
    return ErrorCreators.validation('Referenced resource does not exist');
  }

  // Handle authentication errors
  if (error.message?.includes('Unauthorized') || error.status === 401) {
    return ErrorCreators.authentication();
  }

  // Handle not found errors
  if (error.status === 404 || error.message?.includes('not found')) {
    return ErrorCreators.notFound('Resource');
  }

  // Default to internal server error
  return ErrorCreators.internal(isDevelopment ? error.message : 'An unexpected error occurred');
}

// Express error handler middleware
export function errorHandler(error: any, req: Request, res: Response, next: any): void {
  const normalizedError = normalizeError(error);
  const requestId = req.headers['x-request-id'] as string;

  // Log the error
  logError(normalizedError, req);

  // Don't send error if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Send standardized error response
  const errorResponse = createErrorResponse(normalizedError, requestId);
  res.status(normalizedError.statusCode).json(errorResponse);
}

// Async handler wrapper to catch promise rejections
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}