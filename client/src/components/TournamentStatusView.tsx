import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users, Calendar, Coins, Gem, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TournamentStatusViewProps {
  teamId: string;
}

interface TournamentEntry {
  id: string;
  tournamentId: string;
  teamId: number;
  registeredAt: string;
  finalRank: number | null;
  tournament: {
    id: string;
    name: string;
    type: string;
    division: number;
    status: string;
    registrationEndTime: string;
    startTime: string;
    entryFeeCredits: number;
    entryFeeGems: number;
    prizePoolJson: any;
  };
}

const TournamentStatusView: React.FC<TournamentStatusViewProps> = ({ teamId }) => {
  const { toast } = useToast();

  // Get tournament status from our dedicated status route
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['/api/tournament-status/active'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/tournament-status/active');
        return response;
      } catch (error) {
        console.error('Error fetching tournament status:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Starting soon';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const formatStartCountdown = (participants: number, maxParticipants: number) => {
    if (participants >= maxParticipants) {
      return "15m countdown to start";
    } else {
      return `${maxParticipants - participants} more teams needed`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!statusData || statusData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            My Tournament Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-300">No active tournament registrations</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Register for a tournament to track your progress here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          My Tournament Status
        </h3>
        <Badge variant="secondary">
          {statusData.length} Active Registration{statusData.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-4">
        {statusData.map((entry: any) => (
          <Card key={entry.id} className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{entry.name}</CardTitle>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Division {entry.division} • {entry.type === 'DAILY_DIVISIONAL' ? 'Daily Cup' : 'Mid-Season Classic'}
                  </p>
                </div>
                <Badge className={getStatusColor(entry.status)}>
                  {entry.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">{entry.currentParticipants}/{entry.maxParticipants} teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">{formatStartCountdown(entry.currentParticipants, entry.maxParticipants)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">Registered {new Date(entry.entryTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Registered</span>
                </div>
              </div>

              {entry.prizes && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Prize Pool</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="text-gray-800 dark:text-gray-200">1st: {entry.prizes.champion?.credits || 0} Credits</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gem className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-800 dark:text-gray-200">1st: {entry.prizes.champion?.gems || 0} Gems</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="text-sm text-gray-600">
                  {entry.placement ? `Final Rank: ${entry.placement}` : 'Tournament in progress...'}
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TournamentStatusView;