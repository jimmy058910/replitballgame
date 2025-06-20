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
import League from "@/pages/League";
import Tournaments from "@/pages/Tournaments";
import Exhibitions from "@/pages/Exhibitions";
import Inventory from "@/pages/Inventory";
import Marketplace from "@/pages/Marketplace";
import Match from "@/pages/Match";
import LogoShowcase from "@/pages/LogoShowcase";

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
          <Route path="/league" component={League} />
          <Route path="/tournaments" component={Tournaments} />
          <Route path="/exhibitions" component={Exhibitions} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/match" component={Match} />
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
