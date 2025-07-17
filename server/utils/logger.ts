/**
 * Environment-aware logging utility
 * Prevents sensitive data exposure in production
 */

const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data);
    }
    // In production, this would send to error tracking service
  },
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(message, error);
    }
    // In production, send to error tracking service like Sentry
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, data);
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(message, data);
    }
  }
};

export default logger;