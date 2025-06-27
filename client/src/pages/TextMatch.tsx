import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import TextBasedMatch from "@/components/TextBasedMatch";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function TextMatch() {
  const [, textMatchParams] = useRoute("/text-match/:matchId");
  const [, matchParams] = useRoute("/match/:matchId");
  const matchId = textMatchParams?.matchId || matchParams?.matchId;

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
  });

  const { data: team1, isLoading: team1Loading } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}`],
    enabled: !!match?.homeTeamId,
  });

  const { data: team2, isLoading: team2Loading } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}`],
    enabled: !!match?.awayTeamId,
  });

  const { data: team1Players } = useQuery({
    queryKey: [`/api/teams/${match?.homeTeamId}/players`],
    enabled: !!match?.homeTeamId,
  });

  const { data: team2Players } = useQuery({
    queryKey: [`/api/teams/${match?.awayTeamId}/players`],
    enabled: !!match?.awayTeamId,
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

  if (!match || !team1 || !team2) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-400">
              Match not found or incomplete data
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const team1WithPlayers = { ...team1, players: team1Players || [] };
  const team2WithPlayers = { ...team2, players: team2Players || [] };

  return (
    <TextBasedMatch
      team1={team1WithPlayers}
      team2={team2WithPlayers}
      isExhibition={match?.matchType === "exhibition"}
      onMatchComplete={(result) => {
        console.log("Match completed:", result);
        // Here you could update the match in the database
      }}
    />
  );
}