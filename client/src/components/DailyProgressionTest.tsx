import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, TrendingUp, Users, Settings, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

/**
 * Daily Player Progression Test Interface
 * 
 * Provides a comprehensive interface for testing the new daily progression system
 * that replaces the previous seasonal progression with sophisticated daily mechanics.
 */
export default function DailyProgressionTest() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get progression configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['/api/daily-progression/config'],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Get progression statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/daily-progression/statistics'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Execute daily progression for all players
  const executeDailyProgression = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/daily-progression/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute daily progression');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Daily Progression Complete",
        description: `Processed ${data.data?.totalPlayersProcessed || 0} players successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-progression/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Progression Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Execute progression for single player (testing)
  const executeSinglePlayerProgression = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await fetch(`/api/daily-progression/player/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute player progression');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Player Progression Complete",
        description: `Player ${selectedPlayerId} processed with ${data.data?.progressions?.length || 0} stat changes`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-progression/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Player Progression Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Progression System</h1>
        <p className="text-muted-foreground">
          Test and monitor the new daily player progression system that replaces seasonal progression
        </p>
      </div>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Current progression formula and system settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="text-center py-4">Loading configuration...</div>
          ) : config?.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Base Progression</h4>
                  <p className="text-sm text-muted-foreground">
                    Base Chance: {config.data.formula.baseChance}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Reset Schedule</h4>
                  <p className="text-sm text-muted-foreground">
                    {config.data.formula.resetTime}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Activity Scoring Formula</h4>
                <p className="text-sm text-muted-foreground">
                  League Games: {config.data.formula.activityScoring.leagueGames} points each
                </p>
                <p className="text-sm text-muted-foreground">
                  Tournament Games: {config.data.formula.activityScoring.tournamentGames} points each
                </p>
                <p className="text-sm text-muted-foreground">
                  Exhibition Games: {config.data.formula.activityScoring.exhibitionGames} points each
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to load system configuration. Admin access may be required.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Progression Statistics
          </CardTitle>
          <CardDescription>
            Recent progression activity and success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-4">Loading statistics...</div>
          ) : stats?.success ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.data.totalProgressions || 0}</div>
                <p className="text-sm text-muted-foreground">Total Progressions (30 days)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.data.uniquePlayersProgressed || 0}</div>
                <p className="text-sm text-muted-foreground">Players Progressed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.data.averageProgressionsPerPlayer?.toFixed(1) || '0.0'}
                </div>
                <p className="text-sm text-muted-foreground">Avg per Player</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to load progression statistics. System may be initializing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Test Controls
          </CardTitle>
          <CardDescription>
            Execute daily progression manually for testing (Admin only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Execute All Players */}
            <div className="space-y-2">
              <h4 className="font-semibold">All Players Progression</h4>
              <p className="text-sm text-muted-foreground">
                Execute daily progression for all active players
              </p>
              <Button 
                onClick={() => executeDailyProgression.mutate()}
                disabled={executeDailyProgression.isPending}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                {executeDailyProgression.isPending ? 'Processing...' : 'Execute Daily Progression'}
              </Button>
            </div>

            {/* Execute Single Player */}
            <div className="space-y-2">
              <h4 className="font-semibold">Single Player Test</h4>
              <p className="text-sm text-muted-foreground">
                Test progression for a specific player ID
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Player ID"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
                />
                <Button 
                  onClick={() => {
                    if (selectedPlayerId.trim()) {
                      executeSinglePlayerProgression.mutate(selectedPlayerId.trim());
                    }
                  }}
                  disabled={executeSinglePlayerProgression.isPending || !selectedPlayerId.trim()}
                  size="sm"
                >
                  {executeSinglePlayerProgression.isPending ? 'Processing...' : 'Test'}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Information */}
          <div className="space-y-2">
            <h4 className="font-semibold">System Status</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Daily Reset: 3:00 AM EST</Badge>
              <Badge variant="outline">Multi-Factor Formula</Badge>
              <Badge variant="outline">Activity-Based Scoring</Badge>
              <Badge variant="outline">Staff Effects Integrated</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This daily progression system replaces the previous seasonal progression. 
          It uses sophisticated activity scoring, potential calculations, age modifiers, staff effects, and 
          camaraderie bonuses to determine player development. The system runs automatically at 3:00 AM Eastern time.
        </AlertDescription>
      </Alert>
    </div>
  );
}