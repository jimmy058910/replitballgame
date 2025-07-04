import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeagueStandings from "@/components/LeagueStandings";
import LeagueSchedule from "@/components/LeagueSchedule";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Gamepad2, Calendar, Users, Clock, X, Target, Zap } from "lucide-react";
import { HelpIcon } from "@/components/help";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  division: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  teamPower: number;
  teamCamaraderie: number;
  credits: number;
}

interface SeasonalCycle {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  details: string;
  daysUntilPlayoffs: number;
  daysUntilNewSeason: number;
}

interface ExhibitionStats {
  gamesPlayedToday: number;
  exhibitionEntriesUsedToday: number;
}

interface ExhibitionMatch {
  id: string;
  type: string;
  status: string;
  result?: string;
  score?: string;
  opponentTeam?: { name: string };
  playedDate?: string;
  replayCode?: string;
}

function ExhibitionsTab() {
  const { toast } = useToast();
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);

  const { data: rawExhibitionStats } = useQuery({
    queryKey: ["/api/exhibitions/stats"],
  });
  const exhibitionStats = (rawExhibitionStats || {}) as ExhibitionStats;

  const { data: rawLiveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000,
  });
  const liveMatches = (rawLiveMatches || []) as ExhibitionMatch[];

  const { data: rawAvailableOpponents } = useQuery({
    queryKey: ["/api/exhibitions/available-opponents"],
    enabled: showOpponentSelect,
  });
  const availableOpponents = (rawAvailableOpponents || []) as Team[];

  const { data: rawRecentGames } = useQuery({
    queryKey: ["/api/exhibitions/recent"],
  });
  const recentGames = (rawRecentGames || []) as ExhibitionMatch[];

  // Calculate remaining games
  const gamesPlayedToday = exhibitionStats?.gamesPlayedToday || 0;
  const freeGamesRemaining = Math.max(0, 3 - gamesPlayedToday);
  const exhibitionEntriesUsed = exhibitionStats?.exhibitionEntriesUsedToday || 0;
  const entryGamesRemaining = Math.max(0, 3 - exhibitionEntriesUsed);
  const totalGamesRemaining = freeGamesRemaining + entryGamesRemaining;

  // Check if there's a live exhibition match
  const hasLiveExhibition = liveMatches?.some((match: any) => match.type === 'exhibition');

  const instantExhibitionMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/exhibitions/instant-match", "POST");
      return result;
    },
    onSuccess: (data) => {
      if (data.matchId) {
        const homeAway = data.isHome ? "home" : "away";
        toast({
          title: "Instant Exhibition Started!",
          description: `Starting ${homeAway} match against ${data.opponentName}`,
        });
        window.location.href = `/match/${data.matchId}`;
      } else {
        toast({
          title: "Match Creation Failed",
          description: "No match ID received from server",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Match Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectOpponentMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      return await apiRequest("/api/exhibitions/challenge-opponent", "POST", { opponentId });
    },
    onSuccess: (data) => {
      if (data.matchId) {
        const homeAway = data.isHome ? "home" : "away";
        toast({
          title: "Exhibition Match Started!",
          description: `Starting ${homeAway} match against ${data.opponentName}`,
        });
        setShowOpponentSelect(false);
        window.location.href = `/match/${data.matchId}`;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Challenge Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInstantExhibition = () => {
    if (hasLiveExhibition) {
      toast({
        title: "Exhibition Already Running",
        description: "You can only have one live exhibition match at a time.",
        variant: "destructive",
      });
      return;
    }

    if (totalGamesRemaining <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've used all your exhibition games for today.",
        variant: "destructive",
      });
      return;
    }
    
    instantExhibitionMutation.mutate();
  };

  const handleChooseOpponent = () => {
    if (hasLiveExhibition) {
      toast({
        title: "Exhibition Already Running",
        description: "You can only have one live exhibition match at a time.",
        variant: "destructive",
      });
      return;
    }

    if (totalGamesRemaining <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've used all your exhibition games for today.",
        variant: "destructive",
      });
      return;
    }

    setShowOpponentSelect(true);
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "win": return "text-green-400";
      case "loss": return "text-red-400";
      case "draw": return "text-yellow-400";
      default: return "text-gray-400";
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "win": return "🏆";
      case "loss": return "❌";
      case "draw": return "🤝";
      default: return "⚪";
    }
  };

  return (
    <div className="space-y-6">
      {hasLiveExhibition && (
        <Card className="bg-orange-900 border-orange-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <Zap className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-orange-200">Live Exhibition Match Running</p>
                <p className="text-sm text-orange-300">Only one exhibition match allowed at a time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Games Remaining */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-blue-400" />
              Daily Exhibition Games
            </CardTitle>
            <p className="text-sm text-gray-400">
              Track your remaining exhibition opportunities
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{freeGamesRemaining}</div>
                <div className="text-xs text-gray-400">Free Games Left</div>
                <div className="text-xs text-gray-500">({gamesPlayedToday}/3 used)</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{entryGamesRemaining}</div>
                <div className="text-xs text-gray-400">Entry Games Left</div>
                <div className="text-xs text-gray-500">({exhibitionEntriesUsed}/3 used)</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Games Remaining Today</span>
                <span className="font-semibold">{totalGamesRemaining}</span>
              </div>
              <Progress 
                value={((6 - totalGamesRemaining) / 6) * 100} 
                className="h-2"
              />
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Exhibition Benefits & Rewards:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Credits earned for wins/draws</li>
                <li>• Player experience points</li>
                <li>• Team chemistry improvement</li>
                <li>• Tactical practice & strategy testing</li>
                <li>• Minimal injury risk & stamina loss</li>
                <li>• No impact on league standings</li>
              </ul>
              
              <div className="mt-3 p-2 bg-blue-900/30 rounded border border-blue-700">
                <div className="text-xs font-semibold text-blue-300">Daily Limits:</div>
                <div className="text-xs text-blue-200">
                  • 3 FREE exhibition games per day<br/>
                  • 3 additional games with Exhibition Entry items<br/>
                  • Purchase entries in Market &gt; Store &gt; Entries tab
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exhibition Options */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Exhibition Options
            </CardTitle>
            <p className="text-sm text-gray-400">
              Choose your exhibition match type
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Option 1: Instant Exhibition */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  1) Instant Exhibition
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Start an immediate exhibition match against other teams in your division, near your power level, or AI. Games begin instantly!
                </p>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleInstantExhibition}
                  disabled={
                    instantExhibitionMutation.isPending ||
                    hasLiveExhibition ||
                    totalGamesRemaining <= 0
                  }
                >
                  {instantExhibitionMutation.isPending ? "Finding Opponent..." : "Start Instant Exhibition"}
                </Button>
              </div>

              {/* Option 2: Exhibition Match */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  2) Exhibition Match
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Browse and select from available opponents in your division for a strategic exhibition match.
                </p>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleChooseOpponent}
                  disabled={
                    hasLiveExhibition ||
                    totalGamesRemaining <= 0
                  }
                >
                  Choose Opponent
                </Button>
              </div>

              {(hasLiveExhibition || totalGamesRemaining <= 0) && (
                <div className="text-sm text-gray-500 p-3 bg-gray-700 rounded">
                  {hasLiveExhibition ? 
                    "Complete your current exhibition match before starting another." :
                    "You've reached your daily exhibition limit. Reset at 3AM Eastern."
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exhibition Games */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-history text-gray-400"></i>
            Recent Exhibition Games
          </CardTitle>
          <p className="text-sm text-gray-400">
            Your recent exhibition match results
          </p>
        </CardHeader>
        <CardContent>
          {recentGames?.length ? (
            <div className="space-y-3">
              {recentGames.map((game: any) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getResultIcon(game.result)}</span>
                    <div>
                      <div className="font-semibold">
                        vs {game.opponentTeam?.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(game.playedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${getResultColor(game.result)}`}>
                      {game.score}
                    </div>
                    <div className="text-sm text-gray-400">
                      {game.result?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>
                  
                  {game.replayCode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/match/${game.id}`}
                    >
                      <i className="fas fa-play mr-1"></i>
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Gamepad2 className="h-12 w-12 mx-auto mb-4" />
              <p>No exhibition games played yet</p>
              <p className="text-sm">Start your first exhibition match above!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opponent Selection Dialog */}
      <Dialog open={showOpponentSelect} onOpenChange={setShowOpponentSelect}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Exhibition Opponent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableOpponents?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableOpponents.map((opponent: any) => (
                  <Card key={opponent.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-center">
                        <h3 className="font-semibold text-white">{opponent.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          Division {opponent.division}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-400">Team Power:</div>
                        <div className="text-white">{opponent.teamPower || 0}</div>
                        <div className="text-gray-400">Rewards:</div>
                        <div className="text-yellow-400">{opponent.rewards?.credits || 0}₡</div>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => selectOpponentMutation.mutate(opponent.id)}
                        disabled={selectOpponentMutation.isPending}
                      >
                        {selectOpponentMutation.isPending ? "Starting..." : "Start Match"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No opponents available right now</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Competition() {
  const [browsingTeams, setBrowsingTeams] = useState(false);
  const [divisionTeams, setDivisionTeams] = useState([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: liveMatches } = useQuery<any[]>({
    queryKey: ["/api/matches/live"],
  });

  const { data: teamMatches } = useQuery<any[]>({
    queryKey: ["/api/team-matches", team?.id],
    enabled: !!team?.id,
  });

  const { data: tournaments } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: rawCurrentCycle } = useQuery<SeasonalCycle>({
    queryKey: ["/api/season/current-cycle"],
  });

  // Type assertion to fix property access issues
  const currentCycle = (rawCurrentCycle || {}) as SeasonalCycle;

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
      return await apiRequest("/api/exhibitions/challenge-opponent", "POST", {
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-center">Competition Hub</h1>
          <p className="text-gray-400 text-center max-w-2xl mx-auto">
            Compete in leagues, tournaments, and exhibition matches. Track your progress and climb the rankings across all divisions.
          </p>
        </div>

        {/* Enhanced Dynamic Dashboard Header */}
        {currentCycle && (
          <Card className="bg-gradient-to-r from-purple-900 to-blue-900 border-purple-700 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 bg-opacity-30 p-3 rounded-full">
                    <Calendar className="h-8 w-8 text-purple-200" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-purple-200 mb-1">{currentCycle?.season}</div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {(currentCycle as any)?.phaseTitle || currentCycle?.description}
                    </h2>
                    <p className="text-purple-100 text-sm mb-2">
                      {currentCycle?.description}
                    </p>
                    <p className="text-purple-200 text-sm font-medium">
                      {(currentCycle as any)?.dynamicDetail || currentCycle?.details}
                    </p>
                    {/* Progress bar for Regular Season */}
                    {currentCycle?.phase === "Regular Season" && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-purple-200 mb-1">
                          <span>Regular Season Progress</span>
                          <span>Day {currentCycle?.currentDay}/14</span>
                        </div>
                        <div className="w-full bg-purple-800 bg-opacity-50 rounded-full h-2">
                          <div 
                            className="bg-purple-300 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(currentCycle?.currentDay / 14) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right min-w-[140px]">
                  <div className="text-lg font-bold text-white mb-1">Day {currentCycle?.currentDay}/17</div>
                  <Badge 
                    variant={currentCycle?.phase === "Regular Season" ? "default" : 
                            currentCycle?.phase === "Playoffs" ? "destructive" : "secondary"}
                    className={`text-xs mb-2 ${
                      currentCycle?.phase === "Playoffs" ? "bg-yellow-600 text-yellow-100" : ""
                    }`}
                  >
                    {currentCycle?.phase}
                  </Badge>
                  {(currentCycle as any)?.countdownText && (
                    <div className="text-xs text-purple-200 mt-1 font-semibold">
                      {(currentCycle as any)?.countdownText}
                    </div>
                  )}
                  {/* Legacy countdown fallbacks */}
                  {!(currentCycle as any)?.countdownText && (currentCycle?.daysUntilPlayoffs || 0) > 0 && (
                    <div className="text-xs text-purple-200 mt-1">
                      {currentCycle?.daysUntilPlayoffs} days to playoffs
                    </div>
                  )}
                  {!(currentCycle as any)?.countdownText && (currentCycle?.daysUntilNewSeason || 0) > 0 && currentCycle?.phase === "Off-Season" && (
                    <div className="text-xs text-purple-200 mt-1">
                      {currentCycle?.daysUntilNewSeason} days to new season
                    </div>
                  )}
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
                    <HelpIcon content="Your team's current league standing. Division 1 is elite, Division 8 is for new teams. Win matches to earn points and climb the rankings!" />
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
                        <div 
                          key={match.id} 
                          className="flex justify-between items-center p-3 rounded bg-red-900/20 border border-red-700 cursor-pointer hover:bg-red-900/30 transition-colors"
                          onClick={() => setLocation(`/match/${match.id}`)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {match.homeTeamName || "Home"} vs {match.awayTeamName || "Away"}
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
            <ExhibitionsTab />
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