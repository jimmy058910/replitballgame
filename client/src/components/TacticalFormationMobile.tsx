import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: 'PASSER' | 'RUNNER' | 'BLOCKER';
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  agility: number;
  staminaAttribute: number;
  leadership: number;
  injuryStatus: string;
  dailyStaminaLevel: number;
}

interface FormationPlayer {
  id: string;
  name: string;
  role: string;
  isStarter: boolean;
  substitutionPriority: number;
}

interface TacticalFormationMobileProps {
  players: Player[];
  savedFormation?: any;
  onFormationChange: (formation: FormationPlayer[], substitutionOrder: Record<string, number>) => void;
}

export default function TacticalFormationMobile({ players, savedFormation, onFormationChange }: TacticalFormationMobileProps) {
  // Starter positions: 2 blockers, 2 runners, 1 passer, 1 any position
  const [starters, setStarters] = useState({
    blocker1: '',
    blocker2: '',
    runner1: '',
    runner2: '',
    passer1: '',
    wildcard: '' // Any position
  });

  // Substitution order for each position
  const [substitutionOrder, setSubstitutionOrder] = useState({
    blockers: [] as string[], // Ordered list of blocker substitutes
    runners: [] as string[],  // Ordered list of runner substitutes
    passers: [] as string[],  // Ordered list of passer substitutes
    wildcards: [] as string[] // Ordered list of wildcard substitutes
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save formation mutation
  const saveFormationMutation = useMutation({
    mutationFn: async (data: { formation: FormationPlayer[], substitutionOrder: Record<string, number> }) => {
      const response = await fetch('/api/tactical/formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save formation');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Formation saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/tactical/formation'] });
    },
    onError: () => {
      toast({ title: "Failed to save formation", variant: "destructive" });
    }
  });

  // Helper function to calculate player power
  const calculatePlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.throwing + player.catching + player.kicking + player.agility + player.staminaAttribute + player.leadership) / 8);
  };

  // Get player name
  const getPlayerName = (player: Player) => `${player.firstName} ${player.lastName}`;

  // Filter available players by role and availability
  const getAvailablePlayersByRole = (role: 'PASSER' | 'RUNNER' | 'BLOCKER') => {
    return players.filter(p => 
      p.role === role && 
      p.injuryStatus === 'HEALTHY' &&
      p.dailyStaminaLevel > 20 // Relaxed stamina requirement - only well-rested players
    );
  };

  // Get all available players for wildcard position
  const getWildcardPlayers = () => {
    return players.filter(p => 
      p.injuryStatus === 'HEALTHY' &&
      p.dailyStaminaLevel > 20 &&
      !Object.values(starters).includes(p.id) // Not already selected as starter
    );
  };

  // Get players not selected as starters for substitution
  const getSubstitutePlayers = (role: 'PASSER' | 'RUNNER' | 'BLOCKER' | 'Any') => {
    const starterIds = Object.values(starters);
    return players.filter(p => {
      if (starterIds.includes(p.id)) return false; // Not a starter
      if (role === 'Any') return true; // Wildcard can substitute any position
      return p.role === role; // Position-specific substitutes
    });
  };

  // Load saved formation
  useEffect(() => {
    if (savedFormation?.formation) {
      const formation = savedFormation.formation;
      const newStarters = { ...starters };
      
      formation.forEach((player: any, index: number) => {
        if (index === 0 && player.role === 'Blocker') newStarters.blocker1 = player.id;
        else if (index === 1 && player.role === 'Blocker') newStarters.blocker2 = player.id;
        else if (index === 0 && player.role === 'Runner') newStarters.runner1 = player.id;
        else if (index === 1 && player.role === 'Runner') newStarters.runner2 = player.id;
        else if (player.role === 'Passer') newStarters.passer1 = player.id;
        else newStarters.wildcard = player.id; // Remaining player goes to wildcard
      });
      
      setStarters(newStarters);
    }
  }, [savedFormation]);

  // Update formation when starters change
  useEffect(() => {
    const formationPlayers: FormationPlayer[] = [];
    let priority = 1;

    Object.entries(starters).forEach(([position, playerId]) => {
      if (playerId) {
        const player = players.find(p => p.id === playerId);
        if (player) {
          formationPlayers.push({
            id: player.id,
            name: getPlayerName(player),
            role: player.role,
            isStarter: true,
            substitutionPriority: priority++
          });
        }
      }
    });

    // Convert substitution order to flat record
    const flatSubstitutionOrder: Record<string, number> = {};
    Object.values(substitutionOrder).flat().forEach((playerId, index) => {
      flatSubstitutionOrder[playerId] = index + 7; // Start after 6 starters
    });

    onFormationChange(formationPlayers, flatSubstitutionOrder);
  }, [starters, substitutionOrder, players, onFormationChange]);

  // Check if formation is valid
  const isFormationValid = () => {
    const starterIds = Object.values(starters).filter(id => id !== '');
    return starterIds.length === 6 && new Set(starterIds).size === 6; // 6 unique starters
  };

  // Save formation
  const handleSaveFormation = () => {
    const formationPlayers: FormationPlayer[] = [];
    let priority = 1;

    Object.entries(starters).forEach(([position, playerId]) => {
      if (playerId) {
        const player = players.find(p => p.id === playerId);
        if (player) {
          formationPlayers.push({
            id: player.id,
            name: getPlayerName(player),
            role: player.role,
            isStarter: true,
            substitutionPriority: priority++
          });
        }
      }
    });

    const flatSubstitutionOrder: Record<string, number> = {};
    Object.values(substitutionOrder).flat().forEach((playerId, index) => {
      flatSubstitutionOrder[playerId] = index + 7;
    });

    saveFormationMutation.mutate({ formation: formationPlayers, substitutionOrder: flatSubstitutionOrder });
  };

  // Add player to substitution order
  const addToSubstitutionOrder = (role: keyof typeof substitutionOrder, playerId: string) => {
    setSubstitutionOrder(prev => ({
      ...prev,
      [role]: [...prev[role], playerId]
    }));
  };

  // Remove player from substitution order
  const removeFromSubstitutionOrder = (role: keyof typeof substitutionOrder, playerId: string) => {
    setSubstitutionOrder(prev => ({
      ...prev,
      [role]: prev[role].filter(id => id !== playerId)
    }));
  };

  // Move player up/down in substitution order
  const moveInSubstitutionOrder = (role: keyof typeof substitutionOrder, playerId: string, direction: 'up' | 'down') => {
    setSubstitutionOrder(prev => {
      const currentOrder = [...prev[role]];
      const currentIndex = currentOrder.indexOf(playerId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= currentOrder.length) return prev;

      // Swap positions
      [currentOrder[currentIndex], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[currentIndex]];

      return {
        ...prev,
        [role]: currentOrder
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Formation & Tactics</h3>
        <Button 
          onClick={handleSaveFormation} 
          disabled={!isFormationValid() || saveFormationMutation.isPending}
          className="btn-large"
        >
          {saveFormationMutation.isPending ? "Saving..." : "Save Formation"}
        </Button>
      </div>

      {/* Formation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Starting Lineup (6 Players)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Required</div>
              <div className="text-muted-foreground">
                2 Blockers, 2 Runners, 1 Passer, 1 Any
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Status</div>
              <Badge variant={isFormationValid() ? "default" : "destructive"}>
                {Object.values(starters).filter(id => id !== '').length}/6 Selected
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Starting Lineup Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Starting Lineup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Blockers */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Blockers (2 Required)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Blocker 1</label>
                <Select value={starters.blocker1} onValueChange={(value) => setStarters(prev => ({ ...prev, blocker1: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blocker" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePlayersByRole('BLOCKER').map(player => (
                      <SelectItem key={player.id} value={player.id} disabled={Object.values(starters).includes(player.id)}>
                        {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Blocker 2</label>
                <Select value={starters.blocker2} onValueChange={(value) => setStarters(prev => ({ ...prev, blocker2: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blocker" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePlayersByRole('BLOCKER').map(player => (
                      <SelectItem key={player.id} value={player.id} disabled={Object.values(starters).includes(player.id)}>
                        {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Runners */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Runners (2 Required)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Runner 1</label>
                <Select value={starters.runner1} onValueChange={(value) => setStarters(prev => ({ ...prev, runner1: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select runner" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePlayersByRole('RUNNER').map(player => (
                      <SelectItem key={player.id} value={player.id} disabled={Object.values(starters).includes(player.id)}>
                        {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Runner 2</label>
                <Select value={starters.runner2} onValueChange={(value) => setStarters(prev => ({ ...prev, runner2: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select runner" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePlayersByRole('RUNNER').map(player => (
                      <SelectItem key={player.id} value={player.id} disabled={Object.values(starters).includes(player.id)}>
                        {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Passer */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              Passer (1 Required)
            </h4>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Passer</label>
              <Select value={starters.passer1} onValueChange={(value) => setStarters(prev => ({ ...prev, passer1: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select passer" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePlayersByRole('PASSER').map(player => (
                    <SelectItem key={player.id} value={player.id} disabled={Object.values(starters).includes(player.id)}>
                      {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wildcard */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              Wildcard (1 Required - Any Position)
            </h4>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wildcard Player</label>
              <Select value={starters.wildcard} onValueChange={(value) => setStarters(prev => ({ ...prev, wildcard: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wildcard player" />
                </SelectTrigger>
                <SelectContent>
                  {getWildcardPlayers().map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {getPlayerName(player)} ({player.role}) (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Substitution Order */}
      <Card>
        <CardHeader>
          <CardTitle>Substitution Order</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set the order players will substitute in during matches
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Blocker Substitutes */}
          <div>
            <h5 className="font-medium mb-3 text-red-600">Blocker Substitutes</h5>
            <div className="space-y-2">
              {substitutionOrder.blockers.map((playerId, index) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {index + 1}. {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('blockers', playerId, 'up')} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('blockers', playerId, 'down')} disabled={index === substitutionOrder.blockers.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFromSubstitutionOrder('blockers', playerId)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Select onValueChange={(value) => addToSubstitutionOrder('blockers', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add blocker substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getSubstitutePlayers('BLOCKER').filter(p => !substitutionOrder.blockers.includes(p.id)).map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Runner Substitutes */}
          <div>
            <h5 className="font-medium mb-3 text-green-600">Runner Substitutes</h5>
            <div className="space-y-2">
              {substitutionOrder.runners.map((playerId, index) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {index + 1}. {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('runners', playerId, 'up')} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('runners', playerId, 'down')} disabled={index === substitutionOrder.runners.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFromSubstitutionOrder('runners', playerId)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Select onValueChange={(value) => addToSubstitutionOrder('runners', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add runner substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getSubstitutePlayers('RUNNER').filter(p => !substitutionOrder.runners.includes(p.id)).map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Passer Substitutes */}
          <div>
            <h5 className="font-medium mb-3 text-yellow-600">Passer Substitutes</h5>
            <div className="space-y-2">
              {substitutionOrder.passers.map((playerId, index) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {index + 1}. {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('passers', playerId, 'up')} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('passers', playerId, 'down')} disabled={index === substitutionOrder.passers.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFromSubstitutionOrder('passers', playerId)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Select onValueChange={(value) => addToSubstitutionOrder('passers', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add passer substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getSubstitutePlayers('PASSER').filter(p => !substitutionOrder.passers.includes(p.id)).map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {getPlayerName(player)} (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wildcard Substitutes */}
          <div>
            <h5 className="font-medium mb-3 text-purple-600">Wildcard Substitutes (Any Position)</h5>
            <div className="space-y-2">
              {substitutionOrder.wildcards.map((playerId, index) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {index + 1}. {getPlayerName(player)} ({player.role}) (PWR: {calculatePlayerPower(player)})
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('wildcards', playerId, 'up')} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveInSubstitutionOrder('wildcards', playerId, 'down')} disabled={index === substitutionOrder.wildcards.length - 1}>
                        ↓
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFromSubstitutionOrder('wildcards', playerId)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Select onValueChange={(value) => addToSubstitutionOrder('wildcards', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add wildcard substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getSubstitutePlayers('Any').filter(p => !substitutionOrder.wildcards.includes(p.id)).map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {getPlayerName(player)} ({player.role}) (PWR: {calculatePlayerPower(player)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}