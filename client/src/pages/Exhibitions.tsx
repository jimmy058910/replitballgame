import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Target, Zap, Users } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface ExhibitionStats {
  gamesPlayedToday: number;
  exhibitionEntriesUsedToday: number;
}

interface Match {
  id: string;
  type: string;
  status: string;
}

export default function Exhibitions() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);

  const { data: rawTeam } = useQuery({
    queryKey: ["/api/teams/my"],
  });
  const team = (rawTeam || {}) as Team;

  const { data: rawExhibitionStats } = useQuery({
    queryKey: ["/api/exhibitions/stats"],
  });
  const exhibitionStats = (rawExhibitionStats || {}) as ExhibitionStats;

  const { data: rawLiveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000,
  });
  const liveMatches = (rawLiveMatches || []) as Match[];

  const { data: rawAvailableOpponents } = useQuery({
    queryKey: ["/api/exhibitions/available-opponents"],
    enabled: showOpponentSelect,
  });
  const availableOpponents = (rawAvailableOpponents || []) as Team[];

  const { data: rawRecentGames } = useQuery({
    queryKey: ["/api/exhibitions/recent"],
  });
  const recentGames = (rawRecentGames || []) as Match[];

  // Calculate remaining games
  const gamesPlayedToday = exhibitionStats?.gamesPlayedToday || 0;
  const freeGamesRemaining = Math.max(0, 3 - gamesPlayedToday);
  const exhibitionEntriesUsed = exhibitionStats?.exhibitionEntriesUsedToday || 0;
  const entryGamesRemaining = Math.max(0, 3 - exhibitionEntriesUsed);
  const totalGamesRemaining = freeGamesRemaining + entryGamesRemaining;

  // Check if there's a live exhibition match
  const hasLiveExhibition = liveMatches?.some((match: any) => match.type === 'exhibition');

  const findMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/exhibitions/find-match", "POST");
    },
    onSuccess: (data) => {
      if (data.matchId) {
        const opponentType = data.opponentType === 'user' ? 'user team' : 'AI team';
        toast({
          title: "Match Found!",
          description: `Starting exhibition match against ${data.opponentName} (${opponentType})`,
        });
        window.location.href = `/match/${data.matchId}`;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Match Finding Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSearching(false);
    },
  });

  const selectOpponentMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      return await apiRequest("/api/exhibitions/challenge-opponent", "POST", { opponentId });
    },
    onSuccess: (data) => {
      if (data.matchId) {
        toast({
          title: "Challenge Sent!",
          description: "Starting exhibition match...",
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

  const handleFindMatch = () => {
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
    
    setIsSearching(true);
    findMatchMutation.mutate();
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

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Team Found</h2>
          <p className="text-gray-400">You need to create a team first to play exhibition games.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Exhibition Arena</h1>
          <p className="text-gray-400">Challenge other users' teams for practice matches and team chemistry</p>
        </div>

        {hasLiveExhibition && (
          <Card className="bg-orange-900 border-orange-700 mb-6">
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
              <CardDescription>
                Track your remaining exhibition opportunities
              </CardDescription>
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
              <CardDescription>
                Choose your exhibition match type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start h-auto p-4" 
                  variant="outline"
                  onClick={handleFindMatch}
                  disabled={
                    isSearching || 
                    findMatchMutation.isPending ||
                    hasLiveExhibition ||
                    totalGamesRemaining <= 0
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Start Exhibition Match</div>
                      <div className="text-sm text-gray-400">Auto-match vs similar user team</div>
                    </div>
                  </div>
                  {isSearching && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  )}
                </Button>

                <Dialog open={showOpponentSelect} onOpenChange={setShowOpponentSelect}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full justify-start h-auto p-4" 
                      variant="outline"
                      onClick={handleChooseOpponent}
                      disabled={hasLiveExhibition || totalGamesRemaining <= 0}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-500 p-2 rounded">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Choose Opponent</div>
                          <div className="text-sm text-gray-400">Select from 6 similar teams</div>
                        </div>
                      </div>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Choose Your Opponent</DialogTitle>
                      <DialogDescription>
                        Select a team with similar power rating for a balanced match
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {availableOpponents?.map((opponent: any) => (
                        <Button
                          key={opponent.id}
                          variant="outline"
                          className="h-auto p-4 justify-start"
                          onClick={() => selectOpponentMutation.mutate(opponent.id)}
                          disabled={selectOpponentMutation.isPending}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <div className="font-semibold">{opponent.name}</div>
                                <div className="text-sm text-gray-400">
                                  Division {opponent.division} • Power: {opponent.teamPower}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">
                                {opponent.record || "0-0-0"}
                              </Badge>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(hasLiveExhibition || totalGamesRemaining <= 0) && (
                <div className="text-sm text-gray-500 p-3 bg-gray-700 rounded">
                  {hasLiveExhibition ? 
                    "Complete your current exhibition match before starting another." :
                    "You've reached your daily exhibition limit. Reset at 3AM Eastern."
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Exhibition Games */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-history text-gray-400"></i>
              Recent Exhibition Games
            </CardTitle>
            <CardDescription>
              Your recent exhibition match results
            </CardDescription>
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
                        {game.result.toUpperCase()}
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
      </div>
    </div>
  );
}