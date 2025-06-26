import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, ArrowUp, ArrowDown, Save, RotateCcw } from "lucide-react";

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
}

interface TacticalSetup {
  starters: {
    passer: string[];
    runner: string[];
    blocker: string[];
  };
  substitutionOrder: {
    passer: string[];
    runner: string[];
    blocker: string[];
  };
}

interface TextTacticalManagerProps {
  players: Player[];
  savedFormation?: any;
}

export default function TextTacticalManager({ players, savedFormation }: TextTacticalManagerProps) {
  const [tacticalSetup, setTacticalSetup] = useState<TacticalSetup>({
    starters: { passer: [], runner: [], blocker: [] },
    substitutionOrder: { passer: [], runner: [], blocker: [] }
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved formation on component mount
  useEffect(() => {
    if (savedFormation && savedFormation.formation) {
      const setup = convertFormationToSetup(savedFormation);
      setTacticalSetup(setup);
    }
  }, [savedFormation]);

  // Convert old formation format to new setup format
  const convertFormationToSetup = (formation: any): TacticalSetup => {
    const setup: TacticalSetup = {
      starters: { passer: [], runner: [], blocker: [] },
      substitutionOrder: { passer: [], runner: [], blocker: [] }
    };

    if (formation.formation) {
      formation.formation.forEach((player: any) => {
        const role = player.role.toLowerCase() as keyof typeof setup.starters;
        if (player.isStarter && setup.starters[role].length < getMaxStarters(role)) {
          setup.starters[role].push(player.id);
        }
      });
    }

    // Fill substitution orders with remaining players
    players.forEach(player => {
      const role = player.role.toLowerCase() as keyof typeof setup.starters;
      if (!setup.starters[role].includes(player.id)) {
        setup.substitutionOrder[role].push(player.id);
      }
    });

    return setup;
  };

  const getMaxStarters = (role: string): number => {
    switch (role) {
      case 'passer': return 1;
      case 'runner': return 2;
      case 'blocker': return 3;
      default: return 0;
    }
  };

  const getPlayersByRole = (role: string): Player[] => {
    return players.filter(player => player.role.toLowerCase() === role.toLowerCase());
  };

  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
  };

  const getPlayerPower = (playerId: string): number => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 0;
    return player.speed + player.power + player.throwing + player.catching + player.kicking;
  };

  const moveToStarters = (playerId: string, role: string) => {
    const roleKey = role.toLowerCase() as keyof typeof tacticalSetup.starters;
    const maxStarters = getMaxStarters(role);
    
    if (tacticalSetup.starters[roleKey].length >= maxStarters) {
      toast({
        title: "Maximum starters reached",
        description: `You can only have ${maxStarters} ${role} starter${maxStarters > 1 ? 's' : ''}.`,
        variant: "destructive",
      });
      return;
    }

    setTacticalSetup(prev => ({
      ...prev,
      starters: {
        ...prev.starters,
        [roleKey]: [...prev.starters[roleKey], playerId]
      },
      substitutionOrder: {
        ...prev.substitutionOrder,
        [roleKey]: prev.substitutionOrder[roleKey].filter(id => id !== playerId)
      }
    }));
  };

  const moveToSubstitutes = (playerId: string, role: string) => {
    const roleKey = role.toLowerCase() as keyof typeof tacticalSetup.starters;
    
    setTacticalSetup(prev => ({
      ...prev,
      starters: {
        ...prev.starters,
        [roleKey]: prev.starters[roleKey].filter(id => id !== playerId)
      },
      substitutionOrder: {
        ...prev.substitutionOrder,
        [roleKey]: [...prev.substitutionOrder[roleKey], playerId]
      }
    }));
  };

  const movePlayerUp = (playerId: string, role: string, isStarter: boolean) => {
    const roleKey = role.toLowerCase() as keyof typeof tacticalSetup.starters;
    const list = isStarter ? tacticalSetup.starters[roleKey] : tacticalSetup.substitutionOrder[roleKey];
    const index = list.indexOf(playerId);
    
    if (index > 0) {
      const newList = [...list];
      [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
      
      setTacticalSetup(prev => ({
        ...prev,
        [isStarter ? 'starters' : 'substitutionOrder']: {
          ...prev[isStarter ? 'starters' : 'substitutionOrder'],
          [roleKey]: newList
        }
      }));
    }
  };

  const movePlayerDown = (playerId: string, role: string, isStarter: boolean) => {
    const roleKey = role.toLowerCase() as keyof typeof tacticalSetup.starters;
    const list = isStarter ? tacticalSetup.starters[roleKey] : tacticalSetup.substitutionOrder[roleKey];
    const index = list.indexOf(playerId);
    
    if (index < list.length - 1) {
      const newList = [...list];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      
      setTacticalSetup(prev => ({
        ...prev,
        [isStarter ? 'starters' : 'substitutionOrder']: {
          ...prev[isStarter ? 'starters' : 'substitutionOrder'],
          [roleKey]: newList
        }
      }));
    }
  };

  const resetToOptimal = () => {
    const newSetup: TacticalSetup = {
      starters: { passer: [], runner: [], blocker: [] },
      substitutionOrder: { passer: [], runner: [], blocker: [] }
    };

    // Get players by role and sort by total power
    const roles = ['passer', 'runner', 'blocker'] as const;
    
    roles.forEach(role => {
      const rolePlayers = getPlayersByRole(role)
        .sort((a, b) => getPlayerPower(b.id) - getPlayerPower(a.id));
      
      const maxStarters = getMaxStarters(role);
      
      // Assign best players as starters
      newSetup.starters[role] = rolePlayers.slice(0, maxStarters).map(p => p.id);
      
      // Remaining players as substitutes
      newSetup.substitutionOrder[role] = rolePlayers.slice(maxStarters).map(p => p.id);
    });

    setTacticalSetup(newSetup);
    
    toast({
      title: "Formation reset",
      description: "Optimal formation set based on player abilities.",
    });
  };

  const saveFormationMutation = useMutation({
    mutationFn: async () => {
      // Convert setup back to formation format for API compatibility
      const formation = [];
      const substitutionOrder: Record<string, number> = {};
      
      Object.entries(tacticalSetup.starters).forEach(([role, playerIds]) => {
        playerIds.forEach((playerId, index) => {
          formation.push({
            id: playerId,
            role: role,
            isStarter: true,
            substitutionPriority: index + 1,
            position: { x: 0, y: 0 } // Legacy field for API compatibility
          });
          substitutionOrder[playerId] = index + 1;
        });
      });

      Object.entries(tacticalSetup.substitutionOrder).forEach(([role, playerIds]) => {
        playerIds.forEach((playerId, index) => {
          formation.push({
            id: playerId,
            role: role,
            isStarter: false,
            substitutionPriority: index + 1,
            position: { x: 0, y: 0 } // Legacy field for API compatibility
          });
          substitutionOrder[playerId] = index + 1;
        });
      });

      await apiRequest("/api/teams/my/formation", "POST", { formation, substitutionOrder });
    },
    onSuccess: () => {
      toast({
        title: "Formation saved",
        description: "Your tactical setup has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/formation"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save formation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const renderRoleSection = (role: string, roleTitle: string) => {
    const roleKey = role.toLowerCase() as keyof typeof tacticalSetup.starters;
    const maxStarters = getMaxStarters(role);
    const starters = tacticalSetup.starters[roleKey];
    const substitutes = tacticalSetup.substitutionOrder[roleKey];
    
    return (
      <Card key={role} className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {roleTitle} ({starters.length}/{maxStarters} starters)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Starters */}
          <div>
            <h4 className="font-semibold text-green-400 mb-2">Starters</h4>
            {starters.length === 0 ? (
              <p className="text-gray-500 text-sm">No starters selected</p>
            ) : (
              <div className="space-y-2">
                {starters.map((playerId, index) => (
                  <div key={playerId} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{getPlayerName(playerId)}</span>
                      <Badge variant="secondary" className="text-xs">
                        Power: {getPlayerPower(playerId)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePlayerUp(playerId, role, true)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePlayerDown(playerId, role, true)}
                        disabled={index === starters.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveToSubstitutes(playerId, role)}
                      >
                        To Bench
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Substitution Order */}
          <div>
            <h4 className="font-semibold text-blue-400 mb-2">Substitution Order</h4>
            {substitutes.length === 0 ? (
              <p className="text-gray-500 text-sm">No substitutes available</p>
            ) : (
              <div className="space-y-2">
                {substitutes.map((playerId, index) => (
                  <div key={playerId} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        Sub #{index + 1}
                      </Badge>
                      <span className="font-medium">{getPlayerName(playerId)}</span>
                      <Badge variant="secondary" className="text-xs">
                        Power: {getPlayerPower(playerId)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePlayerUp(playerId, role, false)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePlayerDown(playerId, role, false)}
                        disabled={index === substitutes.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveToStarters(playerId, role)}
                        disabled={starters.length >= maxStarters}
                      >
                        To Starter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tactical Management</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToOptimal}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Optimal
              </Button>
              <Button
                onClick={() => saveFormationMutation.mutate()}
                disabled={saveFormationMutation.isPending}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveFormationMutation.isPending ? "Saving..." : "Save Formation"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400 mb-4">
            Configure your starting lineup and substitution order for each position. 
            Starting formation: 1 Passer, 2 Runners, 3 Blockers.
          </div>
          
          <div className="grid gap-4">
            {renderRoleSection('passer', 'Passers')}
            {renderRoleSection('runner', 'Runners')}
            {renderRoleSection('blocker', 'Blockers')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}