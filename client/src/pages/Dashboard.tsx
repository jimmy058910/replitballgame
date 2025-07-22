import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import QuickStatsBar from "@/components/QuickStatsBar";
import PriorityPanels from "@/components/PriorityPanels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeagueStandings from "@/components/LeagueStandings";
import ImprovedLiveMatches from "@/components/ImprovedLiveMatches";
import { apiRequest } from "@/lib/queryClient";
import { Trophy, Target, Users as UsersIcon } from "lucide-react";

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

  // Enhanced Dashboard with true "Team HQ" design per comprehensive UX documents
  if (!isAuthenticated) {
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
      
      <div className="p-4 space-y-6">
        {/* Team HQ Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Team HQ</h1>
          <p className="text-gray-400">Mission control for your Realm Rivalry operations</p>
        </div>

        {/* Priority Panels - Core of the Operational Dashboard */}
        <Suspense fallback={<div className="h-32 bg-gray-800 rounded animate-pulse" />}>
          <PriorityPanels />
        </Suspense>

        {/* Secondary Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* League Standings Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="h-5 w-5 text-yellow-400" />
                League Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-gray-700 rounded animate-pulse" />}>
                <LeagueStandings division={8} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Live Matches Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="h-5 w-5 text-green-400" />
                Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-gray-700 rounded animate-pulse" />}>
                <ImprovedLiveMatches />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Team Overview - Compact Summary */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UsersIcon className="h-5 w-5 text-purple-400" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-20 bg-gray-700 rounded animate-pulse" />}>
              <TeamOverviewGrid />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}