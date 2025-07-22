import { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, Shirt, Hand, Star, Trophy, Calendar, FileText, Zap, User, Crown, 
  DollarSign, Trash2, AlertTriangle, Heart, Wrench, ChevronDown, ChevronUp,
  Activity, Target, Brain, Gauge, TrendingUp, Clock, Pin, Copy, Bug, Sparkles, Award, Boot
} from "lucide-react";
import AbilitiesDisplay from "@/components/AbilitiesDisplay";
import { PlayerAwards } from "./PlayerAwards";
import ContractNegotiation from "./ContractNegotiation";
import { getPlayerRole, getRaceDisplayName, getRoleColor, getRoleTextColor } from "@shared/playerUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

interface PlayerDetailModalProps {
  player: DetailedPlayer | null; // Make player prop explicitly DetailedPlayer or null
  isOpen: boolean;
  onClose: () => void;
  onContractNegotiate?: (playerId: string) => void;
  onEquipmentChange?: (playerId: string, slot: string, itemId: string) => void;
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

// Helper function to get stat color based on value
const getStatColor = (value: number): string => {
  if (value >= 35) return "text-blue-400";
  if (value >= 26) return "text-green-400";
  if (value >= 16) return "text-white";
  return "text-red-400";
};

// Helper function to render star rating
const renderStarRating = (rating: number): JSX.Element[] => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
  }
  
  if (hasHalfStar) {
    stars.push(
      <div key="half" className="relative w-4 h-4">
        <Star className="w-4 h-4 text-yellow-400" />
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
      </div>
    );
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-400" />);
  }
  
  return stars;
};

