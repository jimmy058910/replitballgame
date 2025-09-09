import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Player } from '@shared/types/models';


/**
 * Unified Loading States Components
 * Consolidates LoadingStates, EnhancedLoadingWrapper, and various skeleton components
 */

// Spinner Component
export const Spinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-b-2 border-primary-500',
        sizeClasses[size]
      )} />
    </div>
  );
};

// Full Page Loading
export const FullPageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-400">{message}</p>
      </div>
    </div>
  );
};

// Card Loading Skeleton
export const CardSkeleton: React.FC<{ 
  lines?: number;
  showHeader?: boolean;
  className?: string;
}> = ({ lines = 3, showHeader = true, className }) => {
  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg p-4', className)}>
      {showHeader && (
        <div className="mb-4">
          <Skeleton className="h-6 w-1/3 bg-gray-700" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4 bg-gray-700',
              i === lines - 1 && 'w-3/4'
            )} 
          />
        ))}
      </div>
    </div>
  );
};

// Player Card Skeleton
export const PlayerCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg p-4', className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full bg-gray-700" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3 bg-gray-700" />
          <Skeleton className="h-4 w-1/2 bg-gray-700" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-16 bg-gray-700" />
            <Skeleton className="h-6 w-16 bg-gray-700" />
            <Skeleton className="h-6 w-16 bg-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Match Card Skeleton
export const MatchCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24 bg-gray-700" />
        <Skeleton className="h-6 w-20 bg-gray-700" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 bg-gray-700 mb-2" />
          <Skeleton className="h-8 w-12 bg-gray-700" />
        </div>
        <Skeleton className="h-4 w-8 bg-gray-700 mx-4" />
        <div className="flex-1 text-right">
          <Skeleton className="h-5 w-32 bg-gray-700 mb-2 ml-auto" />
          <Skeleton className="h-8 w-12 bg-gray-700 ml-auto" />
        </div>
      </div>
    </div>
  );
};

// Table Skeleton
export const TableSkeleton: React.FC<{ 
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}> = ({ rows = 5, columns = 4, showHeader = true, className }) => {
  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg overflow-hidden', className)}>
      {showHeader && (
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className="flex justify-between">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20 bg-gray-700" />
            ))}
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex justify-between">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={cn(
                  'h-4 bg-gray-700',
                  colIndex === 0 ? 'w-32' : 'w-20'
                )} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// List Skeleton
export const ListSkeleton: React.FC<{ 
  items?: number;
  className?: string;
}> = ({ items = 5, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/3 bg-gray-700" />
            <Skeleton className="h-4 w-20 bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Stats Grid Skeleton
export const StatsGridSkeleton: React.FC<{ 
  items?: number;
  className?: string;
}> = ({ items = 4, className }) => {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <Skeleton className="h-8 w-16 bg-gray-700 mx-auto mb-2" />
          <Skeleton className="h-4 w-24 bg-gray-700 mx-auto" />
        </div>
      ))}
    </div>
  );
};

// Loading Wrapper Component
export const LoadingWrapper: React.FC<{
  isLoading: boolean;
  error?: Error | null;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ isLoading, error, skeleton, children, className }) => {
  if (error) {
    return (
      <div className={cn('bg-red-900/20 border border-red-700 rounded-lg p-4', className)}>
        <p className="text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return <>{skeleton || <CardSkeleton />}</>;
  }

  return <>{children}</>;
};

// Inline Loading Indicator
export const InlineLoading: React.FC<{ 
  text?: string;
  className?: string;
}> = ({ text = 'Loading...', className }) => {
  return (
    <div className={cn('flex items-center gap-2 text-gray-400', className)}>
      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary-500" />
      <span className="text-sm">{text}</span>
    </div>
  );
};

// Button Loading State
export const ButtonLoading: React.FC<{ 
  text?: string;
  className?: string;
}> = ({ text = 'Processing...', className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
      <span>{text}</span>
    </div>
  );
};