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
import Tournaments from "@/pages/Tournaments";
import Exhibitions from "@/pages/Exhibitions";
import Commerce from "@/pages/Commerce";
import Inventory from "@/pages/Inventory";
import Marketplace from "@/pages/Marketplace";
import Store from "@/pages/Store";
import Payments from "@/pages/Payments";
import Stadium from "@/pages/Stadium";

import LogoShowcase from "@/pages/LogoShowcase";
import SuperUser from "@/pages/SuperUser";
import TextMatch from "@/pages/TextMatch";
import Community from "@/pages/Community";
import Scouting from "@/pages/Scouting";

import Navigation from "@/components/Navigation";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/logos" component={LogoShowcase} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/team" component={Team} />
          <Route path="/competition" component={Competition} />
          <Route path="/league" component={League} />
          <Route path="/tournaments" component={Tournaments} />
          <Route path="/exhibitions" component={Exhibitions} />
          <Route path="/commerce" component={Commerce} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/store" component={Store} />
          <Route path="/payments" component={Payments} />
          <Route path="/stadium" component={Stadium} />
          <Route path="/scouting" component={Scouting} />
          <Route path="/text-match/:matchId" component={TextMatch} />
          <Route path="/match/:matchId" component={TextMatch} />
          <Route path="/community" component={Community} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
