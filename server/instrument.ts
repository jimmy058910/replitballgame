/**
 * SENTRY INSTRUMENTATION
 * Must be imported FIRST in the application for complete error monitoring
 */

import * as Sentry from "@sentry/node";

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: "https://b1d4788a9550a14dcbe39765cfadc400@o4509793819361280.ingest.us.sentry.io/4509793860911104",
  
  // Send PII data for better debugging
  sendDefaultPii: true,
  
  // Performance monitoring - conservative sampling for free tier
  tracesSampleRate: 0.1, // 10% sampling
  
  // Environment detection
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.npm_package_version || '1.0.0',
  
  // Filter out noise in development
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SENTRY] Error captured:', event.exception?.values?.[0]?.value);
    }
    
    // Skip 404 errors and other common noise
    if (event.exception?.values?.[0]?.type === 'NotFoundError') {
      return null;
    }
    
    return event;
  }
});

// Sentry is automatically available globally after initialization

console.log('✅ [SENTRY] Backend instrumentation initialized');