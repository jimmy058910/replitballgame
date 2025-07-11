import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import UnifiedPlayerCard from "@/components/UnifiedPlayerCard";
import TacticalManager from "@/components/TacticalManager";
import PlayerDetailModal from "@/components/PlayerDetailModal";
import ContractNegotiation from "@/components/ContractNegotiation";
import StaffManagement from "@/components/StaffManagement";
import TeamFinances from "@/components/TeamFinances";
import { TaxiSquadManager } from "@/components/TaxiSquadManager";
import { InjuryStaminaManager } from "@/components/InjuryStaminaManager";
import CamaraderieManagement from "@/components/CamaraderieManagement";
import Inventory from "@/pages/Inventory";
import AdvancedTacticalEffectsManager from "@/components/AdvancedTacticalEffectsManager";
import UnifiedInventoryHub from "@/components/UnifiedInventoryHub";
import TacticsLineupHub from "@/components/TacticsLineupHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { HelpIcon } from "@/components/help";

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

export default function Team() {
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [activeTab, setActiveTab] = useState("roster");
  const [rosterSubTab, setRosterSubTab] = useState("players");
  const [staffSubTab, setStaffSubTab] = useState("current");
  const [tacticsSubTab, setTacticsSubTab] = useState("gameplan");
  const [financesSubTab, setFinancesSubTab] = useState("overview");
  const [inventoryFilter, setInventoryFilter] = useState("equipment");

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  const { data: formation } = useQuery<Formation>({
    queryKey: [`/api/teams/${team?.id}/formation`],
    enabled: !!team?.id,
  });

  // Add roles to players and filter - use database role field directly
  const playersWithRoles = players?.map((player: any) => ({
    ...player,
    role: player.role || getPlayerRole(player) // Prefer database role over calculated
  })) || [];

  const filteredPlayers = playersWithRoles.filter((player: any) => 
    selectedRole === "all" || player.role.toLowerCase() === selectedRole
  );

  const roleStats = playersWithRoles.reduce((acc: any, player: any) => {
    const roleLowercase = player.role.toLowerCase();
    acc[roleLowercase] = (acc[roleLowercase] || 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-orbitron text-3xl font-bold">{team.name}</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab("recruiting")}
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

        {/* Main Navigation Tabs - Consolidated 5-Tab Structure */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800 gap-0.5">
            <TabsTrigger value="roster" className="border-r border-gray-600 last:border-r-0 flex items-center gap-1">
              Roster
              <HelpIcon content="Central hub for all player management. View roster, manage health and injuries in Medical Center." />
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
          </TabsList>

          <TabsContent value="roster">
            {/* Roster Sub-tabs: Players and Medical Center */}
            <Tabs value={rosterSubTab} onValueChange={setRosterSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="medical">Medical Center</TabsTrigger>
              </TabsList>

              <TabsContent value="players">
                {/* Role Filter Sub-tabs */}
                <Tabs value={selectedRole} onValueChange={setSelectedRole} className="mb-6">
                  <TabsList className="grid w-full grid-cols-5 bg-gray-800">
                    <TabsTrigger value="all">All Players ({playersWithRoles.length})</TabsTrigger>
                    <TabsTrigger value="passer">Passers ({roleStats.passer || 0})</TabsTrigger>
                    <TabsTrigger value="runner">Runners ({roleStats.runner || 0})</TabsTrigger>
                    <TabsTrigger value="blocker">Blockers ({roleStats.blocker || 0})</TabsTrigger>
                    <TabsTrigger value="taxi-squad">Taxi Squad</TabsTrigger>
                  </TabsList>
                </Tabs>

            {/* Team Summary */}
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle>Team Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-400">{roleStats.passer || 0}</div>
                    <div className="text-sm text-gray-400">Passers</div>
                    <div className="text-xs text-gray-500">Leadership & Throwing</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{roleStats.runner || 0}</div>
                    <div className="text-sm text-gray-400">Runners</div>
                    <div className="text-xs text-gray-500">Speed & Agility</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-400">{roleStats.blocker || 0}</div>
                    <div className="text-sm text-gray-400">Blockers</div>
                    <div className="text-xs text-gray-500">Power & Stamina</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conditional Content Based on Selected Role */}
            {selectedRole === 'taxi-squad' ? (
              <TaxiSquadManager 
                teamId={team?.id} 
                onNavigateToRecruiting={() => setActiveTab('recruiting')}
              />
            ) : (
              /* Player Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {playersLoading ? (
                  Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-700 rounded mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: 4 }, (_, j) => (
                          <div key={j} className="h-3 bg-gray-700 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  filteredPlayers.map((player: any) => (
                    <UnifiedPlayerCard 
                      key={player.id}
                      player={player} 
                      variant="roster"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setShowPlayerModal(true);
                      }}
                    />
                  ))
                )}
              </div>
            )}

                {filteredPlayers.length === 0 && !playersLoading && (
                  <div className="text-center py-16">
                    <i className="fas fa-users text-6xl text-gray-600 mb-4"></i>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No players found
                    </h3>
                    <p className="text-gray-500">
                      {selectedRole === "all" 
                        ? "Your team has no players yet." 
                        : `No ${selectedRole} players in your team.`
                      }
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="medical">
                <InjuryStaminaManager teamId={team?.id} />
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
                <CamaraderieManagement teamId={team?.id || ''} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tactics">
            <TacticsLineupHub teamId={team?.id || ''} />
          </TabsContent>

          <TabsContent value="finances">
            {/* Finances Sub-tabs: Overview and Contracts */}
            <Tabs value={financesSubTab} onValueChange={setFinancesSubTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
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
                          ₡{playersWithRoles.reduce((total, player) => total + (player.contract?.salary || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {playersWithRoles && playersWithRoles.length > 0 ? (
                      <div className="space-y-4">
                        {playersWithRoles.map((player) => {
                          const role = getPlayerRole(player);
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
                                  ₡{(player.contract?.salary || 0).toLocaleString()}
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
            <UnifiedInventoryHub teamId={team?.id || ''} />
          </TabsContent>

        {/* Player Detail Modal */}
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={showPlayerModal}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayer(null);
          }}
          onContractNegotiate={(playerId) => {
            setShowPlayerModal(false);
            setShowContractModal(true);
          }}
        />

        {/* Contract Negotiation Modal */}
        <ContractNegotiation
          player={selectedPlayer}
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
