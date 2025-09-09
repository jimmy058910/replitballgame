import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Shield, 
  Zap, 
  Trophy, 
  Ticket, 
  X, 
  User, 
  Heart, 
  Sparkles,
  ShoppingCart,
  Target,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { inventoryQueryOptions, playerQueryOptions } from "@/lib/api/queryOptions";
import type { Player, Team, Staff, Contract } from '@shared/types/models';

interface InventoryItem {
  id: string;
  itemType: string;
  name: string;
  description: string;
  rarity: string;
  quantity: number;
  metadata: any;
  raceRestriction?: string;
  statBoosts?: any;
  effect?: string;
  slot?: string;
}



interface ActiveBoost {
  id: string;
  itemName: string;
  playerId?: string;
  playerName?: string;
  effect: string;
}

interface UnifiedInventoryHubProps {
  teamId: string;
}

export default function UnifiedInventoryHub({ teamId }: UnifiedInventoryHubProps) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team inventory
  const { data: rawInventory = [] } = useQuery(inventoryQueryOptions.teamInventory(teamId));
  const inventory = (rawInventory || []);

  // Fetch active boosts for the team
  const { data: activeBoosts = [] } = useQuery(inventoryQueryOptions.activeBoosts(teamId));

  // Fetch team players for equipment/consumable usage
  const { data: rawPlayers = [] } = useQuery(playerQueryOptions.playersByTeam(teamId));
  const players = (rawPlayers || []);

  // Filter definitions according to project brief (only count items with quantity > 0)
  const filterOptions = [
    { id: "all", name: "All Items", icon: Package, count: inventory.filter(item => item.quantity > 0).length },
    { id: "EQUIPMENT", name: "Equipment", icon: Shield, count: inventory.filter(item => item.itemType === "EQUIPMENT" && item.quantity > 0).length },
    { id: "CONSUMABLE", name: "Consumables", icon: Zap, count: inventory.filter(item => item.itemType?.includes("CONSUMABLE") && item.quantity > 0).length },
    { id: "GAME_ENTRY", name: "Game Entries", icon: Ticket, count: inventory.filter(item => item.itemType === "GAME_ENTRY" && item.quantity > 0).length },
    { id: "trophy", name: "Trophies", icon: Trophy, count: inventory.filter(item => item.itemType === "trophy" && item.quantity > 0).length },
  ];

  // Filter inventory based on selected filter and quantity > 0
  const filteredInventory = selectedFilter === "all" 
    ? inventory.filter(item => item.quantity > 0) 
    : inventory.filter(item => (item.itemType === selectedFilter || (selectedFilter === "CONSUMABLE" && item.itemType?.includes("CONSUMABLE"))) && item.quantity > 0);

  // Get rarity color for item cards
  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "border-yellow-500 bg-yellow-500/10";
      case "epic": return "border-purple-500 bg-purple-500/10";
      case "rare": return "border-blue-500 bg-blue-500/10";
      case "uncommon": return "border-green-500 bg-green-500/10";
      case "common": return "border-gray-500 bg-gray-500/10";
      default: return "border-gray-600 bg-gray-600/10";
    }
  };

  // Get equipment slot from item name if slot field is missing
  const getEquipmentSlot = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("helmet") || lowerName.includes("helm") || lowerName.includes("circlet") || lowerName.includes("crest") || lowerName.includes("cowl")) {
      return "Helmet";
    }
    if (lowerName.includes("glove") || lowerName.includes("grip") || lowerName.includes("gauntlet") || lowerName.includes("fist")) {
      return "Gloves";
    }
    if (lowerName.includes("boot") || lowerName.includes("cleat") || lowerName.includes("tread") || lowerName.includes("stride")) {
      return "Shoes";
    }
    if (lowerName.includes("armor") || lowerName.includes("plate") || lowerName.includes("aegis") || lowerName.includes("mail") || lowerName.includes("tunic") || lowerName.includes("pauldron") || lowerName.includes("carrier")) {
      return "Chest Armor";
    }
    return "Equipment";
  };

  // Get item icon based on type and name
  const getItemIcon = (item: InventoryItem) => {
    const effect = item.effect || item.metadata?.effect;
    
    // Team boost items
    if (effect?.includes("team_")) {
      return "🌟";
    }
    
    // Equipment items
    if (item.itemType === "EQUIPMENT") {
      if (item.name.toLowerCase().includes("helmet") || item.name.toLowerCase().includes("helm") || item.name.toLowerCase().includes("circlet") || item.name.toLowerCase().includes("crest") || item.name.toLowerCase().includes("cowl")) {
        return "🪖";
      }
      if (item.name.toLowerCase().includes("glove") || item.name.toLowerCase().includes("grip") || item.name.toLowerCase().includes("gauntlet") || item.name.toLowerCase().includes("fist")) {
        return "🧤";
      }
      if (item.name.toLowerCase().includes("boot") || item.name.toLowerCase().includes("cleat") || item.name.toLowerCase().includes("tread") || item.name.toLowerCase().includes("stride")) {
        return "👟";
      }
      if (item.name.toLowerCase().includes("armor") || item.name.toLowerCase().includes("plate") || item.name.toLowerCase().includes("aegis") || item.name.toLowerCase().includes("mail") || item.name.toLowerCase().includes("tunic") || item.name.toLowerCase().includes("pauldron") || item.name.toLowerCase().includes("carrier")) {
        return "🛡️";
      }
      return "⚔️";
    }
    
    // Recovery items
    if (item.itemType === "CONSUMABLE_RECOVERY") {
      if (item.name.toLowerCase().includes("medical") || item.name.toLowerCase().includes("heal") || item.name.toLowerCase().includes("treatment") || item.name.toLowerCase().includes("tincture") || item.name.toLowerCase().includes("salve")) {
        return "🩹";
      }
      if (item.name.toLowerCase().includes("stamina") || item.name.toLowerCase().includes("recovery") || item.name.toLowerCase().includes("energy") || item.name.toLowerCase().includes("serum") || item.name.toLowerCase().includes("elixir")) {
        return "⚡";
      }
      return "🧪";
    }
    
    // Effect-based detection
    if (effect?.includes("stamina")) {
      return "⚡";
    }
    if (effect?.includes("injury")) {
      return "🩹";
    }
    
    if (item.itemType === "GAME_ENTRY") return "🎫";
    if (item.itemType === "trophy") return "🏆";
    return "📦";
  };

  // Convert effect codes to human-readable descriptions
  const getEffectDescription = (effect: string) => {
    if (effect.startsWith('restore_stamina_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Stamina for a Player`;
    }
    if (effect.startsWith('team_agility_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Agility boost for the Team`;
    }
    if (effect.startsWith('team_power_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Power boost for the Team`;
    }
    if (effect.startsWith('team_speed_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Speed boost for the Team`;
    }
    if (effect.startsWith('team_leadership_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Leadership boost for the Team`;
    }
    if (effect.startsWith('team_stamina_')) {
      const amount = effect.split('_')[2];
      return `+${amount} Stamina boost for the Team`;
    }
    if (effect.startsWith('heal_injury_')) {
      const amount = effect.split('_')[2];
      return `Heal ${amount} injury points for a Player`;
    }
    // Return original effect if no match found
    return effect;
  };

  // Get item effect description with race requirements
  const getItemEffect = (item: InventoryItem) => {
    // Use the actual item description from API first
    if (item.description && item.description !== "Provides various benefits") {
      return item.description;
    }

    const effects: Record<string, string> = {
      // Equipment effects with race requirements
      "Standard Leather Helmet": "+1 Stamina protection (Any race)",
      "Human Tactical Helm": "+4 Leadership, +2 Throwing accuracy (Human only)",
      "Gryllstone Plated Helm": "+3 Power, +2 Stamina (Gryll only)",
      "Sylvan Barkwood Circlet": "+4 Agility, +2 Speed (Sylvan only)",
      "Umbral Cowl": "+3 Agility, +1 Speed (Umbra only)",
      "Helm of Command": "+2 Leadership (Cosmetic, any race)",
      "Boots of the Gryll": "+2 Power, +1 Stamina (Gryll only)",
      "Lumina Light-Treads": "+3 Speed, +1 Agility (Lumina only)",
      "Sylvan Gripping Vines": "+2 Catching, +1 Agility (Sylvan only)",
      "Umbral Shadowgrips": "+2 Agility, +1 Speed (Umbra only)",
      "Gryll Forged Plate": "+4 Power, +1 Stamina (Gryll only)",
      "Lumina Radiant Aegis": "+1 Leadership (Cosmetic, Lumina only)",
      
      // Consumable effects
      "Basic Medical Kit": "Heals 25 Injury Recovery Points",
      "Advanced Treatment": "Heals 50 Injury Recovery Points",
      "Phoenix Elixir": "Fully heals any injury",
      "Basic Stamina Drink": "Restores 25% stamina",
      "Advanced Recovery Serum": "Restores 50% stamina",
      "Speed Boost Tonic": "+3 Speed for one match",
      "Power Surge Potion": "+3 Power for one match",
      "Champion Blessing": "+2 to all stats for one match",
    };
    
    return effects[item.name] || item.description || "Provides various benefits";
  };

  // Mutations for item usage
  const useItemMutation = useMutation({
    mutationFn: async ({ item, playerId, action }: { item: InventoryItem; playerId?: string; action: string }) => {
      if (action === "equip") {
        return apiRequest(`/api/equipment/equip`, "POST", {
          teamId,
          playerId,
          itemId: item.id,
          itemName: item.name
        });
      } else if (action === "use_recovery") {
        return apiRequest(`/api/injury-stamina/player/${playerId}/use-item`, "POST", {
          itemType: item.name.includes("stamina") ? "stamina" : "injury",
          effectValue: item.name.includes("phoenix") ? 100 : 
                       item.name.includes("advanced") ? 50 : 25,
          itemName: item.name
        });
      } else if (action === "activate_boost") {
        // This would be for individual player boosts (not team boosts)
        // For now, just return success since team boosts are handled differently
        return { success: true };
      } else if (action === "use_team_boost") {
        // Apply team boost to next match
        return apiRequest(`/api/teams/${teamId}/apply-team-boost`, "POST", {
          itemId: item.id,
          effect: item.effect || item.metadata?.effect
        });
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/inventory/${teamId}`] });
      if (variables.action === "use_recovery") {
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
        queryClient.invalidateQueries({ queryKey: ['/api/injury-stamina/team', teamId, 'status'] });
      }
      if (variables.action === "use_team_boost") {
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/active-boosts`] });
      }
      setShowItemModal(false);
      setSelectedPlayer("");
      toast({
        title: "Item Used Successfully",
        description: `${variables.item.name} has been applied.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to use item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Remove active boost
  const removeActiveBoost = async (boostId: string) => {
    try {
      await apiRequest(`/api/teams/${teamId}/active-boosts/${boostId}`, "DELETE");
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/active-boosts`] });
      toast({
        title: "Boost Removed",
        description: "Active boost has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove boost.",
        variant: "destructive",
      });
    }
  };

  // Calculate cumulative team boost effects
  const calculateCumulativeBoosts = (boosts: any[]) => {
    const cumulativeStats = {
      leadership: 0,
      power: 0,
      agility: 0,
      stamina: 0,
      throwing: 0,
      catching: 0,
      kicking: 0,
      speed: 0
    };

    boosts.forEach(boost => {
      const effect = boost.effect || boost.itemName;
      // Parse effects like "team_agility_5", "team_power_3", etc.
      const match = effect.match(/team_(\w+)_(\d+)/);
      if (match) {
        const [, stat, value] = match;
        if (stat in cumulativeStats) {
          cumulativeStats[stat as keyof typeof cumulativeStats] += parseInt(value);
        }
      }
    });

    return cumulativeStats;
  };

  // Format effect text for display
  const formatEffectText = (effect: string) => {
    // Parse effects like "team_agility_5", "team_power_3", etc.
    const match = effect.match(/team_(\w+)_(\d+)/);
    if (match) {
      const [, stat, value] = match;
      const capitalizedStat = stat.charAt(0).toUpperCase() + stat.slice(1);
      return `${capitalizedStat} +${value}`;
    }
    return effect;
  };

  // Check if an item is a team boost (affects whole team, not individual players)
  const isTeamBoost = (item: InventoryItem) => {
    const effect = item.effect || item.metadata?.effect;
    return effect && effect.startsWith('team_');
  };

  // Get eligible players for item usage
  const getEligiblePlayers = (item: InventoryItem) => {
    // Team boost items don't require player selection
    if (isTeamBoost(item)) {
      return [];
    }
    
    if (item.itemType === "EQUIPMENT") {
      // Filter by race requirements
      const raceRequirements = {
        "Human Tactical Helm": ["HUMAN"],
        "Gryllstone Plated Helm": ["GRYLL"],
        "Sylvan Barkwood Circlet": ["SYLVAN"],
        "Umbral Cowl": ["UMBRA"],
        "Lumina Radiant Aegis": ["LUMINA"]
      };
      if (raceRequirements[item.name]) {
        return players.filter(p => raceRequirements[item.name].includes(p.race));
      }
      
      return players; // Items without race requirements
    }
    if (item.itemType === "CONSUMABLE_RECOVERY") {
      if (item.name.toLowerCase().includes("medical") || item.name.toLowerCase().includes("heal")) {
        return players.filter(p => p.injuryStatus !== "HEALTHY");
      }
      
      // For stamina items, filter out players with full stamina
      if (item.name.toLowerCase().includes("stamina") || item.name.toLowerCase().includes("energy") || item.name.toLowerCase().includes("recovery")) {
        return players.filter(p => {
          const currentStamina = p.dailyStaminaLevel;
          // Only show players who don't have full stamina (null means full stamina)
          return currentStamina !== null && currentStamina < 100;
        });
      }
      
      return players; // All players can use other boost items
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const Icon = filter.icon;
          const isActive = selectedFilter === filter.id;
          
          return (
            <Button
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex items-center gap-2 ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {filter.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {filter.count}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Item Grid - Takes up 3/4 of the space */}
        <div className="lg:col-span-3">
          {filteredInventory.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  No {selectedFilter === "all" ? "" : filterOptions.find(f => f.id === selectedFilter)?.name} Items
                </h3>
                <p className="text-gray-400 mb-4">
                  Your {selectedFilter === "all" ? "inventory is" : "collection is"} empty.
                </p>
                <Button variant="outline" className="border-gray-600 text-gray-300">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Visit Market → Store
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInventory.map((item) => (
                <Card 
                  key={item.id} 
                  className={`bg-gray-800 border-2 cursor-pointer hover:shadow-lg transition-all duration-200 ${getRarityColor(item.rarity)}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowItemModal(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl">{getItemIcon(item)}</div>
                      <Badge variant="outline" className="text-xs">
                        x{item.quantity}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-white text-sm mb-1">
                      {item.name.replace(/_/g, ' ')}
                    </h3>
                    
                    <p className="text-xs text-gray-400 mb-2">
                      {getItemEffect(item)}
                    </p>
                    
                    {/* Enhanced Item Details */}
                    {item.itemType === "EQUIPMENT" && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-blue-400">
                          Race: {item.raceRestriction ? 
                            item.raceRestriction.charAt(0).toUpperCase() + item.raceRestriction.slice(1).toLowerCase() : 
                            "Universal"
                          }
                        </p>
                      </div>
                    )}
                    
                    {item.itemType === "EQUIPMENT" && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-yellow-400">
                          Slot: {item.slot || getEquipmentSlot(item.name)}
                        </p>
                      </div>
                    )}
                    
                    {item.statBoosts && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-400">Stats:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.statBoosts).map(([stat, value]: [string, any]) => (
                            <span key={stat} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                              {stat.replace('Attribute', '').toLowerCase()}: +{value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(item.effect || item.metadata?.effect) && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-purple-400">Effect:</p>
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                          {getEffectDescription(item.effect || item.metadata?.effect)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-3">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          item.rarity === "legendary" ? "bg-yellow-600" :
                          item.rarity === "epic" ? "bg-purple-600" :
                          item.rarity === "rare" ? "bg-blue-600" :
                          item.rarity === "uncommon" ? "bg-green-600" :
                          "bg-gray-600"
                        }`}
                      >
                        {item.rarity?.charAt(0).toUpperCase() + item.rarity?.slice(1) || "Common"}
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle team boosts directly without player selection
                          if (isTeamBoost(item)) {
                            useItemMutation.mutate({ 
                              item, 
                              action: "use_team_boost",
                              effect: item.effect || item.metadata?.effect
                            });
                          } else {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }
                        }}
                        className="text-xs py-1 px-2 h-6 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        USE
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Boosts Panel - Takes up 1/4 of the space */}
        <div className="lg:col-span-1">
          <Card className="bg-gray-800 border-gray-700 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Next Match Boosts
                <Badge variant="outline" className="ml-auto">
                  {activeBoosts.length}/3
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBoosts.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">No active boosts</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Activate consumables for your next league match
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBoosts.map((boost) => (
                    <div key={boost.id} className="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {boost.itemName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatEffectText(boost.effect)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeActiveBoost(boost.id)}
                        className="h-6 w-6 p-0 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {activeBoosts.length < 3 && (
                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-600">
                  <p className="text-xs text-blue-300">
                    {3 - activeBoosts.length} boost slot{3 - activeBoosts.length !== 1 ? 's' : ''} remaining for your next match
                  </p>
                </div>
              )}

              {/* Cumulative Boost Summary */}
              {activeBoosts.length > 0 && (
                <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-600">
                  <p className="text-xs text-green-300 font-medium mb-2">💪 Total Team Boosts:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(calculateCumulativeBoosts(activeBoosts)).map(([stat, value]) => (
                      value > 0 && (
                        <div key={stat} className="flex justify-between text-green-200">
                          <span>{stat.charAt(0).toUpperCase() + stat.slice(1)}:</span>
                          <span className="font-medium text-green-100">+{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Item Interaction Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-white">
                  <span className="text-2xl">{getItemIcon(selectedItem)}</span>
                  {selectedItem.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  {selectedItem.description || getItemEffect(selectedItem)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Quantity Owned:</span>
                  <Badge variant="outline">{selectedItem.quantity}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Rarity:</span>
                  <Badge className={`${
                    selectedItem.rarity === "legendary" ? "bg-yellow-600" :
                    selectedItem.rarity === "epic" ? "bg-purple-600" :
                    selectedItem.rarity === "rare" ? "bg-blue-600" :
                    selectedItem.rarity === "uncommon" ? "bg-green-600" :
                    "bg-gray-600"
                  }`}>
                    {selectedItem.rarity?.charAt(0).toUpperCase() + selectedItem.rarity?.slice(1) || "Common"}
                  </Badge>
                </div>

                <Separator className="bg-gray-600" />

                {/* Context-sensitive action section */}
                {selectedItem.itemType === "EQUIPMENT" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-900/20 rounded border border-red-500">
                      <p className="text-sm text-red-300 font-medium">⚠️ WARNING: Equipment is PERMANENT!</p>
                      <p className="text-xs text-red-400 mt-1">
                        Once equipped, this item cannot be removed or transferred to other players.
                      </p>
                    </div>
                    <label className="text-sm font-medium text-gray-300">Equip on Player:</label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Choose a player..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {getEligiblePlayers(selectedItem).map((player) => (
                          <SelectItem key={player.id} value={player.id} className="text-white">
                            {/* */}
                            {player.firstName} {player.lastName} ({player.role}, {player.race})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={!selectedPlayer || useItemMutation.isPending}
                      onClick={() => useItemMutation.mutate({ 
                        item: selectedItem, 
                        playerId: selectedPlayer, 
                        action: "equip" 
                      })}
                    >
                      <User className="h-4 w-4 mr-2" />
                      ⚠️ PERMANENTLY EQUIP
                    </Button>
                  </div>
                )}

                {selectedItem.itemType === "CONSUMABLE_RECOVERY" && (
                  <>
                    {selectedItem.name.includes("medical") || selectedItem.name.includes("heal") ? (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Use on Injured Player:</label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Choose an injured player..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {getEligiblePlayers(selectedItem).map((player) => (
                              <SelectItem key={player.id} value={player.id} className="text-white">
                                {player.firstName} {player.lastName} ({player.injuryStatus})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full"
                          disabled={!selectedPlayer || useItemMutation.isPending}
                          onClick={() => useItemMutation.mutate({ 
                            item: selectedItem, 
                            playerId: selectedPlayer, 
                            action: "use_recovery" 
                          })}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Use on Player
                        </Button>
                      </div>
                    ) : selectedItem.name.includes("boost") || selectedItem.name.includes("tonic") || selectedItem.name.includes("potion") ? (
                      <Button 
                        className="w-full"
                        disabled={activeBoosts.length >= 3 || useItemMutation.isPending}
                        onClick={() => useItemMutation.mutate({ 
                          item: selectedItem, 
                          action: "activate_boost" 
                        })}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Activate for Next League Match
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Use on Player (Stamina Recovery):</label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Choose a player..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {getEligiblePlayers(selectedItem).map((player) => {
                              const currentStamina = player.dailyStaminaLevel || 100;
                              const maxStamina = 100;
                              const staminaPercentage = Math.round(currentStamina);
                              
                              return (
                                <SelectItem key={player.id} value={player.id} className="text-white">
                                  {player.firstName} {player.lastName} - {currentStamina}/100 ({staminaPercentage}%)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full"
                          disabled={!selectedPlayer || useItemMutation.isPending}
                          onClick={() => useItemMutation.mutate({ 
                            item: selectedItem, 
                            playerId: selectedPlayer, 
                            action: "use_recovery" 
                          })}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Use on Player
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {selectedItem.itemType === "GAME_ENTRY" && (
                  <div className="text-center py-4">
                    <Ticket className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                    <p className="text-gray-300 mb-4">
                      Tournament entries are automatically used when entering competitions.
                    </p>
                    <Button variant="outline" onClick={() => setShowItemModal(false)}>
                      Close
                    </Button>
                  </div>
                )}

                {selectedItem.itemType === "trophy" && (
                  <div className="text-center py-4">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                    <p className="text-gray-300 mb-4">
                      Trophies are permanent achievements that showcase your team's success.
                    </p>
                    <Button variant="outline" onClick={() => setShowItemModal(false)}>
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}