// Enhanced logging system for production
interface LogContext {
  requestId?: string;
  userId?: string;
  matchId?: string;
  tournamentId?: string;
  [key: string]: any;
}

export class Logger {
  static logInfo(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      message,
      ...context
    };
    
    if (process.env.NODE_ENV === 'production') {
      // In production, use structured logging
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use readable format
      console.log(`[INFO] ${timestamp} - ${message}`, context ? `Context: ${JSON.stringify(context)}` : '');
    }
  }

  static logError(message: string, error?: Error, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      error: error?.message,
      stack: error?.stack,
      ...context
    };
    
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.error(`[ERROR] ${timestamp} - ${message}`, error, context ? `Context: ${JSON.stringify(context)}` : '');
    }
  }

  static logWarn(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'WARN',
      message,
      ...context
    };
    
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.warn(`[WARN] ${timestamp} - ${message}`, context ? `Context: ${JSON.stringify(context)}` : '');
    }
  }
}