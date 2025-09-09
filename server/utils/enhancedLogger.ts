/**
 * Enhanced Production-Ready Logging System for Realm Rivalry
 * 
 * Features:
 * - Structured logging with Winston
 * - Performance monitoring integration
 * - Environment-aware logging levels
 * - Daily log rotation
 * - Context-aware logging
 * - Dome ball game-specific tracking
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Performance tracking interface
interface PerformanceMetrics {
  operation: string;
  duration: number;
  recordCount?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  context?: Record<string, any>;
}

// Dome Ball game context interface
interface GameContext {
  matchId?: string;
  teamId?: string;
  playerId?: string;
  division?: string;
  subdivision?: string;
  tournamentId?: string;
  userId?: string;
  operation?: string;
  phase?: 'regular' | 'playoff' | 'tournament';
}

// Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  performance: 3,
  debug: 4,
  trace: 5
};

// Custom log format with structured data
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  levels: logLevels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'realm-rivalry-server',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error logs - always logged
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/error-audit.json',
    }),
    
    // Combined logs - info and above
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '7d',
      auditFile: 'logs/combined-audit.json',
    }),
    
    // Performance logs - separate file for analysis
    new DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'performance',
      maxSize: '20m',
      maxFiles: '7d',
      auditFile: 'logs/performance-audit.json',
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Enhanced Logger class with performance monitoring
class EnhancedLogger {
  private winston: winston.Logger;
  private performanceTracker = new Map<string, number>();

  constructor(logger: winston.Logger) {
    this.winston = logger;
  }

  /**
   * Info level logging with structured context
   */
  info(message: string, context?: GameContext | Record<string, any>) {
    this.winston.info(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error logging with enhanced context and stack traces
   */
  error(message: string, error?: Error | any, context?: GameContext) {
    const errorData = error instanceof Error 
      ? { 
          name: error.name, 
          message: error.message, 
          stack: error.stack,
          cause: error.cause 
        }
      : error;

    this.winston.error(message, {
      error: errorData,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: GameContext | Record<string, any>) {
    this.winston.warn(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: GameContext | Record<string, any>) {
    this.winston.debug(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Performance logging with metrics tracking
   */
  performance(message: string, metrics: PerformanceMetrics) {
    const memoryUsage = process.memoryUsage();
    
    this.winston.log('performance', message, {
      ...metrics,
      memoryUsage,
      timestamp: new Date().toISOString(),
      performance: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      }
    });
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking(operationId: string): void {
    this.performanceTracker.set(operationId, performance.now());
  }

  /**
   * End performance tracking and log results
   */
  endPerformanceTracking(
    operationId: string, 
    operation: string, 
    context?: GameContext,
    recordCount?: number
  ): void {
    const startTime = this.performanceTracker.get(operationId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performance(`${operation} completed`, {
        operation,
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
        recordCount,
        context
      });
      this.performanceTracker.delete(operationId);
    }
  }

  /**
   * Log dome ball match events
   */
  matchEvent(message: string, matchContext: {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    division: string;
    subdivision: string;
    currentMinute?: number;
    score?: { home: number; away: number };
    phase: 'regular' | 'playoff' | 'tournament';
  }) {
    this.info(message, {
      category: 'match_event',
      ...matchContext,
      gameType: 'dome_ball'
    });
  }

  /**
   * Log database operations with query performance
   */
  database(message: string, queryContext: {
    query: string;
    duration: number;
    recordCount: number;
    table?: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  }) {
    this.performance(message, {
      operation: 'database_query',
      duration: queryContext.duration,
      recordCount: queryContext.recordCount,
      context: {
        category: 'database',
        query: queryContext.query,
        table: queryContext.table,
        operation: queryContext.operation
      }
    });
  }

  /**
   * Log API endpoint performance
   */
  apiEndpoint(message: string, endpointContext: {
    method: string;
    endpoint: string;
    duration: number;
    statusCode: number;
    userId?: string;
    requestId?: string;
  }) {
    this.performance(message, {
      operation: 'api_endpoint',
      duration: endpointContext.duration,
      context: {
        category: 'api',
        ...endpointContext
      }
    });
  }

  /**
   * Log tournament automation events
   */
  tournamentEvent(message: string, tournamentContext: {
    tournamentId: string;
    division: string;
    subdivision: string;
    round?: number;
    phase: 'registration' | 'seeding' | 'bracket_generation' | 'matches' | 'completed';
    teamCount?: number;
  }) {
    this.info(message, {
      category: 'tournament_automation',
      ...tournamentContext,
      gameType: 'dome_ball'
    });
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: Record<string, any>): EnhancedLogger {
    const childLogger = this.winston.child(defaultContext);
    return new EnhancedLogger(childLogger);
  }
}

// Create and export singleton logger instance
const logger = new EnhancedLogger(winstonLogger);

// Performance monitoring utilities
export const PerformanceMonitor = {
  /**
   * Track database query performance
   */
  trackDatabaseQuery: async <T>(
    operation: () => Promise<T>, 
    queryName: string, 
    context?: GameContext
  ): Promise<T> => {
    const startTime = performance.now();
    const operationId = `db_${Date.now()}_${Math.random()}`;
    
    logger.startPerformanceTracking(operationId);
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      logger.database(`Database query: ${queryName}`, {
        query: queryName,
        duration,
        recordCount: Array.isArray(result) ? result.length : 1,
        operation: 'SELECT'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`Database query failed: ${queryName}`, error, {
        ...context,
        duration,
        operationId
      });
      throw error;
    }
  },

  /**
   * Track API endpoint performance
   */
  trackApiEndpoint: (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random()}`;
    
    res.on('finish', () => {
      const duration = performance.now() - startTime;
      
      logger.apiEndpoint(`API ${req.method} ${req.path}`, {
        method: req.method,
        endpoint: req.path,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.id,
        requestId
      });
    });
    
    next();
  },

  /**
   * Track component render performance (for client-side)
   */
  trackComponentRender: (componentName: string, renderTime: number) => {
    logger.performance(`Component render: ${componentName}`, {
      operation: 'component_render',
      duration: renderTime,
      context: {
        category: 'react_performance',
        component: componentName
      }
    });
  }
};

export default logger;
export { EnhancedLogger, GameContext, PerformanceMetrics };