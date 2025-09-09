/**
 * Client-Side Logging Management System for Realm Rivalry
 * 
 * Features:
 * - Environment-aware logging
 * - Performance monitoring for React components
 * - Structured logging for dome ball game events
 * - Local storage integration for debugging
 * - Production error reporting
 */

// Performance tracking interface for client-side operations
interface ClientPerformanceMetrics {
  component?: string;
  operation: string;
  duration: number;
  renderCount?: number;
  hookCount?: number;
  memoryUsage?: number;
  context?: Record<string, any>;
}

// Dome Ball game context for client events
interface ClientGameContext {
  matchId?: string;
  teamId?: string;
  playerId?: string;
  division?: string;
  subdivision?: string;
  page?: string;
  component?: string;
  userAction?: string;
}

// Log levels for client-side logging
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  PERFORMANCE = 4
}

// Client log entry structure
interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  userId?: string;
}

class ClientLogger {
  private isProduction: boolean;
  private maxLogEntries: number = 1000;
  private logBuffer: LogEntry[] = [];
  private performanceTracker = new Map<string, number>();

  constructor() {
    this.isProduction = import.meta.env.MODE === 'production';
    
    // Load existing logs from localStorage
    this.loadLogsFromStorage();
    
    // Set up periodic log cleanup
    this.setupLogCleanup();
  }

  /**
   * Info level logging
   */
  info(message: string, context?: ClientGameContext | Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Error logging with enhanced context
   */
  error(message: string, error?: Error | any, context?: ClientGameContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error 
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : error
    };
    
    this.log(LogLevel.ERROR, message, errorContext);
    
    // In production, also send to error reporting service
    if (this.isProduction && error instanceof Error) {
      this.reportError(error, message, context);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: ClientGameContext | Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: ClientGameContext | Record<string, any>) {
    if (!this.isProduction) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Performance logging with metrics tracking
   */
  performance(message: string, metrics: ClientPerformanceMetrics) {
    const performanceContext = {
      ...metrics,
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    this.log(LogLevel.PERFORMANCE, message, performanceContext);
  }

  /**
   * Log dome ball match events on client side
   */
  matchEvent(message: string, matchContext: {
    matchId: string;
    teamNames: string[];
    currentPhase: string;
    userAction?: string;
    component: string;
  }) {
    this.info(message, {
      category: 'client_match_event',
      ...matchContext,
      gameType: 'dome_ball'
    });
  }

  /**
   * Log React component performance
   */
  componentPerformance(componentName: string, metrics: {
    renderTime: number;
    hookCount: number;
    propsCount?: number;
    rerenderReason?: string;
  }) {
    this.performance(`Component performance: ${componentName}`, {
      component: componentName,
      operation: 'render',
      duration: metrics.renderTime,
      hookCount: metrics.hookCount,
      context: {
        category: 'react_performance',
        propsCount: metrics.propsCount,
        rerenderReason: metrics.rerenderReason
      }
    });
  }

  /**
   * Start performance tracking for operations
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
    context?: ClientGameContext
  ): number {
    const startTime = this.performanceTracker.get(operationId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performance(`${operation} completed`, {
        operation,
        duration: Math.round(duration * 100) / 100,
        context
      });
      this.performanceTracker.delete(operationId);
      return duration;
    }
    return 0;
  }

  /**
   * Track API call performance
   */
  apiCall(message: string, apiContext: {
    endpoint: string;
    method: string;
    duration: number;
    statusCode?: number;
    responseSize?: number;
  }) {
    this.performance(message, {
      operation: 'api_call',
      duration: apiContext.duration,
      context: {
        category: 'api_performance',
        ...apiContext
      }
    });
  }

  /**
   * Get current logs for debugging
   */
  getLogs(level?: keyof typeof LogLevel): LogEntry[] {
    if (level) {
      const levelValue = LogLevel[level];
      return this.logBuffer.filter(entry => LogLevel[entry.level] <= levelValue);
    }
    return [...this.logBuffer];
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logBuffer = [];
    this.clearStoredLogs();
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level] as keyof typeof LogLevel,
      message,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId()
    };

    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogEntries);
    }

    // Console output based on environment and level
    if (!this.isProduction || level === LogLevel.ERROR) {
      this.outputToConsole(logEntry);
    }

