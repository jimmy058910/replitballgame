/**
 * Enhanced Loading Wrapper Component
 * Provides intelligent loading states with error handling and retry mechanisms
 */
import React, { ReactNode, Suspense, lazy, useState, useEffect } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';
import { ComponentLoader, PageLoader, RetryLoader } from './LoadingStates';
import { useLoadingState } from '@/hooks/useLoadingState';
import { errorService } from '@/services/errorService';

interface EnhancedLoadingWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  enableRetry?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  minLoadTime?: number;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => Promise<void>;
  showProgress?: boolean;
  progressSteps?: string[];
}

export const EnhancedLoadingWrapper: React.FC<EnhancedLoadingWrapperProps> = ({
  children,
  fallback,
  level = 'component',
  enableRetry = true,
  loadingMessage = 'Loading...',
  errorMessage = 'Something went wrong',
  minLoadTime = 500,
  maxRetries = 3,
  onError,
  onRetry,
  showProgress = false,
  progressSteps = [],
}) => {
  const [isMinLoadTimeMet, setIsMinLoadTimeMet] = useState(false);
  const loadingState = useLoadingState({
    retryConfig: {
      maxRetries,
      retryDelay: 1000,
      exponentialBackoff: true,
    },
    onError: (error) => {
      errorService.report(error, {
        level: level === 'critical' ? 'critical' : level === 'page' ? 'high' : 'medium',
        category: 'runtime',
        context: { component: 'EnhancedLoadingWrapper', level },
      });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinLoadTimeMet(true);
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime]);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    loadingState.setError(error, errorMessage);
    if (onError) {
      onError(error, errorInfo);
    }
  };

  const handleRetry = async () => {
    if (onRetry) {
      await loadingState.execute(onRetry);
    } else {
      loadingState.retry();
    }
  };

  const getLoadingComponent = () => {
    if (level === 'page') {
      return <PageLoader message={loadingMessage} />;
    }
    return <ComponentLoader message={loadingMessage} />;
  };

  const getErrorComponent = () => {
    if (enableRetry && loadingState.canRetry) {
      return (
        <RetryLoader
          onRetry={handleRetry}
          message={errorMessage}
          isRetrying={loadingState.isRetrying}
        />
      );
    }
    return null;
  };

  const effectiveFallback = fallback || getLoadingComponent();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          level={level}
          onError={handleError}
          fallback={loadingState.isError ? getErrorComponent() : undefined}
        >
          <Suspense fallback={effectiveFallback}>
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

// HOC for wrapping components with enhanced loading
export function withEnhancedLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<EnhancedLoadingWrapperProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => (
    <EnhancedLoadingWrapper {...options}>
      <Component {...props} />
    </EnhancedLoadingWrapper>
  );

  WrappedComponent.displayName = `withEnhancedLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Lazy loading with enhanced error handling
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: Omit<EnhancedLoadingWrapperProps, 'children'> = {}
) {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <EnhancedLoadingWrapper {...options}>
      {/* */}
      <LazyComponent {...props} />
    </EnhancedLoadingWrapper>
  );
}

// Smart loading component that adapts to content type
export const SmartLoader: React.FC<{
  isLoading: boolean;
  error?: Error | null;
  data?: any;
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  level?: 'page' | 'component';
  minLoadTime?: number;
  enableRetry?: boolean;
  onRetry?: () => Promise<void> | void;
}> = ({
  isLoading,
  error,
  data,
  children,
  fallback,
  errorFallback,
  emptyFallback,
  loadingMessage = 'Loading...',
  errorMessage = 'Something went wrong',
  emptyMessage = 'No data available',
  level = 'component',
  minLoadTime = 500,
  enableRetry = true,
  onRetry,
}) => {
  const [isMinLoadTimeMet, setIsMinLoadTimeMet] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsMinLoadTimeMet(false);
      const timer = setTimeout(() => {
        setIsMinLoadTimeMet(true);
      }, minLoadTime);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minLoadTime]);

  // Show loading state
  if (isLoading && !isMinLoadTimeMet) {
    return (
      <div className="animate-pulse">
        {fallback || (level === 'page' ? <PageLoader message={loadingMessage} /> : <ComponentLoader message={loadingMessage} />)}
      </div>
    );
  }

  // Show error state
  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    
    return (
      <EnhancedLoadingWrapper
        level={level}
        enableRetry={enableRetry}
        errorMessage={errorMessage}
        onRetry={onRetry}
      >
        {children}
      </EnhancedLoadingWrapper>
    );
  }

  // Show empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyFallback) {
      return <>{emptyFallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📭</div>
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Show content
  return <>{children}</>;
};

// Progressive loading component
export const ProgressiveLoader: React.FC<{
  steps: string[];
  currentStep: number;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => Promise<void> | void;
}> = ({ steps, currentStep, isLoading, error, onRetry }) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center mb-4">
          <div className="text-red-400 text-2xl mb-2">⚠️</div>
          <p className="text-red-400 mb-2">Loading failed</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-green-400 text-2xl mb-2">✅</div>
          <p className="text-green-400">Loading complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div className="space-y-2 w-full max-w-md">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              index < currentStep ? 'bg-green-400' : 
              index === currentStep ? 'bg-primary animate-pulse' : 
              'bg-gray-600'
            }`} />
            <span className={`text-sm ${
              index <= currentStep ? 'text-white' : 'text-gray-400'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedLoadingWrapper;