import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Heart, AlertCircle, Activity, Clock } from "lucide-react";

interface InjuredPlayer {
  id: string;
  name: string;
  race: string;
  role: string;
  injuryStatus: string;
  recoveryPointsNeeded: number;
  dailyItemsUsed: number;
  dailyStaminaLevel: number;
}

interface RecoveryItem {
  name: string;
  recoveryPoints: number;
  cost: number;
  type: string;
}

const RECOVERY_ITEMS: RecoveryItem[] = [
  { name: "Small Recovery Potion", recoveryPoints: 50, cost: 500, type: "potion" },
  { name: "Recovery Bandage", recoveryPoints: 100, cost: 1000, type: "bandage" },
  { name: "Healing Salve", recoveryPoints: 200, cost: 2000, type: "salve" },
  { name: "Major Healing Elixir", recoveryPoints: 500, cost: 5000, type: "elixir" }
];

export function InjuryManagement({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const { data: injuredPlayers, isLoading } = useQuery({
    queryKey: ["/api/team", teamId, "injured-players"],
    queryFn: async () => {
      const response = await fetch(`/api/team/${teamId}/injured-players`);
      if (!response.ok) throw new Error("Failed to fetch injured players");
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const useRecoveryItemMutation = useMutation({
    mutationFn: async ({ playerId, item }: { playerId: string; item: RecoveryItem }) => {
      return await apiRequest(`/api/injuries/${playerId}/use-recovery-item`, "POST", {
        itemType: item.type,
        recoveryPoints: item.recoveryPoints
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Recovery Item Used",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team", teamId, "injured-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/players"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to use recovery item",
        variant: "destructive",
      });
    }
  });

  const getInjurySeverityColor = (status: string) => {
    switch (status) {
      case "Severe Injury": return "bg-red-500";
      case "Moderate Injury": return "bg-orange-500";
      case "Minor Injury": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStaminaColor = (stamina: number) => {
    if (stamina >= 80) return "text-green-500";
    if (stamina >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading injured players...</div>;
  }

  if (!injuredPlayers || injuredPlayers.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            <Heart className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>All players are healthy!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Injured Players ({injuredPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {injuredPlayers.map((player: InjuredPlayer) => (
              <div key={player.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{player.name}</h4>
                    <p className="text-sm text-gray-400">
                      {player.race} {player.role}
                    </p>
                  </div>
                  <Badge className={getInjurySeverityColor(player.injuryStatus)}>
                    {player.injuryStatus}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Recovery Progress</span>
                    <span>{750 - player.recoveryPointsNeeded} / 750 RP</span>
                  </div>
                  <Progress 
                    value={((750 - player.recoveryPointsNeeded) / 750) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-1" />
                    <span className={getStaminaColor(player.dailyStaminaLevel)}>
                      Stamina: {player.dailyStaminaLevel}%
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Items Used Today: {player.dailyItemsUsed}/3</span>
                  </div>
                </div>

                {player.dailyItemsUsed < 3 && (
                  <div>
                    <Button
                      onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {selectedPlayer === player.id ? "Hide Items" : "Use Recovery Item"}
                    </Button>

                    {selectedPlayer === player.id && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {RECOVERY_ITEMS.map((item) => (
                          <Button
                            key={item.type}
                            onClick={() => useRecoveryItemMutation.mutate({ 
                              playerId: player.id, 
                              item 
                            })}
                            disabled={useRecoveryItemMutation.isPending || item.recoveryPoints > player.recoveryPointsNeeded}
                            variant="secondary"
                            size="sm"
                            className="flex flex-col items-center p-2 h-auto"
                          >
                            <span className="text-xs font-semibold">{item.name}</span>
                            <span className="text-xs text-gray-400">+{item.recoveryPoints} RP</span>
                            <span className="text-xs text-yellow-400">₡{item.cost}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}