    // Store in localStorage for debugging
    this.saveLogsToStorage();
  }

  /**
   * Output formatted log to console
   */
  private outputToConsole(entry: LogEntry) {
    const { timestamp, level, message, context } = entry;
    const time = new Date(timestamp).toLocaleTimeString();
    
    switch (level) {
      case 'ERROR':
        console.error(`${time} [${level}]:`, message, context || '');
        break;
      case 'WARN':
        console.warn(`${time} [${level}]:`, message, context || '');
        break;
      case 'INFO':
        console.info(`${time} [${level}]:`, message, context || '');
        break;
      case 'DEBUG':
        console.debug(`${time} [${level}]:`, message, context || '');
        break;
      case 'PERFORMANCE':
        console.log(`${time} [${level}]:`, message, context || '');
        break;
    }
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number | undefined {
    // Modern browsers support performance.memory
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Get current user ID from auth context
   */
  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    try {
      const authData = localStorage.getItem('auth_user');
      if (authData) {
        const user = JSON.parse(authData);
        return user.uid || user.id;
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return undefined;
  }

  /**
   * Report errors to external service in production
   */
  private reportError(error: Error, message: string, context?: Record<string, any>) {
    // Integrate with Sentry or other error reporting service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          component: 'client_logger',
          game: 'dome_ball'
        },
        extra: {
          message,
          context
        }
      });
    }
  }

  /**
   * Save logs to localStorage for debugging
   */
  private saveLogsToStorage() {
    try {
      const recentLogs = this.logBuffer.slice(-100); // Keep only recent 100 logs
      localStorage.setItem('realm_rivalry_logs', JSON.stringify(recentLogs));
    } catch (e) {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage() {
    try {
      const storedLogs = localStorage.getItem('realm_rivalry_logs');
      if (storedLogs) {
        this.logBuffer = JSON.parse(storedLogs);
      }
    } catch (e) {
      // Ignore parsing errors
      this.clearStoredLogs();
    }
  }

  /**
   * Clear logs from localStorage
   */
  private clearStoredLogs() {
    try {
      localStorage.removeItem('realm_rivalry_logs');
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Set up periodic log cleanup
   */
  private setupLogCleanup() {
    // Clean up old logs every 5 minutes
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      this.logBuffer = this.logBuffer.filter(log => log.timestamp > oneHourAgo);
    }, 5 * 60 * 1000);
  }
}

// Performance monitoring utilities for React components
export const ClientPerformanceMonitor = {
  /**
   * Higher-order component to track render performance
   */
  withPerformanceTracking: (WrappedComponent: React.ComponentType<any>, componentName: string) => {
    return (props: any) => {
      const renderStart = performance.now();
      
      React.useEffect(() => {
        const renderTime = performance.now() - renderStart;
        
        clientLogger.componentPerformance(componentName, {
          renderTime,
          hookCount: 0, // Would need React DevTools integration for accurate count
          propsCount: Object.keys(props).length
        });
      });
      
      return React.createElement(WrappedComponent, props);
    };
  },

  /**
   * Hook to track component render performance
   */
  useRenderPerformance: (componentName: string, dependencies?: any[]) => {
    React.useEffect(() => {
      const renderStart = performance.now();
      
      return () => {
        const renderTime = performance.now() - renderStart;
        clientLogger.componentPerformance(componentName, {
          renderTime,
          hookCount: 0,
          rerenderReason: dependencies ? 'dependencies_changed' : 'initial_render'
        });
      };
    }, dependencies);
  },

  /**
   * Track API call performance
   */
  trackApiCall: async <T>(
    operation: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      clientLogger.apiCall(`API ${method} ${endpoint}`, {
        endpoint,
        method,
        duration,
        statusCode: 200
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      clientLogger.apiCall(`API ${method} ${endpoint} failed`, {
        endpoint,
        method,
        duration,
        statusCode: error instanceof Error ? 500 : 400
      });
      
      throw error;
    }
  }
};

// Create and export singleton logger instance
const clientLogger = new ClientLogger();

// Global error handler
window.addEventListener('error', (event) => {
  clientLogger.error('Unhandled JavaScript error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  clientLogger.error('Unhandled promise rejection', event.reason, {
    type: 'unhandled_promise_rejection'
  });
});

// Export for debugging in development
if (!clientLogger['isProduction']) {
  (window as any).realmRivalryLogger = clientLogger;
}

export default clientLogger;
export { ClientLogger, ClientPerformanceMonitor, LogLevel, ClientGameContext, ClientPerformanceMetrics };