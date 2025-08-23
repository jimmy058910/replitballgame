import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useTeamDashboardData } from "@/hooks/useTeamData";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ModernStickyHeader from "@/components/ModernStickyHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trophy, 
  Users, 
  Target, 
  BarChart3, 
  Building2, 
  Shield, 
  Calendar,
  AlertTriangle,
  TrendingUp,
  Zap,
  DollarSign,
  Star,
  ChevronRight,
  Plus,
  Activity,
  Coins,
  Award,
  ChevronDown,
  ChevronUp,
  Heart,
  Calculator,
  Store,
  Play,
  ShoppingCart,
  Building
} from "lucide-react";
import { RevenueCalculationsModal } from "./RevenueCalculationsModal";
import { AlphaTestingCheckbox } from "./AlphaTestingTerms";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Enhanced interfaces for real data integration
interface Team {
  id: string;
  name: string;
  camaraderie: number;
  fanLoyalty: number;
  division: number;
  subdivision: string;
  wins: number;
  losses: number;
  points: number;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  injuryStatus: string;
  dailyStaminaLevel: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  agility: number;
}

interface TeamFinances {
  credits: bigint;
  gems: bigint;
  projectedIncome: bigint;
  projectedExpenses: bigint;
}

interface Stadium {
  capacity: number;
  concessionsLevel: number;
  parkingLevel: number;
  vipSuitesLevel: number;
  merchandisingLevel: number;
  lightingScreensLevel: number;
}

interface ExhibitionStats {
  gamesPlayedToday: number;
  exhibitionEntriesUsedToday: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalGames: number;
  winRate: number;
  chemistryGained: number;
  rewardsEarned: { credits: number; items: number };
}

