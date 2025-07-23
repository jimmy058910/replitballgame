import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Zap, 
  Heart, 
  TrendingUp, 
  DollarSign, 
  UserCheck,
  ChevronUp, 
  ChevronDown,
  UserPlus,
  Settings,
  Shield,
  Trophy,
  Building
} from 'lucide-react';
import UnifiedTeamHeader from './UnifiedTeamHeader';
import PlayerDetailModal from './PlayerDetailModal';
import CamaraderieManagement from './CamaraderieManagement';
import StadiumFinancialHub from './StadiumFinancialHub';
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
};

type Staff = {
  id: string;
  name: string;
  type: string;
  age: number;
  level: number;
};

type Team = {
  id: string;
  name: string;
  credits: number;
  gems: number;
};

type Stadium = {
  id: string;
  name: string;
  capacity: number;
  level: number;
};

type TabType = 'roster' | 'tactics' | 'camaraderie' | 'stadium' | 'personnel';

export default function MobileRosterHQ() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

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
      'PASSER': 'from-blue-600 to-blue-800',
      'RUNNER': 'from-green-600 to-green-800',
      'BLOCKER': 'from-purple-600 to-purple-800'
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
                <div className="text-6xl mb-4">⚽</div>
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
      <UnifiedTeamHeader 
        team={team} 
        showCreditsGems={true}
        showLowStaminaWarning={lowStaminaPlayers.length > 0}
        lowStaminaCount={lowStaminaPlayers.length}
      />
      
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Roster Overview Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Passers */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500">
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
              <Progress value={(passers.length / 3) * 100} className="mt-2 h-2 bg-blue-900" />
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
          <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-500">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-white">{blockers.length}</div>
              <div className="text-purple-200 text-sm font-semibold">Blockers</div>
              <div className="text-xs text-purple-300 mt-1">(Min: 4 Required)</div>
              {blockers.length < 4 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs {4 - blockers.length} More!
                </Badge>
              )}
              <Progress value={(blockers.length / 4) * 100} className="mt-2 h-2 bg-purple-900" />
            </CardContent>
          </Card>
        </div>

        {/* Five-Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-600">
            <TabsTrigger value="roster" className="text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              👥 Roster
            </TabsTrigger>
            <TabsTrigger value="tactics" className="text-xs font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white">
              ⚙️ Tactics
            </TabsTrigger>
            <TabsTrigger value="camaraderie" className="text-xs font-semibold data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
              🤝 Camaraderie
            </TabsTrigger>
            <TabsTrigger value="stadium" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              🏟️ Stadium
            </TabsTrigger>
            <TabsTrigger value="personnel" className="text-xs font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              👔 Staff
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ROSTER */}
          <TabsContent value="roster" className="space-y-6 px-2">
            {/* Main Roster */}
            <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Users className="w-6 h-6 mr-3 text-blue-400" />
                  👥 MAIN ROSTER ({mainRoster.length} players)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mainRoster.map((player) => (
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
            {taxiSquad.length > 0 && (
              <Card className="bg-gradient-to-r from-purple-800 to-purple-900 border-2 border-purple-400">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Users className="w-6 h-6 mr-3 text-purple-400" />
                    🚌 TAXI SQUAD ({taxiSquad.length}/2)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {taxiSquad.map((player) => (
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
          </TabsContent>

          {/* TAB 2: TACTICS */}
          <TabsContent value="tactics" className="space-y-6 px-2">
            {/* Starting Lineup */}
            <Card className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-400">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Settings className="w-6 h-6 mr-3 text-green-400" />
                  ⚙️ STARTING LINEUP (6 Required)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Blocker Slots */}
                  <div className="bg-purple-900/50 p-4 rounded-lg border-2 border-purple-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-purple-600">🛡️ B1 (Blocker)</Badge>
                    </div>
                    <div className="h-16 bg-purple-800/30 rounded border-2 border-dashed border-purple-400 flex items-center justify-center text-purple-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>
                  
                  <div className="bg-purple-900/50 p-4 rounded-lg border-2 border-purple-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-purple-600">🛡️ B2 (Blocker)</Badge>
                    </div>
                    <div className="h-16 bg-purple-800/30 rounded border-2 border-dashed border-purple-400 flex items-center justify-center text-purple-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>

                  {/* Runner Slots */}
                  <div className="bg-green-900/50 p-4 rounded-lg border-2 border-green-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-green-600">⚡ R1 (Runner)</Badge>
                    </div>
                    <div className="h-16 bg-green-800/30 rounded border-2 border-dashed border-green-400 flex items-center justify-center text-green-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>
                  
                  <div className="bg-green-900/50 p-4 rounded-lg border-2 border-green-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-green-600">⚡ R2 (Runner)</Badge>
                    </div>
                    <div className="h-16 bg-green-800/30 rounded border-2 border-dashed border-green-400 flex items-center justify-center text-green-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>

                  {/* Passer Slot */}
                  <div className="bg-blue-900/50 p-4 rounded-lg border-2 border-blue-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-blue-600">🎯 P (Passer)</Badge>
                    </div>
                    <div className="h-16 bg-blue-800/30 rounded border-2 border-dashed border-blue-400 flex items-center justify-center text-blue-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>

                  {/* Flex Slot */}
                  <div className="bg-yellow-900/50 p-4 rounded-lg border-2 border-yellow-400">
                    <div className="text-center mb-2">
                      <Badge className="bg-yellow-600">🌟 FLEX (Any)</Badge>
                    </div>
                    <div className="h-16 bg-yellow-800/30 rounded border-2 border-dashed border-yellow-400 flex items-center justify-center text-yellow-300 text-sm">
                      Drop Player Here
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Substitution Queues */}
            <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Users className="w-6 h-6 mr-3 text-blue-400" />
                  🔄 SUBSTITUTION QUEUES (3 each)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Blocker Subs */}
                  <div className="bg-purple-900/30 p-4 rounded-lg">
                    <h4 className="font-bold text-purple-200 mb-3 text-center">🛡️ Blocker Subs</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((num) => (
                        <div key={`blocker-${num}`} className="h-12 bg-purple-800/20 rounded border border-dashed border-purple-400 flex items-center justify-center text-purple-300 text-xs">
                          Sub #{num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Runner Subs */}
                  <div className="bg-green-900/30 p-4 rounded-lg">
                    <h4 className="font-bold text-green-200 mb-3 text-center">⚡ Runner Subs</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((num) => (
                        <div key={`runner-${num}`} className="h-12 bg-green-800/20 rounded border border-dashed border-green-400 flex items-center justify-center text-green-300 text-xs">
                          Sub #{num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passer Subs */}
                  <div className="bg-blue-900/30 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-200 mb-3 text-center">🎯 Passer Subs</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((num) => (
                        <div key={`passer-${num}`} className="h-12 bg-blue-800/20 rounded border border-dashed border-blue-400 flex items-center justify-center text-blue-300 text-xs">
                          Sub #{num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flex Subs */}
                  <div className="bg-yellow-900/30 p-4 rounded-lg">
                    <h4 className="font-bold text-yellow-200 mb-3 text-center">🌟 Flex Subs</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((num) => (
                        <div key={`flex-${num}`} className="h-12 bg-yellow-800/20 rounded border border-dashed border-yellow-400 flex items-center justify-center text-yellow-300 text-xs">
                          Sub #{num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Players */}
            <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-400">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Users className="w-6 h-6 mr-3 text-gray-400" />
                  👥 AVAILABLE PLAYERS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mainRoster.map((player) => (
                    <div 
                      key={player.id}
                      className={`bg-gradient-to-r ${getRoleGradient(player.role)} p-3 rounded-lg border border-white/20 cursor-move hover:scale-105 transition-all duration-200`}
                      draggable="true"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getRacialIcon(player.race || 'Human')}</span>
                          <div>
                            <div className="text-white text-sm font-semibold">
                              {player.firstName} {player.lastName}
                            </div>
                            <Badge variant="outline" className="text-xs text-white border-white/50">
                              {getRoleIcon(player.role)} {player.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-white font-bold text-sm">
                          {getPlayerPower(player)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="sticky bottom-4 bg-green-800/90 backdrop-blur-sm p-4 rounded-lg border-2 border-green-400">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                disabled={true}
              >
                💾 SAVE LINEUP (0/6 starters assigned)
              </Button>
              <p className="text-green-200 text-sm text-center mt-2">
                Drag players to starting positions and substitution queues to enable save
              </p>
            </div>
          </TabsContent>

          {/* TAB 3: CAMARADERIE */}
          <TabsContent value="camaraderie" className="space-y-6 px-2">
            <CamaraderieManagement team={team} players={activePlayers} />
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
                              ₡{(member.level * 1000).toLocaleString()}/season, 3 seasons left
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
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          team={team}
        />
      )}
    </div>
  );
}