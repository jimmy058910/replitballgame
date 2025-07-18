/**
 * Lazy Loading Utilities
 * Centralized lazy loading for better code splitting
 */
import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading component for lazy-loaded routes
 */
export const PageLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

/**
 * Component loading spinner for smaller components
 */
export const ComponentLoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
    </div>
  );
};

/**
 * Wrapper for lazy-loaded components with error boundaries
 */
export const withLazyLoading = <P extends {}>(
  Component: ComponentType<P>,
  LoadingComponent: ComponentType = PageLoadingSpinner
) => {
  return (props: P) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Lazy load a page component
 */
export const lazyLoadPage = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  const LazyComponent = lazy(importFunc);
  return withLazyLoading(LazyComponent, PageLoadingSpinner);
};

/**
 * Lazy load a component with custom loading
 */
export const lazyLoadComponent = (
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  LoadingComponent: ComponentType = ComponentLoadingSpinner
) => {
  const LazyComponent = lazy(importFunc);
  return withLazyLoading(LazyComponent, LoadingComponent);
};

/**
 * Preload a lazy component
 */
export const preloadComponent = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  // Trigger the import but don't wait for it
  importFunc().catch(console.error);
};

/**
 * Lazy-loaded page components
 */
export const LazyDashboard = lazyLoadPage(() => import('../pages/Dashboard'));
export const LazyTeamHub = lazyLoadPage(() => import('../pages/TeamHub'));
export const LazyMarketplace = lazyLoadPage(() => import('../pages/Marketplace'));
export const LazyCompetition = lazyLoadPage(() => import('../pages/Competition'));
export const LazyWorld = lazyLoadPage(() => import('../pages/World'));
export const LazyStore = lazyLoadPage(() => import('../pages/Store'));
export const LazyLiveMatch = lazyLoadPage(() => import('../pages/LiveMatch'));
export const LazySettings = lazyLoadPage(() => import('../pages/Settings'));

/**
 * Lazy-loaded component variants
 */
export const LazyRosterManager = lazyLoadComponent(() => import('../components/RosterManager'));
export const LazyTournamentBracket = lazyLoadComponent(() => import('../components/TournamentBracket'));
export const LazyPlayerStatsModal = lazyLoadComponent(() => import('../components/PlayerStatsModal'));
export const LazyMatchHistoryTable = lazyLoadComponent(() => import('../components/MatchHistoryTable'));
export const LazyMarketplaceListings = lazyLoadComponent(() => import('../components/MarketplaceListings'));

/**
 * Bundle analysis utilities
 */
export const logBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle chunks loaded:', performance.getEntriesByType('navigation'));
  }
};

/**
 * Intersection Observer for lazy loading sections
 */
export const useLazySection = (callback: () => void, options = { threshold: 0.1 }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      options
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
};

export default {
  lazyLoadPage,
  lazyLoadComponent,
  preloadComponent,
  withLazyLoading,
};