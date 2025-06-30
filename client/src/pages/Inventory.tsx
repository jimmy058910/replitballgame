import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { apiRequest } from "@/lib/queryClient";
import type { Team } from "shared/schema";

// Define interfaces for Inventory data
interface EquipmentMetadata {
  slot: string;
  statBoosts: Record<string, number>;
  // Add other equipment-specific metadata fields if any
}

interface TrophyMetadata {
  achievement: string;
  // Add other trophy-specific metadata fields if any
}

interface TournamentEntryMetadata {
  tournamentType: string;
  entryFee: number;
  // Add other entry-specific metadata fields if any
}

type ItemMetadata = EquipmentMetadata | TrophyMetadata | TournamentEntryMetadata | Record<string, any>; // Fallback for other/unknown types

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  itemType: "equipment" | "trophy" | "tournament_entry" | string; // Allow other strings for flexibility
  rarity: string;
  quantity: number;
  metadata?: ItemMetadata;
}


export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("equipment");

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
  });
  const team = teamQuery.data as Team | undefined;
  const isLoadingTeam = teamQuery.isLoading;

  const inventoryQuery = useQuery({
    queryKey: ["inventory", team?.id],
    queryFn: (): Promise<InventoryItem[]> => apiRequest(`/api/inventory${team?.id ? `?teamId=${team.id}` : ''}`),
    enabled: !!team?.id,
  });
  const inventory = inventoryQuery.data as InventoryItem[] | undefined;
  const inventoryLoading = inventoryQuery.isLoading;


  const getRarityColor = (rarity: string | undefined) => {
    switch (rarity) {
      case "legendary": return "bg-yellow-500 text-black";
      case "epic": return "bg-purple-500";
      case "rare": return "bg-blue-500 text-white"; // ensure text visibility
      case "common": return "bg-gray-500 text-white"; // ensure text visibility
      default: return "bg-gray-600 text-white"; // ensure text visibility
    }
  };

  const getCategoryIcon = (category: string | undefined) => {
    switch (category) {
      case "equipment": return "🛡️";
      case "trophy": return "🏆";
      case "tournament_entry": return "🎫";
      default: return "📦";
    }
  };

  const getEquipmentSlotIcon = (slot: string | undefined) => {
    switch (slot) {
      case "helmet": return "⛑️";
      case "chest": return "🦺";
      case "shoes": return "👟";
      case "gloves": return "🧤";
      default: return "🎒";
    }
  };

  const filteredInventory = inventory?.filter((item: InventoryItem) => {
    const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || descMatch;
    const matchesCategory = item.itemType === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const equipmentItems = filteredInventory.filter((item: InventoryItem) => item.itemType === "equipment");
  const trophyItems = filteredInventory.filter((item: InventoryItem) => item.itemType === "trophy");
  const tournamentItems = filteredInventory.filter((item: InventoryItem) => item.itemType === "tournament_entry");

  if (isLoadingTeam) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-400">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="font-orbitron text-3xl font-bold mb-6">Team Required</h1>
        <p className="text-gray-300 mb-8">Please create or select a team to access your inventory.</p>
      </div>
    </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Team Inventory</h1>
          <p className="text-gray-400">Manage your equipment, trophies, and tournament entries</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: "equipment", label: "Equipment" },
              { key: "trophy", label: "Trophies" },
              { key: "tournament_entry", label: "Entries" }
            ].map((category) => (
              <Button
                key={category.key}
                variant={selectedCategory === category.key ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.key)}
                size="sm"
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🛡️</span>
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipmentItems.length}</div>
              <p className="text-sm text-gray-400">Items available</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🏆</span>
                Trophies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trophyItems.length}</div>
              <p className="text-sm text-gray-400">Achievements earned</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🎫</span>
                Tournament Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tournamentItems.length}</div>
              <p className="text-sm text-gray-400">Available entries</p>
            </CardContent>
          </Card>
        </div>

        {/* All Items Grid */}
        {inventoryLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading inventory...</p>
          </div>
        ) : filteredInventory.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredInventory.map((item: InventoryItem) => (
              <Card key={item.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>
                        {item.itemType === "equipment" && item.metadata
                          ? getEquipmentSlotIcon((item.metadata as EquipmentMetadata).slot)
                          : getCategoryIcon(item.itemType)
                        }
                      </span>
                      {item.name}
                    </CardTitle>
                    <Badge className={getRarityColor(item.rarity)}>
                      {item.rarity}
                    </Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Equipment Stats */}
                    {item.itemType === "equipment" && item.metadata && typeof item.metadata === 'object' && 'statBoosts' in item.metadata && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Stat Boosts:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries((item.metadata as EquipmentMetadata).statBoosts).map(([stat, boost]) => (
                            <div key={stat} className="flex justify-between">
                              <span className="capitalize">{stat}:</span>
                              <span className="text-green-400">+{boost as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trophy Achievement */}
                    {item.itemType === "trophy" && item.metadata && typeof item.metadata === 'object' && 'achievement' in item.metadata && (
                      <div className="p-3 bg-gray-700 rounded-lg">
                        <div className="text-sm font-semibold">Achievement:</div>
                        <div className="text-sm text-gray-300">{(item.metadata as TrophyMetadata).achievement}</div>
                      </div>
                    )}

                    {/* Tournament Entry Info */}
                    {item.itemType === "tournament_entry" && item.metadata && typeof item.metadata === 'object' && 'tournamentType' in item.metadata && (
                      <div className="space-y-2">
                        {(item.metadata as TournamentEntryMetadata).tournamentType && (
                          <div className="text-sm">
                            <span className="text-gray-400">Type:</span>
                            <span className="ml-2 capitalize">{(item.metadata as TournamentEntryMetadata).tournamentType}</span>
                          </div>
                        )}
                        {(item.metadata as TournamentEntryMetadata).entryFee && (
                          <div className="text-sm">
                            <span className="text-gray-400">Entry Fee:</span>
                            <span className="ml-2 text-yellow-400">{(item.metadata as TournamentEntryMetadata).entryFee} credits</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Separator className="bg-gray-700" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Quantity:</span>
                      <span className="font-semibold">x{item.quantity}</span>
                    </div>
                    
                    {item.itemType === "equipment" && (
                      <Button className="w-full" variant="outline" size="sm">
                        Equip to Player
                      </Button>
                    )}
                    {item.itemType === "tournament_entry" && (
                      <Button className="w-full" variant="outline" size="sm">
                        Use Entry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
            <p className="text-gray-400">
              {selectedCategory === "all" 
                ? "Your inventory is empty. Complete matches and tournaments to earn items!"
                : `No ${selectedCategory.replace('_', ' ')} items found. Try adjusting your search or filter.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}