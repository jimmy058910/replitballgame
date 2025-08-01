import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/providers/AuthProvider";
import { useDevAuth } from "@/providers/DevAuthProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { DevAuthProvider } from "@/providers/DevAuthProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import SuperUser from "@/pages/SuperUser";
import HelpManual from "@/pages/HelpManual";
import { WebSocketTestPage } from "@/components/WebSocketTestPage";
import { LiveMatchTest } from "@/pages/LiveMatchTest";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// React imports
import { lazy, Suspense } from "react";

// Lazy-loaded components for better performance
import { 
  LazyTeam,
  LazyMarket,
  LazyWorld,
  LazyLiveMatch,
  LazyCommunity,
  LazyTournamentStatus
} from "@/utils/lazyLoading";

import { ContextualHelp } from "@/components/help";
// Removed LandscapeOrientation - mobile-first design supports vertical mode per UI/UX documents
import ErrorBoundary from "@/components/ErrorBoundary";

// Direct imports for testing - bypassing lazy loading
import Dashboard from "@/pages/Dashboard";

// New 5-Hub Architecture Components with error handling - Dashboard routes to DramaticTeamHQ
const LazyDashboard = lazy(() => import("@/pages/Dashboard").catch(() => ({ default: () => <div>Loading Team HQ...</div> })));
const LazyRosterHQ = lazy(() => import("@/pages/RosterHQ").catch((error) => {
  console.error('Failed to load RosterHQ:', error);
  return { default: () => <div>Error loading Roster HQ: {error.message}</div> };
}));
const LazyCompetitionCenter = lazy(() => import("@/pages/CompetitionCenter").catch(() => ({ default: () => <div>Loading Competition Center...</div> })));
const LazyMarketDistrict = lazy(() => import("@/pages/MarketDistrict").catch(() => ({ default: () => <div>Loading Market District...</div> })));
const LazyCommunityPortal = lazy(() => import("@/pages/CommunityPortal").catch(() => ({ default: () => <div>Loading Community Portal...</div> })));
const LazyTacticsPage = lazy(() => import("@/pages/TacticsPage").catch(() => ({ default: () => <div>Loading Tactics...</div> })));

function Router() {
  const isDevelopment = import.meta.env.DEV;
  
  // Use only the appropriate auth hook based on environment
  const auth = isDevelopment ? useDevAuth() : useAuth();
  const { isAuthenticated, isLoading } = auth;

  // Debug authentication state
  console.log('🔍 Router - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'environment:', isDevelopment ? 'development' : 'production');

  return (
    <Switch>
      {/* Help manual accessible to everyone */}
      <Route path="/help" component={HelpManual} />
      {isLoading ? (
        /* Show loading state while checking authentication */
        <Route path="/" component={() => (
          <div className="min-h-screen bg-gradient-to-br from-[#1a1b3e] via-[#1a1b3e] to-slate-900 flex items-center justify-center">
            <div className="text-white text-2xl">🔄 Checking authentication...</div>
          </div>
        )} />
      ) : !isAuthenticated ? (
        /* Show landing page only if definitely not authenticated */
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Team HQ Dashboard - Routes to DramaticTeamHQ */}
          <Route path="/" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 animate-pulse" />}>
              <LazyDashboard />
            </Suspense>
          )} />
          <Route path="/team" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 animate-pulse" />}>
              <LazyDashboard />
            </Suspense>
          )} />
          <Route path="/roster-hq" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 animate-pulse flex items-center justify-center"><div className="text-white text-xl">Loading Roster HQ...</div></div>}>
              <LazyRosterHQ />
            </Suspense>
          )} />

          <Route path="/competition" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gray-900 animate-pulse" />}>
              <LazyCompetitionCenter />
            </Suspense>
          )} />
          <Route path="/market" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gray-900 animate-pulse" />}>
              <LazyMarketDistrict />
            </Suspense>
          )} />
          <Route path="/community" component={() => (
            <Suspense fallback={<div className="min-h-screen bg-gray-900 animate-pulse" />}>
              <LazyCommunityPortal />
            </Suspense>
          )} />
          
          {/* Legacy routes - maintain for backwards compatibility */}
          <Route path="/world" component={LazyWorld} />
          
          {/* Live Match System */}
          <Route path="/live-match/:matchId" component={LazyLiveMatch} />
          {/* Legacy match routes redirect to live-match for backwards compatibility */}
          <Route path="/text-match/:matchId" component={LazyLiveMatch} />
          <Route path="/match/:matchId" component={LazyLiveMatch} />
          

          
          {/* System Management */}
          <Route path="/superuser" component={SuperUser} />
          <Route path="/websocket-test" component={WebSocketTestPage} />
          <Route path="/live-match-test" component={LiveMatchTest} />
          <Route path="/tournament-status" component={LazyTournamentStatus} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Use DevAuthProvider for development to bypass Firebase authentication
  const isDevelopment = import.meta.env.DEV;
  
  const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isDevelopment) {
      return <DevAuthProvider>{children}</DevAuthProvider>;
    }
    return <AuthProvider>{children}</AuthProvider>;
  };

  return (
    <AuthWrapper>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary level="critical">
            <div className="min-h-screen bg-background">
              <ErrorBoundary level="page">
                <Router />
              </ErrorBoundary>
              <Toaster />
              <PWAInstallPrompt />
              <ContextualHelp />
            </div>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthWrapper>
  );
}

export default App;