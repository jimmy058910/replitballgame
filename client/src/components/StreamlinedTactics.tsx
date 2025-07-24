import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Sword, AlertTriangle, Save, RotateCcw, Target, Shield, Zap } from "lucide-react";

interface StreamlinedTacticsProps {
  teamId: string;
}

interface TacticalData {
  fieldSize: string;
  tacticalFocus: string;
  canChangeFieldSize: boolean;
  effectiveness: {
    fieldSize: number;
    tacticalFocus: number;
    overall: number;
  };
}

interface TeamData {
  teamCamaraderie: number;
  camaraderie: number;
}

interface StaffData {
  tactics?: number;
}

export default function StreamlinedTactics({ teamId }: StreamlinedTacticsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFieldSize, setSelectedFieldSize] = useState<string>('standard');
  const [selectedTacticalFocus, setSelectedTacticalFocus] = useState<string>('balanced');

  // Fetch tactical data
  const { data: tacticalData, isLoading: tacticalLoading } = useQuery<TacticalData>({
    queryKey: [`/api/tactics/team-tactics/${teamId}`],
    enabled: !!teamId,
  });

  // Fetch team data for camaraderie
  const { data: teamData } = useQuery<TeamData>({
    queryKey: ["/api/teams/my"],
    enabled: !!teamId,
  });

  // Fetch staff data for coach bonus
  const { data: staffData } = useQuery<StaffData[]>({
    queryKey: [`/api/teams/${teamId}/staff`],
    enabled: !!teamId,
  });

  // Initialize state from API data
  useEffect(() => {
    if (tacticalData) {
      setSelectedFieldSize(tacticalData.fieldSize);
      setSelectedTacticalFocus(tacticalData.tacticalFocus);
    }
  }, [tacticalData]);

  // Save tactics mutation
  const saveTacticsMutation = useMutation({
    mutationFn: async () => {
      const promises = [];
      
      if (selectedFieldSize !== tacticalData?.fieldSize) {
        promises.push(
          fetch(`/api/tactics/update-field-size`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldSize: selectedFieldSize })
          })
        );
      }
      
      if (selectedTacticalFocus !== tacticalData?.tacticalFocus) {
        promises.push(
          fetch(`/api/tactics/update-tactical-focus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tacticalFocus: selectedTacticalFocus })
          })
        );
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: 'Tactics Updated',
        description: 'Your tactical settings have been saved successfully.'
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tactics/team-tactics/${teamId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update tactics',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    saveTacticsMutation.mutate();
  };

  const handleReset = () => {
    if (tacticalData) {
      setSelectedFieldSize(tacticalData.fieldSize);
      setSelectedTacticalFocus(tacticalData.tacticalFocus);
    }
  };

  const getHeadCoach = () => {
    return staffData?.find((staff: any) => staff.type === 'HEAD_COACH');
  };

  const getCoachBonus = () => {
    const headCoach = getHeadCoach();
    return headCoach?.tactics || 0;
  };

  const getTeamCamaraderie = () => {
    return (teamData as any)?.teamCamaraderie || teamData?.camaraderie || 67;
  };

  const getEffectiveness = () => {
    return tacticalData?.effectiveness?.overall || 72;
  };

  const getCamaraderieStatus = (value: number) => {
    if (value >= 80) return { label: 'Excellent', emoji: '😊' };
    if (value >= 60) return { label: 'Good', emoji: '😊' };
    if (value >= 40) return { label: 'Average', emoji: '😐' };
    return { label: 'Poor', emoji: '😔' };
  };

  const fieldSizeOptions = [
    { value: 'large', label: 'Large', description: '⚠ Off-season only', disabled: !tacticalData?.canChangeFieldSize },
    { value: 'standard', label: 'Normal', description: 'Active', disabled: false },
    { value: 'small', label: 'Small', description: '⚠ Off-season only', disabled: !tacticalData?.canChangeFieldSize }
  ];

  const tacticalFocusOptions = [
    { value: 'all_out_attack', label: 'All-Out Attack', description: '↑ scoring  ↑ fatigue', icon: <Zap className="w-4 h-4" /> },
    { value: 'balanced', label: 'Balanced', description: 'standard play', icon: <Target className="w-4 h-4" /> },
    { value: 'defensive_wall', label: 'Defensive Wall', description: '↓ scoring  ↓ opp. scoring', icon: <Shield className="w-4 h-4" /> }
  ];

  if (tacticalLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const camaraderieValue = getTeamCamaraderie();
  const camaraderieStatus = getCamaraderieStatus(camaraderieValue);
  const coachBonus = getCoachBonus();
  const effectiveness = getEffectiveness();

  return (
    <div className="space-y-6">
      <Accordion type="single" defaultValue="tactics" className="w-full">
        <AccordionItem value="tactics">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5" />
              Match-Day Tactics
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4">
              {/* Field Size Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Field Size</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fieldSizeOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => !option.disabled && setSelectedFieldSize(option.value)}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-all
                        ${selectedFieldSize === option.value 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : 'border-gray-300 hover:border-gray-400'
                        }
                        ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-4 h-4 rounded-full border-2 
                            ${selectedFieldSize === option.value 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300'
                            }
                          `} />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                        {option.disabled && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Coach Bonus</span>
                      <span>{coachBonus} / 40</span>
                    </div>
                    <Progress value={(coachBonus / 40) * 100} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Stamina Impact</span>
                      <span>+10% drain</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tactical Focus Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tactical Focus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tacticalFocusOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => setSelectedTacticalFocus(option.value)}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-all
                        ${selectedTacticalFocus === option.value 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                          : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 
                          ${selectedTacticalFocus === option.value 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300'
                          }
                        `} />
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Team Camaraderie</span>
                      <span className="flex items-center gap-1">
                        {camaraderieValue} / 100 {camaraderieStatus.emoji} {camaraderieStatus.label}
                      </span>
                    </div>
                    <Progress value={camaraderieValue} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Effectiveness</span>
                      <span className="flex items-center gap-1">
                        {effectiveness} / 100 
                        <Badge variant={effectiveness >= 70 ? "default" : "secondary"}>
                          {effectiveness >= 70 ? "🟢" : "🟡"}
                        </Badge>
                      </span>
                    </div>
                    <Progress value={effectiveness} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saveTacticsMutation.isPending}
                  className="flex items-center gap-2 flex-1"
                >
                  <Save className="w-4 h-4" />
                  {saveTacticsMutation.isPending ? 'Saving...' : 'Save Tactics'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}