import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Trophy, Zap, Shield, Eye, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import TournamentBracket from '@/components/TournamentBracket';

interface TournamentStatusData {
  id: string;
  name: string;
  type: string;
  division: number;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  spotsRemaining: number;
  isFull: boolean;
  isReadyToStart: boolean;
  timeUntilStart: number;
  timeUntilStartText: string;
  registrationDeadline: string;
  tournamentStartTime: string;
  entryFeeCredits: number;
  entryFeeGems: number;
  prizes: any;
  participants: Array<{
    teamId: string;
    teamName: string;
    division: number;
    entryTime: string;
    placement: number | null;
  }>;
  userTeamRegistered: boolean;
  userTeamEntry: {
    entryTime: string;
    placement: number | null;
  };
  matches?: Array<{
    id: string;
    round: string;
    homeTeam: {
      id: string;
      name: string;
      seed?: number;
    };
    awayTeam: {
      id: string;
      name: string;
      seed?: number;
    };
    homeScore?: number;
    awayScore?: number;
    status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
    startTime?: string;
    winner?: string;
  }>;
}

interface ActiveTournament {
  id: string;
  name: string;
  type: string;
  division: number;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  spotsRemaining: number;
  isFull: boolean;
  isReadyToStart: boolean;
  timeUntilStart: number;
  timeUntilStartText: string;
  registrationDeadline: string;
  tournamentStartTime: string;
  entryFeeCredits: number;
  entryFeeGems: number;
  prizes: any;
  entryTime: string;
  placement: number | null;
  participantCount: number;
}

