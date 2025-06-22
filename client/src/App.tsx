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
import Store from "@/pages/Store";
import Stadium from "@/pages/Stadium";
import Match from "@/pages/Match";
import LogoShowcase from "@/pages/LogoShowcase";
import Community from "@/pages/Community";
import SeasonChampionships from "@/components/SeasonChampionships";
import ContractManagement from "@/components/ContractManagement";
import SponsorshipManagement from "@/components/SponsorshipManagement";
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
          <Route path="/league" component={League} />
          <Route path="/championships" component={() => <div className="min-h-screen bg-gray-900 text-white"><Navigation /><div className="max-w-7xl mx-auto px-4 py-8"><SeasonChampionships /></div></div>} />
          <Route path="/contracts" component={() => <div className="min-h-screen bg-gray-900 text-white"><Navigation /><div className="max-w-7xl mx-auto px-4 py-8"><ContractManagement /></div></div>} />
          <Route path="/sponsorships" component={() => <div className="min-h-screen bg-gray-900 text-white"><Navigation /><div className="max-w-7xl mx-auto px-4 py-8"><SponsorshipManagement /></div></div>} />
          <Route path="/tournaments" component={Tournaments} />
          <Route path="/exhibitions" component={Exhibitions} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/store" component={Store} />
          <Route path="/stadium" component={Stadium} />
          <Route path="/match" component={Match} />
          <Route path="/community" component={Community} />
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
