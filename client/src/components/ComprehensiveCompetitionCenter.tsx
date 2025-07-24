import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  Activity,
  Info,
  Globe,
  ArrowUp,
  ArrowDown,
  Eye,
  ExternalLink
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
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  gamesPlayed?: number;
};

type GlobalRanking = {
  id: string;
  name: string;
  division: number;
  trueStrengthRating: number;
  globalRank: number;
  winPercentage: number;
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

// Helper function to format match time
const formatMatchTime = (gameDate: string) => {
  const date = new Date(gameDate);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function ComprehensiveCompetitionCenter() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'league' | 'tournaments' | 'exhibitions' | 'schedule'>('league');
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    enabled: isAuthenticated,
  });

  // Exhibition-specific queries
  const { data: exhibitionStats } = useQuery({
    queryKey: ['/api/exhibitions/stats'],
    enabled: isAuthenticated && activeTab === 'exhibitions',
  });

  const { data: exhibitionHistory } = useQuery({
    queryKey: ['/api/exhibitions/recent'],
    enabled: isAuthenticated && activeTab === 'exhibitions',
  });

  const { data: availableOpponents } = useQuery({
    queryKey: ['/api/exhibitions/available-opponents'],
    enabled: isAuthenticated && showOpponentSelect,
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

  // Get daily schedule data for authentic game information
  const { data: dailySchedule } = useQuery({
    queryKey: ["/api/leagues/daily-schedule"],
    refetchInterval: 5 * 60 * 1000, // Update every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });

  // Get division schedule for detailed match data
  const { data: divisionSchedule } = useQuery({
    queryKey: [`/api/leagues/${team?.division || 8}/schedule`],
    enabled: !!team?.division,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: divisionStandings } = useQuery<Team[]>({
    queryKey: [`/api/leagues/${team?.division || 8}/standings`],
    enabled: !!team?.division,
  });

  const { data: globalRankings, isLoading: rankingsLoading, error: rankingsError } = useQuery<GlobalRanking[]>({
    queryKey: ['/api/world/global-rankings'],
    enabled: isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });



  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: [`/api/tournaments/available/${team?.division}`],
    enabled: !!team?.division,
  });

  // Exhibition mutations
  const startInstantMatch = useMutation({
    mutationFn: () => apiRequest('/api/exhibitions/instant-match', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: "Exhibition Started!",
        description: `Match against ${data.opponentName} is now live!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exhibitions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/live'] });
    },
    onError: (error: any) => {
      toast({
        title: "Exhibition Failed",
        description: error.message || "Unable to start exhibition match. Try again later.",
        variant: "destructive",
      });
    },
  });

  const challengeOpponent = useMutation({
    mutationFn: (opponentId: string) => 
      apiRequest('/api/exhibitions/challenge', { 
        method: 'POST', 
        body: { opponentId } 
      }),
    onSuccess: (data) => {
      toast({
        title: "Exhibition Challenge Started!",
        description: `Match against ${data.opponentName} is now live!`,
      });
      setShowOpponentSelect(false);
      queryClient.invalidateQueries({ queryKey: ['/api/exhibitions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/live'] });
    },
    onError: (error: any) => {
      toast({
        title: "Challenge Failed",
        description: error.message || "Unable to challenge opponent. Try again later.",
        variant: "destructive",
      });
    },
  });

  const buyExhibitionToken = useMutation({
    mutationFn: () => 
      apiRequest('/api/store/purchase', { 
        method: 'POST', 
        body: { 
          itemName: 'Exhibition Game Entry',
          currency: 'credits',
          cost: 500
        } 
      }),
    onSuccess: () => {
      toast({
        title: "Exhibition Token Purchased!",
        description: "You can now play an additional exhibition match.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exhibitions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to purchase exhibition token. Check your credits.",
        variant: "destructive",
      });
    },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 text-white pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* DRAMATIC MOBILE-FIRST HERO BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-blue-700 to-cyan-800 rounded-xl p-4 md:p-6 mb-4 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-radial from-purple-500/30 via-transparent to-cyan-500/20 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white mb-1">
                  🏆 Competition Center
                </h1>
                <p className="text-sm md:text-base text-purple-100 font-semibold">
                  Compete • Conquer • Claim Glory
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1">
                  Division {team?.division || 8} - {team?.subdivision?.charAt(0).toUpperCase() + team?.subdivision?.slice(1) || 'Eta'}
                </Badge>
                <Badge className="bg-yellow-600 text-yellow-100 px-2 py-1">
                  Season 0 • Day {seasonData?.currentDay || 10}/17
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE SUMMARY BAR */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-lg p-3 text-center">
            <div className="text-lg md:text-xl font-black text-white">
              {team?.wins || 0}-{0}-{team?.losses || 0}
            </div>
            <p className="text-green-100 text-xs font-semibold uppercase">Record</p>
          </div>
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg p-3 text-center">
            <div className="text-lg md:text-xl font-black text-white">{team?.points || 0}</div>
            <p className="text-blue-100 text-xs font-semibold uppercase">Points</p>
          </div>
          <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-lg p-3 text-center">
            <div className="text-lg md:text-xl font-black text-white">{liveMatches?.length || 0}</div>
            <p className="text-red-100 text-xs font-semibold uppercase">Live</p>
          </div>
          <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-lg p-3 text-center">
            <div className="text-lg md:text-xl font-black text-white">
              #{(() => {
                if (!globalRankings || globalRankings.length === 0) return '?';
                if (!team?.id) return '?';
                
                // Try multiple matching strategies for robustness
                const teamRanking = globalRankings.find(r => r.id === team.id) || 
                                  globalRankings.find(r => String(r.id) === String(team.id));
                
                return teamRanking?.globalRank || '?';
              })()}
            </div>
            <p className="text-purple-100 text-xs font-semibold uppercase">Global Rank</p>
          </div>
        </div>

        {/* MOBILE-FIRST TAB NAVIGATION */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          
          <div className="mb-4">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800 p-1 rounded-lg border border-gray-600">
              <TabsTrigger 
                value="league" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Trophy className="h-4 w-4 mr-1" />
                League
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Award className="h-4 w-4 mr-1" />
                Tournaments
              </TabsTrigger>
              <TabsTrigger 
                value="exhibitions" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Zap className="h-4 w-4 mr-1" />
                Exhibitions
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </TabsTrigger>
            </TabsList>
          </div>

          {/* LEAGUE TAB - UNIFIED STANDINGS LAYOUT */}
          <TabsContent value="league" className="space-y-4">
            
            {/* UNIFIED LEAGUE STANDINGS - ENHANCED TABLE - FULL WIDTH */}
            <div>
                <Card className="bg-gray-800/90 border border-gray-600 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-yellow-400" />
                        <div>
                          <CardTitle className="text-xl font-bold text-white">
                            Division {team?.division || 8} – {team?.subdivision?.charAt(0).toUpperCase() + team?.subdivision?.slice(1) || 'Eta'}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3 text-green-400" />
                              Promotion ↑
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowDown className="h-3 w-3 text-red-400" />
                              Relegation ↓
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-blue-100">
                        #{divisionStandings?.findIndex(s => s.id === team?.id) + 1 || '?'} of 8
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {divisionStandings && divisionStandings.length > 0 ? (
                      <>
                        {/* Mobile-Responsive Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700 bg-gray-900/50">
                                <th className="text-left p-3 text-gray-300 font-semibold">Pos</th>
                                <th className="text-left p-3 text-gray-300 font-semibold min-w-[160px]">Team Name</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden sm:table-cell">GP</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden md:table-cell">W</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden md:table-cell">D</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden md:table-cell">L</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden lg:table-cell">TS</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden lg:table-cell">SA</th>
                                <th className="text-center p-3 text-gray-300 font-semibold hidden sm:table-cell">SD</th>
                                <th className="text-center p-3 text-gray-300 font-semibold">Pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {divisionStandings.map((standingTeam, index) => {
                                const gamesPlayed = (standingTeam.wins || 0) + (standingTeam.losses || 0) + (standingTeam.draws || 0);
                                const totalScores = standingTeam.goalsFor || 0;
                                const scoresAgainst = standingTeam.goalsAgainst || 0;
                                const scoreDifference = totalScores - scoresAgainst;
                                const isUser = standingTeam.id === team?.id;
                                const isPromotion = index < 2;
                                const isRelegation = index >= divisionStandings.length - 2;
                                
                                return (
                                  <tr 
                                    key={standingTeam.id}
                                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                                      isUser ? 'bg-blue-900/30 border-blue-500/30' : ''
                                    }`}
                                  >
                                    <td className="p-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        isPromotion ? 'bg-green-600 text-green-100' : 
                                        isRelegation ? 'bg-red-600 text-red-100' : 
                                        'bg-gray-600 text-gray-100'
                                      }`}>
                                        {index + 1}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">
                                          {standingTeam.name}
                                        </span>
                                        {isUser && (
                                          <Badge className="bg-blue-600 text-blue-100 text-xs">YOU</Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-center p-3 text-gray-300 hidden sm:table-cell">{gamesPlayed}</td>
                                    <td className="text-center p-3 text-gray-300 hidden md:table-cell">{standingTeam.wins || 0}</td>
                                    <td className="text-center p-3 text-gray-300 hidden md:table-cell">{standingTeam.draws || 0}</td>
                                    <td className="text-center p-3 text-gray-300 hidden md:table-cell">{standingTeam.losses || 0}</td>
                                    <td className="text-center p-3 text-gray-300 hidden lg:table-cell">{totalScores}</td>
                                    <td className="text-center p-3 text-gray-300 hidden lg:table-cell">{scoresAgainst}</td>
                                    <td className={`text-center p-3 font-semibold hidden sm:table-cell ${
                                      scoreDifference > 0 ? 'text-green-400' : 
                                      scoreDifference < 0 ? 'text-red-400' : 'text-gray-300'
                                    }`}>
                                      {scoreDifference > 0 ? '+' : ''}{scoreDifference}
                                    </td>
                                    <td className="text-center p-3">
                                      <span className="font-bold text-white text-lg">{standingTeam.points || 0}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Promotion/Relegation Legend */}
                        <div className="p-4 bg-gray-900/30 border-t border-gray-700">
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              <span className="text-green-400">Promotion Zone</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                              <span className="text-red-400">Relegation Zone</span>
                            </div>
                            <div className="text-gray-400 hidden sm:inline">
                              GP: Games Played • TS: Total Scores • SA: Scores Against • SD: Score Difference
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Standings will appear once the season begins</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>

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

          {/* EXHIBITIONS TAB - ACCORDION PATTERN */}
          <TabsContent value="exhibitions" className="space-y-4">
            
            {/* START EXHIBITION - TOP PANEL */}
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-green-800 via-green-700 to-green-800 border-2 border-green-500/50 hover:border-green-400 transition-all duration-300 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gamepad2 className="h-6 w-6 text-green-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Start Exhibition</h3>
                          <p className="text-green-300 text-sm">Quick match • Strategic opponents</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600 text-green-100">Ready to Play</Badge>
                        <ChevronDown className="h-5 w-5 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600 shadow-xl">
                  <CardContent className="p-4">
                    {/* Side-by-side layout for Instant Exhibition and Choose Opponent */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-600">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">Instant Exhibition</h3>
                            <p className="text-blue-200 text-sm">Quick match vs. similarly powered team</p>
                          </div>
                          <Shield className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-blue-200">
                            <p>⚡ 30 minute match</p>
                            <p>🎯 Balanced matchmaking</p>
                          </div>
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => startInstantMatch.mutate()}
                            disabled={startInstantMatch.isPending}
                          >
                            {startInstantMatch.isPending ? 'Starting...' : 'Start Now'}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-green-900/30 p-4 rounded-lg border border-green-600">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">Choose Opponent</h3>
                            <p className="text-green-200 text-sm">Browse available opponents</p>
                          </div>
                          <Users className="w-8 h-8 text-green-400" />
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-green-200">
                            <p>🎯 Strategic matchup selection</p>
                            <p>📊 View opponent stats</p>
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => setShowOpponentSelect(!showOpponentSelect)}
                          >
                            {showOpponentSelect ? 'Hide Opponents' : 'Select Opponent'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Opponent Selection Panel */}
                    {showOpponentSelect && availableOpponents && (
                      <Card className="mt-4 bg-gray-900/50 border border-green-500/30">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-400" />
                            Available Opponents
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {availableOpponents.map((opponent: any) => (
                            <div key={opponent.id} className="bg-gray-800 p-3 rounded-lg border border-gray-600 flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-white">{opponent.name}</h4>
                                <p className="text-sm text-gray-300">
                                  Division {opponent.division} • Power: {opponent.averagePower}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => challengeOpponent.mutate(opponent.id)}
                                disabled={challengeOpponent.isPending}
                              >
                                {challengeOpponent.isPending ? 'Challenging...' : 'Challenge'}
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* EXHIBITION OPPORTUNITIES */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-orange-800 via-orange-700 to-orange-800 border border-orange-500/50 hover:border-orange-400 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="h-6 w-6 text-orange-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Exhibition Opportunities</h3>
                          <p className="text-orange-300 text-sm">Free entries • Purchase tokens</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-600 text-orange-100">
                          {exhibitionStats?.freeGamesRemaining || 3}/3 Free
                        </Badge>
                        <ChevronDown className="h-5 w-5 text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-600">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">Free Exhibitions</h3>
                          <Badge className="bg-orange-600 text-orange-100">
                            {exhibitionStats?.freeGamesRemaining || 3}/3 Remaining
                          </Badge>
                        </div>
                        <p className="text-orange-200 text-sm mb-3">Daily allocation resets at 3 AM</p>
                        <Progress 
                          value={((exhibitionStats?.freeGamesRemaining || 3) / 3) * 100} 
                          className="h-2 mb-3" 
                        />
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
                          onClick={() => buyExhibitionToken.mutate()}
                          disabled={buyExhibitionToken.isPending}
                        >
                          {buyExhibitionToken.isPending ? 'Purchasing...' : 'Buy Token - ₡500'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* EXHIBITION HISTORY */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-500/50 hover:border-gray-400 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="h-6 w-6 text-gray-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Exhibition History</h3>
                          <p className="text-gray-300 text-sm">Past results • Performance tracking</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-600 text-gray-100">
                          {exhibitionHistory?.length || 0} Matches
                        </Badge>
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-6">
                    {exhibitionHistory && exhibitionHistory.length > 0 ? (
                      <div className="space-y-3">
                        {exhibitionHistory.map((match: any) => {
                          // Handle cases where team data might be missing
                          const isUserHome = match.homeTeamId === team?.id;
                          const opponentName = isUserHome ? (match.awayTeam?.name || 'Unknown Opponent') : (match.homeTeam?.name || 'Unknown Opponent');
                          const homeScore = match.homeScore || 0;
                          const awayScore = match.awayScore || 0;
                          const userScore = isUserHome ? homeScore : awayScore;
                          const opponentScore = isUserHome ? awayScore : homeScore;
                          
                          return (
                            <div key={match.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-bold text-white">
                                    vs {opponentName}
                                  </h4>
                                  <p className="text-sm text-gray-300">
                                    {match.gameDate ? new Date(match.gameDate).toLocaleDateString() : 'Recent'} • {isUserHome ? 'Home' : 'Away'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {match.status === 'COMPLETED' ? (
                                    <div>
                                      <div className="text-lg font-bold text-white">
                                        {userScore} - {opponentScore}
                                      </div>
                                      <Badge 
                                        className={
                                          userScore > opponentScore
                                            ? 'bg-green-600 text-green-100'
                                            : (userScore === opponentScore ? 'bg-yellow-600 text-yellow-100' : 'bg-red-600 text-red-100')
                                        }
                                      >
                                        {userScore > opponentScore ? 'WIN' : 
                                         (userScore === opponentScore ? 'DRAW' : 'LOSS')}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <Badge className="bg-blue-600 text-blue-100">{match.status}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No exhibition matches yet</p>
                        <p className="text-gray-500 text-sm">Your exhibition results will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

          </TabsContent>

          {/* SCHEDULE TAB - ENHANCED DRAMATIC DESIGN */}
          <TabsContent value="schedule" className="space-y-6">
            
            {/* MY TEAM MATCHES - PINNED SECTION */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-800 via-blue-700 to-purple-800 border-2 border-blue-400 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Star className="h-6 w-6 text-yellow-400" />
                    My Team Schedule
                    <Badge className="bg-yellow-600 text-yellow-100 ml-auto">Priority</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
            )}

            {/* UNIFIED CALENDAR - PROGRESSIVE DISCLOSURE */}
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="w-full">
                <Card className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-cyan-400" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-white">Unified Schedule</h3>
                          <p className="text-cyan-300 text-sm">All league and tournament matches</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-600 text-cyan-100">
                          Day {seasonData?.currentDay || 1} of 17
                        </Badge>
                        <ChevronDown className="h-5 w-5 text-cyan-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      
                      {/* UPCOMING DAYS - AUTHENTIC SCHEDULE DATA */}
                      {[10, 11, 12, 13, 14, 15].map((day) => {
                        // Determine match type: League games Days 1-14, Division Tournaments Day 15
                        const matchType = day <= 14 ? 'League' : 'Tournament';
                        const badgeColor = day <= 14 ? 'bg-blue-600 text-blue-100' : 'bg-purple-600 text-purple-100';
                        
                        // Get real matches for this day from schedule data
                        const dayMatches = dailySchedule?.schedule?.[day.toString()] || [];
                        const myMatches = dayMatches.filter((match: any) => 
                          match.homeTeamId === team?.id || match.awayTeamId === team?.id
                        );
                        
                        return (
                          <div key={day} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-white">Day {day}</h4>
                              <Badge variant="outline" className="text-gray-300">
                                {matchType}
                              </Badge>
                            </div>
                            
                            {/* Real matches for the day */}
                            <div className="space-y-2">
                              {dayMatches.length > 0 ? (
                                dayMatches.slice(0, 3).map((match: any, index: number) => {
                                  const isMyMatch = match.homeTeamId === team?.id || match.awayTeamId === team?.id;
                                  const gameTime = match.gameDate ? 
                                    new Date(match.gameDate).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit', 
                                      hour12: true 
                                    }) : '5:00 PM';
                                  
                                  return (
                                    <div key={index} className={`flex items-center justify-between py-2 px-3 rounded ${
                                      isMyMatch ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-gray-600/30'
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                          isMyMatch ? 'bg-yellow-400' : day <= 14 ? 'bg-blue-400' : 'bg-purple-400'
                                        }`}></div>
                                        <span className="text-gray-300">
                                          {isMyMatch ? (
                                            <>🆚 {match.homeTeamId === team?.id ? match.awayTeamName : match.homeTeamName}</>
                                          ) : (
                                            `${match.homeTeamName} vs ${match.awayTeamName}`
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{gameTime}</span>
                                        <Badge className={`text-xs ${badgeColor}`}>
                                          {day <= 14 ? 'League' : 'Tournament'}
                                        </Badge>
                                        {isMyMatch && (
                                          <Star className="h-3 w-3 text-yellow-400" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="flex items-center justify-between py-2 px-3 bg-gray-600/30 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${day <= 14 ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                    <span className="text-gray-400">
                                      {day <= 14 ? 'League matches scheduled' : 'Division Tournament'}
                                    </span>
                                  </div>
                                  <Badge className={`text-xs ${badgeColor}`}>
                                    {day <= 14 ? 'League' : 'Tournament'}
                                  </Badge>
                                </div>
                              )}
                              
                              {dayMatches.length > 3 && (
                                <div className="text-center py-2">
                                  <span className="text-xs text-gray-400">
                                    +{dayMatches.length - 3} more matches
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* CORRECTED PLAYOFF SCHEDULE PREVIEW */}
                      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4 border border-purple-500/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Award className="h-6 w-6 text-purple-400" />
                          <h4 className="text-lg font-bold text-white">Post-Season Schedule</h4>
                          <Badge className="bg-purple-600 text-purple-100">Days 15-17</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-purple-800/30 rounded p-3">
                            <h5 className="font-semibold text-purple-200 mb-2">Day 15 - Division Tournaments</h5>
                            <p className="text-purple-300 text-sm">Top teams compete for division championships</p>
                          </div>
                          <div className="bg-indigo-800/30 rounded p-3">
                            <h5 className="font-semibold text-indigo-200 mb-2">Day 16 - Offseason</h5>
                            <p className="text-indigo-300 text-sm">Roster management and player progression</p>
                          </div>
                          <div className="bg-cyan-800/30 rounded p-3">
                            <h5 className="font-semibold text-cyan-200 mb-2">Day 17 - Offseason</h5>
                            <p className="text-cyan-300 text-sm">Player progression, staff renewals, tryouts</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* MATCH TYPE LEGEND */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Info className="h-5 w-5 text-blue-400" />
                  Match Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span className="text-blue-300 text-sm">League</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span className="text-green-300 text-sm">Daily Cup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span className="text-purple-300 text-sm">Mid-Season Cup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded"></div>
                    <span className="text-gray-300 text-sm">Exhibition</span>
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