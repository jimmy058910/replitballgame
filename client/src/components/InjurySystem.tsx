import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Heart, Clock, Zap, TrendingUp, User, Activity, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlayerInjury {
  id: string;
  playerId: string;
  injuryType: string;
  severity: "minor" | "moderate" | "major" | "career_threatening";
  injuredAt: string;
  estimatedRecoveryDays: number;
  remainingRecoveryDays: number;
  isActive: boolean;
  treatmentType?: string;
  recoveryProgress: number;
  player?: {
    id: string;
    name: string;
    race: string;
    position: string;
  };
}

interface RecoveryTreatment {
  id: string;
  name: string;
  description: string;
  cost: number;
  recoveryBonus: number;
  riskReduction: number;
  duration: number;
  requiredStaffLevel: number;
}

export default function InjurySystem() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team players with injury data
  const { data: players } = useQuery({
    queryKey: ["/api/players/my-team"],
  });

  // Fetch active injuries
  const { data: activeInjuries } = useQuery({
    queryKey: ["/api/injuries/active"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Fetch injury history
  const { data: injuryHistory } = useQuery({
    queryKey: ["/api/injuries/history"],
  });

  // Fetch available treatments
  const { data: treatments } = useQuery({
    queryKey: ["/api/treatments"],
  });

  // Apply treatment mutation
  const applyTreatmentMutation = useMutation({
    mutationFn: async ({ injuryId, treatmentId }: any) => 
      apiRequest(`/api/injuries/${injuryId}/treatment`, {
        method: "POST",
        body: JSON.stringify({ treatmentId }),
      }),
    onSuccess: () => {
      toast({
        title: "Treatment Applied",
        description: "Recovery treatment has been started for the player",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/injuries/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/my-team"] });
    },
  });

  // Rush recovery mutation (premium option)
  const rushRecoveryMutation = useMutation({
    mutationFn: async (injuryId: string) => 
      apiRequest(`/api/injuries/${injuryId}/rush-recovery`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: "Recovery Rushed",
        description: "Player recovery has been accelerated using premium gems",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/injuries/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/my-team"] });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "moderate":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "major":
        return "bg-red-100 text-red-800 border-red-200";
      case "career_threatening":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getInjuryIcon = (injuryType: string) => {
    const iconClass = "h-5 w-5";
    switch (injuryType.toLowerCase()) {
      case "muscle_strain":
      case "pulled_muscle":
        return <Activity className={iconClass} />;
      case "bone_fracture":
      case "broken_bone":
        return <Shield className={iconClass} />;
      case "concussion":
      case "head_injury":
        return <AlertTriangle className={iconClass} />;
      default:
        return <Heart className={iconClass} />;
    }
  };

  const formatRecoveryTime = (days: number) => {
    if (days < 1) return "Less than 1 day";
    if (days === 1) return "1 day";
    if (days < 7) return `${Math.ceil(days)} days`;
    const weeks = Math.floor(days / 7);
    const remainingDays = Math.ceil(days % 7);
    if (remainingDays === 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    return `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
  };

  const injuredPlayers = players?.filter((player: any) => 
    activeInjuries?.some((injury: PlayerInjury) => 
      injury.playerId === player.id && injury.isActive
    )
  ) || [];

  const healthyPlayers = players?.filter((player: any) => 
    !activeInjuries?.some((injury: PlayerInjury) => 
      injury.playerId === player.id && injury.isActive
    )
  ) || [];

  const getInjuryRisk = (player: any) => {
    // Calculate injury risk based on age, stamina, recent injuries
    let risk = 10; // Base risk
    
    if (player.age > 30) risk += 15;
    if (player.age > 35) risk += 25;
    if (player.stamina < 60) risk += 20;
    if (player.stamina < 40) risk += 30;
    
    // Check recent injury history
    const recentInjuries = injuryHistory?.filter((injury: PlayerInjury) => 
      injury.playerId === player.id && 
      new Date(injury.injuredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) || [];
    
    risk += recentInjuries.length * 15;
    
    return Math.min(100, Math.max(0, risk));
  };

  const getRiskColor = (risk: number) => {
    if (risk < 25) return "text-green-600 bg-green-100";
    if (risk < 50) return "text-yellow-600 bg-yellow-100";
    if (risk < 75) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Active Injuries</p>
                <p className="text-2xl font-bold">{activeInjuries?.length || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Healthy Players</p>
                <p className="text-2xl font-bold">{healthyPlayers.length}</p>
              </div>
              <Heart className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">In Recovery</p>
                <p className="text-2xl font-bold">
                  {activeInjuries?.filter((i: PlayerInjury) => i.treatmentType).length || 0}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Avg Recovery</p>
                <p className="text-2xl font-bold">
                  {activeInjuries?.length > 0 
                    ? Math.round(activeInjuries.reduce((acc: number, injury: PlayerInjury) => 
                        acc + injury.recoveryProgress, 0) / activeInjuries.length) 
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Injuries</TabsTrigger>
          <TabsTrigger value="prevention">Injury Prevention</TabsTrigger>
          <TabsTrigger value="history">Injury History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeInjuries && activeInjuries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {activeInjuries.map((injury: PlayerInjury) => (
                  <motion.div
                    key={injury.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center space-x-2">
                              {getInjuryIcon(injury.injuryType)}
                              <span>{injury.player?.name}</span>
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {injury.player?.race} {injury.player?.position}
                            </p>
                          </div>
                          <Badge className={`${getSeverityColor(injury.severity)} capitalize`}>
                            {injury.severity.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-red-800 mb-1">
                            {injury.injuryType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Injured {Math.floor((Date.now() - new Date(injury.injuredAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Recovery Progress</span>
                            <span className="font-semibold">{injury.recoveryProgress}%</span>
                          </div>
                          <Progress value={injury.recoveryProgress} className="h-3" />
                          <p className="text-xs text-gray-600">
                            {formatRecoveryTime(injury.remainingRecoveryDays)} remaining
                          </p>
                        </div>

                        {injury.treatmentType ? (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-1">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-blue-800">Treatment Active</span>
                            </div>
                            <p className="text-sm text-blue-700 capitalize">
                              {injury.treatmentType.replace('_', ' ')}
                            </p>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1">
                                  <Heart className="h-4 w-4 mr-2" />
                                  Apply Treatment
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Recovery Treatment - {injury.player?.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {treatments?.map((treatment: RecoveryTreatment) => (
                                    <Card key={treatment.id} className="p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold">{treatment.name}</h4>
                                        <Badge variant="outline">{treatment.cost} credits</Badge>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-3">{treatment.description}</p>
                                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                        <div>Recovery Bonus: +{treatment.recoveryBonus}%</div>
                                        <div>Risk Reduction: -{treatment.riskReduction}%</div>
                                        <div>Duration: {treatment.duration} days</div>
                                        <div>Staff Level: {treatment.requiredStaffLevel}</div>
                                      </div>
                                      <Button 
                                        className="w-full"
                                        onClick={() => applyTreatmentMutation.mutate({
                                          injuryId: injury.id,
                                          treatmentId: treatment.id
                                        })}
                                        disabled={applyTreatmentMutation.isPending}
                                      >
                                        Apply Treatment
                                      </Button>
                                    </Card>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              onClick={() => rushRecoveryMutation.mutate(injury.id)}
                              disabled={rushRecoveryMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Rush (Gems)
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-green-700">All Players Healthy!</h3>
                <p className="text-gray-600">No active injuries on your team. Keep up the good work with injury prevention!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prevention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Injury Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players?.map((player: any) => {
                  const risk = getInjuryRisk(player);
                  return (
                    <Card key={player.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{player.name}</h4>
                          <p className="text-sm text-gray-600">{player.race} {player.position}</p>
                        </div>
                        <Badge className={getRiskColor(risk)}>
                          {risk}% risk
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Age Risk:</span>
                          <span>{player.age > 35 ? 'High' : player.age > 30 ? 'Medium' : 'Low'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Stamina:</span>
                          <span className={player.stamina < 60 ? 'text-red-600' : 'text-green-600'}>
                            {player.stamina}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Recent Injuries:</span>
                          <span>{injuryHistory?.filter((injury: PlayerInjury) => 
                            injury.playerId === player.id && 
                            new Date(injury.injuredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          ).length || 0}</span>
                        </div>
                      </div>

                      {risk > 50 && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-800">
                            Consider rest or recovery training to reduce injury risk.
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Injury History</CardTitle>
            </CardHeader>
            <CardContent>
              {injuryHistory && injuryHistory.length > 0 ? (
                <div className="space-y-3">
                  {injuryHistory.slice(0, 10).map((injury: PlayerInjury) => (
                    <div key={injury.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getInjuryIcon(injury.injuryType)}
                        <div>
                          <p className="font-semibold">{injury.player?.name}</p>
                          <p className="text-sm text-gray-600">
                            {injury.injuryType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getSeverityColor(injury.severity)}>
                          {injury.severity.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(injury.injuredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No injury history found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}