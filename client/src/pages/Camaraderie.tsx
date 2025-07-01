import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Users, TrendingUp, TrendingDown, Heart, Shield, Star, Award } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  camaraderie: number;
  yearsOnTeam: number;
  age: number;
}

interface CamaraderieEffects {
  teamCamaraderie: number;
  status: 'in_sync' | 'neutral' | 'out_of_sorts';
  contractNegotiationBonus: number;
  inGameStatBonus: {
    catching: number;
    agility: number;
    passAccuracy: number;
  };
  developmentBonus: number;
  injuryReduction: number;
}

interface CamaraderieSummary {
  teamId: string;
  teamName: string;
  averageCamaraderie: number;
  playerCount: number;
  highCamaraderieCount: number;
  lowCamaraderieCount: number;
  effects: CamaraderieEffects;
  topPlayers: Player[];
  concernPlayers: Player[];
}

const getCamaraderieColor = (camaraderie: number): string => {
  if (camaraderie >= 80) return "text-green-600";
  if (camaraderie >= 60) return "text-blue-600";
  if (camaraderie >= 40) return "text-yellow-600";
  if (camaraderie >= 20) return "text-orange-600";
  return "text-red-600";
};

const getCamaraderieStatusBadge = (status: string) => {
  switch (status) {
    case 'in_sync':
      return <Badge variant="default" className="bg-green-100 text-green-800">In Sync</Badge>;
    case 'out_of_sorts':
      return <Badge variant="destructive">Out of Sorts</Badge>;
    default:
      return <Badge variant="outline">Neutral</Badge>;
  }
};

export default function Camaraderie() {
  const queryClient = useQueryClient();

  // Get team camaraderie summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/camaraderie/summary'],
    queryFn: () => apiRequest('/api/camaraderie/summary')
  });

  // Trigger end-of-season update (admin only for testing)
  const endOfSeasonMutation = useMutation({
    mutationFn: () => apiRequest('/api/camaraderie/end-of-season', 'POST'),
    onSuccess: () => {
      toast({
        title: "End of Season Update Complete",
        description: "Player camaraderie has been updated based on team performance.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/camaraderie/summary'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update camaraderie. You may not have permission.",
        variant: "destructive",
      });
    }
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No team data available</p>
      </div>
    );
  }

  const { effects } = summary;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Camaraderie</h1>
          <p className="text-gray-600 mt-1">Monitor team chemistry and its effects on performance</p>
        </div>
        <Button 
          onClick={() => endOfSeasonMutation.mutate()}
          disabled={endOfSeasonMutation.isPending}
          variant="outline"
          size="sm"
        >
          {endOfSeasonMutation.isPending ? "Updating..." : "Test Season Update"}
        </Button>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Camaraderie</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.averageCamaraderie)}</div>
            <Progress value={summary.averageCamaraderie} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {getCamaraderieStatusBadge(effects.status)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Morale Players</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.highCamaraderieCount}</div>
            <p className="text-xs text-muted-foreground">
              Players with 70+ camaraderie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concern Players</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.lowCamaraderieCount}</div>
            <p className="text-xs text-muted-foreground">
              Players with &lt;40 camaraderie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Bonus</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effects.contractNegotiationBonus > 0 ? "+" : ""}{effects.contractNegotiationBonus}%
            </div>
            <p className="text-xs text-muted-foreground">
              Contract negotiation modifier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Effects Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Performance Effects
          </CardTitle>
          <CardDescription>
            How team camaraderie affects your players' performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {effects.inGameStatBonus.catching > 0 ? "+" : ""}{effects.inGameStatBonus.catching}
              </div>
              <div className="text-sm text-gray-600">Catching Bonus</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {effects.inGameStatBonus.agility > 0 ? "+" : ""}{effects.inGameStatBonus.agility}
              </div>
              <div className="text-sm text-gray-600">Agility Bonus</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">
                {effects.developmentBonus > 0 ? "+" : ""}{Math.round(effects.developmentBonus * 100)}%
              </div>
              <div className="text-sm text-gray-600">Development Rate</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-600">
                -{Math.round(effects.injuryReduction * 100)}%
              </div>
              <div className="text-sm text-gray-600">Injury Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Team Chemistry
            </CardTitle>
            <CardDescription>Players with highest camaraderie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topPlayers.map((player: Player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{player.firstName} {player.lastName}</div>
                    <div className="text-sm text-gray-600">{player.position} • {player.yearsOnTeam} years on team</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getCamaraderieColor(player.camaraderie)}`}>
                      {player.camaraderie}
                    </div>
                    <Progress value={player.camaraderie} className="w-16 h-2" />
                  </div>
                </div>
              ))}
              {summary.topPlayers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No standout performers yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Concerns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Players of Concern
            </CardTitle>
            <CardDescription>Players with low camaraderie requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.concernPlayers.map((player: Player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <div className="font-medium">{player.firstName} {player.lastName}</div>
                    <div className="text-sm text-gray-600">{player.position} • {player.yearsOnTeam} years on team</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getCamaraderieColor(player.camaraderie)}`}>
                      {player.camaraderie}
                    </div>
                    <Progress value={player.camaraderie} className="w-16 h-2" />
                  </div>
                </div>
              ))}
              {summary.concernPlayers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No concerning players - great team chemistry!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle>How Camaraderie Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Factors Affecting Camaraderie:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Years spent with the team (loyalty bonus)</li>
                <li>• Team performance and winning streaks</li>
                <li>• Championship victories</li>
                <li>• Coach influence and leadership</li>
                <li>• Natural annual decay over time</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Benefits of High Camaraderie:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Improved in-game catching and agility</li>
                <li>• Higher willingness to sign contracts</li>
                <li>• Faster player development (under 24)</li>
                <li>• Reduced injury risk</li>
                <li>• Better team coordination</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}