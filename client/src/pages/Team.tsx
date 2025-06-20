import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import PlayerCard from "@/components/PlayerCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Team() {
  const [selectedRace, setSelectedRace] = useState("all");

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/teams", team?.id, "players"].filter(Boolean),
    enabled: !!team?.id,
  });

  const filteredPlayers = players?.filter((player: any) => 
    selectedRace === "all" || player.race === selectedRace
  ) || [];

  const raceStats = players?.reduce((acc: any, player: any) => {
    acc[player.race] = (acc[player.race] || 0) + 1;
    return acc;
  }, {}) || {};

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

        {/* Race Filter Tabs */}
        <Tabs value={selectedRace} onValueChange={setSelectedRace} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800">
            <TabsTrigger value="all">All Races</TabsTrigger>
            <TabsTrigger value="human">Humans</TabsTrigger>
            <TabsTrigger value="sylvan">Sylvans</TabsTrigger>
            <TabsTrigger value="gryll">Gryll</TabsTrigger>
            <TabsTrigger value="lumina">Lumina</TabsTrigger>
            <TabsTrigger value="umbra">Umbra</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Team Summary */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-race-human">{raceStats.human || 0}</div>
                <div className="text-xs text-gray-400">Humans</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-race-sylvan">{raceStats.sylvan || 0}</div>
                <div className="text-xs text-gray-400">Sylvans</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-race-gryll">{raceStats.gryll || 0}</div>
                <div className="text-xs text-gray-400">Gryll</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-race-lumina">{raceStats.lumina || 0}</div>
                <div className="text-xs text-gray-400">Lumina</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-race-umbra">{raceStats.umbra || 0}</div>
                <div className="text-xs text-gray-400">Umbra</div>
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
              {selectedRace === "all" 
                ? "Your team has no players yet." 
                : `No ${selectedRace} players in your team.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
