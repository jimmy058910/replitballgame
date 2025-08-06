import { useQuery } from "@tanstack/react-query";
import LeagueStandings from "@/components/LeagueStandings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
// @ts-expect-error TS2307
import type { Team, Match as SharedMatch } from "shared/schema"; // Renamed Match to avoid conflict

// Use SharedMatch for match data
interface Match extends SharedMatch {
  // Add any additional client-side specific fields if necessary in the future
}

export default function League() {
  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as Team | undefined;
  const isLoadingTeam = teamQuery.isLoading;

  const matchesQuery = useQuery({
    queryKey: ["teamMatches", team?.id],
    queryFn: (): Promise<Match[]> => apiRequest(`/api/team-matches`),
    enabled: !!team?.id,
  });
  const matches = matchesQuery.data as Match[] | undefined;
  // const isLoadingMatches = matchesQuery.isLoading; // If needed for a loading state for matches

  const upcomingMatches = matches?.filter((match: Match) =>
    // @ts-expect-error TS2339
    match.status === "scheduled"
  ).slice(0, 5) || [];

  const recentMatches = matches?.filter((match: Match) =>
    // @ts-expect-error TS2339
    match.status === "completed"
  ).slice(0, 5) || [];


  if (isLoadingTeam) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
        <p className="ml-4">Loading team data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-orbitron text-3xl font-bold mb-2">League</h1>
              <p className="text-gray-400">
                {team ? `Division ${team.division ?? 'N/A'} - ${team.subdivision ? team.subdivision.charAt(0).toUpperCase() + team.subdivision.slice(1) : 'Unknown'} - ${team.name}` : "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {/* League Standings - Full Width */}
        {team && team.division !== null && team.division !== undefined && (
          <div className="mb-8">
            <LeagueStandings division={team.division} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Upcoming Matches */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron">Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMatches.length > 0 ? (
                  upcomingMatches.map((match: Match) => (
                    // @ts-expect-error TS2339
                    <div key={match.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.scheduledTime ? new Date(match.scheduledTime).toLocaleDateString() : 'TBD'}
                        </span>
                        {/*
                         // @ts-expect-error TS2339 */}
                        <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.matchType?.toUpperCase() || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="font-semibold text-primary-400">
                            {/*
                             // @ts-expect-error TS2339 */}
                            {match.homeTeamId === team?.id ? team?.name : "Opponent"}
                          </div>
                          <div className="text-xs text-gray-400">HOME</div>
                        </div>
                        <div className="text-gray-500 font-bold">VS</div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {/*
                             // @ts-expect-error TS2339 */}
                            {match.awayTeamId === team?.id ? team?.name : "Opponent"}
                          </div>
                          <div className="text-xs text-gray-400">AWAY</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-calendar-alt text-4xl text-gray-600 mb-4"></i>
                    <p className="text-gray-400">No upcoming matches</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Results */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="font-orbitron">Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMatches.length > 0 ? (
                recentMatches.map((match: Match) => (
                  // @ts-expect-error TS2339
                  <div key={match.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {/*
                         // @ts-expect-error TS2339 */}
                        {match.completedAt ? new Date(match.completedAt).toLocaleDateString() : 'N/A'}
                      </span>
                      {/*
                       // @ts-expect-error TS2339 */}
                      <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                        {/*
                         // @ts-expect-error TS2339 */}
                        {match.matchType?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-semibold">
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.homeTeamId === team?.id ? team?.name : "Opponent"}
                        </div>
                        <div className="text-2xl font-bold text-primary-400">
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.homeScore ?? '-'}
                        </div>
                      </div>
                      <div className="text-gray-500 font-bold">-</div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.awayTeamId === team?.id ? team?.name : "Opponent"}
                        </div>
                        <div className="text-2xl font-bold text-red-400">
                          {/*
                           // @ts-expect-error TS2339 */}
                          {match.awayScore ?? '-'}
                        </div>
                      </div>
                    </div>
                    {/* Result indicator */}
                    <div className="mt-3 text-center">
                      {/*
                       // @ts-expect-error TS2339 */}
                      {match.homeScore !== null && match.awayScore !== null && team?.id && (
                        // @ts-expect-error TS2339
                        ((match.homeTeamId === team.id && match.homeScore > match.awayScore) ||
                         // @ts-expect-error TS2339
                         (match.awayTeamId === team.id && match.awayScore > match.homeScore)) ? (
                          <Badge className="bg-green-600 text-white">WIN</Badge>
                        // @ts-expect-error TS2339
                        ) : match.homeScore === match.awayScore ? (
                          <Badge className="bg-yellow-600 text-white">DRAW</Badge>
                        ) : (
                          <Badge className="bg-red-600 text-white">LOSS</Badge>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-trophy text-4xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No recent matches</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
