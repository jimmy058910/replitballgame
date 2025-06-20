import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import MarketplaceItem from "@/components/MarketplaceItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAbilityById } from "@shared/abilities";

export default function Marketplace() {
  const [raceFilter, setRaceFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [marketplaceTab, setMarketplaceTab] = useState("players");
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState("all");
  const [equipmentSlotFilter, setEquipmentSlotFilter] = useState("all");
  const [equipmentPriceFilter, setEquipmentPriceFilter] = useState("all");
  const [listPlayerDialog, setListPlayerDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [listPrice, setListPrice] = useState("");
  const [listDuration, setListDuration] = useState("24");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: marketplacePlayers, isLoading } = useQuery({
    queryKey: ["/api/marketplace"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: marketplaceEquipment } = useQuery({
    queryKey: ["/api/marketplace/equipment"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  // Equipment purchase mutation
  const buyEquipmentMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest(`/api/marketplace/equipment/${itemId}/buy`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Equipment Purchased",
        description: "Equipment has been added to your inventory!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bidMutation = useMutation({
    mutationFn: async ({ playerId, amount }: { playerId: string; amount: number }) => {
      await apiRequest("/api/marketplace/bid", {
        method: "POST",
        body: JSON.stringify({ playerId, amount }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Bid Placed",
        description: "Your bid has been placed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error) => {
      toast({
        title: "Bid Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getPlayerRole = (player: any): string => {
    const { leadership, throwing, speed, agility, power, stamina } = player;
    
    if (leadership >= 7) return "Captain";
    if (throwing >= 8) return "Passer";
    if (speed >= 8 && agility >= 7) return "Runner";
    if (power >= 8 && stamina >= 7) return "Blocker";
    if (agility >= 8) return "Interceptor";
    if (stamina >= 8) return "Defender";
    return "Utility";
  };

  const filteredPlayers = marketplacePlayers?.filter((player: any) => {
    const matchesRace = raceFilter === "all" || player.race === raceFilter;
    const matchesRole = roleFilter === "all" || getPlayerRole(player) === roleFilter;
    const matchesPrice = priceFilter === "all" || (() => {
      const price = player.marketplacePrice || 0;
      switch(priceFilter) {
        case "low": return price < 50000;
        case "medium": return price >= 50000 && price < 200000;
        case "high": return price >= 200000;
        default: return true;
      }
    })();
    const matchesContract = contractFilter === "all" || (() => {
      const contract = player.contractPrice || 0;
      switch(contractFilter) {
        case "low": return contract < 5000;
        case "medium": return contract >= 5000 && contract < 15000;
        case "high": return contract >= 15000;
        default: return true;
      }
    })();
    const matchesSearch = searchTerm === "" || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRace && matchesRole && matchesPrice && matchesContract && matchesSearch;
  }) || [];

  const filteredEquipment = marketplaceEquipment?.filter((item: any) => {
    const matchesRarity = equipmentRarityFilter === "all" || item.rarity === equipmentRarityFilter;
    const matchesSlot = equipmentSlotFilter === "all" || item.slot === equipmentSlotFilter;
    const matchesPrice = equipmentPriceFilter === "all" || (() => {
      const price = item.marketplacePrice || 0;
      switch(equipmentPriceFilter) {
        case "low": return price < 10000;
        case "medium": return price >= 10000 && price < 50000;
        case "high": return price >= 50000;
        default: return true;
      }
    })();
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRarity && matchesSlot && matchesPrice && matchesSearch;
  }) || [];

  const handleBid = (playerId: string, amount: number) => {
    if (!team) {
      toast({
        title: "Error",
        description: "You need a team to place bids.",
        variant: "destructive",
      });
      return;
    }

    if (team.credits < amount) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits for this bid.",
        variant: "destructive",
      });
      return;
    }

    bidMutation.mutate({ playerId, amount });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">
            Buy and sell players to strengthen your team
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={marketplaceTab} onValueChange={setMarketplaceTab} className="mb-8">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="players" className="data-[state=active]:bg-blue-600">
              Players
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-blue-600">
              Equipment
            </TabsTrigger>
          </TabsList>

          {/* Player Filters */}
          <TabsContent value="players">
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle>Player Search & Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Search Players
                    </label>
                    <Input
                      type="text"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Race
                    </label>
                    <Select value={raceFilter} onValueChange={setRaceFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Races</SelectItem>
                        <SelectItem value="Human">Human</SelectItem>
                        <SelectItem value="Elf">Elf</SelectItem>
                        <SelectItem value="Dwarf">Dwarf</SelectItem>
                        <SelectItem value="Orc">Orc</SelectItem>
                        <SelectItem value="Halfling">Halfling</SelectItem>
                        <SelectItem value="Troll">Troll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role
                    </label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Captain">Captain</SelectItem>
                        <SelectItem value="Passer">Passer</SelectItem>
                        <SelectItem value="Runner">Runner</SelectItem>
                        <SelectItem value="Blocker">Blocker</SelectItem>
                        <SelectItem value="Interceptor">Interceptor</SelectItem>
                        <SelectItem value="Defender">Defender</SelectItem>
                        <SelectItem value="Utility">Utility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price Range
                    </label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="low">Under 50K</SelectItem>
                        <SelectItem value="medium">50K - 200K</SelectItem>
                        <SelectItem value="high">200K+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contract Cost
                    </label>
                    <Select value={contractFilter} onValueChange={setContractFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Contracts</SelectItem>
                        <SelectItem value="low">Under 5K</SelectItem>
                        <SelectItem value="medium">5K - 15K</SelectItem>
                        <SelectItem value="high">15K+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Filters */}
          <TabsContent value="equipment">
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle>Equipment Search & Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Search Equipment
                    </label>
                    <Input
                      type="text"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rarity
                    </label>
                    <Select value={equipmentRarityFilter} onValueChange={setEquipmentRarityFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Equipment Slot
                    </label>
                    <Select value={equipmentSlotFilter} onValueChange={setEquipmentSlotFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Slots</SelectItem>
                        <SelectItem value="helmet">Helmet</SelectItem>
                        <SelectItem value="armor">Armor</SelectItem>
                        <SelectItem value="boots">Boots</SelectItem>
                        <SelectItem value="gloves">Gloves</SelectItem>
                        <SelectItem value="weapon">Weapons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price Range
                    </label>
                    <Select value={equipmentPriceFilter} onValueChange={setEquipmentPriceFilter}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="low">Under 10K</SelectItem>
                        <SelectItem value="medium">10K - 50K</SelectItem>
                        <SelectItem value="high">50K+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Player Marketplace */}
        {marketplaceTab === "players" && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Available Players ({filteredPlayers.length})
              </h2>
              <div className="text-sm text-gray-400">
                Your Credits: {finances?.credits?.toLocaleString() || 0}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-4"></div>
                    <div className="h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded mb-4"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredPlayers.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-400 text-lg">No players match your filters</p>
                  <p className="text-gray-500 mt-2">Try adjusting your search criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map((player: any) => (
                  <MarketplaceItem
                    key={player.id}
                    player={player}
                    onBid={handleBid}
                    isLoading={bidMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Equipment Marketplace */}
        {marketplaceTab === "equipment" && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Available Equipment ({filteredEquipment.length})
              </h2>
              <div className="text-sm text-gray-400">
                Your Credits: {finances?.credits?.toLocaleString() || 0}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map((item: any) => (
                <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <Badge 
                          className={`text-xs ${
                            item.rarity === 'legendary' ? 'bg-yellow-600' :
                            item.rarity === 'epic' ? 'bg-purple-600' :
                            item.rarity === 'rare' ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          {item.rarity}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.slot}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Stat Boosts:</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.statBoosts).map(([stat, value]: [string, any]) => (
                          <Badge 
                            key={stat} 
                            variant="outline" 
                            className={`text-xs ${value > 0 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                          >
                            {stat}: {value > 0 ? '+' : ''}{value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold text-green-400">
                          {(item.marketplacePrice || item.marketValue || 0).toLocaleString()} credits
                        </p>
                        <p className="text-xs text-gray-500">Marketplace Item</p>
                      </div>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!finances || (finances.credits || 0) < (item.marketplacePrice || item.marketValue || 0) || buyEquipmentMutation.isPending}
                        onClick={() => buyEquipmentMutation.mutate(item.id)}
                      >
                        {buyEquipmentMutation.isPending ? "Buying..." : "Buy Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
