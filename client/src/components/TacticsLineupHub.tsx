import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Users, Target, Shield, Zap, Trophy, TrendingUp, Activity, AlertTriangle, Star } from "lucide-react";

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
  dailyStaminaLevel?: number;
  overallRating?: number;
}

interface Formation {
  starters: Player[];
  substitutes: Player[];
  formation_data?: any;
}

interface TacticalSetup {
  fieldSize: string;
  tacticalFocus: string;
  coachEffectiveness?: number;
}

interface TacticsLineupHubProps {
  teamId: string;
}

interface StarterSlot {
  id: string;
  label: string;
  player: Player | null;
  requiredRole?: string;
  isWildcard?: boolean;
}

interface PositionalSubstitutes {
  blockers: Player[];
  runners: Player[];
  passers: Player[];
}

export default function TacticsLineupHub({ teamId }: TacticsLineupHubProps) {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [starterSlots, setStarterSlots] = useState<StarterSlot[]>([
    { id: "blocker1", label: "Blocker 1", player: null, requiredRole: "blocker" },
    { id: "blocker2", label: "Blocker 2", player: null, requiredRole: "blocker" },
    { id: "runner1", label: "Runner 1", player: null, requiredRole: "runner" },
    { id: "runner2", label: "Runner 2", player: null, requiredRole: "runner" },
    { id: "passer1", label: "Passer 1", player: null, requiredRole: "passer" },
    { id: "wildcard", label: "WILDCARD", player: null, isWildcard: true },
  ]);
  const [substitutes, setSubstitutes] = useState<PositionalSubstitutes>({
    blockers: [],
    runners: [],
    passers: [],
  });
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

  // Calculate player power rating
  const calculatePlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6);
  };

  // Determine player role based on stats if not already assigned
  const determinePlayerRole = (player: Player): string => {
    if (player.role) return player.role;
    
    const passerScore = (player.throwing + player.leadership) / 2;
    const runnerScore = (player.speed + player.agility) / 2;
    const blockerScore = (player.power + player.stamina) / 2;
    
    if (passerScore >= runnerScore && passerScore >= blockerScore) {
      return "passer";
    } else if (runnerScore >= blockerScore) {
      return "runner";
    } else {
      return "blocker";
    }
  };

  // Ensure player has role assigned
  const ensurePlayerRole = (player: Player): Player => ({
    ...player,
    role: determinePlayerRole(player),
    dailyStaminaLevel: player.dailyStaminaLevel || 100
  });

  // Get role icon
  const getRoleIcon = (role: string | undefined | null) => {
    if (!role) return "👤";
    switch (role.toLowerCase()) {
      case "passer": return "🎯";
      case "runner": return "⚡";
      case "blocker": return "🛡️";
      default: return "👤";
    }
  };

  // Get role color
  const getRoleColor = (role: string | undefined | null) => {
    if (!role) return "bg-gray-600";
    switch (role.toLowerCase()) {
      case "passer": return "bg-yellow-600";
      case "runner": return "bg-green-600";
      case "blocker": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  // Get stamina color
  const getStaminaColor = (stamina: number) => {
    if (stamina > 70) return "bg-green-500";
    if (stamina >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Initialize lineup from formation data
  useEffect(() => {
    if (players.length > 0) {
      const healthyPlayers = players
        .filter(p => p.injuryStatus === "Healthy" || p.injuryStatus === "Minor Injury")
        .map(ensurePlayerRole);
      
      if (formation?.starters && formation.starters.length > 0) {
        // Load existing formation
        const formationStarters = formation.starters.map(ensurePlayerRole);
        const newSlots = [...starterSlots];
        
        formationStarters.forEach((player, index) => {
          if (index < 6 && newSlots[index]) {
            newSlots[index] = { ...newSlots[index], player };
          }
        });
        setStarterSlots(newSlots);
        
        // Organize substitutes by position
        const formationSubs = (formation.substitutes || []).map(ensurePlayerRole);
        setSubstitutes({
          blockers: formationSubs.filter(p => p.role === "blocker"),
          runners: formationSubs.filter(p => p.role === "runner"),
          passers: formationSubs.filter(p => p.role === "passer"),
        });
        
        // Set available players
        const usedPlayerIds = [
          ...formationStarters.map(p => p.id),
          ...formationSubs.map(p => p.id)
        ];
        setAvailablePlayers(healthyPlayers.filter(p => !usedPlayerIds.includes(p.id)));
      } else {
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

  // Save formation mutation
  const saveFormationMutation = useMutation({
    mutationFn: async () => {
      const activeStarters = starterSlots.filter(slot => slot.player).map(slot => slot.player!);
      const allSubstitutes = [...substitutes.blockers, ...substitutes.runners, ...substitutes.passers];
      
      const response = await fetch(`/api/teams/${teamId}/formation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starters: activeStarters,
          substitutes: allSubstitutes,
          formationData: { formation: "2-2-1-1-wildcard" }
        }),
      });
      if (!response.ok) throw new Error("Failed to save formation");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Formation Saved", description: "Your lineup has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/formation`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save formation.", variant: "destructive" });
    },
  });

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const draggedPlayer = findPlayerById(draggableId);
    if (!draggedPlayer) return;

    // Handle different drop destinations
    if (destination.droppableId.startsWith("starter-")) {
      handleStarterDrop(draggedPlayer, destination.droppableId, source);
    } else if (destination.droppableId.startsWith("substitute-")) {
      handleSubstituteDrop(draggedPlayer, destination.droppableId, source);
    } else if (destination.droppableId === "available") {
      handleReturnToAvailable(draggedPlayer, source);
    }
  };

  // Find player by ID
  const findPlayerById = (id: string): Player | null => {
    // Check available players
    let player = availablePlayers.find(p => p.id === id);
    if (player) return player;
    
    // Check starters
    player = starterSlots.find(slot => slot.player?.id === id)?.player;
    if (player) return player;
    
    // Check substitutes
    const allSubs = [...substitutes.blockers, ...substitutes.runners, ...substitutes.passers];
    player = allSubs.find(p => p.id === id);
    if (player) return player;
    
    return null;
  };

  // Handle starter slot drop
  const handleStarterDrop = (player: Player, slotId: string, source: any) => {
    const slotIndex = parseInt(slotId.split("-")[1]);
    const targetSlot = starterSlots[slotIndex];
    
    // Check role compatibility (except for wildcard)
    if (!targetSlot.isWildcard && targetSlot.requiredRole && player.role !== targetSlot.requiredRole) {
      toast({ 
        title: "Invalid Position", 
        description: `${player.role}s cannot be placed in ${targetSlot.requiredRole} positions.`,
        variant: "destructive" 
      });
      return;
    }

    // Remove player from source
    removePlayerFromSource(player, source);
    
    // If slot is occupied, return that player to available
    if (targetSlot.player) {
      setAvailablePlayers(prev => [...prev, targetSlot.player!]);
    }
    
    // Place player in slot
    const newSlots = [...starterSlots];
    newSlots[slotIndex] = { ...targetSlot, player };
    setStarterSlots(newSlots);
  };

  // Handle substitute drop
  const handleSubstituteDrop = (player: Player, dropZone: string, source: any) => {
    const role = dropZone.split("-")[1]; // e.g., "substitute-blockers" -> "blockers"
    
    // Check role compatibility
    const playerRole = player.role + "s"; // Convert "blocker" to "blockers"
    if (playerRole !== role) {
      toast({ 
        title: "Invalid Position", 
        description: `${player.role}s cannot be substitutes for ${role}.`,
        variant: "destructive" 
      });
      return;
    }

    // Remove player from source
    removePlayerFromSource(player, source);
    
    // Add to substitutes
    setSubstitutes(prev => ({
      ...prev,
      [role]: [...prev[role as keyof PositionalSubstitutes], player]
    }));
  };

  // Handle return to available
  const handleReturnToAvailable = (player: Player, source: any) => {
    removePlayerFromSource(player, source);
    setAvailablePlayers(prev => [...prev, player]);
  };

  // Remove player from source location
  const removePlayerFromSource = (player: Player, source: any) => {
    if (source.droppableId === "available") {
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
    } else if (source.droppableId.startsWith("starter-")) {
      const slotIndex = parseInt(source.droppableId.split("-")[1]);
      const newSlots = [...starterSlots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], player: null };
      setStarterSlots(newSlots);
    } else if (source.droppableId.startsWith("substitute-")) {
      const role = source.droppableId.split("-")[1] as keyof PositionalSubstitutes;
      setSubstitutes(prev => ({
        ...prev,
        [role]: prev[role].filter(p => p.id !== player.id)
      }));
    }
  };

  // Render enhanced player card
  const renderPlayerCard = (player: Player, index: number, isDragDisabled = false) => {
    const powerRating = calculatePlayerPower(player);
    const stamina = player.dailyStaminaLevel || 100;
    const hasMinorInjury = player.injuryStatus === "Minor Injury";
    
    return (
      <Draggable key={player.id} draggableId={player.id} index={index} isDragDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`p-3 bg-white dark:bg-gray-800 border rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 ${
              snapshot.isDragging ? "shadow-lg scale-105 rotate-2" : "hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{player.firstName} {player.lastName}</span>
                  {hasMinorInjury && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" title="Minor Injury" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${getRoleColor(player.role)} text-white`}>
                    {getRoleIcon(player.role)} {player.role}
                  </Badge>
                  <span className="text-xs text-gray-600 dark:text-gray-400">PWR: {powerRating}</span>
                </div>
                
                {/* Stamina Bar */}
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-blue-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Stamina</span>
                      <span className="font-medium">{stamina}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getStaminaColor(stamina)}`}
                        style={{ width: `${stamina}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // Render starter slot
  const renderStarterSlot = (slot: StarterSlot, index: number) => {
    return (
      <Droppable droppableId={`starter-${index}`} key={slot.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-4 border-2 border-dashed rounded-lg transition-all duration-200 min-h-[120px] ${
              slot.isWildcard 
                ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" 
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
            } ${snapshot.isDraggingOver ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : ""}`}
          >
            <div className="text-center mb-2">
              <h4 className={`font-medium text-sm ${slot.isWildcard ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                {slot.label}
                {slot.isWildcard && <Star className="inline w-4 h-4 ml-1" />}
              </h4>
              {!slot.isWildcard && slot.requiredRole && (
                <p className="text-xs text-gray-500">{getRoleIcon(slot.requiredRole)} {slot.requiredRole} only</p>
              )}
              {slot.isWildcard && (
                <p className="text-xs text-purple-600 dark:text-purple-400">Any role accepted</p>
              )}
            </div>
            
            {slot.player ? (
              renderPlayerCard(slot.player, 0, false)
            ) : (
              <div className="flex items-center justify-center h-16 text-gray-400">
                <Users className="w-6 h-6" />
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  // Render substitute section
  const renderSubstituteSection = (role: keyof PositionalSubstitutes, title: string, icon: any) => {
    const Icon = icon;
    const players = substitutes[role];
    
    return (
      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4" />
          <h4 className="font-medium text-sm">{title}</h4>
          <Badge variant="outline" className="text-xs">{players.length}</Badge>
        </div>
        
        <Droppable droppableId={`substitute-${role}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] p-2 border-2 border-dashed rounded-lg transition-all duration-200 ${
                snapshot.isDraggingOver ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {players.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-400">
                  <span className="text-xs">Drop {role} here</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player, index) => renderPlayerCard(player, index))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lineup & Tactics Hub</h2>
            <p className="text-gray-600 dark:text-gray-300">Manage your starting lineup and tactical setup</p>
          </div>
          <Button 
            onClick={() => saveFormationMutation.mutate()}
            disabled={saveFormationMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Lineup
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Players Panel (Left) */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Available Players
                  <Badge variant="outline">{availablePlayers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="available">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-96 overflow-y-auto"
                    >
                      {availablePlayers.map((player, index) => renderPlayerCard(player, index))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Starting Lineup & Substitutes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Starting Lineup Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Starting Lineup (2-2-1-1 + Wildcard)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {starterSlots.map((slot, index) => renderStarterSlot(slot, index))}
                </div>
              </CardContent>
            </Card>

            {/* Positional Substitution Bench */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Positional Substitution Bench
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderSubstituteSection("blockers", "Substitute Blockers", Shield)}
                  {renderSubstituteSection("runners", "Substitute Runners", Zap)}
                  {renderSubstituteSection("passers", "Substitute Passers", Target)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}