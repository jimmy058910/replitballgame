import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  Calendar, 
  Star, 
  Trophy, 
  Award, 
  Filter,
  ChevronDown,
  Eye,
  Play,
  Clock,
  Info
} from 'lucide-react';

// Match type for Schedule
type ScheduleMatch = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  matchType: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION';
  homeScore?: number;
  awayScore?: number;
};

type Team = {
  id: string;
  name: string;
  division: number;
};

type SeasonData = {
  currentDay: number;
  phase: string;
};

type DailySchedule = {
  schedule: Record<string, ScheduleMatch[]>;
  totalDays: number;
  currentDay: number;
};

type Match = {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore: number;
  awayScore: number;
  gameDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  matchType: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION';
};

interface ScheduleViewProps {
  team?: Team;
  seasonData?: SeasonData;
  dailySchedule?: DailySchedule;
  upcomingMatches?: Match[];
  recentMatches?: Match[];
}

export default function ScheduleView({ 
  team, 
  seasonData, 
  dailySchedule, 
  upcomingMatches, 
  recentMatches 
}: ScheduleViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'league' | 'tournaments' | 'exhibitions'>('all');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Helper function to format match time
  const formatMatchTime = (gameDate: string) => {
    const date = new Date(gameDate);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Helper function to format match date
  const formatMatchDate = (gameDate: string) => {
    const date = new Date(gameDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Get match type color
  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'LEAGUE': return 'bg-blue-600 text-blue-100';
      case 'TOURNAMENT': return 'bg-purple-600 text-purple-100';
      case 'EXHIBITION': return 'bg-gray-600 text-gray-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  // Get match type icon color
  const getMatchTypeIconColor = (matchType: string) => {
    switch (matchType) {
      case 'LEAGUE': return 'bg-blue-400';
      case 'TOURNAMENT': return 'bg-purple-400';
      case 'EXHIBITION': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Filter matches based on active filter
  const filterMatches = (matches: ScheduleMatch[]) => {
    if (activeFilter === 'all') return matches;
    if (activeFilter === 'league') return matches.filter(m => m.matchType === 'LEAGUE');
    if (activeFilter === 'tournaments') return matches.filter(m => m.matchType === 'TOURNAMENT');
    if (activeFilter === 'exhibitions') return matches.filter(m => m.matchType === 'EXHIBITION');
    return matches;
  };

  // Generate all days from current day to day 17
  const currentDay = seasonData?.currentDay || 12;
  const daysToShow = Array.from({ length: Math.min(6, 17 - currentDay + 1) }, (_, i) => currentDay + i);

  return (
    <div className="space-y-4">
      
      {/* NEXT 3 MATCHES SECTION - DESKTOP TWO-COLUMN, MOBILE ACCORDION */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <div className="block md:hidden">
          <Collapsible className="space-y-2">
            <CollapsibleTrigger className="w-full">
              <Card className="bg-gradient-to-r from-blue-800 via-blue-700 to-purple-800 border-2 border-blue-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Star className="h-6 w-6 text-yellow-400" />
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-white">My Next Matches</h3>
                        <p className="text-blue-300 text-sm">Upcoming 3 matches</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-600 text-yellow-100">{upcomingMatches.length}</Badge>
                      <ChevronDown className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-gray-800/90 border border-gray-600">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {upcomingMatches.slice(0, 3).map((match, index) => (
                      <div key={match.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                            <div>
                              <h4 className="font-bold text-white text-lg">
                                🆚 {match.homeTeam.id === team?.id ? match.awayTeam.name : match.homeTeam.name}
                              </h4>
                              <p className="text-blue-200 text-sm">
                                {match.homeTeam.id === team?.id ? '🏠 Home' : '✈️ Away'} • {formatMatchTime(match.gameDate)}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-blue-600 text-blue-100">League</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* DESKTOP: NEXT 3 MATCHES - TWO COLUMN LAYOUT */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <div className="hidden md:block">
          <Card className="bg-gradient-to-r from-blue-800 via-blue-700 to-purple-800 border-2 border-blue-400 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Star className="h-6 w-6 text-yellow-400" />
                My Next Matches
                <Badge className="bg-yellow-600 text-yellow-100 ml-auto">Priority</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {upcomingMatches.slice(0, 3).map((match, index) => (
                  <div key={match.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                        <Badge className="bg-blue-600 text-blue-100 text-xs">League</Badge>
                      </div>
                      <h4 className="font-bold text-white">
                        🆚 {match.homeTeam.id === team?.id ? match.awayTeam.name : match.homeTeam.name}
                      </h4>
                      <p className="text-blue-200 text-sm">
                        {match.homeTeam.id === team?.id ? '🏠 Home' : '✈️ Away'}
                      </p>
                      <p className="text-blue-300 text-xs">
                        {formatMatchDate(match.gameDate)} • {formatMatchTime(match.gameDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STICKY SUB-TAB BAR WITH FILTERS */}
      <Card className="bg-gray-800 border-gray-700 sticky top-4 z-10">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">Filter:</span>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All', color: 'bg-cyan-600' },
                { key: 'league', label: 'League', color: 'bg-blue-600' },
                { key: 'tournaments', label: 'Tournaments', color: 'bg-purple-600' },
                { key: 'exhibitions', label: 'Exhibitions', color: 'bg-gray-600' }
              ].map(filter => (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={activeFilter === filter.key ? "default" : "outline"}
                  className={activeFilter === filter.key ? 
                    `${filter.color} text-white hover:opacity-90` : 
                    "border-gray-600 text-gray-300 hover:bg-gray-700"
                  }
                  onClick={() => setActiveFilter(filter.key as any)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SINGLE SCROLLABLE LIST GROUPED BY GAME DAY */}
      <div className="space-y-4">
        {daysToShow.map((day) => {
          // Determine match type: League games Days 1-14, Division Tournaments Day 15+
          const isLeagueDay = day <= 14;
          const isTournamentDay = day === 15;
          const isOffseason = day >= 16;
          
          // Get real matches for this day from schedule data
          const dayMatches = dailySchedule?.schedule?.[day.toString()] || [];
          const filteredMatches = filterMatches(dayMatches);
          
          // Skip days with no matches after filtering
          if (filteredMatches.length === 0 && !isOffseason) return null;
          
          const dayLabel = isLeagueDay ? 'League Matches' : 
                          isTournamentDay ? 'Division Tournaments' :
                          'Offseason';
          
          const dayColor = isLeagueDay ? 'border-blue-500/50' : 
                          isTournamentDay ? 'border-purple-500/50' :
                          'border-gray-500/50';

          return (
            <Card key={day} className={`bg-gray-800/90 border ${dayColor}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                    Day {day} of 17
                    <Badge variant="outline" className="text-gray-300">
                      {dayLabel}
                    </Badge>
                  </CardTitle>
                  {filteredMatches.length > 0 && (
                    <Badge className="bg-cyan-600 text-cyan-100">
                      {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isOffseason ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-400 mb-2">
                      {day === 16 ? 'Offseason - Roster Management' : 'Offseason - Player Progression'}
                    </h4>
                    <p className="text-gray-500">
                      {day === 16 ? 'Focus on roster management and staff renewals' : 'Player progression, tryouts, and season preparation'}
                    </p>
                  </div>
                ) : filteredMatches.length > 0 ? (
                  <div className="space-y-2">
                    {filteredMatches.map((match, index) => {
                      const isMyMatch = match.homeTeamId === team?.id || match.awayTeamId === team?.id;
                      const gameTime = match.gameDate ? formatMatchTime(match.gameDate) : '5:00 PM';
                      const gameDate = match.gameDate ? formatMatchDate(match.gameDate) : 'TBD';
                      
                      // Determine opponent name
                      const opponentName = isMyMatch ? 
                        (match.homeTeamId === team?.id ? match.awayTeamName : match.homeTeamName) :
                        null;
                      
                      return (
                        <div 
                          key={`${match.id}-${index}`} 
                          className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-all hover:bg-gray-700/50 ${
                            isMyMatch ? 'bg-blue-900/30 border-blue-500/50 shadow-lg' : 'bg-gray-700/30 border-gray-600'
                          }`}
                        >
                          {/* LEFT: Game Day / Time */}
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              isMyMatch ? 'bg-yellow-400 animate-pulse' : getMatchTypeIconColor(match.matchType || 'league')
                            }`}></div>
                            <div className="text-sm">
                              <div className="text-gray-300 font-medium">{gameDate}</div>
                              <div className="text-gray-400 text-xs">{gameTime}</div>
                            </div>
                          </div>
                          
                          {/* MIDDLE: Team A vs Team B */}
                          <div className="flex-1 text-center">
                            {isMyMatch ? (
                              <div className="font-bold text-white">
                                🆚 {opponentName}
                                <div className="text-xs text-blue-300 mt-1">
                                  {match.homeTeamId === team?.id ? '🏠 Home' : '✈️ Away'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-300">
                                {match.homeTeamName} <span className="text-gray-500">vs</span> {match.awayTeamName}
                              </div>
                            )}
                          </div>
                          
                          {/* RIGHT: Badge and Action Button */}
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getMatchTypeColor(match.matchType || 'league')}`}>
                              {match.matchType ? 
                                match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1).toLowerCase() : 
                                'League'
                              }
                            </Badge>
                            {isMyMatch && (
                              <>
                                <Star className="h-4 w-4 text-yellow-400" />
                                <Button size="sm" variant="outline" className="border-blue-500 text-blue-300 hover:bg-blue-900/30">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </>
                            )}
                            {!isMyMatch && match.status === 'LIVE' && (
                              <Button size="sm" variant="outline" className="border-green-500 text-green-300 hover:bg-green-900/30">
                                <Play className="h-3 w-3 mr-1" />
                                Watch
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No matches scheduled for this day</p>
                    <p className="text-gray-500 text-sm">Check back later for updates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* MATCH TYPE LEGEND - CONSISTENT STYLING */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Info className="h-5 w-5 text-blue-400" />
            Match Types & Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-blue-300 text-sm">League Matches</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
              <span className="text-purple-300 text-sm">Tournaments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-600 rounded"></div>
              <span className="text-gray-300 text-sm">Exhibition</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-yellow-300 text-sm">My Team</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}