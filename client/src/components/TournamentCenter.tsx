import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Calendar, Users, Coins, Gem, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface TournamentCenterProps {
  teamId?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  division: number;
  credits: number;
  gems: number;
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  division: number;
  season: number;
  gameDay: number;
  entryFeeCredits: number;
  entryFeeGems: number;
  requiresEntryItem: boolean;
  maxTeams: number;
  status: string;
  prizes: any;
  registrationDeadline: string;
  tournamentStartTime: string;
}

interface TournamentEntry {
  id: string;
  tournamentId: string;
  placement: number;
  creditsWon: number;
  gemsWon: number;
  tournament: {
    name: string;
    type: string;
    gameDay: number;
  };
  entryTime: string;
}

const TournamentCenter: React.FC<TournamentCenterProps> = ({ teamId }) => {
  const { toast } = useToast();

  // Fetch team info
  const { data: teamInfo } = useQuery<TeamInfo>({
    queryKey: ["/api/teams/my"],
    enabled: !!teamId,
  });

  // Fetch current season info
  const { data: seasonInfo } = useQuery({
    queryKey: ["/api/season/current-cycle"],
  });

  // Fetch available tournaments
  const { data: availableTournaments, isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/new-tournaments/available"],
    enabled: !!teamId,
  });

  // Fetch team's tournament history
  const { data: tournamentHistory } = useQuery<TournamentEntry[]>({
    queryKey: ["/api/new-tournaments/team", teamId, "history"],
    queryFn: () => apiRequest(`/api/new-tournaments/team/${teamId}/history`),
    enabled: !!teamId,
  });

  // Fetch team's current tournament entries
  const { data: myTournaments } = useQuery({
    queryKey: ["/api/new-tournaments/team", teamId],
    queryFn: () => apiRequest(`/api/new-tournaments/team/${teamId}`),
    enabled: !!teamId,
  });

  // Tournament entry mutation
  const enterTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return await apiRequest(`/api/new-tournaments/${tournamentId}/enter`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Successfully Entered!",
        description: "You have been entered into the tournament.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Entry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDivisionName = (division: number): string => {
    const names = ['', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Copper', 'Stone', 'Copper'];
    return names[division] || 'Unknown';
  };

  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const target = new Date(deadline);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return "Registration Closed";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getPlacementText = (placement: number): string => {
    if (placement === 1) return "Champion";
    if (placement === 2) return "Runner-Up";
    if (placement <= 4) return `Eliminated in Semifinals`;
    if (placement <= 8) return `Eliminated in Quarterfinals`;
    return `Eliminated in Round ${Math.ceil(Math.log2(placement))}`;
  };

  // Find tournaments
  const midSeasonCup = availableTournaments?.find(t => t.type === "mid_season_classic");
  const dailyDivisionalCup = availableTournaments?.find(t => t.type === "daily_divisional_cup");
  
  const currentGameDay = (seasonInfo as any)?.day || 1;
  const isTournamentDay = currentGameDay === 7;

  if (!teamInfo) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tournament Center</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Compete against the best teams for credits, gems, and eternal glory
        </p>
      </div>

      {/* Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Divisional Cup - LEFT SIDE */}
        <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-xl text-blue-800 dark:text-blue-200">
                Daily Divisional Cup
              </CardTitle>
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              Daily competition for {getDivisionName(teamInfo.division)} Division teams
            </p>
          </CardHeader>
          <CardContent className="text-center">
            {!dailyDivisionalCup ? (
              <div className="space-y-4">
                <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Entry Requirements
                  </p>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    • Tournament Entry Item required<br/>
                    • Available for Divisions 2-8<br/>
                    • 5% injury risk, -10 stamina
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  No tournament available today
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Entry Fee: Tournament Entry Item
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-blue-600" />
                      <span className="font-bold">15,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">25💎</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => enterTournamentMutation.mutate(dailyDivisionalCup.id)}
                  disabled={enterTournamentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {enterTournamentMutation.isPending ? "Entering..." : "Enter Tournament"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mid-Season Cup - RIGHT SIDE */}
        <Card className="border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Trophy className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-xl text-purple-800 dark:text-purple-200">
                The Mid-Season Cup
              </CardTitle>
            </div>
            <p className="text-purple-700 dark:text-purple-300">
              Premier tournament open to all divisions with massive prizes
            </p>
          </CardHeader>
          <CardContent className="text-center">
            {!midSeasonCup ? (
              <div className="space-y-4">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    Tournament Details
                  </p>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    • Entry: 10,000₡ or 20💎<br/>
                    • Tournament Day: Day 7 at 1PM<br/>
                    • 20% injury risk, -30 stamina
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    {getDivisionName(teamInfo.division)} Division Prize Preview
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">50,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">100💎</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">Trophy</span>
                    </div>
                  </div>
                </div>
                {isTournamentDay ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    Tournament in progress - registration closed
                  </Badge>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Timer className="w-5 h-5 text-purple-600" />
                      <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                        Starts Day 7 at 1PM
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Registration Open
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    Entry Fee: 10,000₡ or 20💎
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">50,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold">100💎</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => enterTournamentMutation.mutate(midSeasonCup.id)}
                  disabled={enterTournamentMutation.isPending || isTournamentDay}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {enterTournamentMutation.isPending ? "Entering..." : "Enter Tournament"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tournament History Section */}
      {tournamentHistory && tournamentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Tournament History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tournamentHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold">{entry.tournament.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Day {entry.tournament.gameDay} • {getPlacementText(entry.placement)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {entry.creditsWon > 0 && (
                        <span className="flex items-center space-x-1 text-sm">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span>{entry.creditsWon.toLocaleString()}₡</span>
                        </span>
                      )}
                      {entry.gemsWon > 0 && (
                        <span className="flex items-center space-x-1 text-sm">
                          <Gem className="w-4 h-4 text-purple-600" />
                          <span>{entry.gemsWon}💎</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current Day: {currentGameDay} | Game Phase: {isTournamentDay ? "Tournament Day" : "Regular Season"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentCenter;