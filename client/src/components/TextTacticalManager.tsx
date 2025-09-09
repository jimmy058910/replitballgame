import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, ArrowUp, ArrowDown, Save, RotateCcw, Settings } from "lucide-react";
import type { Player, Team, Staff, Contract } from '@shared/types/models';



interface TextTacticalManagerProps {
  players: Player[];
  savedFormation?: any;
}

export default function TextTacticalManager({ players, savedFormation }: TextTacticalManagerProps) {
  const [starters, setStarters] = useState<string[]>([]);
  const [substitutionOrder, setSubstitutionOrder] = useState<{
    passer: string[];
    runner: string[];
    blocker: string[];
  }>({ passer: [], runner: [], blocker: [] });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved formation on component mount
  useEffect(() => {
    if (savedFormation && savedFormation.formation) {
      const savedStarters = savedFormation.formation
        .filter((p: any) => p.isStarter)
        .map((p: any) => p.id);
      setStarters(savedStarters);
      
      // Set substitution orders
      const subs = { passer: [] as string[], runner: [] as string[], blocker: [] as string[] };
      players.forEach(player => {
        if (!savedStarters.includes(String(player.id))) {
          const role = player.role.toLowerCase() as keyof typeof subs;
          if (role === 'passer' || role === 'runner' || role === 'blocker') {
            subs[role].push(String(player.id));
          }
        }
      });
      setSubstitutionOrder(subs);
    }
  }, [savedFormation, players]);

  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
  };

  const getPlayerRole = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? player.role : 'Unknown';
  };

  const getPlayerPower = (playerId: string): number => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 0;
    return player.speed + player.power + player.throwing + player.catching + player.kicking;
  };

  const getPlayersByRole = (role: string): Player[] => {
    return players.filter(player => player.role.toLowerCase() === role.toLowerCase());
  };

  const getStartersByRole = (role: string): string[] => {
    return starters.filter(starterId => {
      const player = players.find(p => p.id === starterId);
      return player && player.role.toLowerCase() === role.toLowerCase();
    });
  };

  const canAddStarter = (): boolean => {
    if (starters.length >= 6) return false;
    
    const passerCount = getStartersByRole('passer').length;
    const runnerCount = getStartersByRole('runner').length;
    const blockerCount = getStartersByRole('blocker').length;
    
    // Must have at least 1 passer, 2 runners, 2 blockers
    return passerCount >= 1 && runnerCount >= 2 && blockerCount >= 2;
  };

  const addStarter = (playerId: string) => {
    if (starters.length >= 6) {
      toast({
        title: "Maximum starters reached",
        description: "You can only have 6 starters total.",
        variant: "destructive",
      });
      return;
    }

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const role = player.role.toLowerCase();
    const passerCount = getStartersByRole('passer').length;
    const runnerCount = getStartersByRole('runner').length;
    const blockerCount = getStartersByRole('blocker').length;

    // Check role limits
    if (role === 'passer' && passerCount >= 1 && starters.length >= 5) {
      toast({
        title: "Formation complete",
        description: "Add one more player of any role as wildcard.",
        variant: "default",
      });
    } else if (role === 'runner' && runnerCount >= 2 && starters.length >= 5) {
      toast({
        title: "Formation complete", 
        description: "Add one more player of any role as wildcard.",
        variant: "default",
      });
    } else if (role === 'blocker' && blockerCount >= 2 && starters.length >= 5) {
      toast({
        title: "Formation complete",
        description: "Add one more player of any role as wildcard.",
        variant: "default",
      });
    }

    setStarters(prev => [...prev, playerId]);
    
    // Remove from substitution order
    setSubstitutionOrder(prev => ({
      ...prev,
      [role]: prev[role as keyof typeof prev]?.filter((id: string) => id !== playerId) || []
    }));
  };

  const removeStarter = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setStarters(prev => prev.filter(id => id !== playerId));
    
    // Add back to substitution order
    const role = player.role.toLowerCase() as keyof typeof substitutionOrder;
    if (role === 'passer' || role === 'runner' || role === 'blocker') {
      setSubstitutionOrder(prev => ({
        ...prev,
        [role]: [...prev[role], playerId]
      }));
    }
  };

  const addToSubstitutes = (playerId: string, role: keyof typeof substitutionOrder) => {
    setSubstitutionOrder(prev => ({
      ...prev,
      [role]: [...prev[role], playerId]
    }));
  };

  const removeFromSubstitutes = (playerId: string, role: keyof typeof substitutionOrder) => {
    setSubstitutionOrder(prev => ({
      ...prev,
      [role]: prev[role].filter(id => id !== playerId)
    }));
  };

  const moveSubUp = (playerId: string, role: keyof typeof substitutionOrder) => {
    const currentOrder = substitutionOrder[role];
    const index = currentOrder.indexOf(playerId);
    
    if (index > 0) {
      const newOrder = [...currentOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      
      setSubstitutionOrder(prev => ({
        ...prev,
        [role]: newOrder
      }));
    }
  };

  const moveSubDown = (playerId: string, role: keyof typeof substitutionOrder) => {
    const currentOrder = substitutionOrder[role];
    const index = currentOrder.indexOf(playerId);
    
    if (index < currentOrder.length - 1) {
      const newOrder = [...currentOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      
      setSubstitutionOrder(prev => ({
        ...prev,
        [role]: newOrder
      }));
    }
  };

  const resetToOptimal = () => {
    // Sort players by power rating
    const sortedPlayers = players.sort((a, b) => getPlayerPower(String(b.id)) - getPlayerPower(String(a.id)));
    
    const newStarters: string[] = [];
    const newSubs = { passer: [] as string[], runner: [] as string[], blocker: [] as string[] };
    
    // Get best players by role
    const passers = sortedPlayers.filter(p => p.role.toLowerCase() === 'passer');
    const runners = sortedPlayers.filter(p => p.role.toLowerCase() === 'runner');
    const blockers = sortedPlayers.filter(p => p.role.toLowerCase() === 'blocker');
    
    // Add required starters: 1 passer, 2 runners, 2 blockers
    if (passers.length > 0) newStarters.push(String(passers[0].id));
    if (runners.length >= 2) {
      newStarters.push(String(runners[0].id), String(runners[1].id));
    }
    if (blockers.length >= 2) {
      newStarters.push(String(blockers[0].id), String(blockers[1].id));
    }
    
    // Add best remaining player as wildcard
    const remaining = sortedPlayers.filter(p => !newStarters.includes(p.id));
    if (remaining.length > 0 && newStarters.length < 6) {
      newStarters.push(remaining[0].id);
    }
    
    // Set substitution orders
    passers.forEach(p => {
      if (!newStarters.includes(p.id)) newSubs.passer.push(p.id);
    });
    runners.forEach(p => {
      if (!newStarters.includes(p.id)) newSubs.runner.push(p.id);
    });
    blockers.forEach(p => {
      if (!newStarters.includes(p.id)) newSubs.blocker.push(p.id);
    });
    
    setStarters(newStarters);
    setSubstitutionOrder(newSubs);
    
    toast({
      title: "Formation optimized",
      description: "Set to best players: 1 passer, 2 runners, 2 blockers, 1 wildcard.",
    });
  };

  const saveFormation = useMutation({
    mutationFn: async () => {
      const starterPlayers = players.filter(player => starters.includes(player.id));
      const substitutePlayers = players.filter(player => !starters.includes(player.id));
      
      const response = await fetch(`/api/teams/my/formation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starters: starterPlayers.map(player => ({ id: player.id, role: player.role })),
          substitutes: substitutePlayers.map(player => ({ id: player.id, role: player.role })),
          formationData: { formation: "2-2-1-1-wildcard" }
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save formation");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Formation saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/formation"] });
    },
    onError: () => {
      toast({
        title: "Failed to save formation",
        variant: "destructive",
      });
    },
  });

  const getFormationStatus = () => {
    const passerCount = getStartersByRole('passer').length;
    const runnerCount = getStartersByRole('runner').length;
    const blockerCount = getStartersByRole('blocker').length;
    const totalCount = starters.length;

    if (totalCount === 6 && passerCount >= 1 && runnerCount >= 2 && blockerCount >= 2) {
      return { valid: true, message: "Formation complete ✓" };
    } else if (totalCount < 6) {
      return { valid: false, message: `Need ${6 - totalCount} more starters` };
    } else {
      return { valid: false, message: "Formation invalid" };
    }
  };

  const status = getFormationStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tactical Formation
          </CardTitle>
          <div className="flex items-center justify-between">
            <Badge variant={status.valid ? "default" : "destructive"}>
              {status.message}
            </Badge>
            <div className="space-x-2">
              <Button onClick={resetToOptimal} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Optimal
              </Button>
              <Button onClick={() => saveFormation.mutate()} disabled={!status.valid || saveFormation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Save Formation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Required: 1 Passer, 2 Runners, 2 Blockers + 1 Wildcard (any role)
          </div>

          {/* Current Starters */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Starting Lineup ({starters.length}/6)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {starters.map((playerId, index) => {
                const role = getPlayerRole(playerId);
                const roleLower = role.toLowerCase();
                
                // Determine if this is a wildcard based on position requirements
                const passerStarters = getStartersByRole('passer');
                const runnerStarters = getStartersByRole('runner');
                const blockerStarters = getStartersByRole('blocker');
                
                let isWildcard = false;
                let roleLabel = role;
                let positionNumber = 1;
                
                if (roleLower === 'passer') {
                  const passerIndex = passerStarters.indexOf(playerId);
                  if (passerIndex === 0) {
                    roleLabel = 'Passer';
                    positionNumber = 1;
                  } else {
                    isWildcard = true;
                  }
                } else if (roleLower === 'runner') {
                  const runnerIndex = runnerStarters.indexOf(playerId);
                  if (runnerIndex < 2) {
                    roleLabel = 'Runner';
                    positionNumber = runnerIndex + 1;
                  } else {
                    isWildcard = true;
                  }
                } else if (roleLower === 'blocker') {
                  const blockerIndex = blockerStarters.indexOf(playerId);
                  if (blockerIndex < 2) {
                    roleLabel = 'Blocker';
                    positionNumber = blockerIndex + 1;
                  } else {
                    isWildcard = true;
                  }
                }

                return (
                  <div key={playerId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {isWildcard ? 'Wildcard' : `${roleLabel} ${positionNumber}`}
                      </Badge>
                      <span>{getPlayerName(playerId)}</span>
                      <span className="text-sm text-muted-foreground">({getPlayerPower(playerId)})</span>
                    </div>
                    <Button onClick={() => removeStarter(playerId)} variant="ghost" size="sm">
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Substitution Orders */}
          <div className="space-y-4">
            {['Passer', 'Runner', 'Blocker'].map(role => {
              const roleKey = role.toLowerCase() as keyof typeof substitutionOrder;
              const availablePlayers = getPlayersByRole(role).filter(p => !starters.includes(p.id));
              const starterCount = getStartersByRole(role.toLowerCase()).length;
              const maxStarters = role === 'Passer' ? 1 : 2;
              const substitutes = substitutionOrder[roleKey] || [];

              return (
                <div key={role}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {role}s ({starterCount}/{maxStarters} starters)
                  </h4>
                  
                  {/* Available players not yet in formation */}
                  {availablePlayers.filter(p => !substitutes.includes(p.id)).length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Available Players</h5>
                      <div className="space-y-1">
                        {availablePlayers.filter(p => !substitutes.includes(p.id)).map(player => (
                          <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <span>{getPlayerName(player.id)}</span>
                              <span className="text-sm text-muted-foreground">({getPlayerPower(player.id)})</span>
                            </div>
                            <div className="space-x-2">
                              <Button onClick={() => addStarter(player.id)} variant="outline" size="sm">
                                Add to Starters
                              </Button>
                              <Button 
                                onClick={() => addToSubstitutes(player.id, roleKey)} 
                                variant="ghost" 
                                size="sm"
                              >
                                Add to Subs
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Substitution order */}
                  {substitutes.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Substitution Order</h5>
                      <div className="space-y-1">
                        {substitutes.map((playerId, index) => (
                          <div key={playerId} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">#{index + 1}</Badge>
                              <span>{getPlayerName(playerId)}</span>
                              <span className="text-sm text-muted-foreground">({getPlayerPower(playerId)})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                onClick={() => moveSubUp(playerId, roleKey)} 
                                variant="ghost" 
                                size="sm"
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button 
                                onClick={() => moveSubDown(playerId, roleKey)} 
                                variant="ghost" 
                                size="sm"
                                disabled={index === substitutes.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button 
                                onClick={() => removeFromSubstitutes(playerId, roleKey)} 
                                variant="ghost" 
                                size="sm"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}