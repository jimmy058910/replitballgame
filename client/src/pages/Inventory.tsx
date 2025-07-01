import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";


export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("equipment");

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/inventory", team?.id],
    enabled: !!team?.id,
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary": return "bg-yellow-500 text-black";
      case "epic": return "bg-purple-500";
      case "rare": return "bg-blue-500";
      case "common": return "bg-gray-500";
      default: return "bg-gray-600";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "equipment": return "🛡️";
      case "trophy": return "🏆";
      case "tournament_entry": return "🎫";
      default: return "📦";
    }
  };

  const getEquipmentSlotIcon = (slot: string) => {
    switch (slot) {
      case "helmet": return "⛑️";
      case "chest": return "🦺";
      case "shoes": return "👟";
      case "gloves": return "🧤";
      default: return "🎒";
    }
  };

  const filteredInventory = inventory?.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = item.itemType === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const equipmentItems = filteredInventory.filter((item: any) => item.itemType === "equipment");
  const trophyItems = filteredInventory.filter((item: any) => item.itemType === "trophy");
  const tournamentItems = filteredInventory.filter((item: any) => item.itemType === "tournament_entry");

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Team Found</h2>
          <p className="text-gray-400">You need to create a team first to access your inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
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
            {filteredInventory.map((item: any) => (
              <Card key={item.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>
                        {item.itemType === "equipment" 
                          ? getEquipmentSlotIcon(item.metadata?.slot)
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
                    {item.itemType === "equipment" && item.metadata?.statBoosts && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Stat Boosts:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(item.metadata.statBoosts).map(([stat, boost]: [string, any]) => (
                            <div key={stat} className="flex justify-between">
                              <span className="capitalize">{stat}:</span>
                              <span className="text-green-400">+{boost}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trophy Achievement */}
                    {item.itemType === "trophy" && item.metadata?.achievement && (
                      <div className="p-3 bg-gray-700 rounded-lg">
                        <div className="text-sm font-semibold">Achievement:</div>
                        <div className="text-sm text-gray-300">{item.metadata.achievement}</div>
                      </div>
                    )}

                    {/* Tournament Entry Info */}
                    {item.itemType === "tournament_entry" && (
                      <div className="space-y-2">
                        {item.metadata?.tournamentType && (
                          <div className="text-sm">
                            <span className="text-gray-400">Type:</span>
                            <span className="ml-2 capitalize">{item.metadata.tournamentType}</span>
                          </div>
                        )}
                        {item.metadata?.entryFee && (
                          <div className="text-sm">
                            <span className="text-gray-400">Entry Fee:</span>
                            <span className="ml-2 text-yellow-400">{item.metadata.entryFee} credits</span>
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