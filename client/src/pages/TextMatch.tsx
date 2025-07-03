import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import EnhancedMatchSimulation from "@/components/EnhancedMatchSimulation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TextMatch() {
  const [, textMatchParams] = useRoute("/text-match/:matchId");
  const [, matchParams] = useRoute("/match/:matchId");
  const matchId = textMatchParams?.matchId || matchParams?.matchId;

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
      <EnhancedMatchSimulation
        team1={team1WithPlayers}
        team2={team2WithPlayers}
        isExhibition={match?.matchType === "exhibition"}
        matchId={matchId}
        initialLiveState={match?.liveState}
        isLiveMatch={match?.status === 'live'}
        onMatchComplete={(result) => {
          console.log("Match completed:", result);
        }}
      />
    </div>
  );
}