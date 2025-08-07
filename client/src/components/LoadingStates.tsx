/**
 * Loading States Component Library
 * Provides consistent loading UI patterns throughout the application
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Page-level loading spinner
export const PageLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-gray-400 text-lg">{message}</p>
    </div>
  </div>
);

// Component-level loading spinner
export const ComponentLoader: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}> = ({ size = 'md', message, className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mx-auto ${message ? 'mb-2' : ''}`} />
        {message && <p className="text-gray-400 text-sm">{message}</p>}
      </div>
    </div>
  );
};

// Player card skeleton
export const PlayerCardSkeleton: React.FC = () => (
  <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Team overview skeleton
export const TeamOverviewSkeleton: React.FC = () => (
  <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Match card skeleton
export const MatchCardSkeleton: React.FC = () => (
  <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <Skeleton className="h-5 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="text-center">
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// List skeleton for large datasets
export const ListSkeleton: React.FC<{ 
  items?: number;
  variant?: 'player' | 'match' | 'team' | 'generic';
}> = ({ items = 6, variant = 'generic' }) => {
  const skeletonComponents = {
    player: PlayerCardSkeleton,
    match: MatchCardSkeleton,
    team: TeamOverviewSkeleton,
    generic: () => (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  };

  const SkeletonComponent = skeletonComponents[variant];

  return (
    <div className="space-y-4">
      {Array.from({ length: items }, (_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
};

// Loading state for forms
export const FormLoader: React.FC<{ message?: string }> = ({ message = "Submitting..." }) => (
  <div className="flex items-center justify-center py-4">
    <div className="flex items-center space-x-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-gray-400">{message}</span>
    </div>
  </div>
);

// Loading state for buttons
export const ButtonLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return <Loader2 className={`${sizeClasses[size]} animate-spin`} />;
};

// Network status indicator
export const NetworkStatus: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
  <div className="flex items-center space-x-2 text-sm">
    {isOnline ? (
      <>
        <Wifi className="w-4 h-4 text-green-400" />
        <span className="text-green-400">Online</span>
      </>
    ) : (
      <>
        <WifiOff className="w-4 h-4 text-red-400" />
        <span className="text-red-400">Offline</span>
      </>
    )}
  </div>
);

// Loading state for data tables
export const TableLoader: React.FC<{ 
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: columns }, (_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Infinite scroll loader
export const InfiniteScrollLoader: React.FC<{ hasMore: boolean }> = ({ hasMore }) => (
  <div className="flex justify-center py-8">
    {hasMore ? (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-gray-400">Loading more...</span>
      </div>
    ) : (
      <div className="text-sm text-gray-500">No more items to load</div>
    )}
  </div>
);

// Retry loading state
export const RetryLoader: React.FC<{ 
  onRetry: () => void;
  message?: string;
  isRetrying?: boolean;
}> = ({ onRetry, message = "Failed to load", isRetrying = false }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="text-center mb-4">
      <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-400">{message}</p>
    </div>
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
    >
      {isRetrying ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
    </button>
  </div>
);

// Progressive loading indicator
export const ProgressiveLoader: React.FC<{ 
  steps: string[];
  currentStep: number;
}> = ({ steps, currentStep }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
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

// Export all loading components
export default {
  PageLoader,
  ComponentLoader,
  PlayerCardSkeleton,
  TeamOverviewSkeleton,
  MatchCardSkeleton,
  ListSkeleton,
  FormLoader,
  ButtonLoader,
  NetworkStatus,
  TableLoader,
  InfiniteScrollLoader,
  RetryLoader,
  ProgressiveLoader,
};