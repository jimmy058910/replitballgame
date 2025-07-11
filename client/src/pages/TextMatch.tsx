import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LiveMatchSimulation } from "@/components/LiveMatchSimulation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TextMatch() {
  const [, textMatchParams] = useRoute("/text-match/:matchId");
  const [, matchParams] = useRoute("/match/:matchId");
  const matchId = textMatchParams?.matchId || matchParams?.matchId;

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
    refetchInterval: (data: any) => {
      // Only refetch live matches every 2 seconds for synchronized viewing
      return data?.status === 'live' ? 2000 : false;
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
    enabled: !!matchId && match?.status === 'live',
    retry: false,
    staleTime: 5000,
    refetchInterval: (data: any) => {
      // Refetch enhanced data every 5 seconds for live matches
      return match?.status === 'live' ? 5000 : false;
    },
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
    </div>
  );
}