/**
 * Enhanced Error Service
 * Provides comprehensive error handling, logging, and reporting
 */

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'runtime' | 'chunk' | 'auth' | 'validation' | 'unknown';
  context?: Record<string, any>;
  resolved?: boolean;
  reproductionSteps?: string[];
}

export interface ErrorServiceConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  reportingEndpoint?: string;
  autoReport: boolean;
  reportingThrottle: number;
}

class ErrorService {
  private config: ErrorServiceConfig;
  private errorQueue: ErrorReport[] = [];
  private reportingThrottle: Map<string, number> = new Map();

  constructor(config: Partial<ErrorServiceConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: process.env.NODE_ENV === 'production',
      enableLocalStorage: true,
      maxStoredErrors: 100,
      autoReport: true,
      reportingThrottle: 60000, // 1 minute
      ...config,
    };

    // Initialize error listeners
    this.initializeErrorListeners();
  }

  private initializeErrorListeners() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(new Error(event.reason), {
        type: 'unhandledrejection',
        reason: event.reason,
      });
    });

    // React Error Boundary integration
    this.initializeReactErrorHandling();
  }

  private initializeReactErrorHandling() {
    // Hook into React's error boundary system
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if this is a React error boundary error
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        const error = args[1] instanceof Error ? args[1] : new Error(args[0]);
        this.report(error, {
          level: 'high',
          category: 'runtime',
          context: { reactError: true, args },
        });
      }
      originalConsoleError.apply(console, args);
    };
  }

  private handleGlobalError(error: Error, context?: Record<string, any>) {
    this.report(error, {
      level: 'high',
      category: this.categorizeError(error),
      context,
    });
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('loading chunk') || message.includes('import') || stack.includes('chunk')) {
      return 'chunk';
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'auth';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('cannot read') || message.includes('undefined') || message.includes('null')) {
      return 'runtime';
    }
    return 'unknown';
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldThrottle(error: Error): boolean {
    const errorKey = `${error.name}-${error.message}`;
    const lastReported = this.reportingThrottle.get(errorKey);
    const now = Date.now();

    if (lastReported && (now - lastReported) < this.config.reportingThrottle) {
      return true;
    }

    this.reportingThrottle.set(errorKey, now);
    return false;
  }

  public report(
    error: Error,
    options: {
      level?: ErrorReport['level'];
      category?: ErrorReport['category'];
      context?: Record<string, any>;
      componentStack?: string;
      userId?: string;
      sessionId?: string;
      reproductionSteps?: string[];
    } = {}
  ): string {
    const errorId = this.generateErrorId();
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: options.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: options.userId,
      sessionId: options.sessionId,
      level: options.level || 'medium',
      category: options.category || this.categorizeError(error),
      context: options.context,
      resolved: false,
      reproductionSteps: options.reproductionSteps,
    };

    // Add to error queue
    this.errorQueue.push(errorReport);

    // Limit queue size
    if (this.errorQueue.length > this.config.maxStoredErrors) {
      this.errorQueue.shift();
    }

    // Log error if enabled
    if (this.config.enableLogging) {
      this.logError(errorReport);
    }

    // Store in localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.storeErrorLocally(errorReport);
    }

    // Report error if enabled and not throttled
    if (this.config.enableReporting && this.config.autoReport && !this.shouldThrottle(error)) {
      this.sendErrorReport(errorReport);
    }

    return errorId;
  }

  private logError(errorReport: ErrorReport) {
    const logLevel = errorReport.level === 'critical' ? 'error' : 
                    errorReport.level === 'high' ? 'error' : 
                    errorReport.level === 'medium' ? 'warn' : 'info';

    console.group(`🚨 Error Report [${errorReport.level.toUpperCase()}]`);
    console[logLevel](`ID: ${errorReport.id}`);
    console[logLevel](`Category: ${errorReport.category}`);
    console[logLevel](`Message: ${errorReport.message}`);
    
    if (errorReport.stack) {
      console[logLevel](`Stack: ${errorReport.stack}`);
    }
    
    if (errorReport.context) {
      console[logLevel]('Context:', errorReport.context);
    }
    
    console.groupEnd();
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push(errorReport);
      
      // Limit stored errors
      if (storedErrors.length > this.config.maxStoredErrors) {
        storedErrors.shift();
      }
      
      localStorage.setItem('realm-rivalry-errors', JSON.stringify(storedErrors));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    if (!this.config.reportingEndpoint) {
      console.warn('Error reporting endpoint not configured');
      return;
    }

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  public getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('realm-rivalry-errors');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve stored errors:', error);
      return [];
    }
  }

  public clearStoredErrors() {
    try {
      localStorage.removeItem('realm-rivalry-errors');
      this.errorQueue = [];
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  public getErrorStats(): {
    total: number;
    byLevel: Record<ErrorReport['level'], number>;
    byCategory: Record<ErrorReport['category'], number>;
    recent: ErrorReport[];
  } {
    const errors = this.errorQueue;
    const stats = {
      total: errors.length,
      byLevel: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byCategory: {
        network: 0,
        runtime: 0,
        chunk: 0,
        auth: 0,
        validation: 0,
        unknown: 0,
      },
      recent: errors.slice(-10).reverse(),
    };

    errors.forEach(error => {
      stats.byLevel[error.level]++;
      stats.byCategory[error.category]++;
    });

    return stats;
  }

  public resolveError(errorId: string) {
    const error = this.errorQueue.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      this.storeErrorLocally(error);
    }
  }

  public exportErrors(): string {
    return JSON.stringify(this.errorQueue, null, 2);
  }

  public importErrors(data: string) {
    try {
      const errors = JSON.parse(data) as ErrorReport[];
      this.errorQueue = errors;
      if (this.config.enableLocalStorage) {
        localStorage.setItem('realm-rivalry-errors', data);
      }
    } catch (error) {
      console.error('Failed to import errors:', error);
    }
  }
}

// Global error service instance
export const errorService = new ErrorService();

// React error boundary integration
export function reportReactError(error: Error, errorInfo: { componentStack: string }) {
  return errorService.report(error, {
    level: 'high',
    category: 'runtime',
    componentStack: errorInfo.componentStack,
    context: { reactError: true },
  });
}

// Network error helper
export function reportNetworkError(error: Error, context: { url: string; method: string; status?: number }) {
  return errorService.report(error, {
    level: 'medium',
    category: 'network',
    context,
  });
}

// Validation error helper
export function reportValidationError(error: Error, context: { field: string; value: any }) {
  return errorService.report(error, {
    level: 'low',
    category: 'validation',
    context,
  });
}

// Auth error helper
export function reportAuthError(error: Error, context: { action: string; user?: string }) {
  return errorService.report(error, {
    level: 'high',
    category: 'auth',
    context,
  });
}

export default errorService;