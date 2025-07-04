import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle,
  Gamepad2,
  UserCheck,
  UserX,
  Settings,
  Trophy,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  speed: number;
  power: number;
  agility: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  injuryStatus: string;
  overallRating: number;
}

interface Formation {
  starters: Player[];
  substitutes: Player[];
  formation_data: any;
}

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

interface TacticsLineupHubProps {
  teamId: string;
}

export default function TacticsLineupHub({ teamId }: TacticsLineupHubProps) {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [starters, setStarters] = useState<(Player | null)[]>(Array(6).fill(null));
  const [substitutes, setSubstitutes] = useState<Player[]>([]);
  const [selectedFieldSize, setSelectedFieldSize] = useState<string>("standard");
  const [selectedTacticalFocus, setSelectedTacticalFocus] = useState<string>("balanced");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team players
  const { data: rawPlayers = [] } = useQuery({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });
  const players = (rawPlayers || []) as Player[];

  // Fetch current formation
  const { data: formation } = useQuery<Formation>({
    queryKey: [`/api/teams/${teamId}/formation`],
    enabled: !!teamId,
  });

  // Fetch tactical setup
  const { data: tacticalData, isLoading: tacticalLoading } = useQuery<TacticalSetup>({
    queryKey: ["/api/tactics/team-tactics"],
    enabled: !!teamId,
  });

  // Initialize lineup from formation data
  useEffect(() => {
    if (players.length > 0) {
      // Filter healthy players
      const healthyPlayers = players.filter(p => p.injuryStatus === "Healthy");
      
      if (formation?.starters && formation.starters.length > 0) {
        // Use existing formation
        const formationStarters = formation.starters.slice(0, 6);
        const newStarters = Array(6).fill(null);
        formationStarters.forEach((player, index) => {
          if (index < 6) newStarters[index] = player;
        });
        setStarters(newStarters);
        setSubstitutes(formation.substitutes || []);
        
        // Set available players (healthy players not in formation)
        const usedPlayerIds = [
          ...formationStarters.map(p => p.id),
          ...(formation.substitutes || []).map(p => p.id)
        ];
        setAvailablePlayers(healthyPlayers.filter(p => !usedPlayerIds.includes(p.id)));
      } else {
        // No formation yet, show all healthy players as available
        setAvailablePlayers(healthyPlayers);
      }
    }
  }, [players, formation]);

  // Initialize tactical settings
  useEffect(() => {
    if (tacticalData) {
      setSelectedFieldSize(tacticalData.fieldSize);
      setSelectedTacticalFocus(tacticalData.tacticalFocus);
    }
  }, [tacticalData]);

  // Calculate player power rating
  const calculatePlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6);
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "passer": return "🎯";
      case "runner": return "⚡";
      case "blocker": return "🛡️";
      default: return "👤";
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "passer": return "bg-yellow-600";
      case "runner": return "bg-green-600";
      case "blocker": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  // Position slot configuration
  const starterSlots = [
    { id: "blocker-1", role: "blocker", label: "Blocker 1" },
    { id: "blocker-2", role: "blocker", label: "Blocker 2" },
    { id: "runner-1", role: "runner", label: "Runner 1" },
    { id: "runner-2", role: "runner", label: "Runner 2" },
    { id: "passer-1", role: "passer", label: "Passer 1" },
    { id: "passer-2", role: "passer", label: "Passer 2" },
  ];

  // Drag and drop handlers
  const handleDragEnd = useCallback((result: any) => {
    const { source, destination } = result;
    
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    const sourceIndex = source.index;
    const destIndex = destination.index;

    if (sourceId === destId && sourceIndex === destIndex) return;

    // Handle different drop scenarios
    if (sourceId === "available" && destId.startsWith("starter-")) {
      // Moving from available to starter slot
      const slotIndex = parseInt(destId.replace("starter-", ""));
      const player = availablePlayers[sourceIndex];
      
      // Remove from available players
      const newAvailable = [...availablePlayers];
      newAvailable.splice(sourceIndex, 1);
      
      // Add to starters (if slot was occupied, move that player back to available)
      const newStarters = [...starters];
      if (newStarters[slotIndex]) {
        newAvailable.push(newStarters[slotIndex]!);
      }
      newStarters[slotIndex] = player;
      
      setAvailablePlayers(newAvailable);
      setStarters(newStarters);
    } else if (sourceId.startsWith("starter-") && destId === "available") {
      // Moving from starter slot to available
      const slotIndex = parseInt(sourceId.replace("starter-", ""));
      const player = starters[slotIndex];
      
      if (player) {
        const newStarters = [...starters];
        newStarters[slotIndex] = null;
        
        const newAvailable = [...availablePlayers];
        newAvailable.splice(destIndex, 0, player);
        
        setStarters(newStarters);
        setAvailablePlayers(newAvailable);
      }
    } else if (sourceId === "available" && destId === "substitutes") {
      // Moving from available to substitutes
      const player = availablePlayers[sourceIndex];
      
      const newAvailable = [...availablePlayers];
      newAvailable.splice(sourceIndex, 1);
      
      const newSubstitutes = [...substitutes];
      newSubstitutes.splice(destIndex, 0, player);
      
      setAvailablePlayers(newAvailable);
      setSubstitutes(newSubstitutes);
    } else if (sourceId === "substitutes" && destId === "available") {
      // Moving from substitutes to available
      const player = substitutes[sourceIndex];
      
      const newSubstitutes = [...substitutes];
      newSubstitutes.splice(sourceIndex, 1);
      
      const newAvailable = [...availablePlayers];
      newAvailable.splice(destIndex, 0, player);
      
      setSubstitutes(newSubstitutes);
      setAvailablePlayers(newAvailable);
    } else if (sourceId.startsWith("starter-") && destId.startsWith("starter-")) {
      // Swapping between starter slots
      const sourceSlotIndex = parseInt(sourceId.replace("starter-", ""));
      const destSlotIndex = parseInt(destId.replace("starter-", ""));
      
      const newStarters = [...starters];
      const temp = newStarters[sourceSlotIndex];
      newStarters[sourceSlotIndex] = newStarters[destSlotIndex];
      newStarters[destSlotIndex] = temp;
      
      setStarters(newStarters);
    }
  }, [availablePlayers, starters, substitutes]);

  // Save lineup mutation
  const saveLineupMutation = useMutation({
    mutationFn: async () => {
      const lineupData = {
        starters: starters.filter(p => p !== null),
        substitutes: substitutes,
        formationData: {
          lastUpdated: new Date().toISOString(),
          totalPlayers: starters.filter(p => p !== null).length + substitutes.length
        }
      };
      
      return apiRequest(`/api/teams/${teamId}/formation`, "PUT", lineupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/formation`] });
      toast({
        title: "Lineup Saved",
        description: "Your starting lineup and substitutes have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save lineup. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update tactical focus mutation
  const updateTacticalFocusMutation = useMutation({
    mutationFn: async (tacticalFocus: string) => {
      return apiRequest("/api/tactics/update-tactical-focus", "POST", { tacticalFocus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
      toast({
        title: "Tactical Focus Updated",
        description: "Your team's tactical approach has been changed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tactical focus.",
        variant: "destructive",
      });
    }
  });

  // Update field size mutation
  const updateFieldSizeMutation = useMutation({
    mutationFn: async (fieldSize: string) => {
      return apiRequest("/api/tactics/update-field-size", "POST", { fieldSize });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tactics/team-tactics"] });
      toast({
        title: "Field Size Updated",
        description: "Your home field specialization has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update field size.",
        variant: "destructive",
      });
    }
  });

  // Calculate lineup effectiveness
  const calculateLineupEffectiveness = () => {
    const activeStarters = starters.filter(p => p !== null);
    if (activeStarters.length === 0) return 0;

    const roleDistribution = {
      passer: activeStarters.filter(p => p!.role.toLowerCase() === "passer").length,
      runner: activeStarters.filter(p => p!.role.toLowerCase() === "runner").length,
      blocker: activeStarters.filter(p => p!.role.toLowerCase() === "blocker").length,
    };

    // Base effectiveness on role balance
    let effectiveness = 50;
    
    // Ideal distribution is 2-2-2
    if (roleDistribution.passer === 2) effectiveness += 15;
    if (roleDistribution.runner === 2) effectiveness += 15;
    if (roleDistribution.blocker === 2) effectiveness += 15;
    
    // Penalty for missing roles
    if (roleDistribution.passer === 0) effectiveness -= 20;
    if (roleDistribution.runner === 0) effectiveness -= 20;
    if (roleDistribution.blocker === 0) effectiveness -= 20;

    // Tactical focus alignment
    if (selectedTacticalFocus === "all_out_attack") {
      effectiveness += roleDistribution.runner * 5;
      effectiveness += roleDistribution.passer * 3;
    } else if (selectedTacticalFocus === "defensive_wall") {
      effectiveness += roleDistribution.blocker * 5;
      effectiveness += roleDistribution.runner * 2;
    }

    return Math.max(0, Math.min(100, effectiveness));
  };

  // Get recommendations
  const getRecommendations = () => {
    const recommendations = [];
    const activeStarters = starters.filter(p => p !== null);
    
    if (activeStarters.length < 6) {
      recommendations.push("Fill all 6 starting positions for optimal performance");
    }
    
    const roleDistribution = {
      passer: activeStarters.filter(p => p!.role.toLowerCase() === "passer").length,
      runner: activeStarters.filter(p => p!.role.toLowerCase() === "runner").length,
      blocker: activeStarters.filter(p => p!.role.toLowerCase() === "blocker").length,
    };

    if (roleDistribution.passer !== 2) {
      recommendations.push("Consider using exactly 2 Passers for balanced offense");
    }
    if (roleDistribution.runner !== 2) {
      recommendations.push("Consider using exactly 2 Runners for optimal mobility");
    }
    if (roleDistribution.blocker !== 2) {
      recommendations.push("Consider using exactly 2 Blockers for strong protection");
    }

    if (selectedTacticalFocus === "all_out_attack" && roleDistribution.runner < 2) {
      recommendations.push("All-Out Attack works best with more Runners in your lineup");
    }
    if (selectedTacticalFocus === "defensive_wall" && roleDistribution.blocker < 2) {
      recommendations.push("Defensive Wall is most effective with more Blockers");
    }

    return recommendations;
  };

  const lineupEffectiveness = calculateLineupEffectiveness();
  const recommendations = getRecommendations();

  if (tacticalLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tactical setup...</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT PANEL: Lineup & Formation (Roster Board) */}
        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Lineup & Formation
                <Badge variant="outline" className="ml-auto">
                  {starters.filter(p => p !== null).length}/6 Starters
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Available Players Pool */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Available Players</h3>
                <Droppable droppableId="available" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600"
                    >
                      {availablePlayers.map((player, index) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-2 p-2 bg-gray-600 rounded-lg border transition-all ${
                                snapshot.isDragging ? "shadow-lg bg-gray-500" : "hover:bg-gray-500"
                              }`}
                            >
                              <span className="text-lg">{getRoleIcon(player.role)}</span>
                              <div className="text-xs">
                                <div className="font-medium text-white">
                                  {player.firstName} {player.lastName}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge className={`text-xs ${getRoleColor(player.role)}`}>
                                    {player.role}
                                  </Badge>
                                  <span className="text-gray-300">⚡{calculatePlayerPower(player)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {availablePlayers.length === 0 && (
                        <p className="text-gray-400 text-sm text-center w-full py-4">
                          All healthy players assigned to lineup
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Starting Lineup Field */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Starting Lineup (6 Players)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {starterSlots.map((slot, index) => (
                    <Droppable key={slot.id} droppableId={`starter-${index}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`relative p-3 rounded-lg border-2 border-dashed min-h-[80px] transition-all ${
                            snapshot.isDraggingOver 
                              ? "border-blue-500 bg-blue-500/10" 
                              : starters[index] 
                                ? "border-green-500 bg-green-500/10" 
                                : "border-gray-600 bg-gray-700"
                          }`}
                        >
                          <div className="text-xs text-gray-400 mb-1">{slot.label}</div>
                          
                          {starters[index] ? (
                            <Draggable draggableId={starters[index]!.id} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-2 p-2 bg-gray-600 rounded border ${
                                    snapshot.isDragging ? "shadow-lg bg-gray-500" : ""
                                  }`}
                                >
                                  <span className="text-lg">{getRoleIcon(starters[index]!.role)}</span>
                                  <div className="text-xs flex-1">
                                    <div className="font-medium text-white truncate">
                                      {starters[index]!.firstName} {starters[index]!.lastName}
                                    </div>
                                    <div className="text-gray-300">⚡{calculatePlayerPower(starters[index]!)}</div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <div className="flex items-center justify-center h-12 text-gray-500 text-xs">
                              Drop {slot.role} here
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </div>

              {/* Substitutes Bench */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Substitutes <Badge variant="outline" className="ml-2">{substitutes.length}</Badge>
                </h3>
                <Droppable droppableId="substitutes" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-700 rounded-lg border border-gray-600"
                    >
                      {substitutes.map((player, index) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-2 p-2 bg-gray-600 rounded border ${
                                snapshot.isDragging ? "shadow-lg bg-gray-500" : "hover:bg-gray-500"
                              }`}
                            >
                              <span className="text-lg">{getRoleIcon(player.role)}</span>
                              <div className="text-xs">
                                <div className="font-medium text-white">
                                  {player.firstName} {player.lastName}
                                </div>
                                <div className="text-gray-300">⚡{calculatePlayerPower(player)}</div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {substitutes.length === 0 && (
                        <p className="text-gray-400 text-sm text-center w-full py-4">
                          Drop substitute players here
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Save Lineup Button */}
              <Button
                onClick={() => saveLineupMutation.mutate()}
                disabled={saveLineupMutation.isPending}
                className="w-full"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {saveLineupMutation.isPending ? "Saving..." : "Save Lineup"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Strategy & Focus */}
        <div className="space-y-6">
          {/* Tactical Setup */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-400" />
                Tactical Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Field Size Specialization */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Home Field Size Specialization
                  {!tacticalData?.canChangeFieldSize && (
                    <Badge variant="outline" className="ml-2 text-xs">Locked</Badge>
                  )}
                </label>
                <Select
                  value={selectedFieldSize}
                  onValueChange={(value) => {
                    setSelectedFieldSize(value);
                    if (tacticalData?.canChangeFieldSize) {
                      updateFieldSizeMutation.mutate(value);
                    }
                  }}
                  disabled={!tacticalData?.canChangeFieldSize}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="standard">Standard Field</SelectItem>
                    <SelectItem value="large">Large Field</SelectItem>
                    <SelectItem value="small">Small Field</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  {tacticalData?.fieldSizeInfo?.description || "Choose your home field advantage"}
                </p>
              </div>

              {/* Tactical Focus */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Team-Wide Tactical Focus
                </label>
                <Select
                  value={selectedTacticalFocus}
                  onValueChange={(value) => {
                    setSelectedTacticalFocus(value);
                    updateTacticalFocusMutation.mutate(value);
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="all_out_attack">All-Out Attack</SelectItem>
                    <SelectItem value="defensive_wall">Defensive Wall</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  {tacticalData?.tacticalFocusInfo?.description || "Select your game approach"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Effectiveness Analysis */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Effectiveness Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Effectiveness Score */}
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {lineupEffectiveness}%
                </div>
                <div className="text-sm text-gray-400 mb-3">Overall Effectiveness</div>
                <Progress value={lineupEffectiveness} className="h-2" />
              </div>

              <Separator className="bg-gray-600" />

              {/* Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Roster Suitability:</span>
                  <span className="text-sm font-medium">
                    {starters.filter(p => p !== null).length === 6 ? "Excellent" : "Incomplete"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Coach Influence:</span>
                  <span className="text-sm font-medium">
                    {tacticalData?.headCoachTactics || 50}/100
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Field Advantage Fit:</span>
                  <span className="text-sm font-medium">
                    {tacticalData?.effectiveness?.fieldSizeEffectiveness || 50}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Recommendations */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-400" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-yellow-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-200">{rec}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <p className="text-sm text-green-200">
                      Your tactical setup is well-optimized for your current roster!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DragDropContext>
  );
}