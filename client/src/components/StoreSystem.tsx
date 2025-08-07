import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ShoppingCart, 
  Package, 
  Coins, 
  Gem, 
  Star, 
  Filter,
  Search,
  Plus
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  costCredits: number;
  costGems: number;
  category: string;
  rarity: string;
  icon: string;
  available: boolean;
  metadata?: any;
}

interface StoreSystemProps {
  teamId: string;
}

export default function StoreSystem({ teamId }: StoreSystemProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: storeItems = [] } = useQuery<StoreItem[]>({
    queryKey: ["/api/store/items"],
    enabled: !!teamId,
  });

  const { data: teamFinances } = useQuery<{ credits: number; gems: number }>({
    queryKey: [`/api/teams/${teamId}/finances`],
    enabled: !!teamId,
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity = 1 }: { itemId: string; quantity?: number }) => {
      return apiRequest(`/api/store/purchase`, "POST", { itemId, quantity, teamId });
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful",
        description: "Item added to your inventory!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/finances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/inventory/${teamId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not complete purchase",
        variant: "destructive",
      });
    },
  });

  const categories = ["all", "equipment", "consumable", "boost", "medical", "special"];
  
  const filteredItems = storeItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category.toLowerCase() === selectedCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const getItemIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'equipment': return '🛡️';
      case 'consumable': return '🧪';
      case 'boost': return '⚡';
      case 'medical': return '🩹';
      case 'special': return '✨';
      default: return '📦';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'epic': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'rare': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'uncommon': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const canAfford = (item: StoreItem) => {
    if (!teamFinances) return false;
    return (
      (item.costCredits === 0 || teamFinances.credits >= item.costCredits) &&
      (item.costGems === 0 || teamFinances.gems >= item.costGems)
    );
  };

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Store</h2>
          <p className="text-gray-400">Purchase items and equipment for your team</p>
        </div>
        
        {teamFinances && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-800/50 px-3 py-2 rounded-lg">
              <Coins className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-white font-semibold">
                {teamFinances.credits?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center bg-gray-800/50 px-3 py-2 rounded-lg">
              <Gem className="h-4 w-4 text-purple-400 mr-2" />
              <span className="text-white font-semibold">
                {teamFinances.gems?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Store Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="text-2xl">{getItemIcon(item.category)}</div>
                <Badge className={`text-xs ${getRarityColor(item.rarity)}`}>
                  {item.rarity}
                </Badge>
              </div>
              <CardTitle className="text-lg text-white">{item.name}</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {item.costCredits > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Coins className="h-3 w-3 text-yellow-400" />
                      <span className="text-white">{item.costCredits.toLocaleString()}</span>
                    </div>
                  )}
                  {item.costGems > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Gem className="h-3 w-3 text-purple-400" />
                      <span className="text-white">{item.costGems}</span>
                    </div>
                  )}
                </div>
                
                <Button
                  size="sm"
                  disabled={!canAfford(item) || purchaseItemMutation.isPending}
                  onClick={() => purchaseItemMutation.mutate({ itemId: item.id })}
                  className={canAfford(item) ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Buy
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Items Found</h3>
            <p className="text-gray-400">
              {searchTerm ? "Try adjusting your search terms." : "No items available in this category."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}