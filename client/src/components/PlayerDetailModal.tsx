import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Heart, Battery, Users, Crown, DollarSign, Trash2, AlertTriangle, 
  Wrench, ChevronDown, Pin, Copy, Star, Plus, ArrowRight,
  Activity, Target, Brain, Zap, Shield, Shirt
} from "lucide-react";
import AbilitiesDisplay from "@/components/AbilitiesDisplay";
import ContractNegotiationRedesigned from "./ContractNegotiationRedesigned";
import { getPlayerRole, getRaceDisplayName, getRoleColor } from "@shared/playerUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Player, Team, Contract, League } from '@shared/types/models';

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlayerDetailModalProps {
  player: any | null;
  isOpen: boolean;
  onClose: () => void;
  onContractNegotiate?: (playerId: string) => void;
  onEquipmentChange?: (playerId: string, slot: string, itemId: string) => void;
  focusSection?: string;
}

// Helper function to get race emoji
const getRaceEmoji = (race: string): string => {
  const raceEmojis = {
    'human': '👤',
    'sylvan': '🌿',
    'gryll': '⚒️',
    'lumina': '✨',
    'umbra': '🌑'
  };
  return raceEmojis[race?.toLowerCase() as keyof typeof raceEmojis] || '👤';
};

// Enhanced 5-star rating system
const renderStarRating = (rating: number): JSX.Element => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  let fillColor = "text-gray-400";
  if (rating >= 4.5) fillColor = "text-yellow-400";
  else if (rating >= 3.5) fillColor = "text-purple-400";
  else if (rating >= 2.5) fillColor = "text-blue-400";
  else if (rating >= 1.5) fillColor = "text-green-400";
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className={`w-4 h-4 fill-current ${fillColor}`} />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Star key={i} className={`w-4 h-4 fill-current ${fillColor} opacity-50`} />);
    } else {
      stars.push(<Star key={i} className="w-4 h-4 text-gray-600" />);
    }
  }
  
  return <div className="flex items-center gap-1">{stars}</div>;
};

