import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient"; // queryClient might not be needed here
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import type { Team } from "shared/schema"; // Import Team type

// Define interfaces for data structures
interface ExhibitionStats {
  gamesPlayedToday: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winRate: number;
  totalGames: number;
  chemistryGained: number;
}

interface RecentGameOpponentTeam {
  name: string;
}

interface RecentGame {
  id: string;
  result: string;
  opponentTeam: RecentGameOpponentTeam;
  playedDate: string; // Assuming string from API, will be parsed to Date
  score: string;
  replayCode?: string; // Optional
  matchId?: string; // Match ID for navigation from findMatchMutation
}

interface FindMatchResponse {
  matchId: string;
}


export default function Exhibitions() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);

  const teamQuery = useQuery({
    queryKey: ["myTeam"], // Consistent query key with Dashboard
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as Team | undefined;

  const exhibitionStatsQuery = useQuery({
    queryKey: ["exhibitionStats"],
    queryFn: (): Promise<ExhibitionStats> => apiRequest("/api/exhibitions/stats"),
  });
  const exhibitionStats = exhibitionStatsQuery.data as ExhibitionStats | undefined;

  const recentGamesQuery = useQuery({
    queryKey: ["recentExhibitionGames"],
    queryFn: (): Promise<RecentGame[]> => apiRequest("/api/exhibitions/recent"),
  });
  const recentGames = recentGamesQuery.data as RecentGame[] | undefined;


  const findMatchMutation = useMutation({
    mutationFn: async (): Promise<FindMatchResponse> => {
      return apiRequest<FindMatchResponse>("/api/exhibitions/find-match", "POST");
    },
    onSuccess: (data: FindMatchResponse) => {
      if (data.matchId) {
        toast({
          title: "Match Found!",
          description: "Starting exhibition match...",
        });
        // Navigate to text-based match viewer
        // Ensure data.matchId is used, which is now correctly typed
        window.location.href = `/text-match/${data.matchId}`;
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

  const handleFindMatch = () => {
    if (exhibitionStats && exhibitionStats.gamesPlayedToday >= 3) {
      toast({
        title: "Daily Limit Reached",
        description: "You can only play 3 exhibition games per day.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    findMatchMutation.mutate();
  };

  const getResultColor = (result: string | undefined) => { // Added undefined check for result
    switch (result) {
      case "win": return "text-green-400";
      case "loss": return "text-red-400";
      case "draw": return "text-yellow-400";
      default: return "text-gray-400";
    }
  };

  const getResultIcon = (result: string | undefined) => { // Added undefined check for result
    switch (result) {
      case "win": return "🏆";
      case "loss": return "❌";
      case "draw": return "🤝";
      default: return "⚪";
    }
  };

  if (teamQuery.isLoading) { // Check isLoading for team query
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-400">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!team) { // Check if team data is null/undefined after loading
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Team Required</h1>
          <p className="text-gray-300 mb-8">Please create or select a team to access exhibition games.</p>
          {/* Optionally, add a button/link to team creation page */}
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Exhibition Arena</h1>
          <p className="text-gray-400">Practice matches for training and team chemistry</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Daily Exhibition Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-calendar-day text-blue-400"></i>
                Daily Exhibitions
              </CardTitle>
              <CardDescription>
                Risk-free training matches (3 per day)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Games Played Today</span>
                  <span>{exhibitionStats?.gamesPlayedToday || 0} / 3</span>
                </div>
                <Progress 
                  value={((exhibitionStats?.gamesPlayedToday || 0) / 3) * 100} 
                  className="h-2"
                />
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Benefits:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• No injury risk</li>
                  <li>• Minimal stamina loss</li>
                  <li>• Team chemistry boost</li>
                  <li>• Tactical practice</li>
                </ul>
              </div>

              <Button 
                className="w-full" 
                onClick={handleFindMatch}
                disabled={
                  isSearching ||
                  findMatchMutation.isPending ||
                  (exhibitionStats ? exhibitionStats.gamesPlayedToday >= 3 : false)
                }
              >
                {isSearching ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finding Match...
                  </div>
                ) : (
                  "Find Exhibition Match"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Exhibition Statistics */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-chart-bar text-green-400"></i>
                Exhibition Stats
              </CardTitle>
              <CardDescription>
                Your exhibition performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {exhibitionStats?.totalWins || 0}
                  </div>
                  <div className="text-xs text-gray-400">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {exhibitionStats?.totalLosses || 0}
                  </div>
                  <div className="text-xs text-gray-400">Losses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {exhibitionStats?.totalDraws || 0}
                  </div>
                  <div className="text-xs text-gray-400">Draws</div>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Win Rate:</span>
                  <span className="font-semibold">
                    {exhibitionStats?.winRate ? `${exhibitionStats.winRate}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Total Games:</span>
                  <span className="font-semibold">
                    {exhibitionStats?.totalGames || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Chemistry Gained:</span>
                  <span className="font-semibold text-blue-400">
                    +{exhibitionStats?.chemistryGained || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Match Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-cogs text-purple-400"></i>
                Match Settings
              </CardTitle>
              <CardDescription>
                Exhibition game configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Match Duration:</span>
                  <Badge variant="outline">2 x 10 minutes</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Injury Risk:</span>
                  <Badge className="bg-green-500">None</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Stamina Loss:</span>
                  <Badge className="bg-blue-500">Minimal</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Matchmaking:</span>
                  <Badge className="bg-purple-500">Auto</Badge>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="text-xs text-gray-500">
                Exhibition matches are automatically saved and can be reviewed 
                for tactical analysis. Perfect for testing new formations and strategies.
              </div>
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
              Your last 10 exhibition matches
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
                        onClick={() => window.location.href = `/text-match/${game.id}`}
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
                <i className="fas fa-gamepad text-4xl mb-4"></i>
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