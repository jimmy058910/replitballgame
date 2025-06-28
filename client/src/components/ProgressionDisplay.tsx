import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Star, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressionDisplayProps {
  playerId: string;
  playerAge: number;
}

interface StatProgression {
  name: string;
  current: number;
  potential: number;
  potential10Point: number;
  cap: number;
}

interface ProgressionData {
  stats: StatProgression[];
  ageBonus: string;
  dailyProgressChance: number;
  declineRisk: string | null;
}

interface StaffEffects {
  headCoach: {
    motivationBonus: string;
    developmentMultiplier: string;
    tacticsBonus: string;
    camaraderieGrowth: string;
  } | null;
  recoverySpec: {
    injuryRecovery: string;
    rehabBonus: string;
  } | null;
  trainers: {
    offense: string | null;
    defense: string | null;
    physical: string | null;
  };
  teamCamaraderie: {
    current: number;
    effect: string;
  };
}

export default function ProgressionDisplay({ playerId, playerAge }: ProgressionDisplayProps) {
  const { data: progressionData, isLoading: progressionLoading } = useQuery<ProgressionData>({
    queryKey: [`/api/players/${playerId}/progression`],
  });

  const { data: teamData } = useQuery({
    queryKey: ['/api/teams/my'],
  });

  const { data: staffEffects, isLoading: staffLoading } = useQuery<StaffEffects>({
    queryKey: [`/api/teams/${teamData?.id}/staff-effects`],
    enabled: !!teamData?.id,
  });

  if (progressionLoading || staffLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!progressionData) {
    return <div>Unable to load progression data</div>;
  }

  const getStatColor = (current: number, cap: number) => {
    const percentage = (current / cap) * 100;
    if (percentage >= 90) return "text-green-400";
    if (percentage >= 70) return "text-yellow-400";
    return "text-gray-400";
  };

  const getProgressColor = (current: number, cap: number) => {
    const percentage = (current / cap) * 100;
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Age & Growth Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Development Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Age Category</span>
            <Badge variant={playerAge <= 23 ? "default" : playerAge >= 31 ? "destructive" : "secondary"}>
              {progressionData.ageBonus}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Daily Progress Chance</span>
            <span className={`font-semibold ${progressionData.dailyProgressChance > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {progressionData.dailyProgressChance > 0 ? '+' : ''}{progressionData.dailyProgressChance}%
            </span>
          </div>
          {progressionData.declineRisk && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Physical Decline Risk</span>
              <span className="text-red-400 text-sm">{progressionData.declineRisk}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat Caps & Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Stat Development Caps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressionData.stats.map((stat) => (
            <div key={stat.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm capitalize">{stat.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${getStatColor(stat.current, stat.cap)}`}>
                    {stat.current}/{stat.cap}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    {stat.potential10Point}/10
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stat.current / stat.cap) * 100} 
                className={`h-2 ${getProgressColor(stat.current, stat.cap)}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Staff Effects */}
      {staffEffects && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff & Team Effects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffEffects.headCoach && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Head Coach Effects</h4>
                <div className="text-xs space-y-1 text-gray-400">
                  <div>• Motivation: {staffEffects.headCoach.motivationBonus}</div>
                  <div>• Development: {staffEffects.headCoach.developmentMultiplier}</div>
                  <div>• Tactics: {staffEffects.headCoach.tacticsBonus}</div>
                  <div>• Team Building: {staffEffects.headCoach.camaraderieGrowth}</div>
                </div>
              </div>
            )}
            
            {staffEffects.recoverySpec && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recovery Specialist</h4>
                <div className="text-xs space-y-1 text-gray-400">
                  <div>• Recovery Rate: {staffEffects.recoverySpec.injuryRecovery}</div>
                  <div>• Injury Prevention: {staffEffects.recoverySpec.rehabBonus}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Trainer Bonuses</h4>
              <div className="text-xs space-y-1 text-gray-400">
                {staffEffects.trainers.offense && <div>• Offense: {staffEffects.trainers.offense}</div>}
                {staffEffects.trainers.defense && <div>• Defense: {staffEffects.trainers.defense}</div>}
                {staffEffects.trainers.physical && <div>• Physical: {staffEffects.trainers.physical}</div>}
                {!staffEffects.trainers.offense && !staffEffects.trainers.defense && !staffEffects.trainers.physical && (
                  <div>No trainers hired</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Team Camaraderie</h4>
              <div className="flex items-center justify-between">
                <Progress value={staffEffects.teamCamaraderie.current} className="flex-1 mr-3" />
                <span className="text-sm font-semibold">{staffEffects.teamCamaraderie.current}/100</span>
              </div>
              <div className="text-xs text-gray-400">{staffEffects.teamCamaraderie.effect}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}