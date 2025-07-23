import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import LogoShowcase from "@/pages/LogoShowcase";
import SuperUser from "@/pages/SuperUser";
import HelpManual from "@/pages/HelpManual";
import { AdTest } from "@/pages/AdTest";
import { WebSocketTestPage } from "@/components/WebSocketTestPage";
// Removed obsolete checkout pages - functionality moved to Market District
import DomainDemo from "@/pages/DomainDemo";
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

import NewNavigation from "@/components/NewNavigation";
import { ContextualHelp } from "@/components/help";
// Removed LandscapeOrientation - mobile-first design supports vertical mode per UI/UX documents
import ErrorBoundary from "@/components/ErrorBoundary";

// Direct imports for testing - bypassing lazy loading
import Dashboard from "@/pages/Dashboard";
import RosterHQ from "@/pages/RosterHQ";

// New 5-Hub Architecture Components with error handling - Dashboard routes to DramaticTeamHQ
const LazyDashboard = lazy(() => import("@/pages/Dashboard").catch(() => ({ default: () => <div>Loading Team HQ...</div> })));
const LazyRosterHQ = lazy(() => import("@/pages/RosterHQ").catch((error) => {
  console.error('Failed to load RosterHQ:', error);
  return { default: () => <div>Error loading Roster HQ: {error.message}</div> };
}));
const LazyCompetitionCenter = lazy(() => import("@/pages/CompetitionCenter").catch(() => ({ default: () => <div>Loading Competition Center...</div> })));
const LazyMarketDistrict = lazy(() => import("@/pages/MarketDistrict").catch(() => ({ default: () => <div>Loading Market District...</div> })));
const LazyCommunityPortal = lazy(() => import("@/pages/CommunityPortal").catch(() => ({ default: () => <div>Loading Community Portal...</div> })));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/logos" component={LogoShowcase} />
      {/* Help manual accessible to everyone */}
      <Route path="/help" component={HelpManual} />
      {isLoading || !isAuthenticated ? (
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
          <Route path="/roster-hq" component={RosterHQ} />
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
          <Route path="/ad-test" component={AdTest} />
          <Route path="/websocket-test" component={WebSocketTestPage} />
          <Route path="/tournament-status" component={LazyTournamentStatus} />
          <Route path="/domain-demo" component={DomainDemo} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary level="critical">
          <div className="min-h-screen bg-background">
            <NewNavigation />
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
  );
}

export default App;