import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  Trophy, 
  Award, 
  Calendar, 
  Target, 
  Clock, 
  Play, 
  Star, 
  TrendingUp,
  Gamepad2,
  Users,
  ChevronRight,
  Zap,
  Shield,
  Timer,
  Bell,
  ChevronDown,
  Flame,
  Medal,
  Activity
} from 'lucide-react';
import UnifiedTeamHeader from './UnifiedTeamHeader';

// Type definitions
type Team = {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws?: number;
  points: number;
  teamPower?: number;
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

type Tournament = {
  id: string;
  name: string;
  type: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  entryFeeCredits?: number;
  entryFeeGems?: number;
  prizePool?: any;
  registrationEndTime?: string;
  startTime?: string;
};

type Exhibition = {
  id: string;
  type: 'INSTANT' | 'CHOOSE_OPPONENT';
  availableOpponents?: Team[];
  freeEntriesRemaining: number;
  extraTokens: number;
};

export default function ComprehensiveCompetitionCenter() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'league' | 'tournaments' | 'exhibitions' | 'schedule'>('league');

  // Queries
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: players } = useQuery({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  const { data: seasonData } = useQuery({
    queryKey: ['/api/season/current-cycle'],
  });

  const { data: liveMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches/live"],
    refetchInterval: 30000,
  });

  const { data: upcomingMatches } = useQuery<Match[]>({
    queryKey: [`/api/teams/${team?.id}/matches/upcoming`],
    enabled: !!team?.id,
  });

  const { data: recentMatches } = useQuery<Match[]>({
    queryKey: [`/api/teams/${team?.id}/matches/recent`],
    enabled: !!team?.id,
  });

  const { data: standings } = useQuery<Team[]>({
    queryKey: [`/api/leagues/${team?.division || 8}/standings`],
    enabled: !!team?.division,
  });

  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: [`/api/tournaments/available/${team?.division}`],
    enabled: !!team?.division,
  });

  const { data: exhibitions } = useQuery<Exhibition>({
    queryKey: [`/api/exhibitions/available`],
    enabled: !!team?.id,
  });

  // Helper functions
  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-red-600 text-red-100 animate-pulse';
      case 'SCHEDULED': return 'bg-blue-600 text-blue-100';
      case 'COMPLETED': return 'bg-green-600 text-green-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getMatchResult = (match: Match, teamId: string) => {
    if (match.status !== 'COMPLETED') return null;
    
    const isHome = match.homeTeam.id === teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    
    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'W': return 'text-green-400';
      case 'L': return 'text-red-400';
      case 'D': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatMatchTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Now';
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-orange-400" />
          <h1 className="text-3xl font-bold mb-6">Join the Competition</h1>
          <p className="text-gray-300 mb-8">Create your team to enter leagues and tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* DRAMATIC HERO BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-purple-800 to-blue-900 rounded-2xl p-6 md:p-8 mb-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                  🏆 Competition Center 🏆
                </h1>
                <p className="text-xl text-purple-100 font-semibold">
                  Compete • Conquer • Claim Glory
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-lg">
                  Division {team?.division || 8} - {team?.subdivision?.charAt(0).toUpperCase() + team?.subdivision?.slice(1) || 'Eta'}
                </Badge>
                <Badge className="bg-yellow-600 text-yellow-100 px-3 py-1">
                  Season 0 • Day 9/17
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* CRITICAL ALERTS PANEL */}
        {seasonData?.phase === 'DIVISION_TOURNAMENT' && (
          <div className="bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-400 rounded-xl p-4 mb-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse"></div>
              <Trophy className="h-6 w-6 text-red-100" />
              <div>
                <h3 className="text-xl font-bold text-white">DIVISION TOURNAMENT ACTIVE!</h3>
                <p className="text-red-100">Compete for championship glory and promotion to higher division</p>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-700 via-green-800 to-green-900 border-2 border-green-500 transform hover:scale-105 transition-all duration-300 shadow-xl">
            <CardContent className="p-6 text-center">
              <Trophy className="w-10 h-10 text-green-300 mx-auto mb-3" />
              <div className="text-3xl font-black text-green-200 mb-1">
                {team?.wins || 0}-{0}-{team?.losses || 0}
              </div>
              <p className="text-green-300 font-bold uppercase tracking-wide text-sm">Record</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 border-2 border-blue-500 transform hover:scale-105 transition-all duration-300 shadow-xl">
            <CardContent className="p-6 text-center">
              <Star className="w-10 h-10 text-blue-300 mx-auto mb-3" />
              <div className="text-3xl font-black text-blue-200 mb-1">{team?.points || 0}</div>
              <p className="text-blue-300 font-bold uppercase tracking-wide text-sm">Points</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-700 via-red-800 to-red-900 border-2 border-red-500 transform hover:scale-105 transition-all duration-300 shadow-xl">
            <CardContent className="p-6 text-center">
              <Activity className="w-10 h-10 text-red-300 mx-auto mb-3" />
              <div className="text-3xl font-black text-red-200 mb-1">{liveMatches?.length || 0}</div>
              <p className="text-red-300 font-bold uppercase tracking-wide text-sm">Live</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 border-2 border-purple-500 transform hover:scale-105 transition-all duration-300 shadow-xl">
            <CardContent className="p-6 text-center">
              <Medal className="w-10 h-10 text-purple-300 mx-auto mb-3" />
              <div className="text-3xl font-black text-purple-200 mb-1">{tournaments?.length || 0}</div>
              <p className="text-purple-300 font-bold uppercase tracking-wide text-sm">Tournaments</p>
            </CardContent>
          </Card>
        </div>

        {/* COMPETITION TABS - MOBILE-FIRST STICKY NAVIGATION */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          
          {/* Enhanced Sticky Tab Navigation */}
          <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-purple-500/30 mb-6 -mx-4 px-4 py-3 shadow-lg">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full bg-gradient-to-r from-gray-800 to-gray-700 p-2 rounded-xl border border-purple-500/20">
                <TabsTrigger 
                  value="league" 
                  className="flex-1 min-w-[90px] text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  <Trophy className="h-5 w-5 mr-2" />
                  League
                </TabsTrigger>
                <TabsTrigger 
                  value="tournaments" 
                  className="flex-1 min-w-[110px] text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  <Award className="h-5 w-5 mr-2" />
                  Tournaments
                </TabsTrigger>
                <TabsTrigger 
                  value="exhibitions" 
                  className="flex-1 min-w-[110px] text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Exhibitions
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule" 
                  className="flex-1 min-w-[100px] text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Schedule
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* LEAGUE TAB - PROGRESSIVE DISCLOSURE DESIGN */}
          <TabsContent value="league" className="space-y-4">
            
            {/* MY SUBDIVISION STANDINGS - ENHANCED COLLAPSIBLE */}
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-2 border-yellow-500/50 hover:border-yellow-400 transition-all duration-300 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-yellow-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">My Subdivision Standings</h3>
                          <p className="text-yellow-300 text-sm">Division {team?.division || 8} - {team?.subdivision?.charAt(0).toUpperCase() + team?.subdivision?.slice(1) || 'Eta'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-600 text-yellow-100">
                          #{standings?.findIndex(s => s.id === team?.id) + 1 || '?'} of 8
                        </Badge>
                        <ChevronDown className="h-5 w-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600 shadow-xl">
                  <CardContent className="p-4">
                    {standings && standings.length > 0 ? (
                      <div className="space-y-3">
                        {standings.map((standingTeam, index) => (
                          <div 
                            key={standingTeam.id} 
                            className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                              standingTeam.id === team?.id 
                                ? 'bg-gradient-to-r from-blue-600/40 to-purple-600/40 border-2 border-blue-400 shadow-lg' 
                                : 'bg-gray-700/60 hover:bg-gray-600/70 border border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                                index < 2 ? 'bg-gradient-to-r from-green-500 to-green-600 text-green-100' : 
                                index >= standings.length - 2 ? 'bg-gradient-to-r from-red-500 to-red-600 text-red-100' : 
                                'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-100'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">{standingTeam.name}</p>
                                <p className="text-sm text-gray-300 font-medium">
                                  {standingTeam.wins}W - {standingTeam.draws || 0}D - {standingTeam.losses}L
                                </p>
                              </div>
                              {standingTeam.id === team?.id && (
                                <Badge className="bg-blue-600 text-blue-100 animate-pulse">YOU</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-white">{standingTeam.points}</p>
                              <p className="text-xs text-gray-400 font-semibold uppercase">pts</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Standings will appear once the season begins</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* NEXT LEAGUE MATCH - DRAMATIC HIGHLIGHT */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-800 via-blue-700 to-purple-800 border-2 border-blue-400 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                    <Clock className="h-6 w-6 text-blue-300" />
                    <h3 className="text-xl font-bold text-white">Next League Match</h3>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-3xl font-black text-white mb-2">
                        🆚 {upcomingMatches[0].homeTeam.id === team?.id ? 
                            upcomingMatches[0].awayTeam.name : 
                            upcomingMatches[0].homeTeam.name}
                      </h4>
                      <div className="flex items-center gap-4 text-blue-200 text-lg font-semibold">
                        <span>{upcomingMatches[0].homeTeam.id === team?.id ? '🏠 Home' : '✈️ Away'}</span>
                        <span>•</span>
                        <span>{formatMatchTime(upcomingMatches[0].gameDate)}</span>
                      </div>
                    </div>
                    <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg">
                      <Play className="h-5 w-5 mr-2" />
                      View Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DIVISION PROGRESS - ENHANCED PROGRESS TRACKER */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-green-500/50 hover:border-green-400 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-green-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Division Progress</h3>
                          <p className="text-green-300 text-sm">Promotion & Relegation Status</p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold">Current Position</span>
                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg px-4 py-1">
                          #{standings?.findIndex(s => s.id === team?.id) + 1 || '?'} of {standings?.length || 8}
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400 font-semibold">🔥 Promotion Zone (Top 2)</span>
                          <span className="text-green-300">Advance to Division {(team?.division || 8) - 1}</span>
                        </div>
                        <Progress 
                          value={Math.max(0, Math.min(100, ((8 - (standings?.findIndex(s => s.id === team?.id) || 0)) / 8) * 100))} 
                          className="h-3 bg-gray-700"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400 font-semibold">⚠️ Relegation Zone (Bottom 2)</span>
                          <span className="text-red-300">Drop to Division {(team?.division || 8) + 1}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

          </TabsContent>

          {/* TOURNAMENTS TAB - ENHANCED DRAMATIC DESIGN */}
          <TabsContent value="tournaments" className="space-y-4">
            
            {/* ACTIVE TOURNAMENTS - COLLAPSIBLE PROGRESSIVE DISCLOSURE */}
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-2 border-yellow-500/50 hover:border-yellow-400 transition-all duration-300 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-6 w-6 text-yellow-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Active Tournaments</h3>
                          <p className="text-yellow-300 text-sm">Championship competitions await</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-600 text-yellow-100">2 Available</Badge>
                        <ChevronDown className="h-5 w-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4">
                  
                  {/* Daily Division Tournament - ENHANCED */}
                  <Card className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-800 border-2 border-green-400 shadow-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
                        <Trophy className="h-6 w-6 text-green-300" />
                        <h3 className="text-xl font-bold text-white">Daily Division Tournament</h3>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <p className="text-green-200 font-semibold mb-2">🏆 Championship Glory • 💰 Daily Rewards</p>
                          <p className="text-green-100 text-sm">
                            Compete against teams in Division {team?.division || 8} for daily rewards and championship bragging rights.
                          </p>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-green-600 text-green-100 text-lg px-4 py-2 mb-2">
                            🎟️ Free Entry: 1/1
                          </Badge>
                          <p className="text-green-200 text-xs">Resets daily at 3 AM</p>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg">
                        <Trophy className="h-5 w-5 mr-2" />
                        Enter Tournament
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Mid-Season Cup - ENHANCED */}
                  <Card className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 border-2 border-purple-400 shadow-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Flame className="h-6 w-6 text-purple-300" />
                        <h3 className="text-xl font-bold text-white">Mid-Season Cup</h3>
                        <Badge className="bg-purple-600 text-purple-100">Elite</Badge>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <p className="text-purple-200 font-semibold mb-2">🔥 Elite Competition • 💎 Premium Rewards</p>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-purple-400" />
                              <span className="text-purple-300 font-semibold">Starts Day 7</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-400" />
                              <span className="text-purple-300">Countdown: 2 days</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-purple-300 text-sm font-semibold mb-1">Entry Cost</p>
                          <div className="bg-purple-900/50 rounded-lg p-3">
                            <p className="text-purple-200 font-bold text-lg">₡5,000</p>
                            <p className="text-purple-300 text-sm">or 💎25</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg">
                        <Award className="h-5 w-5 mr-2" />
                        Register Now
                      </Button>
                    </CardContent>
                  </Card>

                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* TOURNAMENT HISTORY - COLLAPSIBLE */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-blue-500/50 hover:border-blue-400 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="h-6 w-6 text-blue-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Tournament History</h3>
                          <p className="text-blue-300 text-sm">Past championships & achievements</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-blue-100">0 Tournaments</Badge>
                        <ChevronDown className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <Award className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-gray-400 mb-2">No Tournament History Yet</h4>
                      <p className="text-gray-500 text-lg">Your tournament results will appear here</p>
                      <p className="text-gray-600 text-sm mt-2">Keep participating to build your championship legacy!</p>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

          </TabsContent>

          {/* EXHIBITIONS TAB */}
          <TabsContent value="exhibitions" className="space-y-6">
            
            {/* Exhibition Opportunities */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-400" />
                  Exhibition Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-600">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">Free Exhibitions</h3>
                      <Badge className="bg-orange-600 text-orange-100">3/3 Remaining</Badge>
                    </div>
                    <p className="text-orange-200 text-sm mb-3">Daily allocation resets at 3 AM</p>
                    <Progress value={100} className="h-2 mb-3" />
                    <p className="text-xs text-orange-300">Next reset: 23h 45m</p>
                  </div>

                  <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-600">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">Extra Tokens</h3>
                      <Badge className="bg-purple-600 text-purple-100">3 Available</Badge>
                    </div>
                    <p className="text-purple-200 text-sm mb-3">Purchase additional exhibition entries</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full border-purple-500 text-purple-300 hover:bg-purple-600 hover:text-white"
                    >
                      Buy Token - ₡500
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exhibition Match Types */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-blue-400" />
                  Start Exhibition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Instant Exhibition</h3>
                        <p className="text-blue-200 text-sm">Quick match vs. similarly powered team</p>
                      </div>
                      <Shield className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-200">
                        <p>⚡ 30 minute match</p>
                        <p>🎯 Balanced matchmaking</p>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Start Now
                      </Button>
                    </div>
                  </div>

                  <div className="bg-green-900/30 p-4 rounded-lg border border-green-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Choose Opponent</h3>
                        <p className="text-green-200 text-sm">Browse 6 available opponents</p>
                      </div>
                      <Users className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-200">
                        <p>🎯 Strategic matchup selection</p>
                        <p>📊 View opponent stats</p>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Select Opponent
                      </Button>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Exhibition History */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  Exhibition History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No exhibition matches yet</p>
                  <p className="text-gray-500 text-sm">Your exhibition results will appear here</p>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-6">
            
            {/* Unified Calendar */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Unified Schedule
                  <Badge variant="outline" className="ml-auto">
                    Day {seasonData?.currentDay || 9} of 17
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  {/* My Team Matches - Pinned to top */}
                  {upcomingMatches && upcomingMatches.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        My Team Matches
                      </h3>
                      {upcomingMatches.slice(0, 3).map((match) => (
                        <div key={match.id} className="bg-yellow-900/20 border border-yellow-600 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${getMatchStatusColor(match.status)} text-xs`}>
                                  {match.matchType}
                                </Badge>
                                <span className="font-semibold text-white">
                                  vs {match.homeTeam.id === team.id ? match.awayTeam.name : match.homeTeam.name}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">
                                {match.homeTeam.id === team.id ? 'Home' : 'Away'} • {formatMatchTime(match.gameDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.status === 'LIVE' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Other Matches */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400">Other Division Matches</h3>
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">League schedule loading...</p>
                      <p className="text-gray-500 text-sm">Division fixtures will appear here</p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
}