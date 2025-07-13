import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
// Centralized player role function
const getPlayerRole = (player: any): string => {
  if (!player) return "Player";
  
  const { 
    speed = 0, 
    agility = 0, 
    catching = 0, 
    throwing = 0, 
    power = 0, 
    leadership = 0, 
    stamina = 0 
  } = player;
  
  // Calculate role scores based on relevant stats
  const passerScore = (throwing * 2) + (leadership * 1.5);
  const runnerScore = (speed * 2) + (agility * 1.5);
  const blockerScore = (power * 2) + (stamina * 1.5);
  
  const maxScore = Math.max(passerScore, runnerScore, blockerScore);
  
  if (maxScore === passerScore) return "Passer";
  if (maxScore === runnerScore) return "Runner";
  return "Blocker";
};

const getRoleColor = (role: string): string => {
  switch (role.toLowerCase()) {
    case "passer":
      return "bg-yellow-500";
    case "runner":
      return "bg-green-500";
    case "blocker":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

interface FormationPlayer {
  id: string;
  name: string;
  role: string;
  position: { x: number; y: number };
  isStarter: boolean;
  substitutionPriority: number;
}

interface TacticalFormationProps {
  players: any[];
  savedFormation?: any;
  onFormationChange: (formation: FormationPlayer[], substitutionOrder: Record<string, number>) => void;
}

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 400;

export default function TacticalFormation({ players, savedFormation, onFormationChange }: TacticalFormationProps) {
  const [formation, setFormation] = useState<FormationPlayer[]>([]);
  const [substitutionOrder, setSubstitutionOrder] = useState<Record<string, number>>({});
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Load saved formation on component mount
  useEffect(() => {
    if (savedFormation && savedFormation.formation) {
      setFormation(savedFormation.formation);
      setSubstitutionOrder(savedFormation.substitutionOrder || {});
    }
  }, [savedFormation]);

  const saveFormationMutation = useMutation({
    mutationFn: async (data: { formation: FormationPlayer[]; substitutionOrder: Record<string, number> }) => {
      await apiRequest("/api/teams/my/formation", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Formation Saved",
        description: "Your tactical formation has been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/formation"] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group players by role
  const playersByRole = players.reduce((acc, player) => {
    const role = getPlayerRole(player);
    if (!acc[role]) acc[role] = [];
    acc[role].push({ ...player, role });
    return acc;
  }, {} as Record<string, any[]>);



  // Helper function to calculate player power
  const calculatePlayerPower = (player: any) => {
    return (player.speed + player.power + player.throwing + player.catching + player.kicking + player.agility + player.staminaAttribute + player.leadership) / 8;
  };

  // Drag and drop handlers
  const handleDragStart = (playerId: string, event: React.DragEvent) => {
    setDraggedPlayer(playerId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Only show drag preview in own half (left side)
    if (x <= FIELD_WIDTH / 2) {
      setDragPosition({ x, y });
    } else {
      setDragPosition(null);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedPlayer) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    
    // Only allow drop in own half (left side)
    if (rawX > FIELD_WIDTH / 2) return;

    const x = Math.max(20, Math.min(FIELD_WIDTH / 2 - 20, rawX));
    const y = Math.max(20, Math.min(FIELD_HEIGHT - 20, rawY));

    const existingIndex = formation.findIndex(p => p.id === draggedPlayer);
    if (existingIndex >= 0) {
      // Move existing player
      const updatedFormation = [...formation];
      updatedFormation[existingIndex].position = { x, y };
      setFormation(updatedFormation);
      onFormationChange(updatedFormation, substitutionOrder);
    } else {
      // Add new player to formation
      const player = players.find(p => p.id === draggedPlayer);
      if (player && formation.length < 6) {
        const newFormationPlayer: FormationPlayer = {
          id: player.id,
          name: player.name,
          role: getPlayerRole(player),
          position: { x, y },
          isStarter: true,
          substitutionPriority: formation.length + 1
        };
        const updatedFormation = [...formation, newFormationPlayer];
        setFormation(updatedFormation);
        onFormationChange(updatedFormation, substitutionOrder);
      }
    }

    setDraggedPlayer(null);
    setDragPosition(null);
  };

  // Field click handler for selected player placement
  const handleFieldClick = (event: React.MouseEvent) => {
    if (!selectedPlayer) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    
    // Only allow placement in own half (left side)
    if (rawX > FIELD_WIDTH / 2) return;
    
    const x = Math.max(20, Math.min(FIELD_WIDTH / 2 - 20, rawX));
    const y = Math.max(20, Math.min(FIELD_HEIGHT - 20, rawY));
    
    const player = players.find(p => p.id === selectedPlayer);
    if (player && formation.length < 6) {
      const newFormationPlayer: FormationPlayer = {
        id: player.id,
        name: player.name,
        role: getPlayerRole(player),
        position: { x, y },
        isStarter: true,
        substitutionPriority: formation.length + 1
      };
      const updatedFormation = [...formation, newFormationPlayer];
      setFormation(updatedFormation);
      onFormationChange(updatedFormation, substitutionOrder);
    }
    
    setSelectedPlayer(null);
  };

  const removeFromFormation = (playerId: string) => {
    const updatedFormation = formation.filter(p => p.id !== playerId);
    setFormation(updatedFormation);
    onFormationChange(updatedFormation, substitutionOrder);
  };

  const updateSubstitutionPriority = (playerId: string, priority: number) => {
    const updatedOrder = { ...substitutionOrder, [playerId]: priority };
    setSubstitutionOrder(updatedOrder);
    onFormationChange(formation, updatedOrder);
  };

  const saveFormation = () => {
    saveFormationMutation.mutate({ formation, substitutionOrder });
  };

  // Check formation requirements
  const getFormationStatus = () => {
    const starters = formation.filter(p => p.isStarter);
    const roleCounts = starters.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const passers = roleCounts.Passer || 0;
    const runners = roleCounts.Runner || 0;
    const blockers = roleCounts.Blocker || 0;
    const total = starters.length;

    const isValid = passers >= 1 && runners >= 2 && blockers >= 2 && total === 6;
    
    return {
      passers,
      runners,
      blockers,
      total,
      isValid,
      requirements: {
        passers: passers >= 1,
        runners: runners >= 2,
        blockers: blockers >= 2,
        total: total === 6
      }
    };
  };

  const status = getFormationStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tactical Formation</h3>
        <div className="flex gap-2">
          <Button 
            onClick={saveFormation} 
            disabled={!status.isValid || saveFormationMutation.isPending}
          >
            {saveFormationMutation.isPending ? "Saving..." : "Save Formation"}
          </Button>
        </div>
      </div>

      {/* Formation Requirements Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Formation Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className={`text-center ${status.requirements.passers ? 'text-green-600' : 'text-red-600'}`}>
              <div className="font-medium">Passers</div>
              <div>{status.passers}/1+</div>
            </div>
            <div className={`text-center ${status.requirements.runners ? 'text-green-600' : 'text-red-600'}`}>
              <div className="font-medium">Runners</div>
              <div>{status.runners}/2+</div>
            </div>
            <div className={`text-center ${status.requirements.blockers ? 'text-green-600' : 'text-red-600'}`}>
              <div className="font-medium">Blockers</div>
              <div>{status.blockers}/2+</div>
            </div>
            <div className={`text-center ${status.requirements.total ? 'text-green-600' : 'text-red-600'}`}>
              <div className="font-medium">Total</div>
              <div>{status.total}/6</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formation Field - Horizontal Layout */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Formation Field - Your Tactical Zone</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedPlayer ? "Click on the field to place selected player" : "Drag players or select and click to position them"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div 
                className="relative border-4 border-gray-600 bg-green-600 dark:bg-green-800 mx-auto overflow-hidden cursor-pointer"
                style={{ 
                  width: isMobile ? "100%" : FIELD_WIDTH, 
                  height: FIELD_HEIGHT,
                  maxWidth: isMobile ? "350px" : "100%"
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleFieldClick}
              >
                {/* Field markings - Horizontal Layout */}
                <div className="absolute inset-0">
                  {/* Field boundaries */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white" />
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-white" />
                  <div className="absolute top-0 bottom-0 right-0 w-1 bg-white" />
                  
                  {/* Center line - divides own/opponent half */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white transform -translate-x-1/2" />
                  
                  {/* Own Goal Zone (Left side) */}
                  <div className="absolute top-1/4 bottom-1/4 left-0 w-16 border-2 border-white border-l-0 bg-green-500 bg-opacity-30">
                    <div className="absolute top-1/3 bottom-1/3 left-0 w-8 border-2 border-white border-l-0 bg-green-400 bg-opacity-50" />
                  </div>
                  
                  {/* Opponent Goal Zone (Right side) - Visual only */}
                  <div className="absolute top-1/4 bottom-1/4 right-0 w-16 border-2 border-white border-r-0 bg-red-500 bg-opacity-30">
                    <div className="absolute top-1/3 bottom-1/3 right-0 w-8 border-2 border-white border-r-0 bg-red-400 bg-opacity-50" />
                  </div>
                  
                  {/* Placement zone indicator (Own half only) */}
                  <div className="absolute top-2 bottom-2 left-2 w-1/2 border-2 border-blue-400 border-dashed opacity-50" />
                  
                  {/* Field lines */}
                  <div className="absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-white opacity-60" />
                  <div className="absolute bottom-1/4 left-1/4 right-1/4 h-0.5 bg-white opacity-60" />
                </div>

                {/* No-placement zone overlay */}
                <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-gray-900 bg-opacity-40 pointer-events-none">
                  <div className="flex items-center justify-center h-full text-white text-sm font-medium">
                    Opponent Half
                  </div>
                </div>

                {/* Positioned Players */}
                {formation.map((player) => (
                  <div
                    key={player.id}
                    className={`absolute cursor-move rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 ${
                      player.role === 'Passer' ? 'bg-yellow-500 border-yellow-300' :
                      player.role === 'Runner' ? 'bg-green-500 border-green-300' :
                      'bg-red-500 border-red-300'
                    } text-white hover:scale-110 transition-transform`}
                    style={{
                      left: player.position.x,
                      top: player.position.y
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(player.id, e)}
                    title={`${player.name} (${player.role}) - Click to remove`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromFormation(player.id);
                    }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-black bg-opacity-75 text-white px-1 rounded text-center whitespace-nowrap">
                      {player.name.split(' ')[0]}
                    </div>
                  </div>
                ))}

                {/* Drag Preview */}
                {dragPosition && (
                  <div
                    className="absolute w-10 h-10 bg-yellow-400 rounded-full opacity-75 transform -translate-x-1/2 -translate-y-1/2 border-2 border-yellow-200"
                    style={{
                      left: dragPosition.x,
                      top: dragPosition.y,
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Selected player indicator */}
                {selectedPlayer && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                    Placing: {players.find(p => p.id === selectedPlayer)?.name}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Players</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag players to field or click to select, then click field to place
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(playersByRole).map(([role, rolePlayers]) => (
                <div key={role}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      role === 'Passer' ? 'bg-yellow-500' :
                      role === 'Runner' ? 'bg-green-500' :
                      'bg-red-500'
                    }`} />
                    {role}s
                  </h4>
                  <div className="space-y-2">
                    {(rolePlayers as any[]).map((player: any) => {
                      const inFormation = formation.some(p => p.id === player.id);
                      const isSelected = selectedPlayer === player.id;
                      return (
                        <div
                          key={player.id}
                          className={`p-3 border rounded transition-all duration-200 ${
                            isSelected ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' :
                            inFormation ? 'bg-gray-100 border-gray-300 opacity-60' : 
                            'bg-white hover:bg-gray-50 cursor-pointer border-gray-200 hover:border-gray-300'
                          } ${!inFormation ? 'cursor-move' : ''}`}
                          draggable={!inFormation}
                          onDragStart={(e) => !inFormation && handleDragStart(player.id, e)}
                          onClick={() => {
                            if (!inFormation) {
                              setSelectedPlayer(isSelected ? null : player.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2 text-gray-900">
                                {player.name}
                                {isSelected && (
                                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {player.race} • Age {player.age}
                              </div>
                              <div className="flex gap-1 mt-1 text-xs text-gray-700">
                                <span>SPD: {player.speed}</span>
                                <span>PWR: {player.power}</span>
                                <span>AGI: {player.agility}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge variant="outline" className="text-xs">
                                OVR {Math.round((player.speed + player.agility + player.power + player.throwing + player.catching + player.staminaAttribute) / 6)}
                              </Badge>
                              {inFormation && (
                                <Badge variant="secondary" className="text-xs">
                                  On Field
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {formation.length < 6 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                  <div className="text-sm text-amber-800">
                    <strong>Need {6 - formation.length} more players</strong>
                    <br />
                    Min requirements: 1 Passer, 2 Runners, 2 Blockers
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Substitution Order */}
          <Card>
            <CardHeader>
              <CardTitle>Substitution Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(substitutionOrder)
                  .sort(([, a], [, b]) => a - b)
                  .map(([playerId, priority]) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    return (
                      <div key={playerId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500">{getPlayerRole(player)}</div>
                        </div>
                        <Select
                          value={priority.toString()}
                          onValueChange={(value) => updateSubstitutionPriority(playerId, parseInt(value))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}