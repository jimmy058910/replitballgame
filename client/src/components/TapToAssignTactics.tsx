import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Progress } from "./ui/progress";
import { apiRequest } from "@/lib/queryClient";
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
  ChevronDown,
  RotateCcw,
  Save,
  Activity,
  Crown,
  Settings,
  Maximize2,
  Minimize2,
  Move
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

// Tactical Settings Content Component
function TacticalSettingsContent({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tactical data from backend
  const { data: tacticalData, isLoading: tacticalLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}/tactical-setup`],
    enabled: !!teamId
  });

  // Fetch current season data to check timing restrictions
  const { data: seasonData } = useQuery({
    queryKey: ['/api/seasonal-flow/current-cycle']
  });

  // Mutations for updating tactical settings
  const updateFieldSizeMutation = useMutation({
    mutationFn: async (fieldSize: string) => {
      return await apiRequest(`/api/teams/${teamId}/field-size`, "POST", { fieldSize });
    },
    onSuccess: () => {
      toast({
        title: "Field Size Updated",
        description: "Your field size has been changed successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/tactical-setup`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Could not update field size",
        variant: "destructive"
      });
    }
  });

  const updateTacticalFocusMutation = useMutation({
    mutationFn: async (tacticalFocus: string) => {
      return await apiRequest(`/api/teams/${teamId}/tactical-focus`, "POST", { tacticalFocus });
    },
    onSuccess: () => {
      toast({
        title: "Tactical Focus Updated",
        description: "Your tactical focus has been changed successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/tactical-setup`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update tactical focus", 
        variant: "destructive"
      });
    }
  });

  // Check if field size can be changed (Day 15 11PM EDT to Day 1 3PM EDT)
  const canChangeFieldSize = () => {
    if (!seasonData) return false;
    
    // @ts-expect-error TS2339
    const currentDay = seasonData.currentDay;
    const currentHour = new Date().getHours();
    
    // Day 15 at 11PM EDT (23:00) onwards, or Day 16-17 (offseason), or Day 1 until 3PM EDT (15:00)
    return (
      (currentDay === 15 && currentHour >= 23) ||
      currentDay === 16 || 
      currentDay === 17 ||
      (currentDay === 1 && currentHour <= 15)
    );
  };

  const fieldSizeOptions = [
    { value: 'STANDARD', label: 'Standard', description: 'Balanced gameplay' },
    { value: 'LARGE', label: 'Large', description: 'Favors speed and passing' }, 
    { value: 'COMPACT', label: 'Compact', description: 'Favors power and blocking' }
  ];

  const tacticalFocusOptions = [
    { value: 'BALANCED', label: 'Balanced', description: 'Even distribution' },
    { value: 'ALL_OUT_ATTACK', label: 'All-Out Attack', description: 'Favor scoring at all costs' },
    { value: 'DEFENSIVE_WALL', label: 'Defensive Wall', description: 'Inflict pain and stop opponents' }
  ];

  if (tacticalLoading) {
    return <div className="text-white text-center">Loading tactical settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tactical Focus and Field Size Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tactical Focus Selection - NOW ON LEFT */}
        <div>
          <h4 className="flex items-center text-white font-medium mb-4">
            <Target className="w-5 h-5 mr-2 text-purple-400" />
            Tactical Focus
          </h4>
          <div className="space-y-2">
            {tacticalFocusOptions.map((option) => (
              <div 
                key={option.value}
                onClick={() => updateTacticalFocusMutation.mutate(option.value)}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  // @ts-expect-error TS2339
                  (tacticalData?.tacticalFocus || 'BALANCED') === option.value 
                    ? 'border-purple-500 bg-purple-900/30' 
                    : 'border-gray-600 bg-gray-700/30 hover:bg-gray-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{option.label}</div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    // @ts-expect-error TS2339
                    (tacticalData?.tacticalFocus || 'BALANCED') === option.value 
                      ? 'border-purple-400 bg-purple-400' 
                      : 'border-gray-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Size Selection - NOW ON RIGHT */}
        <div>
          <h4 className="flex items-center text-white font-medium mb-4">
            <Settings className="w-5 h-5 mr-2 text-blue-400" />
            Field Size
          </h4>
          {!canChangeFieldSize() && (
            <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-200 text-xs">
              Field size can only be changed from Day 15 (11PM EDT) to Day 1 (3PM EDT)
            </div>
          )}
          <div className="space-y-2">
            {fieldSizeOptions.map((option) => (
              <div 
                key={option.value}
                onClick={() => canChangeFieldSize() && updateFieldSizeMutation.mutate(option.value)}
                className={`p-3 rounded-lg border transition-colors ${
                  // @ts-expect-error TS2339
                  (tacticalData?.fieldSize || 'STANDARD') === option.value 
                    ? 'border-blue-500 bg-blue-900/30' 
                    : 'border-gray-600 bg-gray-700/30'
                } ${
                  canChangeFieldSize() 
                    ? 'hover:bg-gray-600/50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{option.label}</div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    // @ts-expect-error TS2339
                    (tacticalData?.fieldSize || 'STANDARD') === option.value 
                      ? 'border-blue-400 bg-blue-400' 
                      : 'border-gray-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coach Effectiveness and Team Chemistry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Coach Bonus</span>
            {/*
             // @ts-expect-error TS2339 */}
            <span className="text-white font-bold">+{tacticalData?.coachBonus || 0}%</span>
          </div>
          {/*
           // @ts-expect-error TS2339 */}
          <Progress value={tacticalData?.coachEffectiveness || 0} className="h-2 bg-gray-700" />
          <p className="text-xs text-gray-400">
            Your head coach provides tactical bonuses during matches
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Team Chemistry</span>
            {/*
             // @ts-expect-error TS2339 */}
            <span className="text-white font-bold">{tacticalData?.teamCamaraderie || 0}%</span>
          </div>
          {/*
           // @ts-expect-error TS2339 */}
          <Progress value={tacticalData?.teamCamaraderie || 0} className="h-2 bg-gray-700" />
          <p className="text-xs text-gray-400">
            Higher chemistry improves coordination and performance
          </p>
        </div>
      </div>

      {/* Tactical Effectiveness */}
      <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <h4 className="font-medium text-blue-200 mb-2">Tactical Effectiveness</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Field Size Bonus:</span>
            {/*
             // @ts-expect-error TS2339 */}
            <span className="text-white ml-2">+{tacticalData?.fieldSizeBonus || 0}%</span>
          </div>
          <div>
            <span className="text-gray-400">Focus Bonus:</span>
            {/*
             // @ts-expect-error TS2339 */}
            <span className="text-white ml-2">+{tacticalData?.tacticalFocusBonus || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [formationLoaded, setFormationLoaded] = useState(false);

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

  // Fetch team players (main roster only)
  const { data: rawPlayers = [], isLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });

  // Fetch taxi squad players to exclude them
  const { data: taxiSquadPlayers = [] } = useQuery({
    queryKey: [`/api/teams/${teamId}/taxi-squad`],
    enabled: !!teamId,
  });

  const taxiSquadIds = (taxiSquadPlayers as Player[]).map(p => p.id);

  const players = (rawPlayers as Player[]).filter(p => {
    return !taxiSquadIds.includes(p.id) && // Exclude taxi squad players
           p.injuryStatus !== 'SEVERE_INJURY' && // Exclude severely injured
           p.dailyStaminaLevel > 0; // Exclude completely exhausted
  });

  // Get ALL assigned players - starters AND substitutes to prevent duplicates
  const getAllAssignedPlayerIds = () => {
    const starterIds = formationSlots
      .map(slot => slot.player?.id)
      .filter(Boolean);
    
    const substituteIds = [
      ...substitutionQueue.blockers,
      ...substitutionQueue.runners, 
      ...substitutionQueue.passers,
      ...substitutionQueue.wildcard
    ]
      .map(player => player?.id)
      .filter(Boolean);
    
    return [...starterIds, ...substituteIds];
  };

  const getAvailablePlayersForSlot = (slot: FormationSlot | null) => {
    const allAssignedIds = getAllAssignedPlayerIds();
    const starterIds = formationSlots.map(slot => slot.player?.id).filter(Boolean);
    
    if (!slot) {
      // Default: exclude ALL assigned players (starters + substitutes)
      return players.filter(p => !allAssignedIds.includes(p.id));
    }

    if (slot.isSubstitution && slot.substitutionPosition && slot.substitutionIndex !== undefined) {
      const currentSlotPlayer = substitutionQueue[slot.substitutionPosition][slot.substitutionIndex];
      const currentSlotPlayerId = currentSlotPlayer?.id;
      
      // For flex subs: allow ANYONE except starters, but prevent duplicates within flex subs
      if (slot.substitutionPosition === 'wildcard') {
        const otherFlexSlotIds = substitutionQueue.wildcard
          .map((player, index) => index !== slot.substitutionIndex ? player?.id : null)
          .filter(Boolean);
        
        return players.filter(p => {
          const isStarter = starterIds.includes(p.id);
          const isInOtherFlexSlot = otherFlexSlotIds.includes(p.id);
          const isCurrentSlotPlayer = p.id === currentSlotPlayerId;
          
          // Allow current player to stay, exclude starters and other flex assignments
          return !isStarter && !isInOtherFlexSlot || isCurrentSlotPlayer;
        });
      }
      
      // For position-specific subs: exclude all assignments except current slot + role check
      return players.filter(p => {
        const isAssignedElsewhere = allAssignedIds.includes(p.id) && p.id !== currentSlotPlayerId;
        const roleMatches = slot.requiredRole ? p.role?.toLowerCase() === slot.requiredRole.toLowerCase() : true;
        return !isAssignedElsewhere && roleMatches;
      });
    }

    // For starter slots: STRICT duplicate prevention - exclude all assigned players INCLUDING current slot
    const currentSlotPlayerId = slot.player?.id;
    return players.filter(p => {
      const isAssignedToOtherSlot = allAssignedIds.includes(p.id) && p.id !== currentSlotPlayerId;
      const roleMatches = slot.requiredRole ? p.role?.toLowerCase() === slot.requiredRole.toLowerCase() : true;
      return !isAssignedToOtherSlot && roleMatches;
    });
  };

  const availablePlayers = getAvailablePlayersForSlot(selectedSlot);

  // Fetch current formation
  const { data: currentFormation } = useQuery({
    queryKey: [`/api/teams/${teamId}/formation`],
    enabled: !!teamId,
  });

  // Reset formation loading flag when team changes
  useEffect(() => {
    setFormationLoaded(false);
  }, [teamId]);

  // Load saved formation data into state - ONLY ONCE to prevent infinite loops
  useEffect(() => {
    if (currentFormation && players.length > 0 && !formationLoaded) {
      console.log('🔍 FRONTEND Load Debug - Full formation data:', {
        currentFormation,
        hasFlexSubs: !!(currentFormation as any)?.flexSubs,
        flexSubsLength: (currentFormation as any)?.flexSubs?.length || 0,
        flexSubsData: (currentFormation as any)?.flexSubs,
        substitutesLength: (currentFormation as any)?.substitutes?.length || 0
      });
      
      // Track assigned players to prevent duplicates during loading
      const assignedPlayerIds = new Set<string>();
      
      // Load starters with strict duplicate prevention
      if ((currentFormation as any)?.starters && Array.isArray((currentFormation as any).starters)) {
        setFormationSlots(prev => {
          const newSlots = [...prev];
          
          // Clear existing assignments first
          newSlots.forEach(slot => slot.player = null);
          
          // Assign players to appropriate slots, preventing duplicates
          for (const savedPlayer of (currentFormation as any).starters) {
            if (savedPlayer && savedPlayer.id && !assignedPlayerIds.has(savedPlayer.id)) {
              const fullPlayer = players.find(player => player.id === savedPlayer.id);
              if (fullPlayer) {
                // Find the best matching empty slot for this player
                const matchingSlot = newSlots.find(slot => 
                  !slot.player && // Slot is empty
                  ((slot.requiredRole && fullPlayer.role?.toLowerCase() === slot.requiredRole.toLowerCase()) || slot.isWildcard)
                );
                
                if (matchingSlot) {
                  matchingSlot.player = fullPlayer;
                  assignedPlayerIds.add(fullPlayer.id);
                }
              }
            }
          }
          
          return newSlots;
        });
      }

      // Load substitutes with duplicate prevention
      if ((currentFormation as any)?.substitutes && Array.isArray((currentFormation as any).substitutes)) {
        const newSubQueue = {
          blockers: [null, null, null] as (Player | null)[],
          runners: [null, null, null] as (Player | null)[],
          passers: [null, null, null] as (Player | null)[],
          wildcard: [null, null, null] as (Player | null)[]
        };

        // Load substitutes by role with strict duplicate prevention within each category
        const positionAssignments = new Map<string, Set<string>>(); // Track assignments per position type
        
        (currentFormation as any).substitutes.forEach((savedSub: any) => {
          if (savedSub && savedSub.id) {
            const fullPlayer = players.find(player => player.id === savedSub.id);
            if (fullPlayer) {
              const role = fullPlayer.role?.toLowerCase();
              
              // Assign to position-specific subs first (with duplicate prevention within same position)
              if (role === 'blocker') {
                if (!positionAssignments.has('blockers')) positionAssignments.set('blockers', new Set());
                const blockersAssigned = positionAssignments.get('blockers')!;
                
                if (!blockersAssigned.has(fullPlayer.id)) {
                  const slotIndex = newSubQueue.blockers.indexOf(null);
                  if (slotIndex !== -1) {
                    newSubQueue.blockers[slotIndex] = fullPlayer;
                    blockersAssigned.add(fullPlayer.id);
                  }
                }
              } else if (role === 'runner') {
                if (!positionAssignments.has('runners')) positionAssignments.set('runners', new Set());
                const runnersAssigned = positionAssignments.get('runners')!;
                
                if (!runnersAssigned.has(fullPlayer.id)) {
                  const slotIndex = newSubQueue.runners.indexOf(null);
                  if (slotIndex !== -1) {
                    newSubQueue.runners[slotIndex] = fullPlayer;
                    runnersAssigned.add(fullPlayer.id);
                  }
                }
              } else if (role === 'passer') {
                if (!positionAssignments.has('passers')) positionAssignments.set('passers', new Set());
                const passersAssigned = positionAssignments.get('passers')!;
                
                if (!passersAssigned.has(fullPlayer.id)) {
                  const slotIndex = newSubQueue.passers.indexOf(null);
                  if (slotIndex !== -1) {
                    newSubQueue.passers[slotIndex] = fullPlayer;
                    passersAssigned.add(fullPlayer.id);
                  }
                }
              }
            }
          }
        });

        // Second pass: Load flex subs from saved formation data
        if ((currentFormation as any)?.flexSubs && Array.isArray((currentFormation as any).flexSubs)) {
          console.log('✅ FRONTEND Load - Found explicit flexSubs field:', {
            flexSubsData: (currentFormation as any).flexSubs,
            count: (currentFormation as any).flexSubs.length
          });
          
          // Load explicit flex sub assignments
          (currentFormation as any).flexSubs.forEach((savedFlexSub: any, index: number) => {
            if (savedFlexSub && savedFlexSub.id && index < 3) {
              const fullPlayer = players.find(player => player.id === savedFlexSub.id);
              const isStarter = assignedPlayerIds.has(fullPlayer?.id || '');
              
              console.log(`🔍 FRONTEND Load - Processing flex sub ${index}:`, {
                savedFlexSub,
                fullPlayerFound: !!fullPlayer,
                fullPlayerName: fullPlayer ? `${fullPlayer.firstName} ${fullPlayer.lastName}` : 'N/A',
                isStarter,
                assignedPlayerIds: Array.from(assignedPlayerIds)
              });
              
              if (fullPlayer && !isStarter) { // Not a starter
                newSubQueue.wildcard[index] = fullPlayer;
                console.log(`✅ FRONTEND Load - Successfully loaded flex sub ${index}: ${fullPlayer.firstName} ${fullPlayer.lastName}`);
              } else {
                console.log(`❌ FRONTEND Load - Failed to load flex sub ${index}:`, {
                  reason: !fullPlayer ? 'Player not found' : 'Player is a starter'
                });
              }
            } else {
              console.log(`⚠️ FRONTEND Load - Skipping invalid flex sub ${index}:`, { savedFlexSub, index });
            }
          });
        } else {
          console.log('❌ FRONTEND Load - No explicit flexSubs field found, using fallback');
          // Fallback: Try to extract flex subs from substitutes array (if no explicit flexSubs field)
          const allPositionSpecificSubs = [
            ...newSubQueue.blockers.filter(Boolean),
            ...newSubQueue.runners.filter(Boolean),
            ...newSubQueue.passers.filter(Boolean)
          ];
          
          // Find remaining substitutes not in position-specific subs - these might be flex subs
          const remainingSubstitutes = (currentFormation as any).substitutes.filter((savedSub: any) => {
            if (!savedSub || !savedSub.id || assignedPlayerIds.has(savedSub.id)) return false;
            const fullPlayer = players.find(player => player.id === savedSub.id);
            if (!fullPlayer) return false;
            
            // Check if this player is NOT in position-specific subs
            const isInPositionSubs = allPositionSpecificSubs.some(p => p && p.id === fullPlayer.id);
            return !isInPositionSubs;
          });
          
          // Assign remaining substitutes to flex subs
          remainingSubstitutes.slice(0, 3).forEach((savedSub: any, index: number) => {
            const fullPlayer = players.find(player => player.id === savedSub.id);
            if (fullPlayer) {
              newSubQueue.wildcard[index] = fullPlayer;
            }
          });
        }

        setSubstitutionQueue(newSubQueue);
      }
      
      // Mark formation as loaded to prevent infinite loops
      setFormationLoaded(true);
    }
  }, [currentFormation, players, formationLoaded]);

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
      ];

      // Save flex subs separately to preserve assignments
      const flexSubs = substitutionQueue.wildcard.filter(Boolean);

      console.log('🔍 FRONTEND Save Debug:', {
        starters: starters.length,
        substitutes: substitutes.length,
        flexSubs: flexSubs.length,
        flexSubNames: flexSubs.map(p => p ? p.firstName + ' ' + p.lastName : 'Unknown')
      });

      return await fetch(`/api/teams/${teamId}/formation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          starters, 
          substitutes, 
          flexSubs
        }),
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
    const allAssignedIds = getAllAssignedPlayerIds();
    const starterIds = formationSlots.map(slot => slot.player?.id).filter(Boolean);
    const currentSlotPlayer = selectedSlot?.player?.id;
    
    // Smart duplicate validation based on assignment type
    if (player.id !== currentSlotPlayer && allAssignedIds.includes(player.id)) {
      
      if (selectedSlot?.isSubstitution && selectedSlot.substitutionPosition === 'wildcard') {
        // For flex subs: Only block if assigned to starters or other flex slots
        const isAssignedToStarter = starterIds.includes(player.id);
        const otherFlexSlotIds = substitutionQueue.wildcard
          .map((p, index) => index !== selectedSlot.substitutionIndex ? p?.id : null)
          .filter(Boolean);
        const isInOtherFlexSlot = otherFlexSlotIds.includes(player.id);
        
        if (isAssignedToStarter || isInOtherFlexSlot) {
          console.warn('Player assigned to starter or other flex slot, assignment blocked');
          toast({
            title: "Assignment Blocked", 
            description: `${player.firstName} ${player.lastName} is already assigned to a starting position or another flex sub slot`,
            variant: "destructive",
          });
          return;
        }
        // Allow assignment to flex if only in position-specific subs
      } else {
        // For starters and position-specific subs: Block all duplicates
        console.warn('Player already assigned elsewhere, assignment blocked');
        toast({
          title: "Assignment Blocked",
          description: `${player.firstName} ${player.lastName} is already assigned to another position`,
          variant: "destructive",
        });
        return;
      }
    }

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
          ) : slot.player ? (
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
          ) : null}
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
              {availablePlayers.map((player) => (
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



        {/* Match-Day Tactics Accordion */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-700/30 transition-colors">
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-green-400" />
                    Match-Day Tactics
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <TacticalSettingsContent teamId={teamId} />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
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