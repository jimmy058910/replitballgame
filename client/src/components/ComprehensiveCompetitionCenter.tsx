import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
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
  Bell
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
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Unified Team Header */}
        <UnifiedTeamHeader 
          title="Competition Center"
          titleIcon="🏆"
          team={team}
          players={players}
        />

        {/* Competition Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-700 to-green-900 border-green-500">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-6 h-6 text-green-400" />
                <span className="text-2xl font-bold text-green-400">{team.wins}-{team.draws || 0}-{team.losses}</span>
              </div>
              <p className="text-green-200 text-sm font-medium">Record</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-700 to-blue-900 border-blue-500">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-6 h-6 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">{team.points}</span>
              </div>
              <p className="text-blue-200 text-sm font-medium">Points</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-700 to-red-900 border-red-500">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <Gamepad2 className="w-6 h-6 text-red-400" />
                <span className="text-2xl font-bold text-red-400">{liveMatches?.length || 0}</span>
              </div>
              <p className="text-red-200 text-sm font-medium">Live</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-700 to-purple-900 border-purple-500">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-6 h-6 text-purple-400" />
                <span className="text-2xl font-bold text-purple-400">{tournaments?.length || 0}</span>
              </div>
              <p className="text-purple-200 text-sm font-medium">Tournaments</p>
            </CardContent>
          </Card>
        </div>

        {/* Seasonal Context Alert */}
        {seasonData?.phase === 'DIVISION_TOURNAMENT' && (
          <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
            <Trophy className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <strong>Division Tournament Active!</strong> Compete for championship glory and promotion.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          
          {/* Sticky Tab Navigation */}
          <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm mb-6 -mx-4 px-4 py-2">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full bg-gray-800 p-1">
                <TabsTrigger value="league" className="flex-1 min-w-[80px] text-xs md:text-sm">
                  <Trophy className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">League</span>
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="flex-1 min-w-[100px] text-xs md:text-sm">
                  <Award className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Tournaments</span>
                </TabsTrigger>
                <TabsTrigger value="exhibitions" className="flex-1 min-w-[100px] text-xs md:text-sm">
                  <Zap className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Exhibitions</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1 min-w-[90px] text-xs md:text-sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Schedule</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* LEAGUE TAB */}
          <TabsContent value="league" className="space-y-6">
            
            {/* My Subdivision Standings Panel */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Division {team.division} - {team.subdivision?.charAt(0).toUpperCase() + team.subdivision?.slice(1) || 'Eta'} Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {standings && standings.length > 0 ? (
                  <div className="space-y-2">
                    {standings.map((standingTeam, index) => (
                      <div 
                        key={standingTeam.id} 
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          standingTeam.id === team.id 
                            ? 'bg-blue-600/30 border border-blue-500' 
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 2 ? 'bg-green-600 text-green-100' : 
                            index >= standings.length - 2 ? 'bg-red-600 text-red-100' : 
                            'bg-gray-600 text-gray-100'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{standingTeam.name}</p>
                            <p className="text-sm text-gray-400">
                              {standingTeam.wins}W - {standingTeam.draws || 0}D - {standingTeam.losses}L
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{standingTeam.points}</p>
                          <p className="text-xs text-gray-400">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Standings will appear here once the season begins</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next League Match */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    Next League Match
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        vs {upcomingMatches[0].homeTeam.id === team.id ? 
                            upcomingMatches[0].awayTeam.name : 
                            upcomingMatches[0].homeTeam.name}
                      </h3>
                      <div className="flex items-center gap-4 text-blue-200">
                        <span>{upcomingMatches[0].homeTeam.id === team.id ? 'Home' : 'Away'}</span>
                        <span>•</span>
                        <span>{formatMatchTime(upcomingMatches[0].gameDate)}</span>
                      </div>
                    </div>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Play className="h-4 w-4 mr-2" />
                      View Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Division Rank Snapshot */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Division Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current Position</span>
                    <span className="text-white font-semibold">
                      #{standings?.findIndex(s => s.id === team.id) + 1 || '?'} of {standings?.length || 8}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Promotion Zone</span>
                      <span className="text-green-400">Top 2</span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, ((8 - (standings?.findIndex(s => s.id === team.id) || 0)) / 8) * 100))} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Relegation Zone</span>
                      <span className="text-red-400">Bottom 2</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* TOURNAMENTS TAB */}
          <TabsContent value="tournaments" className="space-y-6">
            
            {/* Active Tournaments */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-400" />
                  Active Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  {/* Daily Division Tournament */}
                  <div className="bg-gradient-to-r from-green-700 to-green-900 p-4 rounded-lg border border-green-500">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Daily Division Tournament</h3>
                        <p className="text-green-200 text-sm">Compete against teams in your division for daily rewards</p>
                      </div>
                      <Badge className="bg-green-600 text-green-100">Free Entry</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-200">
                        <p>🎫 Free Entry Remaining: 1/1</p>
                        <p>💎 Extra entries available in store</p>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Enter Now
                      </Button>
                    </div>
                  </div>

                  {/* Mid-Season Cup */}
                  <div className="bg-gradient-to-r from-purple-700 to-purple-900 p-4 rounded-lg border border-purple-500">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Mid-Season Cup</h3>
                        <p className="text-purple-200 text-sm">Cross-division tournament starting Day 7</p>
                      </div>
                      <Badge className="bg-purple-600 text-purple-100">₡5,000 or 💎50</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-purple-200">
                        <p>⏰ Registration closes in 2 days</p>
                        <p>🏆 Prize pool: ₡50,000 + exclusive items</p>
                      </div>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Register
                      </Button>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Tournament History */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  Tournament History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No tournament history yet</p>
                  <p className="text-gray-500 text-sm">Your tournament results will appear here</p>
                </div>
              </CardContent>
            </Card>

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