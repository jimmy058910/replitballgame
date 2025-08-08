/**
 * SENTRY ERROR MONITORING SERVICE
 * Professional-grade error tracking for production debugging
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/node";

export class SentryService {
  private static initialized = false;

  /**
   * Initialize Sentry for backend error monitoring
   * Must be called before any other middleware
   */
  static initialize(): void {
    if (this.initialized) {
      console.log('🔍 [SENTRY] Already initialized, skipping...');
      return;
    }

    const dsn = process.env.SENTRY_DSN_BACKEND;
    
    if (!dsn) {
      console.log('⚠️ [SENTRY] Backend DSN not found - error monitoring disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        integrations: [
          nodeProfilingIntegration()
        ],
        // Performance monitoring
        tracesSampleRate: 0.1, // 10% sampling to conserve quota
        profilesSampleRate: 0.1, // 10% profiling
        
        // Environment
        environment: process.env.NODE_ENV || 'development',
        
        // Release tracking
        release: process.env.npm_package_version || '1.0.0',
        
        // Filter out common noise
        beforeSend(event) {
          // Skip 404 errors and other common non-critical errors
          if (event.exception?.values?.[0]?.type === 'NotFoundError') {
            return null;
          }
          return event;
        }
      });

      this.initialized = true;
      console.log('✅ [SENTRY] Backend error monitoring initialized');
      
    } catch (error) {
      console.error('❌ [SENTRY] Failed to initialize:', error);
    }
  }

  /**
   * Get Sentry request handler middleware
   */
  static getRequestHandler() {
    return Sentry.setupExpressErrorHandler;
  }

  /**
   * Get Sentry tracing handler middleware
   */
  static getTracingHandler() {
    return Sentry.setupExpressErrorHandler;
  }

  /**
   * Get Sentry error handler middleware
   */
  static getErrorHandler() {
    return Sentry.setupExpressErrorHandler;
  }

  /**
   * Manually capture an exception
   */
  static captureException(error: Error, context?: any): void {
    if (!this.initialized) return;
    
    Sentry.captureException(error, {
      tags: {
        component: 'backend',
        service: 'realm-rivalry'
      },
      extra: context
    });
  }

  /**
   * Capture a custom message
   */
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) return;
    
    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context for error tracking
   */
  static setUser(user: { id: string; email?: string }): void {
    if (!this.initialized) return;
    
    Sentry.setUser(user);
  }

  /**
   * Add breadcrumb for error context
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
}