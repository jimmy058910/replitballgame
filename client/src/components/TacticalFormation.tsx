import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onFormationChange: (formation: FormationPlayer[], substitutionOrder: Record<string, number>) => void;
}

const FIELD_WIDTH = 300;
const FIELD_HEIGHT = 200;

export default function TacticalFormation({ players, onFormationChange }: TacticalFormationProps) {
  const [formation, setFormation] = useState<FormationPlayer[]>([]);
  const [substitutionOrder, setSubstitutionOrder] = useState<Record<string, number>>({});
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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

  // Helper function to get player role
  const getPlayerRole = (player: any): string => {
    const { speed, agility, catching, throwing, power, leadership, stamina } = player;
    
    const passerScore = (throwing * 2) + (leadership * 1.5);
    const runnerScore = (speed * 2) + (agility * 1.5);
    const blockerScore = (power * 2) + (stamina * 1.5);
    
    const maxScore = Math.max(passerScore, runnerScore, blockerScore);
    
    if (maxScore === passerScore) return "Passer";
    if (maxScore === runnerScore) return "Runner";
    return "Blocker";
  };

  // Group players by role
  const playersByRole = players.reduce((acc, player) => {
    const role = getPlayerRole(player);
    if (!acc[role]) acc[role] = [];
    acc[role].push({ ...player, role });
    return acc;
  }, {} as Record<string, any[]>);

  // Auto-formation preset
  const createAutoFormation = () => {
    const newFormation: FormationPlayer[] = [];
    const newSubstitutionOrder: Record<string, number> = {};
    
    // Select best players for each role
    const starters = ['Passer', 'Runner', 'Blocker'].flatMap((role, roleIndex) => {
      const rolePlayers = (playersByRole[role] || []).slice(0, 3);
      return rolePlayers.map((player: any, index: number) => ({
        id: player.id,
        name: player.name,
        role,
        position: {
          x: 50 + (roleIndex * 120),
          y: 80 + (index * 60)
        },
        isStarter: true,
        substitutionPriority: index + 1
      }));
    });

    // Add substitutes
    let subPriority = 10;
    Object.entries(playersByRole).forEach(([role, rolePlayers]) => {
      (rolePlayers as any[]).slice(3).forEach(player => {
        newSubstitutionOrder[player.id] = subPriority++;
      });
    });

    setFormation(starters);
    setSubstitutionOrder(newSubstitutionOrder);
    onFormationChange(starters, newSubstitutionOrder);
  };

  // Drag and drop handlers
  const handleDragStart = (playerId: string, event: React.DragEvent) => {
    setDraggedPlayer(playerId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDragPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedPlayer || !dragPosition) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(20, Math.min(FIELD_WIDTH - 20, event.clientX - rect.left));
    const y = Math.max(20, Math.min(FIELD_HEIGHT - 20, event.clientY - rect.top));

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
      if (player && formation.length < 11) {
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
          <Button onClick={createAutoFormation} variant="outline">
            Auto Formation
          </Button>
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
        {/* Formation Field */}
        <Card>
          <CardHeader>
            <CardTitle>Formation Field</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div 
              className="relative border-4 border-gray-600 bg-green-600 dark:bg-green-800 mx-auto overflow-hidden w-full"
              style={{ 
                width: isMobile ? "100%" : FIELD_WIDTH, 
                height: FIELD_HEIGHT,
                maxWidth: isMobile ? "280px" : "100%"
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Your half of the field - defensive side */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white" />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-white" />
                <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-white" />
                {/* Only show your defensive half */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2" />
                <div className="absolute left-1/4 top-1/2 bottom-0 w-0.5 bg-white opacity-50" />
                <div className="absolute left-3/4 top-1/2 bottom-0 w-0.5 bg-white opacity-50" />
                {/* Your goal area */}
                <div className="absolute top-1/3 bottom-1/3 left-0 w-8 border-2 border-white border-l-0" />
                <div className="absolute top-1/3 bottom-1/3 right-0 w-8 border-2 border-white border-r-0" />
              </div>

              {/* Positioned Players */}
              {formation.map((player) => (
                <div
                  key={player.id}
                  className="absolute cursor-move bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 hover:bg-blue-600 shadow-lg"
                  style={{
                    left: player.position.x,
                    top: player.position.y
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(player.id, e)}
                  title={`${player.name} (${player.role})`}
                  onClick={() => removeFromFormation(player.id)}
                >
                  {player.name.charAt(0)}
                </div>
              ))}

              {/* Drag Preview */}
              {dragPosition && (
                <div
                  className="absolute w-8 h-8 bg-blue-300 rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: dragPosition.x,
                    top: dragPosition.y,
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Player Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(playersByRole).map(([role, rolePlayers]) => (
                <div key={role}>
                  <h4 className="font-medium mb-2">{role}s</h4>
                  <div className="space-y-2">
                    {(rolePlayers as any[]).map((player: any) => {
                      const inFormation = formation.some(p => p.id === player.id);
                      return (
                        <div
                          key={player.id}
                          className={`p-2 border rounded cursor-move ${
                            inFormation ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                          }`}
                          draggable={!inFormation}
                          onDragStart={(e) => !inFormation && handleDragStart(player.id, e)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-sm text-gray-500">
                                {player.race} • Age {player.age}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Badge variant="outline">
                                {Math.round((player.speed + player.agility + player.power + player.throwing + player.catching + player.stamina) / 6)}
                              </Badge>
                              {inFormation && (
                                <Badge variant="secondary">On Field</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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