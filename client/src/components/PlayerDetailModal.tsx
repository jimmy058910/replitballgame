import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Shirt, ShirtIcon, Hand, Star, Trophy, Calendar, FileText, Zap, User, Crown, DollarSign } from "lucide-react";
import AbilitiesDisplay from "@/components/AbilitiesDisplay";
import { PlayerAwards } from "./PlayerAwards";
import ContractNegotiation from "./ContractNegotiation";
import { getPlayerRole, getRaceDisplayName, getRoleColor, getRoleTextColor } from "@shared/playerUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [showContractNegotiation, setShowContractNegotiation] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  if (!player) return null;

  const playerRole = getPlayerRole(player);
  const displayName = player.firstName && player.lastName 
    ? `${player.firstName} ${player.lastName}` 
    : player.name || "Unknown Player";

  // Calculate potential for each stat (using overallPotentialStars as base, capped at 5.0)
  const basePotential = Math.min(5.0, Number(player.overallPotentialStars) || 3.0);
  const getMaxPotential = (currentStat: number) => {
    // Convert star rating to potential points (each star = 8 potential points)
    const potentialPoints = basePotential * 8;
    return Math.min(40, currentStat + Math.floor(potentialPoints * 0.3));
  };

  // Contract status calculation
  const contractRemaining = (player.contractSeasons || 3) - (player.contractStartSeason || 0);
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
    { key: "shoes", icon: ShirtIcon, label: "Shoes" },
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-600 bg-opacity-20 rounded-full border-2 border-gray-500 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  {player.isCaptain && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${getRoleColor(playerRole)}`}>
                    {playerRole.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getRaceEmoji(player.race)} {getRaceDisplayName(player.race)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Age {player.age || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowContractNegotiation(true)}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Negotiate Contract
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="abilities" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Abilities & Skills
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="gamelogsawards" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Game Logs & Awards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Core Attributes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Core Attributes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderStatBar("Speed", player.speed || 0)}
                  {renderStatBar("Power", player.power || 0)}
                  {renderStatBar("Throwing", player.throwing || 0)}
                  {renderStatBar("Catching", player.catching || 0)}
                  {renderStatBar("Kicking", player.kicking || 0)}
                  {renderStatBar("Stamina", player.stamina || 0)}
                  {renderStatBar("Leadership", player.leadership || 0)}
                  {renderStatBar("Agility", player.agility || 0)}
                </CardContent>
              </Card>

              {/* Potential & Scouting Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Potential & Scouting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="flex justify-center gap-1 mb-2">
                      {renderStarRating(basePotential)}
                    </div>
                    <div className="text-lg font-bold text-yellow-400">
                      {getPotentialDisplay()}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Scouting Accuracy: {scoutingAccuracy}%
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Scouting Notes</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>• Strong in {playerRole.toLowerCase()} position</div>
                      <div>• {player.age < 25 ? "Young with room to grow" : player.age < 30 ? "In prime years" : "Veteran experience"}</div>
                      <div>• {basePotential >= 4 ? "Elite potential" : basePotential >= 3 ? "Solid potential" : "Limited potential"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract & Camaraderie Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Contract & Camaraderie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">Current Salary</label>
                      <div className="text-2xl font-bold text-green-400">
                        ₡{(player.salary || 0).toLocaleString()}/season
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Contract Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isContractExpiring ? "destructive" : "default"}>
                          {contractRemaining} seasons remaining
                        </Badge>
                        {isContractExpiring && (
                          <span className="text-xs text-red-400">Expiring Soon!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">Player Camaraderie</label>
                      <div className="mt-1 space-y-1">
                        <Progress value={player.camaraderie || 50} className="h-3" />
                        <div className="text-sm text-gray-400">
                          {player.camaraderie || 50}/100 - {
                            (player.camaraderie || 50) >= 80 ? "Excellent" :
                            (player.camaraderie || 50) >= 60 ? "Good" :
                            (player.camaraderie || 50) >= 40 ? "Average" : "Poor"
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isContractExpiring && (
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <Button 
                      onClick={() => onContractNegotiate?.(player.id)}
                      className="w-full"
                      size="lg"
                    >
                      Negotiate Contract Extension
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abilities" className="space-y-4">
            <AbilitiesDisplay player={player} canTrain={true} />
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            {equipmentLoading ? (
              <div className="text-center py-8 text-gray-400">Loading equipment...</div>
            ) : (
              <div className="space-y-4">
                {/* Currently Equipped Section */}
                <Card className="border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Currently Equipped
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {equipmentSlots.map((slot) => {
                        const equippedItem = playerEquipment?.equipment?.find((equipment: any) => 
                          equipment.item.name.toLowerCase().includes(slot.key) || 
                          (slot.key === "helmet" && equipment.item.name.toLowerCase().includes("helm"))
                        );
                        
                        return (
                          <div key={slot.key} className="border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <slot.icon className="w-5 h-5 text-gray-400" />
                              <span className="font-medium">{slot.label}</span>
                            </div>
                            
                            {equippedItem ? (
                              <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-red-500">
                                <div className="font-medium">{equippedItem.item.name}</div>
                                <div className="text-sm text-gray-400">
                                  {getItemEffect(equippedItem.item)}
                                </div>
                                <div className="text-xs text-red-400 mt-1">
                                  ⚠️ PERMANENTLY EQUIPPED
                                </div>
                                <Badge variant="outline" className="text-xs mt-2">
                                  {equippedItem.item.rarity}
                                </Badge>
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-700/50 rounded-lg border border-dashed border-gray-600 text-center">
                                <div className="text-gray-400 text-sm">Empty Slot</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  No {slot.label.toLowerCase()} equipped
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Equip New Equipment Section */}
                <Card className="border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hand className="w-5 h-5" />
                      Equip New Equipment
                    </CardTitle>
                    <div className="text-sm text-orange-400 mt-2 p-2 bg-orange-900/20 rounded border border-orange-500">
                      ⚠️ WARNING: Equipment is PERMANENT once equipped and cannot be removed or transferred to other players!
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Equipment to Equip:</label>
                      <Select value={selectedEquipmentItem} onValueChange={setSelectedEquipmentItem}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an equipment item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getEligibleEquipment().map((item: any) => (
                            <SelectItem key={item.id} value={`${item.id}-${item.name}`}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.rarity}
                                </Badge>
                                <span>{item.name}</span>
                                <span className="text-xs text-gray-400">(x{item.quantity})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedEquipmentItem && (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <div className="text-sm text-gray-400">
                            {(() => {
                              const item = getEligibleEquipment().find((i: any) => 
                                `${i.id}-${i.name}` === selectedEquipmentItem
                              );
                              return item ? getItemEffect(item) : "";
                            })()}
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const [itemId, itemName] = selectedEquipmentItem.split('-');
                            equipItemMutation.mutate({ 
                              itemId: parseInt(itemId), 
                              itemName 
                            });
                          }}
                          disabled={equipItemMutation.isPending}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          {equipItemMutation.isPending ? "Equipping..." : "⚠️ PERMANENTLY EQUIP ITEM"}
                        </Button>
                      </div>
                    )}
                    
                    {getEligibleEquipment().length === 0 && (
                      <div className="text-center py-4 text-gray-400">
                        No eligible equipment available for this player's race ({getRaceDisplayName(player.race)})
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="gamelogsawards" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Game Logs Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Game Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-400 text-center py-8">
                    Game logs feature coming soon...
                  </div>
                </CardContent>
              </Card>

              {/* Awards Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Player Awards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerAwards playerId={player.id} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      </Dialog>

      {/* Contract Negotiation Dialog */}
      <ContractNegotiation
        player={player}
        isOpen={showContractNegotiation}
        onClose={() => setShowContractNegotiation(false)}
      />
    </>
  );
}