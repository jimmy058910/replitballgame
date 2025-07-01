import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Beaker, Shield, Target, AlertCircle, Sparkles } from "lucide-react";

interface TeamInventory {
  id: string;
  teamId: string;
  name: string;
  quantity: number;
  itemType: string;
}

interface MatchConsumable {
  id: string;
  matchId: string;
  teamId: string;
  consumableId: string;
  consumableName: string;
  effectType: string;
  effectData: any;
  activatedAt: Date;
  usedInMatch: boolean;
}

interface ConsumableManagerProps {
  teamId: string;
  onConsumableActivated?: (consumable: MatchConsumable) => void;
}

const getConsumableIcon = (name: string) => {
  if (name.toLowerCase().includes('training')) return Target;
  if (name.toLowerCase().includes('scouting')) return Shield;
  if (name.toLowerCase().includes('performance')) return Sparkles;
  return Beaker;
};

const getConsumableEffect = (name: string) => {
  const effects: Record<string, { type: string; description: string; stats: string }> = {
    'training_credit_basic': {
      type: 'stat_boost',
      description: 'Temporary stat boost for all players',
      stats: '+2 to all stats for one match'
    },
    'scouting_report': {
      type: 'tactical_advantage',
      description: 'Enhanced tactical knowledge of opponents',
      stats: '+10% match effectiveness'
    },
    'performance_enhancer': {
      type: 'stamina_boost',
      description: 'Reduced stamina loss during match',
      stats: '+25% stamina efficiency'
    }
  };
  
  return effects[name] || {
    type: 'stat_boost',
    description: 'Enhances team performance',
    stats: 'Various benefits'
  };
};

export function ConsumableManager({ teamId, onConsumableActivated }: ConsumableManagerProps) {
  const [activeTab, setActiveTab] = useState("inventory");
  const queryClient = useQueryClient();

  // Fetch team consumables inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: [`/api/consumables/team/${teamId}`],
    enabled: !!teamId
  });

  // Fetch league matches for consumable activation
  const { data: leagueMatches = [] } = useQuery({
    queryKey: [`/api/matches/team/${teamId}`],
    enabled: !!teamId
  });

  // Get upcoming league matches
  const upcomingLeagueMatches = leagueMatches.filter((match: any) => 
    match.status === 'scheduled' && match.matchType === 'league'
  );

  // Activate consumable for a match
  const activateConsumableMutation = useMutation({
    mutationFn: async ({ matchId, consumableId, consumableName }: {
      matchId: string;
      consumableId: string;
      consumableName: string;
    }) => {
      const effect = getConsumableEffect(consumableName);
      return apiRequest(`/api/consumables/activate`, "POST", {
        matchId,
        teamId,
        consumableId,
        consumableName,
        effectType: effect.type,
        effectData: { description: effect.description, stats: effect.stats }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/consumables/team/${teamId}`] });
      if (data.consumable && onConsumableActivated) {
        onConsumableActivated(data.consumable);
      }
    }
  });

  const handleActivateConsumable = (matchId: string, consumableId: string, consumableName: string) => {
    activateConsumableMutation.mutate({ matchId, consumableId, consumableName });
  };

  if (inventoryLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading consumables...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="w-5 h-5" />
          Consumable Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="activate">Activate for Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Your consumable inventory. Purchase more from the Store.
            </div>
            
            {inventory.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Beaker className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No consumables in inventory</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Visit the Store to purchase training credits, scouting reports, and performance enhancers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {inventory.map((item: TeamInventory) => {
                  const Icon = getConsumableIcon(item.name);
                  const effect = getConsumableEffect(item.name);
                  
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium capitalize">{item.name.replace(/_/g, ' ')}</h4>
                              <p className="text-sm text-muted-foreground">{effect.description}</p>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {effect.stats}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-lg font-mono">
                            {item.quantity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activate" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Activate consumables for upcoming league matches. Maximum 3 consumables per match.
            </div>

            {upcomingLeagueMatches.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming league matches</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Consumables can only be activated for league matches
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingLeagueMatches.map((match: any) => (
                  <Card key={match.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {match.homeTeam?.name} vs {match.awayTeam?.name}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        League Match • Day {match.gameDay} • {new Date(match.scheduledTime).toLocaleDateString()}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {inventory.filter((item: TeamInventory) => item.quantity > 0).length === 0 ? (
                        <p className="text-muted-foreground text-sm">No consumables available to activate</p>
                      ) : (
                        <div className="grid gap-3">
                          {inventory
                            .filter((item: TeamInventory) => item.quantity > 0)
                            .map((item: TeamInventory) => {
                              const Icon = getConsumableIcon(item.name);
                              const effect = getConsumableEffect(item.name);
                              
                              return (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <div>
                                      <div className="font-medium capitalize">{item.name.replace(/_/g, ' ')}</div>
                                      <div className="text-sm text-muted-foreground">{effect.stats}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{item.quantity} available</Badge>
                                    <Button
                                      size="sm"
                                      onClick={() => handleActivateConsumable(match.id, item.id, item.name)}
                                      disabled={activateConsumableMutation.isPending}
                                    >
                                      Activate
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}