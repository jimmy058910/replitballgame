import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Target, 
  Shield, 
  Zap, 
  Plus, 
  X, 
  AlertTriangle, 
  Star, 
  Smartphone, 
  Monitor,
  ChevronRight,
  RotateCcw,
  Save,
  Activity,
  Crown
} from "lucide-react";

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
  staminaAttribute: number;
  leadership: number;
  injuryStatus: string;
  dailyStaminaLevel: number;
  overallRating?: number;
  race?: string;
}

interface FormationSlot {
  id: string;
  label: string;
  position: string;
  player: Player | null;
  requiredRole?: string;
  isWildcard?: boolean;
  isSubstitution?: boolean;
  substitutionPosition?: 'blockers' | 'runners' | 'passers' | 'wildcard';
  substitutionIndex?: number;
}

interface SubstitutionQueue {
  blockers: (Player | null)[];
  runners: (Player | null)[];
  passers: (Player | null)[];
  wildcard: (Player | null)[];
}

interface TapToAssignTacticsProps {
  teamId: string;
}

interface PlayerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  slot: FormationSlot;
  availablePlayers: Player[];
  onAssign: (player: Player, slotId: string) => void;
  isMobile: boolean;
}

// Player Selector Component (Mobile/Desktop adaptive)
function PlayerSelector({ 
  isOpen, 
  onClose, 
  slot, 
  availablePlayers, 
  onAssign, 
  isMobile 
}: PlayerSelectorProps) {
  const getEligiblePlayers = () => {
    if (slot.isWildcard) {
      return availablePlayers; // Any position for wildcard
    }
    
    if (slot.requiredRole) {
      return availablePlayers.filter(p => 
        p.role?.toLowerCase() === slot.requiredRole?.toLowerCase()
      );
    }
    
    return availablePlayers;
  };

  const eligiblePlayers = getEligiblePlayers();

  const getPlayerPower = (player: Player) => {
    return Math.round((player.speed + player.power + player.throwing + 
                     player.catching + player.kicking + player.agility) / 6);
  };

  const getStaminaColor = (stamina: number) => {
    if (stamina >= 75) return "text-green-400";
    if (stamina >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthStatus = (injuryStatus: string) => {
    switch (injuryStatus) {
      case 'HEALTHY': return { icon: '💚', text: 'Ready', color: 'text-green-400' };
      case 'MINOR_INJURY': return { icon: '⚠️', text: 'Minor Injury', color: 'text-yellow-400' };
      case 'MODERATE_INJURY': return { icon: '🚨', text: 'Injured', color: 'text-red-400' };
      default: return { icon: '🚨', text: 'Injured', color: 'text-red-400' };
    }
  };

  const PlayerCard = ({ player }: { player: Player }) => {
    const health = getHealthStatus(player.injuryStatus);
    const power = getPlayerPower(player);
    
    return (
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 hover:border-blue-400 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-bold text-white text-lg">
              {player.firstName} {player.lastName}
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {player.role}
              </Badge>
              {player.race && (
                <Badge variant="secondary" className="text-xs">
                  {player.race}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{power}</div>
            <div className="text-xs text-gray-400">Power</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{health.icon}</span>
            <span className={`text-sm ${health.color}`}>{health.text}</span>
          </div>
          <div className={`text-sm ${getStaminaColor(player.dailyStaminaLevel)}`}>
            {player.dailyStaminaLevel}% Stamina
          </div>
        </div>
        
        <Button 
          onClick={() => onAssign(player, slot.id)}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={player.injuryStatus === 'SEVERE_INJURY'}
        >
          Assign to {slot.label}
        </Button>
      </div>
    );
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Select {slot.requiredRole || 'Player'}</h3>
          <p className="text-sm text-gray-400">
            Available Players ({eligiblePlayers.length})
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {eligiblePlayers.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-400">No eligible players available for this position</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {eligiblePlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="bg-gray-900 border-gray-700 h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-white">Select Player</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Select Player</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default function TapToAssignTactics({ teamId }: TapToAssignTacticsProps) {
  const [formationSlots, setFormationSlots] = useState<FormationSlot[]>([
    { id: "blocker1", label: "Blocker #1", position: "B1", player: null, requiredRole: "blocker" },
    { id: "blocker2", label: "Blocker #2", position: "B2", player: null, requiredRole: "blocker" },
    { id: "runner1", label: "Runner #1", position: "R1", player: null, requiredRole: "runner" },
    { id: "runner2", label: "Runner #2", position: "R2", player: null, requiredRole: "runner" },
    { id: "passer1", label: "Passer", position: "P", player: null, requiredRole: "passer" },
    { id: "wildcard", label: "FLEX (ANY)", position: "F", player: null, isWildcard: true },
  ]);

  const [substitutionQueue, setSubstitutionQueue] = useState<SubstitutionQueue>({
    blockers: [null, null, null],
    runners: [null, null, null],
    passers: [null, null, null],
    wildcard: [null, null, null],
  });

  const [selectedSlot, setSelectedSlot] = useState<FormationSlot | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch team players
  const { data: rawPlayers = [], isLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });

  const players = (rawPlayers as Player[]).filter(p => 
    !p.overallRating && // Exclude taxi squad if marked
    p.injuryStatus !== 'SEVERE_INJURY' && // Exclude severely injured
    p.dailyStaminaLevel > 0 // Exclude completely exhausted
  );

  // Get available players based on context
  const assignedPlayerIds = formationSlots
    .map(slot => slot.player?.id)
    .filter(Boolean);

  const getAvailablePlayersForSlot = (slot: FormationSlot | null) => {
    if (!slot) {
      // Default: exclude only starters
      return players.filter(p => !assignedPlayerIds.includes(p.id));
    }

    if (slot.isSubstitution && slot.substitutionPosition && slot.substitutionIndex !== undefined) {
      // For substitution slots: exclude starters and the current slot's assigned player
      const currentSlotPlayer = substitutionQueue[slot.substitutionPosition][slot.substitutionIndex];
      const currentSlotPlayerId = currentSlotPlayer?.id;
      
      // For flex subs: allow any non-starter (even if in other substitution positions)
      if (slot.substitutionPosition === 'wildcard') {
        return players.filter(p => 
          !assignedPlayerIds.includes(p.id) && 
          p.id !== currentSlotPlayerId
        );
      }
      
      // For position-specific subs: exclude starters and current slot player
      return players.filter(p => 
        !assignedPlayerIds.includes(p.id) && 
        p.id !== currentSlotPlayerId &&
        (slot.requiredRole ? p.role?.toLowerCase() === slot.requiredRole.toLowerCase() : true)
      );
    }

    // For starter slots: exclude assigned starters and require role match
    return players.filter(p => 
      !assignedPlayerIds.includes(p.id) &&
      (slot.requiredRole ? p.role?.toLowerCase() === slot.requiredRole.toLowerCase() : true)
    );
  };

  const availablePlayers = getAvailablePlayersForSlot(selectedSlot);

  // Fetch current formation
  const { data: currentFormation } = useQuery({
    queryKey: [`/api/teams/${teamId}/formation`],
    enabled: !!teamId,
  });

  // Load saved formation data into state
  useEffect(() => {
    if (currentFormation && players.length > 0) {
      console.log('🔍 Loading saved formation:', currentFormation);
      
      // Load starters
      if ((currentFormation as any)?.starters && Array.isArray((currentFormation as any).starters)) {
        setFormationSlots(prev => prev.map(slot => {
          // Find a matching player for this slot
          for (const savedPlayer of (currentFormation as any).starters) {
            if (savedPlayer && savedPlayer.id) {
              const fullPlayer = players.find(player => player.id === savedPlayer.id);
              if (fullPlayer) {
                // Check if this player matches the slot requirements
                if ((slot.requiredRole && fullPlayer.role?.toLowerCase() === slot.requiredRole.toLowerCase()) || slot.isWildcard) {
                  // Make sure this player isn't already assigned to another slot
                  const alreadyAssigned = prev.some(s => s.id !== slot.id && s.player?.id === fullPlayer.id);
                  if (!alreadyAssigned) {
                    return { ...slot, player: fullPlayer };
                  }
                }
              }
            }
          }
          return slot;
        }));
      }

      // Load substitutes
      if ((currentFormation as any)?.substitutes && Array.isArray((currentFormation as any).substitutes)) {
        const newSubQueue = {
          blockers: [null, null, null] as (Player | null)[],
          runners: [null, null, null] as (Player | null)[],
          passers: [null, null, null] as (Player | null)[],
          wildcard: [null, null, null] as (Player | null)[]
        };

        // Distribute substitutes by role
        (currentFormation as any).substitutes.forEach((savedSub: any, index: number) => {
          if (savedSub && savedSub.id) {
            const fullPlayer = players.find(player => player.id === savedSub.id);
            if (fullPlayer) {
              // Place in appropriate position based on role (case-insensitive)
              if (fullPlayer.role?.toLowerCase() === 'blocker' && newSubQueue.blockers.indexOf(null) !== -1) {
                const slotIndex = newSubQueue.blockers.indexOf(null);
                newSubQueue.blockers[slotIndex] = fullPlayer;
              } else if (fullPlayer.role?.toLowerCase() === 'runner' && newSubQueue.runners.indexOf(null) !== -1) {
                const slotIndex = newSubQueue.runners.indexOf(null);
                newSubQueue.runners[slotIndex] = fullPlayer;
              } else if (fullPlayer.role?.toLowerCase() === 'passer' && newSubQueue.passers.indexOf(null) !== -1) {
                const slotIndex = newSubQueue.passers.indexOf(null);
                newSubQueue.passers[slotIndex] = fullPlayer;
              } else if (newSubQueue.wildcard.indexOf(null) !== -1) {
                const slotIndex = newSubQueue.wildcard.indexOf(null);
                newSubQueue.wildcard[slotIndex] = fullPlayer;
              }
            }
          }
        });

        setSubstitutionQueue(newSubQueue);
      }
    }
  }, [currentFormation, players]);

  // Save formation mutation
  const saveFormationMutation = useMutation({
    mutationFn: async () => {
      const starters = formationSlots
        .filter(slot => slot.player)
        .map(slot => slot.player!);

      const substitutes = [
        ...substitutionQueue.blockers.filter(Boolean),
        ...substitutionQueue.runners.filter(Boolean),
        ...substitutionQueue.passers.filter(Boolean),
        ...substitutionQueue.wildcard.filter(Boolean),
      ];

      return await fetch(`/api/teams/${teamId}/formation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starters, substitutes }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Formation Saved",
        description: "Your tactical setup has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/formation`] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save formation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSlotTap = (slot: FormationSlot) => {
    if (slot.player) {
      // Show context menu for assigned player
      // For now, just remove the player
      handleRemovePlayer(slot.id);
    } else {
      // Open player selector
      setSelectedSlot(slot);
      setShowPlayerSelector(true);
    }
  };

  const handleSubstitutionSlotTap = (position: 'blockers' | 'runners' | 'passers' | 'wildcard', index: number) => {
    const currentPlayer = substitutionQueue[position][index];
    
    if (currentPlayer) {
      // Remove player from substitution slot
      handleRemoveFromSubstitution(position, index);
    } else {
      // Open player selector for substitution
      const mockSlot: FormationSlot = {
        id: `${position}-sub-${index}`,
        label: `${position.slice(0, -1)} Sub #${index + 1}`,
        position: `${position[0].toUpperCase()}S${index + 1}`,
        player: null,
        requiredRole: position === 'wildcard' ? undefined : position.slice(0, -1), // Remove 's' from end
        isWildcard: position === 'wildcard',
        isSubstitution: true,
        substitutionPosition: position,
        substitutionIndex: index
      };
      setSelectedSlot(mockSlot);
      setShowPlayerSelector(true);
    }
  };

  const handleAssignPlayer = (player: Player, slotId: string) => {
    if (selectedSlot?.isSubstitution && selectedSlot.substitutionPosition && selectedSlot.substitutionIndex !== undefined) {
      // Handle substitution assignment
      handleAssignToSubstitution(selectedSlot.substitutionPosition, selectedSlot.substitutionIndex, player);
    } else {
      // Handle starter assignment
      setFormationSlots(prev => 
        prev.map(slot => 
          slot.id === slotId 
            ? { ...slot, player }
            : slot
        )
      );
    }
    setShowPlayerSelector(false);
    setSelectedSlot(null);
  };

  const handleAssignToSubstitution = (position: 'blockers' | 'runners' | 'passers' | 'wildcard', index: number, player: Player) => {
    setSubstitutionQueue(prev => ({
      ...prev,
      [position]: prev[position].map((currentPlayer, i) => 
        i === index ? player : currentPlayer
      )
    }));
  };

  const handleRemoveFromSubstitution = (position: 'blockers' | 'runners' | 'passers' | 'wildcard', index: number) => {
    setSubstitutionQueue(prev => ({
      ...prev,
      [position]: prev[position].map((currentPlayer, i) => 
        i === index ? null : currentPlayer
      )
    }));
  };

  const handleRemovePlayer = (slotId: string) => {
    setFormationSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, player: null }
          : slot
      )
    );
  };

  const handleAutoFill = () => {
    const newSlots = [...formationSlots];
    
    // Auto-assign best available players to empty slots
    newSlots.forEach((slot, index) => {
      if (!slot.player) {
        const eligiblePlayers = slot.isWildcard 
          ? availablePlayers
          : availablePlayers.filter(p => 
              p.role.toLowerCase() === slot.requiredRole?.toLowerCase()
            );
        
        if (eligiblePlayers.length > 0) {
          // Pick highest power player
          const bestPlayer = eligiblePlayers.reduce((best, current) => {
            const bestPower = (best.speed + best.power + best.throwing + best.catching + best.kicking + best.agility) / 6;
            const currentPower = (current.speed + current.power + current.throwing + current.catching + current.kicking + current.agility) / 6;
            return currentPower > bestPower ? current : best;
          });
          
          newSlots[index] = { ...slot, player: bestPlayer };
        }
      }
    });
    
    setFormationSlots(newSlots);
    
    toast({
      title: "Auto-Fill Complete",
      description: "Best available players assigned to empty positions",
    });
  };

  const FormationSlotCard = ({ slot }: { slot: FormationSlot }) => {
    const isEmpty = !slot.player;
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 min-h-[120px] ${
          isEmpty 
            ? 'bg-gray-800/50 border-2 border-dashed border-gray-600 hover:border-blue-400' 
            : 'bg-gradient-to-br from-blue-800/80 to-blue-900/80 border-2 border-blue-500 hover:border-blue-400'
        }`}
        onClick={() => handleSlotTap(slot)}
      >
        <CardContent className="p-4 text-center">
          <div className="mb-2">
            <Badge 
              variant={isEmpty ? "outline" : "default"}
              className={`text-xs ${
                slot.requiredRole === 'blocker' ? 'bg-purple-600' :
                slot.requiredRole === 'runner' ? 'bg-green-600' :
                slot.requiredRole === 'passer' ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
            >
              {slot.position} {slot.label}
            </Badge>
          </div>
          
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-16">
              <Plus className="w-8 h-8 text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">Tap to assign</span>
              <span className="text-xs text-gray-500">
                {slot.isWildcard ? 'Any position' : slot.requiredRole}
              </span>
            </div>
          ) : (
            <div>
              <div className="font-bold text-white text-sm mb-1">
                {slot.player.firstName} {slot.player.lastName}
              </div>
              <div className="text-lg font-bold text-blue-400 mb-1">
                {Math.round((slot.player.speed + slot.player.power + slot.player.throwing + 
                           slot.player.catching + slot.player.kicking + slot.player.agility) / 6)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs">
                {slot.player.injuryStatus === 'HEALTHY' ? (
                  <span className="text-green-400">✓ Ready</span>
                ) : (
                  <span className="text-yellow-400">⚠ {slot.player.injuryStatus}</span>
                )}
                <span className={`${
                  slot.player.dailyStaminaLevel >= 75 ? 'text-green-400' :
                  slot.player.dailyStaminaLevel >= 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {slot.player.dailyStaminaLevel}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-bold">Loading Tactics...</div>
        </div>
      </div>
    );
  }

  const assignedCount = formationSlots.filter(slot => slot.player).length;
  const requiredCount = 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 border-4 border-blue-500 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <Target className="w-8 h-8 mr-3 text-yellow-400" />
                <div>
                  <h1 className="text-2xl font-bold">Tactics & Lineup</h1>
                  <p className="text-blue-200 text-sm">Tap positions to assign players</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{assignedCount}/{requiredCount}</div>
                <div className="text-sm text-blue-200">Starting Lineup</div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Formation Grid */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <Users className="w-6 h-6 mr-2 text-green-400" />
                Starting Formation
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAutoFill}
                  disabled={assignedCount === requiredCount}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Auto-Fill
                </Button>
                <Button 
                  onClick={() => saveFormationMutation.mutate()}
                  disabled={assignedCount < requiredCount || saveFormationMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Formation
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${
              isMobileView ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'
            }`}>
              {formationSlots.map((slot) => (
                <FormationSlotCard key={slot.id} slot={slot} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Substitution Queues */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <RotateCcw className="w-6 h-6 mr-2 text-orange-400" />
              Substitution Queues (3 each position)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Blocker Substitutes */}
              <div className="bg-purple-900/30 p-4 rounded-lg">
                <h4 className="font-bold text-purple-200 mb-3 text-center">🛡️ Blocker Subs</h4>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={`blocker-sub-${index}`} 
                      className="h-12 bg-purple-800/20 rounded border border-dashed border-purple-400 flex items-center justify-center text-purple-300 text-xs cursor-pointer hover:border-purple-300"
                      onClick={() => handleSubstitutionSlotTap('blockers', index)}
                    >
                      {substitutionQueue.blockers[index] ? (
                        <div className="text-center">
                          <div className="text-white text-xs font-medium">
                            {substitutionQueue.blockers[index].firstName} {substitutionQueue.blockers[index].lastName}
                          </div>
                          <div className="text-purple-300 text-xs">
                            PWR: {Math.round((substitutionQueue.blockers[index].speed + substitutionQueue.blockers[index].power + 
                                            substitutionQueue.blockers[index].throwing + substitutionQueue.blockers[index].catching + 
                                            substitutionQueue.blockers[index].kicking + substitutionQueue.blockers[index].agility) / 6)}
                          </div>
                        </div>
                      ) : (
                        <>Sub #{index + 1}</>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Runner Substitutes */}
              <div className="bg-green-900/30 p-4 rounded-lg">
                <h4 className="font-bold text-green-200 mb-3 text-center">⚡ Runner Subs</h4>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={`runner-sub-${index}`} 
                      className="h-12 bg-green-800/20 rounded border border-dashed border-green-400 flex items-center justify-center text-green-300 text-xs cursor-pointer hover:border-green-300"
                      onClick={() => handleSubstitutionSlotTap('runners', index)}
                    >
                      {substitutionQueue.runners[index] ? (
                        <div className="text-center">
                          <div className="text-white text-xs font-medium">
                            {substitutionQueue.runners[index].firstName} {substitutionQueue.runners[index].lastName}
                          </div>
                          <div className="text-green-300 text-xs">
                            PWR: {Math.round((substitutionQueue.runners[index].speed + substitutionQueue.runners[index].power + 
                                            substitutionQueue.runners[index].throwing + substitutionQueue.runners[index].catching + 
                                            substitutionQueue.runners[index].kicking + substitutionQueue.runners[index].agility) / 6)}
                          </div>
                        </div>
                      ) : (
                        <>Sub #{index + 1}</>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Passer Substitutes */}
              <div className="bg-blue-900/30 p-4 rounded-lg">
                <h4 className="font-bold text-blue-200 mb-3 text-center">🎯 Passer Subs</h4>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={`passer-sub-${index}`} 
                      className="h-12 bg-blue-800/20 rounded border border-dashed border-blue-400 flex items-center justify-center text-blue-300 text-xs cursor-pointer hover:border-blue-300"
                      onClick={() => handleSubstitutionSlotTap('passers', index)}
                    >
                      {substitutionQueue.passers[index] ? (
                        <div className="text-center">
                          <div className="text-white text-xs font-medium">
                            {substitutionQueue.passers[index].firstName} {substitutionQueue.passers[index].lastName}
                          </div>
                          <div className="text-blue-300 text-xs">
                            PWR: {Math.round((substitutionQueue.passers[index].speed + substitutionQueue.passers[index].power + 
                                            substitutionQueue.passers[index].throwing + substitutionQueue.passers[index].catching + 
                                            substitutionQueue.passers[index].kicking + substitutionQueue.passers[index].agility) / 6)}
                          </div>
                        </div>
                      ) : (
                        <>Sub #{index + 1}</>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wildcard/Flex Substitutes */}
              <div className="bg-yellow-900/30 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-200 mb-3 text-center">🌟 Flex Subs</h4>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={`wildcard-sub-${index}`} 
                      className="h-12 bg-yellow-800/20 rounded border border-dashed border-yellow-400 flex items-center justify-center text-yellow-300 text-xs cursor-pointer hover:border-yellow-300"
                      onClick={() => handleSubstitutionSlotTap('wildcard', index)}
                    >
                      {substitutionQueue.wildcard[index] ? (
                        <div className="text-center">
                          <div className="text-white text-xs font-medium">
                            {substitutionQueue.wildcard[index].firstName} {substitutionQueue.wildcard[index].lastName}
                          </div>
                          <div className="text-yellow-300 text-xs">
                            PWR: {Math.round((substitutionQueue.wildcard[index].speed + substitutionQueue.wildcard[index].power + 
                                            substitutionQueue.wildcard[index].throwing + substitutionQueue.wildcard[index].catching + 
                                            substitutionQueue.wildcard[index].kicking + substitutionQueue.wildcard[index].agility) / 6)}
                          </div>
                        </div>
                      ) : (
                        <>Sub #{index + 1}</>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Players Quick View */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Activity className="w-6 h-6 mr-2 text-blue-400" />
              Available Players ({availablePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {availablePlayers.slice(0, 12).map((player) => (
                <div key={player.id} className="text-center p-2 bg-gray-700/50 rounded border">
                  <div className="text-sm font-medium text-white">
                    {player.firstName} {player.lastName}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {player.role}
                  </Badge>
                  <div className="text-xs text-blue-400 mt-1">
                    PWR: {Math.round((player.speed + player.power + player.throwing + 
                                    player.catching + player.kicking + player.agility) / 6)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Player Selector Modal/Sheet */}
        {selectedSlot && (
          <PlayerSelector
            isOpen={showPlayerSelector}
            onClose={() => {
              setShowPlayerSelector(false);
              setSelectedSlot(null);
            }}
            slot={selectedSlot}
            availablePlayers={availablePlayers}
            onAssign={handleAssignPlayer}
            isMobile={isMobileView}
          />
        )}
      </div>
    </div>
  );
}