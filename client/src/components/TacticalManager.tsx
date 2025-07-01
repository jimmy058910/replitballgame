import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Info, Target, Zap, Shield, BarChart3, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TacticalSetup {
  fieldSize: string;
  tacticalFocus: string;
  canChangeFieldSize: boolean;
  fieldSizeInfo: {
    name: string;
    description: string;
    strategicFocus: string;
  };
  tacticalFocusInfo: {
    name: string;
    description: string;
  };
  headCoachTactics: number;
  teamCamaraderie: number;
  effectiveness: {
    fieldSizeEffectiveness: number;
    tacticalFocusEffectiveness: number;
    overallEffectiveness: number;
    recommendations: string[];
  };
  availableFieldSizes: string[];
  availableTacticalFoci: string[];
}

interface TacticalAnalysis {
  currentSetup: {
    fieldSize: string;
    tacticalFocus: string;
  };
  analyses: Array<{
    fieldSize: string;
    tacticalFocus: string;
    fieldSizeEffectiveness: number;
    tacticalFocusEffectiveness: number;
    overallEffectiveness: number;
    recommendations: string[];
    fieldSizeInfo: any;
    tacticalFocusInfo: any;
  }>;
  bestSetup: any;
}

export default function TacticalManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current tactical setup
  const { data: tacticalData, isLoading } = useQuery<TacticalSetup>({
    queryKey: ["/api/tactics/team-tactics"],
  });

  // Fetch tactical analysis
  const { data: analysisData } = useQuery<TacticalAnalysis>({
    queryKey: ["/api/tactics/tactical-analysis"],
  });

  // Mutations for updating tactics
  const updateFieldSizeMutation = useMutation({
    mutationFn: async (fieldSize: string) => {
      const response = await apiRequest("/api/tactics/update-field-size", "POST", { fieldSize });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Field Size Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/tactical-analysis"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTacticalFocusMutation = useMutation({
    mutationFn: async (tacticalFocus: string) => {
      const response = await apiRequest("/api/tactics/update-tactical-focus", "POST", { tacticalFocus });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tactical Focus Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/tactical-analysis"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 0.7) return "text-green-600";
    if (effectiveness >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getEffectivenessIcon = (effectiveness: number) => {
    if (effectiveness >= 0.7) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (effectiveness >= 0.5) return <Info className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getFieldSizeIcon = (fieldSize: string) => {
    switch (fieldSize) {
      case "large": return <Zap className="w-5 h-5 text-blue-500" />;
      case "small": return <Shield className="w-5 h-5 text-red-500" />;
      default: return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTacticalFocusIcon = (focus: string) => {
    switch (focus) {
      case "all_out_attack": return <Zap className="w-5 h-5 text-red-500" />;
      case "defensive_wall": return <Shield className="w-5 h-5 text-blue-500" />;
      default: return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Tactics & Strategy</h2>
          <p className="text-muted-foreground">Configure your team's field specialization and tactical approach</p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Advanced Strategy System</span>
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="current">Current Setup</TabsTrigger>
          <TabsTrigger value="analysis">Effectiveness Analysis</TabsTrigger>
          <TabsTrigger value="optimize">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Current Tactical Setup */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Field Size Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getFieldSizeIcon(tacticalData?.fieldSize || "standard")}
                  Field Size Specialization
                </CardTitle>
                <CardDescription>
                  Home field advantage - can only be changed during off-season or Day 1
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tacticalData?.fieldSizeInfo?.name}</span>
                  <Badge variant={tacticalData?.canChangeFieldSize ? "default" : "secondary"}>
                    {tacticalData?.canChangeFieldSize ? "Can Change" : "Locked"}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {tacticalData?.fieldSizeInfo?.description}
                </p>
                
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">Strategic Focus: {tacticalData?.fieldSizeInfo?.strategicFocus}</p>
                </div>

                {tacticalData?.canChangeFieldSize && (
                  <Select 
                    value={tacticalData?.fieldSize} 
                    onValueChange={(value) => updateFieldSizeMutation.mutate(value)}
                    disabled={updateFieldSizeMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Field</SelectItem>
                      <SelectItem value="large">Large Field</SelectItem>
                      <SelectItem value="small">Small Field</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Tactical Focus Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTacticalFocusIcon(tacticalData?.tacticalFocus || "balanced")}
                  Tactical Focus
                </CardTitle>
                <CardDescription>
                  Pre-game strategy - can be changed before any match
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tacticalData?.tacticalFocusInfo?.name}</span>
                  <Badge variant="default">Changeable</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {tacticalData?.tacticalFocusInfo?.description}
                </p>

                <Select 
                  value={tacticalData?.tacticalFocus} 
                  onValueChange={(value) => updateTacticalFocusMutation.mutate(value)}
                  disabled={updateTacticalFocusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="all_out_attack">All-Out Attack</SelectItem>
                    <SelectItem value="defensive_wall">Defensive Wall</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Current Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Current Setup Effectiveness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Field Size</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(tacticalData?.effectiveness?.fieldSizeEffectiveness || 0)}`}>
                      {((tacticalData?.effectiveness?.fieldSizeEffectiveness || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(tacticalData?.effectiveness?.fieldSizeEffectiveness || 0) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tactical Focus</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(tacticalData?.effectiveness?.tacticalFocusEffectiveness || 0)}`}>
                      {((tacticalData?.effectiveness?.tacticalFocusEffectiveness || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(tacticalData?.effectiveness?.tacticalFocusEffectiveness || 0) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall</span>
                    <span className={`text-sm font-bold ${getEffectivenessColor(tacticalData?.effectiveness?.overallEffectiveness || 0)}`}>
                      {((tacticalData?.effectiveness?.overallEffectiveness || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(tacticalData?.effectiveness?.overallEffectiveness || 0) * 100} />
                </div>
              </div>

              {tacticalData?.effectiveness?.recommendations && tacticalData.effectiveness.recommendations.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Recommendations:</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {tacticalData.effectiveness.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Context */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Team Camaraderie</span>
                  <span className="text-sm font-medium">{tacticalData?.teamCamaraderie || 50}/100</span>
                </div>
                <Progress value={tacticalData?.teamCamaraderie || 50} />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Head Coach Tactics</span>
                  <span className="text-sm font-medium">{tacticalData?.headCoachTactics || 50}/100</span>
                </div>
                <Progress value={tacticalData?.headCoachTactics || 50} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tactical Effects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Field size provides home field advantage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Tactical focus affects AI behavior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Coach skill amplifies tactical benefits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Camaraderie impacts clutch situations</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Effectiveness Analysis */}
          {analysisData && (
            <Card>
              <CardHeader>
                <CardTitle>Tactical Combinations Analysis</CardTitle>
                <CardDescription>
                  Effectiveness of all field size and tactical focus combinations for your roster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisData.analyses.slice(0, 6).map((analysis, index) => (
                    <div 
                      key={`${analysis.fieldSize}-${analysis.tacticalFocus}`}
                      className={`p-4 rounded-lg border ${
                        analysis.fieldSize === analysisData.currentSetup.fieldSize && 
                        analysis.tacticalFocus === analysisData.currentSetup.tacticalFocus
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {analysis.fieldSizeInfo?.name} + {analysis.tacticalFocusInfo?.name}
                          </span>
                          {analysis.fieldSize === analysisData.currentSetup.fieldSize && 
                           analysis.tacticalFocus === analysisData.currentSetup.tacticalFocus && (
                            <Badge variant="outline">Current</Badge>
                          )}
                          {index === 0 && (
                            <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getEffectivenessIcon(analysis.overallEffectiveness)}
                          <span className={`font-bold ${getEffectivenessColor(analysis.overallEffectiveness)}`}>
                            {(analysis.overallEffectiveness * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Field Effectiveness: </span>
                          <span className={getEffectivenessColor(analysis.fieldSizeEffectiveness)}>
                            {(analysis.fieldSizeEffectiveness * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Focus Effectiveness: </span>
                          <span className={getEffectivenessColor(analysis.tacticalFocusEffectiveness)}>
                            {(analysis.tacticalFocusEffectiveness * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {analysis.recommendations.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Notes: </span>
                          {analysis.recommendations[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-6">
          {/* Optimization Suggestions */}
          {analysisData?.bestSetup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Optimal Setup for Your Roster
                </CardTitle>
                <CardDescription>
                  Based on your current players' abilities and coach effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-lg">
                      {analysisData.bestSetup.fieldSizeInfo?.name} + {analysisData.bestSetup.tacticalFocusInfo?.name}
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {(analysisData.bestSetup.overallEffectiveness * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Field Size Benefits:</p>
                      <p className="text-muted-foreground">{analysisData.bestSetup.fieldSizeInfo?.description}</p>
                    </div>
                    <div>
                      <p className="font-medium">Tactical Focus Benefits:</p>
                      <p className="text-muted-foreground">{analysisData.bestSetup.tacticalFocusInfo?.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {tacticalData?.canChangeFieldSize && 
                   analysisData.bestSetup.fieldSize !== tacticalData.fieldSize && (
                    <Button 
                      onClick={() => updateFieldSizeMutation.mutate(analysisData.bestSetup.fieldSize)}
                      disabled={updateFieldSizeMutation.isPending}
                    >
                      Switch to {analysisData.bestSetup.fieldSizeInfo?.name}
                    </Button>
                  )}
                  
                  {analysisData.bestSetup.tacticalFocus !== tacticalData?.tacticalFocus && (
                    <Button 
                      onClick={() => updateTacticalFocusMutation.mutate(analysisData.bestSetup.tacticalFocus)}
                      disabled={updateTacticalFocusMutation.isPending}
                    >
                      Switch to {analysisData.bestSetup.tacticalFocusInfo?.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tactical Strategy Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Tactical Strategy Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Standard Field
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Balanced approach. Good for well-rounded teams with no specific weaknesses.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Large Field
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Favors speed and passing. Best for teams with high speed and throwing stats.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-500" />
                    Small Field
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Emphasizes power and defense. Ideal for physical teams with high power stats.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Situational Tactics</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Winning Big:</strong> AI becomes conservative to protect lead</p>
                  <p>• <strong>Losing Big:</strong> AI switches to desperate all-out attack mode</p>
                  <p>• <strong>Close Late Game:</strong> Team camaraderie determines clutch performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}