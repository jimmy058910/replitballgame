import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Clock, 
  AlertTriangle, 
  Trophy, 
  Users,
  HeartPulse,
  FileText,
  Target,
  TrendingUp,
  Star,
  Zap,
  Crown,
  Shield
} from "lucide-react";

interface NextMatch {
  id: string;
  opponent: string;
  matchTime: string;
  matchType: string;
  isHome: boolean;
}

interface CriticalAlert {
  id: string;
  type: 'injury' | 'contract' | 'stamina' | 'tournament';
  message: string;
  priority: 'high' | 'medium' | 'low';
  linkTo?: string;
}

interface DailyOpportunities {
  exhibitionsRemaining: number;
  adsAvailable: number;
  tournamentEntriesAvailable: number;
}

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  gameTime?: number;
}

interface PlayerSpotlight {
  id: string;
  name: string;
  position: string;
  narrative: string;
  stat: string;
  trend: 'rising' | 'hot' | 'veteran' | 'rookie';
}

interface TeamStoryline {
  title: string;
  description: string;
  type: 'success' | 'challenge' | 'opportunity' | 'milestone';
  icon: string;
  actionable: boolean;
  linkTo?: string;
}

export default function PriorityPanels() {
  const { isAuthenticated } = useAuth();

  const { data: nextMatch } = useQuery<NextMatch>({
    queryKey: ['/api/matches/next-league-game'],
    queryFn: () => apiRequest('/api/matches/next-league-game'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: criticalAlerts } = useQuery<CriticalAlert[]>({
    queryKey: ['/api/teams/critical-alerts'],
    queryFn: () => apiRequest('/api/teams/critical-alerts'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: dailyOpportunities } = useQuery<DailyOpportunities>({
    queryKey: ['/api/teams/daily-opportunities'],
    queryFn: () => apiRequest('/api/teams/daily-opportunities'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: liveMatches } = useQuery<LiveMatch[]>({
    queryKey: ['/api/matches/live'],
    queryFn: () => apiRequest('/api/matches/live'),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  // Enhanced Data Storytelling Queries
  const { data: playerSpotlight } = useQuery<PlayerSpotlight[]>({
    queryKey: ['/api/teams/player-spotlight'],
    queryFn: () => apiRequest('/api/teams/player-spotlight'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  const { data: teamStorylines } = useQuery<TeamStoryline[]>({
    queryKey: ['/api/teams/storylines'],
    queryFn: () => apiRequest('/api/teams/storylines'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'injury': return <HeartPulse className="h-4 w-4" />;
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'stamina': return <Target className="h-4 w-4" />;
      case 'tournament': return <Trophy className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const userLiveMatch = liveMatches?.find(match => 
    match.homeTeam.includes('Oakland') || match.awayTeam.includes('Oakland')
  );

  // Enhanced Storytelling Helper Functions
  const getPlayerTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'hot': return <Zap className="h-3 w-3 text-yellow-400" />;
      case 'veteran': return <Crown className="h-3 w-3 text-purple-400" />;
      case 'rookie': return <Star className="h-3 w-3 text-blue-400" />;
      default: return <Shield className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStorylineGradient = (type: string) => {
    switch (type) {
      case 'success': return 'from-green-900/30 to-green-800/30 border-green-600';
      case 'challenge': return 'from-red-900/30 to-red-800/30 border-red-600';
      case 'opportunity': return 'from-blue-900/30 to-blue-800/30 border-blue-600';
      case 'milestone': return 'from-purple-900/30 to-purple-800/30 border-purple-600';
      default: return 'from-gray-900/30 to-gray-800/30 border-gray-600';
    }
  };

  const getStorylineTextColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'challenge': return 'text-red-400';
      case 'opportunity': return 'text-blue-400';
      case 'milestone': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Live Match Panel */}
      {userLiveMatch ? (
        <Card className="bg-gradient-to-r from-red-900/30 to-red-800/30 border-red-600">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-400 text-sm">
              <Play className="h-4 w-4 animate-pulse" />
              LIVE MATCH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <p className="text-white font-semibold text-sm">
                {userLiveMatch.homeTeam} vs {userLiveMatch.awayTeam}
              </p>
              <p className="text-gray-300 text-xs">
                {userLiveMatch.gameTime ? `${Math.floor(userLiveMatch.gameTime / 60)}'` : 'Live'}
              </p>
            </div>
            <Link href={`/match/${userLiveMatch.id}`}>
              <Button className="w-full bg-red-600 hover:bg-red-700" size="sm">
                <Play className="h-3 w-3 mr-1" />
                Watch Live
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : nextMatch ? (
        /* Next Match Panel */
        <Card className="bg-gradient-to-r from-green-900/30 to-green-800/30 border-green-600">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-400 text-sm">
              <Clock className="h-4 w-4" />
              NEXT MATCH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <p className="text-white font-semibold text-sm">
                vs {nextMatch.opponent}
              </p>
              <p className="text-gray-300 text-xs">
                {nextMatch.matchTime} • {nextMatch.isHome ? 'HOME' : 'AWAY'}
              </p>
              <Badge 
                variant="outline" 
                className="text-xs mt-1 border-green-500 text-green-400"
              >
                {nextMatch.matchType}
              </Badge>
            </div>
            <Link href="/roster-hq?tab=tactics">
              <Button className="w-full bg-green-600 hover:bg-green-700" size="sm">
                <Target className="h-3 w-3 mr-1" />
                Set Tactics
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* No Match Panel */
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="h-4 w-4" />
              NO MATCHES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-gray-300 text-sm text-center">
              No upcoming matches scheduled
            </p>
            <Link href="/competition?tab=exhibitions">
              <Button variant="outline" className="w-full" size="sm">
                <Play className="h-3 w-3 mr-1" />
                Play Exhibition
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts Panel */}
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400">ALERTS</span>
            </div>
            {criticalAlerts && criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {criticalAlerts && criticalAlerts.length > 0 ? (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-2 rounded border ${getAlertColor(alert.priority)}`}
                >
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <p className="text-white text-xs font-medium">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-400 text-xs">All systems operational</p>
            </div>
          )}
          <Link href="/roster-hq?tab=medical">
            <Button variant="outline" className="w-full mt-2" size="sm">
              View Details
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Enhanced Player Spotlight Panel */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-blue-600">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-blue-400 text-sm">
            <Star className="h-4 w-4" />
            PLAYER SPOTLIGHT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {playerSpotlight && playerSpotlight.length > 0 ? (
            <div className="space-y-2">
              {playerSpotlight.slice(0, 2).map((player, index) => (
                <div key={player.id} className="text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-white font-semibold">{player.name}</span>
                    {getPlayerTrendIcon(player.trend)}
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {player.narrative}
                  </p>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-auto border-blue-500 text-blue-400 mt-1">
                    {player.stat}
                  </Badge>
                </div>
              ))}
              <Link href="/roster-hq">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                  <Users className="h-3 w-3 mr-1" />
                  View Squad
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-xs">
              Building player stories...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Team Storylines Panel */}
      {teamStorylines && teamStorylines.length > 0 ? (
        <Card className={`bg-gradient-to-r ${getStorylineGradient(teamStorylines[0].type)}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 ${getStorylineTextColor(teamStorylines[0].type)} text-sm`}>
              <Trophy className="h-4 w-4" />
              TEAM STORY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="text-white font-semibold text-sm">
                {teamStorylines[0].title}
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                {teamStorylines[0].description}
              </p>
              {teamStorylines[0].actionable && teamStorylines[0].linkTo && (
                <Link href={teamStorylines[0].linkTo}>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
                    <Target className="h-3 w-3 mr-1" />
                    Take Action
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Fallback Quick Actions Panel */
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-400 text-sm">
              <Users className="h-4 w-4" />
              QUICK ACTIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Link href="/roster-hq?tab=tactics">
              <Button variant="outline" className="w-full text-xs" size="sm">
                <Target className="h-3 w-3 mr-1" />
                Tactics
              </Button>
            </Link>
            <Link href="/market-district?tab=store">
              <Button variant="outline" className="w-full text-xs" size="sm">
                <Trophy className="h-3 w-3 mr-1" />
                Store
              </Button>
            </Link>
            <Link href="/roster-hq?tab=medical">
              <Button variant="outline" className="w-full text-xs" size="sm">
                <HeartPulse className="h-3 w-3 mr-1" />
                Medical
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}