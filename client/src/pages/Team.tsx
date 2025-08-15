import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query"; // useMutation is not used, can be removed if not planned
import { queryClient } from "@/lib/queryClient";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import TacticalManager from "@/components/TacticalManager";
import PlayerDetailModal from "@/components/PlayerDetailModal";
import ContractNegotiation from "@/components/ContractNegotiation";
import StaffManagement from "@/components/StaffManagement";
import TeamFinances from "@/components/TeamFinances";
import { TaxiSquadManager } from "@/components/TaxiSquadManager";
import { InjuryStaminaManager } from "@/components/InjuryStaminaManager";
import UnifiedTeamChemistry from "@/components/UnifiedTeamChemistry";
import Inventory from "@/pages/Inventory";
import AdvancedTacticalEffectsManager from "@/components/AdvancedTacticalEffectsManager";
import UnifiedInventoryHub from "@/components/UnifiedInventoryHub";
import TacticsLineupHub from "@/components/TacticsLineupHub";
import TryoutSystem from "@/components/TryoutSystem";
import StadiumAtmosphereManager from "@/components/StadiumAtmosphereManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { HelpIcon } from "@/components/help";

// Performance-optimized components
import { VirtualizedPlayerRoster } from "@/components/VirtualizedPlayerRoster";
import { useOptimizedQuery, useTeamQuery, usePlayersQuery, useInvalidateQueries } from "@/hooks/useOptimizedQuery";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  division: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  teamPower: number;
  teamCamaraderie: number;
  credits: number;
  players?: Player[];
  finances?: {
    credits: string;
    gems: string;
  };
}

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
}

interface Formation {
  [key: string]: any;
}

// Helper function to determine player role based on attributes
import { getPlayerRole as centralizedGetPlayerRole } from "../../../shared/playerUtils";

function getPlayerRole(player: any): string {
  return centralizedGetPlayerRole(player);
}

