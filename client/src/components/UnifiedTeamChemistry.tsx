import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingUp, Shield, Users, Star } from "lucide-react";

interface CamaraderieEffects {
  teamCamaraderie: number;
  status: 'excellent' | 'good' | 'average' | 'low' | 'poor';
  contractNegotiationBonus: number;
  inGameStatBonus: {
    catching: number;
    agility: number;
    passAccuracy: number;
    fumbleRisk: number;
  };
  developmentBonus: number;
  injuryReduction: number;
  tier: {
    name: string;
    range: string;
    description: string;
  };
}

interface CamaraderieSummary {
  teamCamaraderie: number;
  highMoraleCount: number;
  lowMoraleCount: number;
  topPerformers: any[];
  concernedPlayers: any[];
}

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  camaraderieScore: number;
  race: string;
  age: number;
  role: string;
  isOnMarket: boolean;
  isRetired: boolean;
}

// Helper function to get camaraderie color based on score
function getCamaraderieColor(camaraderieScore: number): string {
  if (camaraderieScore >= 91) return "text-green-500";
  if (camaraderieScore >= 76) return "text-blue-500";
  if (camaraderieScore >= 41) return "text-yellow-500";
  if (camaraderieScore >= 26) return "text-orange-500";
  return "text-red-500";
}

// Helper function to get camaraderie status badge
function getCamaraderieStatusBadge(status: string): JSX.Element {
  const variants = {
    excellent: "bg-green-500 text-white",
    good: "bg-blue-500 text-white", 
    average: "bg-yellow-500 text-white",
    low: "bg-orange-500 text-white",
    poor: "bg-red-500 text-white"
  };
  
  return (
    <Badge className={`${variants[status as keyof typeof variants]} capitalize`}>
      {status}
    </Badge>
  );
}

export default function UnifiedTeamChemistry({ teamId }: { teamId: string }) {
  const { data: effects } = useQuery<CamaraderieEffects>({
    queryKey: [`/api/camaraderie/team/${teamId}`],
    enabled: !!teamId,
  });

  const { data: summary } = useQuery<CamaraderieSummary>({
    queryKey: [`/api/camaraderie/summary`],
    enabled: !!teamId,
  });

  // Only get active roster players (not on market, not retired)
  const { data: allPlayers } = useQuery<Player[]>({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });

  // Filter to only active roster players (first 12 by creation date, not on market, not retired)
  const players = allPlayers?.filter(player => !player.isOnMarket && !player.isRetired).slice(0, 12) || [];

  if (!effects || !summary) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Loading camaraderie data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Chemistry</h2>
          <p className="text-gray-400">Manage team chemistry and player relationships</p>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="text-sm text-gray-400">Team Chemistry</span>
        </div>
      </div>

      {/* Team Overview & Effects Combined */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Camaraderie Overview */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(summary.teamCamaraderie)}</div>
                <Progress value={summary.teamCamaraderie} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {getCamaraderieStatusBadge(effects.status)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">High Morale:</span>
                  <span className="text-sm text-green-400">{summary.highMoraleCount} players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Low Morale:</span>
                  <span className="text-sm text-red-400">{summary.lowMoraleCount} players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Roster:</span>
                  <span className="text-sm text-gray-400">{players.length}/12 players</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camaraderie Tier & Effects */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Chemistry Effects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{effects.tier.name}</span>
                <Badge variant="outline">{effects.tier.range}</Badge>
              </div>
              <p className="text-sm text-gray-400">{effects.tier.description}</p>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">Active Benefits:</div>
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <div>Contract Bonus: {effects.contractNegotiationBonus > 0 ? '+' : ''}{effects.contractNegotiationBonus.toFixed(1)}%</div>
                  <div>Development Bonus: {effects.developmentBonus > 0 ? '+' : ''}{effects.developmentBonus.toFixed(1)}%</div>
                  {effects.injuryReduction > 0 && <div>Injury Reduction: -{effects.injuryReduction}%</div>}
                  {effects.inGameStatBonus.fumbleRisk > 0 && <div className="text-red-400">Fumble Risk: +{effects.inGameStatBonus.fumbleRisk}%</div>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In-Game Stat Effects */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            In-Game Stat Bonuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-400">Catching</div>
              <div className={`text-lg font-medium ${effects.inGameStatBonus.catching > 0 ? 'text-green-400' : effects.inGameStatBonus.catching < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {effects.inGameStatBonus.catching > 0 ? '+' : ''}{effects.inGameStatBonus.catching}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Agility</div>
              <div className={`text-lg font-medium ${effects.inGameStatBonus.agility > 0 ? 'text-green-400' : effects.inGameStatBonus.agility < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {effects.inGameStatBonus.agility > 0 ? '+' : ''}{effects.inGameStatBonus.agility}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Pass Accuracy</div>
              <div className={`text-lg font-medium ${effects.inGameStatBonus.passAccuracy > 0 ? 'text-green-400' : effects.inGameStatBonus.passAccuracy < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {effects.inGameStatBonus.passAccuracy > 0 ? '+' : ''}{effects.inGameStatBonus.passAccuracy}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Fumble Risk</div>
              <div className={`text-lg font-medium ${effects.inGameStatBonus.fumbleRisk > 0 ? 'text-red-400' : effects.inGameStatBonus.fumbleRisk < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {effects.inGameStatBonus.fumbleRisk > 0 ? '+' : ''}{effects.inGameStatBonus.fumbleRisk}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players with High Morale */}
      {summary.topPerformers && summary.topPerformers.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              High Morale Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {summary.topPerformers.map((player: any) => (
                <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{player.firstName} {player.lastName}</div>
                      <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getCamaraderieColor(player.camaraderieScore || 50)}`}>
                      {player.camaraderieScore || 50}
                    </div>
                    <div className="text-xs text-gray-400">Chemistry</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players of Concern */}
      {summary.concernedPlayers && summary.concernedPlayers.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Players of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {summary.concernedPlayers.map((player: any) => (
                <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{player.firstName} {player.lastName}</div>
                      <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getCamaraderieColor(player.camaraderieScore || 50)}`}>
                      {player.camaraderieScore || 50}
                    </div>
                    <div className="text-xs text-gray-400">Chemistry</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Active Roster Players */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Active Roster ({players.length}/12)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {players.map((player: Player) => (
              <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    player.camaraderieScore >= 70 ? 'bg-green-500' : 
                    player.camaraderieScore >= 30 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium">{player.firstName} {player.lastName}</div>
                    <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • {player.race?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getCamaraderieColor(player.camaraderieScore)}`}>
                    {player.camaraderieScore}
                  </div>
                  <div className="text-xs text-gray-400">Chemistry</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}