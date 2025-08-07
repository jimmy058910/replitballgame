/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling with user-friendly fallbacks
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      tags: { component: 'ErrorBoundary' },
      contexts: { 
        errorInfo: {
          componentStack: errorInfo.componentStack
        }
      },
      level: 'error'
    });
    
    // Log error details for debugging
    this.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      Sentry.addBreadcrumb({
        message: 'ErrorBoundary caught error (development)',
        category: 'error',
        level: 'error',
        data: {
          errorMessage: error.message,
          componentStack: errorInfo.componentStack.substring(0, 1000),
          url: window.location.href,
          timestamp: errorData.timestamp
        }
      });
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      // sendErrorToService(errorData);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount >= 3) {
      Sentry.captureMessage('Max retry attempts reached', 'warning');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Auto-retry after a delay if this is a component-level error
    if (this.props.level === 'component' && this.state.retryCount < 2) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1));
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Open email client with pre-filled bug report
    const mailto = `mailto:support@realmrivalry.com?subject=Bug Report - ${this.state.errorId}&body=${encodeURIComponent(
      `Error Details:\n${JSON.stringify(errorReport, null, 2)}\n\nPlease describe what you were doing when this error occurred:`
    )}`;
    
    window.open(mailto);
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Different error UIs based on error level
      const { level = 'component' } = this.props;
      
      if (level === 'critical') {
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-red-900/20 border-red-800">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-red-400">Critical Error</CardTitle>
                <CardDescription className="text-red-300">
                  A critical error has occurred. Please refresh the page or contact support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge variant="destructive" className="mb-2">
                    Error ID: {this.state.errorId}
                  </Badge>
                  <p className="text-sm text-gray-400">
                    {this.state.error?.message}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => window.location.reload()} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                  <Button variant="ghost" onClick={this.handleReportBug} className="w-full">
                    <Bug className="w-4 h-4 mr-2" />
                    Report Bug
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <Card className="max-w-lg w-full bg-gray-800 border-gray-700">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Page Error</CardTitle>
                <CardDescription>
                  Something went wrong loading this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">
                    Error ID: {this.state.errorId}
                  </Badge>
                  <p className="text-sm text-gray-400">
                    {this.state.error?.message}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Component-level error (default)
      return (
        <Card className="bg-gray-800 border-gray-700 border-dashed">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-200">Component Error</h3>
              <p className="text-sm text-gray-400 mt-1">
                This section couldn't load properly.
              </p>
            </div>
            
            <div className="mb-4">
              <Badge variant="outline" className="text-xs mb-2">
                {this.state.errorId}
              </Badge>
              <p className="text-xs text-gray-500">
                {this.state.error?.message}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={this.handleReportBug}
              >
                <Bug className="w-3 h-3 mr-1" />
                Report
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;