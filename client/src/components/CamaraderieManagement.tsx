import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Heart, TrendingUp, Award, Info, Target, Activity, Eye, HelpCircle } from 'lucide-react';
import PlayerDetailModal from './PlayerDetailModal';

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
}

// Helper function to get camaraderie color and status (updated to match new tier system)
function getCamaraderieInfo(camaraderie: number): { color: string; status: string; emoji: string; bgColor: string } {
  if (camaraderie >= 80) return { color: "text-green-500", status: "Excellent", emoji: "😃", bgColor: "bg-green-500/20 border-green-500" };
  if (camaraderie >= 60) return { color: "text-blue-500", status: "Good", emoji: "😊", bgColor: "bg-blue-500/20 border-blue-500" };
  if (camaraderie >= 40) return { color: "text-yellow-500", status: "Average", emoji: "😐", bgColor: "bg-yellow-500/20 border-yellow-500" };
  if (camaraderie >= 20) return { color: "text-orange-500", status: "Poor", emoji: "😕", bgColor: "bg-orange-500/20 border-orange-500" };
  return { color: "text-red-500", status: "Terrible", emoji: "😞", bgColor: "bg-red-500/20 border-red-500" };
}

// Radial gauge component
function RadialGauge({ value, maxValue = 100, size = 200 }: { value: number; maxValue?: number; size?: number }) {
  const percentage = (value / maxValue) * 100;
  const { color, status } = getCamaraderieInfo(value);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="45"
          stroke="rgb(55, 65, 81)"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="45"
          stroke={value >= 91 ? "#10b981" : value >= 76 ? "#3b82f6" : value >= 41 ? "#eab308" : value >= 26 ? "#f97316" : "#ef4444"}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-gray-400">{status}</div>
      </div>
    </div>
  );
}

export default function CamaraderieManagement({ teamId }: { teamId: string }) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { data: effects } = useQuery<CamaraderieEffects>({
    queryKey: [`/api/camaraderie/team/${teamId}`],
    enabled: !!teamId,
  });

  const { data: summary } = useQuery<CamaraderieSummary>({
    queryKey: [`/api/camaraderie/summary`],
    enabled: !!teamId,
  });

  const { data: teamData } = useQuery<any>({
    queryKey: ['/api/teams/my'],
    enabled: !!teamId,
  });
  
  const playersData = teamData?.players || [];

  if (!effects || !summary) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Loading camaraderie data...</div>
      </div>
    );
  }

  const players = playersData || [];
  const teamCamaraderie = summary.teamCamaraderie;
  const { status, emoji } = getCamaraderieInfo(teamCamaraderie);

  // Calculate morale breakdown
  const highMoraleCount = players.filter((p: any) => p.camaraderieScore >= 70).length;
  const lowMoraleCount = players.filter((p: any) => p.camaraderieScore < 40).length;

  return (
    <div className="space-y-6 px-4 py-6">

      {/* A. Team Camaraderie Overview - Radial Gauge */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <RadialGauge value={teamCamaraderie} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-2xl">{emoji}</span>
                <h3 className="text-xl font-bold text-white">Team Camaraderie: {teamCamaraderie}</h3>
              </div>
              <p className="text-lg text-gray-300 mb-3">{status} – {effects.tier.description}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {effects.inGameStatBonus.catching > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500">
                    +{effects.inGameStatBonus.catching} Catching
                  </Badge>
                )}
                {effects.inGameStatBonus.agility > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
                    +{effects.inGameStatBonus.agility} Agility
                  </Badge>
                )}
                {effects.inGameStatBonus.passAccuracy > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500">
                    +{effects.inGameStatBonus.passAccuracy} Pass Accuracy
                  </Badge>
                )}
                {effects.inGameStatBonus.fumbleRisk < 0 && (
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500">
                    {effects.inGameStatBonus.fumbleRisk} Fumble Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B. Morale Breakdown & C. In-Game Stat Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Morale Breakdown */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Morale Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Camaraderie Summary */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Team Camaraderie: {teamCamaraderie}</h3>
                  <p className="text-gray-300">{status} – Team spirit is suffering badly.</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">High Morale Players</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500">
                {highMoraleCount} players
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Low Morale Players</span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500">
                {lowMoraleCount} players
              </Badge>
            </div>
            {lowMoraleCount > 0 && (
              <div className="p-3 bg-orange-500/20 border border-orange-500 rounded-lg">
                <p className="text-orange-400 text-sm">
                  ⚠️ {lowMoraleCount} players below 40 morale; team penalties may apply.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* In-Game Stat Effects */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5" />
              Active Stat Effects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-500/20 border border-green-500 rounded-lg text-center">
                <div className="text-green-400 font-bold">Catching</div>
                <div className="text-white text-lg">{effects.inGameStatBonus.catching >= 0 ? '+' : ''}{effects.inGameStatBonus.catching}</div>
              </div>
              <div className="p-3 bg-blue-500/20 border border-blue-500 rounded-lg text-center">
                <div className="text-blue-400 font-bold">Agility</div>
                <div className="text-white text-lg">{effects.inGameStatBonus.agility >= 0 ? '+' : ''}{effects.inGameStatBonus.agility}</div>
              </div>
              <div className="p-3 bg-purple-500/20 border border-purple-500 rounded-lg text-center">
                <div className="text-purple-400 font-bold">Pass Accuracy</div>
                <div className="text-white text-lg">{effects.inGameStatBonus.passAccuracy >= 0 ? '+' : ''}{effects.inGameStatBonus.passAccuracy}</div>
              </div>
              <div className="p-3 bg-teal-500/20 border border-teal-500 rounded-lg text-center">
                <div className="text-teal-400 font-bold">Fumble Risk</div>
                <div className="text-white text-lg">{effects.inGameStatBonus.fumbleRisk}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-400">
                Based on current camaraderie tier, these bonuses apply to all matches.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* D. Player Camaraderie Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Heart className="w-5 h-5" />
            Player Camaraderie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Mobile: Full-width cards */}
            <div className="block md:hidden space-y-3">
              {players.map((player: any) => {
                const { color, status, emoji } = getCamaraderieInfo(player.camaraderieScore);
                return (
                  <div key={player.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-white">{player.firstName} {player.lastName}</div>
                        <div className="text-sm text-gray-400">{player.role}</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className={`font-bold ${color}`}>{player.camaraderieScore}</span>
                      </div>
                      <Badge className={`${getCamaraderieInfo(player.camaraderieScore).bgColor} border`}>
                        {status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-3 text-gray-300 font-medium">Player Name</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Role</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Camaraderie</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Status</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player: any) => {
                      const { color, status, emoji } = getCamaraderieInfo(player.camaraderieScore);
                      return (
                        <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="p-3">
                            <div className="font-medium text-white">{player.firstName} {player.lastName}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary">{player.role}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-lg">{emoji}</span>
                              <span className={`font-bold text-lg ${color}`}>{player.camaraderieScore}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`${getCamaraderieInfo(player.camaraderieScore).bgColor} border`}>
                              {status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              onClick={() => setSelectedPlayer(player)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>





      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          focusSection="camaraderie"
        />
      )}
    </div>
  );
}