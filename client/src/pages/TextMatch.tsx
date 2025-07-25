import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LiveMatchSimulation } from "@/components/LiveMatchSimulation";
import { LiveMatchViewer } from "@/components/LiveMatchViewer";
import { HalftimeAd } from "@/components/HalftimeAd";
import { apiRequest } from "@/lib/queryClient";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import React from "react";

// Define more specific types for this page
interface LiveMatchState {
  // Define structure if known, otherwise 'any' is a placeholder
  [key: string]: any;
}

interface SharedMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  homeScore: number;
  awayScore: number;
  [key: string]: any;
}

interface SharedTeam {
  id: string;
  name: string;
  [key: string]: any;
}

interface SharedPlayer {
  id: string;
  name: string;
  [key: string]: any;
}

interface ClientMatchData extends SharedMatch {
  liveState?: LiveMatchState | null;
}

interface ClientTeamData extends SharedTeam {
  players: SharedPlayer[];
}

export default function TextMatchPage() {
  const [, textMatchParams] = useRoute("/text-match/:matchId");
  const [, matchParams] = useRoute("/match/:matchId");
  const matchId = textMatchParams?.matchId || matchParams?.matchId;
  const [showHalftimeAd, setShowHalftimeAd] = useState(false);
  const [halftimeAdShown, setHalftimeAdShown] = useState(false);
  const [viewMode, setViewMode] = useState<'enhanced' | 'realtime'>('enhanced');

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["matchDetails", matchId],
    queryFn: (): Promise<ClientMatchData> => apiRequest(`/api/matches/${matchId}`),
    enabled: !!matchId,
    refetchInterval: (data: any) => {
      // Only refetch live matches every 2 seconds for synchronized viewing
      return data?.status === 'IN_PROGRESS' ? 2000 : false;
    },
  }) as { data: any, isLoading: boolean };

  const { data: team1, isLoading: team1Loading, error: team1Error } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}`],
    enabled: !!(match as any)?.homeTeamId && (match as any)?.homeTeamId !== undefined,
    retry: 1,
    staleTime: 60000,
  });

  const { data: team2, isLoading: team2Loading, error: team2Error } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}`],
    enabled: !!(match as any)?.awayTeamId && (match as any)?.awayTeamId !== undefined,
    retry: 1,
    staleTime: 60000,
  });

  const { data: team1Players } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}/players`],
    enabled: !!(match as any)?.homeTeamId,
    retry: false,
  });

  const { data: team2Players } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}/players`],
    enabled: !!(match as any)?.awayTeamId,
    retry: false,
  });

  // Fetch enhanced simulation data
  const { data: enhancedData, isLoading: enhancedLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}/enhanced-data`],
    enabled: !!matchId && match?.status === 'IN_PROGRESS',
    retry: false,
    staleTime: 5000,
    refetchInterval: (data: any) => {
      // Refetch enhanced data every 5 seconds for live matches
      return match?.status === 'IN_PROGRESS' ? 5000 : false;
    },
  });

  // Check for halftime (when match is at 50% completion) - MOVED TO TOP BEFORE ANY CONDITIONAL RETURNS
  React.useEffect(() => {
    if (match?.status === 'IN_PROGRESS' && enhancedData?.gamePhase === 'halftime' && !halftimeAdShown) {
      setShowHalftimeAd(true);
      setHalftimeAdShown(true);
    }
  }, [match, enhancedData, halftimeAdShown]);

  if (matchLoading || team1Loading || team2Loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <div className="text-gray-300">Loading match data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug logging
  console.log("Match data:", match);
  console.log("Enhanced data:", enhancedData);
  console.log("Enhanced loading:", enhancedLoading);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="text-center text-red-400">
              Match not found or critical data missing.
              <div className="text-sm mt-2 text-gray-500">
                Match ID: {matchId || 'N/A'} <br/>
                Match: {match ? "✓" : "✗"} ({matchQuery.status}) |
                Team1: {team1 ? "✓" : "✗"} ({team1Query.status}) |
                Team2: {team2 ? "✓" : "✗"} ({team2Query.status}) |
                P1: {team1Players ? "✓" : "✗"} ({team1PlayersQuery.status}) |
                P2: {team2Players ? "✓" : "✗"} ({team2PlayersQuery.status})
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Construct full team data with players
  const team1WithPlayers: ClientTeamData = { ...team1, players: team1Players };
  const team2WithPlayers: ClientTeamData = { ...team2, players: team2Players };

  const handleHalftimeAdCompleted = (reward: number) => {
    setShowHalftimeAd(false);
    console.log('Halftime ad completed, reward:', reward);
  };

  const handleHalftimeAdSkipped = () => {
    setShowHalftimeAd(false);
    console.log('Halftime ad skipped');
  };

  const handleContinueGame = () => {
    setShowHalftimeAd(false);
    console.log('Continue game without ad');
  };

  // Extract halftime stats from match data
  const getHalftimeStats = () => {
    if (!match?.liveState?.recentEvents) return null;
    
    const halftimeEvent = match.liveState.recentEvents.find((event: any) => event.type === 'halftime');
    if (!halftimeEvent?.data) return null;
    
    return halftimeEvent.data;
  };

  const halftimeStats = getHalftimeStats();
  const teamNames = {
    home: team1?.name || "Home Team",
    away: team2?.name || "Away Team"
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Match Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">
          {team1?.name} vs {team2?.name}
        </h1>
        <div className="text-center text-gray-400 mb-4">
          Match ID: {matchId} | Status: {match?.status}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('enhanced')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'enhanced'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Enhanced View
          </button>
          <button
            onClick={() => setViewMode('realtime')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'realtime'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Real-time View (WebSocket)
          </button>
        </div>
      </div>

      {/* Dynamic Component Based on View Mode */}
      {viewMode === 'enhanced' ? (
        <LiveMatchSimulation
          matchId={matchId!}
          team1={team1WithPlayers}
          team2={team2WithPlayers}
          initialLiveState={(match as any)?.liveState}
          enhancedData={enhancedData}
          onMatchComplete={() => {
            console.log("Match completed");
          }}
        />
      ) : (
        <LiveMatchViewer
          matchId={matchId!}
          homeTeam={team1WithPlayers}
          awayTeam={team2WithPlayers}
        />
      )}
      
      {/* Halftime Ad Integration */}
      <HalftimeAd
        isVisible={showHalftimeAd}
        onAdCompleted={handleHalftimeAdCompleted}
        onAdSkipped={handleHalftimeAdSkipped}
        onContinueGame={handleContinueGame}
        halftimeStats={halftimeStats}
        teamNames={teamNames}
      />
    </div>
  );
}