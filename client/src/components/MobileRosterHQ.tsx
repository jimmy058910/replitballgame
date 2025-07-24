import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  Users, 
  Zap, 
  Heart, 
  TrendingUp, 
  Coins, 
  UserCheck,
  ChevronUp, 
  ChevronDown,
  UserPlus,
  Settings,
  Shield,
  Trophy,
  Building,
  Activity,
  FileText,
  Briefcase,
  Handshake,
  Target,
  Filter,
  X
} from 'lucide-react';
import UnifiedTeamHeader from './UnifiedTeamHeader';
import PlayerDetailModal from './PlayerDetailModal';
import CamaraderieManagement from './CamaraderieManagement';
import StadiumFinancialHub from './StadiumFinancialHub';
import TapToAssignTactics from './TapToAssignTactics';
import { useToast } from '../hooks/use-toast';

// Type definitions
type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  role: 'PASSER' | 'RUNNER' | 'BLOCKER';
  race?: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  agility: number;
  stamina: number;
  leadership: number;
  dailyStaminaLevel: number;
  injuryStatus: 'HEALTHY' | 'INJURED';
  isOnMarket: boolean;
  isRetired: boolean;
  rosterPosition?: number;
  contractSalary?: number;
  contractLength?: number;
  contractStartDate?: string;
  contractSigningBonus?: number;
};

type Staff = {
  id: string;
  name: string;
  type: string;
  age: number;
  level: number;
  motivation?: number;
  development?: number;
  teaching?: number;
  physiology?: number;
  talentIdentification?: number;
  potentialAssessment?: number;
  tactics?: number;
};

type Team = {
  id: string;
  name: string;
  credits: number;
  gems: number;
  camaraderie: number;
};

type Stadium = {
  id: string;
  name: string;
  capacity: number;
  level: number;
};

type TabType = 'roster' | 'tactics' | 'camaraderie' | 'stadium' | 'personnel';
type RosterView = 'all' | 'medical' | 'contracts';

