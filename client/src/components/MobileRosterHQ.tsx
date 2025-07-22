import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, UserPlus, Zap, Heart, DollarSign, Settings,
  Trophy, Shield, Target, AlertTriangle, Plus, Building2, BarChart3,
  TrendingUp, TrendingDown, Clock, Star, ChevronRight, Activity,
  Calendar, Coins, Award, ChevronDown, ChevronUp
} from "lucide-react";

// Enhanced interfaces for Mobile Roster HQ
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  role: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating: number;
  dailyStaminaLevel: number;
  injuryStatus: string;
  camaraderieScore: number;
  isOnMarket: boolean;
  isRetired: boolean;
}

interface Team {
  id: string;
  name: string;
  teamPower: number;
  camaraderie: number;
  wins: number;
  losses: number;
  division: number;
}

interface Staff {
  id: string;
  name: string;
  type: string;
  level: number;
  age: number;
  motivation: number;
  development: number;
  teaching: number;
  physiology: number;
}

type PanelType = 'overview' | 'roster' | 'tactics' | 'staff' | 'medical' | 'chemistry' | 'finances';

export default function MobileRosterHQ() {
  const { isAuthenticated } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelType>('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  const { data: staff } = useQuery<Staff[]>({
    queryKey: [`/api/teams/${team?.id}/staff`],
    enabled: !!team?.id,
  });

  // Enhanced player calculations
  const activePlayers = players?.filter(p => !p.isOnMarket && !p.isRetired) || [];
  const mainRoster = activePlayers.slice(0, 13);
  const taxiSquad = activePlayers.slice(13, 15);
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => (p.dailyStaminaLevel || 0) < 50);
  
  // Role distribution
  const passers = activePlayers.filter(p => p.role === 'PASSER');
  const runners = activePlayers.filter(p => p.role === 'RUNNER');
  const blockers = activePlayers.filter(p => p.role === 'BLOCKER');

  const getPlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.agility + 
                     player.throwing + player.catching + player.kicking) / 6);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PASSER': return 'from-blue-600 to-blue-800';
      case 'RUNNER': return 'from-green-600 to-green-800';
      case 'BLOCKER': return 'from-orange-600 to-orange-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PASSER': return '🎯';
      case 'RUNNER': return '⚡';
      case 'BLOCKER': return '🛡️';
      default: return '👤';
    }
  };

  const getStaminaColor = (stamina: number) => {
    if (stamina >= 80) return 'text-green-400';
    if (stamina >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-400">
            <CardContent className="p-8">
              <h1 className="text-4xl font-bold text-white mb-4">🏗️ BUILD YOUR TEAM</h1>
              <p className="text-xl text-red-200">Create your roster and start your journey to glory</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* 🚀 DRAMATIC ROSTER HQ HERO BANNER */}
        <Card className="bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 border-2 border-blue-400 shadow-2xl mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{activePlayers.length}</span>
                  </div>
                </div>
                
                <div>
                  <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">
                    📋 ROSTER HQ
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
                <div className="text-white text-3xl font-black">{team.teamPower || 'N/A'}</div>
              </div>
            </div>
            
            {/* Quick Status Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{activePlayers.length}/15</div>
                <div className="text-xs text-blue-200">Active</div>
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
                <div className="text-xl font-bold text-purple-400">{taxiSquad.length}/2</div>
                <div className="text-xs text-blue-200">Taxi</div>
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

        {/* 📊 POSITION BREAKDOWN CARDS */}
        <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-600 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Target className="w-6 h-6 mr-3 text-blue-400" />
              📊 POSITION BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              
              {/* Passers */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-white">{passers.length}</div>
                  <div className="text-blue-200 text-sm font-semibold">Passers</div>
                  <div className="text-xs text-blue-300 mt-1">(Min: 3 Required)</div>
                  <Progress 
                    value={(passers.length / 3) * 100} 
                    className="mt-2 h-2 bg-blue-900" 
                  />
                </CardContent>
              </Card>

              {/* Runners */}
              <Card className="bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-2xl font-bold text-white">{runners.length}</div>
                  <div className="text-green-200 text-sm font-semibold">Runners</div>
                  <div className="text-xs text-green-300 mt-1">(Min: 4 Required)</div>
                  <Progress 
                    value={(runners.length / 4) * 100} 
                    className="mt-2 h-2 bg-green-900" 
                  />
                </CardContent>
              </Card>

              {/* Blockers */}
              <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-2 border-orange-500">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">🛡️</div>
                  <div className="text-2xl font-bold text-white">{blockers.length}</div>
                  <div className="text-orange-200 text-sm font-semibold">Blockers</div>
                  <div className="text-xs text-orange-300 mt-1">(Min: 4 Required)</div>
                  <Progress 
                    value={(blockers.length / 4) * 100} 
                    className="mt-2 h-2 bg-orange-900" 
                  />
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* ROSTER MANAGEMENT PANELS */}
        <div className="space-y-6">

          {/* MAIN ROSTER SECTION */}
          <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
            <CardHeader 
              className="cursor-pointer select-none"
              onClick={() => toggleSection('roster')}
            >
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center">
                  <Users className="w-6 h-6 mr-3 text-blue-400" />
                  👥 MAIN ROSTER ({mainRoster.length}/13)
                </span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-blue-400 text-blue-400">
                    CLICK TO EXPAND
                  </Badge>
                  {expandedSection === 'roster' ? 
                    <ChevronUp className="w-5 h-5 text-blue-400" /> : 
                    <ChevronDown className="w-5 h-5 text-blue-400" />
                  }
                </div>
              </CardTitle>
            </CardHeader>
            
            {expandedSection === 'roster' && (
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mainRoster.map((player) => (
                    <Card 
                      key={player.id}
                      className={`bg-gradient-to-r ${getRoleColor(player.role)} border-2 border-white/20 cursor-pointer hover:scale-105 transition-all duration-200`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-sm">
                              {player.firstName} {player.lastName}
                            </h3>
                            <Badge variant="outline" className="text-xs text-white border-white/50 mt-1">
                              {getRoleIcon(player.role)} {player.role}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-white/70">Power</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-green-400" />
                            <span className={`font-semibold ${player.injuryStatus === 'HEALTHY' ? 'text-green-400' : 'text-red-400'}`}>
                              {player.injuryStatus === 'HEALTHY' ? 'Healthy' : 'Injured'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            <span className={`text-xs font-semibold ${getStaminaColor(player.dailyStaminaLevel)}`}>
                              {player.dailyStaminaLevel}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center mt-6">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    ADD NEW PLAYER
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* TAXI SQUAD SECTION */}
          <Card className="bg-gradient-to-r from-purple-800 to-purple-900 border-2 border-purple-400">
            <CardHeader 
              className="cursor-pointer select-none"
              onClick={() => toggleSection('taxi')}
            >
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center">
                  <Users className="w-6 h-6 mr-3 text-purple-400" />
                  🚌 TAXI SQUAD ({taxiSquad.length}/2)
                </span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-purple-400 text-purple-400">
                    DEVELOPMENT PLAYERS
                  </Badge>
                  {expandedSection === 'taxi' ? 
                    <ChevronUp className="w-5 h-5 text-purple-400" /> : 
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                  }
                </div>
              </CardTitle>
            </CardHeader>
            
            {expandedSection === 'taxi' && (
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {taxiSquad.length > 0 ? taxiSquad.map((player) => (
                    <Card 
                      key={player.id}
                      className="bg-gradient-to-r from-purple-700 to-purple-800 border-2 border-purple-500 cursor-pointer hover:scale-105 transition-all duration-200"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-white">
                              {player.firstName} {player.lastName}
                            </h3>
                            <Badge variant="outline" className="text-xs text-white border-white/50 mt-1">
                              {getRoleIcon(player.role)} {player.role}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-white/70">Power</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-2 text-center text-white/70 py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                      <p className="text-lg mb-4">No taxi squad players</p>
                      <p className="text-sm">Players can be promoted from taxi squad during offseason</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* STAFF SECTION */}
          <Card className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-400">
            <CardHeader 
              className="cursor-pointer select-none"
              onClick={() => toggleSection('staff')}
            >
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center">
                  <UserPlus className="w-6 h-6 mr-3 text-green-400" />
                  👔 COACHING STAFF
                </span>
                <div className="flex items-center space-x-2">
                  {expandedSection === 'staff' ? 
                    <ChevronUp className="w-5 h-5 text-green-400" /> : 
                    <ChevronDown className="w-5 h-5 text-green-400" />
                  }
                </div>
              </CardTitle>
            </CardHeader>
            
            {expandedSection === 'staff' && (
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staff && staff.length > 0 ? staff.map((member) => (
                    <Card key={member.id} className="bg-green-700 border-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white">{member.name}</h3>
                            <Badge variant="outline" className="text-xs text-white border-white/50 mt-1">
                              {member.type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">Level {member.level}</div>
                            <div className="text-xs text-white/70">Age {member.age}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-2 text-center text-white/70 py-8">
                      <UserPlus className="w-12 h-12 mx-auto mb-4 text-green-400" />
                      <p className="text-lg mb-4">No staff hired yet</p>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        HIRE COACHING STAFF
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}