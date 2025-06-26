import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeagueStandings from "@/components/LeagueStandings";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Gamepad2, Calendar, Users, Clock, X } from "lucide-react";

export default function Competition() {
  const [browsingTeams, setBrowsingTeams] = useState(false);
  const { toast } = useToast();
  
  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: liveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
  });

  const { data: teamMatches } = useQuery({
    queryKey: ["/api/matches/team"],
  });

  const { data: standings } = useQuery({
    queryKey: [`/api/leagues/${team?.division || 8}/standings`],
    enabled: !!team,
  });

  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
  });

  const { data: divisionTeams } = useQuery({
    queryKey: [`/api/teams/division/${team?.division || 8}`],
    enabled: browsingTeams && !!team,
  });

  const browseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/teams/division/${team?.division || 8}`, "GET");
    },
    onSuccess: (data) => {
      setBrowsingTeams(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to load teams",
        variant: "destructive",
      });
    },
  });

  const challengeMutation = useMutation({
    mutationFn: async (challengedTeamId: string) => {
      return await apiRequest("/api/exhibitions/challenge", "POST", {
        challengedTeamId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge Sent!",
        description: "Exhibition challenge has been sent to the team.",
      });
      setBrowsingTeams(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Challenge Failed",
        description: error.message || "Failed to send challenge",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="h-8 w-8 text-yellow-400" />
          <h1 className="text-3xl font-bold font-orbitron">Competition Hub</h1>
        </div>

        <Tabs defaultValue="league" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="league" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              League
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="exhibitions" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Exhibitions
            </TabsTrigger>
          </TabsList>

          {/* League Tab */}
          <TabsContent value="league" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Status */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    My Team Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Team:</span>
                    <span className="font-semibold text-blue-400">{team?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Division:</span>
                    <Badge variant="outline">{team?.division || 8}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Record:</span>
                    <span>{team?.wins || 0}W - {team?.losses || 0}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="font-bold text-yellow-400">{team?.points || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Matches */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-400" />
                    Recent Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teamMatches && teamMatches.length > 0 ? (
                    <div className="space-y-2">
                      {teamMatches.slice(0, 3).map((match: any) => (
                        <div key={match.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                          <div className="text-sm">
                            <div className="font-semibold">
                              {match.homeTeamId === team?.id ? 'vs' : '@'} {match.opponentName}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {match.status === 'completed' ? 'Final' : match.status}
                            </div>
                          </div>
                          <Badge variant={match.result === 'win' ? 'default' : match.result === 'loss' ? 'destructive' : 'secondary'}>
                            {match.result || match.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No recent matches</p>
                  )}
                </CardContent>
              </Card>

              {/* Live Matches */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-400" />
                    Live Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {liveMatches && liveMatches.length > 0 ? (
                    <div className="space-y-2">
                      {liveMatches.slice(0, 3).map((match: any) => (
                        <div key={match.id} className="p-2 bg-gray-700 rounded">
                          <div className="text-sm font-semibold">
                            {match.homeTeam} vs {match.awayTeam}
                          </div>
                          <div className="text-xs text-red-400 flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No live matches</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* League Standings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Division {team?.division || 8} Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueStandings />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments && tournaments.length > 0 ? (
                tournaments.map((tournament: any) => (
                  <Card key={tournament.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{tournament.name}</span>
                        <Badge className={tournament.status === 'open' ? 'bg-green-600' : 'bg-gray-600'}>
                          {tournament.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Division:</span>
                        <Badge variant="outline">{tournament.division}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Entry Fee:</span>
                        <span className="text-yellow-400">{tournament.entryFee?.toLocaleString()} ₡</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teams:</span>
                        <span>{tournament.currentTeams || 0}/{tournament.maxTeams}</span>
                      </div>
                      {tournament.status === 'open' && (
                        <Button className="w-full" variant="outline">
                          Enter Tournament
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-gray-800 border-gray-700 col-span-full">
                  <CardContent className="text-center py-8">
                    <Medal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No tournaments available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Exhibitions Tab */}
          <TabsContent value="exhibitions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-purple-400" />
                    Quick Match
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">
                    Challenge AI teams or practice with your current roster. Exhibition matches don't affect your league standing.
                  </p>
                  <Button className="w-full" variant="outline">
                    Start Exhibition Match
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-gold-400" />
                    Challenge Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">
                    Send exhibition challenges to other teams in your division for friendly competition.
                  </p>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setBrowsingTeams(true)}
                    disabled={browseMutation.isPending}
                  >
                    {browseMutation.isPending ? "Loading..." : "Browse Teams"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Exhibition Results */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Recent Exhibition Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-4" />
                  <p>No recent exhibition matches</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Browse Teams Dialog */}
      <Dialog open={browsingTeams} onOpenChange={setBrowsingTeams}>
        <DialogContent className="max-w-4xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Division {team?.division || 8} Teams
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {divisionTeams && divisionTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {divisionTeams.filter((t: any) => t.id !== team?.id).map((challengeTeam: any) => (
                  <Card key={challengeTeam.id} className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg">{challengeTeam.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-400">Record:</div>
                        <div className="text-white">{challengeTeam.wins || 0}-{challengeTeam.losses || 0}-{challengeTeam.draws || 0}</div>
                        <div className="text-gray-400">Points:</div>
                        <div className="text-white">{challengeTeam.points || 0}</div>
                        <div className="text-gray-400">Power:</div>
                        <div className="text-white">{challengeTeam.teamPower || 0}</div>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => challengeMutation.mutate(challengeTeam.id)}
                        disabled={challengeMutation.isPending}
                      >
                        {challengeMutation.isPending ? "Sending..." : "Send Challenge"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No teams available for challenge</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}