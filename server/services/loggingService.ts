/**
 * STRUCTURED LOGGING SERVICE
 * Replaces console.log statements with proper structured logging
 * Provides consistent logging format and filtering capabilities
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogContext {
  userId?: string;
  teamId?: string;
  playerId?: string;
  tournamentId?: string;
  gameId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

class LoggingService {
  private static instance: LoggingService;

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private formatMessage(level: LogLevel, component: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level.toUpperCase()} [${component}] ${message} ${contextStr}`;
  }

  debug(component: string, message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, component, message, context));
    }
  }

  info(component: string, message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, component, message, context));
  }

  warn(component: string, message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, component, message, context));
  }

  error(component: string, message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { error };

    const fullContext = { ...context, ...errorDetails };
    console.error(this.formatMessage(LogLevel.ERROR, component, message, fullContext));
  }

  // Admin-specific logging methods with consistent formatting
  adminOperation(operation: string, message: string, context?: LogContext): void {
    this.info('ADMIN', `🚀 ${operation}: ${message}`, context);
  }

  adminSuccess(operation: string, message: string, context?: LogContext): void {
    this.info('ADMIN', `✅ ${operation}: ${message}`, context);
  }

  adminError(operation: string, message: string, error?: Error | unknown, context?: LogContext): void {
    this.error('ADMIN', `❌ ${operation}: ${message}`, error, context);
  }

  // Database operation logging
  dbOperation(operation: string, table: string, context?: LogContext): void {
    this.debug('DATABASE', `${operation} on ${table}`, context);
  }

  // Performance monitoring
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `${operation} completed in ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn('PERFORMANCE', message, { ...context, duration });
    } else {
      this.debug('PERFORMANCE', message, { ...context, duration });
    }
  }
}

export const logger = LoggingService.getInstance();
export default logger;