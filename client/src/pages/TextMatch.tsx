import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import TextBasedMatch from "@/components/TextBasedMatch";
import EnhancedMatchSimulation from "@/components/EnhancedMatchSimulation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Clock } from "lucide-react";
import { useState } from "react";

export default function TextMatch() {
  const [, textMatchParams] = useRoute("/text-match/:matchId");
  const [, matchParams] = useRoute("/match/:matchId");
  const matchId = textMatchParams?.matchId || matchParams?.matchId;
  const [simulationMode, setSimulationMode] = useState<"classic" | "enhanced">("enhanced");

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
    refetchInterval: (data) => {
      // Only refetch live matches every 2 seconds for synchronized viewing
      return data?.status === 'live' ? 2000 : false;
    },
  });

  const { data: team1, isLoading: team1Loading, error: team1Error } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}`],
    enabled: !!match?.homeTeamId && match?.homeTeamId !== undefined,
    retry: 1,
    staleTime: 60000,
  });

  const { data: team2, isLoading: team2Loading, error: team2Error } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}`],
    enabled: !!match?.awayTeamId && match?.awayTeamId !== undefined,
    retry: 1,
    staleTime: 60000,
  });

  const { data: team1Players } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}/players`],
    enabled: !!match?.homeTeamId,
    retry: false,
  });

  const { data: team2Players } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}/players`],
    enabled: !!match?.awayTeamId,
    retry: false,
  });

  if (matchLoading || team1Loading || team2Loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div>Loading match data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug logging
  console.log("Match data:", match);
  console.log("Team1 data:", team1);
  console.log("Team2 data:", team2);
  console.log("Match ID:", matchId);
  console.log("Team1 ID:", match?.homeTeamId);
  console.log("Team2 ID:", match?.awayTeamId);
  console.log("Team1 URL:", `/api/teams/${match?.homeTeamId}`);
  console.log("Team2 URL:", `/api/teams/${match?.awayTeamId}`);
  console.log("Loading states - match:", matchLoading, "team1:", team1Loading, "team2:", team2Loading);
  console.log("Team1 error:", team1Error);
  console.log("Team2 error:", team2Error);

  if (!match || !team1 || !team2) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-400">
              Match not found or incomplete data
              <div className="text-sm mt-2 text-gray-400">
                Match: {match ? "✓" : "✗"} | Team1: {team1 ? "✓" : "✗"} | Team2: {team2 ? "✓" : "✗"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const team1WithPlayers = { ...team1, players: team1Players || [] };
  const team2WithPlayers = { ...team2, players: team2Players || [] };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Simulation Mode Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Live Match Simulation</h1>
            <p className="text-gray-400">
              {team1WithPlayers.name || "Team 1"} vs {team2WithPlayers.name || "Team 2"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Simulation Engine:</span>
            <div className="flex rounded-lg bg-gray-800 p-1">
              <Button
                variant={simulationMode === "classic" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSimulationMode("classic")}
                className="px-4 py-2"
              >
                <Clock className="w-4 h-4 mr-2" />
                Classic
              </Button>
              <Button
                variant={simulationMode === "enhanced" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSimulationMode("enhanced")}
                className="px-4 py-2"
              >
                <Zap className="w-4 h-4 mr-2" />
                Enhanced
              </Button>
            </div>
            <Badge 
              variant={simulationMode === "enhanced" ? "secondary" : "outline"}
              className={simulationMode === "enhanced" ? "bg-yellow-600" : ""}
            >
              {simulationMode === "enhanced" ? "Advanced Features Active" : "Standard Mode"}
            </Badge>
          </div>
        </div>
        
        {/* Feature Comparison Info */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-white mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-400" />
                  Classic Simulation
                </h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Standard match progression</li>
                  <li>• Basic player actions</li>
                  <li>• Simple commentary</li>
                  <li>• Halftime ads & rewards</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Enhanced Simulation
                </h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Dynamic tactical effects & home field advantage</li>
                  <li>• Player skills integration (Juke Move, Deadeye, etc.)</li>
                  <li>• Advanced commentary with atmospheric effects</li>
                  <li>• Realistic stamina & fatigue system</li>
                  <li>• Enhanced turn-based action resolution</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Render Selected Simulation */}
      {simulationMode === "enhanced" ? (
        <EnhancedMatchSimulation
          team1={team1WithPlayers}
          team2={team2WithPlayers}
          isExhibition={match?.matchType === "exhibition"}
          matchId={matchId}
          initialLiveState={match?.liveState}
          isLiveMatch={match?.status === 'live'}
          onMatchComplete={(result) => {
            console.log("Enhanced match completed:", result);
          }}
        />
      ) : (
        <TextBasedMatch
          team1={team1WithPlayers}
          team2={team2WithPlayers}
          isExhibition={match?.matchType === "exhibition"}
          matchId={matchId}
          initialLiveState={match?.liveState}
          isLiveMatch={match?.status === 'live'}
          onMatchComplete={(result) => {
            console.log("Classic match completed:", result);
          }}
        />
      )}
    </div>
  );
}