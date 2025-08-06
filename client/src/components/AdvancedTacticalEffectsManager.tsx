import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Target, 
  Shield, 
  Zap, 
  Users, 
  BarChart3, 
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Maximize,
  Minimize
} from 'lucide-react';

interface TacticalSetup {
  fieldSize: 'Standard' | 'Large' | 'Small';
  tacticalFocus: 'Balanced' | 'All-Out Attack' | 'Defensive Wall';
  canChangeField: boolean;
  nextFieldChangeWindow: string | null;
}

interface FieldSizeEffects {
  name: string;
  description: string;
  effects: {
    passRangeModifier: number;
    staminaDepletionModifier: number;
    blockerEngagementModifier: number;
    powerBonusModifier: number;
    passAccuracyModifier: number;
    kickAccuracyModifier: number;
  };
}

interface TacticalFocusEffects {
  name: string;
  description: string;
  effects: {
    offensiveAggressiveness: number;
    defensivePositioning: number;
    passRiskTolerance: number;
    runningDepth: number;
    defensiveVulnerability: number;
  };
}

interface EffectivenessAnalysis {
  overallScore: number;
  fieldSizeScore: number;
  tacticalFocusScore: number;
  coachInfluence: number;
  camaraderieBonus: number;
  recommendations: string[];
  rosterSuitability: {
    passers: number;
    runners: number;
    blockers: number;
  };
}

interface MatchEffects {
  homeFieldAdvantage: boolean;
  effectiveModifiers: Record<string, number>;
  situationalAdjustments: {
    winningBig: boolean;
    losingBig: boolean;
    clutchTime: boolean;
  };
}