function PlayerDetailModal({ 
  player, 
  isOpen, 
  onClose, 
  onContractNegotiate,
  onEquipmentChange,
  focusSection 
}: PlayerDetailModalProps) {
  // Accordion sections state - only one open at a time
  const [expandedSection, setExpandedSection] = useState<string | null>(focusSection || null);
  const [showContractNegotiation, setShowContractNegotiation] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Toggle accordion sections
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Fetch player's current equipment
  const { data: playerEquipment = { equipment: [] }, isLoading: equipmentLoading } = useQuery({
    queryKey: [`/api/equipment/player/${player?.id}`],
    enabled: isOpen && !!player?.id,
  });

  // Fetch team inventory for equipment options  
  const { data: teamInventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: [`/api/inventory/${player?.teamId}`],
    enabled: isOpen && !!player?.teamId,
  });

  // Fetch release fee information
  const { data: releaseInfo = { canRelease: false, releaseFee: 0, reason: "" }, isLoading: releaseInfoLoading } = useQuery({
    queryKey: [`/api/teams/${player?.teamId}/players/${player?.id}/release-fee`],
    enabled: isOpen && !!player?.id && !!player?.teamId,
  });

  // Equipment mutation
  const equipItemMutation = useMutation({
    mutationFn: async ({ itemId, itemName }: { itemId: number; itemName: string }) => {
      if (!player) return Promise.reject(new Error("No player selected"));
      return apiRequest(`/api/equipment/equip`, "POST", {
        teamId: player.teamId,
        playerId: player.id,
        itemId,
        itemName
      });
    },
    onSuccess: () => {
      if (player) {
        queryClient.invalidateQueries({ queryKey: [`/api/equipment/player/${player.id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/inventory/${player.teamId}`] });
      }
      setSelectedEquipmentItem("");
      toast({
        title: "Equipment Updated",
        description: "Item equipped successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Equipment Error",
        description: error.message || "Failed to equip item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Release player mutation
  const releasePlayerMutation = useMutation({
    mutationFn: async () => {
      if (!player) return Promise.reject(new Error("No player selected"));
      return apiRequest(`/api/teams/${player.teamId}/players/${player.id}`, "DELETE");
    },
    onSuccess: () => {
      if (player) {
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${player.teamId}/players`] });
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${player.teamId}`] });
      }
      toast({
        title: "Player Released",
        description: "Player has been released from the team.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Release Error",
        description: error.message || "Failed to release player. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (!player) return null;

  // Calculate player power (6 main attributes only)
  const playerPower = Math.round(
    (player.speed + player.power + player.throwing + player.catching + player.kicking + player.agility) / 6
  );

  // Get health status
  const healthStatus = player.injuryStatus === 'HEALTHY' ? 'Healthy' : 'Injured';
  const healthIcon = player.injuryStatus === 'HEALTHY' ? '❤️' : '🚨';
  
  // Get stamina percentage
  const staminaPercentage = Math.round((player.dailyStaminaLevel || 100));
  
  // Get chemistry and leadership values
  const chemistry = player.camaraderieScore || 0;
  const leadership = player.leadership || 0;

  // Calculate potential rating for stars
  const potentialRating = player.potentialRating || 2.5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-gray-900 border-gray-700">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            {/* 1. Header Bar (Always Visible) */}
            <div className="flex items-center justify-between mb-4 bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getRaceEmoji(player.race)}</div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {player.firstName} {player.lastName}
                  </h2>
                  <div className="text-sm text-gray-400">
                    {getPlayerRole(player.role)} • {getRaceDisplayName(player.race)} • Age {player.age}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{playerPower}</div>
                  <div className="text-xs text-gray-400">Power</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300">
                    <Pin className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contract Summary Line */}
            <div className="text-center text-sm text-gray-400 mb-4">
              Contract: {(Number(player.contract?.salary) || 0).toLocaleString()}₡/season - {player.contract?.length || 1} yrs remaining
            </div>

            {/* 2. Core Stats Strip */}
            <div className="grid grid-cols-4 gap-4 mb-4 bg-gray-800/30 rounded-lg p-4">
              <div className="text-center">
                <div className="text-lg">{healthIcon}</div>
                <div className="text-sm font-medium text-white">{healthStatus}</div>
                <div className="text-xs text-gray-400">Health</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🔋</div>
                <div className="text-sm font-medium text-white">{staminaPercentage}%</div>
                <div className="text-xs text-gray-400">Stamina</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🤝</div>
                <div className="text-sm font-medium text-white">{chemistry}</div>
                <div className="text-xs text-gray-400">Chemistry</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🏅</div>
                <div className="text-sm font-medium text-white">{leadership}</div>
                <div className="text-xs text-gray-400">Leadership</div>
              </div>
            </div>

            {/* 3. Action Row (Sticky on Scroll) */}
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm p-2 -mx-2 mb-4">
              <div className="grid grid-cols-4 gap-2">
                <Button 
                  onClick={() => setShowContractNegotiation(true)}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  Negotiate
                </Button>
                <Button 
                  disabled={player.injuryStatus === 'HEALTHY'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  size="sm"
                >
                  Heal
                </Button>
                <Button 
                  onClick={() => toggleSection('equipment')}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  Equip
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive"
                              size="sm"
                              disabled={!releaseInfo?.canRelease}
                            >
                              Release
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Release Player</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to release {player.firstName} {player.lastName}? 
                        This will cost ₡{(releaseInfo?.releaseFee || 0).toLocaleString()} and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => releasePlayerMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Release Player
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TooltipTrigger>
                    {!releaseInfo?.canRelease && (
                      <TooltipContent>
                        <p>{releaseInfo?.reason || "Cannot release this player"}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* 4. Accordion Sections */}
            <div className="space-y-3">
              {/* A. Summary & Progress */}
              <Collapsible 
                open={expandedSection === 'summary'} 
                onOpenChange={() => toggleSection('summary')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Summary & Progress</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'summary' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Potential</span>
                            <span className="text-sm text-gray-300">{potentialRating.toFixed(1)}/5</span>
                          </div>
                          {renderStarRating(potentialRating)}
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Power Breakdown</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-gray-300">Throwing</div>
                              <Progress value={(player.throwing / 40) * 100} className="h-2" />
                              <div className="text-gray-400">{player.throwing}/40</div>
                            </div>
                            <div>
                              <div className="text-gray-300">Agility</div>
                              <Progress value={(player.agility / 40) * 100} className="h-2" />
                              <div className="text-gray-400">{player.agility}/40</div>
                            </div>
                            <div>
                              <div className="text-gray-300">Speed</div>
                              <Progress value={(player.speed / 40) * 100} className="h-2" />
                              <div className="text-gray-400">{player.speed}/40</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* B. Game Performance */}
              <Collapsible 
                open={expandedSection === 'performance'} 
                onOpenChange={() => toggleSection('performance')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Game Performance</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'performance' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Season Minutes:</span>
                          <span className="ml-2 text-white">{player.seasonMinutesTotal || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Games Played:</span>
                          <span className="ml-2 text-white">{player.gamesPlayedLastSeason || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">League Minutes:</span>
                          <span className="ml-2 text-white">{player.seasonMinutesLeague || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Exhibition Minutes:</span>
                          <span className="ml-2 text-white">{player.seasonMinutesExhibition || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* C. Attributes */}
              <Collapsible 
                open={expandedSection === 'attributes'} 
                onOpenChange={() => toggleSection('attributes')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Attributes</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'attributes' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Speed</span>
                          <span className="text-white">{player.speed}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Power</span>
                          <span className="text-white">{player.power}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Throwing</span>
                          <span className="text-white">{player.throwing}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Catching</span>
                          <span className="text-white">{player.catching}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Kicking</span>
                          <span className="text-white">{player.kicking}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stamina</span>
                          <span className="text-white">{player.staminaAttribute}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Leadership</span>
                          <span className="text-white">{player.leadership}/40</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Agility</span>
                          <span className="text-white">{player.agility}/40</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* D. Abilities & Skills */}
              <Collapsible 
                open={expandedSection === 'abilities'} 
                onOpenChange={() => toggleSection('abilities')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Abilities & Skills</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'abilities' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      {player.abilities && player.abilities.length > 0 ? (
                        <AbilitiesDisplay player={player} />
                      ) : (
                        <div className="text-sm text-gray-400 text-center py-4">
                          No abilities learned. Train or level up to unlock.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* E. Equipment */}
              <Collapsible 
                open={expandedSection === 'equipment'} 
                onOpenChange={() => toggleSection('equipment')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Equipment</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'equipment' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Go to Inventory
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Equipment Slots */}
                        <div className="border border-gray-600 rounded-lg p-4 text-center">
                          <Shield className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <div className="text-sm text-gray-400">Helmet</div>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="border border-gray-600 rounded-lg p-4 text-center">
                          <Shirt className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <div className="text-sm text-gray-400">Chest</div>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="border border-gray-600 rounded-lg p-4 text-center">
                          <div className="w-6 h-6 mx-auto mb-2 text-gray-400">👟</div>
                          <div className="text-sm text-gray-400">Shoes</div>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="border border-gray-600 rounded-lg p-4 text-center">
                          <div className="w-6 h-6 mx-auto mb-2 text-gray-400">🧤</div>
                          <div className="text-sm text-gray-400">Gloves</div>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* F. Medical & Recovery */}
              <Collapsible 
                open={expandedSection === 'medical'} 
                onOpenChange={() => toggleSection('medical')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium">Medical & Recovery</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'medical' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-gray-400">Health:</span>
                          <span className="ml-2 text-white">{healthStatus}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Daily Items Used:</span>
                          <span className="ml-2 text-white">{player.dailyItemsUsed || 0}/3</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Career Injuries:</span>
                          <span className="ml-2 text-white">{player.careerInjuries || 0}</span>
                        </div>
                      </div>
                      {player.injuryStatus !== 'HEALTHY' && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                          <div className="text-sm text-red-300">
                            Recovery: {player.injuryRecoveryPointsCurrent || 0}/{player.injuryRecoveryPointsNeeded || 0} points
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* D. Morale & Camaraderie */}
              <Collapsible 
                open={expandedSection === 'camaraderie'} 
                onOpenChange={() => toggleSection('camaraderie')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between bg-gray-800/30 hover:bg-gray-700/50 p-4">
                    <span className="font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Morale & Camaraderie
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'camaraderie' ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="bg-gray-800/20 border-gray-700">
                    <CardContent className="p-4 space-y-4">
                      {/* Individual Camaraderie Score */}
                      <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {player.camaraderieScore >= 80 ? '😊' : 
                             player.camaraderieScore >= 60 ? '😐' : 
                             player.camaraderieScore >= 40 ? '😟' : '😞'}
                          </div>
                          <div>
                            <div className="font-bold text-white">Individual Camaraderie</div>
                            <div className="text-sm text-gray-400">Player's team chemistry rating</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-400">{player.camaraderieScore || 50}</div>
                          <div className="text-xs text-gray-400">out of 100</div>
                        </div>
                      </div>
                      
                      {/* Camaraderie Status & Effects */}
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-gray-700/30 rounded-lg">
                          <div className="text-sm text-gray-400 mb-1">Status</div>
                          <div className="font-medium text-white">
                            {player.camaraderieScore >= 80 ? 'Excellent Team Chemistry' :
                             player.camaraderieScore >= 60 ? 'Good Team Chemistry' :
                             player.camaraderieScore >= 40 ? 'Average Team Chemistry' : 'Poor Team Chemistry'}
                          </div>
                        </div>
                        
                        {player.camaraderieScore >= 60 && (
                          <div className="p-3 bg-green-500/20 border border-green-500 rounded-lg">
                            <div className="text-sm text-green-400">
                              ✓ Player benefits from positive team chemistry bonuses
                            </div>
                          </div>
                        )}
                        
                        {player.camaraderieScore < 40 && (
                          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
                            <div className="text-sm text-red-400">
                              ⚠️ Low morale may negatively impact performance
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Recent Activity Placeholder */}
                      <div className="border-t border-gray-600 pt-4">
                        <div className="text-sm text-gray-400 mb-2">Recent Camaraderie Activity</div>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-300 italic">
                            Camaraderie tracking shows player's relationship with teammates and overall team chemistry.
                          </div>
                          <div className="text-xs text-gray-400">
                            Note: Detailed camaraderie events and match history will be available in future updates.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </ScrollArea>

        {/* Contract Negotiation Modal */}
        {showContractNegotiation && (
          <ContractNegotiationRedesigned
            player={player}
            isOpen={showContractNegotiation}
            onClose={() => {
              setShowContractNegotiation(false);
              if (onContractNegotiate) {
                onContractNegotiate(player.id.toString());
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PlayerDetailModal;