import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Zap, Pill, Activity, AlertTriangle, Package, Beaker } from "lucide-react";
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
  staminaAttribute: number;
  dailyStaminaLevel: number;
  dailyItemsUsed: number;
}

interface InventoryItem {
  id: string;
  itemType: string;
  name: string;
  description: string;
  rarity: string;
  quantity: number;
  metadata: any;
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

  // Fetch team inventory for recovery items
  const { data: rawInventory } = useQuery({
    queryKey: ['/api/inventory', teamId],
    queryFn: () => apiRequest(`/api/inventory/${teamId}`),
    enabled: !!teamId,
  });
  const inventory = (rawInventory || []) as InventoryItem[];

  // Filter recovery/consumable items from inventory
  const recoveryItems = inventory.filter(item => 
    item.itemType === 'CONSUMABLE_RECOVERY' && 
    item.quantity > 0
  );

  // Use recovery item mutation
  const useItemMutation = useMutation({
    mutationFn: async ({ playerId, itemType, effectValue, itemName }: { playerId: string; itemType: string; effectValue: number; itemName: string }) => {
      return apiRequest(`/api/injury-stamina/player/${playerId}/use-item`, 'POST', {
        itemType,
        effectValue,
        itemName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/team', teamId, 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
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
        tacklePower: tacklerPower, // Backend expects tacklePower
        carrierAgility: 30, // Default testing values
        carrierStamina: 80,
        gameMode: 'league'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/team', teamId, 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/system/stats'] });
      toast({
        title: "Injury Simulation Complete",
        description: "Check player status for results"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to simulate injury"
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

  const getRecoveryItemEffect = (itemName: string) => {
    const effects: Record<string, { type: string; effectValue: number; description: string; icon: any }> = {
      'basic_medical_kit': {
        type: 'injury',
        effectValue: 25,
        description: 'Heals minor injuries (+25 Recovery Points)',
        icon: Pill
      },
      'advanced_treatment': {
        type: 'injury',
        effectValue: 50,
        description: 'Heals moderate injuries (+50 Recovery Points)',
        icon: Activity
      },
      'phoenix_elixir': {
        type: 'injury',
        effectValue: 100,
        description: 'Fully heals any injury (+100 Recovery Points)',
        icon: Heart
      },
      'basic_stamina_drink': {
        type: 'stamina',
        effectValue: 25,
        description: 'Restores stamina (+25%)',
        icon: Zap
      },
      'advanced_recovery_serum': {
        type: 'stamina',
        effectValue: 50,
        description: 'Restores significant stamina (+50%)',
        icon: Beaker
      }
    };
    
    return effects[itemName] || {
      type: 'stamina',
      effectValue: 20,
      description: 'Provides recovery benefits',
      icon: Package
    };
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
                  <label className="block text-sm font-medium mb-2 text-white dark:text-white">Select Player</label>
                  <select 
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-700 text-white dark:text-white border-gray-600 dark:border-gray-500"
                  >
                    <option value="" className="bg-gray-800 text-white">Choose a player...</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id} className="bg-gray-800 text-white">
                        {player.firstName} {player.lastName} - {player.injuryStatus} - {player.dailyStaminaLevel}% Stamina
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recovery Items from Inventory */}
                {recoveryItems.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white dark:text-white">Available Recovery Items</h4>
                    <div className="grid gap-2">
                      {recoveryItems.map((item) => {
                        const effect = getRecoveryItemEffect(item.name);
                        const Icon = effect.icon;
                        
                        // Check if player is eligible for this item
                        const selectedPlayerData = players.find(p => p.id === selectedPlayer);
                        const isEligible = selectedPlayerData ? (
                          effect.type === 'injury' 
                            ? selectedPlayerData.injuryStatus !== 'Healthy'
                            : selectedPlayerData.dailyStaminaLevel < 100
                        ) : true;
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-700 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-blue-400" />
                              <div>
                                <div className="font-medium text-white">{item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                <div className="text-sm text-gray-300">{effect.description}</div>
                                {selectedPlayerData && !isEligible && (
                                  <div className="text-xs text-yellow-400 mt-1">
                                    {effect.type === 'injury' 
                                      ? "Player is healthy (injury items only work on injured players)"
                                      : "Player has full stamina (stamina items only work on tired players)"}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-gray-300">{item.quantity} available</Badge>
                              <Button
                                size="sm"
                                onClick={() => selectedPlayer && useItemMutation.mutate({
                                  playerId: selectedPlayer,
                                  itemType: effect.type,
                                  effectValue: effect.effectValue,
                                  itemName: item.name
                                })}
                                disabled={!selectedPlayer || useItemMutation.isPending || !isEligible}
                                variant="outline"
                              >
                                Use Item
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Card className="bg-gray-700 dark:bg-gray-800 border-gray-600">
                    <CardContent className="p-6 text-center">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-300">No recovery items in inventory</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Visit the Market → Store to purchase medical kits, stamina drinks, and recovery items
                      </p>
                    </CardContent>
                  </Card>
                )}
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
                  <label className="block text-sm font-medium mb-2 text-white dark:text-white">Select Player for Injury Test</label>
                  <select 
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-800 dark:bg-gray-700 text-white dark:text-white border-gray-600 dark:border-gray-500"
                  >
                    <option value="" className="bg-gray-800 text-white">Choose a player...</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id} className="bg-gray-800 text-white">
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => selectedPlayer && simulateInjuryMutation.mutate({
                    playerId: selectedPlayer,
                    tacklerPower: 45
                  })}
                  disabled={!selectedPlayer || simulateInjuryMutation.isPending}
                  variant="destructive"
                >
                  {simulateInjuryMutation.isPending ? 'Simulating...' : 'Simulate Tackle Injury (Power 45 - Guaranteed)'}
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