export default function TeamPage() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  // @ts-expect-error TS2304
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithRole | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [activeTab, setActiveTab] = useState("roster");
  const [rosterSubTab, setRosterSubTab] = useState("players");
  const [staffSubTab, setStaffSubTab] = useState("current");
  const [tacticsSubTab, setTacticsSubTab] = useState("lineup");
  const [financesSubTab, setFinancesSubTab] = useState("overview");
  const [inventoryFilter, setInventoryFilter] = useState("equipment");
  const [stadiumSubTab, setStadiumSubTab] = useState("overview");

  // Optimized queries with caching
  const { data: team, isLoading: isLoadingTeam } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    // @ts-expect-error TS2769
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use players data from team query instead of separate API call
  const players: Player[] = team?.players || [];
  const playersLoading = isLoadingTeam;
  const playersError = null;
  
  const { invalidateTeamData, invalidatePlayerData } = useInvalidateQueries();

  const { data: formation } = useQuery<Formation>({
    queryKey: [`/api/teams/${team?.id}/formation`],
    // @ts-expect-error TS2339
    enabled: !!team?.id,
  });

  // Add roles to players and filter - use database role field directly
  // @ts-expect-error TS2339
  const playersWithRoles = players?.map((player: any) => ({
    ...player,
    role: player.role || getPlayerRole(player) // Prefer database role over calculated
  })) || [];

  const filteredPlayers = playersWithRoles.filter((player: any) => 
    selectedRole === "all" || player.role?.toLowerCase() === selectedRole
  );

  const roleStats = playersWithRoles.reduce((acc: any, player: any) => {
    const roleLowercase = player.role?.toLowerCase() || 'unknown';
    acc[roleLowercase] = (acc[roleLowercase] || 0) + 1;
    return acc;
  }, {});

  if (isLoadingTeam) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-orbitron text-3xl font-bold mb-6">No Team Found</h1>
          <p className="text-gray-300 mb-8">Please create a team first.</p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Function to adapt PlayerWithRole to DetailedPlayer
  // @ts-expect-error TS2304
  const adaptPlayerForDetailModal = (player: PlayerWithRole | null): DetailedPlayer | null => {
    if (!player) return null;
    return {
      ...player,
      speed: Number(player.speed),
      power: Number(player.power),
      throwing: Number(player.throwing),
      catching: Number(player.catching),
      kicking: Number(player.kicking),
      stamina: Number(player.staminaAttribute),
      leadership: Number(player.leadership),
      agility: Number(player.agility),
      salary: Number(player.contract?.salary || 0),
      contractSeasons: player.contractSeasons ?? 0, // Default if null
      contractStartSeason: player.contractStartSeason ?? 0, // Default if null
      contractValue: Number(player.contractValue),
      camaraderie: player.camaraderie ?? 50,
      // Ensure potential fields are string | null
      speedPotential: player.speedPotential?.toString() ?? null,
      powerPotential: player.powerPotential?.toString() ?? null,
      throwingPotential: player.throwingPotential?.toString() ?? null,
      catchingPotential: player.catchingPotential?.toString() ?? null,
      kickingPotential: player.kickingPotential?.toString() ?? null,
      staminaPotential: player.staminaPotential?.toString() ?? null,
      leadershipPotential: player.leadershipPotential?.toString() ?? null,
      agilityPotential: player.agilityPotential?.toString() ?? null,
      // helmetItem, chestItem etc. are not part of SharedPlayer, they are added in PlayerDetailModal
    };
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            {/*
             // @ts-expect-error TS2339 */}
            <h1 className="font-orbitron text-3xl font-bold">{team.name}</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setActiveTab("roster");
                  setRosterSubTab("recruiting");
                }}
                className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white text-xs px-3 py-1.5"
              >
                <i className="fas fa-plus mr-1"></i>Recruit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab("tactics")}
                className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white text-xs px-3 py-1.5"
              >
                <i className="fas fa-cog mr-1"></i>Tactics
              </Button>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs - Consolidated 6-Tab Structure */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800 gap-0.5">
            <TabsTrigger value="roster" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Roster
              <HelpIcon content="Central hub for all player management. View roster, manage health and injuries in Medical Center, and recruit new players." />
            </TabsTrigger>
            <TabsTrigger value="staff" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Staff
              <HelpIcon content="Manage your coaching staff. View current staff and hire new specialists to improve team performance." />
            </TabsTrigger>
            <TabsTrigger value="tactics" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Tactics
              <HelpIcon content="Set your team's strategic approach. Configure game plan and analyze tactical effectiveness." />
            </TabsTrigger>
            <TabsTrigger value="finances" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Finances
              <HelpIcon content="Consolidated financial management. Track income, expenses, and manage all player contracts." />
            </TabsTrigger>
            <TabsTrigger value="inventory" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Inventory
              <HelpIcon content="View and manage all owned items. Equipment, consumables, and trophy collection." />
            </TabsTrigger>
            <TabsTrigger value="stadium" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Stadium
              <HelpIcon content="Manage stadium facilities, track fan loyalty, and optimize revenue from home games." />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            {/* Roster Sub-tabs: Players, Medical Center, and Recruiting */}
            <Tabs value={rosterSubTab} onValueChange={setRosterSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="medical">Medical Center</TabsTrigger>
                <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
              </TabsList>

              <TabsContent value="players">
                {/* Use regular player cards with dashboard variant like on dashboard */}
                <div className="mt-6 space-y-4">
                  {/* Role Filter Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['all', 'passer', 'runner', 'blocker', 'taxi-squad'].map((role) => (
                      <Button
                        key={role}
                        variant={selectedRole === role ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedRole(role)}
                        className="text-xs"
                      >
                        {role === 'all' ? 'All Players' : 
                         role === 'taxi-squad' ? 'Taxi Squad' : 
                         role.charAt(0).toUpperCase() + role.slice(1) + 's'}
                        {role === 'all' && ` (${playersWithRoles.length})`}
                      </Button>
                    ))}
                  </div>
                  
                  {playersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : playersError ? (
                    <div className="text-center py-8">
                      <p className="text-red-400">Error loading players: {(playersError as Error).message}</p>
                    </div>
                  ) : !playersWithRoles || playersWithRoles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No players found</p>
                      <p className="text-sm text-gray-500">Visit the recruiting tab to add players</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playersWithRoles
                        // @ts-expect-error TS7006
                        .filter(player => {
                          if (selectedRole === 'all') return true;
                          if (selectedRole === 'taxi-squad') return (player.rosterPosition || 0) >= 13;
                          return player.role?.toLowerCase() === selectedRole;
                        })
                        .map((player: any) => (
                          <div 
                            key={player.id}
                            onClick={() => {
                              setSelectedPlayer(player);
                              setShowPlayerModal(true);
                            }}
                            className="cursor-pointer"
                          >
                            <UnifiedPlayerCard
                              player={player}
                              variant="dashboard"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="medical">
                {/*
                 // @ts-expect-error TS2339 */}
                <InjuryStaminaManager teamId={team?.id?.toString() || ''} />
              </TabsContent>

              <TabsContent value="recruiting">
                <TryoutSystem 
                  // @ts-expect-error TS2339
                  teamId={team?.id || ''} 
                  onNavigateToTaxiSquad={() => {
                    setRosterSubTab("players");
                    setSelectedRole("taxi-squad");
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="staff">
            {/* Staff Sub-tabs: Current Staff, Hire New Staff, and Team Chemistry */}
            <Tabs value={staffSubTab} onValueChange={setStaffSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="current">Current Staff</TabsTrigger>
                <TabsTrigger value="hire">Hire New Staff</TabsTrigger>
                <TabsTrigger value="camaraderie">Team Chemistry</TabsTrigger>
              </TabsList>

              <TabsContent value="current">
                {/*
                 // @ts-expect-error TS2339 */}
                <StaffManagement teamId={team?.id} />
              </TabsContent>

              <TabsContent value="hire">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle>Hire New Staff</CardTitle>
                    <p className="text-gray-400">Find and recruit new coaching staff to improve your team performance</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-center py-8">
                      Staff hiring system coming soon. Current staff can be viewed in the Current Staff tab.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="camaraderie">
                {/*
                 // @ts-expect-error TS2339 */}
                <UnifiedTeamChemistry teamId={team?.id || ''} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tactics">
            {/* Tactics Sub-tabs: Game Plan and Effectiveness */}
            <Tabs value={tacticsSubTab} onValueChange={setTacticsSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="lineup">Lineup & Formation</TabsTrigger>
                <TabsTrigger value="strategy">Strategy & Tactics</TabsTrigger>
              </TabsList>

              <TabsContent value="lineup">
                {/*
                 // @ts-expect-error TS2339 */}
                <TacticsLineupHub teamId={team?.id || ''} />
              </TabsContent>

              <TabsContent value="strategy">
                <TacticalManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="finances">
            {/* Finances Sub-tabs: Overview and Contracts */}
            <Tabs value={financesSubTab} onValueChange={setFinancesSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/*
                 // @ts-expect-error TS2339 */}
                <TeamFinances teamId={team?.id} />
              </TabsContent>

              <TabsContent value="contracts">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle>Active Contracts</CardTitle>
                    <p className="text-gray-400">Manage player contracts and negotiations</p>
                    {playersWithRoles && playersWithRoles.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-400">Total Season Salary</p>
                        <p className="text-2xl font-bold text-green-400">
                          {/*
                           // @ts-expect-error TS7006 */}
                          ₡{playersWithRoles.reduce((total, player) => total + (player.contract?.salary || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {playersWithRoles && playersWithRoles.length > 0 ? (
                      <div className="space-y-4">
                        {/*
                         // @ts-expect-error TS7006 */}
                        {playersWithRoles.map((player) => {
                          const role = player.role || getPlayerRole(player); // Use database role first
                          const getRoleStyle = (role: string) => {
                            switch (role.toLowerCase()) {
                              case "passer":
                                return "bg-yellow-500 text-black";
                              case "runner":
                                return "bg-green-500 text-white";
                              case "blocker":
                                return "bg-red-500 text-white";
                              default:
                                return "bg-gray-500 text-white";
                            }
                          };
                          
                          return (
                            <div key={player.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                              <div className="flex-1">
                                <h3 className="font-semibold">{player.firstName} {player.lastName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRoleStyle(role)}`}>
                                    {role}
                                  </span>
                                  <span className="text-sm text-gray-400">
                                    {player.race ? player.race.charAt(0).toUpperCase() + player.race.slice(1).toLowerCase() : 'Unknown'}
                                  </span>
                                  <span className="text-sm text-gray-400">•</span>
                                  <span className="text-sm text-gray-400">Age {player.age}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-400">
                                  ₡{(Number(player.contract?.salary) || 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {(player.contract?.length || 1)} seasons remaining
                                </p>
                              </div>
                              <div className="ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to Roster tab and open player detail modal
                                    setActiveTab("roster");
                                    setRosterSubTab("players");
                                    setSelectedPlayer(player);
                                    setShowPlayerModal(true);
                                  }}
                                  className="text-xs"
                                >
                                  Negotiate
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No active player contracts.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="inventory">
            {/*
             // @ts-expect-error TS2339 */}
            <UnifiedInventoryHub teamId={team?.id || ''} />
          </TabsContent>

          <TabsContent value="stadium">
            {/*
             // @ts-expect-error TS2339 */}
            <StadiumAtmosphereManager teamId={team?.id || ''} />
          </TabsContent>



        {/* Player Detail Modal */}
        <PlayerDetailModal
          player={adaptPlayerForDetailModal(selectedPlayer)}
          isOpen={showPlayerModal}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayer(null);
          }}
          onContractNegotiate={(playerId) => { // playerId is string
            setShowPlayerModal(false);
            // @ts-expect-error TS7006
            const playerToNegotiate = playersWithRoles.find(p => p.id === playerId);
            if (playerToNegotiate) {
              setSelectedPlayer(playerToNegotiate);
              setShowContractModal(true);
            }
          }}
          onEquipmentChange={(playerId, slot, itemId) => {
            setShowPlayerModal(false);
            setActiveTab("inventory");
            // Focus on equipment filter in inventory
            setTimeout(() => {
              const inventoryHub = document.querySelector('[data-testid="inventory-hub"]');
              if (inventoryHub) {
                inventoryHub.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }}
        />

        {/* Contract Negotiation Modal */}
        <ContractNegotiation
          player={selectedPlayer ? { // Pass only needed subset for PlayerForContract
            id: selectedPlayer.id,
            firstName: selectedPlayer.firstName,
            lastName: selectedPlayer.lastName,
            race: selectedPlayer.race,
            age: selectedPlayer.age, // age is number | string in PlayerWithRole, ContractNegotiation expects string | number
            salary: selectedPlayer.salary, // salary is number in PlayerWithRole, ContractNegotiation expects number
          } : null}
          isOpen={showContractModal}
          onClose={() => {
            setShowContractModal(false);
            setSelectedPlayer(null);
          }}
        />
        </Tabs>
      </div>
    </div>
  );
}