const FieldSizeIcon = ({ size }: { size: string }) => {
  switch (size) {
    case 'Large': return <Maximize className="w-4 h-4" />;
    case 'Small': return <Minimize className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
};

const TacticalFocusIcon = ({ focus }: { focus: string }) => {
  switch (focus) {
    case 'All-Out Attack': return <Zap className="w-4 h-4" />;
    case 'Defensive Wall': return <Shield className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getEffectColor = (value: number): string => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};

export default function AdvancedTacticalEffectsManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFieldSize, setSelectedFieldSize] = useState<string>('');
  const [selectedTacticalFocus, setSelectedTacticalFocus] = useState<string>('');

  // Fetch current tactical setup
  const { data: currentSetup, isLoading: loadingSetup } = useQuery<TacticalAnalysis>({
    queryKey: ['/api/tactics/team-tactics'],
    enabled: !!teamId
  });

  // Fetch tactical options (field sizes and tactical foci)
  const { data: tacticalOptions } = useQuery<TacticalOptions>({
    queryKey: ['/api/tactics/tactical-options']
  });

  // Fetch effectiveness analysis
  const { data: tacticalAnalysis } = useQuery<TacticalAnalysis>({
    queryKey: ['/api/tactics/tactical-analysis'],
    enabled: !!teamId
  });

  // Define interfaces for tactical data
  interface TacticalOptions {
    fieldSizes?: any[];
    tacticalFoci?: any[];
  }
  
  interface TacticalAnalysis {
    bestSetup?: any;
    fieldSize?: string;
    fieldSizeInfo?: any;
    canChangeFieldSize?: boolean;
    tacticalFocus?: string;
    tacticalFocusInfo?: any;
    nextFieldChangeWindow?: string;
  }

  // Extract data from responses
  const fieldSizeEffects = tacticalOptions?.fieldSizes;
  const tacticalFocusEffects = tacticalOptions?.tacticalFoci;
  const effectiveness = tacticalAnalysis?.bestSetup;

  // Update field size mutation
  const updateFieldSizeMutation = useMutation({
    mutationFn: (fieldSize: string) =>
      apiRequest('/api/tactics/update-field-size', 'POST', { fieldSize: fieldSize.toLowerCase() }),
    onSuccess: () => {
      toast({
        title: 'Field Size Updated',
        description: 'Your stadium field size has been updated successfully.'
      });
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/team-tactics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/tactical-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/tactical-options'] });
      queryClient.refetchQueries({ queryKey: ['/api/tactics/team-tactics'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update field size',
        variant: 'destructive'
      });
    }
  });

  // Update tactical focus mutation
  const updateTacticalFocusMutation = useMutation({
    mutationFn: (tacticalFocus: string) => {
      // Convert frontend values to server format
      const serverFormat = tacticalFocus.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_');
      return apiRequest('/api/tactics/update-tactical-focus', 'POST', { tacticalFocus: serverFormat });
    },
    onSuccess: () => {
      toast({
        title: 'Tactical Focus Updated',
        description: 'Your team tactical focus has been updated.'
      });
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/team-tactics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/tactical-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tactics/tactical-options'] });
      queryClient.refetchQueries({ queryKey: ['/api/tactics/team-tactics'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update tactical focus',
        variant: 'destructive'
      });
    }
  });

  if (loadingSetup) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Tactical Effects System</h2>
          <p className="text-gray-600">Multi-layered tactical framework with field specialization and strategic focus</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Effectiveness Score</div>
          <div className={`text-2xl font-bold ${getScoreColor((effectiveness?.overallEffectiveness || 0) * 100)}`}>
            {Math.round((effectiveness?.overallEffectiveness || 0) * 100)}%
          </div>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Tactical Setup</TabsTrigger>
          <TabsTrigger value="effects">Effects Analysis</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="match-impact">Match Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Field Size Specialization</span>
                </CardTitle>
                <CardDescription>
                  Choose your stadium field size. Changes are locked during the season.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Field Size:</span>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <FieldSizeIcon size={currentSetup?.fieldSize || 'standard'} />
                      <span>{currentSetup?.fieldSizeInfo?.name || 'Standard Field'}</span>
                    </Badge>
                  </div>
                  
                  {currentSetup?.canChangeFieldSize ? (
                    <div className="space-y-3">
                      <RadioGroup
                        value={selectedFieldSize || currentSetup?.fieldSize}
                        onValueChange={setSelectedFieldSize}
                      >
                        {fieldSizeEffects && Object.entries(fieldSizeEffects).map(([size, effects]) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={size} id={`field-${size}`} />
                            <Label htmlFor={`field-${size}`} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FieldSizeIcon size={size} />
                                  <span className="font-medium">{(effects as any).name}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {(effects as any).description}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      <Button
                        className="w-full"
                        onClick={() => {
                          if (selectedFieldSize && selectedFieldSize !== currentSetup?.fieldSize) {
                            updateFieldSizeMutation.mutate(selectedFieldSize);
                          }
                        }}
                        disabled={
                          !selectedFieldSize || 
                          selectedFieldSize === currentSetup?.fieldSize || 
                          updateFieldSizeMutation.isPending
                        }
                      >
                        Update Field Size
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Field size changes are locked during the season.
                        </span>
                      </div>
                      {currentSetup?.nextFieldChangeWindow && (
                        <div className="text-xs text-yellow-700 mt-1">
                          Next change window: {currentSetup.nextFieldChangeWindow}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Tactical Focus</span>
                </CardTitle>
                <CardDescription>
                  Set your team's strategic approach. Can be changed before each match.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Focus:</span>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <TacticalFocusIcon focus={currentSetup?.tacticalFocus || 'balanced'} />
                      <span>{currentSetup?.tacticalFocusInfo?.name || 'Balanced'}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <RadioGroup
                      value={selectedTacticalFocus || currentSetup?.tacticalFocus}
                      onValueChange={setSelectedTacticalFocus}
                    >
                      {tacticalFocusEffects && Object.entries(tacticalFocusEffects).map(([focus, effects]) => (
                        <div key={focus} className="flex items-center space-x-2">
                          <RadioGroupItem value={focus} id={`focus-${focus}`} />
                          <Label htmlFor={`focus-${focus}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <TacticalFocusIcon focus={focus} />
                                <span className="font-medium">{(effects as any).name}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {(effects as any).description}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (selectedTacticalFocus && selectedTacticalFocus !== currentSetup?.tacticalFocus) {
                          updateTacticalFocusMutation.mutate(selectedTacticalFocus);
                        }
                      }}
                      disabled={
                        !selectedTacticalFocus || 
                        selectedTacticalFocus === currentSetup?.tacticalFocus || 
                        updateTacticalFocusMutation.isPending
                      }
                    >
                      Update Tactical Focus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Tactical Configuration</CardTitle>
              <CardDescription>Overview of your active tactical settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FieldSizeIcon size={currentSetup?.fieldSize || 'Standard'} />
                    <span className="font-medium">{currentSetup?.fieldSize || 'Standard'} Field</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {fieldSizeEffects?.[currentSetup?.fieldSize]?.description || 'Balanced field configuration'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TacticalFocusIcon focus={currentSetup?.tacticalFocus || 'Balanced'} />
                    <span className="font-medium">{currentSetup?.tacticalFocus || 'Balanced'}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {tacticalFocusEffects?.[currentSetup?.tacticalFocus]?.description || 'Balanced approach'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="font-medium">Effectiveness</span>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(effectiveness?.overallScore || 0)}`}>
                    {effectiveness?.overallScore || 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effects" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Size Effects</CardTitle>
                <CardDescription>How different field sizes affect gameplay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fieldSizeEffects && Object.entries(fieldSizeEffects).map(([size, effects]) => (
                    <Card key={size} className={currentSetup?.fieldSize === size ? 'bg-blue-50 border-blue-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <FieldSizeIcon size={size} />
                          <span className="font-medium">{size} Field</span>
                          {currentSetup?.fieldSize === size && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries((effects as FieldSizeEffects).effects).map(([effect, value]) => (
                            <div key={effect} className="flex justify-between">
                              <span className="text-gray-600 capitalize">
                                {effect.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </span>
                              <span className={`font-medium ${getEffectColor(value)}`}>
                                {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tactical Focus Effects</CardTitle>
                <CardDescription>How different tactical approaches modify AI behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tacticalFocusEffects && Object.entries(tacticalFocusEffects).map(([focus, effects]) => (
                    <Card key={focus} className={currentSetup?.tacticalFocus === focus ? 'bg-green-50 border-green-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <TacticalFocusIcon focus={focus} />
                          <span className="font-medium">{focus}</span>
                          {currentSetup?.tacticalFocus === focus && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries((effects as TacticalFocusEffects).effects).map(([effect, value]) => (
                            <div key={effect} className="flex justify-between">
                              <span className="text-gray-600 capitalize">
                                {effect.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </span>
                              <span className={`font-medium ${getEffectColor(value)}`}>
                                {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(effectiveness?.overallScore || 0)}`}>
                  {effectiveness?.overallScore || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Combined effectiveness</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Field Size</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(effectiveness?.fieldSizeScore || 0)}`}>
                  {effectiveness?.fieldSizeScore || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Field specialization fit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tactical Focus</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(effectiveness?.tacticalFocusScore || 0)}`}>
                  {effectiveness?.tacticalFocusScore || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Strategic alignment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coach Influence</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {effectiveness?.coachInfluence || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Coaching impact</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Roster Suitability Analysis</CardTitle>
                <CardDescription>How well your tactics match your player composition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Passers Optimization</span>
                      <span className="text-sm font-medium">{effectiveness?.rosterSuitability?.passers || 0}%</span>
                    </div>
                    <Progress value={effectiveness?.rosterSuitability?.passers || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Runners Optimization</span>
                      <span className="text-sm font-medium">{effectiveness?.rosterSuitability?.runners || 0}%</span>
                    </div>
                    <Progress value={effectiveness?.rosterSuitability?.runners || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Blockers Optimization</span>
                      <span className="text-sm font-medium">{effectiveness?.rosterSuitability?.blockers || 0}%</span>
                    </div>
                    <Progress value={effectiveness?.rosterSuitability?.blockers || 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>Suggestions to improve tactical effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {effectiveness?.recommendations?.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </div>
                  ))}
                  {(!effectiveness?.recommendations || effectiveness.recommendations.length === 0) && (
                    <div className="text-center py-4">
                      <Target className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">
                        Your tactical setup is well optimized!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="match-impact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Match Effects</CardTitle>
                <CardDescription>Active tactical modifiers during gameplay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Home Field Advantage:</span>
                    <Badge variant={matchEffects?.homeFieldAdvantage ? "default" : "secondary"}>
                      {matchEffects?.homeFieldAdvantage ? 'Active' : 'Away Game'}
                    </Badge>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Effective Modifiers</h4>
                    <div className="space-y-2">
                      {matchEffects?.effectiveModifiers && Object.entries(matchEffects.effectiveModifiers).map(([modifier, value]) => (
                        <div key={modifier} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">
                            {modifier.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                          </span>
                          <span className={`text-sm font-medium ${getEffectColor(value)}`}>
                            {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Situational Adjustments</CardTitle>
                <CardDescription>Dynamic AI behavior modifications during matches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Winning Big</span>
                        <Badge variant={matchEffects?.situationalAdjustments?.winningBig ? "default" : "outline"}>
                          {matchEffects?.situationalAdjustments?.winningBig ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Conservative play when leading by 3+ goals
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Losing Big</span>
                        <Badge variant={matchEffects?.situationalAdjustments?.losingBig ? "destructive" : "outline"}>
                          {matchEffects?.situationalAdjustments?.losingBig ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Aggressive play when trailing by 3+ goals
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Clutch Time</span>
                        <Badge variant={matchEffects?.situationalAdjustments?.clutchTime ? "default" : "outline"}>
                          {matchEffects?.situationalAdjustments?.clutchTime ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        High-pressure tactics in final 2 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tactical System Features</CardTitle>
              <CardDescription>Advanced tactical mechanics and benefits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h5 className="font-medium text-sm">Home Field Advantage</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Field size benefits only apply when playing at home, creating meaningful strategic choices
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Settings className="w-4 h-4 text-green-500" />
                    <h5 className="font-medium text-sm">Strategic Lock-in</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Field size locked during season; tactical focus adjustable before each match
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <h5 className="font-medium text-sm">Coach Integration</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Head coach tactics skill and team camaraderie directly influence effectiveness
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <h5 className="font-medium text-sm">Dynamic AI</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    AI behavior adapts in real-time based on game situation and tactical settings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}