export default function PlayerDetailModal({ 
  player, 
  isOpen, 
  onClose, 
  onContractNegotiate,
  onEquipmentChange 
}: PlayerDetailModalProps) {
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    attributes: false,
    abilities: false,
    equipment: false,
    contract: false,
    chemistry: false,
    medical: false,
    performance: false
  });
  
  const [showContractNegotiation, setShowContractNegotiation] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Toggle expanded sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch player's current equipment
  const { data: playerEquipment, isLoading: equipmentLoading } = useQuery({
    queryKey: [`/api/equipment/player/${player?.id}`],
    enabled: isOpen && !!player?.id,
  });

  // Fetch team inventory for equipment options
  const { data: teamInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: [`/api/inventory/${player?.teamId}`],
    enabled: isOpen && !!player?.teamId,
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

  // Release fee query
  const { data: releaseInfo, isLoading: releaseInfoLoading } = useQuery({
    queryKey: [`/api/teams/${player?.teamId}/players/${player?.id}/release-fee`],
    enabled: isOpen && !!player?.id && !!player?.teamId,
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
        description: "Player has been released from your team.",
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

  const playerRole = getPlayerRole(player);
  const displayName = player.firstName && player.lastName 
    ? `${player.firstName} ${player.lastName}` 
    : player.name || "Unknown Player";

  // Calculate overall power (Core Athleticism Rating)
  const overallPower = Math.round(
    (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6
  ) || 0;

  // Calculate potential rating
  const potential = Math.min(5.0, Number(player.potentialRating) || 3.0);
  const basePotential = potential;
  
  const getMaxPotential = (currentStat: number) => {
    // Convert star rating to potential points (each star = 8 potential points)
    const potentialPoints = basePotential * 8;
    return Math.min(40, currentStat + Math.floor(potentialPoints * 0.3));
  };

  // Contract status calculation
  const contractRemaining = player.contract?.length || 3;
  const isContractExpiring = contractRemaining <= 1;

  // Mock Head Scout level for scouting accuracy (this would come from team data)
  const headScoutLevel = 3; // This should be fetched from team staff
  const scoutingAccuracy = Math.min(100, 40 + (headScoutLevel * 15)); // 40% base + 15% per level

  // Calculate potential display based on scouting accuracy
  const getPotentialDisplay = () => {
    if (scoutingAccuracy >= 90) {
      return `${basePotential.toFixed(1)} Stars`;
    } else if (scoutingAccuracy >= 70) {
      const variance = 0.5;
      return `${(basePotential - variance).toFixed(1)} - ${(basePotential + variance).toFixed(1)} Stars`;
    } else {
      const variance = 1.0;
      return `${Math.max(0, basePotential - variance).toFixed(1)} - ${Math.min(5, basePotential + variance).toFixed(1)} Stars`;
    }
  };

  // Get equipped items by slot
  const getEquippedItemBySlot = (slot: string) => {
    if (!playerEquipment?.equipment) return null;
    return playerEquipment.equipment.find((eq: any) => 
      eq.item.slot === slot.toUpperCase() || 
      (slot === "helmet" && eq.item.name.toLowerCase().includes("helm"))
    );
  };

  // Get eligible equipment items for player
  const getEligibleEquipment = () => {
    if (!teamInventory || !Array.isArray(teamInventory)) return [];
    
    const raceRequirements = {
      "Human Tactical Helm": ["HUMAN"],
      "Gryllstone Plated Helm": ["GRYLL"],
      "Sylvan Barkwood Circlet": ["SYLVAN"],
      "Umbral Cowl": ["UMBRA"],
      "Lumina Radiant Aegis": ["LUMINA"]
    };

    return teamInventory.filter((item: any) => {
      if (item.itemType !== "EQUIPMENT" || item.quantity <= 0) return false;
      
      const requiredRaces = raceRequirements[item.name as keyof typeof raceRequirements];
      if (requiredRaces && !requiredRaces.includes(player.race)) return false;
      
      return true;
    });
  };

  // Get item effect description
  const getItemEffect = (item: any) => {
    const effects: Record<string, string> = {
      "Standard Leather Helmet": "+1 Stamina protection",
      "Human Tactical Helm": "+4 Leadership, +2 Throwing accuracy",
      "Gryllstone Plated Helm": "+3 Power, +2 Stamina",
      "Sylvan Barkwood Circlet": "+4 Agility, +2 Speed",
      "Umbral Cowl": "+3 Agility, +1 Speed",
      "Lumina Radiant Aegis": "+1 Leadership",
    };
    return effects[item.name] || item.description || "Provides various benefits";
  };

  const equipmentSlots = [
    { key: "helmet", icon: Shield, label: "Helmet" },
    { key: "chest", icon: Shirt, label: "Chest Armor" },
    { key: "shoes", icon: Boot, label: "Shoes" },
    { key: "gloves", icon: Hand, label: "Gloves" },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-400 border-gray-400";
      case "rare": return "text-blue-400 border-blue-400";
      case "epic": return "text-purple-400 border-purple-400";
      case "legendary": return "text-yellow-400 border-yellow-400";
      default: return "text-gray-400 border-gray-400";
    }
  };

  // Render single stat bar with new format
  const renderStatBar = (label: string, current: number) => {
    const maxPotential = getMaxPotential(current);
    const percentage = (current / 40) * 100;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-sm font-bold ${getStatColor(current)}`}>
            {current}/{maxPotential}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  };

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden p-0">
          <div className="sticky top-0 bg-gray-900 z-10 border-b border-gray-700">
            {/* Header Block */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-600 bg-opacity-20 rounded-full border-2 border-gray-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{displayName}</h1>
                    {player.isCaptain && <Crown className="w-6 h-6 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-sm font-medium ${getRoleColor(playerRole)}`}>
                      {getRaceEmoji(player.race)} {playerRole.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {getRaceDisplayName(player.race)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">
                    Age {player.age} • Team: Oakland Cougars • #{player.id}
                  </div>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowContractNegotiation(true)}
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <DollarSign className="w-4 h-4" />
                  Negotiate
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <Heart className="w-4 h-4" />
                  Heal
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <Wrench className="w-4 h-4" />
                  Equip
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={releaseInfoLoading || !releaseInfo?.canRelease}
                      className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Release
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Release Player
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-2">
                          <p>Are you sure you want to release {displayName}?</p>
                          {releaseInfo && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <p className="font-semibold text-red-700 dark:text-red-300">
                                Release Fee: ₡{releaseInfo.releaseFee?.toLocaleString() || 0}
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                Team Credits: ₡{releaseInfo.teamCredits?.toLocaleString() || 0}
                              </p>
                              {releaseInfo.teamCredits < releaseInfo.releaseFee && (
                                <p className="text-sm text-red-700 dark:text-red-300 font-semibold mt-1">
                                  Insufficient credits for release!
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            This action cannot be undone.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => releasePlayerMutation.mutate()}
                        disabled={releasePlayerMutation.isPending || !releaseInfo?.canRelease || (releaseInfo?.teamCredits < releaseInfo?.releaseFee)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {releasePlayerMutation.isPending ? "Releasing..." : "Release Player"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(95vh-200px)]">
            <div className="p-6 space-y-6">
              {/* Summary Section - Mini Player Card View */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Power & Key Stats */}
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${getStatColor(overallPower)}`}>
                            {overallPower}
                          </div>
                          <div className="text-xs text-gray-400">Power</div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">THR</span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-400 transition-all" 
                                  style={{ width: `${Math.min((player.throwing || 0) / 40 * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${getStatColor(player.throwing || 0)}`}>
                                {player.throwing || 0}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">AGI</span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-400 transition-all" 
                                  style={{ width: `${Math.min((player.agility || 0) / 40 * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${getStatColor(player.agility || 0)}`}>
                                {player.agility || 0}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">SPD</span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-400 transition-all" 
                                  style={{ width: `${Math.min((player.speed || 0) / 40 * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${getStatColor(player.speed || 0)}`}>
                                {player.speed || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Potential Stars */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-400">Potential:</span>
                        <div className="flex">{renderStarRating(potential)}</div>
                        <span className="text-xs text-gray-500">({potential.toFixed(1)})</span>
                      </div>
                    </div>
                    
                    {/* Status Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Health:</span>
                        <Badge variant={player.injuryStatus === 'Healthy' ? 'default' : 'destructive'} className="text-xs">
                          {player.injuryStatus || 'Healthy'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">Stamina:</span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 transition-all" 
                              style={{ width: `${Math.min((player.dailyStaminaLevel || 0), 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{player.dailyStaminaLevel || 0}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">Chemistry:</span>
                        <span className="text-sm">
                          {player.camaraderieScore >= 70 ? '🙂' : player.camaraderieScore >= 40 ? '😐' : '😞'}
                          {' '}{player.camaraderieScore || 50}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">Contract:</span>
                        <span className="text-sm">₡{((player.speed || 0) * 500).toLocaleString()}/yr × 2 years</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expandable Sections */}
              <div className="space-y-2">
                {/* Game Performance Section */}
                <Collapsible 
                  open={expandedSections.performance} 
                  onOpenChange={() => toggleSection('performance')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-medium">Game Performance</span>
                      </div>
                      {expandedSections.performance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-gray-800 border-gray-700 mx-4 mb-2">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400 mb-2">Recent Match Performance</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Last 5 Games:</span>
                            <span>2-3-0 Record</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recent MVP:</span>
                            <span className="text-yellow-400">July 15th vs Thunder Hawks</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Season Stats:</span>
                            <span>Coming soon...</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Attributes Section */}
                <Collapsible 
                  open={expandedSections.attributes} 
                  onOpenChange={() => toggleSection('attributes')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Attributes</span>
                      </div>
                      {expandedSections.attributes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-gray-800 border-gray-700 mx-4 mb-2">
                      <CardContent className="p-4 space-y-4">
                        {renderStatBar("Speed", player.speed || 0)}
                        {renderStatBar("Power", player.power || 0)}
                        {renderStatBar("Throwing", player.throwing || 0)}
                        {renderStatBar("Catching", player.catching || 0)}
                        {renderStatBar("Kicking", player.kicking || 0)}
                        {renderStatBar("Stamina", player.staminaAttribute || 0)}
                        {renderStatBar("Leadership", player.leadership || 0)}
                        {renderStatBar("Agility", player.agility || 0)}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Abilities & Skills Section */}
                <Collapsible 
                  open={expandedSections.abilities} 
                  onOpenChange={() => toggleSection('abilities')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span className="font-medium">Abilities & Skills</span>
                      </div>
                      {expandedSections.abilities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-gray-800 border-gray-700 mx-4 mb-2">
                      <CardContent className="p-4">
                        <AbilitiesDisplay player={player} />
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Equipment Section */}
                <Collapsible 
                  open={expandedSections.equipment} 
                  onOpenChange={() => toggleSection('equipment')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <span className="font-medium">Equipment</span>
                      </div>
                      {expandedSections.equipment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-gray-800 border-gray-700 mx-4 mb-2">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Equipment Slots */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                              <Shield className="w-4 h-4" />
                              <span className="text-sm">Helmet: None</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                              <Shirt className="w-4 h-4" />
                              <span className="text-sm">Chest: None</span>
                            </div>
                          </div>
                          
                          {/* Equipment Selection */}
                          {teamInventory && teamInventory.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-sm text-gray-300">Equip Item:</label>
                              <Select value={selectedEquipmentItem} onValueChange={setSelectedEquipmentItem}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select equipment item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamInventory.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name} ({item.quantity} available)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedEquipmentItem && (
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    const item = teamInventory.find((i: any) => i.id.toString() === selectedEquipmentItem);
                                    if (item) {
                                      equipItemMutation.mutate({ 
                                        itemId: item.id, 
                                        itemName: item.name 
                                      });
                                    }
                                  }}
                                  disabled={equipItemMutation.isPending}
                                >
                                  {equipItemMutation.isPending ? "Equipping..." : "Equip Item"}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Medical & Recovery Section */}
                <Collapsible 
                  open={expandedSections.medical} 
                  onOpenChange={() => toggleSection('medical')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        <span className="font-medium">Medical & Recovery</span>
                      </div>
                      {expandedSections.medical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="bg-gray-800 border-gray-700 mx-4 mb-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Health Status:</span>
                          <Badge variant={player.injuryStatus === 'Healthy' ? 'default' : 'destructive'}>
                            {player.injuryStatus || 'Healthy'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Daily Items Used:</span>
                          <span className="text-sm">{player.dailyItemsUsed || 0}/3</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Career Injuries:</span>
                          <span className="text-sm">{player.careerInjuries || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Footer Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-gray-700">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  Pin to Roster
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Compare
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Scout
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Report
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Contract Negotiation Modal */}
      {showContractNegotiation && player && (
        <ContractNegotiation
          player={player}
          isOpen={showContractNegotiation}
          onClose={() => setShowContractNegotiation(false)}
        />
      )}
    </div>
  );
}
