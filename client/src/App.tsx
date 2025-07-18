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
import GemCheckout from "@/pages/gem-checkout";
import RealmPassCheckout from "@/pages/realm-pass-checkout";
import DomainDemo from "@/pages/DomainDemo";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// Lazy-loaded components for better performance
import { 
  LazyDashboard,
  LazyTeam,
  LazyCompetition,
  LazyMarket,
  LazyWorld,
  LazyInventory,
  LazyMarketplace,
  LazyStats,
  LazyLiveMatch,
  LazyLeague,
  LazyCommunity,
  LazyCamaraderie,
  LazyTournamentStatus
} from "@/utils/lazyLoading";

import Navigation from "@/components/Navigation";
import { ContextualHelp } from "@/components/help";
import { LandscapeOrientation } from "@/components/LandscapeOrientation";

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
          <Route path="/" component={LazyDashboard} />
          <Route path="/team" component={LazyTeam} />
          <Route path="/competition" component={LazyCompetition} />
          <Route path="/market" component={LazyMarket} />
          <Route path="/world" component={LazyWorld} />
          
          {/* Legacy routes - keep for backwards compatibility */}
          <Route path="/league" component={LazyLeague} />

          <Route path="/inventory" component={LazyInventory} />
          <Route path="/marketplace" component={LazyMarketplace} />

          <Route path="/stats" component={LazyStats} />
          
          {/* Consolidated match viewing route */}
          <Route path="/live-match/:matchId" component={LazyLiveMatch} />
          {/* Legacy routes for backwards compatibility */}
          <Route path="/text-match/:matchId" component={LazyLiveMatch} />
          <Route path="/match/:matchId" component={LazyLiveMatch} />
          <Route path="/community" component={LazyCommunity} />
          <Route path="/camaraderie" component={LazyCamaraderie} />
          <Route path="/superuser" component={SuperUser} />
          <Route path="/ad-test" component={AdTest} />
          <Route path="/websocket-test" component={WebSocketTestPage} />
          <Route path="/gem-checkout/:packageId" component={GemCheckout} />
          <Route path="/gem-checkout" component={GemCheckout} />
          <Route path="/realm-pass-checkout" component={RealmPassCheckout} />
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
        <LandscapeOrientation>
          <div className="min-h-screen bg-background">
            <Navigation />
            <Router />
            <Toaster />
            <PWAInstallPrompt />
            <ContextualHelp />
          </div>
        </LandscapeOrientation>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;