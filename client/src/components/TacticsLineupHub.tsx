import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Target, Shield, Zap, Trophy, TrendingUp, Activity, AlertTriangle, Star, Smartphone, Monitor } from "lucide-react";

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
  
  // Mobile interface state
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobileMode(isMobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (player.role) return player.role.toLowerCase();
    
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
        .filter(p => p.injuryStatus === "HEALTHY" || p.injuryStatus === "MINOR_INJURY")
        .map(ensurePlayerRole);
      
      if (formation?.starters && formation.starters.length > 0) {
        // Load existing formation
        const formationStarters = formation.starters.map(ensurePlayerRole);
        const newSlots = [...starterSlots];
        
        // Initialize all slots as empty first
        newSlots.forEach((slot, index) => {
          newSlots[index] = { ...slot, player: null };
        });
        
        // Assign players to appropriate slots based on their role
        formationStarters.forEach((player) => {
          const playerRole = player.role.toLowerCase();
          
          // Find the first empty slot for this role
          const slotIndex = newSlots.findIndex(slot => 
            slot.player === null && 
            (slot.requiredRole?.toLowerCase() === playerRole || slot.isWildcard)
          );
          
          if (slotIndex !== -1) {
            newSlots[slotIndex] = { ...newSlots[slotIndex], player };
          }
        });
        
        setStarterSlots(newSlots);
        
        // Organize substitutes by position
        const formationSubs = (formation.substitutes || []).map(ensurePlayerRole);
        setSubstitutes({
          blockers: formationSubs.filter(p => p.role.toLowerCase() === "blocker"),
          runners: formationSubs.filter(p => p.role.toLowerCase() === "runner"),
          passers: formationSubs.filter(p => p.role.toLowerCase() === "passer"),
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
    const starterSlot = starterSlots.find(slot => slot.player?.id === id);
    if (starterSlot?.player) return starterSlot.player as Player;
    
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

  // Mobile-friendly selection handlers
  const handlePlayerSelect = (player: Player) => {
    if (isMobileMode) {
      setSelectedPlayer(player);
      setShowPositionDialog(true);
    }
  };

  const assignPlayerToStarterSlot = (slotIndex: number) => {
    if (!selectedPlayer) return;
    
    const targetSlot = starterSlots[slotIndex];
    
    // Check role compatibility (except for wildcard)
    if (!targetSlot.isWildcard && targetSlot.requiredRole && selectedPlayer.role !== targetSlot.requiredRole) {
      toast({ 
        title: "Invalid Position", 
        description: `${selectedPlayer.role}s cannot be placed in ${targetSlot.requiredRole} positions.`,
        variant: "destructive" 
      });
      return;
    }

    // Find source and remove player
    const playerSource = findPlayerSource(selectedPlayer);
    if (playerSource) {
      removePlayerFromSource(selectedPlayer, playerSource);
    }
    
    // If slot is occupied, return that player to available
    if (targetSlot.player) {
      setAvailablePlayers(prev => [...prev, targetSlot.player!]);
    }
    
    // Place player in slot
    const newSlots = [...starterSlots];
    newSlots[slotIndex] = { ...targetSlot, player: selectedPlayer };
    setStarterSlots(newSlots);
    
    setSelectedPlayer(null);
    setShowPositionDialog(false);
    
    toast({ 
      title: "Player Assigned", 
      description: `${selectedPlayer.firstName} ${selectedPlayer.lastName} assigned to ${targetSlot.label}` 
    });
  };

  const assignPlayerToSubstitute = (role: keyof PositionalSubstitutes) => {
    if (!selectedPlayer) return;
    
    // Check role compatibility
    const playerRole = selectedPlayer.role + "s"; // Convert "blocker" to "blockers"
    if (playerRole !== role) {
      toast({ 
        title: "Invalid Position", 
        description: `${selectedPlayer.role}s cannot be substitutes for ${role}.`,
        variant: "destructive" 
      });
      return;
    }

    // Find source and remove player
    const playerSource = findPlayerSource(selectedPlayer);
    if (playerSource) {
      removePlayerFromSource(selectedPlayer, playerSource);
    }
    
    // Add to substitutes
    setSubstitutes(prev => ({
      ...prev,
      [role]: [...prev[role], selectedPlayer]
    }));
    
    setSelectedPlayer(null);
    setShowPositionDialog(false);
    
    toast({ 
      title: "Substitute Assigned", 
      description: `${selectedPlayer.firstName} ${selectedPlayer.lastName} added to ${role} substitutes` 
    });
  };

  const returnPlayerToAvailable = () => {
    if (!selectedPlayer) return;
    
    const playerSource = findPlayerSource(selectedPlayer);
    if (playerSource) {
      removePlayerFromSource(selectedPlayer, playerSource);
    }
    
    setAvailablePlayers(prev => [...prev, selectedPlayer]);
    setSelectedPlayer(null);
    setShowPositionDialog(false);
    
    toast({ 
      title: "Player Returned", 
      description: `${selectedPlayer.firstName} ${selectedPlayer.lastName} returned to available players` 
    });
  };

  const findPlayerSource = (player: Player) => {
    // Check available players
    if (availablePlayers.find(p => p.id === player.id)) {
      return { droppableId: "available" };
    }
    
    // Check starters
    const starterIndex = starterSlots.findIndex(slot => slot.player?.id === player.id);
    if (starterIndex !== -1) {
      return { droppableId: `starter-${starterIndex}` };
    }
    
    // Check substitutes
    for (const [role, players] of Object.entries(substitutes)) {
      if ((players as Player[]).find((p: Player) => p.id === player.id)) {
        return { droppableId: `substitute-${role}` };
      }
    }
    
    return null;
  };

  // Render enhanced player card with dual interface support
  const renderPlayerCard = (player: Player, index: number, isDragDisabled = false) => {
    const powerRating = calculatePlayerPower(player);
    const stamina = player.dailyStaminaLevel || 100;
    const hasMinorInjury = player.injuryStatus === "Minor Injury";
    
    // Mobile-friendly card without drag-and-drop
    if (isMobileMode) {
      return (
        <div
          key={player.id}
          onClick={() => handlePlayerSelect(player)}
          className={`p-3 bg-white dark:bg-gray-800 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedPlayer?.id === player.id ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900 dark:text-white">{player.firstName} {player.lastName}</span>
                {hasMinorInjury && (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
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
                    <span className="font-medium text-gray-900 dark:text-white">{stamina}%</span>
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
            {selectedPlayer?.id === player.id && (
              <div className="ml-2 text-blue-500">
                <Smartphone className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Desktop drag-and-drop card
    return (
      <Draggable key={player.id} draggableId={player.id.toString()} index={index} isDragDisabled={isDragDisabled}>
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
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{player.firstName} {player.lastName}</span>
                  {hasMinorInjury && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
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
                      <span className="font-medium text-gray-900 dark:text-white">{stamina}%</span>
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
                <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleIcon(slot.requiredRole)} {slot.requiredRole} only</p>
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
          <h4 className="font-medium text-sm text-gray-900 dark:text-white">{title}</h4>
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
                <div className="flex items-center justify-center h-20">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Drop {role} here</span>
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
            
            {/* Interface Mode Indicator */}
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={isMobileMode ? "default" : "outline"} 
                className={`text-xs ${isMobileMode ? "bg-blue-500 text-white" : ""}`}
              >
                <Smartphone className="w-3 h-3 mr-1" />
                Mobile
              </Badge>
              <Badge 
                variant={!isMobileMode ? "default" : "outline"}
                className={`text-xs ${!isMobileMode ? "bg-green-500 text-white" : ""}`}
              >
                <Monitor className="w-3 h-3 mr-1" />
                Desktop
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMode(!isMobileMode)}
                className="text-xs h-6 px-2"
              >
                Switch
              </Button>
            </div>
            
            {isMobileMode && (
              <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-800 dark:text-blue-200 max-w-sm">
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 flex-shrink-0" />
                  <span>Tap players to select, then assign positions</span>
                </div>
              </div>
            )}
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

      {/* Mobile Position Assignment Dialog */}
      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Assign Player Position
            </DialogTitle>
            {selectedPlayer && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
                <Badge className={`ml-2 text-xs ${getRoleColor(selectedPlayer.role)} text-white`}>
                  {selectedPlayer.role}
                </Badge>
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Starter Positions */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Starter Positions</h4>
              <div className="grid grid-cols-1 gap-2">
                {starterSlots.map((slot, index) => {
                  const isCompatible = !slot.requiredRole || slot.isWildcard || 
                    (selectedPlayer && selectedPlayer.role === slot.requiredRole);
                  
                  return (
                    <Button
                      key={slot.id}
                      variant={isCompatible ? "outline" : "ghost"}
                      className={`w-full justify-between text-left h-auto p-3 ${
                        !isCompatible ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!isCompatible}
                      onClick={() => assignPlayerToStarterSlot(index)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{slot.label}</span>
                        {slot.player ? (
                          <span className="text-xs text-gray-500">
                            Currently: {slot.player.firstName} {slot.player.lastName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Empty</span>
                        )}
                      </div>
                      {slot.isWildcard ? (
                        <Star className="w-4 h-4" />
                      ) : (
                        getRoleIcon(slot.requiredRole || "")
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Substitute Positions */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Substitute Positions</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(substitutes).map(([role, players]) => {
                  const playerRole = selectedPlayer?.role + "s";
                  const isCompatible = playerRole === role;
                  
                  return (
                    <Button
                      key={role}
                      variant={isCompatible ? "outline" : "ghost"}
                      className={`w-full justify-between text-left h-auto p-3 ${
                        !isCompatible ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!isCompatible}
                      onClick={() => assignPlayerToSubstitute(role as keyof PositionalSubstitutes)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {role.charAt(0).toUpperCase() + role.slice(1)} Substitutes
                        </span>
                        <span className="text-xs text-gray-500">
                          {players.length} player{players.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {getRoleIcon(role.slice(0, -1))}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Return to Available */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Other Actions</h4>
              <Button
                variant="secondary"
                className="w-full justify-between text-left h-auto p-3"
                onClick={returnPlayerToAvailable}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">Return to Available Players</span>
                  <span className="text-xs text-gray-500">
                    Make player available for assignment
                  </span>
                </div>
                <Users className="w-4 h-4" />
              </Button>
            </div>

            {/* Interface Mode Toggle */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setIsMobileMode(!isMobileMode);
                  setShowPositionDialog(false);
                  setSelectedPlayer(null);
                }}
              >
                <Monitor className="w-3 h-3 mr-1" />
                Switch to {isMobileMode ? 'Desktop' : 'Mobile'} Mode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DragDropContext>
  );
}