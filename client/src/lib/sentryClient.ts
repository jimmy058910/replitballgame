/**
 * SENTRY FRONTEND ERROR MONITORING
 * Client-side error tracking with session replay
 */

import * as Sentry from "@sentry/react";

export class SentryClient {
  private static initialized = false;

  /**
   * Initialize Sentry for frontend error monitoring
   * Must be called in main.tsx before React renders
   */
  static initialize(): void {
    if (this.initialized) {
      console.log('🔍 [SENTRY] Frontend already initialized');
      return;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN_FRONTEND;
    
    if (!dsn) {
      console.log('⚠️ [SENTRY] Frontend DSN not found - error monitoring disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false, // Show actual text in replays for debugging
            blockAllMedia: true, // Block images/videos for privacy
          }),
        ],
        
        // Performance monitoring
        tracesSampleRate: 0.1, // 10% sampling
        
        // Session replay
        replaysSessionSampleRate: 0.1, // 10% of normal sessions
        replaysOnErrorSampleRate: 1.0, // 100% of error sessions
        
        // Environment
        environment: import.meta.env.MODE || 'development',
        
        // Release tracking
        release: '1.0.0',
        
        // Filter noise
        beforeSend(event) {
          // Skip development errors
          if (import.meta.env.MODE === 'development') {
            console.log('🔍 [SENTRY] Development error captured:', event);
            return null;
          }
          
          // Skip common React hydration errors
          if (event.exception?.values?.[0]?.value?.includes('Hydration')) {
            return null;
          }
          
          return event;
        }
      });

      this.initialized = true;
      console.log('✅ [SENTRY] Frontend error monitoring initialized');
      
    } catch (error) {
      console.error('❌ [SENTRY] Frontend initialization failed:', error);
    }
  }

  /**
   * Capture an exception manually
   */
  static captureException(error: Error, context?: any): void {
    if (!this.initialized) return;
    
    Sentry.captureException(error, {
      tags: {
        component: 'frontend',
        service: 'realm-rivalry'
      },
      extra: context
    });
  }

  /**
   * Set user context for error tracking
   */
  static setUser(user: { id: string; email?: string; teamName?: string }): void {
    if (!this.initialized) return;
    
    Sentry.setUser(user);
  }

  /**
   * Add breadcrumb for debugging context
   */
  static addBreadcrumb(message: string, category: string, data?: any): void {
    if (!this.initialized) return;
    
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Track custom events
   */
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) return;
    
    Sentry.captureMessage(message, level);
  }
}

// React Error Boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;