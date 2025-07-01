import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConsumableManager } from "@/components/ConsumableManager";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("equipment");
  const [activeTab, setActiveTab] = useState("inventory");

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

  const getEquipmentSlotIcon = (slot: string) => {
    switch (slot) {
      case "helmet": return "🪖";
      case "jersey": return "👕";
      case "gloves": return "🧤";
      case "cleats": return "👟";
      default: return "⚡";
    }
  };

  // Safe filtering for inventory
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const filteredInventory = safeInventory.filter?.((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.itemType === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const equipmentItems = safeInventory.filter?.((item: any) => item.itemType === "equipment") || [];
  const trophyItems = safeInventory.filter?.((item: any) => item.itemType === "trophy") || [];
  const tournamentItems = safeInventory.filter?.((item: any) => item.itemType === "tournament_entry") || [];

  const categoryFilters = [
    { id: "all", name: "All", icon: "📦" },
    { id: "equipment", name: "Equipment", icon: "⚔️" },
    { id: "trophy", name: "Trophies", icon: "🏆" },
    { id: "tournament_entry", name: "Entries", icon: "🎫" }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Team Inventory</h1>
          <p className="text-lg text-gray-400 mb-6">
            Manage your equipment, consumables, trophies, and tournament entries
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="inventory">Equipment & Items</TabsTrigger>
            <TabsTrigger value="consumables">Consumables</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryFilters.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={selectedCategory === category.id 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-gray-700 text-gray-300 hover:bg-gray-800"
                    }
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>⚔️</span>
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
                              : item.itemType === "trophy"
                              ? "🏆"
                              : "🎫"
                            }
                          </span>
                          <span className="capitalize">{item.name.replace(/_/g, ' ')}</span>
                        </CardTitle>
                        <Badge className={getRarityColor(item.rarity || 'common')}>
                          {item.rarity || 'Common'}
                        </Badge>
                      </div>
                      <CardDescription className="text-gray-400">
                        {item.description || `A ${item.itemType.replace('_', ' ')} item`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        {/* Equipment Stats */}
                        {item.itemType === "equipment" && item.metadata?.statBoosts && (
                          <div className="p-3 bg-gray-700 rounded-lg">
                            <div className="text-sm font-semibold mb-2">Stat Boosts:</div>
                            <div className="space-y-1">
                              {Object.entries(item.metadata.statBoosts).map(([stat, boost]) => (
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
          </TabsContent>

          <TabsContent value="consumables">
            {team?.id && <ConsumableManager teamId={team.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}