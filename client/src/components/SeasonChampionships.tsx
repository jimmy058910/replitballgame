import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Crown, Calendar, Users, Target, Medal, Zap, TrendingUp } from "lucide-react";
import { FloatingNotification, PulseWrapper, HoverCard, AnimatedCounter } from "@/components/MicroInteractions"; // Removed AnimatedNotificationProps

interface Season {
  id: string;
  name: string;
  year: number;
  status: string;
  startDate: string;
  endDate?: string;
  playoffStartDate?: string;
  championTeamId?: string;
}

interface PlayoffMatch {
  id: string;
  seasonId: string;
  division: number;
  round: number;
  team1Id: string;
  team2Id: string;
  winnerId?: string;
  status: string;
  scheduledDate?: string;
  team1?: { name: string; logo: string; wins: number; losses: number };
  team2?: { name: string; logo: string; wins: number; losses: number };
}

export default function SeasonChampionships() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDivision, setSelectedDivision] = useState(1);
  const [showNotification, setShowNotification] = useState(false);

  interface ChampionTeam {
    id: string;
    name: string;
    division: number;
  }
  interface ChampionshipSeason extends Season {
    teamName?: string; // For recent champions display
    championTeam?: ChampionTeam; // For history display
  }

  const { data: currentSeason } = useQuery<Season>({ // Typed currentSeason
    queryKey: ["/api/seasons/current"],
  });

  const { data: playoffs = [] } = useQuery<PlayoffMatch[]>({ // Typed playoffs, default to empty array
    queryKey: ["/api/playoffs", selectedDivision],
    enabled: !!selectedDivision, // Ensure selectedDivision is not null/undefined
  });

  const { data: leagueStandings = [] } = useQuery<any[]>({ // Typed leagueStandings, default to empty array
    queryKey: ["/api/leagues/standings", selectedDivision],
    enabled: !!selectedDivision,
  });

  const { data: championshipHistory = [] } = useQuery<ChampionshipSeason[]>({ // Typed championshipHistory, default to empty array
    queryKey: ["/api/seasons/champions"],
  });

  const startPlayoffsMutation = useMutation({
    mutationFn: (data: { seasonId: string; division: number }) =>
      apiRequest(`/api/seasons/${data.seasonId}/playoffs/start`, "POST", { division: data.division }), // Corrected apiRequest
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playoffs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons/current"] });
      setShowNotification(true);
      toast({
        title: "Playoffs Started!",
        description: "The championship playoffs have begun for Division " + selectedDivision,
      });
    },
  });

  const getRoundName = (round: number) => {
    const names = {
      1: "First Round",
      2: "Semifinals", 
      3: "Championship Final"
    };
    return names[round as keyof typeof names] || `Round ${round}`; // Added type assertion
  };

  const getDivisionName = (division: number) => {
    const names = {
      1: "Mythic Division",
      2: "Legendary Division", 
      3: "Epic Division",
      4: "Heroic Division"
    };
    return names[division as keyof typeof names] || `Division ${division}`; // Added type assertion
  };

  const getSeasonProgress = () => {
    if (!currentSeason) return 0;
    const start = new Date(currentSeason.startDate).getTime();
    const end = currentSeason.endDate ? new Date(currentSeason.endDate).getTime() : Date.now() + (180 * 24 * 60 * 60 * 1000); // 6 months default
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Corrected usage of FloatingNotification: it likely controls its own visibility based on a 'message' prop or similar */}
      {showNotification && (
        <FloatingNotification
          message="Playoffs have started!"
          type="success"
          onClose={() => setShowNotification(false)} // Assuming onClose is the prop to hide it
          // duration={3000} // Example: if it auto-hides
        />
      )}

      {/* Season Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <HoverCard className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Current Season: {currentSeason?.name || "Season 2024"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Season Progress</span>
                <Badge variant={currentSeason?.status === "playoffs" ? "destructive" : "default"}>
                  {currentSeason?.status === "playoffs" ? "Playoffs Active" : "Regular Season"}
                </Badge>
              </div>
              <Progress value={getSeasonProgress()} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Started:</span>
                  <p className="font-medium">{currentSeason?.startDate ? new Date(currentSeason.startDate).toLocaleDateString() : "TBD"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Playoffs:</span>
                  <p className="font-medium">{currentSeason?.playoffStartDate ? new Date(currentSeason.playoffStartDate).toLocaleDateString() : "TBD"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </HoverCard>

        <PulseWrapper pulse={championshipHistory?.length > 0}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Recent Champions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {championshipHistory?.slice(0, 3).map((champion: ChampionshipSeason, index: number) => (
                <div key={champion.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Medal className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-600'}`} />
                    <span className="text-sm">{champion.year}</span>
                  </div>
                  {/* teamName was an ad-hoc addition, actual champion team data might be in championTeamId -> championTeam */}
                  <span className="text-sm font-medium">{champion.championTeam?.name || champion.teamName || "Unknown"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </PulseWrapper>
      </div>

      {/* Division Selector */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((division) => (
          <Button
            key={division}
            variant={selectedDivision === division ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDivision(division)}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            {getDivisionName(division)}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="playoffs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="playoffs">Championship Playoffs</TabsTrigger>
          <TabsTrigger value="standings">League Standings</TabsTrigger>
          <TabsTrigger value="history">Championship History</TabsTrigger>
        </TabsList>

        <TabsContent value="playoffs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{getDivisionName(selectedDivision)} Playoffs</h3>
            {currentSeason?.status === "active" && (
              <Button
                onClick={() => startPlayoffsMutation.mutate({ 
                  seasonId: currentSeason.id, 
                  division: selectedDivision 
                })}
                disabled={startPlayoffsMutation.isPending}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Start Playoffs
              </Button>
            )}
          </div>

          {playoffs?.length > 0 ? (
            <div className="space-y-6">
              {/* Group by rounds */}
              {[1, 2, 3].map((round) => {
                const roundMatches = playoffs.filter((match: PlayoffMatch) => match.round === round);
                if (roundMatches.length === 0) return null;

                return (
                  <div key={round} className="space-y-3">
                    <h4 className="text-md font-medium text-center">
                      {getRoundName(round)}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {roundMatches.map((match: PlayoffMatch) => (
                        <Card key={match.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-center flex-1">
                                <p className="font-medium">{match.team1?.name || "TBD"}</p>
                                <p className="text-sm text-gray-400">
                                  {match.team1?.wins}-{match.team1?.losses}
                                </p>
                              </div>
                              <div className="px-4">
                                <Badge variant={match.status === "completed" ? "default" : "secondary"}>
                                  {match.status === "completed" ? "Final" : "vs"}
                                </Badge>
                              </div>
                              <div className="text-center flex-1">
                                <p className="font-medium">{match.team2?.name || "TBD"}</p>
                                <p className="text-sm text-gray-400">
                                  {match.team2?.wins}-{match.team2?.losses}
                                </p>
                              </div>
                            </div>
                            {match.winnerId && (
                              <div className="mt-2 text-center">
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Winner: {match.winnerId === match.team1Id ? match.team1?.name : match.team2?.name}
                                </Badge>
                              </div>
                            )}
                            {match.scheduledDate && (
                              <p className="text-xs text-gray-500 text-center mt-2">
                                {new Date(match.scheduledDate).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Playoffs Active</h3>
                <p className="text-gray-400 mb-4">Playoffs haven't started for this division yet.</p>
                {currentSeason?.status === "active" && (
                  <Button
                    onClick={() => startPlayoffsMutation.mutate({ 
                      seasonId: currentSeason.id, 
                      division: selectedDivision 
                    })}
                    disabled={startPlayoffsMutation.isPending}
                  >
                    Initialize Playoffs
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="standings" className="space-y-4">
          <h3 className="text-lg font-semibold">{getDivisionName(selectedDivision)} Standings</h3>
          <div className="space-y-2">
            {leagueStandings?.map((team: any, index: number) => ( // Assuming leagueStandings items have at least id, name, wins, losses, draws, points
              <Card key={team.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={index < 4 ? "default" : "secondary"} className="w-8 text-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-gray-400">
                          {team.wins}-{team.losses}-{team.draws}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <AnimatedCounter value={team.points || 0} /> {/* Removed className, added fallback for points */}
                      <p className="text-xs text-gray-400">points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Championship History</h3>
          <div className="grid gap-4">
            {championshipHistory?.map((season: ChampionshipSeason) => ( // Used ChampionshipSeason type
              <Card key={season.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">{season.name}</p>
                        <p className="text-sm text-gray-400">Year {season.year}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{season.championTeam?.name}</p>
                      <p className="text-sm text-gray-400">{season.championTeam?.division}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}