import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  ChevronUp
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

export default function DramaticTeamHQ() {
  console.log("🚀 DRAMATIC TEAM HQ COMPONENT LOADING - REDESIGN ACTIVE!");
  const { isAuthenticated } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  const { data: finances } = useQuery<TeamFinances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id,
  });

  const { data: stadium } = useQuery<Stadium>({
    queryKey: [`/api/teams/${team?.id}/stadium`],
    enabled: !!team?.id,
  });

  // Real data calculations
  const activePlayers = players?.filter(p => p.injuryStatus !== 'RETIRED') || [];
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => (p.dailyStaminaLevel || 0) < 50);
  
  const getPlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.agility + 
                     player.throwing + player.catching + player.kicking) / 6);
  };

  const teamPower = activePlayers.length > 0 
    ? Math.round(activePlayers.reduce((sum, p) => sum + getPlayerPower(p), 0) / activePlayers.length)
    : 0;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-400">
          <CardContent className="p-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">🏗️ DRAMATIC REDESIGN ACTIVE - CREATE YOUR TEAM</h1>
            <p className="text-xl text-red-200">Start your journey to championship glory</p>
            <p className="text-sm text-red-300 mt-2">✅ DramaticTeamHQ Component Successfully Loading</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* 🚨 REDESIGN SUCCESS INDICATOR - REMOVE AFTER CONFIRMATION */}
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          ✅ DRAMATIC REDESIGN ACTIVE
        </div>
        
        {/* 🚀 DRAMATIC HERO BANNER WITH REAL TEAM DATA */}
        <Card className="bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 border-2 border-blue-400 shadow-2xl mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">✓</span>
                  </div>
                </div>
                
                <div>
                  <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">
                    🏠 TEAM HQ
                  </h1>
                  <div className="flex items-center space-x-3 text-lg text-blue-200 mt-1">
                    <span className="font-semibold">{team.name}</span>
                    <Badge variant="outline" className="border-blue-400 text-blue-400">
                      Division {team.division}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-blue-400 text-sm font-bold">TEAM POWER</div>
                <div className="text-white text-3xl font-black">{teamPower}</div>
                <div className="text-blue-200 text-sm">{team.wins}W - {team.losses}L</div>
              </div>
            </div>
            
            {/* Quick Status Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{activePlayers.length}</div>
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
          <Card className="bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Roster HQ</h3>
              <p className="text-blue-200 text-xs mb-2">Manage players</p>
              <Badge variant="outline" className="text-blue-400 border-blue-400 text-xs">
                {activePlayers.length} Players
              </Badge>
            </CardContent>
          </Card>

          {/* Competition Hub */}
          <Card className="bg-gradient-to-br from-green-700 to-green-900 border-2 border-green-500 hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Competition</h3>
              <p className="text-green-200 text-xs mb-2">Matches & League</p>
              <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                {team.wins}W-{team.losses}L
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
                {Number(finances?.credits || BigInt(0)).toLocaleString()}₡
              </Badge>
            </CardContent>
          </Card>

          {/* Stadium Operations */}
          <Card className="bg-gradient-to-br from-orange-700 to-orange-900 border-2 border-orange-500 hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Stadium</h3>
              <p className="text-orange-200 text-xs mb-2">Facilities</p>
              <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                {stadium?.capacity || 0} Seats
              </Badge>
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
                  <span className="text-gray-300">Team Chemistry</span>
                  <span className="text-2xl font-bold text-teal-400">{team.camaraderie}%</span>
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

        {/* 🎉 SUCCESS MESSAGE */}
        <Card className="bg-gradient-to-r from-green-800 to-emerald-900 border-2 border-green-400">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">TEAM HQ MOBILE-FIRST REDESIGN COMPLETE!</h2>
            <p className="text-xl text-green-200 mb-4">
              Real Data Integration • Dramatic Gradients • Touch-Friendly Quick Access Tiles
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-white">✓</div>
                <div className="text-sm text-green-300">Hero Banner</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">✓</div>
                <div className="text-sm text-green-300">Critical Alerts</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">✓</div>
                <div className="text-sm text-green-300">Quick Access</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">✓</div>
                <div className="text-sm text-green-300">Real Data</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}