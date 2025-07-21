import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Clock, Gem, Coins, TrendingUp, Calendar } from "lucide-react";

interface Team {
  id: string;
  name: string;
  division: number;
  subdivision: string;
  teamPower: number;
  camaraderie: number;
}

interface TeamFinances {
  credits: number;
  gems: number;
}

interface SeasonalCycle {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
}

export default function QuickStatsBar() {
  const { isAuthenticated } = useAuth();

  const { data: team } = useQuery<Team>({
    queryKey: ['/api/teams/my'],
    queryFn: () => apiRequest('/api/teams/my'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: finances } = useQuery<TeamFinances>({
    queryKey: ['/api/teams/finances/my'],
    queryFn: () => apiRequest('/api/teams/finances/my'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: seasonalCycle } = useQuery<SeasonalCycle>({
    queryKey: ['/api/seasonal-flow/current-cycle'],
    queryFn: () => apiRequest('/api/seasonal-flow/current-cycle'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  if (!isAuthenticated || !team) {
    return null;
  }

  const getDivisionDisplay = () => {
    if (team.subdivision && team.subdivision !== 'main') {
      const subdivisionName = team.subdivision.charAt(0).toUpperCase() + team.subdivision.slice(1);
      return `Div ${team.division} ${subdivisionName}`;
    }
    return `Division ${team.division}`;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'regular season': return 'bg-green-600';
      case 'mid-season cup': return 'bg-purple-600';
      case 'playoffs': return 'bg-yellow-600';
      case 'off-season': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Section - Financial Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="text-white font-semibold">
              {finances?.credits?.toLocaleString() || 0}₡
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-purple-400" />
            <span className="text-white font-semibold">
              {finances?.gems || 0}💎
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span className="text-white font-semibold">
              {team.teamPower || 0}
            </span>
            <span className="text-gray-400 text-sm">Power</span>
          </div>
        </div>

        {/* Center Section - Team & Division */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-white font-semibold">{team.name}</p>
            <p className="text-xs text-gray-400">{getDivisionDisplay()}</p>
          </div>
        </div>

        {/* Right Section - Season Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-white font-semibold">
              Day {seasonalCycle?.currentDay || 0}/17
            </span>
          </div>
          
          <Badge 
            variant="outline" 
            className={`${getPhaseColor(seasonalCycle?.phase || '')} text-white border-transparent`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {seasonalCycle?.phase || 'Loading...'}
          </Badge>
        </div>
      </div>
    </div>
  );
}