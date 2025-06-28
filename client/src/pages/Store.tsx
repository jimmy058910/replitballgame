import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Clock, Play, Gift, Sparkles, Zap, Star, Crown, Shield, Coins } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Store() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const { data: creditPackages } = useQuery({
    queryKey: ["/api/payments/packages"],
  });

  const { data: storeData } = useQuery({
    queryKey: ["/api/store/items"],
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async (purchase: any) => {
      return await apiRequest("/api/store/purchase", "POST", purchase);
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful",
        description: "Item has been added to your inventory!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const purchaseCreditPackage = useMutation({
    mutationFn: async (packageId: string) => {
      return await apiRequest("/api/payments/purchase", "POST", { packageId });
    },
    onSuccess: () => {
      toast({
        title: "Credits Purchased!",
        description: "Credits have been added to your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-500";
      case "rare": return "bg-blue-500";
      case "epic": return "bg-purple-500";
      case "legendary": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  // Mock data for store items since we need content
  const premiumItems = [
    {
      id: "premium-scout",
      name: "Premium Scout",
      description: "Unlock advanced scouting reports with detailed player analytics",
      icon: "🔍",
      price: 2500,
      currency: "credits",
      rarity: "epic",
      type: "service"
    },
    {
      id: "energy-boost",
      name: "Team Energy Boost",
      description: "Instantly restore 50% stamina to all players",
      icon: "⚡",
      price: 1000,
      currency: "credits",
      rarity: "rare",
      type: "consumable"
    },
    {
      id: "injury-protection",
      name: "Injury Protection",
      description: "Reduce injury risk by 75% for next 3 matches",
      icon: "🛡️",
      price: 3000,
      currency: "credits",
      rarity: "legendary",
      type: "protection"
    }
  ];

  const equipmentItems = [
    {
      id: "speed-boots",
      name: "Speed Boots",
      description: "Increase player speed by +3 for all positions",
      icon: "👟",
      price: 5000,
      currency: "credits",
      rarity: "epic",
      statBoosts: { speed: 3 },
      type: "equipment"
    },
    {
      id: "power-gloves",
      name: "Power Gloves",
      description: "Boost throwing and catching by +2",
      icon: "🧤",
      price: 4000,
      currency: "credits",
      rarity: "rare",
      statBoosts: { throwing: 2, catching: 2 },
      type: "equipment"
    },
    {
      id: "training-weights",
      name: "Training Weights",
      description: "Increase power and stamina by +2",
      icon: "🏋️",
      price: 3500,
      currency: "credits",
      rarity: "rare",
      statBoosts: { power: 2, stamina: 2 },
      type: "equipment"
    }
  ];

  const entryItems = [
    {
      id: "tournament-entry",
      name: "Premium Tournament Entry",
      description: "Enter exclusive tournaments with higher rewards",
      icon: "🏆",
      price: 10000,
      currency: "credits",
      rarity: "legendary",
      type: "entry"
    },
    {
      id: "exhibition-pass",
      name: "Exhibition Pass",
      description: "Play unlimited exhibition matches for 24 hours",
      icon: "🎮",
      price: 2000,
      currency: "credits",
      rarity: "rare",
      type: "entry"
    },
    {
      id: "league-promotion",
      name: "League Promotion Boost",
      description: "Double points earned in next 5 league matches",
      icon: "📈",
      price: 7500,
      currency: "credits",
      rarity: "epic",
      type: "entry"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Store Hub
            </h1>
            <p className="text-gray-400 mt-1">
              Purchase items, equipment, entries, and credits to enhance your team
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="text-green-400 font-bold">
                {finances?.credits?.toLocaleString() || 0}₡
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Crown className="h-4 w-4 text-purple-400" />
              <span className="text-purple-400 font-bold">
                {finances?.premiumCurrency?.toLocaleString() || 0}💎
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="premium" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="premium">Premium Items</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="credits">Credit Store</TabsTrigger>
          </TabsList>

          <TabsContent value="premium" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {premiumItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-white">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-white">
                          {item.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">₡</span>
                      </div>
                      <Button
                        onClick={() => purchaseItemMutation.mutate({
                          itemId: item.id,
                          currency: item.currency
                        })}
                        disabled={purchaseItemMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {purchaseItemMutation.isPending ? "Purchasing..." : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipmentItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-white">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.statBoosts && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-300">Stat Boosts:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.statBoosts).map(([stat, value]) => (
                            <Badge key={stat} variant="outline" className="text-xs text-green-400 border-green-400">
                              {stat}: +{value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-white">
                          {item.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">₡</span>
                      </div>
                      <Button
                        onClick={() => purchaseItemMutation.mutate({
                          itemId: item.id,
                          currency: item.currency
                        })}
                        disabled={purchaseItemMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {purchaseItemMutation.isPending ? "Purchasing..." : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="entries" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entryItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-white">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-white">
                          {item.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">₡</span>
                      </div>
                      <Button
                        onClick={() => purchaseItemMutation.mutate({
                          itemId: item.id,
                          currency: item.currency
                        })}
                        disabled={purchaseItemMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {purchaseItemMutation.isPending ? "Purchasing..." : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Purchase Credits</h2>
              <p className="text-gray-400">Get more credits to purchase items, equipment, and entries</p>
            </div>
            
            {creditPackages ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {creditPackages.map((pkg: any) => (
                  <Card key={pkg.id} className={`hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 ${pkg.popularTag ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-white">{pkg.name}</span>
                        {pkg.popularTag && (
                          <Badge className="bg-blue-600">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                      {pkg.description && (
                        <CardDescription className="text-gray-300">{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">
                          {pkg.credits?.toLocaleString()}₡
                        </div>
                        {pkg.bonusCredits > 0 && (
                          <div className="text-sm text-yellow-400">
                            +{pkg.bonusCredits?.toLocaleString()} bonus!
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          ${(pkg.price / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">USD</div>
                      </div>
                      
                      <Button
                        onClick={() => purchaseCreditPackage.mutate(pkg.id)}
                        disabled={purchaseCreditPackage.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {purchaseCreditPackage.isPending ? "Processing..." : "Purchase"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading credit packages...</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}