export default function TournamentStatus() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket'>('overview');
  
  // Check if current user is admin
  const isAdmin = user?.userId === "44010914";

  // Query for user's active tournaments
  const { 
    data: activeTournaments, 
    isLoading: loadingActive, 
    refetch: refetchActive 
  } = useQuery<ActiveTournament[]>({
    queryKey: ['/api/tournament-status/my-active'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query for specific tournament status
  const { 
    data: tournamentStatus, 
    isLoading: loadingStatus, 
    refetch: refetchStatus 
  } = useQuery<TournamentStatusData>({
    queryKey: ['/api/tournament-status', selectedTournament, 'status'],
    queryFn: () => selectedTournament ? apiRequest(`/api/tournament-status/${selectedTournament}/status`) : null,
    enabled: !!selectedTournament,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Force start tournament
  const handleForceStart = async (tournamentId: number) => {
    try {
      const response = await apiRequest('POST', `/api/tournament-status/${tournamentId}/force-start`);
      if (response.ok) {
        toast({
          title: "Tournament Started",
          description: "Tournament has been started successfully!",
        });
        refetchActive();
        refetchStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start tournament",
        variant: "destructive",
      });
    }
  };

  // Watch match handler
  const handleWatchMatch = (matchId: string) => {
    // Navigate to live match viewer
    window.location.href = `/live-match/${matchId}`;
  };

  // Get tournament tab content
  const getTournamentTabContent = () => {
    if (!tournamentStatus) return null;

    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'bracket':
        // Transform API matches to match component expectations
        const transformedMatches = (tournamentStatus.matches || []).map(match => {
          // Find team names from participants
          const homeTeamData = tournamentStatus.participants.find(p => p.teamId === match.homeTeamId.toString());
          const awayTeamData = tournamentStatus.participants.find(p => p.teamId === match.awayTeamId.toString());
          
          // Convert numeric round to round name
          let roundName = 'QUARTERFINALS';
          if (match.round === 1) roundName = 'QUARTERFINALS';
          else if (match.round === 2) roundName = 'SEMIFINALS';
          else if (match.round === 3) roundName = 'FINALS';
          
          return {
            id: match.id.toString(),
            round: roundName,
            homeTeam: {
              id: match.homeTeamId.toString(),
              name: homeTeamData?.teamName || 'Unknown Team'
            },
            awayTeam: {
              id: match.awayTeamId.toString(),
              name: awayTeamData?.teamName || 'Unknown Team'
            },
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            status: match.status,
            startTime: match.gameDate || match.createdAt
          };
        });
        
        return (
          <TournamentBracket
            tournamentId={tournamentStatus.id}
            tournamentName={tournamentStatus.name}
            matches={transformedMatches}
            onWatchMatch={handleWatchMatch}
            isAdmin={isAdmin}
          />
        );
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tournament Progress */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Registration Progress
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Participants</span>
            <span className="font-medium">
              {tournamentStatus!.currentParticipants}/{tournamentStatus!.maxParticipants}
            </span>
          </div>
          <Progress 
            value={(tournamentStatus!.currentParticipants / tournamentStatus!.maxParticipants) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {tournamentStatus!.spotsRemaining} spots remaining
            </span>
            <span>
              {tournamentStatus!.isFull ? 'Full' : 'Open'}
            </span>
          </div>
        </div>

        {/* Tournament Timing */}
        <div className="mt-6">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Tournament Timing
          </h4>
          <div className="space-y-2 text-sm">
            {tournamentStatus!.status === 'IN_PROGRESS' ? (
              <div className="flex items-center gap-2 text-blue-600">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Tournament in Progress</span>
              </div>
            ) : tournamentStatus!.status === 'COMPLETED' ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Trophy className="w-4 h-4" />
                <span className="font-medium">Tournament Completed</span>
              </div>
            ) : tournamentStatus!.isReadyToStart ? (
              <div className="flex items-center gap-2 text-green-600">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Ready to Start!</span>
              </div>
            ) : tournamentStatus!.isFull ? (
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="w-4 h-4" />
                <span>Tournament starts in: {tournamentStatus!.timeUntilStartText}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Starts in: {tournamentStatus!.timeUntilStartText}</span>
              </div>
            )}
            {!tournamentStatus!.isFull && (
              <div className="text-xs text-muted-foreground">
                Registration closes: {new Date(tournamentStatus!.registrationDeadline).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Entry Fee */}
        {(tournamentStatus!.entryFeeCredits > 0 || tournamentStatus!.entryFeeGems > 0) && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Entry Fee</h4>
            <div className="text-sm space-y-1">
              {tournamentStatus!.entryFeeCredits > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600">₡</span>
                  {tournamentStatus!.entryFeeCredits.toLocaleString()} Credits
                </div>
              )}
              {tournamentStatus!.entryFeeGems > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-purple-600">💎</span>
                  {tournamentStatus!.entryFeeGems} Gems
                </div>
              )}
            </div>
          </div>
        )}

        {/* Force Start Button (Admin only) */}
        {isAdmin && tournamentStatus!.status === 'REGISTRATION_OPEN' && (
          <div className="mt-6">
            <Button 
              onClick={() => handleForceStart(selectedTournament!)}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loadingStatus}
            >
              {loadingStatus ? 'Loading...' : 'Force Start Tournament'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              This will fill remaining spots with AI teams and start the tournament immediately
            </p>
          </div>
        )}
      </div>

      {/* Participants List */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Participants
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tournamentStatus!.participants.map((participant, index) => (
            <div
              key={participant.teamId}
              className={`p-3 rounded-lg border text-sm ${
                participant.teamId === tournamentStatus!.userTeamEntry?.teamId
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{participant.teamName}</div>
                  <div className="text-xs text-muted-foreground">
                    Joined: {new Date(participant.entryTime).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs">
                  #{index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );



  // Auto-refresh logic
  useEffect(() => {
    if (selectedTournament) {
      const interval = setInterval(() => {
        refetchStatus();
      }, 10000); // Refresh every 10 seconds when viewing specific tournament
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [selectedTournament, refetchStatus]);

  const getDivisionName = (division: number) => {
    const names = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Stone", "Copper"];
    return names[division] || `Division ${division}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-green-500';
      case 'COMPLETED': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN': return 'Registration Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  };

  if (loadingActive) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tournament Status</h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage your active tournament participation
            </p>
          </div>
        </div>
      </div>

      {/* My Active Tournaments - Full Width Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-bold">My Active Tournaments</h2>
          </div>
          <p className="text-gray-300 text-sm mb-4">
            Tournaments you're currently registered for
          </p>
          
          {activeTournaments?.length === 0 ? (
            <p className="text-gray-300 text-center py-8">
              No active tournaments found
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTournaments?.map((tournament) => (
                <div
                  key={tournament.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedTournament === tournament.tournamentId
                      ? 'border-blue-500 bg-blue-900/20 shadow-lg ring-2 ring-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800'
                  }`}
                  onClick={() => setSelectedTournament(tournament.tournamentId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-white">{tournament.name}</h3>
                      <span className="text-xs text-gray-300 px-1 py-0.5 bg-gray-700 rounded">
                        #{tournament.tournamentId}
                      </span>
                    </div>
                    <Badge className={getStatusColor(tournament.status)}>
                      {getStatusText(tournament.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {getDivisionName(tournament.division)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tournament.currentParticipants}/{tournament.maxParticipants}
                    </span>
                  </div>
                  {tournament.status === 'IN_PROGRESS' ? (
                    <div className="mt-2 text-xs font-medium text-blue-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      In Progress
                    </div>
                  ) : tournament.status === 'COMPLETED' ? (
                    <div className="mt-2 text-xs font-medium text-gray-300 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Completed
                    </div>
                  ) : tournament.isReadyToStart ? (
                    <div className="mt-2 text-xs font-medium text-green-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Ready to Start!
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tournament.timeUntilStartText || 'Starting soon...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tournament Details - Full Width */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:col-span-2">
          {!selectedTournament ? (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="mb-4">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a tournament to view details</h3>
                  <p className="text-muted-foreground">
                    Choose a tournament from your active tournaments list to see participant progress, 
                    timing information, and prize details.
                  </p>
                </div>
                {activeTournaments?.length === 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      You don't have any active tournaments. Visit the Competition tab to join tournaments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedTournament && tournamentStatus ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{tournamentStatus.name}</span>
                    <span className="text-sm text-muted-foreground">#{tournamentStatus.tournamentId}</span>
                  </div>
                  <Badge className={getStatusColor(tournamentStatus.status)}>
                    {getStatusText(tournamentStatus.status)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {getDivisionName(tournamentStatus.division)} • {tournamentStatus.type.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tournament Navigation Tabs */}
                <div className="flex space-x-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Button
                    variant={activeTab === 'overview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 ${activeTab === 'overview' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    Overview
                  </Button>
                  <Button
                    variant={activeTab === 'bracket' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('bracket')}
                    className={`flex-1 ${activeTab === 'bracket' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    Bracket
                  </Button>
                </div>

                {/* Tournament Tab Content */}
                {getTournamentTabContent()}

                {/* Prizes */}
                {tournamentStatus.prizes && (
                  <div className="mt-6">
                    <Separator className="mb-4" />
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Prizes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {tournamentStatus.prizes.champion && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="font-medium text-yellow-800 dark:text-yellow-200">Champion</div>
                          <div className="text-yellow-700 dark:text-yellow-300">
                            {tournamentStatus.prizes.champion.credits > 0 && (
                              <span>{tournamentStatus.prizes.champion.credits.toLocaleString()} Credits</span>
                            )}
                            {tournamentStatus.prizes.champion.gems > 0 && (
                              <span className="ml-2">{tournamentStatus.prizes.champion.gems} Gems</span>
                            )}
                          </div>
                        </div>
                      )}
                      {tournamentStatus.prizes.runnerUp && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                          <div className="font-medium text-gray-800 dark:text-gray-200">Runner-up</div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {tournamentStatus.prizes.runnerUp.credits > 0 && (
                              <span>{tournamentStatus.prizes.runnerUp.credits.toLocaleString()} Credits</span>
                            )}
                            {tournamentStatus.prizes.runnerUp.gems > 0 && (
                              <span className="ml-2">{tournamentStatus.prizes.runnerUp.gems} Gems</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Select a tournament to view details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}