import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer';
import { 
  Play, 
  Clock, 
  Trophy,
  Medal,
  Zap,
  Eye,
  Activity,
  Timer,
  Users,
  Target,
  ChevronDown,
  ExternalLink,
  Calendar,
  Flame,
  Gamepad2,
  Globe
} from 'lucide-react';
import { Link } from 'wouter';

// Type definitions for live matches
type LiveMatch = {
  id: string;
  type: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION';
  status: 'LIVE' | 'SCHEDULED' | 'COMPLETED';
  homeTeam: { id: string; name: string; logo?: string };
  awayTeam: { id: string; name: string; logo?: string };
  homeScore?: number;
  awayScore?: number;
  gameTime?: number; // Time in seconds
  maxGameTime?: number; // Total game duration
  division?: number;
  tournamentName?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  userTeamInvolved: boolean;
  gameDate: string;
  estimatedEndTime?: string;
  viewers?: number;
};

interface LiveMatchesHubProps {
  team?: any;
}

export default function LiveMatchesHub({ team }: LiveMatchesHubProps) {
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Query for all live matches across the game
  const { data: liveMatches = [], isLoading } = useQuery<LiveMatch[]>({
    queryKey: ['/api/matches/live'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 2000, // Consider data stale after 2 seconds
  });

  // Query for user's team live matches specifically
  const { data: userLiveMatches = [] } = useQuery<LiveMatch[]>({
    queryKey: [`/api/teams/${team?.id}/matches/live`],
    enabled: !!team?.id,
    refetchInterval: 3000, // More frequent updates for user matches
  });

  // Categorize matches by type and priority
  const categorizedMatches = {
    userMatches: liveMatches.filter(match => match.userTeamInvolved),
    highPriority: liveMatches.filter(match => match.priority === 'HIGH' && !match.userTeamInvolved),
    tournaments: liveMatches.filter(match => match.type === 'TOURNAMENT' && !match.userTeamInvolved),
    leagues: liveMatches.filter(match => match.type === 'LEAGUE' && !match.userTeamInvolved),
    exhibitions: liveMatches.filter(match => match.type === 'EXHIBITION' && !match.userTeamInvolved),
  };

  // Helper functions
  const formatGameTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case 'LEAGUE': return <Trophy className="h-4 w-4" />;
      case 'TOURNAMENT': return <Medal className="h-4 w-4" />;
      case 'EXHIBITION': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case 'LEAGUE': return 'from-yellow-600 to-orange-600';
      case 'TOURNAMENT': return 'from-purple-600 to-pink-600';
      case 'EXHIBITION': return 'from-green-600 to-blue-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const openMatchDetails = (match: LiveMatch) => {
    setSelectedMatch(match);
    setIsDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading live matches...</p>
        </div>
      </div>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600">
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Live Matches</h3>
            <p className="text-gray-300 mb-4">There are currently no ongoing matches across any league, tournament, or exhibition.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/competition?tab=exhibitions">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Start Exhibition
                </Button>
              </Link>
              <Link href="/competition?tab=schedule">
                <Button variant="outline" className="border-gray-500 text-gray-300 hover:bg-gray-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* FLATTENED LIVE MATCHES - NO REDUNDANT HEADER */}
      {/* YOUR LIVE MATCHES - HIGHEST PRIORITY */}
      {categorizedMatches.userMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Your Live Matches
          </h3>
          {categorizedMatches.userMatches.map((match, index) => (
            <Card 
              key={match.id} 
              className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 border-2 border-blue-500/50 hover:border-blue-400 transition-all duration-300 cursor-pointer"
              onClick={() => openMatchDetails(match)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Match Type Badge */}
                    <Badge className={`${
                      match.type === 'LEAGUE' ? 'bg-yellow-600 text-yellow-100' :
                      match.type === 'TOURNAMENT' ? 'bg-purple-600 text-purple-100' :
                      'bg-green-600 text-green-100'
                    } font-bold`}>
                      {match.type === 'LEAGUE' ? '🏆 League' :
                       match.type === 'TOURNAMENT' ? '🥇 Tournament' :
                       '🔨 Exhibition'}
                    </Badge>
                    <div>
                      <h4 className="text-white font-bold">
                        {match.homeTeam.name} vs {match.awayTeam.name}
                      </h4>
                      <p className="text-blue-200 text-sm">
                        {match.homeScore !== undefined && match.awayScore !== undefined ? 
                          `${match.homeScore} - ${match.awayScore}` : 
                          'Starting Soon'
                        }
                        {match.gameTime && match.maxGameTime && (
                          <span className="ml-2">• {formatGameTime(match.gameTime)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-red-100 animate-pulse">
                      <Activity className="h-3 w-3 mr-1" />
                      LIVE
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ALL OTHER LIVE MATCHES - FLATTENED SINGLE LIST */}
      {[...categorizedMatches.highPriority, ...categorizedMatches.tournaments, ...categorizedMatches.leagues, ...categorizedMatches.exhibitions].length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-400" />
            Other Live Matches ({[...categorizedMatches.highPriority, ...categorizedMatches.tournaments, ...categorizedMatches.leagues, ...categorizedMatches.exhibitions].length})
          </h3>
          
          {/* Single flattened list of all other matches */}
          {[...categorizedMatches.highPriority, ...categorizedMatches.tournaments, ...categorizedMatches.leagues, ...categorizedMatches.exhibitions].map((match, index) => (
            <Card 
              key={match.id} 
              className="bg-gray-800/90 border-gray-600 hover:border-gray-500 transition-all duration-200 cursor-pointer"
              onClick={() => openMatchDetails(match)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Match Type Badge */}
                    <Badge className={`${
                      match.type === 'LEAGUE' ? 'bg-yellow-600 text-yellow-100' :
                      match.type === 'TOURNAMENT' ? 'bg-purple-600 text-purple-100' :
                      'bg-green-600 text-green-100'
                    } font-medium text-xs`}>
                      {match.type === 'LEAGUE' ? '🏆 League' :
                       match.type === 'TOURNAMENT' ? '🥇 Tournament' :
                       '🔨 Exhibition'}
                    </Badge>
                    <div>
                      <h4 className="text-white font-semibold text-sm">
                        {match.homeTeam.name || 'Team A'} vs {match.awayTeam.name || 'Team B'}
                      </h4>
                      <p className="text-gray-300 text-xs">
                        {match.homeScore !== undefined && match.awayScore !== undefined ? 
                          `${match.homeScore} - ${match.awayScore}` : 
                          'In Progress'
                        }
                        {match.gameTime && match.maxGameTime && (
                          <span className="ml-2">• {formatGameTime(match.gameTime)}</span>
                        )}
                        {match.division && (
                          <span className="ml-2">• Div {match.division}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.viewers && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {match.viewers}
                      </span>
                    )}
                    <Badge className="bg-red-600 text-red-100 animate-pulse text-xs">
                      LIVE
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MATCH DETAILS DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-gray-900 border-gray-700 max-h-[80vh]">
          <DrawerHeader className="border-b border-gray-700">
            <DrawerTitle className="text-white">
              {selectedMatch && `${selectedMatch.homeTeam.name} vs ${selectedMatch.awayTeam.name}`}
            </DrawerTitle>
            <DrawerDescription className="text-gray-400">
              {selectedMatch && (
                <div className="flex items-center gap-2">
                  <Badge className={`${
                    selectedMatch.type === 'LEAGUE' ? 'bg-yellow-600 text-yellow-100' :
                    selectedMatch.type === 'TOURNAMENT' ? 'bg-purple-600 text-purple-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    {selectedMatch.type === 'LEAGUE' ? '🏆 League' :
                     selectedMatch.type === 'TOURNAMENT' ? '🥇 Tournament' :
                     '🔨 Exhibition'}
                  </Badge>
                  <span>Live Match Details</span>
                </div>
              )}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            {selectedMatch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white">{selectedMatch.homeTeam.name}</h3>
                    <p className="text-gray-400">Home</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white">{selectedMatch.awayTeam.name}</h3>
                    <p className="text-gray-400">Away</p>
                  </div>
                </div>
                
                {selectedMatch.homeScore !== undefined && selectedMatch.awayScore !== undefined && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {selectedMatch.homeScore} - {selectedMatch.awayScore}
                    </div>
                  </div>
                )}
                
                {selectedMatch.gameTime && selectedMatch.maxGameTime && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Game Time</span>
                      <span>{formatGameTime(selectedMatch.gameTime)}</span>
                    </div>
                    <Progress 
                      value={(selectedMatch.gameTime / selectedMatch.maxGameTime) * 100} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Division</p>
                    <p className="text-white">{selectedMatch.division || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Viewers</p>
                    <p className="text-white">{selectedMatch.viewers || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}