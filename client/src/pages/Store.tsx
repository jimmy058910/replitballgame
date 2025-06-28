import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, Coins, Package, Star, 
  Zap, Shield, Trophy, Clock, Gem, CreditCard
} from "lucide-react";

export default function Store() {
  const { toast } = useToast();

  const { data: storeData } = useQuery({
    queryKey: ["/api/store", Date.now()], // Cache busting for debugging
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  // Store purchase mutation
  const purchaseItemMutation = useMutation({
    mutationFn: async (data: { itemId: string; currency: string }) => {
      return await apiRequest("/api/store/purchase", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful",
        description: "Item added to your inventory",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store"] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (itemId: string, currency: string) => {
    purchaseItemMutation.mutate({ itemId, currency });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common": return "bg-gray-600";
      case "uncommon": return "bg-green-600";
      case "rare": return "bg-blue-600";
      case "epic": return "bg-purple-600";
      case "legendary": return "bg-orange-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-8 w-8 text-green-400" />
          <h1 className="text-3xl font-bold font-orbitron">Store Hub</h1>
        </div>

        {/* Currency Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-400" />
                  <span>Credits</span>
                </div>
                <span className="font-bold text-xl text-yellow-400">
                  {finances?.credits?.toLocaleString() || 0} ₡
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-400" />
                  <span>Premium Gems</span>
                </div>
                <span className="font-bold text-xl text-purple-400">
                  {finances?.premiumCurrency || 0} 💎
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="premium" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Gem className="h-4 w-4" />
              Premium
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="gems" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Buy Gems
            </TabsTrigger>
          </TabsList>

          {/* Premium Tab - Gem Only Items */}
          <TabsContent value="premium" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Premium Items (Gems Only)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeData?.dailyPremiumItems?.map((item: any) => (
                <Card key={item.itemId} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-lg">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-400 text-sm">{item.description}</p>
                    
                    {item.statBoosts && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Stat Boosts:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.statBoosts).map(([stat, value]) => (
                            <Badge key={stat} variant="secondary" className="text-xs">
                              {stat}: +{value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.raceRestrictions && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Race Restrictions:</p>
                        <div className="flex flex-wrap gap-1">
                          {item.raceRestrictions.map((race: string) => (
                            <Badge key={race} variant="outline" className="text-xs">
                              {race}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-purple-400" />
                        <span className="font-bold text-purple-400">{item.gemPrice} 💎</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(item.itemId, "gems")}
                        disabled={item.owned || (finances?.premiumCurrency || 0) < item.gemPrice}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {item.owned ? "Owned" : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Credits Tab - Credit Only Items */}
          <TabsContent value="credits" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Credit Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeData?.dailyCreditItems?.map((item: any) => (
                <Card key={item.itemId} className="bg-gray-800 border-gray-700 hover:border-yellow-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-lg">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-400 text-sm">{item.description}</p>
                    
                    {item.statBoosts && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Stat Boosts:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.statBoosts).map(([stat, value]) => (
                            <Badge key={stat} variant="secondary" className="text-xs">
                              {stat}: +{value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="font-bold text-yellow-400">{item.creditPrice?.toLocaleString()} ₡</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(item.itemId, "credits")}
                        disabled={item.owned || (finances?.credits || 0) < item.creditPrice}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {item.owned ? "Owned" : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Consumables Section */}
            <h3 className="text-lg font-semibold mt-8 mb-4">Consumables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeData?.consumables?.filter((item: any) => !item.isPremium).map((item: any) => (
                <Card key={item.itemId} className="bg-gray-800 border-gray-700 hover:border-green-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-lg">{item.name}</span>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-400 text-sm">{item.description}</p>
                    
                    {item.quantityOwned > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Owned: {item.quantityOwned}
                      </Badge>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="font-bold text-yellow-400">{item.creditPrice?.toLocaleString()} ₡</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(item.itemId, "credits")}
                        disabled={(finances?.credits || 0) < item.creditPrice}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Purchase
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Exhibition & Tournament Entries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeData?.entries?.map((entry: any) => (
                <Card key={entry.itemId} className={`bg-gray-800 border-gray-700 ${
                  entry.itemId === "entry_exhibition" ? "hover:border-blue-500" : "hover:border-gold-500"
                } transition-colors`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{entry.icon}</span>
                        <span className="text-lg">{entry.name}</span>
                      </div>
                      <Badge className={getRarityColor(entry.rarity)}>
                        {entry.rarity}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-400 text-sm">{entry.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Daily Limit: {entry.purchasedToday}/{entry.dailyLimit}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Purchase with:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Credits Option */}
                        <Button
                          onClick={() => handlePurchase(entry.itemId, "credits")}
                          disabled={!entry.canPurchase || (finances?.credits || 0) < entry.creditPrice}
                          size="sm"
                          variant="outline"
                          className="border-yellow-600 hover:bg-yellow-600"
                        >
                          <Coins className="h-4 w-4 mr-1" />
                          {entry.creditPrice?.toLocaleString()} ₡
                        </Button>
                        
                        {/* Gems Option */}
                        <Button
                          onClick={() => handlePurchase(entry.itemId, "gems")}
                          disabled={!entry.canPurchase || (finances?.premiumCurrency || 0) < entry.gemPrice}
                          size="sm"
                          variant="outline"
                          className="border-purple-600 hover:bg-purple-600"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          {entry.gemPrice} 💎
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Buy Gems Tab */}
          <TabsContent value="gems" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Purchase Premium Gems</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {storeData?.gemPackages?.map((pack: any) => (
                <Card key={pack.itemId} className={`bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors ${
                  pack.bonus === "BEST VALUE" ? "ring-2 ring-purple-500" : ""
                }`}>
                  <CardHeader>
                    <CardTitle className="text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">💎</span>
                        <span className="text-xl">{pack.name}</span>
                        {pack.bonus && (
                          <Badge className="bg-purple-600">
                            {pack.bonus}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {pack.gems} Gems
                    </div>
                    <p className="text-gray-400 text-sm">{pack.description}</p>
                    
                    <Button
                      size="lg"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Gem purchasing will be available soon!",
                        });
                      }}
                    >
                      ${pack.price}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 text-center">
                Premium Gems can be used to purchase exclusive items, speed up timers, and access special features.
                All purchases are secure and processed through our payment provider.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Rotation Timer */}
        {storeData?.nextRotation && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Store items rotate daily at 3AM server time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}