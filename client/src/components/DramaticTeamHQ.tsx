import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Heart
} from "lucide-react";

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
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
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

  // Team data query - use existing working endpoint
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  // Exhibition games played today - fetch real data
  const { data: exhibitionStats } = useQuery<ExhibitionStats>({
    queryKey: ["/api/exhibitions/stats"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Upcoming matches - check for next scheduled match
  const { data: upcomingMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-bold">Loading Team HQ...</div>
        </div>
      </div>
    );
  }

  // Use team data from API - now includes players, finances, stadium data
  const team = teamData as any;
  const draws = 0; // TODO: Calculate draws when implemented
  const players = team?.players || [];
  const finances = team?.finances || { credits: BigInt(16000), gems: BigInt(50) };
  const stadium = team?.stadium || { capacity: 5000, concessionsLevel: 1, parkingLevel: 1, vipSuitesLevel: 1, merchandisingLevel: 1, lightingScreensLevel: 1 };

  // Enhanced player analysis - fix filtering logic
  const allPlayers = players || [];
  const activePlayers = allPlayers.filter((p: any) => p.injuryStatus === 'HEALTHY');
  const injuredPlayers = allPlayers.filter((p: any) => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = allPlayers.filter((p: any) => (p.dailyStaminaLevel || 100) < 70);
  
  const teamPower = team.teamPower || 0;

  // Get real exhibition games count from API
  const exhibitionGamesPlayedToday = exhibitionStats?.gamesPlayedToday || 0;
  const freeExhibitionsRemaining = Math.max(0, 3 - exhibitionGamesPlayedToday);

  // Get next scheduled opponent from API
  const { data: nextOpponentData } = useQuery({
    queryKey: ['/api/teams/my/next-opponent'],
    enabled: isAuthenticated
  });
  
  const nextOpponent = nextOpponentData?.nextOpponent || "No games scheduled";

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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* 🚀 DRAMATIC HERO BANNER - MOBILE-FIRST */}
        <Card className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 border-4 border-blue-500 mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Trophy className="w-8 h-8 mr-3 text-yellow-400" />
                  <div>
                    <h1 className="text-3xl font-black text-white mb-1">⚡ {team.name} ⚡</h1>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1">
                        Division {team.division} - Stone {team.subdivision}
                      </Badge>
                      <span className="text-blue-200 text-sm font-semibold">Season 0 • Day 9 of 17</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-blue-400 text-sm font-bold">TEAM POWER</div>
                <div className="text-white text-3xl font-black">{teamPower}</div>
                <div className="text-blue-200 text-sm">{team.wins}W - {draws}D - {team.losses}L</div>
              </div>
            </div>
            
            {/* Quick Status Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{allPlayers.length}</div>
                <div className="text-xs text-blue-200">Players</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${injuredPlayers.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {injuredPlayers.length}
                </div>
                <div className="text-xs text-blue-200">Injured</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${lowStaminaPlayers.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {lowStaminaPlayers.length}
                </div>
                <div className="text-xs text-blue-200">Low Energy</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{Number(finances?.credits || BigInt(0)).toLocaleString()}</div>
                <div className="text-xs text-blue-200">Credits</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      HEAL NOW
                    </Button>
                  </div>
                )}
                
                {lowStaminaPlayers.length > 0 && (
                  <div className="flex items-center justify-between bg-yellow-800/50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                      <span className="text-white font-semibold">{lowStaminaPlayers.length} Low Stamina</span>
                    </div>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      REST NOW
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
          <Card className="bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-500 hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Market</h3>
              <p className="text-purple-200 text-xs mb-2">Trade & Shop</p>
              <Badge variant="outline" className="text-purple-400 border-purple-400 text-xs">
                {Number(finances?.credits || 0).toLocaleString()}₡
              </Badge>
            </CardContent>
          </Card>

          {/* Stadium & Schedules - Actionable Info */}
          <Card className="bg-gradient-to-br from-orange-700 to-red-900 border-2 border-orange-500 hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Schedule</h3>
              <p className="text-orange-200 text-xs mb-2">Next: vs {nextOpponent}</p>
              <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                {freeExhibitionsRemaining} Free Exhibitions
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
                  <Badge className={`${exhibitionGamesPlayedToday >= 3 ? 'bg-green-600' : 'bg-gray-600'} text-white text-xs`}>
                    {exhibitionGamesPlayedToday}/3
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-cyan-400 rounded mr-3"></div>
                    <span className="text-gray-400">Enter Daily Tournament</span>
                  </div>
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
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
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
                    Set Now
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-cyan-400 rounded mr-3"></div>
                    <span className="text-gray-400">Check Market Listings</span>
                  </div>
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
                    Browse
                  </Button>
                </div>
              </div>
              
              <Progress value={completionPercentage} className="mt-4 h-2" />
              <div className="text-center text-cyan-200 text-xs mt-2">Daily Progress: {completionPercentage}%</div>
            </CardContent>
          </Card>

          {/* Career Highlights Panel */}
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
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-400 opacity-50" />
                <p className="text-gray-300 mb-2">No career highlights yet.</p>
                <p className="text-gray-400 text-sm">Win games and achieve milestones to earn highlights!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📊 PERFORMANCE DASHBOARD - MOBILE-OPTIMIZED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Team Analytics */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-6 h-6 mr-2 text-blue-400" />
                📊 Team Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Team Power</span>
                  <span className="text-2xl font-bold text-blue-400">{teamPower}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Team Camaraderie</span>
                  <span className="text-2xl font-bold text-teal-400">{Math.round(team.camaraderie || 50)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Fan Loyalty</span>
                  <span className="text-2xl font-bold text-purple-400">{team.fanLoyalty}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">League Points</span>
                  <span className="text-2xl font-bold text-yellow-400">{team.points}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stadium Overview */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Building2 className="w-6 h-6 mr-2 text-orange-400" />
                🏟️ Stadium Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Capacity</span>
                  <span className="text-xl font-bold text-orange-400">{stadium?.capacity || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Concessions</span>
                  <span className="text-xl font-bold text-green-400">Level {stadium?.concessionsLevel || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">VIP Suites</span>
                  <span className="text-xl font-bold text-purple-400">Level {stadium?.vipSuitesLevel || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Lighting</span>
                  <span className="text-xl font-bold text-blue-400">Level {stadium?.lightingScreensLevel || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



      </div>
    </div>
  );
}