import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Zap, Pill, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  injuryStatus: string;
  injuryRecoveryPointsCurrent: number;
  injuryRecoveryPointsNeeded: number;
  inGameStamina: number;
  dailyStaminaLevel: number;
  dailyItemsUsed: number;
}

interface InjuryStaminaManagerProps {
  teamId: string;
}

export function InjuryStaminaManager({ teamId }: InjuryStaminaManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Fetch team injury/stamina status
  const { data: teamStatus, isLoading } = useQuery({
    queryKey: ['/api/injury-stamina/team', teamId, 'status'],
    queryFn: () => apiRequest(`/api/injury-stamina/team/${teamId}/status`),
  });

  // Fetch system statistics
  const { data: systemStats } = useQuery({
    queryKey: ['/api/injury-stamina/system/stats'],
    queryFn: () => apiRequest('/api/injury-stamina/system/stats'),
  });

  // Use recovery item mutation
  const useItemMutation = useMutation({
    mutationFn: async ({ playerId, itemType, effectValue }: { playerId: string; itemType: string; effectValue: number }) => {
      return apiRequest(`/api/injury-stamina/player/${playerId}/use-item`, 'POST', {
        itemType,
        effectValue
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/team', teamId, 'status'] });
      toast({
        title: "Recovery Item Used",
        description: "Item successfully applied to player"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Using Item",
        description: error.message || "Failed to use recovery item",
        variant: "destructive"
      });
    }
  });

  // Simulate tackle injury mutation (for testing)
  const simulateInjuryMutation = useMutation({
    mutationFn: async ({ playerId, tacklerPower }: { playerId: string; tacklerPower: number }) => {
      return apiRequest('/api/injury-stamina/simulate-tackle-injury', 'POST', {
        playerId,
        tacklerPower
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/team', teamId, 'status'] });
      toast({
        title: "Injury Simulation Complete",
        description: "Check player status for results"
      });
    }
  });

  const getInjuryStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-green-500';
      case 'Minor Injury': return 'bg-yellow-500';
      case 'Moderate Injury': return 'bg-orange-500';
      case 'Severe Injury': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStaminaColor = (level: number) => {
    if (level >= 75) return 'bg-green-500';
    if (level >= 50) return 'bg-yellow-500';
    if (level >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return <div className="p-4">Loading injury & stamina data...</div>;
  }

  const players: Player[] = teamStatus?.players || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Injury & Stamina Management
          </CardTitle>
          <CardDescription>
            Monitor and manage your team's injury status and stamina levels
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Items</TabsTrigger>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {players.map((player) => (
              <Card key={player.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {player.firstName} {player.lastName}
                      </h3>
                      <Badge variant="outline">{player.role}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <Badge className={getInjuryStatusColor(player.injuryStatus)}>
                          {player.injuryStatus}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm">Daily Stamina:</span>
                        <Progress 
                          value={player.dailyStaminaLevel} 
                          className="w-20 h-2"
                        />
                        <span className="text-sm">{player.dailyStaminaLevel}%</span>
                      </div>
                    </div>

                    {player.injuryStatus !== 'Healthy' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        Recovery: {player.injuryRecoveryPointsCurrent}/{player.injuryRecoveryPointsNeeded}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Items used today: {player.dailyItemsUsed}/2
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Items</CardTitle>
              <CardDescription>Use recovery items to heal injuries and restore stamina</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Player</label>
                  <select 
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Choose a player...</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.firstName} {player.lastName} - {player.injuryStatus}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedPlayer && useItemMutation.mutate({
                      playerId: selectedPlayer,
                      itemType: 'injury',
                      effectValue: 25
                    })}
                    disabled={!selectedPlayer || useItemMutation.isPending}
                    variant="outline"
                  >
                    <Pill className="h-4 w-4 mr-2" />
                    Minor Recovery (+25 RP)
                  </Button>
                  
                  <Button
                    onClick={() => selectedPlayer && useItemMutation.mutate({
                      playerId: selectedPlayer,
                      itemType: 'stamina',
                      effectValue: 30
                    })}
                    disabled={!selectedPlayer || useItemMutation.isPending}
                    variant="outline"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Stamina Boost (+30%)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing & Simulation</CardTitle>
              <CardDescription>Development tools for testing the injury system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Player for Injury Test</label>
                  <select 
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Choose a player...</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => selectedPlayer && simulateInjuryMutation.mutate({
                    playerId: selectedPlayer,
                    tacklerPower: 35
                  })}
                  disabled={!selectedPlayer || simulateInjuryMutation.isPending}
                  variant="destructive"
                >
                  Simulate Tackle Injury (Power 35)
                </Button>
              </div>

              {systemStats && (
                <div className="mt-4 p-4 bg-muted rounded">
                  <h4 className="font-semibold mb-2">System Statistics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total Players: {systemStats.totalPlayers}</div>
                    <div>Injured Players: {systemStats.injuredPlayers}</div>
                    <div>Healthy Players: {systemStats.healthyPlayers}</div>
                    <div>Avg Stamina: {systemStats.averageStamina?.toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}