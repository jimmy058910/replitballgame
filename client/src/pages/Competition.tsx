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
import TournamentCenter from "@/components/TournamentCenter";


import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Gamepad2, Calendar, Users, Clock, X, Target, Zap, HelpCircle } from "lucide-react";
import { HelpIcon } from "@/components/help";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface TournamentStats {
  gamesPlayedToday: number;
  tournamentEntriesUsedToday: number;
}

interface ChallengeResponse {
  matchId: string;
  success: boolean;
  message?: string;
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

function TournamentsTab() {
  const { toast } = useToast();
  const [showOpponentSelect, setShowOpponentSelect] = useState(false);

  const { data: rawTournamentStats } = useQuery({
    queryKey: ["/api/daily-tournaments/stats"],
  });
  const tournamentStats = (rawTournamentStats || {}) as TournamentStats;

  const { data: rawLiveMatches } = useQuery({
    queryKey: ["/api/matches/live"],
    refetchInterval: 5000,
  });
  const liveMatches = (rawLiveMatches || []) as ExhibitionMatch[];

  const { data: rawAvailableOpponents } = useQuery({
    queryKey: ["/api/daily-tournaments/available-opponents"],
    enabled: showOpponentSelect,
  });
  const availableOpponents = (rawAvailableOpponents || []) as Team[];

  const { data: rawRecentGames } = useQuery({
    queryKey: ["/api/daily-tournaments/recent"],
  });
  const recentGames = (rawRecentGames || []) as ExhibitionMatch[];

  // Calculate remaining games - Tournament system: 1 free + 1 with entry item
  const gamesPlayedToday = (tournamentStats as TournamentStats)?.gamesPlayedToday || 0;
  const freeGamesRemaining = Math.max(0, 1 - gamesPlayedToday);
  const tournamentEntriesUsed = (tournamentStats as TournamentStats)?.tournamentEntriesUsedToday || 0;
  const entryGamesRemaining = Math.max(0, 1 - tournamentEntriesUsed);
  const totalGamesRemaining = freeGamesRemaining + entryGamesRemaining;

  // Check if there's a live tournament match
  const hasLiveTournament = liveMatches?.some((match: any) => match.type === 'tournament');

  const instantTournamentMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/daily-tournaments/instant-match", "POST");
      return result;
    },
    onSuccess: (data) => {
      if (data.matchId) {
        const homeAway = data.isHome ? "home" : "away";
        toast({
          title: "Instant Tournament Started!",
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
        title: "Tournament Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectOpponentMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      return await apiRequest("/api/daily-tournaments/challenge-opponent", "POST", { opponentId });
    },
    onSuccess: (data) => {
      if (data.matchId) {
        const homeAway = data.isHome ? "home" : "away";
        toast({
          title: "Tournament Match Started!",
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

  const handleInstantTournament = () => {
    if (hasLiveTournament) {
      toast({
        title: "Tournament Already Running",
        description: "You can only have one live tournament match at a time.",
        variant: "destructive",
      });
      return;
    }

    if (totalGamesRemaining <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've used all your tournament games for today.",
        variant: "destructive",
      });
      return;
    }
    
    instantTournamentMutation.mutate();
  };

  const handleChooseOpponent = () => {
    if (hasLiveTournament) {
      toast({
        title: "Tournament Already Running",
        description: "You can only have one live tournament match at a time.",
        variant: "destructive",
      });
      return;
    }

    if (totalGamesRemaining <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've used all your tournament games for today.",
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
      {hasLiveTournament && (
        <Card className="bg-yellow-900 border-yellow-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-yellow-200">Live Tournament Match Running</p>
                <p className="text-sm text-yellow-300">Only one tournament match allowed at a time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Tournament Games */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Daily Tournament Games
            </CardTitle>
            <p className="text-sm text-gray-400">
              Track your remaining tournament opportunities
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Free Games Remaining Today:</span>
                <span className="font-semibold text-green-400">{freeGamesRemaining}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Entry Items Available:</span>
                <span className="font-semibold text-purple-400">{entryGamesRemaining}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-600 pt-3">
                <span className="text-gray-300">Total Games Remaining Today:</span>
                <span className="font-semibold text-yellow-400">{totalGamesRemaining}</span>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Tournament Benefits & Rewards:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• <span className="text-yellow-300">Competitive Environment:</span> Face skilled opponents in high-stakes matches</li>
                <li>• <span className="text-green-300">Premium Credits:</span> Earn significantly more credits than exhibitions (750₡ win, 300₡ tie, 150₡ loss)</li>
                <li>• <span className="text-purple-300">Tournament Ranking:</span> Build your tournament record and climb competitive leaderboards</li>
                <li>• <span className="text-orange-300">Contribute to Ad Rewards:</span> Watching the halftime ad counts towards your daily and milestone ad rewards</li>
                <li>• <span className="text-cyan-300">Meaningful Stakes:</span> Player stamina and development affected - choose your strategy wisely</li>
              </ul>
              
              <div className="mt-3 p-2 bg-yellow-900/30 rounded border border-yellow-700">
                <div className="text-xs font-semibold text-yellow-300">Daily Limits:</div>
                <div className="text-xs text-yellow-200">
                  • 1 FREE tournament game per day<br/>
                  • 1 additional game with Tournament Entry item<br/>
                  • Purchase entries in Market &gt; Store &gt; Entries tab
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Options */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-400" />
              Tournament Options
            </CardTitle>
            <p className="text-sm text-gray-400">
              Choose your tournament match type
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
              <div className="space-y-4">
                {/* Option 1: Instant Tournament */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    1) Instant Tournament
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-yellow-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Quick competitive matchmaking. System finds the best available opponent based on division and tournament ranking. Perfect for immediate competitive play.</p>
                      </TooltipContent>
                    </Tooltip>
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Start an immediate tournament match against other competitive teams in your division. Games have meaningful consequences!
                  </p>
                <Button 
                  className="w-full bg-yellow-600 hover:bg-yellow-700" 
                  variant="default"
                  onClick={handleInstantTournament}
                  disabled={
                    instantTournamentMutation.isPending ||
                    hasLiveTournament ||
                    totalGamesRemaining <= 0
                  }
                >
                  {instantTournamentMutation.isPending ? "Finding Opponent..." : "Start Instant Tournament"}
                </Button>
              </div>

              {/* Option 2: Tournament Challenge */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Medal className="h-5 w-5 text-yellow-400" />
                  2) Tournament Challenge
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-yellow-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Strategic opponent selection. Browse available teams, compare tournament records, and choose your competitive matchup. Perfect for targeted challenges.</p>
                    </TooltipContent>
                  </Tooltip>
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Browse and select from available tournament opponents in your division for a strategic competitive match.
                </p>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleChooseOpponent}
                  disabled={
                    hasLiveTournament ||
                    totalGamesRemaining <= 0
                  }
                >
                  Choose Opponent
                </Button>
              </div>

              {(hasLiveTournament || totalGamesRemaining <= 0) && (
                <div className="text-sm text-gray-500 p-3 bg-gray-700 rounded">
                  {hasLiveTournament ? 
                    "Complete your current tournament match before starting another." :
                    "You've reached your daily tournament limit. Reset at 3AM Eastern."
                  }
                </div>
              )}
            </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tournament Games */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gray-400" />
            Recent Tournament Games
          </CardTitle>
          <p className="text-sm text-gray-400">
            Your recent competitive tournament results
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
                      {game.score || (game.result === 'pending' ? 'In Progress' : 'Not Started')}
                    </div>
                    <div className="text-sm text-gray-400">
                      {game.result === 'win' ? 'Victory' : 
                       game.result === 'loss' ? 'Defeat' : 
                       game.result === 'draw' ? 'Draw' : 
                       'Live Match'}
                    </div>
                  </div>
                  
                  {game.replayCode && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.location.href = `/replay/${game.replayCode}`}
                    >
                      Replay
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No recent tournament games</p>
              <p className="text-sm text-gray-500">Start your first tournament match to build your competitive record!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opponent Selection Dialog */}
      <Dialog open={showOpponentSelect} onOpenChange={setShowOpponentSelect}>
        <DialogContent className="max-w-4xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Choose Tournament Opponent</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-96 overflow-y-auto">
            {availableOpponents?.map((opponent) => (
              <Card key={opponent.id} className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => selectOpponentMutation.mutate(opponent.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">{opponent.name}</h3>
                      <p className="text-sm text-gray-400">Division {opponent.division}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400">Power: {opponent.teamPower}</div>
                      <div className="text-sm text-gray-400">
                        {opponent.wins}W - {opponent.losses}L - {opponent.draws}D
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
            <div className="space-y-3 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Free Games Remaining Today:</span>
                <span className="font-semibold text-green-400">{freeGamesRemaining}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Entry Items Available:</span>
                <span className="font-semibold text-purple-400">{entryGamesRemaining}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-600 pt-3">
                <span className="text-gray-300">Total Games Remaining Today:</span>
                <span className="font-semibold text-blue-400">{totalGamesRemaining}</span>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Exhibition Benefits & Rewards:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• <span className="text-blue-300">Test Tactics & Lineups:</span> Safely experiment with new strategies before important matches</li>
                <li>• <span className="text-green-300">Earn Credits:</span> Gain a small but consistent amount of Credits for playing</li>
                <li>• <span className="text-purple-300">Build Team Camaraderie:</span> Winning exhibition games provides a small boost to team morale</li>
                <li>• <span className="text-orange-300">Contribute to Ad Rewards:</span> Watching the halftime ad counts towards your daily and milestone ad rewards</li>
                <li>• <span className="text-cyan-300">Risk-Free:</span> No impact on player stamina, injury status, or league standings (minimal player development only)</li>
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
            <TooltipProvider>
              <div className="space-y-4">
                {/* Option 1: Instant Exhibition */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-400" />
                    1) Instant Exhibition
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-blue-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Quick automatic matchmaking. System finds the best available opponent based on division and power rating. Perfect for immediate play without browsing.</p>
                      </TooltipContent>
                    </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-purple-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Manual opponent selection. Browse available teams, compare power ratings, and strategically choose your matchup. Perfect for testing specific tactics.</p>
                    </TooltipContent>
                  </Tooltip>
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
            </TooltipProvider>
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
                        {game.playedDate || 'Date not available'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${getResultColor(game.result)}`}>
                      {game.score || (game.result === 'pending' ? 'Scheduled' : 
                                     game.result === 'in_progress' ? 'Live Match' : 'Not Started')}
                    </div>
                    <div className="text-sm text-gray-400">
                      {game.result === 'win' ? 'Victory' : 
                       game.result === 'loss' ? 'Defeat' : 
                       game.result === 'draw' ? 'Draw' : 
                       game.result === 'in_progress' ? 'Live Match' : 'Scheduled'}
                    </div>
                  </div>
                  
                  {(game.result === 'win' || game.result === 'loss' || game.result === 'draw') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/match/${game.id}`}
                    >
                      <i className="fas fa-chart-line mr-1"></i>
                      View Summary
                    </Button>
                  )}
                  {game.result === 'in_progress' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/match/${game.id}`}
                    >
                      <i className="fas fa-play mr-1"></i>
                      Watch Live
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
  const [divisionTeams, setDivisionTeams] = useState<Team[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    queryFn: () => apiRequest("/api/teams/my"),
  });

  const { data: liveMatches, isLoading: liveMatchesLoading } = useQuery<any[]>({
    queryKey: ["/api/matches/live"],
    queryFn: () => apiRequest("/api/matches/live"),
  });

  const { data: teamMatches, isLoading: teamMatchesLoading } = useQuery<any[]>({
    queryKey: ["/api/team-matches", team?.id],
    enabled: false, // Temporarily disabled - endpoint not implemented
  });

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
    queryFn: () => apiRequest("/api/tournaments"),
    enabled: false, // Temporarily disabled - endpoint not implemented
  });

  const { data: rawCurrentCycle, isLoading: currentCycleLoading } = useQuery<SeasonalCycle>({
    queryKey: ["/api/season/current-cycle"],
    queryFn: () => apiRequest("/api/season/current-cycle"),
  });

  // Type assertion to fix property access issues
  const currentCycle = (rawCurrentCycle || {}) as SeasonalCycle;

  const browseMutation = useMutation({
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
      return await apiRequest("/api/exhibitions/challenge-opponent", "POST", {
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

          <TabsContent value="league" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <TournamentCenter teamId={team?.id} />
          </TabsContent>

          <TabsContent value="exhibitions" className="space-y-6">
            <ExhibitionsTab />
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