export default function MobileRosterHQ() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [rosterView, setRosterView] = useState<RosterView>('all');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Queries
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

  const { data: stadium } = useQuery({
    queryKey: ['/api/teams/stadium'],
    enabled: !!team?.id
  });

  // Helper functions
  const getRacialIcon = (race: string) => {
    const icons: Record<string, string> = {
      'Human': '👤', 'Sylvan': '🍃', 'Gryll': '🪨', 'Lumina': '✨', 'Umbra': '🌙'
    };
    return icons[race] || '👤';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      'PASSER': '🎯', 'RUNNER': '⚡', 'BLOCKER': '🛡️'
    };
    return icons[role] || '⚽';
  };

  const getRoleGradient = (role: string) => {
    const gradients: Record<string, string> = {
      'PASSER': 'from-yellow-600 to-yellow-800',
      'RUNNER': 'from-green-600 to-green-800',
      'BLOCKER': 'from-red-600 to-orange-700'
    };
    return gradients[role] || 'from-gray-600 to-gray-800';
  };

  const getPlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.throwing + 
                     player.catching + player.kicking + player.agility) / 6);
  };

  const getStaminaColor = (stamina: number) => {
    if (stamina >= 80) return 'text-green-400';
    if (stamina >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStaffTypeName = (type: string) => {
    const names: Record<string, string> = {
      'HEAD_COACH': 'Head Coach',
      'PASSER_TRAINER': 'Passer Trainer',
      'RUNNER_TRAINER': 'Runner Trainer',
      'BLOCKER_TRAINER': 'Blocker Trainer',
      'RECOVERY_SPECIALIST': 'Recovery Specialist',
      'SCOUT': 'Scout'
    };
    return names[type] || type.replace('_', ' ');
  };

  // Navigation helper functions
  const handleQuickAction = (action: string, view?: RosterView, tab?: TabType) => {
    if (view) {
      setRosterView(view);
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.pushState({}, '', url.toString());
    }
    if (tab) {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
    setIsQuickActionsOpen(false);
  };

  // Quick Actions Sidebar Component
  const QuickActionsSidebar = ({ className = '' }) => (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          Quick Actions
        </h3>
      </div>

      {/* Medical Bay */}
      <Card 
        className="bg-gradient-to-r from-red-700/80 to-red-800/80 border-red-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('medical', 'medical')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-red-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🏥 Medical Bay</h4>
                <p className="text-red-200 text-xs">Injured: {injuredPlayers.length} • Low Stamina: {lowStaminaPlayers.length}</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              {injuredPlayers.length + lowStaminaPlayers.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contract Center */}
      <Card 
        className="bg-gradient-to-r from-blue-700/80 to-blue-800/80 border-blue-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('contracts', 'contracts')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">📄 Contracts</h4>
                <p className="text-blue-200 text-xs">Expiring Soon: {expiringContracts.length}</p>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white text-xs">
              {expiringContracts.length} exp.
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Staff Management */}
      <Card 
        className="bg-gradient-to-r from-orange-700/80 to-orange-800/80 border-orange-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('staff', undefined, 'personnel')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-orange-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">👥 Personnel</h4>
                <p className="text-orange-200 text-xs">Staff: {staff?.length || 0}</p>
              </div>
            </div>
            <Badge className="bg-orange-600 text-white text-xs">
              {staff?.length || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Camaraderie Lab */}
      <Card 
        className="bg-gradient-to-r from-yellow-700/80 to-yellow-800/80 border-yellow-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('camaraderie', undefined, 'camaraderie')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Handshake className="w-6 h-6 text-yellow-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🤝 Camaraderie</h4>
                <p className="text-yellow-200 text-xs">Team Morale</p>
              </div>
            </div>
            <Badge className="bg-yellow-600 text-white text-xs">
              {(team as any)?.teamCamaraderie || team?.camaraderie || 67}/100
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tactics & Lineup */}
      <Card 
        className="bg-gradient-to-r from-green-700/80 to-green-800/80 border-green-500 cursor-pointer hover:scale-105 transition-all duration-200"
        onClick={() => handleQuickAction('tactics', undefined, 'tactics')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-green-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">🎯 Tactics</h4>
                <p className="text-green-200 text-xs">Formation & Lineup</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Filter Reset */}
      {rosterView !== 'all' && (
        <Card 
          className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 border-gray-500 cursor-pointer hover:scale-105 transition-all duration-200"
          onClick={() => handleQuickAction('reset', 'all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm">Show All Players</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // URL parameter handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') as RosterView;
    const tab = urlParams.get('tab') as TabType;
    
    if (view && ['all', 'medical', 'contracts'].includes(view)) {
      setRosterView(view);
    }
    if (tab && ['roster', 'tactics', 'camaraderie', 'stadium', 'personnel'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Mark roster visit for daily tasks
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`rosterVisit_${today}`, 'true');
  }, []);

  // Player calculations
  const activePlayers = players?.filter(p => !p.isOnMarket && !p.isRetired) || [];
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    const posA = a.rosterPosition || 0;
    const posB = b.rosterPosition || 0;
    if (posA === 0 && posB === 0) return 0;
    if (posA === 0) return 1;
    if (posB === 0) return -1;
    return posA - posB;
  });

  const mainRoster = sortedPlayers.slice(0, 12);
  const taxiSquad = sortedPlayers.slice(12, 15);
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus !== 'HEALTHY');
  const lowStaminaPlayers = activePlayers.filter(p => p.dailyStaminaLevel < 50);
  
  // Contract calculations for Quick Actions
  const currentDate = new Date();
  const expiringContracts = activePlayers.filter(p => {
    if (!p.contractStartDate || !p.contractLength) return false;
    const contractStart = new Date(p.contractStartDate);
    const contractEnd = new Date(contractStart);
    contractEnd.setFullYear(contractStart.getFullYear() + p.contractLength);
    const daysToExpiry = Math.ceil((contractEnd.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    return daysToExpiry <= 365; // Expiring within a year
  });

  // Filtered players based on current view
  const getFilteredPlayers = () => {
    switch (rosterView) {
      case 'medical':
        return [...injuredPlayers, ...lowStaminaPlayers];
      case 'contracts':
        return expiringContracts;
      default:
        return activePlayers;
    }
  };

  const filteredPlayers = getFilteredPlayers();
  const filteredMainRoster = filteredPlayers.filter((_, index) => index < 12);
  const filteredTaxiSquad = filteredPlayers.filter((_, index) => index >= 12 && index < 15);
  
  // Role distribution
  const passers = activePlayers.filter(p => p.role === 'PASSER');
  const runners = activePlayers.filter(p => p.role === 'RUNNER');
  const blockers = activePlayers.filter(p => p.role === 'BLOCKER');

  // Handler functions
  const handleStaffNegotiate = (staff: Staff) => {
    setSelectedStaff(staff);
  };

  const handleStaffRelease = (staff: Staff) => {
    setSelectedStaff(staff);
  };

  // Loading state
  if (teamLoading || playersLoading || !team || !players) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="bg-gradient-to-r from-blue-800 to-purple-800 border-2 border-blue-400">
            <CardContent className="p-8">
              <div className="text-white">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-4">LOADING ROSTER HQ</h2>
                <p className="text-blue-200">Gathering player and staff information...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
        <UnifiedTeamHeader 
          team={team} 
          players={activePlayers}
          showCreditsGems={true}
          showLowStaminaWarning={lowStaminaPlayers.length > 0}
          lowStaminaCount={lowStaminaPlayers.length}
        />
        {/* Roster Overview Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Passers */}
          <Card className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-2 border-yellow-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-white">{passers.length}</div>
              <div className="text-yellow-200 text-sm font-semibold">Passers</div>
              <div className="text-xs text-yellow-300 mt-1">(Min: 3 Required)</div>
              {passers.length < 3 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {3 - passers.length} More!
                </Badge>
              )}
              <Progress value={(passers.length / 3) * 100} className="mt-2 h-2 bg-yellow-900" />
            </CardContent>
          </Card>

          {/* Runners */}
          <Card className="bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500">
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
              <Progress value={(runners.length / 4) * 100} className="mt-2 h-2 bg-green-900" />
            </CardContent>
          </Card>

          {/* Blockers */}
          <Card className="bg-gradient-to-br from-red-600 to-orange-700 border-2 border-red-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-white">{blockers.length}</div>
              <div className="text-red-200 text-sm font-semibold">Blockers</div>
              <div className="text-xs text-red-300 mt-1">(Min: 4 Required)</div>
              {blockers.length < 4 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {4 - blockers.length} More!
                </Badge>
              )}
              <Progress value={(blockers.length / 4) * 100} className="mt-2 h-2 bg-red-900" />
            </CardContent>
          </Card>
        </div>

        {/* Five-Tab Navigation - Clean and responsive */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-600">
            <TabsTrigger value="roster" className="text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-2">
              👥 Roster
            </TabsTrigger>
            <TabsTrigger value="tactics" className="text-xs font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white py-2 px-1">
              🎯 Tactics
            </TabsTrigger>
            <TabsTrigger value="camaraderie" className="text-xs font-semibold data-[state=active]:bg-yellow-600 data-[state=active]:text-white py-2 px-1">
              <span className="hidden sm:inline">🤝 Camaraderie</span>
              <span className="sm:hidden">🤝 Team</span>
            </TabsTrigger>
            <TabsTrigger value="stadium" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white py-2 px-1">
              🏟️ Stadium
            </TabsTrigger>
            <TabsTrigger value="personnel" className="text-xs font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white py-2 px-1">
              👔 Staff
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ROSTER WITH QUICK-ACTIONS */}
          <TabsContent value="roster" className="space-y-6 px-2">
            {/* Mobile Quick Actions FAB */}
            <div className="fixed bottom-6 right-6 z-50 md:hidden">
              <Sheet open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
                <SheetTrigger asChild>
                  <Button className="w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 shadow-lg">
                    <Zap className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-t-2 border-blue-400">
                  <QuickActionsSidebar />
                </SheetContent>
              </Sheet>
            </div>

            {/* Current View Indicator */}
            {rosterView !== 'all' && (
              <Card className="bg-gradient-to-r from-purple-700 to-blue-700 border-blue-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-semibold">
                        {rosterView === 'medical' && 'Showing Medical Issues'}
                        {rosterView === 'contracts' && 'Showing Expiring Contracts'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleQuickAction('reset', 'all')}
                      className="text-white border-white hover:bg-white hover:text-purple-900"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two-Column Layout: 70% Roster Content + 30% Quick Actions Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Roster Content (70% on desktop) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Main Roster */}
                <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Users className="w-6 h-6 mr-3 text-blue-400" />
                      👥 MAIN ROSTER ({rosterView === 'all' ? mainRoster.length : filteredMainRoster.length} players)
                      {rosterView !== 'all' && (
                        <Badge className="ml-2 bg-purple-600">Filtered</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {(rosterView === 'all' ? mainRoster : filteredMainRoster).map((player) => (
                        <Card 
                          key={player.id}
                          className={`bg-gradient-to-r ${getRoleGradient(player.role)} border-2 border-white/20 cursor-pointer hover:scale-105 transition-all duration-200`}
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
                            <div className="mb-2 text-xs text-white/80">
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3 text-green-400" />
                                <span>
                                  ₡{player.contractSalary?.toLocaleString() || '0'}/season, {player.contractLength || 0} seasons
                                </span>
                              </div>
                            </div>

                            {/* Health and Stamina */}
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
            </Card>

                {/* Taxi Squad */}
                {((rosterView === 'all' ? taxiSquad : filteredTaxiSquad).length > 0) && (
                  <Card className="bg-gradient-to-r from-purple-800 to-purple-900 border-2 border-purple-400">
                    <CardHeader>
                      <CardTitle className="flex items-center text-white">
                        <Users className="w-6 h-6 mr-3 text-purple-400" />
                        🚌 TAXI SQUAD ({rosterView === 'all' ? taxiSquad.length : filteredTaxiSquad.length}/2)
                        {rosterView !== 'all' && (
                          <Badge className="ml-2 bg-purple-600">Filtered</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(rosterView === 'all' ? taxiSquad : filteredTaxiSquad).map((player) => (
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
                              
                              <div className="p-2 bg-purple-900/50 rounded text-xs">
                                <div className="text-purple-200 mb-1">🚌 Taxi Squad Status</div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Promotion Available:</span>
                                  <span className="text-yellow-300">Days 16-17</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No Results Message */}
                {rosterView !== 'all' && filteredMainRoster.length === 0 && filteredTaxiSquad.length === 0 && (
                  <Card className="bg-gradient-to-r from-gray-700 to-gray-800 border-gray-500">
                    <CardContent className="p-8 text-center">
                      <div className="text-gray-400 mb-4">
                        <Users className="w-12 h-12 mx-auto mb-2" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">No Players Found</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        {rosterView === 'medical' && 'No players currently have medical issues.'}
                        {rosterView === 'contracts' && 'No contracts are expiring soon.'}
                      </p>
                      <Button 
                        onClick={() => handleQuickAction('reset', 'all')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Show All Players
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Quick Actions Sidebar (30% on desktop, hidden on mobile) */}
              <div className="hidden lg:block">
                <div className="sticky top-6">
                  <QuickActionsSidebar />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TACTICS */}
          <TabsContent value="tactics" className="space-y-6 px-2">
            <TapToAssignTactics teamId={team?.id?.toString() || ''} />
          </TabsContent>

          {/* TAB 3: CAMARADERIE */}
          <TabsContent value="camaraderie" className="space-y-6 px-2">
            <CamaraderieManagement teamId={team?.id?.toString() || ''} />
          </TabsContent>

          {/* TAB 4: STADIUM */}
          <TabsContent value="stadium" className="space-y-6 px-2">
            <StadiumFinancialHub team={team} stadium={stadium} />
          </TabsContent>

          {/* TAB 5: PERSONNEL */}
          <TabsContent value="personnel" className="space-y-6 px-2">
            <Card className="bg-gradient-to-r from-orange-800 to-orange-900 border-2 border-orange-400">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <UserCheck className="w-6 h-6 mr-3 text-orange-400" />
                  👔 STAFF
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff && staff.length > 0 ? staff.map((member) => (
                    <Card 
                      key={member.id} 
                      className="bg-gradient-to-br from-orange-700 to-orange-800 border-2 border-orange-500 hover:scale-105 transition-all duration-200 cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm">{member.name}</h3>
                              <Badge className="bg-orange-600 text-white text-xs">
                                {getStaffTypeName(member.type)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-orange-200">Age {member.age}</div>
                          </div>
                        </div>

                        {/* Staff Attributes */}
                        <div className="mb-3 p-2 bg-black/30 rounded space-y-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {member.type === 'HEAD_COACH' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Motivation:</span>
                                  <span className="text-orange-300">{member.motivation || 0}/40</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Development:</span>
                                  <span className="text-orange-300">{member.development || 0}/40</span>
                                </div>
                              </>
                            )}
                            {(member.type === 'PASSER_TRAINER' || member.type === 'RUNNER_TRAINER' || member.type === 'BLOCKER_TRAINER') && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-white/70">Teaching:</span>
                                <span className="text-orange-300">{member.teaching || 0}/40</span>
                              </div>
                            )}
                            {member.type === 'RECOVERY_SPECIALIST' && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-white/70">Physiology:</span>
                                <span className="text-orange-300">{member.physiology || 0}/40</span>
                              </div>
                            )}
                            {member.type === 'SCOUT' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Talent ID:</span>
                                  <span className="text-orange-300">{member.talentIdentification || 0}/40</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Potential:</span>
                                  <span className="text-orange-300">{member.potentialAssessment || 0}/40</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contract Information */}
                        <div className="mb-3 p-2 bg-black/30 rounded">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/70">Contract:</span>
                            <span className="text-orange-300 font-semibold">
                              {(member.level * 1000).toLocaleString()}₡/season, 3 seasons
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs border-orange-400 text-orange-400 hover:bg-orange-600 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Staff Negotiation",
                                description: `Contract negotiation with ${member.name} will be available in the next update.`,
                                variant: "default"
                              });
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
                              toast({
                                title: "Staff Release",
                                description: `Releasing ${member.name} will be available in the next update.`,
                                variant: "default"
                              });
                            }}
                          >
                            Release
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center text-white/70 py-8">
                      <UserPlus className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                      <h3 className="text-xl font-bold text-white mb-2">No Personnel Hired</h3>
                      <p className="text-lg mb-4">Build your coaching team to boost player development</p>
                      <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2">
                        HIRE PERSONNEL
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <PlayerDetailModal
            player={selectedPlayer}
            isOpen={!!selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </div>
    </div>
  );
}