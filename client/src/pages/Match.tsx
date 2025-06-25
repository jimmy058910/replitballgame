import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import Navigation from "@/components/Navigation";
import MatchViewer from "@/components/MatchViewer";
import LiveMatchViewer from "@/components/LiveMatchViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Match() {
  const { matchId } = useParams();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: matches } = useQuery({
    queryKey: ["/api/matches/team", team?.id].filter(Boolean),
    enabled: !!team?.id,
  });

  const { data: liveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000,
  });

  // Priority: URL matchId > user-selected match > first live match
  const selectedMatch = matchId 
    ? liveMatches?.find((m: any) => m.id === matchId) || matches?.find((m: any) => m.id === matchId)
    : selectedMatchId 
      ? matches?.find((m: any) => m.id === selectedMatchId)
      : liveMatches?.[0];

  const upcomingMatches = matches?.filter((match: any) => 
    match.status === "scheduled"
  ) || [];

  const completedMatches = matches?.filter((match: any) => 
    match.status === "completed"
  ) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Matches</h1>
          <p className="text-gray-400">
            Watch live matches and review your team's performance
          </p>
        </div>

        <Tabs defaultValue={matchId ? "matches" : "matches"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="matches" className="data-[state=active]:bg-blue-600">
              Match History
            </TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-green-600">
              Live Simulation Demo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            {/* Live Match Viewer */}
            {selectedMatch && (
              <div className="mb-8">
                <MatchViewer match={selectedMatch} />
                {matchId && (
                  <div className="mt-4 text-center">
                    <p className="text-green-400">Exhibition Match in Progress</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live & Upcoming Matches */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron flex items-center">
                <i className="fas fa-play-circle mr-2 text-green-400"></i>
                Live & Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Live Matches */}
                {liveMatches?.map((match: any) => (
                  <div 
                    key={match.id} 
                    className={`bg-gray-700 rounded-lg p-4 border-2 cursor-pointer transition-colors ${
                      selectedMatchId === match.id ? 'border-green-500' : 'border-transparent hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedMatchId(match.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
                        <Badge className="bg-green-600 text-white">LIVE</Badge>
                      </div>
                      <span className="text-sm text-gray-400">
                        {match.matchType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-semibold text-primary-400">
                          {match.homeTeamId === team?.id ? team.name : (match.homeTeamName || "Opponent")}
                        </div>
                        <div className="text-2xl font-bold">{match.homeScore}</div>
                      </div>
                      <div className="text-gray-500 font-bold">-</div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {match.awayTeamId === team?.id ? team.name : (match.awayTeamName || "Opponent")}
                        </div>
                        <div className="text-2xl font-bold">{match.awayScore}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Upcoming Matches */}
                {upcomingMatches.slice(0, 3).map((match: any) => (
                  <div key={match.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(match.scheduledTime).toLocaleDateString()} •{" "}
                        {new Date(match.scheduledTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                        {match.matchType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-semibold text-primary-400">
                          {match.homeTeamId === team?.id ? team.name : (match.homeTeamName || "Opponent")}
                        </div>
                        <div className="text-xs text-gray-400">HOME</div>
                      </div>
                      <div className="text-gray-500 font-bold">VS</div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {match.awayTeamId === team?.id ? team.name : (match.awayTeamName || "Opponent")}
                        </div>
                        <div className="text-xs text-gray-400">AWAY</div>
                      </div>
                    </div>
                  </div>
                ))}

                {liveMatches?.length === 0 && upcomingMatches.length === 0 && (
                  <div className="text-center py-8">
                    <i className="fas fa-calendar-alt text-4xl text-gray-600 mb-4"></i>
                    <p className="text-gray-400">No upcoming matches</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Match History */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="font-orbitron flex items-center">
                <i className="fas fa-history mr-2 text-gold-400"></i>
                Match History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedMatches.slice(0, 5).map((match: any) => (
                  <div 
                    key={match.id} 
                    className={`bg-gray-700 rounded-lg p-4 border-2 cursor-pointer transition-colors ${
                      selectedMatchId === match.id ? 'border-gold-400' : 'border-transparent hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedMatchId(match.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(match.completedAt).toLocaleDateString()}
                      </span>
                      <Badge variant={match.matchType === "tournament" ? "default" : "secondary"}>
                        {match.matchType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-semibold">
                          {match.homeTeamId === team?.id ? team.name : "Opponent"}
                        </div>
                        <div className="text-2xl font-bold text-primary-400">
                          {match.homeScore}
                        </div>
                      </div>
                      <div className="text-gray-500 font-bold">-</div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {match.awayTeamId === team?.id ? team.name : (match.awayTeamName || "Opponent")}
                        </div>
                        <div className="text-2xl font-bold text-red-400">
                          {match.awayScore}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      {((match.homeTeamId === team?.id && match.homeScore > match.awayScore) ||
                        (match.awayTeamId === team?.id && match.awayScore > match.homeScore)) ? (
                        <Badge className="bg-green-600 text-white">WIN</Badge>
                      ) : match.homeScore === match.awayScore ? (
                        <Badge className="bg-yellow-600 text-white">DRAW</Badge>
                      ) : (
                        <Badge className="bg-red-600 text-white">LOSS</Badge>
                      )}
                    </div>
                  </div>
                ))}

                {completedMatches.length === 0 && (
                  <div className="text-center py-8">
                    <i className="fas fa-trophy text-4xl text-gray-600 mb-4"></i>
                    <p className="text-gray-400">No match history yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <LiveMatchViewer matchId="demo-match-1" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
