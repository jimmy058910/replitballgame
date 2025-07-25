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
  Gamepad2
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
    <div className="space-y-6">
      
      {/* LIVE MATCHES HEADER WITH STATS */}
      <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-800 rounded-xl p-4 border-2 border-red-500/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Play className="h-8 w-8 text-red-300 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Live Matches</h2>
              <p className="text-red-200 text-sm">Real-time competition across all leagues</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{liveMatches.length}</div>
            <p className="text-red-200 text-xs font-semibold uppercase">Active</p>
          </div>
        </div>
      </div>

      {/* YOUR LIVE MATCHES - HIGHEST PRIORITY */}
      {categorizedMatches.userMatches.length > 0 && (
        <Collapsible defaultOpen className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <Card className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 border-2 border-blue-500/50 hover:border-blue-400 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">Your Live Matches</h3>
                      <p className="text-blue-300 text-sm">{categorizedMatches.userMatches.length} active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-blue-100 animate-pulse">PRIORITY</Badge>
                    <ChevronDown className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3">
              {categorizedMatches.userMatches.map((match) => (
                <Card key={match.id} className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-600/50 hover:border-blue-500 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getMatchTypeIcon(match.type)}
                          <Badge className={`bg-gradient-to-r ${getMatchTypeColor(match.type)} text-white`}>
                            {match.type}
                          </Badge>
                        </div>
                        <div>
                          <div className="font-bold text-white">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-sm text-blue-300">
                            {match.gameTime ? formatGameTime(match.gameTime) : 'Starting Soon'} • 
                            {match.viewers ? ` ${match.viewers} viewers` : ' Live'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.homeScore !== undefined && match.awayScore !== undefined && (
                          <div className="text-xl font-bold text-white">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        )}
                        <Link href={`/match/${match.id}`}>
                          <Button className="bg-red-600 hover:bg-red-700 animate-pulse" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Watch Live
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {match.gameTime && match.maxGameTime && (
                      <div className="mt-3">
                        <Progress 
                          value={(match.gameTime / match.maxGameTime) * 100} 
                          className="h-1 bg-blue-900"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* HIGH PRIORITY MATCHES */}
      {categorizedMatches.highPriority.length > 0 && (
        <Collapsible className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <Card className="bg-gradient-to-r from-red-800 via-red-700 to-red-800 border border-red-600/50 hover:border-red-500 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flame className="h-6 w-6 text-red-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">Featured Matches</h3>
                      <p className="text-red-300 text-sm">High-stakes competitions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-red-100">{categorizedMatches.highPriority.length}</Badge>
                    <ChevronDown className="h-5 w-5 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-3">
              {categorizedMatches.highPriority.map((match) => (
                <Card key={match.id} className="bg-gray-800/90 border border-red-600/30 hover:border-red-500/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getMatchTypeIcon(match.type)}
                          <Badge className={`bg-gradient-to-r ${getMatchTypeColor(match.type)} text-white text-xs`}>
                            {match.type}
                          </Badge>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {match.tournamentName || `Division ${match.division}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.homeScore !== undefined && match.awayScore !== undefined && (
                          <div className="text-sm font-bold text-white">
                            {match.homeScore}-{match.awayScore}
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          onClick={() => openMatchDetails(match)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* TOURNAMENT MATCHES */}
      {categorizedMatches.tournaments.length > 0 && (
        <Collapsible className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <Card className="bg-gradient-to-r from-purple-800 to-purple-700 border border-purple-600/50 hover:border-purple-500 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Medal className="h-6 w-6 text-purple-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">Tournament Matches</h3>
                      <p className="text-purple-300 text-sm">Championship brackets in progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600 text-purple-100">{categorizedMatches.tournaments.length}</Badge>
                    <ChevronDown className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-2">
              {categorizedMatches.tournaments.slice(0, 5).map((match) => (
                <Card key={match.id} className="bg-gray-800/90 border border-purple-600/30 hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Medal className="h-4 w-4 text-purple-400" />
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {match.tournamentName || 'Tournament'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.homeScore !== undefined && match.awayScore !== undefined && (
                          <div className="text-sm font-bold text-white">
                            {match.homeScore}-{match.awayScore}
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          onClick={() => openMatchDetails(match)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categorizedMatches.tournaments.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" className="border-purple-600 text-purple-300 hover:bg-purple-900/50">
                    View All {categorizedMatches.tournaments.length} Tournament Matches
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* LEAGUE MATCHES */}
      {categorizedMatches.leagues.length > 0 && (
        <Collapsible className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <Card className="bg-gradient-to-r from-yellow-800 to-orange-700 border border-yellow-600/50 hover:border-yellow-500 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">League Matches</h3>
                      <p className="text-yellow-300 text-sm">Regular season games</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-600 text-yellow-100">{categorizedMatches.leagues.length}</Badge>
                    <ChevronDown className="h-5 w-5 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-2">
              {categorizedMatches.leagues.slice(0, 8).map((match) => (
                <Card key={match.id} className="bg-gray-800/90 border border-yellow-600/30 hover:border-yellow-500/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            Division {match.division}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.homeScore !== undefined && match.awayScore !== undefined && (
                          <div className="text-sm font-bold text-white">
                            {match.homeScore}-{match.awayScore}
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          onClick={() => openMatchDetails(match)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categorizedMatches.leagues.length > 8 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-300 hover:bg-yellow-900/50">
                    View All {categorizedMatches.leagues.length} League Matches
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* EXHIBITION MATCHES */}
      {categorizedMatches.exhibitions.length > 0 && (
        <Collapsible className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <Card className="bg-gradient-to-r from-green-800 to-blue-700 border border-green-600/50 hover:border-green-500 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 text-green-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">Exhibition Matches</h3>
                      <p className="text-green-300 text-sm">Practice and friendly games</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-green-100">{categorizedMatches.exhibitions.length}</Badge>
                    <ChevronDown className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-2">
              {categorizedMatches.exhibitions.slice(0, 6).map((match) => (
                <Card key={match.id} className="bg-gray-800/90 border border-green-600/30 hover:border-green-500/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-green-400" />
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            Exhibition • Division {match.division}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.homeScore !== undefined && match.awayScore !== undefined && (
                          <div className="text-sm font-bold text-white">
                            {match.homeScore}-{match.awayScore}
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          onClick={() => openMatchDetails(match)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categorizedMatches.exhibitions.length > 6 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" className="border-green-600 text-green-300 hover:bg-green-900/50">
                    View All {categorizedMatches.exhibitions.length} Exhibition Matches
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* LIVE MATCH DETAILS DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-gray-900 border-gray-700">
          <DrawerHeader>
            <DrawerTitle className="text-white">
              {selectedMatch && (
                <div className="flex items-center gap-3">
                  {getMatchTypeIcon(selectedMatch.type)}
                  <span>{selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.name}</span>
                </div>
              )}
            </DrawerTitle>
            <DrawerDescription className="text-gray-400">
              {selectedMatch && (
                <div className="flex items-center gap-4">
                  <Badge className={`bg-gradient-to-r ${getMatchTypeColor(selectedMatch.type)} text-white`}>
                    {selectedMatch.type}
                  </Badge>
                  {selectedMatch.tournamentName && (
                    <span>{selectedMatch.tournamentName}</span>
                  )}
                  {selectedMatch.division && (
                    <span>Division {selectedMatch.division}</span>
                  )}
                </div>
              )}
            </DrawerDescription>
          </DrawerHeader>
          {selectedMatch && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{selectedMatch.homeTeam.name}</div>
                  <div className="text-4xl font-black text-white mt-2">
                    {selectedMatch.homeScore ?? '-'}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-400 mb-2">vs</div>
                  <div className="text-lg font-bold text-white">
                    {selectedMatch.gameTime ? formatGameTime(selectedMatch.gameTime) : 'Starting Soon'}
                  </div>
                  {selectedMatch.gameTime && selectedMatch.maxGameTime && (
                    <Progress 
                      value={(selectedMatch.gameTime / selectedMatch.maxGameTime) * 100} 
                      className="h-2 w-full mt-2"
                    />
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{selectedMatch.awayTeam.name}</div>
                  <div className="text-4xl font-black text-white mt-2">
                    {selectedMatch.awayScore ?? '-'}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <Link href={`/match/${selectedMatch.id}`}>
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Play className="h-4 w-4 mr-2" />
                    Watch Live
                  </Button>
                </Link>
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <Target className="h-4 w-4 mr-2" />
                  Match Stats
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

    </div>
  );
}