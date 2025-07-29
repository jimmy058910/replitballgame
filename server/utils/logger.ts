/**
 * An environment-aware logging utility.
 * - debug logs only show in 'development'.
 * - info and warn logs are suppressed in 'production' to reduce noise.
 * - error logs show in all environments.
 */
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[INFO]', message, data || '');
    }
  },
  error: (message: string, error?: any) => {
    // Errors should always be logged
    console.error('[ERROR]', message, error || '');
    // In a real production app, you would send this to a service like Sentry here
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[WARN]', message, data || '');
    }
  },
};

export default logger;