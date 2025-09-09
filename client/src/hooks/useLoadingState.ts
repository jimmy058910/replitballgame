/**
 * Enhanced Loading State Management Hook
 * Provides comprehensive loading state management with error handling
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface LoadingStateOptions {
  defaultState?: 'idle' | 'loading' | 'success' | 'error';
  timeout?: number;
  autoReset?: boolean;
  resetDelay?: number;
  onStateChange?: (state: LoadingState) => void;
  onError?: (error: Error) => void;
  onSuccess?: (data?: any) => void;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

export interface LoadingState {
  state: 'idle' | 'loading' | 'success' | 'error';
  error: Error | null;
  data: any;
  retryCount: number;
  isRetrying: boolean;
  canRetry: boolean;
  progress?: number;
  message?: string;
  timestamp: number;
}

export function useLoadingState(options: LoadingStateOptions = {}) {
  const {
    defaultState = 'idle',
    timeout = 30000,
    autoReset = false,
    resetDelay = 3000,
    onStateChange,
    onError,
    onSuccess,
    retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
    },
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    state: defaultState,
    error: null,
    data: null,
    retryCount: 0,
    isRetrying: false,
    canRetry: true,
    timestamp: Date.now(),
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Update loading state with side effects
  const updateState = useCallback((updates: Partial<LoadingState>) => {
    setLoadingState(prev => {
      const newState = {
        ...prev,
        ...updates,
        timestamp: Date.now(),
      };
      
      // Call state change callback
      if (onStateChange) {
        onStateChange(newState);
      }
      
      return newState;
    });
  }, [onStateChange]);

  // Set loading state
  const setLoading = useCallback((message?: string, progress?: number) => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    updateState({
      state: 'loading',
      error: null,
      message,
      progress,
      isRetrying: false,
    });

    // Set timeout for loading state
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        updateState({
          state: 'error',
          error: new Error('Request timeout'),
          message: 'Request took too long',
        });
      }, timeout);
    }
  }, [updateState, timeout]);

  // Set success state
  const setSuccess = useCallback((data?: any, message?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    updateState({
      state: 'success',
      error: null,
      data,
      message,
      retryCount: 0,
      isRetrying: false,
    });

    // Call success callback
    if (onSuccess) {
      onSuccess(data);
    }

    // Auto-reset if enabled
    if (autoReset) {
      resetTimeoutRef.current = setTimeout(() => {
        updateState({
          state: 'idle',
          error: null,
          data: null,
          message: undefined,
        });
      }, resetDelay);
    }
  }, [updateState, onSuccess, autoReset, resetDelay]);

  // Set error state
  const setError = useCallback((error: Error, message?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const canRetry = loadingState.retryCount < retryConfig.maxRetries;

    updateState({
      state: 'error',
      error,
      message: message || error.message,
      canRetry,
      isRetrying: false,
    });

    // Call error callback
    if (onError) {
      onError(error);
    }
  }, [loadingState.retryCount, retryConfig.maxRetries, updateState, onError]);

  // Reset to idle state
  const reset = useCallback(() => {
    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    updateState({
      state: 'idle',
      error: null,
      data: null,
      retryCount: 0,
      isRetrying: false,
      canRetry: true,
      progress: undefined,
      message: undefined,
    });
  }, [updateState]);

  // Retry mechanism
  const retry = useCallback(async (retryFn?: () => Promise<any>) => {
    if (!loadingState.canRetry || loadingState.isRetrying) {
      return;
    }

    const retryCount = loadingState.retryCount + 1;
    const delay = retryConfig.exponentialBackoff
      ? retryConfig.retryDelay * Math.pow(2, retryCount - 1)
      : retryConfig.retryDelay;

    updateState({
      isRetrying: true,
      retryCount,
      message: `Retrying... (${retryCount}/${retryConfig.maxRetries})`,
    });

    retryTimeoutRef.current = setTimeout(async () => {
      try {
        if (retryFn) {
          setLoading(`Retrying... (${retryCount}/${retryConfig.maxRetries})`);
          const result = await retryFn();
          setSuccess(result);
        } else {
          updateState({
            state: 'idle',
            isRetrying: false,
          });
        }
      } catch (error) {
        setError(error as Error);
      }
    }, delay);
  }, [loadingState.canRetry, loadingState.isRetrying, loadingState.retryCount, retryConfig, updateState, setLoading, setSuccess, setError]);

  // Async operation wrapper
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      message?: string;
      successMessage?: string;
      errorMessage?: string;
      invalidateQueries?: string[];
    }
  ): Promise<T | null> => {
    try {
      setLoading(options?.message);
      const result = await operation();
      
      // Invalidate queries if specified
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
      
      setSuccess(result, options?.successMessage);
      return result;
    } catch (error) {
      setError(error as Error, options?.errorMessage);
      return null;
    }
  }, [setLoading, setSuccess, setError, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...loadingState,
    setLoading,
    setSuccess,
    setError,
    reset,
    retry,
    execute,
    isIdle: loadingState.state === 'idle',
    isLoading: loadingState.state === 'loading',
    isSuccess: loadingState.state === 'success',
    isError: loadingState.state === 'error',
  };
}

// Hook for managing multiple loading states
export function useMultipleLoadingStates<T extends string>(
  keys: T[],
  options: LoadingStateOptions = {}
) {
  const states = keys.reduce((acc: any, key: any) => {
    acc[key] = useLoadingState(options);
    return acc;
  }, {} as Record<T, ReturnType<typeof useLoadingState>>);
  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const isAnyError = Object.values(states).some(state => state.isError);
  const isAllSuccess = Object.values(states).every(state => state.isSuccess);

  const resetAll = useCallback(() => {
    Object.values(states).forEach(state => state.reset());
  }, [states]);

  return {
    states,
    isAnyLoading,
    isAnyError,
    isAllSuccess,
    resetAll,
  };
}

// Progress tracking hook
export function useProgressTracking(steps: string[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, steps.length - 1)));
  }, [steps.length]);

  const completeStep = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  const progress = Math.round((currentStep / (steps.length - 1)) * 100);

  return {
    currentStep,
    completedSteps,
    nextStep,
    goToStep,
    completeStep,
    reset,
    progress,
    isComplete: currentStep === steps.length - 1,
    currentStepName: steps[currentStep],
  };
}

export default useLoadingState;