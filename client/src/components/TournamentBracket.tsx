import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Trophy, Eye, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TournamentMatch {
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
}

interface TournamentBracketProps {
  tournamentId: string;
  tournamentName: string;
  matches: TournamentMatch[];
  onWatchMatch: (matchId: string) => void;
  isAdmin?: boolean;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournamentId,
  tournamentName,
  matches,
  onWatchMatch,
  isAdmin = false
}) => {
  const { toast } = useToast();

  const handleSimulateMatch = async (matchId: string) => {
    try {
      const response = await apiRequest('POST', `/api/tournament-status/${tournamentId}/matches/${matchId}/simulate`);
      if (response.ok) {
        toast({
          title: "Match Simulated",
          description: "Tournament match has been simulated successfully!",
        });
        // Refresh the page to show updated results
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to simulate match",
        variant: "destructive",
      });
    }
  };
  // Group matches by round
  const roundGroups = matches.reduce((groups, match) => {
    const round = match.round;
    if (!groups[round]) {
      groups[round] = [];
    }
    groups[round].push(match);
    return groups;
  }, {} as Record<string, TournamentMatch[]>);

  const roundOrder = ['QUARTERFINALS', 'SEMIFINALS', 'FINALS'];
  const orderedRounds = roundOrder.filter(round => roundGroups[round]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-green-600';
      case 'COMPLETED': return 'bg-gray-600';
      case 'SCHEDULED': return 'bg-blue-600';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'LIVE': return 'Live';
      case 'COMPLETED': return 'Final';
      case 'SCHEDULED': return 'Scheduled';
      default: return 'Pending';
    }
  };

  const formatTeamName = (name: string) => {
    // Truncate long team names for bracket display
    return name.length > 20 ? name.substring(0, 17) + '...' : name;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {tournamentName} - Tournament Bracket
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orderedRounds.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              Tournament bracket will be generated once matches are scheduled
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {orderedRounds.map((round, roundIndex) => (
              <div key={round} className="space-y-4">
                <h3 className="text-lg font-semibold text-center">
                  {round.charAt(0) + round.slice(1).toLowerCase()}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {roundGroups[round].map((match) => (
                    <Card key={match.id} className="border-2 hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <Badge className={getStatusColor(match.status)}>
                            {getStatusText(match.status)}
                          </Badge>
                          <div className="flex gap-2">
                            {match.status === 'LIVE' && (
                              <Button
                                size="sm"
                                onClick={() => onWatchMatch(match.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Watch
                              </Button>
                            )}
                            {isAdmin && match.status === 'SCHEDULED' && match.homeTeam.id !== 'TBD' && (
                              <Button
                                size="sm"
                                onClick={() => handleSimulateMatch(match.id)}
                                variant="outline"
                                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              >
                                <Zap className="w-4 h-4 mr-1" />
                                Simulate
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Home Team */}
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            {match.homeTeam.seed && (
                              <Badge variant="outline" className="text-xs">
                                #{match.homeTeam.seed}
                              </Badge>
                            )}
                            <span className="font-medium">
                              {formatTeamName(match.homeTeam.name)}
                            </span>
                          </div>
                          <div className="text-lg font-bold">
                            {match.homeScore !== undefined ? match.homeScore : '-'}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            {match.awayTeam.seed && (
                              <Badge variant="outline" className="text-xs">
                                #{match.awayTeam.seed}
                              </Badge>
                            )}
                            <span className="font-medium">
                              {formatTeamName(match.awayTeam.name)}
                            </span>
                          </div>
                          <div className="text-lg font-bold">
                            {match.awayScore !== undefined ? match.awayScore : '-'}
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          {match.startTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(match.startTime).toLocaleTimeString()}
                            </div>
                          )}
                          {match.winner && (
                            <div className="text-green-600 font-medium">
                              Winner: {formatTeamName(match.winner)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentBracket;