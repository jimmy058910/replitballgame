import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calendar, 
  Trophy, 
  Award, 
  Gamepad2,
  Filter,
  Clock,
  Home,
  Plane,
  Target
} from 'lucide-react';

type ComprehensiveGame = {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore?: number;
  awayScore?: number;
  gameDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  matchType: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION';
  tournamentId?: string;
  round?: string;
};

type ScheduleByDay = {
  [dayKey: string]: ComprehensiveGame[];
};

export default function ComprehensiveSchedule() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'league' | 'tournament' | 'exhibition'>('all');

  // Fetch ALL games for the user's team across all match types
  const { data: rawGames, isLoading, error } = useQuery<ComprehensiveGame[]>({
    queryKey: ["/api/teams/my-schedule/comprehensive", 'force-refresh-iron-wolves'], // Cache bust for Iron Wolves fix
    staleTime: 0, // Force refresh after duplicate match fix
    gcTime: 0, // Clear cache completely  
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Force focus refresh
    refetchInterval: 3000, // Refresh every 3 seconds until cache clears
  });

  // CRITICAL FIX: Filter out duplicate matches - keep only valid time matches
  const allGames = useMemo(() => {
    if (!rawGames) return [];
    
    // Group matches by date to find duplicates
    const matchesByDate: { [date: string]: ComprehensiveGame[] } = {};
    rawGames.forEach(game => {
      const dateKey = new Date(game.gameDate).toDateString();
      if (!matchesByDate[dateKey]) matchesByDate[dateKey] = [];
      matchesByDate[dateKey].push(game);
    });

    // For each date, keep only the match in the valid time window (4-6 PM EDT = 20:00-22:00 UTC)
    const filteredGames: ComprehensiveGame[] = [];
    Object.entries(matchesByDate).forEach(([date, matches]) => {
      if (matches.length === 1) {
        filteredGames.push(matches[0]);
      } else {
        // Multiple matches on same day - keep the one at 8:30 PM EDT
        const validMatch = matches.find(match => {
          const matchTime = new Date(match.gameDate);
          const hour = matchTime.getUTCHours();
          return hour >= 20 && hour < 22; // 4-6 PM EDT window
        });
        
        if (validMatch) {
          console.log(`🎯 [SCHEDULE FIX] Filtering duplicate matches on ${date}, keeping valid match:`, validMatch.id);
          filteredGames.push(validMatch);
        } else {
          // Fallback to first match if no valid time found
          filteredGames.push(matches[0]);
        }
      }
    });

    return filteredGames;
  }, [rawGames]);

  // Fetch user's team info
  const { data: userTeam } = useQuery<any>({
    queryKey: ["/api/teams/my"],
  });

  // Helper function to format match time in EDT
  const formatMatchTime = (gameDate: string) => {
    const date = new Date(gameDate);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'America/New_York'
    });
  };

  // Helper function to format match date
  const formatMatchDate = (gameDate: string) => {
    const date = new Date(gameDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  // Helper function to extract day number from date
  const getDayFromDate = (gameDate: string) => {
    const date = new Date(gameDate);
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Map to season day (simplified mapping - adjust based on your season logic)
    // Assuming season starts on day 1 of the year for now
    return ((dayOfYear - 1) % 17) + 1;
  };

  // Get match type styling
  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'LEAGUE': return 'bg-blue-600 text-blue-100';
      case 'TOURNAMENT': return 'bg-purple-600 text-purple-100';
      case 'EXHIBITION': return 'bg-gray-600 text-gray-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'LEAGUE': return <Trophy className="h-4 w-4" />;
      case 'TOURNAMENT': return <Award className="h-4 w-4" />;
      case 'EXHIBITION': return <Gamepad2 className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Filter games based on active filter
  const filteredGames = React.useMemo(() => {
    if (!allGames) return [];
    
    switch (activeFilter) {
      case 'league': return allGames.filter(g => g.matchType === 'LEAGUE');
      case 'tournament': return allGames.filter(g => g.matchType === 'TOURNAMENT');
      case 'exhibition': return allGames.filter(g => g.matchType === 'EXHIBITION');
      default: return allGames;
    }
  }, [allGames, activeFilter]);

  // Group games by day
  const gamesByDay = React.useMemo(() => {
    const grouped: ScheduleByDay = {};
    
    filteredGames.forEach(game => {
      const dayKey = formatMatchDate(game.gameDate);
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(game);
    });

    // Sort games within each day by time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
    });

    return grouped;
  }, [filteredGames]);

  // Get opponent team and venue info
  const getGameInfo = (game: ComprehensiveGame) => {
    if (!userTeam) return { opponent: 'Unknown', isHome: false };
    
    const isHome = game.homeTeam.id === userTeam.id;
    const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
    
    return { opponent, isHome };
  };

  // Get game result
  const getGameResult = (game: ComprehensiveGame) => {
    if (game.status !== 'COMPLETED' || game.homeScore === undefined || game.awayScore === undefined) {
      return null;
    }
    
    if (!userTeam) return null;
    
    const isHome = game.homeTeam.id === userTeam.id;
    const userScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;
    
    if (userScore > opponentScore) return 'WIN';
    if (userScore < opponentScore) return 'LOSS';
    return 'DRAW';
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'WIN': return 'text-green-400 bg-green-900/50';
      case 'LOSS': return 'text-red-400 bg-red-900/50';
      case 'DRAW': return 'text-yellow-400 bg-yellow-900/50';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-400">Loading schedule...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/50 border-red-500">
        <CardContent className="p-6 text-center">
          <div className="text-red-400 mb-2">Error loading schedule</div>
          <div className="text-red-300 text-sm">Please try refreshing the page</div>
        </CardContent>
      </Card>
    );
  }

  if (!allGames || allGames.length === 0) {
    return (
      <Card className="bg-gray-800/90 border-gray-600">
        <CardContent className="p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Games Scheduled</h3>
          <p className="text-gray-400">Your schedule will appear here once games are generated</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter Tabs */}
      <Card className="bg-gradient-to-r from-purple-800 via-blue-700 to-cyan-800 border-purple-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-white" />
              <div>
                <CardTitle className="text-xl font-bold text-white">My Complete Schedule</CardTitle>
                <p className="text-purple-200 text-sm">All your games across League, Tournaments & Exhibitions</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white">
              {filteredGames.length} Games
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="league" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            League
          </TabsTrigger>
          <TabsTrigger value="tournament" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="exhibition" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Exhibitions
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-4 mt-6">
          {/* Games by Day */}
          {Object.entries(gamesByDay)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([dayKey, games]) => (
              <Card key={dayKey} className="bg-gray-800/90 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    {dayKey}
                    <Badge className="bg-blue-600 text-blue-100 ml-auto">
                      {games.length} {games.length === 1 ? 'Game' : 'Games'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {games.map((game) => {
                    const { opponent, isHome } = getGameInfo(game);
                    const result = getGameResult(game);
                    
                    return (
                      <div key={game.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Match Type Icon */}
                            <div className={`p-2 rounded-lg ${getMatchTypeColor(game.matchType)}`}>
                              {getMatchTypeIcon(game.matchType)}
                            </div>
                            
                            {/* Game Details */}
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                vs {opponent}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="flex items-center gap-1">
                                  {isHome ? <Home className="h-3 w-3" /> : <Plane className="h-3 w-3" />}
                                  {isHome ? 'Home' : 'Away'}
                                </span>
                                <span>{formatMatchTime(game.gameDate)}</span>
                                <Badge className={getMatchTypeColor(game.matchType)} variant="outline">
                                  {game.matchType}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Game Status/Result */}
                          <div className="text-right">
                            {game.status === 'COMPLETED' && game.homeScore !== undefined ? (
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-white">
                                  {getGameInfo(game).isHome ? `${game.homeScore}-${game.awayScore}` : `${game.awayScore}-${game.homeScore}`}
                                </div>
                                {result && (
                                  <Badge className={getResultColor(result)}>
                                    {result}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge className={game.status === 'LIVE' ? 'bg-red-600 text-red-100 animate-pulse' : 'bg-gray-600 text-gray-100'}>
                                {game.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}