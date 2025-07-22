import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Clock, Calendar, Users, Coins, Gem, CheckCircle, AlertCircle, Timer, ArrowLeft, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';


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
  id: number;
  tournamentId: number;
  teamId: number;
  registeredAt: Date;
  finalRank: number | null;
  rewardsClaimed: boolean;
  tournament?: {
    name: string;
    type: string;
    gameDay: number;
  };
  placement?: number;
  creditsWon?: number;
  gemsWon?: number;
  entryTime?: string;
}

interface TournamentMatch {
  id: number;
  round: number;
  status: string;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  homeScore: number | null;
  awayScore: number | null;
}

interface TournamentBracketData {
  matches: TournamentMatch[];
  tournament: {
    id: number;
    name: string;
    type: string;
    status: string;
  };
}

const TournamentCenter: React.FC<TournamentCenterProps> = ({ teamId }) => {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [bracketModalTournament, setBracketModalTournament] = useState<number | null>(null);
  const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);

  // Helper function to get placement text
  const getPlacementText = (placement: number, tournamentType?: string) => {
    if (!placement || placement === 0) return "Participated";
    
    // For Daily Divisional tournaments, use specific text
    if (tournamentType === "DAILY_DIVISIONAL") {
      switch (placement) {
        case 1: return "1st Place";
        case 2: return "2nd Place";
        case 3: return "Eliminated in Semifinals";
        case 4: return "Eliminated in Semifinals";
        case 5: return "Eliminated in Quarterfinals";
        case 6: return "Eliminated in Quarterfinals";
        case 7: return "Eliminated in Quarterfinals";
        case 8: return "Eliminated in Quarterfinals";
        default: return `${placement}th Place`;
      }
    }
    
    // For Mid-Season Cup and other tournaments, use trophy text
    switch (placement) {
      case 1: return "🥇 Champion";
      case 2: return "🥈 Runner-up";
      case 3: return "🥉 Semifinalist";
      case 4: return "🥉 Semifinalist";
      case 5: return "Quarterfinalist";
      case 6: return "Quarterfinalist";
      case 7: return "Quarterfinalist";
      case 8: return "Quarterfinalist";
      default: return `${placement}th Place`;
    }
  };

  // Fetch team info
  const { data: teamInfo } = useQuery<TeamInfo>({
    queryKey: ["/api/teams/my"],
    enabled: !!teamId,
  });

  // Fetch current season info
  const { data: seasonInfo } = useQuery({
    queryKey: ["/api/season/current-cycle"],
  });

  // Check if Mid-Season Cup registration deadline has passed (Day 7 at 1PM EDT)
  const isMidSeasonRegistrationDeadlinePassed = () => {
    if (!seasonInfo?.data) return false;
    
    const currentDay = (seasonInfo as any)?.data?.currentDay;
    
    // Get current Eastern Time
    const easternTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const easternDate = new Date(easternTime);
    const currentHour = easternDate.getHours();
    
    // Registration closes after Day 7 at 1PM EDT
    if (currentDay > 7) return true;
    if (currentDay === 7 && currentHour >= 13) return true;
    
    return false;
  };

  // Fetch available tournaments
  const { data: availableTournaments, isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/new-tournaments/available"],
    enabled: !!teamId,
  });

  // Fetch team's tournament history
  const { data: tournamentHistory } = useQuery<TournamentEntry[]>({
    queryKey: ["/api/tournament-history"],
    queryFn: () => apiRequest(`/api/tournament-history`),
    enabled: !!teamId,
  });

  // Fetch tournament bracket data when a tournament is selected
  const { data: tournamentBracketData } = useQuery<TournamentBracketData>({
    queryKey: ["/api/tournaments/bracket", selectedTournamentId],
    queryFn: () => apiRequest(`/api/tournaments/bracket/${selectedTournamentId}`),
    enabled: !!selectedTournamentId,
  });

  // Fetch bracket data for the modal
  const { data: bracketModalData, isLoading: bracketModalLoading } = useQuery<TournamentBracketData>({
    queryKey: ["/api/tournaments/bracket", bracketModalTournament],
    queryFn: () => apiRequest(`/api/tournaments/bracket/${bracketModalTournament}`),
    enabled: !!bracketModalTournament && isBracketModalOpen,
  });

  // Fetch team's current tournament entries
  const { data: myTournaments } = useQuery({
    queryKey: ["/api/new-tournaments/my-tournaments"],
    queryFn: () => apiRequest("/api/new-tournaments/my-tournaments"),
    enabled: !!teamId,
  });

  // Check if user is already registered for daily tournament
  const { data: dailyTournamentStatus } = useQuery({
    queryKey: ["/api/new-tournaments/my-tournaments"],
    queryFn: () => apiRequest("/api/new-tournaments/my-tournaments"),
    enabled: !!teamId,
  });

  // Check if user is already registered for daily tournament
  const isRegisteredForDailyTournament = Array.isArray(dailyTournamentStatus) && dailyTournamentStatus.some((entry: any) => 
    entry.type === 'DAILY_DIVISIONAL'
  );

  // ✅ FIX: Check if user is already registered for Mid-Season Cup
  const isRegisteredForMidSeasonCup = Array.isArray(dailyTournamentStatus) && dailyTournamentStatus.some((entry: any) => 
    entry.type === 'MID_SEASON_CLASSIC'
  );

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

  // Daily Tournament registration mutation
  const registerDailyTournamentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/new-tournaments/daily-tournament/register`, "POST", { division: teamInfo?.division });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Daily Divisional Tournament!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-status/my-active"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mid-Season Classic registration mutation
  const registerMidSeasonMutation = useMutation({
    mutationFn: async (paymentType: "credits" | "gems" | "both") => {
      return await apiRequest(`/api/new-tournaments/mid-season/register`, "POST", { division: teamInfo?.division, paymentType });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully registered for Mid-Season Classic!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/new-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-status/my-active"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
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
        
        {/* Daily Divisional Tournament - LEFT SIDE */}
        <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-xl text-blue-800 dark:text-blue-200">
                Daily Divisional Tournament
              </CardTitle>
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              Daily competition for {getDivisionName(teamInfo.division)} Division teams
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Entry Requirements
                </p>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  • Tournament Entry Item required<br/>
                  • Available for Divisions 2-8<br/>
                  • Low injury risk and low stamina reduction<br/>
                  • 1 free entry per day. Can also use a Tournament Entry once per day
                </div>
              </div>
              
              <div className="bg-blue-100 dark:bg-blue-800/30 p-4 rounded-lg">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  {getDivisionName(teamInfo.division)} Division Prize Preview
                </p>
                <div className="flex items-center justify-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-800 dark:text-blue-200">15,000₡</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Gem className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-blue-800 dark:text-blue-200">25💎</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => registerDailyTournamentMutation.mutate()}
                  disabled={registerDailyTournamentMutation.isPending || isRegisteredForDailyTournament}
                  className={isRegisteredForDailyTournament ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                  {registerDailyTournamentMutation.isPending ? "Registering..." : 
                   isRegisteredForDailyTournament ? "✓ Already Registered" : 
                   "Register for Daily Tournament"}
                </Button>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {isRegisteredForDailyTournament ? 
                    "You are registered for today's tournament" : 
                    "Requires Tournament Entry item - Purchase in Market → Store → Entries"
                  }
                </p>
              </div>
            </div>
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
              Premier tournament for teams within your division only
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
                    • Entry: 10,000₡ OR 20💎 (both options available)<br/>
                    • Tournament Day: Day 7 at 1PM<br/>
                    • Moderate injury risk and moderate stamina reduction
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    {getDivisionName(teamInfo.division)} Division Prize Preview
                  </p>
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                    🏆 <strong>Champion:</strong> 15,000₡ + 5💎 + Trophy<br/>
                    🥈 <strong>Runner-up:</strong> 6,000₡<br/>
                    🥉 <strong>Semi-finalist:</strong> 2,000₡
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    ⚡ 16-team tournament • Enhanced rewards • Division-only competition
                  </div>
                </div>
                {isTournamentDay ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    Tournament in progress - registration closed
                  </Badge>
                ) : isMidSeasonRegistrationDeadlinePassed() ? (
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      Registration Deadline Passed
                    </Badge>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      Come back next season to participate!
                    </p>
                  </div>
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
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => registerMidSeasonMutation.mutate("credits")}
                        disabled={registerMidSeasonMutation.isPending || isRegisteredForMidSeasonCup || teamInfo.credits < 10000 || isMidSeasonRegistrationDeadlinePassed()}
                        className={isRegisteredForMidSeasonCup ? "bg-green-600 hover:bg-green-700 flex-1" : "bg-purple-600 hover:bg-purple-700 flex-1"}
                      >
                        {isRegisteredForMidSeasonCup ? "✓ Already Registered" : 
                         `Register (10,000₡)`}
                      </Button>
                      <Button 
                        onClick={() => registerMidSeasonMutation.mutate("gems")}
                        disabled={registerMidSeasonMutation.isPending || isRegisteredForMidSeasonCup || teamInfo.gems < 20 || isMidSeasonRegistrationDeadlinePassed()}
                        className={isRegisteredForMidSeasonCup ? "bg-green-600 hover:bg-green-700 flex-1" : "bg-purple-600 hover:bg-purple-700 flex-1"}
                      >
                        {registerMidSeasonMutation.isPending ? "Registering..." : 
                         isRegisteredForMidSeasonCup ? "✓ Already Registered" : 
                         `Register (20💎)`}
                      </Button>
                    </div>
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
                      <span className="font-bold text-purple-800 dark:text-purple-200">50,000₡</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gem className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-800 dark:text-purple-200">100💎</span>
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

      {/* My Tournament Status Section */}
      {Array.isArray(myTournaments) && myTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>My Tournament Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTournaments.map((entry: any) => (
                <div key={entry.id} className="border-l-4 border-l-purple-500 pl-4 py-2 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{entry.tournament.name}</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        {entry.tournament.tournamentId && (
                          <span className="text-purple-600 dark:text-purple-400 font-mono mr-2">#{entry.tournament.tournamentId}</span>
                        )}
                        Division {entry.tournament.division} • {entry.tournament.type === 'DAILY_DIVISIONAL' ? 'Daily Cup' : 'Mid-Season Classic'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {entry.tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Registered {entry.registeredAt ? new Date(entry.registeredAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      onClick={() => {
                        window.location.href = `/tournament-status`;
                      }}
                    >
                      View Details →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Tournament History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournamentHistory && tournamentHistory.length > 0 ? (
            <div className="space-y-3">
              {tournamentHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {entry.tournament?.name || `Tournament ${entry.tournamentId}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.tournamentId && (
                        <span className="text-purple-600 dark:text-purple-400 font-mono mr-2">#{entry.tournamentId}</span>
                      )}
                      {(() => {
                        const dateStr = entry.entryTime || entry.registeredAt;
                        if (!dateStr) return 'N/A';
                        try {
                          const date = new Date(dateStr);
                          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        } catch {
                          return 'N/A';
                        }
                      })()} • {getPlacementText(entry.finalRank || entry.placement || 0, entry.tournament?.type || 'DAILY')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {entry.finalRank === 1 && (
                        <span className="flex items-center space-x-1 text-sm text-gray-900 dark:text-gray-100">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span>Champion Reward</span>
                        </span>
                      )}
                      {entry.finalRank === 2 && (
                        <span className="flex items-center space-x-1 text-sm text-gray-900 dark:text-gray-100">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span>Runner-up Reward</span>
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBracketModalTournament(entry.tournamentId);
                          setIsBracketModalOpen(true);
                        }}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      >
                        View Bracket
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">No tournament history yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Enter tournaments to build your competitive record
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tournament Bracket Display */}
      {selectedTournamentId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTournamentId(null)}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Trophy className="w-5 h-5" />
              <span>Tournament Bracket</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentBracketData ? (
              <div className="tournament-bracket space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Tournament #{selectedTournamentId}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Single-elimination bracket
                  </p>
                </div>
                
                {/* Bracket matches display */}
                <div className="grid gap-4">
                  {tournamentBracketData.matches && Array.isArray(tournamentBracketData.matches) ? (
                    tournamentBracketData.matches.map((match: TournamentMatch, index: number) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Round {match.round}
                            </span>
                            <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded">
                              {match.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {match.homeTeam?.name} vs {match.awayTeam?.name}
                            </div>
                            {match.homeScore !== null && match.awayScore !== null && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Score: {match.homeScore} - {match.awayScore}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-300">No tournament bracket data available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Loading tournament bracket...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Tournament Bracket Modal */}
      <Dialog open={isBracketModalOpen} onOpenChange={setIsBracketModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Tournament Bracket</span>
            </DialogTitle>
          </DialogHeader>
          
          {bracketModalData && !bracketModalLoading ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                  {bracketModalData?.tournament?.name || `Tournament ${bracketModalTournament}`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Status:</span> {bracketModalData?.tournament?.status}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Tournament ID:</span> 
                    <span className="text-purple-600 dark:text-purple-400 font-mono ml-1">#{bracketModalTournament}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {bracketModalData?.matches && bracketModalData.matches.length > 0 ? (
                  bracketModalData.matches.map((match: TournamentMatch, index: number) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => {
                           if (match.status === 'COMPLETED' || match.status === 'LIVE') {
                             setLocation(`/live-match/${match.id}`);
                           }
                         }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">
                                R{match.round}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Round {match.round}
                              {match.status === 'LIVE' && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Status: {match.status}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {match.homeTeam?.name} vs {match.awayTeam?.name}
                          </div>
                          {match.homeScore !== null && match.awayScore !== null && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Score: {match.homeScore} - {match.awayScore}
                            </div>
                          )}
                          {(match.status === 'COMPLETED' || match.status === 'LIVE') && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                              Click to view →
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No tournament bracket data available</p>
                  </div>
                )}
              </div>
            </div>
          ) : bracketModalLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading tournament bracket...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300">Failed to load tournament bracket data</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentCenter;