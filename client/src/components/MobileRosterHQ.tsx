import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PlayerDetailModal from "@/components/PlayerDetailModal";
import StaffNegotiationModal from "@/components/StaffNegotiationModal";
import StaffReleaseConfirmation from "@/components/StaffReleaseConfirmation";
import UnifiedTeamHeader from "@/components/UnifiedTeamHeader";
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
  rosterPosition?: number;
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
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showStaffNegotiation, setShowStaffNegotiation] = useState(false);
  const [showStaffReleaseConfirm, setShowStaffReleaseConfirm] = useState(false);

  // Function to get racial emoji/icon
  const getRacialIcon = (race: string) => {
    const raceIcons: Record<string, string> = {
      'Human': '👤',
      'Sylvan': '🍃', 
      'Gryll': '🪨',
      'Lumina': '✨',
      'Umbra': '🌙'
    };
    return raceIcons[race] || '👤';
  };

  // Function to get proper staff type names
  const getStaffTypeName = (type: string) => {
    const staffTypeMap: Record<string, string> = {
      'HEAD_COACH': 'Head Coach',
      'PASSER_TRAINER': 'Technical Trainer',
      'RUNNER_TRAINER': 'Speed Trainer',
      'BLOCKER_TRAINER': 'Strength Trainer',
      'RECOVERY_SPECIALIST': 'Recovery Specialist',
      'SCOUT': 'Scout'
    };
    return staffTypeMap[type] || type;
  };

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  const { data: staff, isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: [`/api/teams/${team?.id}/staff`],
    enabled: !!team?.id,
  });

  // Mark "Check Team Status" task as completed when visiting roster-hq
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`rosterVisit_${today}`, 'true');
  }, []);

  // Enhanced player calculations - handle missing rosterPosition gracefully
  const activePlayers = players?.filter(p => !p.isOnMarket && !p.isRetired) || [];
  
  // Sort by rosterPosition, but handle null/undefined values by putting them first
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    const posA = a.rosterPosition || 0;
    const posB = b.rosterPosition || 0;
    if (posA === 0 && posB === 0) return 0; // Both unpositioned, maintain order
    if (posA === 0) return 1; // A is unpositioned, put after B
    if (posB === 0) return -1; // B is unpositioned, put after A
    return posA - posB;
  });
  
  // For now, treat all active players as main roster if rosterPosition isn't set
  const mainRoster = sortedPlayers.slice(0, 12);
  const taxiSquad = sortedPlayers.slice(12, 15);
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => (p.dailyStaminaLevel || 100) < 50);
  
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

  const handleStaffNegotiate = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowStaffNegotiation(true);
  };

  const handleStaffRelease = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowStaffReleaseConfirm(true);
  };

  // Debug logging to understand what's happening
  console.log('MobileRosterHQ Debug:', {
    isAuthenticated,
    teamLoading,
    playersLoading,
    staffLoading,
    team: team ? { id: team.id, name: team.name } : null,
    playersCount: players?.length,
    staffCount: staff?.length,
    activePlayers: activePlayers?.length
  });

  // Show loading state while team or essential data is loading
  if (teamLoading || playersLoading || !team || !players) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="bg-gradient-to-r from-blue-800 to-purple-800 border-2 border-blue-400">
            <CardContent className="p-8">
              <div className="animate-pulse">
                <h1 className="text-4xl font-bold text-white mb-4">📋 Loading Roster HQ...</h1>
                <div className="w-16 h-16 bg-blue-400 rounded-full mx-auto animate-spin">
                  <Users className="w-8 h-8 text-white m-4" />
                </div>
                <p className="text-xl text-blue-200 mt-4">
                  Debug: teamLoading={String(teamLoading)}, playersLoading={String(playersLoading)}, 
                  team={team ? 'loaded' : 'null'}, players={players ? `${players.length} found` : 'null'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* 🚀 UNIFIED TEAM HEADER */}
        <UnifiedTeamHeader
          title="ROSTER HQ"
          titleIcon="📋"
          team={team}
          players={activePlayers}
        />

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
                  <div className="flex items-center justify-between bg-red-800/50 p-3 rounded-lg hover:bg-red-800/70 transition-colors cursor-pointer"
                       onClick={() => {
                         setActivePanel('medical');
                         setExpandedSection('medical');
                       }}>
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-red-400" />
                      <span className="text-white font-semibold">{injuredPlayers.length} Injured Players - Click to Filter</span>
                    </div>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      HEAL ALL
                    </Button>
                  </div>
                )}
                
                {lowStaminaPlayers.length > 0 && (
                  <div className="flex items-center justify-between bg-yellow-800/50 p-3 rounded-lg hover:bg-yellow-800/70 transition-colors cursor-pointer"
                       onClick={() => {
                         setActivePanel('medical');
                         setExpandedSection('medical');
                       }}>
                    <div className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                      <span className="text-white font-semibold">{lowStaminaPlayers.length} Low Energy - Click to Filter</span>
                    </div>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      RESTORE ALL
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
              
              {/* Passers - Clickable Filter */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500 hover:scale-105 transition-all cursor-pointer"
                    onClick={() => {
                      setActivePanel('roster');
                      setExpandedSection('roster');
                      // Could add position filter state here
                    }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-white">{passers.length}</div>
                  <div className="text-blue-200 text-sm font-semibold">Passers</div>
                  <div className="text-xs text-blue-300 mt-1">(Min: 3 Required)</div>
                  {passers.length < 3 && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      Needs {3 - passers.length} More!
                    </Badge>
                  )}
                  <Progress 
                    value={(passers.length / 3) * 100} 
                    className="mt-2 h-2 bg-blue-900" 
                  />
                </CardContent>
              </Card>

              {/* Runners - Clickable Filter */}
              <Card className="bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500 hover:scale-105 transition-all cursor-pointer"
                    onClick={() => {
                      setActivePanel('roster');
                      setExpandedSection('roster');
                    }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-2xl font-bold text-white">{runners.length}</div>
                  <div className="text-green-200 text-sm font-semibold">Runners</div>
                  <div className="text-xs text-green-300 mt-1">(Min: 4 Required)</div>
                  {runners.length < 4 && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      Needs {4 - runners.length} More!
                    </Badge>
                  )}
                  <Progress 
                    value={(runners.length / 4) * 100} 
                    className="mt-2 h-2 bg-green-900" 
                  />
                </CardContent>
              </Card>

              {/* Blockers - Clickable Filter */}
              <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-2 border-orange-500 hover:scale-105 transition-all cursor-pointer"
                    onClick={() => {
                      setActivePanel('roster');
                      setExpandedSection('roster');
                    }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">🛡️</div>
                  <div className="text-2xl font-bold text-white">{blockers.length}</div>
                  <div className="text-orange-200 text-sm font-semibold">Blockers</div>
                  <div className="text-xs text-orange-300 mt-1">(Min: 4 Required)</div>
                  {blockers.length < 4 && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      Needs {4 - blockers.length} More!
                    </Badge>
                  )}
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
                  👥 MAIN ROSTER ({mainRoster.length} players)
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
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getRacialIcon(player.race || 'Human')}</span>
                              <h3 className="font-bold text-white text-sm">
                                {player.firstName} {player.lastName}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs text-white border-white/50">
                                {getRoleIcon(player.role)} {player.role}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-blue-300 border-blue-300">
                                Age {player.age}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-white/70">Power</div>
                          </div>
                        </div>
                        
                        {/* Contract Information */}
                        <div className="mb-2 p-2 bg-black/30 rounded">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Contract:</span>
                            <span className="text-green-300 font-semibold">
                              {Number((player as any).contractSalary || 0).toLocaleString()}₡/season
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Years Left:</span>
                            <span className="text-yellow-300">
                              {(player as any).contractLength || 0} seasons
                            </span>
                          </div>
                        </div>
                        
                        {/* Health and Stamina Status */}
                        <div className="flex justify-between text-xs">
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
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getRacialIcon(player.race || 'Human')}</span>
                              <h3 className="font-bold text-white text-sm">
                                {player.firstName} {player.lastName}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs text-white border-white/50">
                                {getRoleIcon(player.role)} {player.role}
                              </Badge>
                              <Badge className="bg-purple-600 text-white text-xs">
                                DEVELOPMENT
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-white/70">Power</div>
                          </div>
                        </div>
                        
                        {/* Enhanced Taxi Squad Info */}
                        <div className="p-2 bg-purple-900/50 rounded text-xs">
                          <div className="text-purple-200 mb-1">🚌 Taxi Squad Status</div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Promotion Available:</span>
                            <span className="text-yellow-300">Days 16-17</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Development Focus:</span>
                            <span className="text-green-300">Standard Rate</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff && staff.length > 0 ? staff.map((member) => (
                    <Card 
                      key={member.id} 
                      className="bg-gradient-to-br from-green-700 to-green-800 border-2 border-green-500 hover:scale-105 transition-all duration-200 cursor-pointer"
                      onClick={() => {/* Could open staff detail modal */}}
                    >
                      <CardContent className="p-4">
                        {/* Staff Avatar & Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm">{member.name}</h3>
                              <Badge className="bg-green-600 text-white text-xs">
                                {getStaffTypeName(member.type)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-green-200">Age {member.age}</div>
                          </div>
                        </div>

                        {/* Contract Information */}
                        <div className="mb-3 p-2 bg-black/30 rounded">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Contract:</span>
                            <span className="text-green-300 font-semibold">
                              {(member.level * 1000).toLocaleString()}₡/season
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Years Left:</span>
                            <span className="text-yellow-300">2 seasons</span>
                          </div>
                        </div>

                        {/* Staff Attributes & Effects */}
                        <div className="space-y-2">
                          {/* Primary Attribute */}
                          {member.type === 'HEAD_COACH' && (
                            <>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Motivation:</span>
                                <span className="text-blue-300 font-semibold">{member.motivation}/40</span>
                              </div>
                              <Progress value={(member.motivation / 40) * 100} className="h-1.5 bg-green-900" />
                              
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Development:</span>
                                <span className="text-purple-300 font-semibold">{member.development}/40</span>
                              </div>
                              <Progress value={(member.development / 40) * 100} className="h-1.5 bg-green-900" />
                              
                              <div className="mt-2 p-1.5 bg-green-900/50 rounded text-xs">
                                <div className="text-green-200">🎯 Effect:</div>
                                <div className="text-green-300">+{Math.round(member.motivation * 0.25)}% Team Chemistry</div>
                              </div>
                            </>
                          )}

                          {member.type.includes('TRAINER') && (
                            <>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Teaching:</span>
                                <span className="text-blue-300 font-semibold">{member.teaching}/40</span>
                              </div>
                              <Progress value={(member.teaching / 40) * 100} className="h-1.5 bg-green-900" />
                              
                              <div className="mt-2 p-1.5 bg-green-900/50 rounded text-xs">
                                <div className="text-green-200">💪 Boosts:</div>
                                <div className="text-green-300">
                                  {member.type === 'PASSER_TRAINER' && 'Technical Skills'}
                                  {member.type === 'RUNNER_TRAINER' && 'Speed & Agility'}
                                  {member.type === 'BLOCKER_TRAINER' && 'Power & Stamina'}
                                </div>
                              </div>
                            </>
                          )}

                          {member.type === 'RECOVERY_SPECIALIST' && (
                            <>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Physiology:</span>
                                <span className="text-red-300 font-semibold">{member.physiology}/40</span>
                              </div>
                              <Progress value={(member.physiology / 40) * 100} className="h-1.5 bg-green-900" />
                              
                              <div className="mt-2 p-1.5 bg-green-900/50 rounded text-xs">
                                <div className="text-green-200">🏥 Effect:</div>
                                <div className="text-green-300">+{Math.round(member.physiology * 0.5)} Recovery/day</div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs border-green-400 text-green-400 hover:bg-green-600 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStaffNegotiate(member);
                            }}
                          >
                            Negotiate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs border-red-400 text-red-400 hover:bg-red-600 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStaffRelease(member);
                            }}
                          >
                            Release
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center text-white/70 py-8">
                      <UserPlus className="w-16 h-16 mx-auto mb-4 text-green-400" />
                      <h3 className="text-xl font-bold text-white mb-2">No Coaching Staff Hired</h3>
                      <p className="text-lg mb-4">Build your coaching team to boost player development</p>
                      <div className="space-y-2 text-sm text-green-300 mb-6">
                        <div>• Head Coach: Boosts team chemistry and development</div>
                        <div>• Trainers: Accelerate specific skill progression</div>
                        <div>• Recovery Specialist: Faster injury healing</div>
                        <div>• Scouts: Better player evaluation and hidden gems</div>
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
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

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal 
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
        />
      )}

      {/* Staff Negotiation Modal */}
      <StaffNegotiationModal
        staff={selectedStaff}
        isOpen={showStaffNegotiation}
        onClose={() => {
          setShowStaffNegotiation(false);
          setSelectedStaff(null);
        }}
      />

      {/* Staff Release Confirmation Modal */}
      <StaffReleaseConfirmation
        staff={selectedStaff}
        isOpen={showStaffReleaseConfirm}
        onClose={() => {
          setShowStaffReleaseConfirm(false);
          setSelectedStaff(null);
        }}
      />
    </div>
  );
}