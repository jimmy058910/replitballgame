import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  camaraderie: number;
  race: string;
  age: number;
  role: string;
}

// Helper function to get camaraderie color based on score
function getCamaraderieColor(camaraderie: number): string {
  if (camaraderie >= 91) return "text-green-500";
  if (camaraderie >= 76) return "text-blue-500";
  if (camaraderie >= 41) return "text-yellow-500";
  if (camaraderie >= 26) return "text-orange-500";
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

export default function CamaraderieManagement({ teamId }: { teamId: string }) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: effects } = useQuery<CamaraderieEffects>({
    queryKey: [`/api/camaraderie/team/${teamId}`],
    enabled: !!teamId,
  });

  const { data: summary } = useQuery<CamaraderieSummary>({
    queryKey: [`/api/camaraderie/summary`],
    enabled: !!teamId,
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });

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
          <h2 className="text-2xl font-bold text-white">Team Camaraderie</h2>
          <p className="text-gray-400">Manage team chemistry and player relationships</p>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="text-sm text-gray-400">Team Chemistry</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Camaraderie Tier Information */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Camaraderie Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{effects.tier.name}</span>
                    <Badge variant="outline">{effects.tier.range}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">{effects.tier.description}</p>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">Current Benefits:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
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
        </TabsContent>

        <TabsContent value="effects">
          <div className="grid gap-6">
            {/* In-Game Stat Bonuses */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  In-Game Stat Effects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Catching:</span>
                      <span className={`text-sm font-medium ${effects.inGameStatBonus.catching > 0 ? 'text-green-400' : effects.inGameStatBonus.catching < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {effects.inGameStatBonus.catching > 0 ? '+' : ''}{effects.inGameStatBonus.catching}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Agility:</span>
                      <span className={`text-sm font-medium ${effects.inGameStatBonus.agility > 0 ? 'text-green-400' : effects.inGameStatBonus.agility < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {effects.inGameStatBonus.agility > 0 ? '+' : ''}{effects.inGameStatBonus.agility}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Pass Accuracy:</span>
                      <span className={`text-sm font-medium ${effects.inGameStatBonus.passAccuracy > 0 ? 'text-green-400' : effects.inGameStatBonus.passAccuracy < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {effects.inGameStatBonus.passAccuracy > 0 ? '+' : ''}{effects.inGameStatBonus.passAccuracy}
                      </span>
                    </div>
                    {effects.inGameStatBonus.fumbleRisk > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">Fumble Risk:</span>
                        <span className="text-sm font-medium text-red-400">+{effects.inGameStatBonus.fumbleRisk}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Development & Contract Effects */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Long-term Effects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Player Development Bonus:</span>
                    <span className={`text-sm font-medium ${effects.developmentBonus > 0 ? 'text-green-400' : effects.developmentBonus < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {effects.developmentBonus > 0 ? '+' : ''}{effects.developmentBonus.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Contract Negotiation Bonus:</span>
                    <span className={`text-sm font-medium ${effects.contractNegotiationBonus > 0 ? 'text-green-400' : effects.contractNegotiationBonus < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {effects.contractNegotiationBonus > 0 ? '+' : ''}{effects.contractNegotiationBonus.toFixed(1)}%
                    </span>
                  </div>
                  {effects.injuryReduction > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Injury Risk Reduction:</span>
                      <span className="text-sm font-medium text-green-400">-{effects.injuryReduction}%</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-3">
                    <p>• Development bonus applies to players 23 and under</p>
                    <p>• Contract bonus affects individual player willingness to sign</p>
                    {effects.injuryReduction > 0 && <p>• Injury reduction from high team chemistry</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="players">
          <div className="grid gap-6">
            {/* Top Performers */}
            {summary.topPerformers && summary.topPerformers.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <div className="text-sm text-gray-400">Players with highest team chemistry</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.topPerformers.map((player: Player) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">{player.firstName} {player.lastName}</div>
                            <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getCamaraderieColor(player.camaraderie)}`}>
                            {player.camaraderie}
                          </div>
                          <div className="text-xs text-gray-400">Team Chemistry</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Concerned Players */}
            {summary.concernedPlayers && summary.concernedPlayers.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Players of Concern
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.concernedPlayers.map((player: Player) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">{player.firstName} {player.lastName}</div>
                            <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getCamaraderieColor(player.camaraderie)}`}>
                            {player.camaraderie}
                          </div>
                          <div className="text-xs text-gray-400">Team Chemistry</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Players */}
            {players && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>All Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {players.map((player: Player) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            player.camaraderie >= 80 ? 'bg-green-500' : 
                            player.camaraderie >= 60 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="font-medium">{player.firstName} {player.lastName}</div>
                            <div className="text-xs text-gray-400">{player.role?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • {player.race?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown'} • Age {player.age}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getCamaraderieColor(player.camaraderie)}`}>
                            {player.camaraderie}
                          </div>
                          <div className="text-xs text-gray-400">Team Chemistry</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}