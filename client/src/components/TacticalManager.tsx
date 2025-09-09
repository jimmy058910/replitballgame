import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Info, Target, Zap, Shield, BarChart3, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Team } from '@shared/types/models';


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

export default function TacticalManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current tactical setup
  const { data: tacticalData, isLoading } = useQuery<TacticalSetup>({
    queryKey: ["/api/tactics/team-tactics"],
  });

  // Mutations for updating tactics
  const updateFieldSizeMutation = useMutation({
    mutationFn: async (fieldSize: string) => {
      const response = await apiRequest("/api/tactics/update-field-size", "POST", { fieldSize });
      return response; // apiRequest already returns JSON data
    },
    onSuccess: (data) => {
      toast({
        title: "Field Size Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
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
      return response; // apiRequest already returns JSON data
    },
    onSuccess: (data) => {
      toast({
        title: "Tactical Focus Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
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

      <div className="space-y-6">
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
      </div>
    </div>
  );
}