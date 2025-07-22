import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import QuickStatsBar from "@/components/QuickStatsBar";
import TeamHQHeroBanner from "@/components/TeamHQHeroBanner";
import PriorityActionsPanel from "@/components/PriorityActionsPanel";
import PriorityPanels from "@/components/PriorityPanels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeagueStandings from "@/components/LeagueStandings";
import ImprovedLiveMatches from "@/components/ImprovedLiveMatches";
import DramaticTeamHQ from "@/components/DramaticTeamHQ";
import { apiRequest } from "@/lib/queryClient";
import { Trophy, Target, Users as UsersIcon, Building2, BarChart3 } from "lucide-react";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  division: number;
  subdivision: string;
  teamPower: number;
  camaraderie: number;
  wins: number;
  losses: number;
  draws: number;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating: number;
  dailyStaminaLevel: number;
  injuryStatus: string;
  isOnMarket: boolean;
  isRetired: boolean;
  role: string;
}

// Team Overview Grid Component - Compact team summary for dashboard
function TeamOverviewGrid() {
  const { data: team } = useQuery<Team>({
    queryKey: ['/api/teams/my'],
    queryFn: () => apiRequest('/api/teams/my'),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
    retry: 1,
  });

  if (!team || !players) {
    return <div className="h-20 bg-gray-700 rounded animate-pulse" />;
  }

  const activePlayers = players.filter(p => !p.isOnMarket && !p.isRetired);
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus && p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => (p.dailyStaminaLevel || 0) < 50);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{team.teamPower || 0}</p>
        <p className="text-sm text-gray-400">Team Power</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{activePlayers.length}</p>
        <p className="text-sm text-gray-400">Active Players</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${injuredPlayers.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {injuredPlayers.length}
        </p>
        <p className="text-sm text-gray-400">Injured</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${lowStaminaPlayers.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
          {lowStaminaPlayers.length}
        </p>
        <p className="text-sm text-gray-400">Low Stamina</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();

  // Always show DramaticTeamHQ when authenticated - force mobile-first redesign
  if (isAuthenticated) {
    return <DramaticTeamHQ />;
  }

  // Show login prompt when not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Team HQ.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <QuickStatsBar />
        <div className="p-4 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-64 mx-auto" />
          <div className="h-4 bg-gray-800 rounded w-48 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-gray-800 rounded" />
            <div className="h-32 bg-gray-800 rounded" />
            <div className="h-32 bg-gray-800 rounded" />
            <div className="h-32 bg-gray-800 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-800 rounded" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <QuickStatsBar />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner - New Team HQ header */}
        <TeamHQHeroBanner />

        {/* Priority Actions Panel - Critical alerts and next match */}
        <PriorityActionsPanel />

        {/* Quick Access Tiles - 2x2 grid as specified in redesign guide */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hq-quick-tile bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700 hover:from-blue-700 hover:to-blue-800">
            <CardContent className="p-4 text-center">
              <UsersIcon className="w-8 h-8 mx-auto text-blue-200 mb-2" />
              <h3 className="font-semibold text-white">Roster HQ</h3>
              <p className="text-xs text-blue-200">Manage players</p>
            </CardContent>
          </Card>
          
          <Card className="hq-quick-tile bg-gradient-to-br from-green-800 to-green-900 border-green-700 hover:from-green-700 hover:to-green-800">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 mx-auto text-green-200 mb-2" />
              <h3 className="font-semibold text-white">Tactics</h3>
              <p className="text-xs text-green-200">Formation & strategy</p>
            </CardContent>
          </Card>
          
          <Card className="hq-quick-tile bg-gradient-to-br from-purple-800 to-purple-900 border-purple-700 hover:from-purple-700 hover:to-purple-800">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-purple-200 mb-2" />
              <h3 className="font-semibold text-white">Market</h3>
              <p className="text-xs text-purple-200">Trading & store</p>
            </CardContent>
          </Card>
          
          <Card className="hq-quick-tile bg-gradient-to-br from-orange-800 to-orange-900 border-orange-700 hover:from-orange-700 hover:to-orange-800">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto text-orange-200 mb-2" />
              <h3 className="font-semibold text-white">Stadium</h3>
              <p className="text-xs text-orange-200">Facilities & finance</p>
            </CardContent>
          </Card>
        </div>

        {/* Collapsible Snapshot Panels - Collapsed by default on mobile */}
        <div className="space-y-4">
          <details className="hq-collapsible">
            <summary className="hq-action-btn">
              <span className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-400" />
                Mini Roster Snapshot (6 players)
              </span>
            </summary>
            <div className="hq-collapsible-content p-4">
              <TeamOverviewGrid />
            </div>
          </details>
          
          <details className="hq-collapsible">
            <summary className="hq-action-btn">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Division Standings
              </span>
            </summary>
            <div className="hq-collapsible-content p-4">
              <Suspense fallback={<div className="h-40 bg-gray-700 rounded animate-pulse" />}>
                <LeagueStandings division={8} />
              </Suspense>
            </div>
          </details>
          
          <details className="hq-collapsible">
            <summary className="hq-action-btn">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Live Matches
              </span>
            </summary>
            <div className="hq-collapsible-content p-4">
              <Suspense fallback={<div className="h-40 bg-gray-700 rounded animate-pulse" />}>
                <ImprovedLiveMatches />
              </Suspense>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}