export default function DramaticTeamHQ() {
  const { isAuthenticated } = useUnifiedAuth();
  const [, setLocation] = useLocation();
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const { toast } = useToast();
  const [dailyTasks, setDailyTasks] = useState({
    checkTeamStatus: false,
    playExhibitionMatches: 0, // Track count (0-3)
    enterDailyTournament: false,
    watchRewardedAd: 0, // Track count (0-10)
    reviewTeamTactics: false,
    checkMarketListings: false
  });

  // Check daily task completion from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const storedTasks = localStorage.getItem(`dailyTasks_${today}`);
    
    if (storedTasks) {
      setDailyTasks(JSON.parse(storedTasks));
    }

    // Check if user has visited roster page today
    const rosterVisit = localStorage.getItem(`rosterVisit_${today}`);
    if (rosterVisit) {
      setDailyTasks(prev => ({ ...prev, checkTeamStatus: true }));
    }
  }, []);

  // Save daily tasks to localStorage whenever they change
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`dailyTasks_${today}`, JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  // Use the same unified hook as the header for consistent data
  const { 
    team: teamData, 
    upcomingMatches, 
    liveMatches, 
    isLoading, 
    hasError, 
    isReady 
  } = useTeamDashboardData(isAuthenticated);

  // Exhibition games with error handling
  const { data: exhibitionStats, error: exhibitionError } = useQuery<ExhibitionStats>({
    queryKey: ["/api/exhibitions/stats"],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Camaraderie data with error handling
  const { data: camaraderieData, error: camaraderieError } = useQuery<{
    teamCamaraderie: number;
    status: string;
  }>({
    queryKey: ['/api/camaraderie/summary'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Season data with error handling
  const { data: seasonData, error: seasonError } = useQuery({
    queryKey: ["/api/season/current-cycle"],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Team creation mutation
  const createTeamMutation = useMutation({
    mutationFn: async ({ teamName, ndaAgreed }: { teamName: string; ndaAgreed: boolean }) => {
      return apiRequest('/api/teams/create', 'POST', { teamName, ndaAgreed });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Dynasty Created!",
        description: `Welcome to Realm Rivalry, ${data.team.name}!`,
      });
      // Clear form
      setTeamName('');
      setNdaAgreed(false);
      // Force refresh team data to show the new team and hide creation form
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      queryClient.refetchQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create dynasty";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Enhanced loading and error handling
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-bold">Loading Team HQ...</div>
          <div className="text-gray-400 text-sm mt-2">Connecting to Realm Rivalry servers...</div>
        </div>
      </div>
    );
  }

  // Handle critical API errors gracefully
  if (hasError && (hasError as Error).message?.includes('500')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <div className="text-white text-xl font-bold mb-2">Server Connection Issue</div>
          <div className="text-gray-400 text-sm mb-4">
            Having trouble connecting to Realm Rivalry servers. Please wait a moment and refresh the page.
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Handle team creation flow when no team exists - check for actual team data
  if (!teamData || (teamData as any).needsTeamCreation || !(teamData as any).name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-gray-900">
        <ModernStickyHeader />
        <div className="max-w-4xl mx-auto p-6 pt-24">
          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white mb-4">
                🏆 Create Your Dynasty
              </CardTitle>
              <p className="text-gray-300 text-lg">
                Welcome to Realm Rivalry! Ready to build your fantasy sports empire?
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-900/50 border-blue-500/50">
                <Trophy className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  You're about to join the most competitive fantasy sports league in the multiverse. 
                  Choose your team name wisely - it will represent your dynasty across all seasons!
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your dynasty name..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                    maxLength={25}
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Choose carefully - team names cannot be changed after creation
                  </p>
                </div>

                <AlphaTestingCheckbox 
                  checked={ndaAgreed}
                  onCheckedChange={setNdaAgreed}
                />

                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 text-lg"
                  disabled={!teamName.trim() || !ndaAgreed || createTeamMutation.isPending}
                  onClick={() => {
                    if (teamName.trim() && ndaAgreed) {
                      createTeamMutation.mutate({ teamName: teamName.trim(), ndaAgreed });
                    }
                  }}
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  {createTeamMutation.isPending ? 'Creating Dynasty...' : 'Create My Dynasty'}
                </Button>
              </div>

              <div className="text-center text-gray-400 text-sm">
                <p>Once created, you'll be placed in Division 8 and can start building your roster!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Use team data from API - now includes players, finances, stadium data
  const team = teamData as any;
  const draws = 0; // TODO: Calculate draws when implemented
  
  // Debug stadium data structure
  console.log('Full team data:', teamData);
  console.log('Stadium object:', team?.stadium);
  console.log('VIP Suites Level:', team?.stadium?.vipSuitesLevel);
  const players = team?.players || [];
  const finances = team?.finances || { credits: BigInt(16000), gems: BigInt(50) };
  const stadium = team?.stadium || { capacity: 5000, concessionsLevel: 1, parkingLevel: 1, vipSuitesLevel: 1, merchandisingLevel: 1, lightingScreensLevel: 1 };

  // Enhanced player analysis - use consistent thresholds with unified header
  const allPlayers = players || [];
  const activePlayers = allPlayers.filter((p: any) => p.injuryStatus === 'HEALTHY');
  const injuredPlayers = allPlayers.filter((p: any) => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = allPlayers.filter((p: any) => (p.dailyStaminaLevel || 100) < 50);
  
  const teamPower = team.teamPower || 0;

  // Get real exhibition games count from API
  const exhibitionGamesPlayedToday = exhibitionStats?.gamesPlayedToday || 0;
  const freeExhibitionsRemaining = Math.max(0, 3 - exhibitionGamesPlayedToday);

  // Extract next opponent data - EXACT SAME LOGIC AS HEADER
  const getNextOpponentFromMatches = () => {
    // Check next upcoming match - EXACT same logic as header
    const sortedMatches = Array.isArray(upcomingMatches) ? 
      [...upcomingMatches].sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()) : 
      [];
    const nextMatch = sortedMatches[0] || null;
    
    if (!nextMatch || nextMatch.matchType !== 'LEAGUE') {
      return {
        name: "TBD",
        homeGame: false,
        division: "?",
        timeUntil: "Loading...",
        matchType: "League"
      };
    }

    // EXACT same logic as header component
    const isHome = nextMatch.homeTeam.id === teamData?.id?.toString();
    const opponent = isHome ? nextMatch.awayTeam.name : nextMatch.homeTeam.name;
    
    // Calculate time until match - same as header
    const gameDate = new Date(nextMatch.gameDate);
    const now = new Date();
    const diffTime = gameDate.getTime() - now.getTime();
    let timeUntil = "Loading...";
    
    if (diffTime > 0) {
      const hours = Math.floor(diffTime / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours < 1) {
        timeUntil = `${minutes}m`;
      } else if (hours < 24) {
        timeUntil = `${hours}h ${minutes}m`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        timeUntil = `${days}d ${remainingHours}h`;
      }
    }

    return {
      name: opponent,
      homeGame: isHome,
      division: teamData?.division || "?",
      timeUntil: timeUntil,
      matchType: nextMatch.matchType || "League"
    };
  };

  const nextOpponent = getNextOpponentFromMatches();

  // Calculate daily task completion
  const completedTasks = [
    dailyTasks.checkTeamStatus,
    exhibitionGamesPlayedToday >= 3, // Use real data instead of hardcoded
    dailyTasks.enterDailyTournament,
    dailyTasks.watchRewardedAd >= 10,
    dailyTasks.reviewTeamTactics,
    dailyTasks.checkMarketListings
  ].filter(Boolean).length;

  const totalTasks = 6;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ModernStickyHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl mt-8">
        


        {/* ⚡ STICKY QUICK ACTIONS RIBBON */}
        <div className="sticky top-0 z-10 mb-6">
          <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600 shadow-lg">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Quick Actions
                </h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 h-8 text-xs flex-1 sm:flex-none min-w-0"
                    onClick={() => setLocation('/market')}
                  >
                    <Store className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Visit Store</span>
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 h-8 text-xs flex-1 sm:flex-none min-w-0"
                    onClick={() => setLocation('/competition?tab=schedule')}
                  >
                    <Play className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Next Match</span>
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 h-8 text-xs flex-1 sm:flex-none min-w-0"
                    onClick={() => setLocation('/roster-hq?view=medical')}
                  >
                    <Activity className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Medical Bay</span>
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 h-8 text-xs flex-1 sm:flex-none min-w-0"
                    onClick={() => setLocation('/market')}
                  >
                    <ShoppingCart className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Player Market</span>
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1.5 h-8 text-xs flex-1 sm:flex-none min-w-0"
                    onClick={() => setLocation('/roster-hq?tab=stadium')}
                  >
                    <Building className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Upgrade Facilities</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mt-2 mb-4"></div>
        </div>

        {/* 🚨 CRITICAL ALERTS PANEL */}
        {(injuredPlayers.length > 0 || lowStaminaPlayers.length > 0) && (
          <Card className="bg-gradient-to-r from-red-900 to-orange-900 border-2 border-red-400 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2 text-red-400 animate-pulse" />
                  ⚠️ URGENT ISSUES
                </h2>
                <Badge variant="destructive" className="px-3 py-1">
                  {injuredPlayers.length + lowStaminaPlayers.length} ALERTS
                </Badge>
              </div>
              
              <div className="space-y-2">
                {injuredPlayers.length > 0 && (
                  <div className="flex items-center justify-between bg-red-800/50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-red-400" />
                      <span className="text-white font-semibold">{injuredPlayers.length} Injured Players</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => setLocation('/roster-hq')}
                    >
                      HEAL
                    </Button>
                  </div>
                )}
                
                {lowStaminaPlayers.length > 0 && (
                  <div className="flex items-center justify-between bg-yellow-800/50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                      <span className="text-white font-semibold">{lowStaminaPlayers.length} Low Stamina</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      onClick={() => setLocation('/roster-hq')}
                    >
                      HEAL
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 🎯 QUICK ACCESS TILES - MOBILE-FIRST DESIGN */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          
          {/* Roster Management */}
          <Card 
            className="bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/roster-hq')}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Roster HQ</h3>
              <p className="text-blue-200 text-xs mb-2">Manage players</p>
              <Badge variant="outline" className="text-blue-400 border-blue-400 text-xs">
                {allPlayers.length} Players
              </Badge>
            </CardContent>
          </Card>

          {/* Competition Hub */}
          <Card 
            className="bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-500 hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/competition')}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Competition</h3>
              <p className="text-green-200 text-xs mb-2">Matches & League</p>
              <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                {team.wins}W-{draws}D-{team.losses}L
              </Badge>
            </CardContent>
          </Card>

          {/* Market District */}
          <Card 
            className="bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-500 hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/market')}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-white">₡</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Market</h3>
              <p className="text-purple-200 text-xs mb-2">Trade & Shop</p>
              <Badge variant="outline" className="text-purple-400 border-purple-400 text-xs">
                {Number(finances?.credits || 0).toLocaleString()}₡
              </Badge>
            </CardContent>
          </Card>

          {/* Next Match - High Priority Information */}
          <Card 
            className="bg-gradient-to-br from-orange-700 to-red-900 border-2 border-orange-500 hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/competition')}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Next Match</h3>
              <p className="text-orange-200 text-xs mb-2">vs {nextOpponent.name}</p>
              <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                View Schedule
              </Badge>
            </CardContent>
          </Card>
        </div>



        {/* 🎯 DAILY TASKS & 🏆 CAREER HIGHLIGHTS - SIDE BY SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Tasks Panel */}
          <Card className="bg-gradient-to-br from-cyan-900 to-blue-900 border-2 border-cyan-600">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Target className="w-6 h-6 mr-2 text-cyan-400" />
                  Daily Tasks
                </div>
                <div className="text-cyan-400 text-sm">{completedTasks}/{totalTasks} Complete</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${dailyTasks.checkTeamStatus ? 'bg-green-600' : 'border-2 border-cyan-400'} rounded mr-3 flex items-center justify-center`}>
                      {dailyTasks.checkTeamStatus && <div className="w-2 h-2 bg-white rounded"></div>}
                    </div>
                    <span className={dailyTasks.checkTeamStatus ? "text-white" : "text-gray-400"}>Check Team Status</span>
                  </div>
                  {dailyTasks.checkTeamStatus ? (
                    <Badge className="bg-green-600 text-white text-xs">✓</Badge>
                  ) : (
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs" onClick={() => setLocation('/roster-hq')}>
                      View Now
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${exhibitionGamesPlayedToday >= 3 ? 'bg-green-600' : 'border-2 border-cyan-400'} rounded mr-3 flex items-center justify-center`}>
                      {exhibitionGamesPlayedToday >= 3 && <div className="w-2 h-2 bg-white rounded"></div>}
                    </div>
                    <span className={exhibitionGamesPlayedToday >= 3 ? "text-white" : "text-gray-400"}>Play Exhibition Matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${exhibitionGamesPlayedToday >= 3 ? 'bg-green-600' : 'bg-gray-600'} text-white text-xs`}>
                      {exhibitionGamesPlayedToday}/3
                    </Badge>
                    <Button 
                      size="sm" 
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                      onClick={() => setLocation('/competition?tab=exhibitions')}
                    >
                      Play
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-cyan-400 rounded mr-3"></div>
                    <span className="text-gray-400">Enter Daily Tournament</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    onClick={() => setLocation('/competition')}
                  >
                    Enter Now
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${dailyTasks.watchRewardedAd >= 10 ? 'bg-green-600' : 'border-2 border-cyan-400'} rounded mr-3 flex items-center justify-center`}>
                      {dailyTasks.watchRewardedAd >= 10 && <div className="w-2 h-2 bg-white rounded"></div>}
                    </div>
                    <span className={dailyTasks.watchRewardedAd >= 10 ? "text-white" : "text-gray-400"}>Watch Rewarded Ad</span>
                  </div>
                  <span className={`text-cyan-400 text-xs ${dailyTasks.watchRewardedAd >= 10 ? 'text-green-400' : ''}`}>
                    {dailyTasks.watchRewardedAd}/10
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-cyan-400 rounded mr-3"></div>
                    <span className="text-gray-400">Review Team Tactics</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    onClick={() => setLocation('/roster-hq?tab=tactics')}
                  >
                    Set Now
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-cyan-400 rounded mr-3"></div>
                    <span className="text-gray-400">Check Market Listings</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    onClick={() => setLocation('/market?tab=marketplace')}
                  >
                    Browse
                  </Button>
                </div>
              </div>
              
              <Progress value={completionPercentage} className="mt-4 h-2" />
              <div className="text-center text-cyan-200 text-xs mt-2">Daily Progress: {completionPercentage}%</div>
              
              {/* Dynamic Tips Section */}
              <div className="bg-cyan-800/30 p-3 rounded-lg mt-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-4 h-4 mr-2 text-cyan-400" />
                  <span className="text-cyan-200 font-semibold text-sm">Daily Tip</span>
                </div>
                <p className="text-cyan-100 text-xs">
                  {completionPercentage < 50 
                    ? "Complete tasks to earn daily rewards and boost team progression!"
                    : completionPercentage < 80
                    ? "Great progress! Finish remaining tasks for maximum daily bonus."
                    : "Outstanding! You've completed most daily objectives."
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Career Highlights Panel */}
          <Card className="bg-gradient-to-br from-yellow-900 to-orange-900 border-2 border-yellow-600">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                  Career Highlights
                </div>
                <Badge className="bg-yellow-600 text-white text-xs">Season 0</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Your last trophy:</span>
                  <span className="text-gray-400">–</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Championship wins:</span>
                  <span className="text-yellow-400 font-bold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Division titles:</span>
                  <span className="text-yellow-400 font-bold">0</span>
                </div>
                <div className="bg-yellow-800/30 p-3 rounded-lg mt-4">
                  <div className="flex items-center mb-2">
                    <Star className="w-4 h-4 mr-2 text-yellow-400" />
                    <span className="text-yellow-200 font-semibold text-sm">Next Milestone</span>
                  </div>
                  <p className="text-yellow-100 text-xs">Win 3 consecutive games to earn your first highlight!</p>
                  <div className="flex items-center mt-2">
                    <Progress value={Math.min(33, (team.wins || 0) * 33)} className="flex-1 h-1 mr-2" />
                    <span className="text-yellow-300 text-xs">{Math.min(3, team.wins || 0)}/3</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📊 UNIFIED FACILITIES & REVENUE DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
          
          {/* Unified Facilities & Revenue Panel (70%) */}
          <Card className="lg:col-span-7 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <Building2 className="w-6 h-6 mr-2 text-orange-400" />
                  Facilities & Revenue
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-orange-500 text-orange-300 hover:bg-orange-900/30"
                  onClick={() => setLocation('/roster-hq?tab=stadium')}
                >
                  Manage
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Stadium Facilities */}
                <div className="space-y-3">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Building2 className="w-4 h-4 mr-1 text-orange-400" />
                    Facilities
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Capacity</span>
                      <span className="text-orange-400 font-bold">{stadium?.capacity?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Concessions</span>
                      <span className="text-green-400">Tier {stadium?.concessionsLevel || 1}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">VIP Suites</span>
                      <span className="text-purple-400">Tier {stadium?.vipSuitesLevel || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Lighting & Screens</span>
                      <span className="text-blue-400">Tier {stadium?.lightingScreensLevel || 1}</span>
                    </div>
                  </div>
                </div>

                {/* Revenue & Analytics */}
                <div className="space-y-3">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                    Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Team Power</span>
                      <span className="text-blue-400 font-bold">{teamPower}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Fan Loyalty</span>
                      <span className="text-purple-400">{team.fanLoyalty || 50}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Projected Revenue</span>
                      <div className="flex items-center">
                        <span className="text-green-400 mr-2">₡{Number(finances?.projectedIncome || 0).toLocaleString()}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="p-1 h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-900/30"
                          onClick={() => setShowRevenueModal(true)}
                        >
                          <Calculator className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">League Points</span>
                      <span className="text-yellow-400 font-bold">{team.points || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Match Card (30%) */}
          <Card className="lg:col-span-3 bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-white">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                Next Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Opponent Info */}
                <div className="text-center">
                  <div className="text-gray-300 text-sm mb-1">vs</div>
                  <div className="text-white font-bold text-lg mb-2">
                    {nextOpponent?.name || "TBD"}
                  </div>
                  <div className="text-blue-300 text-xs">
                    {nextOpponent?.homeGame ? "Home" : "Away"} • Division {nextOpponent?.division || "?"}
                  </div>
                </div>

                {/* Match Countdown */}
                <div className="bg-blue-800/50 p-3 rounded-lg text-center">
                  <div className="text-blue-200 text-xs mb-1">Time until Match</div>
                  <div className="text-white font-bold text-sm">
                    {nextOpponent?.timeUntil || "Loading..."}
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation('/competition')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  View Match
                </Button>

                {/* Quick Match Info */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Match Type</span>
                    <span className="text-blue-300">{nextOpponent.matchType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Record</span>
                    <span className="text-white">{team.wins}W-{draws}D-{team.losses}L</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>



      </div>

      {/* Revenue Calculations Modal */}
      <RevenueCalculationsModal 
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        stadium={stadium}
        team={team}
      />
    </div>
  );
}