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

  // Find Mid-Season Classic and Daily Divisional Cup
  const midSeasonClassic = availableTournaments?.find(t => t.type === "mid_season_classic");
  const dailyDivisionalCup = availableTournaments?.find(t => t.type === "daily_divisional_cup");
  
  const currentGameDay = (seasonInfo as any)?.day || 1;
  const isRegistrationDay = currentGameDay === 6;
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

      {/* Mid-Season Classic Panel */}
      <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <CardTitle className="text-2xl text-yellow-800 dark:text-yellow-200">
              The Mid-Season Classic
            </CardTitle>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300">
            The premier tournament of the season. Compete against the best in your division for massive prizes.
          </p>
        </CardHeader>
        <CardContent className="text-center">
          {currentGameDay < 6 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Timer className="w-5 h-5 text-yellow-600" />
                <span className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                  Registration Opens In: {Math.max(0, 6 - currentGameDay)} Days
                </span>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded-lg">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {getDivisionName(teamInfo.division)} Division Prize Preview
                </p>
                <div className="flex items-center justify-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold">50,000₡</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Gem className="w-4 h-4 text-purple-600" />
                    <span className="font-bold">100💎</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold">Trophy</span>
                  </div>
                </div>
              </div>
            </div>
          ) : isRegistrationDay ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                Registration OPEN!
              </h3>
              {midSeasonClassic && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-5 h-5 text-red-600" />
                    <span className="text-lg font-semibold text-red-700 dark:text-red-300">
                      Registration Closes In: {formatTimeRemaining(midSeasonClassic.registrationDeadline)}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    onClick={() => enterTournamentMutation.mutate(midSeasonClassic.id)}
                    disabled={
                      enterTournamentMutation.isPending ||
                      teamInfo.credits < midSeasonClassic.entryFeeCredits ||
                      teamInfo.gems < midSeasonClassic.entryFeeGems
                    }
                  >
                    Enter Tournament ({midSeasonClassic.entryFeeCredits.toLocaleString()}₡ / {midSeasonClassic.entryFeeGems}💎)
                  </Button>
                </div>
              )}
            </div>
          ) : isTournamentDay ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                Mid-Season Classic: In Progress
              </h3>
              <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Tournament bracket in progress. Check back for results!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">
                Mid-Season Classic Complete
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                This season's Mid-Season Classic has concluded. See results in Tournament History below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Divisional Cup Panel */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-xl text-blue-800 dark:text-blue-200">
                {getDivisionName(teamInfo.division)} Division Daily Cup
              </CardTitle>
            </div>
            {dailyDivisionalCup && (
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                Daily Tournament
              </Badge>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Test your team in a daily, low-risk tournament for credits and gems.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {dailyDivisionalCup ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Entry Fee</p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {dailyDivisionalCup.requiresEntryItem ? "1x Tournament Entry" : "Free"}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                  <p className="text-sm text-green-600 dark:text-green-300 font-medium">Champion's Reward</p>
                  <div className="flex items-center justify-center space-x-1">
                    <Coins className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-800 dark:text-green-200">1,500₡</span>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium">Registration Closes</p>
                  <p className="text-lg font-bold text-red-800 dark:text-red-200">
                    {formatTimeRemaining(dailyDivisionalCup.registrationDeadline)}
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => enterTournamentMutation.mutate(dailyDivisionalCup.id)}
                  disabled={enterTournamentMutation.isPending}
                >
                  {(myTournaments as any)?.some((t: any) => t.tournamentId === dailyDivisionalCup.id) 
                    ? "Entered" 
                    : "Enter Daily Cup"
                  }
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No Daily Cup available for your division today.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-6 h-6" />
            <span>Recent Tournament Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournamentHistory && tournamentHistory.length > 0 ? (
            <div className="space-y-3">
              {tournamentHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Trophy className={`w-5 h-5 ${
                      entry.placement === 1 ? 'text-yellow-500' :
                      entry.placement === 2 ? 'text-gray-400' :
                      entry.placement === 3 ? 'text-amber-600' :
                      'text-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.tournament.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Day {entry.tournament.gameDay} • {getPlacementText(entry.placement)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.creditsWon > 0 && (
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">+{entry.creditsWon.toLocaleString()}₡</span>
                      </div>
                    )}
                    {entry.gemsWon > 0 && (
                      <div className="flex items-center space-x-1">
                        <Gem className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-600 font-medium">+{entry.gemsWon}💎</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No tournament history yet. Enter your first tournament to start building your legacy!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentCenter;