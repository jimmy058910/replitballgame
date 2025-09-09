import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAbilityById } from "@shared/abilities";
import type { Player } from '@shared/types/models';


interface AbilitiesDisplayProps {
  player: any;
  canTrain?: boolean;
}

export default function AbilitiesDisplay({ player, canTrain = false }: AbilitiesDisplayProps) {
  const { toast } = useToast();

  const trainAbilitiesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/players/${player.id}/train-abilities`, "POST");
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Training Success!",
          description: data.message,
        });
      } else {
        toast({
          title: "Training Complete",
          description: data.message,
          variant: "default",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Training Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const abilities = (player.abilities || []).map((abilityId: string) => getAbilityById(abilityId)).filter(Boolean);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic": return "bg-green-500";
      case "advanced": return "bg-blue-500";
      case "godly": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "basic": return "🟢";
      case "advanced": return "🔵";
      case "godly": return "🟣";
      default: return "⚪";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Player Abilities ({abilities.length}/3)</span>
        </CardTitle>
        <CardDescription>
          Special abilities that enhance player performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {abilities.length === 0 ? (
          <p className="text-gray-400 text-sm">No abilities learned yet</p>
        ) : (
          abilities.map((ability: any) => (
            <div key={ability.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTierIcon(ability.tier)}</span>
                <Badge className={`${getTierColor(ability.tier)} text-white`}>
                  {ability.tier.toUpperCase()}
                </Badge>
                <h4 className="font-semibold">{ability.name}</h4>
              </div>
              <p className="text-sm text-gray-300">{ability.description}</p>
              {Object.keys(ability.statBonuses).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(ability.statBonuses).map(([stat, bonus]: [string, any]) => (
                    <Badge key={stat} variant="outline" className="text-xs">
                      +{bonus} {stat.charAt(0).toUpperCase() + stat.slice(1)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        
        {abilities.length < 3 && (
          <div className="text-xs text-gray-400 mt-2">
            <p>• Players can learn up to 3 abilities through training, matches, and leveling up</p>
            <p>• Ability chances depend on player race, position, and age</p>
            <p>• Higher tier abilities require prerequisites and have lower chances</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}