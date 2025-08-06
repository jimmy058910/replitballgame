/**
 * Optimized Dashboard Component
 * Uses lazy loading and caching for better performance
 */
import React, { memo, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLazySection } from '@/utils/lazyLoading';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

// Lazy load dashboard sections
// @ts-expect-error TS2307
const LazyRecentMatches = lazy(() => import('./DashboardSections/RecentMatches'));
// @ts-expect-error TS2307
const LazyTeamOverview = lazy(() => import('./DashboardSections/TeamOverview'));
// @ts-expect-error TS2307
const LazyUpcomingGames = lazy(() => import('./DashboardSections/UpcomingGames'));
// @ts-expect-error TS2307
const LazyTournaments = lazy(() => import('./DashboardSections/Tournaments'));
// @ts-expect-error TS2307
const LazyNotifications = lazy(() => import('./DashboardSections/Notifications'));
// @ts-expect-error TS2307
const LazyQuickActions = lazy(() => import('./DashboardSections/QuickActions'));

interface OptimizedDashboardProps {
  className?: string;
}

const DashboardSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }, (_, i) => (
      <Card key={i} className="bg-gray-800 border-gray-700">
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

const OptimizedDashboard: React.FC<OptimizedDashboardProps> = memo(({ className = '' }) => {
  // Lazy load sections as they come into view
  const teamOverviewRef = useLazySection(() => console.log('Team overview loaded'));
  const recentMatchesRef = useLazySection(() => console.log('Recent matches loaded'));
  const upcomingGamesRef = useLazySection(() => console.log('Upcoming games loaded'));
  const tournamentsRef = useLazySection(() => console.log('Tournaments loaded'));
  const notificationsRef = useLazySection(() => console.log('Notifications loaded'));
  const quickActionsRef = useLazySection(() => console.log('Quick actions loaded'));

  // Use optimized queries for dashboard data
  const { data: dashboardData, isLoading } = useOptimizedQuery({
    endpoint: '/api/dashboard',
    staleTime: 30 * 1000, // 30 seconds for real-time feel
    cacheTime: 2 * 60 * 1000, // 2 minutes
    tags: ['dashboard'],
  });

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-900 text-white p-6 ${className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Welcome back, Coach!</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-green-400 border-green-400">
              Season 0 • Day 6
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              Regular Season
            </Badge>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Overview - Full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2" ref={teamOverviewRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyTeamOverview />
            </Suspense>
          </div>

          {/* Quick Actions - 1/3 width on desktop */}
          <div className="lg:col-span-1" ref={quickActionsRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyQuickActions />
            </Suspense>
          </div>

          {/* Recent Matches */}
          <div className="lg:col-span-1" ref={recentMatchesRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyRecentMatches />
            </Suspense>
          </div>

          {/* Upcoming Games */}
          <div className="lg:col-span-1" ref={upcomingGamesRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyUpcomingGames />
            </Suspense>
          </div>

          {/* Tournaments */}
          <div className="lg:col-span-1" ref={tournamentsRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyTournaments />
            </Suspense>
          </div>

          {/* Notifications - Full width */}
          <div className="lg:col-span-3" ref={notificationsRef}>
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyNotifications />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';

export default OptimizedDashboard;