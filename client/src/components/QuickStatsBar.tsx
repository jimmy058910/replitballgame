import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Clock, Gem, Coins, TrendingUp, TrendingDown, Minus, Calendar, ArrowUp, ArrowDown, ArrowRight, Zap, Star } from "lucide-react";
import type { Player, Team, Staff, Contract, Notification, TeamWithFinances, TeamFinances, Stadium } from '@shared/types/models';
import { teamQueryOptions, trendsQueryOptions, financeQueryOptions, seasonQueryOptions } from '@/lib/api/queryOptions';



interface TeamTrends {
  powerTrend: 'up' | 'down' | 'stable';
  powerChange: number;
  camaraderieTrend: 'up' | 'down' | 'stable';
  camaraderieChange: number;
  formTrend: 'up' | 'down' | 'stable';
  narrative: string;
  weeklyHighlight: string;
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

  const { data: team } = useQuery({
    ...teamQueryOptions.myTeam(isAuthenticated),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: finances } = useQuery({
    ...financeQueryOptions.myTeamFinances(isAuthenticated),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: seasonalCycle } = useQuery({
    ...seasonQueryOptions.currentCycle(isAuthenticated),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: teamTrends } = useQuery({
    ...trendsQueryOptions.teamTrends(isAuthenticated),
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

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', size = 14) => {
    switch (trend) {
      case 'up': return <ArrowUp size={size} className="text-green-400" />;
      case 'down': return <ArrowDown size={size} className="text-red-400" />;
      case 'stable': return <ArrowRight size={size} className="text-yellow-400" />;
    }
  };

  const getPowerNarrative = () => {
    if (!team || !teamTrends) return "Team Building";
    
    const power = team.teamPower;
    const trend = teamTrends.powerTrend;
    
    if (power >= 30 && trend === 'up') return "Elite Dynasty";
    if (power >= 28 && trend === 'up') return "Championship Push";
    if (power >= 25) return "Contender Rising";
    if (power >= 22 && trend === 'up') return "Breakout Season";
    if (power >= 20) return "Building Momentum";
    if (trend === 'up') return "Foundation Growing";
    if (trend === 'down' && power < 18) return "Rebuild Mode";
    return "Development Phase";
  };

  const getCamaraderieNarrative = () => {
    if (!team || !teamTrends) return "Team Chemistry";
    
    const camaraderie = team.camaraderie;
    const trend = teamTrends.camaraderieTrend;
    
    if (camaraderie >= 80 && trend === 'up') return "Unbreakable Bond";
    if (camaraderie >= 70) return "Strong Unity";
    if (camaraderie >= 60 && trend === 'up') return "Growing Together";
    if (camaraderie >= 50) return "Team Building";
    if (trend === 'down') return "Chemistry Issues";
    return "New Relationships";
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
        {/* Left Section - Enhanced Financial & Power Stats with Narratives */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="text-white font-semibold">
              {/* */}
              {parseInt(finances?.credits || 0).toLocaleString()}₡
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-purple-400" />
            <span className="text-white font-semibold">
              {finances?.gems || 0}💎
            </span>
          </div>
          
          {/* Enhanced Power with Trend & Narrative */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-white font-semibold">
                {team.teamPower || 0}
              </span>
              {teamTrends && getTrendIcon(teamTrends.powerTrend)}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs">Power</span>
              <Badge variant="outline" className="text-xs px-1 py-0 h-auto border-gray-600 text-gray-300">
                {getPowerNarrative()}
              </Badge>
            </div>
          </div>

          {/* Enhanced Team Chemistry with Narrative */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-white font-semibold">
                {team.camaraderie || 0}
              </span>
              {teamTrends && getTrendIcon(teamTrends.camaraderieTrend)}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs">Team Chemistry</span>
              <Badge variant="outline" className="text-xs px-1 py-0 h-auto border-gray-600 text-gray-300">
                {getCamaraderieNarrative()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Center Section - Team & Enhanced Record Display */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-white font-semibold">{team.name}</p>
            <p className="text-xs text-gray-400">{getDivisionDisplay()}</p>
          </div>
          
          {/* Enhanced Record with Win Rate Narrative */}
          <div className="flex items-center gap-2">
            <div className="text-center">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">
                  {team.wins || 0}W-{team.losses || 0}L-{team.draws || 0}D
                </span>
                {teamTrends && getTrendIcon(teamTrends.formTrend, 12)}
              </div>
              <Badge variant="outline" className="text-xs px-1 py-0 h-auto border-gray-600 text-gray-300 mt-1">
                {teamTrends?.narrative || 'Building Season'}
              </Badge>
            </div>
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