import { useQuery } from "@tanstack/react-query";
import LeagueStandings from "@/components/LeagueStandings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { teamQueryOptions } from '@/lib/api/queryOptions';
import type { Player, Team, Staff, Contract, TeamFinances, Stadium, League, Notification, MarketplaceListing, MarketplaceBid } from '@shared/types/models';

// Define Match interface for client-side use
interface Match {
  id: string | number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam?: Team;
  awayTeam?: Team;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  scheduledTime?: string | Date;
  matchType?: string;
  tournamentId?: number;
  seasonId?: number;
}

export default function League() {
  const teamQuery = useQuery(teamQueryOptions.myTeamLegacy());
  const team = teamQuery.data as Team | undefined;
  const isLoadingTeam = teamQuery.isLoading;

  const matchesQuery = useQuery(teamQueryOptions.teamMatches(team?.id));
  const matches = matchesQuery.data as Match[] | undefined;
  // const isLoadingMatches = matchesQuery.isLoading; // If needed for a loading state for matches

  const upcomingMatches = matches?.filter((match: Match) =>
    match.status === "scheduled"
  ).slice(0, 5) || [];

  const recentMatches = matches?.filter((match: Match) =>
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
                    <div key={match.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          
                          {match.scheduledTime ? new Date(match.scheduledTime).toLocaleDateString() : 'TBD'}
                        </span>
                        
                        <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                          
                          {match.matchType?.toUpperCase() || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="font-semibold text-primary-400">
                            
                            {match.homeTeamId === team?.id ? team?.name : "Opponent"}
                          </div>
                          <div className="text-xs text-gray-400">HOME</div>
                        </div>
                        <div className="text-gray-500 font-bold">VS</div>
                        <div className="text-center">
                          <div className="font-semibold">
                            
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
                  <div key={match.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        
                        {match.completedAt ? new Date(match.completedAt).toLocaleDateString() : 'N/A'}
                      </span>
                      
                      <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                        
                        {match.matchType?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-semibold">
                          
                          {match.homeTeamId === team?.id ? team?.name : "Opponent"}
                        </div>
                        <div className="text-2xl font-bold text-primary-400">
                          
                          {match.homeScore ?? '-'}
                        </div>
                      </div>
                      <div className="text-gray-500 font-bold">-</div>
                      <div className="text-center">
                        <div className="font-semibold">
                          
                          {match.awayTeamId === team?.id ? team?.name : "Opponent"}
                        </div>
                        <div className="text-2xl font-bold text-red-400">
                          
                          {match.awayScore ?? '-'}
                        </div>
                      </div>
                    </div>
                    {/* Result indicator */}
                    <div className="mt-3 text-center">
                      
                      {match.homeScore !== null && match.awayScore !== null && team?.id && (
                        ((match.homeTeamId === team.id && match.homeScore > match.awayScore) ||
                         (match.awayTeamId === team.id && match.awayScore > match.homeScore)) ? (
                          <Badge className="bg-green-600 text-white">WIN</Badge>
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
