import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query"; // useMutation is not used, can be removed if not planned
import { queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import PlayerCard from "@/components/PlayerCard";
import TextTacticalManager from "@/components/TextTacticalManager";
import PlayerDetailModal from "@/components/PlayerDetailModal";
import ContractNegotiation from "@/components/ContractNegotiation";
import StaffManagement from "@/components/StaffManagement";
import TeamFinances from "@/components/TeamFinances";
import TryoutSystem from "@/components/TryoutSystem";
import { TaxiSquadManager } from "@/components/TaxiSquadManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { Team as SharedTeam, Player as SharedPlayer } from "shared/schema";
import { DetailedPlayer } from "@/components/PlayerDetailModal"; // Changed to regular import

// Define Player with Role
interface PlayerWithRole extends SharedPlayer {
  role: string;
}

type FormationData = any; // Keep as any for now, or define specific structure if known

// Helper function to determine player role based on attributes
function getPlayerRole(player: SharedPlayer): string {
  const { speed, agility, catching, throwing, power, leadership, stamina } = player;
  
  const numSpeed = Number(speed) || 0;
  const numAgility = Number(agility) || 0;
  // catching, throwing, power, leadership, stamina are already numbers in SharedPlayer
  const numThrowing = Number(throwing) || 0;
  const numPower = Number(power) || 0;
  const numLeadership = Number(leadership) || 0;
  const numStamina = Number(stamina) || 0;

  const passerScore = (numThrowing * 2) + (numLeadership * 1.5);
  const runnerScore = (numSpeed * 2) + (numAgility * 1.5);
  const blockerScore = (numPower * 2) + (numStamina * 1.5);
  
  const maxScore = Math.max(passerScore, runnerScore, blockerScore);
  
  if (maxScore === passerScore) return "passer";
  if (maxScore === runnerScore) return "runner";
  return "blocker";
}

export default function TeamPage() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithRole | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [activeTab, setActiveTab] = useState("roster");

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<SharedTeam> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as SharedTeam | undefined;
  const isLoadingTeam = teamQuery.isLoading;

  const playersQuery = useQuery({
    queryKey: ["teamPlayers", team?.id],
    queryFn: (): Promise<SharedPlayer[]> => apiRequest(`/api/teams/${team!.id}/players`),
    enabled: !!team?.id,
  });
  const players = playersQuery.data as SharedPlayer[] | undefined;
  const playersLoading = playersQuery.isLoading;

  const formationQuery = useQuery({
    queryKey: ["teamFormation", team?.id],
    queryFn: (): Promise<FormationData> => apiRequest(`/api/teams/${team!.id}/formation`),
    enabled: !!team?.id,
  });
  const formation = formationQuery.data as FormationData | undefined;

  const playersWithRoles: PlayerWithRole[] = players?.map((player: SharedPlayer) => ({
    ...player,
    role: getPlayerRole(player)
  })) || [];

  const filteredPlayers: PlayerWithRole[] = playersWithRoles.filter((player: PlayerWithRole) =>
    selectedRole === "all" || player.role === selectedRole
  );

  const roleStats: Record<string, number> = playersWithRoles.reduce((acc: Record<string, number>, player: PlayerWithRole) => {
    acc[player.role] = (acc[player.role] || 0) + 1;
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
        <Navigation />
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
  const adaptPlayerForDetailModal = (player: PlayerWithRole | null): DetailedPlayer | null => {
    if (!player) return null;
    return {
      ...player,
      speed: Number(player.speed),
      power: Number(player.power),
      throwing: Number(player.throwing),
      catching: Number(player.catching),
      kicking: Number(player.kicking),
      stamina: Number(player.stamina),
      leadership: Number(player.leadership),
      agility: Number(player.agility),
      salary: Number(player.salary),
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
      <Navigation />
      
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800 gap-0.5">
            <TabsTrigger value="roster" className="border-r border-gray-600 last:border-r-0">Roster</TabsTrigger>
            <TabsTrigger value="tactics" className="border-r border-gray-600 last:border-r-0">Tactics</TabsTrigger>
            <TabsTrigger value="staff" className="border-r border-gray-600 last:border-r-0">Staff</TabsTrigger>
            <TabsTrigger value="finances" className="border-r border-gray-600 last:border-r-0">Finances</TabsTrigger>
            <TabsTrigger value="contracts" className="border-r border-gray-600 last:border-r-0">Contracts</TabsTrigger>
            <TabsTrigger value="recruiting" className="border-r border-gray-600 last:border-r-0">Recruiting</TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            <Tabs value={selectedRole} onValueChange={setSelectedRole} className="mb-6">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800">
                <TabsTrigger value="all">All Players ({playersWithRoles.length})</TabsTrigger>
                <TabsTrigger value="passer">Passers ({roleStats.passer || 0})</TabsTrigger>
                <TabsTrigger value="runner">Runners ({roleStats.runner || 0})</TabsTrigger>
                <TabsTrigger value="blocker">Blockers ({roleStats.blocker || 0})</TabsTrigger>
                <TabsTrigger value="taxi-squad">Taxi Squad</TabsTrigger>
              </TabsList>
            </Tabs>

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

            {selectedRole === 'taxi-squad' ? (
              <TaxiSquadManager 
                teamId={team?.id} 
                onNavigateToRecruiting={() => setActiveTab('recruiting')}
              />
            ) : (
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
                  filteredPlayers.map((player: PlayerWithRole) => (
                    <div
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayer(player);
                        setShowPlayerModal(true);
                      }}
                      className="cursor-pointer hover:transform hover:scale-105 transition-transform"
                    >
                      <PlayerCard player={player} />
                    </div>
                  ))
                )}
              </div>
            )}

            {filteredPlayers.length === 0 && !playersLoading && selectedRole !== 'taxi-squad' && (
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

          <TabsContent value="tactics">
            <TextTacticalManager
              players={playersWithRoles}
              savedFormation={formation}
            />
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement teamId={team?.id} />
          </TabsContent>

          <TabsContent value="finances">
            <TeamFinances teamId={team?.id} />
          </TabsContent>

          <TabsContent value="contracts">
            <div className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Contract Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 mb-4">
                    Manage player contracts, negotiate extensions, and track contract expiration dates.
                  </p>
                  
                  {playersWithRoles.length > 0 ? (
                    <div className="space-y-4">
                      {playersWithRoles
                        .filter((player: PlayerWithRole) => {
                          const remaining = (player.contractSeasons ?? 3) - (player.contractStartSeason ?? 0);
                          return remaining <= 2;
                        })
                        .map((player: PlayerWithRole) => {
                          const remaining = (player.contractSeasons ?? 3) - (player.contractStartSeason ?? 0);
                          return (
                            <div key={player.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                              <div>
                                <h4 className="font-semibold">{player.name}</h4>
                                <p className="text-sm text-gray-400">
                                  {remaining} season{remaining !== 1 ? 's' : ''} remaining
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={remaining <= 1 ? "destructive" : "secondary"}>
                                  {remaining <= 1 ? "Expiring" : "Moderate"}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setShowContractModal(true);
                                  }}
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
                      No contract negotiations needed at this time.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recruiting">
            <TryoutSystem teamId={team?.id} />
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
            const playerToNegotiate = playersWithRoles.find(p => p.id === playerId);
            if (playerToNegotiate) {
              setSelectedPlayer(playerToNegotiate);
              setShowContractModal(true);
            }
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
          // teamId prop removed
        />
        </Tabs>
      </div>
    </div>
  );
}
