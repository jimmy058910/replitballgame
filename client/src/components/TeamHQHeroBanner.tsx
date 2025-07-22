import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SeasonData {
  seasonNumber: number;
  currentDay: number;
  phase: string;
  progressPercentage: number;
  daysRemaining: number;
}

interface TeamData {
  id: string;
  name: string;
  division: number;
  subdivision: string;
  logoUrl?: string;
}

export default function TeamHQHeroBanner() {
  const { data: seasonData } = useQuery<SeasonData>({
    queryKey: ['/api/season/current-cycle'],
    queryFn: () => apiRequest('/api/season/current-cycle'),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes as specified
  });

  const { data: teamData } = useQuery<TeamData>({
    queryKey: ['/api/teams/my'],
    queryFn: () => apiRequest('/api/teams/my'),
  });

  if (!seasonData || !teamData) {
    return (
      <Card className="bg-gradient-to-r from-blue-900 to-purple-900 border-blue-700">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'REGULAR_SEASON': return 'Regular Season';
      case 'PLAYOFFS': return 'Playoffs';
      case 'OFFSEASON': return 'Offseason';
      default: return phase;
    }
  };

  const getDivisionName = (division: number) => {
    const names = ['', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common', 'Bronze', 'Stone'];
    return names[division] || `Division ${division}`;
  };

  const getSubdivisionDisplay = (subdivision: string) => {
    // Convert subdivision names to proper display format
    if (subdivision === 'main') return 'Main';
    if (subdivision.includes('_')) {
      const [name, num] = subdivision.split('_');
      return `${name.charAt(0).toUpperCase() + name.slice(1)} ${num}`;
    }
    return subdivision.charAt(0).toUpperCase() + subdivision.slice(1);
  };

  const progress = Math.round(((seasonData.currentDay - 1) / 17) * 100);

  return (
    <Card className="hq-hero-gradient border-blue-700 shadow-xl">
      <CardContent className="p-6">
        {/* Team Identity & Season Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Team Crest/Logo */}
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            
            {/* Team & Season Meta */}
            <div>
              <h1 className="hq-title text-white mb-1">{teamData.name}</h1>
              <div className="flex items-center space-x-3 text-blue-200 hq-subtitle">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Season {seasonData.seasonNumber}
                </span>
                <span>•</span>
                <span>{getPhaseDisplayName(seasonData.phase)}</span>
                <span>•</span>
                <span>Day {seasonData.currentDay}/17</span>
              </div>
              <div className="mt-1">
                <Badge variant="outline" className="border-blue-400 text-blue-200">
                  {getDivisionName(teamData.division)} {getSubdivisionDisplay(teamData.subdivision)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Season Progress Indicator */}
          <div className="text-right">
            <div className="text-blue-200 text-sm mb-1">Season Progress</div>
            <div className="text-white text-2xl font-bold">{progress}%</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-blue-200">
            <span>Day {seasonData.currentDay}</span>
            <span>{17 - seasonData.currentDay} days remaining</span>
          </div>
          <Progress 
            value={progress} 
            className="hq-progress-bar bg-blue-800"
          />
        </div>
      </CardContent>
    </Card>
  );
}