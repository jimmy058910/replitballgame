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

interface InventoryItem {
  id: string;
  itemType: string;
  name: string;
  description: string;
  rarity: string;
  quantity: number;
  metadata: any;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  injuryStatus: string;
  role: string;
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
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team inventory
  const { data: rawInventory = [] } = useQuery({
    queryKey: [`/api/inventory/${teamId}`],
    enabled: !!teamId,
  });
  const inventory = (rawInventory || []) as InventoryItem[];

  // Fetch team players for equipment/consumable usage
  const { data: rawPlayers = [] } = useQuery({
    queryKey: [`/api/teams/${teamId}/players`],
    enabled: !!teamId,
  });
  const players = (rawPlayers || []) as Player[];

  // Filter definitions according to project brief
  const filterOptions = [
    { id: "all", name: "All Items", icon: Package, count: inventory.length },
    { id: "equipment", name: "Equipment", icon: Shield, count: inventory.filter(item => item.itemType === "equipment").length },
    { id: "consumable", name: "Consumables", icon: Zap, count: inventory.filter(item => item.itemType === "consumable").length },
    { id: "tournament_entry", name: "Game Entries", icon: Ticket, count: inventory.filter(item => item.itemType === "tournament_entry").length },
    { id: "trophy", name: "Trophies", icon: Trophy, count: inventory.filter(item => item.itemType === "trophy").length },
  ];

  // Filter inventory based on selected filter
  const filteredInventory = selectedFilter === "all" 
    ? inventory 
    : inventory.filter(item => item.itemType === selectedFilter);

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

  // Get item icon based on type and name
  const getItemIcon = (item: InventoryItem) => {
    if (item.itemType === "equipment") {
      if (item.name.includes("helmet") || item.name.includes("helm")) return "🪖";
      if (item.name.includes("glove") || item.name.includes("grip")) return "🧤";
      if (item.name.includes("boot") || item.name.includes("cleat") || item.name.includes("tread")) return "👟";
      if (item.name.includes("armor") || item.name.includes("plate") || item.name.includes("aegis")) return "🛡️";
      return "⚔️";
    }
    if (item.itemType === "consumable") {
      if (item.name.includes("medical") || item.name.includes("heal")) return "💊";
      if (item.name.includes("stamina") || item.name.includes("recovery")) return "⚡";
      if (item.name.includes("boost") || item.name.includes("enhance")) return "💪";
      return "🧪";
    }
    if (item.itemType === "tournament_entry") return "🎫";
    if (item.itemType === "trophy") return "🏆";
    return "📦";
  };

  // Get item effect description
  const getItemEffect = (item: InventoryItem) => {
    const effects: Record<string, string> = {
      // Equipment effects
      "gryllstone_plated_helm": "+3 Power, +2 Stamina",
      "sylvan_barkwood_circlet": "+4 Agility, +2 Speed",
      "umbral_cowl": "+3 Agility, +1 Speed",
      "helm_of_command": "+2 Leadership (Cosmetic)",
      "boots_of_the_gryll": "+2 Power, +1 Stamina",
      "lumina_light_treads": "+3 Speed, +1 Agility",
      "sylvan_gripping_vines": "+2 Catching, +1 Agility",
      "umbral_shadowgrips": "+2 Agility, +1 Speed",
      "gryll_forged_plate": "+4 Power, +1 Stamina",
      "lumina_radiant_aegis": "+1 Leadership (Cosmetic)",
      
      // Consumable effects
      "basic_medical_kit": "Heals 25 Injury Recovery Points",
      "advanced_treatment": "Heals 50 Injury Recovery Points",
      "phoenix_elixir": "Fully heals any injury",
      "basic_stamina_drink": "Restores 25% stamina",
      "advanced_recovery_serum": "Restores 50% stamina",
      "speed_boost_tonic": "+3 Speed for one match",
      "power_surge_potion": "+3 Power for one match",
      "champion_blessing": "+2 to all stats for one match",
    };
    
    return effects[item.name] || "Provides various benefits";
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
        return apiRequest(`/api/injury-stamina/use-item`, "POST", {
          playerId,
          itemType: item.name.includes("stamina") ? "stamina" : "injury",
          effectValue: item.name.includes("phoenix") ? 100 : 
                       item.name.includes("advanced") ? 50 : 25
        });
      } else if (action === "activate_boost") {
        // Add to active boosts (would integrate with match system)
        const newBoost: ActiveBoost = {
          id: `${item.id}-${Date.now()}`,
          itemName: item.name,
          effect: getItemEffect(item)
        };
        setActiveBoosts(prev => [...prev, newBoost]);
        return { success: true, boost: newBoost };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/inventory/${teamId}`] });
      if (variables.action === "use_recovery") {
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
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
  const removeActiveBoost = (boostId: string) => {
    setActiveBoosts(prev => prev.filter(boost => boost.id !== boostId));
  };

  // Get eligible players for item usage
  const getEligiblePlayers = (item: InventoryItem) => {
    if (item.itemType === "equipment") {
      return players; // All players can equip items
    }
    if (item.itemType === "consumable") {
      if (item.name.includes("medical") || item.name.includes("heal")) {
        return players.filter(p => p.injuryStatus !== "Healthy");
      }
      return players; // All players can use stamina/boost items
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
                      {item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    
                    <p className="text-xs text-gray-400 mb-2">
                      {getItemEffect(item)}
                    </p>
                    
                    {/* Enhanced Item Details */}
                    {item.metadata?.statBoosts && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-400">Stat Boosts:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.metadata.statBoosts).map(([stat, value]: [string, any]) => (
                            <span key={stat} className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                              +{value} {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {item.metadata?.effect && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-400">Effect:</p>
                        <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          {item.metadata.effect} {item.metadata.effectValue && `(${item.metadata.effectValue})`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
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
                      
                      <span className="text-xs text-gray-500 capitalize">
                        {item.itemType.replace(/_/g, ' ')}
                      </span>
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
                          {boost.itemName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-400">
                          {boost.effect}
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
                {selectedItem.itemType === "equipment" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">Equip on Player:</label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Choose a player..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {getEligiblePlayers(selectedItem).map((player) => (
                          <SelectItem key={player.id} value={player.id} className="text-white">
                            {player.firstName} {player.lastName} ({player.role})
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
                        action: "equip" 
                      })}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Equip on Player
                    </Button>
                  </div>
                )}

                {selectedItem.itemType === "consumable" && (
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
                        <label className="text-sm font-medium text-gray-300">Use on Player:</label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Choose a player..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {getEligiblePlayers(selectedItem).map((player) => (
                              <SelectItem key={player.id} value={player.id} className="text-white">
                                {player.firstName} {player.lastName}
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
                          <Zap className="h-4 w-4 mr-2" />
                          Use on Player
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {selectedItem.itemType === "tournament_entry" && (
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