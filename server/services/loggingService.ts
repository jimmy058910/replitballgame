/**
 * Phase 7B: Comprehensive Logging & Monitoring Service
 * Production-ready logging with structured output and performance tracking
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log context interface
interface LogContext {
  userId?: string;
  teamId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  metadata?: Record<string, any>;
}

// Performance metrics
interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowQueries: number;
  activeConnections: number;
}

class LoggingService {
  private static instance: LoggingService;
  private requestMetrics: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private totalRequests = 0;
  private totalErrors = 0;
  private responseTimes: number[] = [];
  private maxResponseTimeSamples = 1000;

  private constructor() {
    // Initialize logging service
    this.setupProcessHandlers();
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Main logging method with structured output
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      environment: process.env.NODE_ENV || 'development',
      service: 'realm-rivalry-backend'
    };

    // In production, use structured JSON logging
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use readable format
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
      console.log(`${prefix} ${message}${contextStr}`);
    }

    // Track error counts
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      this.trackError(context?.path || 'unknown');
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, message, context);
  }

  /**
   * Express middleware for request logging
   */
  requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const requestId = this.generateRequestId();
      
      // Attach request ID to request object
      (req as any).requestId = requestId;

      // Log incoming request
      this.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        userId: (req as any).userId,
        metadata: {
          query: req.query,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = performance.now() - startTime;
        
        // Log response
        LoggingService.getInstance().info('Request completed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Math.round(duration),
          userId: (req as any).userId
        });

        // Track metrics
        LoggingService.getInstance().trackResponseTime(req.path, duration);

        // Call original send
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Error handling middleware
   */
  errorLogger() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = (req as any).requestId || this.generateRequestId();
      
      this.error('Request error', {
        requestId,
        method: req.method,
        path: req.path,
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name
        },
        userId: (req as any).userId
      });

      next(err);
    };
  }

  /**
   * Performance monitoring
   */
  private trackResponseTime(path: string, duration: number): void {
    this.totalRequests++;
    this.responseTimes.push(duration);

    // Keep only recent samples to prevent memory growth
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }

    // Track per-path metrics
    if (!this.requestMetrics.has(path)) {
      this.requestMetrics.set(path, []);
    }
    const pathMetrics = this.requestMetrics.get(path)!;
    pathMetrics.push(duration);
    
    // Keep path metrics limited
    if (pathMetrics.length > 100) {
      pathMetrics.shift();
    }
  }

  private trackError(path: string): void {
    this.totalErrors++;
    const current = this.errorCounts.get(path) || 0;
    this.errorCounts.set(path, current + 1);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      requestCount: this.totalRequests,
      errorCount: this.totalErrors,
      avgResponseTime: this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      slowQueries: this.responseTimes.filter(t => t > 1000).length,
      activeConnections: (process as any)._getActiveHandles?.()?.length || 0
    };
  }

  /**
   * Health check endpoint data
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: {
        requests: metrics.requestCount,
        errors: metrics.errorCount,
        errorRate: metrics.requestCount > 0 
          ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
        p95ResponseTime: Math.round(metrics.p95ResponseTime) + 'ms',
        p99ResponseTime: Math.round(metrics.p99ResponseTime) + 'ms'
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  /**
   * Database query logging
   */
  logQuery(query: string, duration: number, success: boolean): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, 'Database query', {
      metadata: {
        query: query.substring(0, 200), // Truncate long queries
        duration: Math.round(duration),
        success,
        slow: duration > 1000
      }
    });
  }

  /**
   * WebSocket event logging
   */
  logWebSocketEvent(event: string, userId?: string, data?: any): void {
    this.debug('WebSocket event', {
      userId,
      metadata: {
        event,
        data: data ? JSON.stringify(data).substring(0, 200) : undefined
      }
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup process-level error handlers
   */
  private setupProcessHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.critical('Uncaught exception', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
      // Give time to flush logs before exit
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled promise rejection', {
        error: {
          reason: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined
        }
      });
    });

    // Graceful shutdown logging
    process.on('SIGTERM', () => {
      this.info('SIGTERM received, starting graceful shutdown');
    });

    process.on('SIGINT', () => {
      this.info('SIGINT received, starting graceful shutdown');
    });
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.requestMetrics.clear();
    this.errorCounts.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.responseTimes = [];
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();

// Export middleware functions
export const requestLogger = () => logger.requestLogger();
export const errorLogger = () => logger.errorLogger();