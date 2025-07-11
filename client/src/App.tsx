import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Team from "@/pages/Team";
import Competition from "@/pages/Competition";
import League from "@/pages/League";


import Market from "@/pages/Market";
import World from "@/pages/World";

import Inventory from "@/pages/Inventory";
import Marketplace from "@/pages/Marketplace";



import LogoShowcase from "@/pages/LogoShowcase";
import SuperUser from "@/pages/SuperUser";
import TextMatch from "@/pages/TextMatch";
import Community from "@/pages/Community";
import Camaraderie from "@/pages/Camaraderie";
import Stats from "@/pages/Stats";
import HelpManual from "@/pages/HelpManual";

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
          <Route path="/" component={Dashboard} />
          <Route path="/team" component={Team} />
          <Route path="/competition" component={Competition} />
          <Route path="/market" component={Market} />
          <Route path="/world" component={World} />
          
          {/* Legacy routes - keep for backwards compatibility */}
          <Route path="/league" component={League} />

          <Route path="/inventory" component={Inventory} />
          <Route path="/marketplace" component={Marketplace} />


          <Route path="/stats" component={Stats} />
          
          <Route path="/text-match/:matchId" component={TextMatch} />
          <Route path="/match/:matchId" component={TextMatch} />
          <Route path="/community" component={Community} />
          <Route path="/camaraderie" component={Camaraderie} />
          <Route path="/superuser" component={SuperUser} />
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
            <ContextualHelp />
          </div>
        </LandscapeOrientation>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;