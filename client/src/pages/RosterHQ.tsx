import { useState, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalUI } from "@/hooks/useSeasonalUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import TacticalFormation from "@/components/TacticalFormation";
import StaffManagement from "@/components/StaffManagement";
import { 
  Users, UserPlus, Zap, Heart, DollarSign, Settings,
  Trophy, Shield, Target, AlertTriangle, Plus
} from "lucide-react";

// Enhanced interfaces for Roster HQ
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
}

type TabType = 'roster' | 'tactics' | 'staff' | 'chemistry' | 'contracts' | 'medical';

export default function RosterHQ() {
  const { isAuthenticated } = useAuth();
  const { seasonalState } = useSeasonalUI();
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

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

  const { data: camaraderieSummary } = useQuery({
    queryKey: ['/api/camaraderie/summary'],
    enabled: !!team?.id,
  });

  // Filter players by status
  const activePlayers = players?.filter(p => !p.isOnMarket && !p.isRetired) || [];
  const mainRoster = activePlayers.slice(0, 12);
  const taxiSquad = activePlayers.slice(12);
  const injuredPlayers = activePlayers.filter(p => p.injuryStatus !== 'HEALTHY');

  // Player role distribution
  const passers = activePlayers.filter(p => p.role === 'PASSER');
  const runners = activePlayers.filter(p => p.role === 'RUNNER');
  const blockers = activePlayers.filter(p => p.role === 'BLOCKER');

  const getPlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.agility + 
                     player.throwing + player.catching + player.kicking) / 6);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PASSER': return '🎯';
      case 'RUNNER': return '⚡';
      case 'BLOCKER': return '🛡️';
      default: return '👤';
    }
  };

  const getInjuryStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-400';
      case 'MINOR_INJURY': return 'text-yellow-400';
      case 'MAJOR_INJURY': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Create Your Team</h1>
          <p className="text-gray-300 mb-8">Build your roster and start your journey to glory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Team Overview */}
        <div className="hub-roster-hq rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-hero font-orbitron text-white">{team.name}</h1>
              <p className="text-green-200">Roster Headquarters</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Badge variant="outline" className="text-green-200 border-green-300">
                {activePlayers.length}/15 Players
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid-stats">
            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Team Power</p>
                  <p className="text-xl font-bold text-blue-400">{team.teamPower || 'N/A'}</p>
                </div>
                <Trophy className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Team Chemistry</p>
                  <p className="text-xl font-bold text-teal-400">
                    {(camaraderieSummary as any)?.teamCamaraderie || 'N/A'}
                  </p>
                </div>
                <Heart className="h-5 w-5 text-teal-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Injured</p>
                  <p className="text-xl font-bold text-red-400">{injuredPlayers.length}</p>
                </div>
                <Shield className="h-5 w-5 text-red-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Taxi Squad</p>
                  <p className="text-xl font-bold text-purple-400">{taxiSquad.length}</p>
                </div>
                <Users className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Seasonal Context Alert */}
        {(seasonalState.currentPhase === 'PRE_SEASON' || seasonalState.currentPhase === 'OFF_SEASON') && (
          <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <strong>Roster Changes Available:</strong> You can make roster adjustments during this phase.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
          
          {/* Mobile-Optimized Tab Navigation */}
          <div className="mb-6 overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full bg-gray-800 p-1">
              <TabsTrigger value="roster" className="touch-target flex-1 min-w-[80px]">
                <Users className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Roster</span>
              </TabsTrigger>
              <TabsTrigger value="tactics" className="touch-target flex-1 min-w-[80px]">
                <Target className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tactics</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="touch-target flex-1 min-w-[80px]">
                <UserPlus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
              <TabsTrigger value="chemistry" className="touch-target flex-1 min-w-[80px]">
                <Heart className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Chemistry</span>
              </TabsTrigger>
              <TabsTrigger value="medical" className="touch-target flex-1 min-w-[80px]">
                <Shield className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Medical</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Roster Tab */}
          <TabsContent value="roster" className="space-y-6">
            
            {/* Position Distribution */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-blue-900/30 border-blue-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-lg font-bold text-blue-400">{passers.length}</div>
                  <div className="text-xs text-blue-300">Passers</div>
                  <div className="text-xs text-gray-400">(Min: 3)</div>
                </CardContent>
              </Card>

              <Card className="bg-green-900/30 border-green-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-lg font-bold text-green-400">{runners.length}</div>
                  <div className="text-xs text-green-300">Runners</div>
                  <div className="text-xs text-gray-400">(Min: 4)</div>
                </CardContent>
              </Card>

              <Card className="bg-orange-900/30 border-orange-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">🛡️</div>
                  <div className="text-lg font-bold text-orange-400">{blockers.length}</div>
                  <div className="text-xs text-orange-300">Blockers</div>
                  <div className="text-xs text-gray-400">(Min: 4)</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Roster */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Main Roster ({mainRoster.length}/12)
                </CardTitle>
                <Button size="sm" variant="outline" className="touch-target">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Player
                </Button>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="grid-mobile-cards">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="skeleton-card" />
                    ))}
                  </div>
                ) : (
                  <div className="grid-mobile-cards">
                    {mainRoster.map((player) => (
                      <div key={player.id} className="mobile-card-interactive">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold truncate">
                              {player.firstName} {player.lastName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs role-${player.role.toLowerCase()}`}>
                                {getRoleIcon(player.role)} {player.role}
                              </Badge>
                              <span className="text-sm text-gray-400">Age {player.age}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-400">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-gray-400">Power</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getInjuryStatusColor(player.injuryStatus).replace('text-', 'bg-')}`} />
                            <span className="text-xs text-gray-400">
                              {player.injuryStatus === 'HEALTHY' ? 'Healthy' : 'Injured'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            <span className="text-xs text-yellow-400">
                              {player.dailyStaminaLevel}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Taxi Squad */}
            {taxiSquad.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Taxi Squad ({taxiSquad.length}/3)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid-mobile-cards">
                    {taxiSquad.map((player) => (
                      <div key={player.id} className="mobile-card-interactive opacity-75">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold truncate">
                              {player.firstName} {player.lastName}
                            </h3>
                            <Badge variant="outline" className={`text-xs role-${player.role.toLowerCase()} mt-1`}>
                              {getRoleIcon(player.role)} {player.role}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-400">
                              {getPlayerPower(player)}
                            </div>
                            <div className="text-xs text-gray-400">Power</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tactics Tab */}
          <TabsContent value="tactics" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Team Formation & Tactics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TacticalFormation 
                  players={activePlayers || []}
                  onFormationChange={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <StaffManagement teamId={team?.id || ''} />
          </TabsContent>

          {/* Chemistry Tab */}
          <TabsContent value="chemistry" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Team Chemistry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-teal-400 mb-2">
                      {(camaraderieSummary as any)?.teamCamaraderie || 'N/A'}
                    </div>
                    <p className="text-gray-400">Overall Team Chemistry</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="mobile-card-compact text-center">
                      <div className="text-lg font-bold text-green-400">
                        {(camaraderieSummary as any)?.playersWithHighMorale || 0}
                      </div>
                      <p className="text-xs text-gray-400">High Morale</p>
                    </div>
                    <div className="mobile-card-compact text-center">
                      <div className="text-lg font-bold text-red-400">
                        {(camaraderieSummary as any)?.playersWithLowMorale || 0}
                      </div>
                      <p className="text-xs text-gray-400">Low Morale</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Medical Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {injuredPlayers.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-green-400 font-semibold">All Players Healthy!</p>
                      <p className="text-gray-400 text-sm">No medical attention needed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {injuredPlayers.map((player) => (
                        <div key={player.id} className="mobile-card-interactive">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {player.firstName} {player.lastName}
                              </h3>
                              <p className="text-sm text-gray-400">{player.role}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="destructive" className="text-xs">
                                {player.injuryStatus.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}