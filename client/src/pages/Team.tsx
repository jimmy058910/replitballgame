import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import PlayerCard from "@/components/PlayerCard";
import TacticalFormation from "@/components/TacticalFormation";
import PlayerDetailModal from "@/components/PlayerDetailModal";
import ContractNegotiation from "@/components/ContractNegotiation";
import StaffManagement from "@/components/StaffManagement";
import TeamFinances from "@/components/TeamFinances";
import TryoutSystem from "@/components/TryoutSystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

// Helper function to determine player role based on attributes
function getPlayerRole(player: any): string {
  const { speed, agility, catching, throwing, power } = player;
  
  // Passer: High throwing and leadership
  const passerScore = (throwing * 2) + (player.leadership * 1.5);
  
  // Runner: High speed and agility
  const runnerScore = (speed * 2) + (agility * 1.5);
  
  // Blocker: High power and stamina
  const blockerScore = (power * 2) + (player.stamina * 1.5);
  
  const maxScore = Math.max(passerScore, runnerScore, blockerScore);
  
  if (maxScore === passerScore) return "passer";
  if (maxScore === runnerScore) return "runner";
  return "blocker";
}

export default function Team() {
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [activeTab, setActiveTab] = useState("roster");

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: [`/api/teams/${team?.id}/players`],
    enabled: !!team?.id,
  });

  // Add roles to players and filter
  const playersWithRoles = players?.map((player: any) => ({
    ...player,
    role: getPlayerRole(player)
  })) || [];

  const filteredPlayers = playersWithRoles.filter((player: any) => 
    selectedRole === "all" || player.role === selectedRole
  );

  const roleStats = playersWithRoles.reduce((acc: any, player: any) => {
    acc[player.role] = (acc[player.role] || 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-orbitron text-3xl font-bold">My Team - {team.name}</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setActiveTab("recruiting")}
                className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
              >
                <i className="fas fa-plus mr-2"></i>Recruit
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setActiveTab("tactics")}
                className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
              >
                <i className="fas fa-cog mr-2"></i>Tactics
              </Button>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="tactics">Tactics</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            {/* Role Filter Sub-tabs */}
            <Tabs value={selectedRole} onValueChange={setSelectedRole} className="mb-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger value="all">All Players ({playersWithRoles.length})</TabsTrigger>
                <TabsTrigger value="passer">Passers ({roleStats.passer || 0})</TabsTrigger>
                <TabsTrigger value="runner">Runners ({roleStats.runner || 0})</TabsTrigger>
                <TabsTrigger value="blocker">Blockers ({roleStats.blocker || 0})</TabsTrigger>
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

            {/* Player Grid */}
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

          <TabsContent value="tactics">
            <TacticalFormation
              players={playersWithRoles}
              onFormationChange={(formation) => {
                console.log("Formation saved:", formation);
              }}
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
                        .filter((player: any) => {
                          const remaining = (player.contractSeasons || 3) - (player.contractStartSeason || 0);
                          return remaining <= 2;
                        })
                        .map((player: any) => {
                          const remaining = (player.contractSeasons || 3) - (player.contractStartSeason || 0);
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
          teamId={team?.id}
        />
        </Tabs>
      </div>
    </div>
  );
}
