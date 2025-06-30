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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Gamepad2, Calendar, Users, Clock } from "lucide-react";
import { Team, Match, Tournament as SharedTournament } from "shared/schema";

// Define interfaces for specific data structures
interface CurrentCycleData {
  season: number | string;
  description?: string;
  details?: string;
  currentDay: number;
  phase: "Regular Season" | "Playoffs" | "Off-Season" | string;
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
}

interface LiveMatch extends Match {
  homeTeamName?: string;
  awayTeamName?: string;
}

interface TournamentData extends SharedTournament {
  currentTeams?: number;
}

interface ChallengeResponse {
  matchId: string;
}

export default function Competition() {
  const [browsingTeams, setBrowsingTeams] = useState(false);
  const [divisionTeams, setDivisionTeams] = useState<Team[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: team, isLoading: teamLoading } = useQuery<Team, Error>({
    queryKey: ["/api/teams/my"],
    queryFn: () => apiRequest("/api/teams/my"),
  });

  const { data: liveMatches, isLoading: liveMatchesLoading } = useQuery<LiveMatch[], Error>({
    queryKey: ["/api/matches/live"],
    queryFn: () => apiRequest("/api/matches/live"),
  });

  const { data: teamMatches, isLoading: teamMatchesLoading } = useQuery<Match[], Error>({
    queryKey: ["/api/team-matches", team?.id],
    queryFn: () => apiRequest(`/api/team-matches?teamId=${team!.id}`),
    enabled: !!team?.id,
  });

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery<TournamentData[], Error>({
    queryKey: ["/api/tournaments"],
    queryFn: () => apiRequest("/api/tournaments"),
  });

  const { data: currentCycle, isLoading: currentCycleLoading } = useQuery<CurrentCycleData, Error>({
    queryKey: ["/api/season/current-cycle"],
    queryFn: () => apiRequest("/api/season/current-cycle"),
  });

  const browseMutation = useMutation<Team[], Error, void>({
    mutationFn: async () => {
      if (!team?.division) {
        toast({ title: "Error", description: "Team division not loaded yet.", variant: "destructive" });
        throw new Error("Team division not loaded yet.");
      }
      return await apiRequest(`/api/teams/division/${team.division}`, "GET");
    },
    onSuccess: (data) => {
      setDivisionTeams(data);
      setBrowsingTeams(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error browsing teams", description: error.message, variant: "destructive" });
    }
  });

  const challengeMutation = useMutation<ChallengeResponse, Error, string>({
    mutationFn: async (opponentId: string) => {
      return await apiRequest("/api/exhibitions/challenge", "POST", {
        opponentId,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Exhibition Started!",
        description: "Your exhibition match is now live. Redirecting to match viewer...",
      });
      setBrowsingTeams(false);
      queryClient.invalidateQueries({ queryKey: ["/api/team-matches", team?.id] });
      
      setTimeout(() => {
        setLocation(`/match/${data.matchId}`);
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Match",
        description: error.message || "Failed to start exhibition match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = teamLoading || liveMatchesLoading || teamMatchesLoading || tournamentsLoading || currentCycleLoading;

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

        {isLoading && !currentCycle ? (
           <Card className="bg-gray-800 border-gray-700 mb-6"><CardContent className="p-4 text-center">Loading season status...</CardContent></Card>
        ) : currentCycle && (
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
                  <div className="font-semibold">{currentCycle?.season ?? "N/A"}</div>
                  <div className="text-xs text-gray-500">{currentCycle?.description ?? ""}</div>
                  <div className="text-xs text-gray-500">{currentCycle?.details ?? ""}</div>
                </div>
                <div>
                  <span className="text-gray-400">Day:</span>
                  <div className="font-semibold">{currentCycle?.currentDay ?? 1} of 17</div>
                </div>
                <div>
                  <span className="text-gray-400">Phase:</span>
                  <Badge variant={currentCycle?.phase === "Regular Season" ? "default" : currentCycle?.phase === "Playoffs" ? "destructive" : "secondary"}>
                    {currentCycle?.phase ?? "N/A"}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400">
                    {currentCycle?.phase === "Regular Season" ? "Playoffs in:" : 
                     currentCycle?.daysUntilPlayoffs != null ? "Playoffs in:" :
                     "New season in:"}
                  </span>
                  <div className="font-semibold">
                    {currentCycle?.daysUntilPlayoffs != null ? `${currentCycle.daysUntilPlayoffs} days` :
                     (currentCycle?.daysUntilNewSeason != null && currentCycle?.phase === "Off-Season" ?
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

          <TabsContent value="league" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <span className="font-semibold text-blue-400">{team?.name ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Division:</span>
                    <Badge variant="outline">{team?.division ?? 'N/A'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Record:</span>
                    <span>{team?.wins ?? 0}W - {team?.losses ?? 0}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="font-bold text-yellow-400">{team?.points ?? 0}</span>
                  </div>
                </CardContent>
              </Card>

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
                      {teamMatches.slice(0, 3).map((match: Match) => (
                        <div key={match.id} className="flex justify-between items-center p-2 rounded bg-gray-700">
                          <span className="text-sm">vs Team {match.awayTeamId === team?.id ? match.homeTeamId?.slice(0,8) : match.awayTeamId?.slice(0,8) ?? 'Unknown'}</span>
                          <Badge variant={match.status === 'completed' ? 'outline' : 'default'}>
                            {match.status ?? 'N/A'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">{teamMatchesLoading ? "Loading..." : "No recent matches"}</p>
                  )}
                </CardContent>
              </Card>

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
                      {liveMatches.slice(0, 3).map((match: LiveMatch) => (
                        <div 
                          key={match.id} 
                          className="flex justify-between items-center p-3 rounded bg-red-900/20 border border-red-700 cursor-pointer hover:bg-red-900/30 transition-colors"
                          onClick={() => setLocation(`/match/${match.id}`)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {match.homeTeamName || `Team ${match.homeTeamId?.slice(0,4) ?? '?'}`} vs {match.awayTeamName || `Team ${match.awayTeamId?.slice(0,4) ?? '?'}`}
                            </span>
                            <span className="text-xs text-gray-400">Click to watch live</span>
                          </div>
                          <Badge variant="destructive" className="animate-pulse">
                            LIVE
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">{liveMatchesLoading ? "Loading..." : "No live matches"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Division {team?.division ?? 'N/A'} Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueStandings division={team?.division ?? 8} />
              </CardContent>
            </Card>

            <LeagueSchedule />
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments && tournaments.length > 0 ? (
                tournaments.map((tournament: TournamentData) => (
                  <Card key={tournament.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{tournament.name}</span>
                        <Badge className={tournament.status === 'open' ? 'bg-green-600' : 'bg-gray-600'}>
                          {tournament.status ?? 'N/A'}
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
                        <span className="text-yellow-400">{(tournament.entryFee ?? 0).toLocaleString()} ₡</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teams:</span>
                        <span>{tournament.currentTeams ?? 0}/{tournament.maxTeams ?? 'N/A'}</span>
                      </div>
                      {tournament.status === 'open' && (
                        <Button className="w-full" variant="outline"> {/* TODO: Add enter tournament mutation */}
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
                    <p className="text-gray-400">{tournamentsLoading ? "Loading..." : "No tournaments available"}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

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
                    disabled={browseMutation.isPending || !team?.division}
                  >
                    {browseMutation.isPending ? "Loading..." : "Choose Opponent"}
                  </Button>
                </CardContent>
              </Card>
            </div>

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

      <Dialog open={browsingTeams} onOpenChange={setBrowsingTeams}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Division {team?.division ?? 'N/A'} Teams
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {divisionTeams && divisionTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {divisionTeams.filter((challengeTeam: Team) => challengeTeam.id !== team?.id).map((challengeTeam: Team) => (
                  <Card key={challengeTeam.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-center">
                        <h3 className="font-semibold text-white">{challengeTeam.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          Division {challengeTeam.division ?? 'N/A'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-400">Record:</div>
                        <div className="text-white">{challengeTeam.wins ?? 0}W - {challengeTeam.losses ?? 0}L</div>
                        <div className="text-gray-400">Power:</div>
                        <div className="text-white">{challengeTeam.teamPower ?? 0}</div>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => challengeMutation.mutate(challengeTeam.id)}
                        disabled={challengeMutation.isPending && challengeMutation.variables === challengeTeam.id}
                      >
                        {challengeMutation.isPending && challengeMutation.variables === challengeTeam.id ? "Starting..." : "Start Match"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>{browseMutation.isPending ? "Loading teams..." : "No teams available for challenge"}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}