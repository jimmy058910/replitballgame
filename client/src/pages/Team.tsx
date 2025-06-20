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
              <Button variant="outline" size="lg">
                <i className="fas fa-plus mr-2"></i>Recruit
              </Button>
              <Button variant="outline" size="lg">
                <i className="fas fa-cog mr-2"></i>Tactics
              </Button>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="roster">Player Roster</TabsTrigger>
            <TabsTrigger value="tactics">Tactical Formation</TabsTrigger>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
            <TabsTrigger value="finances">Team Finances</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
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
              <PlayerCard key={player.id} player={player} />
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
      </div>
    </div>
  );
}
