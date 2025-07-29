import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
  ExternalLink,
  DollarSign,
  Building
} from 'lucide-react';
import ModernStickyHeader from './ModernStickyHeader';
import ScheduleView from './ScheduleView';
import LiveMatchesHub from './LiveMatchesHub';

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
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<'live' | 'league' | 'tournaments' | 'exhibitions' | 'schedule'>('league');
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // URL parameter handling for direct tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') as 'live' | 'league' | 'tournaments' | 'exhibitions' | 'schedule';
    
    if (tab && ['live', 'league', 'tournaments', 'exhibitions', 'schedule'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]); // Add location dependency to trigger on URL changes
  
  // Team Scouting Modal State
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isScoutingModalOpen, setIsScoutingModalOpen] = useState(false);

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

  // Selected team scouting data
  const { data: scoutingData, isLoading: scoutingLoading } = useQuery({
    queryKey: [`/api/teams/${selectedTeamId}/scouting`],
    enabled: !!selectedTeamId && isScoutingModalOpen,
  });



  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: [`/api/tournaments/available/${team?.division}`],
    enabled: !!team?.division,
  });

  // Tournament-specific queries
  const { data: availableTournaments } = useQuery({
    queryKey: ["/api/new-tournaments/available"],
    enabled: !!team?.id,
  });

  const { data: myTournaments } = useQuery({
    queryKey: ["/api/new-tournaments/my-tournaments"],
    enabled: !!team?.id,
  });

  // Query for tournament history
  const { data: tournamentHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["/api/new-tournaments/history"],
    enabled: !!team?.id,
  });

  // Check if Mid-Season Cup registration deadline has passed (Day 7 at 1PM EDT)
  const isMidSeasonRegistrationDeadlinePassed = () => {
    if (!seasonData) return false;
    
    const currentDay = seasonData?.currentDay || 0;
    
    // Get current Eastern Time
    const easternTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const easternDate = new Date(easternTime);
    const currentHour = easternDate.getHours();
    
    // Registration closes after Day 7 at 1PM EDT
    if (currentDay > 7) return true;
    if (currentDay === 7 && currentHour >= 13) return true;
    
    return false;
  };

  // State for real-time countdown updates
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Dynamic Mid-Season Cup countdown function
  const getMidSeasonCountdown = () => {
    if (!seasonData) return "Loading...";
    
    const currentDay = seasonData?.currentDay || 0;
    
    // If past deadline, show next season message
    if (isMidSeasonRegistrationDeadlinePassed()) {
      return "Come back next season!";
    }
    
    // Calculate target deadline: 1PM EDT on Day 7
    // Assuming season started on July 13, Day 7 would be July 19
    const seasonStartDate = new Date(seasonData.startDate || '2025-07-13');
    const targetDate = new Date(seasonStartDate);
    targetDate.setDate(seasonStartDate.getDate() + 6); // Day 7 (0-indexed: Day 1 = +0, Day 7 = +6)
    targetDate.setHours(13, 0, 0, 0); // 1PM EDT
    
    // Get current time in EDT
    const now = new Date();
    const edtOffset = -4 * 60; // EDT is UTC-4 during summer
    const nowEDT = new Date(now.getTime() + (now.getTimezoneOffset() + edtOffset) * 60000);
    
    const timeDiff = targetDate.getTime() - nowEDT.getTime();
    
    if (timeDiff <= 0) {
      return "Registration Closed";
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Check if user is already registered for tournaments
  const isRegisteredForDailyTournament = Array.isArray(myTournaments) && myTournaments.some((entry: any) => 
    entry.type === 'DAILY_DIVISIONAL'
  );

  const isRegisteredForMidSeasonCup = Array.isArray(myTournaments) && myTournaments.some((entry: any) => 
    entry.type === 'MID_SEASON_CUP'
  );

  // Team scouting functions
  const openScoutingModal = (teamId: number) => {
    setSelectedTeamId(teamId);
    setIsScoutingModalOpen(true);
  };

  const closeScoutingModal = () => {
    setSelectedTeamId(null);
    setIsScoutingModalOpen(false);
  };

  // Exhibition mutations
  const startInstantMatch = useMutation({
    mutationFn: () => apiRequest('/api/exhibitions/instant-match', 'POST'),
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
      apiRequest('/api/store/purchase/exhibition_credit', 'POST', { 
        currency: 'credits',
        expectedPrice: 500
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

  // Tournament registration mutations
  const registerDailyTournament = useMutation({
    mutationFn: () => apiRequest('/api/new-tournaments/daily-tournament/register', 'POST', { 
      division: Number(team?.division || 8) 
    }),
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Daily Division Tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments/my-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Unable to register for tournament. Try again later.",
        variant: "destructive",
      });
    },
  });

  const registerMidSeasonCup = useMutation({
    mutationFn: () => {
      // Find Mid-Season Cup tournament from available tournaments
      const midSeasonCup = availableTournaments?.find((t: any) => t.type === 'mid_season_classic');
      if (!midSeasonCup) {
        throw new Error('Mid-Season Cup not available');
      }
      return apiRequest('/api/new-tournaments/register', 'POST', { tournamentId: midSeasonCup.id });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Mid-Season Cup!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments/my-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Unable to register for Mid-Season Cup. Check your credits (₡10,000) or gems (💎20).",
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
      <ModernStickyHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl mt-8">
        
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

        {/* UNIFIED PERFORMANCE HEADER BAR */}
        <Card className="bg-gray-800/90 border-gray-600 mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
              
              {/* League Record */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Trophy className="h-5 w-5 text-green-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {team?.wins || 0} W – {0} D – {team?.losses || 0} L
                  </h3>
                  <p className="text-sm text-green-400 font-medium">League Record</p>
                </div>
              </div>

              {/* Standings Position */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {(() => {
                      const position = divisionStandings?.findIndex(s => s.id === team?.id) + 1 || 0;
                      const positionText = position === 1 ? '1st' : 
                                         position === 2 ? '2nd' : 
                                         position === 3 ? '3rd' : 
                                         position > 0 ? `${position}th` : 'Unranked';
                      
                      // Season-phase aware games remaining calculation
                      const currentDay = seasonData?.currentDay || 0;
                      let gamesRemaining = 0;
                      
                      if (currentDay >= 1 && currentDay <= 14) {
                        // Regular season: Calculate based on current day vs games played
                        const regularSeasonGames = Math.min(currentDay, 14);
                        const gamesPlayed = (team?.wins || 0) + (team?.losses || 0);
                        gamesRemaining = Math.max(0, regularSeasonGames - gamesPlayed);
                      } else if (currentDay === 15) {
                        // Division playoffs: No regular season games remain
                        gamesRemaining = 0;
                      } else if (currentDay >= 16) {
                        // Offseason: No games remain
                        gamesRemaining = 0;
                      }
                      
                      return `${positionText} – ${team?.points || 0} Pts – ${gamesRemaining} Games Remain`;
                    })()}
                  </h3>
                  <p className="text-sm text-blue-400 font-medium">Standings</p>
                </div>
              </div>

              {/* Global Rank with Percentile */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Globe className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    #{(() => {
                      if (!globalRankings || globalRankings.length === 0) return '?';
                      if (!team?.id) return '?';
                      
                      const teamRanking = globalRankings.find(r => r.id === team.id) || 
                                        globalRankings.find(r => String(r.id) === String(team.id));
                      
                      const rank = teamRanking?.globalRank || 0;
                      const totalTeams = globalRankings.length;
                      const percentile = rank > 0 && totalTeams > 0 ? 
                        Math.round((1 - (rank - 1) / totalTeams) * 100) : 0;
                      
                      return rank || '?';
                    })()} 
                    {(() => {
                      if (!globalRankings || globalRankings.length === 0) return '';
                      if (!team?.id) return '';
                      
                      const teamRanking = globalRankings.find(r => r.id === team.id) || 
                                        globalRankings.find(r => String(r.id) === String(team.id));
                      
                      const rank = teamRanking?.globalRank || 0;
                      const totalTeams = globalRankings.length;
                      const percentile = rank > 0 && totalTeams > 0 ? 
                        Math.round((1 - (rank - 1) / totalTeams) * 100) : 0;
                      
                      return percentile > 0 ? ` (Top ${percentile}%)` : '';
                    })()}
                  </h3>
                  <p className="text-sm text-purple-400 font-medium">Global Rank</p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* MOBILE-FIRST TAB NAVIGATION */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          
          <div className="mb-4">
            <TabsList className="grid w-full grid-cols-5 bg-gray-800 p-1 rounded-lg border border-gray-600">
              <TabsTrigger 
                value="league" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Trophy className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">League</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Award className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tournaments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="exhibitions" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Zap className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Exhibitions</span>
              </TabsTrigger>
              <TabsTrigger 
                value="live" 
                className="text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white relative"
              >
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Live</span>
                  <span className="sm:hidden">Live</span>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1"></div>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* LIVE MATCHES TAB - COMPREHENSIVE LIVE MATCHES HUB */}
          <TabsContent value="live" className="space-y-4">
            <LiveMatchesHub team={team} />
          </TabsContent>

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
                                        {!isUser ? (
                                          <button
                                            onClick={() => openScoutingModal(standingTeam.id)}
                                            className="font-semibold text-white hover:text-blue-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                                          >
                                            {standingTeam.name}
                                          </button>
                                        ) : (
                                          <span className="font-semibold text-white">
                                            {standingTeam.name}
                                          </span>
                                        )}
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
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                  
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
                      
                      <Button 
                        onClick={() => registerDailyTournament.mutate()}
                        disabled={registerDailyTournament.isPending || isRegisteredForDailyTournament}
                        className={`w-full font-bold py-3 rounded-xl shadow-lg ${
                          isRegisteredForDailyTournament 
                            ? "bg-green-800 hover:bg-green-900 cursor-not-allowed" 
                            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        } text-white`}
                      >
                        <Trophy className="h-5 w-5 mr-2" />
                        {registerDailyTournament.isPending 
                          ? "Registering..." 
                          : isRegisteredForDailyTournament 
                            ? "✓ Already Registered" 
                            : "Enter Tournament"
                        }
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
                              <span className="text-purple-300">Countdown: {getMidSeasonCountdown()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-purple-300 text-sm font-semibold mb-1">Entry Cost</p>
                          <div className="bg-purple-900/50 rounded-lg p-3">
                            <p className="text-purple-200 font-bold text-lg">₡10,000</p>
                            <p className="text-purple-300 text-sm">or 💎20</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => registerMidSeasonCup.mutate()}
                        disabled={registerMidSeasonCup.isPending || isRegisteredForMidSeasonCup || isMidSeasonRegistrationDeadlinePassed()}
                        className={`w-full font-bold py-3 rounded-xl shadow-lg ${
                          isRegisteredForMidSeasonCup 
                            ? "bg-purple-800 hover:bg-purple-900 cursor-not-allowed" 
                            : isMidSeasonRegistrationDeadlinePassed()
                              ? "bg-gray-700 hover:bg-gray-800 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        } text-white`}
                      >
                        <Award className="h-5 w-5 mr-2" />
                        {registerMidSeasonCup.isPending 
                          ? "Registering..." 
                          : isRegisteredForMidSeasonCup 
                            ? "✓ Already Registered" 
                            : isMidSeasonRegistrationDeadlinePassed()
                              ? "Registration Closed"
                              : "Register Now"
                        }
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
                        <Badge className="bg-blue-600 text-blue-100">{tournamentHistory.length} Tournament{tournamentHistory.length !== 1 ? 's' : ''}</Badge>
                        <ChevronDown className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800/90 border border-gray-600">
                  <CardContent className="p-6">
                    {isHistoryLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading tournament history...</p>
                      </div>
                    ) : tournamentHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-gray-400 mb-2">No Tournament History Yet</h4>
                        <p className="text-gray-500 text-lg">Your tournament results will appear here</p>
                        <p className="text-gray-600 text-sm mt-2">Keep participating to build your championship legacy!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tournamentHistory.map((entry: any, index: number) => (
                          <div key={entry.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600/20 rounded-lg">
                                  <Trophy className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-white">{entry.tournament?.name || 'Tournament'}</h5>
                                  <p className="text-sm text-gray-400 capitalize">
                                    {entry.tournament?.type?.replace('_', ' ').toLowerCase() || 'Unknown Type'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={`${
                                  entry.finalRank === 1 ? 'bg-yellow-600 text-yellow-100' :
                                  entry.finalRank <= 3 ? 'bg-blue-600 text-blue-100' :
                                  'bg-gray-600 text-gray-100'
                                }`}>
                                  {entry.finalRank ? `#${entry.finalRank}` : 'Participated'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <span>Division {entry.tournament?.division || 'Unknown'}</span>
                              <span>{entry.registeredAt ? new Date(entry.registeredAt).toLocaleDateString() : 'Date Unknown'}</span>
                            </div>
                            {entry.finalRank === 1 && (
                              <div className="mt-2 flex items-center gap-2 text-yellow-400">
                                <Medal className="h-4 w-4" />
                                <span className="text-sm font-semibold">Champion!</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
                          <Badge className="bg-purple-600 text-purple-100">
                            {exhibitionStats?.extraTokens ?? 0} Available
                          </Badge>
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
                          // Debug log to check types and values
                          console.log('Home/Away Debug:', {
                            matchHomeTeamId: match.homeTeamId,
                            teamId: team?.id,
                            homeTeamIdType: typeof match.homeTeamId,
                            teamIdType: typeof team?.id,
                            strictComparison: match.homeTeamId === team?.id,
                            looseComparison: match.homeTeamId == team?.id
                          });
                          
                          const isUserHome = Number(match.homeTeamId) === Number(team?.id);
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

          {/* SCHEDULE TAB - REDESIGNED WITH FILTERS AND DAY-GROUPED LAYOUT */}
          <TabsContent value="schedule" className="space-y-4">
            <ScheduleView 
              team={team}
              seasonData={seasonData}
              dailySchedule={dailySchedule}
              upcomingMatches={upcomingMatches}
              recentMatches={recentMatches}
            />
          </TabsContent>

        </Tabs>

        {/* TEAM SCOUTING SHEET MODAL */}
        <Dialog open={isScoutingModalOpen} onOpenChange={setIsScoutingModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                {scoutingData && (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {scoutingData.team?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-lg">{scoutingData.team?.name || 'Unknown Team'}</div>
                      <div className="text-sm text-gray-400 font-normal">
                        Division {scoutingData.team?.division || '?'} – {scoutingData.team?.subdivision?.charAt(0).toUpperCase() + scoutingData.team?.subdivision?.slice(1) || 'Unknown'} | 
                        Record {scoutingData.team?.wins || 0}-{scoutingData.team?.draws || 0}-{scoutingData.team?.losses || 0} - Pts {scoutingData.team?.points || 0}
                      </div>
                    </div>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {scoutingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-gray-300">Loading team data...</span>
              </div>
            ) : scoutingData ? (
              <div className="space-y-4">
                
                {/* TOP SUMMARY BAR */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-purple-800/30 to-blue-800/30 rounded-lg border border-gray-600">
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{scoutingData.teamPower || '?'}</div>
                    <p className="text-xs text-gray-300 uppercase font-semibold">Team Power</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">#{scoutingData.globalRank || '?'}</div>
                    <p className="text-xs text-gray-300 uppercase font-semibold">Global Rank</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{scoutingData.fanLoyalty || 0}</div>
                    <p className="text-xs text-gray-300 uppercase font-semibold">Fan Loyalty</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{Math.round((scoutingData.attendanceRate || 0) * 100)}%</div>
                    <p className="text-xs text-gray-300 uppercase font-semibold">Attendance</p>
                  </div>
                </div>

                {/* STARTERS & KEY PLAYERS SECTION */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-yellow-400" />
                      Starters & Key Players
                    </h3>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <Card className="bg-gray-700/30 border-gray-600">
                      <CardContent className="p-4">
                        {scoutingData.topPlayers && scoutingData.topPlayers.length > 0 ? (
                          <div className="space-y-3">
                            {scoutingData.topPlayers.slice(0, 5).map((player: any, index: number) => (
                              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white">
                                      {player.firstName} {player.lastName}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      {player.role} • Age {player.age} • {player.race}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-white">
                                    {Math.round(((player.speed + player.power + player.throwing + player.catching + player.kicking + player.agility) / 6) * 10) / 10}
                                  </div>
                                  <div className="text-xs text-gray-400">Power</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400">No player data available</p>
                        )}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* TEAM FINANCIALS SECTION */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Team Financials
                    </h3>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <Card className="bg-gray-700/30 border-gray-600">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Total Salary Expenditure:</span>
                          <span className="font-bold text-white">₡{(scoutingData.totalSalary || 0).toLocaleString()}/season</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Average Salary/Player:</span>
                          <span className="font-bold text-white">₡{Math.round(((scoutingData.totalSalary || 0) / Math.max(scoutingData.playerCount || 1, 1)) || 0).toLocaleString()}</span>
                        </div>
                        {scoutingData.highestContract && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Highest Contract:</span>
                            <span className="font-bold text-white">
                              "{scoutingData.highestContract.firstName} {scoutingData.highestContract.lastName}" 
                              ₡{(scoutingData.highestContract.salary || 0).toLocaleString()}×{scoutingData.highestContract.length || 1} yrs
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* STADIUM OVERVIEW SECTION */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building className="h-5 w-5 text-purple-400" />
                      Stadium Overview
                    </h3>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <Card className="bg-gray-700/30 border-gray-600">
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Capacity:</span>
                            <span className="font-bold text-white">{(scoutingData.stadium?.capacity || 0).toLocaleString()}</span>
                          </div>
                          <Progress 
                            value={Math.min((scoutingData.stadium?.capacity || 0) / 25000 * 100, 100)} 
                            className="h-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-300">Fan Loyalty:</span>
                            <div className="font-bold text-white">{scoutingData.fanLoyalty || 0}/100</div>
                          </div>
                          <div>
                            <span className="text-gray-300">Attendance Rate:</span>
                            <div className="font-bold text-white">{Math.round((scoutingData.attendanceRate || 0) * 100)}%</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-white">Facilities Tier:</h4>
                          <div className="grid grid-cols-1 gap-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Concessions:</span>
                              <span className="text-white">{'●'.repeat(scoutingData.stadium?.concessionsLevel || 0)}{'○'.repeat(5 - (scoutingData.stadium?.concessionsLevel || 0))} Level {scoutingData.stadium?.concessionsLevel || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">VIP Suites:</span>
                              <span className="text-white">{'●'.repeat(scoutingData.stadium?.vipSuitesLevel || 0)}{'○'.repeat(5 - (scoutingData.stadium?.vipSuitesLevel || 0))} Level {scoutingData.stadium?.vipSuitesLevel || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Lighting:</span>
                              <span className="text-white">{'●'.repeat(scoutingData.stadium?.lightingScreensLevel || 0)}{'○'.repeat(5 - (scoutingData.stadium?.lightingScreensLevel || 0))} Level {scoutingData.stadium?.lightingScreensLevel || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* SCOUTING REPORT SECTION */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-400" />
                      Scouting Report
                    </h3>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <Card className="bg-gray-700/30 border-gray-600">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Team Play Style:</span>
                          <span className="font-bold text-white">{scoutingData.team?.tacticalFocus || 'Balanced'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Home Field:</span>
                          <span className="font-bold text-white">{scoutingData.team?.homeField || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Team Chemistry:</span>
                          <span className="font-bold text-white">{scoutingData.team?.camaraderie || 0}/100</span>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* ACTION BUTTONS */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={closeScoutingModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Close
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled
                  >
                    Scout Match
                  </Button>
                </div>

              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Failed to load team data</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}