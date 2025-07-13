import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users, Award } from "lucide-react";
import StatsDisplay from "@/components/StatsDisplay";
import { apiRequest } from "@/lib/queryClient";

interface PlayerLeaderboards {
  scoring: any[];
  passing: any[];
  rushing: any[];
  defense: any[];
}

interface TeamLeaderboards {
  scoring: any[];
  offense: any[];
  defense: any[];
}

export default function Stats() {
  const [searchPlayerId, setSearchPlayerId] = useState("");
  const [searchTeamId, setSearchTeamId] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  // Fetch player leaderboards
  const { data: playerLeaderboards, isLoading: playersLoading } = useQuery({
    queryKey: ['/api/stats/leaderboards/players'],
    queryFn: () => apiRequest('/api/stats/leaderboards/players')
  });

  // Fetch team leaderboards
  const { data: teamLeaderboards, isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/stats/leaderboards/teams'],
    queryFn: () => apiRequest('/api/stats/leaderboards/teams')
  });

  // Fetch specific player stats
  const { data: playerStats, isLoading: playerStatsLoading } = useQuery({
    queryKey: ['/api/stats/player', searchPlayerId],
    queryFn: () => apiRequest(`/api/stats/player/${searchPlayerId}`),
    enabled: !!searchPlayerId
  });

  // Fetch specific team stats
  const { data: teamStats, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['/api/stats/team', searchTeamId],
    queryFn: () => apiRequest(`/api/stats/team/${searchTeamId}`),
    enabled: !!searchTeamId
  });

  const handlePlayerSearch = () => {
    if (searchPlayerId.trim()) {
      setSelectedPlayer(playerStats);
    }
  };

  const handleTeamSearch = () => {
    if (searchTeamId.trim()) {
      setSelectedTeam(teamStats);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white py-8">
          <h1 className="text-4xl font-bold mb-2">League Statistics</h1>
          <p className="text-xl opacity-90">Complete player and team performance analytics</p>
        </div>

        <Tabs defaultValue="leaderboards" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="player-lookup" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Player Lookup
            </TabsTrigger>
            <TabsTrigger value="team-lookup" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Lookup
            </TabsTrigger>
          </TabsList>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Player Leaderboards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Player Leaderboards
                  </CardTitle>
                  <CardDescription>Top performing players across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {playersLoading ? (
                    <div className="text-center py-8">Loading player stats...</div>
                  ) : (
                    <Tabs defaultValue="scoring" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="scoring">Scoring</TabsTrigger>
                        <TabsTrigger value="passing">Passing</TabsTrigger>
                        <TabsTrigger value="rushing">Rushing</TabsTrigger>
                        <TabsTrigger value="defense">Defense</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="scoring" className="mt-4">
                        <div className="space-y-2">
                          {playerLeaderboards?.scoring?.length > 0 ? (
                            playerLeaderboards.scoring.map((player: any, index: number) => (
                              <div key={player.playerId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {player.playerName}</span>
                                <span className="text-green-600 font-bold">{player.offensive.scores} scores</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No scoring data available</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="passing" className="mt-4">
                        <div className="space-y-2">
                          {playerLeaderboards?.passing?.length > 0 ? (
                            playerLeaderboards.passing.map((player: any, index: number) => (
                              <div key={player.playerId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {player.playerName}</span>
                                <span className="text-blue-600 font-bold">{player.offensive.passingYards} yards</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No passing data available</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="rushing" className="mt-4">
                        <div className="space-y-2">
                          {playerLeaderboards?.rushing?.length > 0 ? (
                            playerLeaderboards.rushing.map((player: any, index: number) => (
                              <div key={player.playerId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {player.playerName}</span>
                                <span className="text-orange-600 font-bold">{player.offensive.rushingYards} yards</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No rushing data available</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="defense" className="mt-4">
                        <div className="space-y-2">
                          {playerLeaderboards?.defense?.length > 0 ? (
                            playerLeaderboards.defense.map((player: any, index: number) => (
                              <div key={player.playerId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {player.playerName}</span>
                                <span className="text-red-600 font-bold">{player.defensive.tackles} tackles</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No defensive data available</div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>

              {/* Team Leaderboards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Leaderboards
                  </CardTitle>
                  <CardDescription>Top performing teams across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamsLoading ? (
                    <div className="text-center py-8">Loading team stats...</div>
                  ) : (
                    <Tabs defaultValue="scoring" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="scoring">Scoring</TabsTrigger>
                        <TabsTrigger value="offense">Offense</TabsTrigger>
                        <TabsTrigger value="defense">Defense</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="scoring" className="mt-4">
                        <div className="space-y-2">
                          {teamLeaderboards?.scoring?.length > 0 ? (
                            teamLeaderboards.scoring.map((team: any, index: number) => (
                              <div key={team.teamId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {team.teamName}</span>
                                <span className="text-green-600 font-bold">{team.totalScore} points</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No team scoring data available</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="offense" className="mt-4">
                        <div className="space-y-2">
                          {teamLeaderboards?.offense?.length > 0 ? (
                            teamLeaderboards.offense.map((team: any, index: number) => (
                              <div key={team.teamId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {team.teamName}</span>
                                <span className="text-blue-600 font-bold">{team.totalOffensiveYards} yards</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No team offensive data available</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="defense" className="mt-4">
                        <div className="space-y-2">
                          {teamLeaderboards?.defense?.length > 0 ? (
                            teamLeaderboards.defense.map((team: any, index: number) => (
                              <div key={team.teamId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium">#{index + 1} {team.teamName}</span>
                                <span className="text-red-600 font-bold">{team.totalKnockdowns} knockdowns</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">No team defensive data available</div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Player Lookup Tab */}
          <TabsContent value="player-lookup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Player Statistics Lookup</CardTitle>
                <CardDescription>Search for detailed statistics of any player</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter player ID..."
                    value={searchPlayerId}
                    onChange={(e) => setSearchPlayerId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handlePlayerSearch} disabled={!searchPlayerId.trim() || playerStatsLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {playerStatsLoading && (
                  <div className="text-center py-8">Loading player statistics...</div>
                )}

                {playerStats && (
                  <StatsDisplay playerStats={playerStats} showAverages={true} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Lookup Tab */}
          <TabsContent value="team-lookup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Statistics Lookup</CardTitle>
                <CardDescription>Search for detailed statistics of any team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter team ID..."
                    value={searchTeamId}
                    onChange={(e) => setSearchTeamId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleTeamSearch} disabled={!searchTeamId.trim() || teamStatsLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {teamStatsLoading && (
                  <div className="text-center py-8">Loading team statistics...</div>
                )}

                {teamStats && (
                  <StatsDisplay teamStats={teamStats} showAverages={true} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}