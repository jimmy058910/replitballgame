import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeagueStandings from "@/components/LeagueStandings";
import LeagueSchedule from "@/components/LeagueSchedule";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Gamepad2, Calendar, Users, Clock, X } from "lucide-react";

export default function Competition() {
  const [browsingTeams, setBrowsingTeams] = useState(false);
  const [divisionTeams, setDivisionTeams] = useState([]);
  const [, setLocation] = useLocation();
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

  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
  });

  const { data: currentCycle } = useQuery({
    queryKey: ["/api/season/current-cycle"],
  });

  const browseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/teams/division/${team?.division || 8}`, "GET");
    },
    onSuccess: (data) => {
      setDivisionTeams(data);
      setBrowsingTeams(true);
    },
  });

  const challengeMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      return await apiRequest("/api/exhibitions/challenge", "POST", {
        opponentId,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Exhibition Started!",
        description: "Your exhibition match is now live. Redirecting to match viewer...",
      });
      setBrowsingTeams(false);
      
      // Redirect to match viewer after short delay
      setTimeout(() => {
        setLocation(`/match/${data.matchId}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Match",
        description: error.message || "Failed to start exhibition match. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-center">Competition Hub</h1>
          <p className="text-gray-400 text-center max-w-2xl mx-auto">
            Compete in leagues, tournaments, and exhibition matches. Track your progress and climb the rankings across all divisions.
          </p>
        </div>

        {/* Season Cycle Info */}
        {currentCycle && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Current Season Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Season:</span>
                  <div className="font-semibold">{currentCycle?.season || "N/A"}</div>
                  <div className="text-xs text-gray-500">{currentCycle?.description}</div>
                  <div className="text-xs text-gray-500">{currentCycle?.details}</div>
                </div>
                <div>
                  <span className="text-gray-400">Day:</span>
                  <div className="font-semibold">{currentCycle?.currentDay || 1} of 17</div>
                </div>
                <div>
                  <span className="text-gray-400">Phase:</span>
                  <Badge variant={currentCycle?.phase === "Regular Season" ? "default" : currentCycle?.phase === "Playoffs" ? "destructive" : "secondary"}>
                    {currentCycle?.phase}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400">
                    {currentCycle?.phase === "Regular Season" ? "Playoffs in:" : 
                     currentCycle?.daysUntilPlayoffs ? "Playoffs in:" : 
                     "New season in:"}
                  </span>
                  <div className="font-semibold">
                    {currentCycle?.daysUntilPlayoffs || 
                     (currentCycle?.daysUntilNewSeason && currentCycle?.phase === "Off-Season" ? 
                      `${currentCycle?.daysUntilNewSeason} days` : "TBD")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <span className="font-semibold text-blue-400">{(team as any)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Division:</span>
                    <Badge variant="outline">{(team as any)?.division || 8}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Record:</span>
                    <span>{(team as any)?.wins || 0}W - {(team as any)?.losses || 0}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="font-bold text-yellow-400">{(team as any)?.points || 0}</span>
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
                  {(teamMatches as any)?.length > 0 ? (
                    <div className="space-y-2">
                      {(teamMatches as any)?.slice(0, 3).map((match: any) => (
                        <div key={match.id} className="flex justify-between items-center p-2 rounded bg-gray-700">
                          <span className="text-sm">vs Team {match.id?.slice(0, 8)}</span>
                          <Badge variant={match.status === 'completed' ? 'outline' : 'default'}>
                            {match.status}
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
                  {(liveMatches as any)?.length > 0 ? (
                    <div className="space-y-2">
                      {(liveMatches as any)?.slice(0, 3).map((match: any) => (
                        <div key={match.id} className="flex justify-between items-center p-2 rounded bg-red-900/20 border border-red-700">
                          <span className="text-sm">Live Game</span>
                          <Badge variant="destructive" className="animate-pulse">
                            LIVE
                          </Badge>
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
                  Division {(team as any)?.division || 8} Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueStandings division={(team as any)?.division || 8} />
              </CardContent>
            </Card>

            {/* League Schedule - Full Width */}
            <LeagueSchedule />
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tournaments as any) && (tournaments as any).length > 0 ? (
                (tournaments as any).map((tournament: any) => (
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
                    Instant Exhibition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">
                    Start an immediate exhibition match against other teams in your division. Games begin instantly!
                  </p>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => browseMutation.mutate()}
                    disabled={browseMutation.isPending}
                  >
                    {browseMutation.isPending ? "Loading..." : "Choose Opponent"}
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
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Division {(team as any)?.division || 8} Teams
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(divisionTeams as any)?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(divisionTeams as any)?.filter((challengeTeam: any) => challengeTeam.id !== (team as any)?.id).map((challengeTeam: any) => (
                  <Card key={challengeTeam.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-center">
                        <h3 className="font-semibold text-white">{challengeTeam.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          Division {challengeTeam.division}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-400">Record:</div>
                        <div className="text-white">{challengeTeam.wins || 0}W - {challengeTeam.losses || 0}L</div>
                        <div className="text-gray-400">Power:</div>
                        <div className="text-white">{(challengeTeam as any).teamPower || 0}</div>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => challengeMutation.mutate(challengeTeam.id)}
                        disabled={challengeMutation.isPending}
                      >
                        {challengeMutation.isPending ? "Starting..." : "Start Match"}
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