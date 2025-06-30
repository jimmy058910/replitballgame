import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query"; // Removed queryClient from here
import { queryClient } from "@/lib/queryClient"; // Import queryClient from the correct path
import TextBasedMatch from "@/components/TextBasedMatch";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Team as SharedTeam, Player as SharedPlayer, Match as SharedMatch } from "shared/schema";

// Define more specific types for this page
interface LiveMatchState {
  // Define structure if known, otherwise 'any' is a placeholder
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

  const matchQuery = useQuery({
    queryKey: ["matchDetails", matchId],
    queryFn: (): Promise<ClientMatchData> => apiRequest(`/api/matches/${matchId}`),
    enabled: !!matchId,
    refetchInterval: (query) => { // Changed 'data' to 'query.state.data' or just use query.state.data directly
      return query.state.data?.status === 'live' ? 2000 : false;
    },
  });
  const match = matchQuery.data as ClientMatchData | undefined;
  const matchLoading = matchQuery.isLoading;

  const team1Query = useQuery({
    queryKey: ["teamDetails", match?.homeTeamId],
    queryFn: (): Promise<SharedTeam> => apiRequest(`/api/teams/${match!.homeTeamId}`),
    enabled: !!match?.homeTeamId,
    retry: 1,
    staleTime: 60000,
  });
  const team1 = team1Query.data as SharedTeam | undefined;
  const team1Loading = team1Query.isLoading;

  const team2Query = useQuery({
    queryKey: ["teamDetails", match?.awayTeamId],
    queryFn: (): Promise<SharedTeam> => apiRequest(`/api/teams/${match!.awayTeamId}`),
    enabled: !!match?.awayTeamId,
    retry: 1,
    staleTime: 60000,
  });
  const team2 = team2Query.data as SharedTeam | undefined;
  const team2Loading = team2Query.isLoading;

  const team1PlayersQuery = useQuery({
    queryKey: ["teamPlayers", match?.homeTeamId, "forMatch"], // Added "forMatch" to differentiate from other teamPlayers queries
    queryFn: (): Promise<SharedPlayer[]> => apiRequest(`/api/teams/${match!.homeTeamId}/players`),
    enabled: !!match?.homeTeamId,
    retry: false, // Consider retry strategy for player data
  });
  const team1Players = team1PlayersQuery.data as SharedPlayer[] | undefined;
  const team1PlayersLoading = team1PlayersQuery.isLoading;


  const team2PlayersQuery = useQuery({
    queryKey: ["teamPlayers", match?.awayTeamId, "forMatch"], // Added "forMatch"
    queryFn: (): Promise<SharedPlayer[]> => apiRequest(`/api/teams/${match!.awayTeamId}/players`),
    enabled: !!match?.awayTeamId,
    retry: false,
  });
  const team2Players = team2PlayersQuery.data as SharedPlayer[] | undefined;
  const team2PlayersLoading = team2PlayersQuery.isLoading;


  if (matchLoading || team1Loading || team2Loading || team1PlayersLoading || team2PlayersLoading) {
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

  if (!match || !team1 || !team2 || !team1Players || !team2Players) {
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

  return (
    <TextBasedMatch
      team1={team1WithPlayers}
      team2={team2WithPlayers}
      isExhibition={match.matchType === "exhibition"}
      matchId={matchId || ""}
      initialLiveState={match.liveState}
      isLiveMatch={match.status === 'live'}
      onMatchComplete={(result) => {
        console.log("Match completed in TextMatchPage:", result);
        queryClient.invalidateQueries({ queryKey: ["matchDetails", matchId] });
        if(team1?.id) queryClient.invalidateQueries({ queryKey: ["teamMatches", team1.id] });
        if(team2?.id) queryClient.invalidateQueries({ queryKey: ["teamMatches", team2.id] });
      }}
    />
  );
}