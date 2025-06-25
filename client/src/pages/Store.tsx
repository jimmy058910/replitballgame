import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Clock, Play, Gift, Sparkles, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Store() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  const { data: storeData } = useQuery({
    queryKey: ["/api/store"],
  });

  const { data: adData } = useQuery({
    queryKey: ["/api/store/ads"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
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

  const watchAdMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/store/watch-ad", {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Ad Reward Earned",
        description: data.reward,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/store/ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ad Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openMysteryBoxMutation = useMutation({
    mutationFn: async (boxType: string) => {
      await apiRequest("/api/store/mystery-box", {
        method: "POST",
        body: JSON.stringify({ boxType }),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Mystery Box Opened",
        description: `You received: ${data.reward}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/store/ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Box Opening Failed",
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

  const getTimeUntilReset = () => {
    if (!storeData?.resetTime) return "Loading...";
    const now = new Date();
    const reset = new Date(storeData.resetTime);
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return "Resetting...";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Daily Store
            </h1>
            <p className="text-gray-400 mt-1">
              Fresh items daily, earn rewards through ads, and unlock mystery boxes
            </p>
          </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Resets in: {getTimeUntilReset()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400 font-bold">
              {finances?.credits?.toLocaleString() || 0}₡
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="store">Store Items</TabsTrigger>
          <TabsTrigger value="ads">Ad Rewards</TabsTrigger>
          <TabsTrigger value="premium">Premium Items</TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeData?.items?.map((item: any) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <Badge className={getRarityColor(item.rarity)}>
                      {item.rarity}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.statBoosts && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Stat Boosts:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.statBoosts).map(([stat, value]) => (
                          <Badge key={stat} variant="outline" className="text-xs">
                            {stat}: +{value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-lg">
                        {item.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-400">
                        {item.currency === "credits" ? "₡" : "💎"}
                      </span>
                    </div>
                    <Button
                      onClick={() => purchaseItemMutation.mutate({
                        itemId: item.id,
                        currency: item.currency
                      })}
                      disabled={purchaseItemMutation.isPending}
                      size="sm"
                    >
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Watch Ads for Rewards
                </CardTitle>
                <CardDescription>
                  Earn credits and mystery boxes by watching advertisements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ads watched total:</span>
                    <span className="font-bold">
                      {adData?.adsWatchedToday || 0}/50
                    </span>
                  </div>
                  <Progress value={((adData?.adsWatchedToday || 0) / 50) * 100} />
                  <p className="text-xs text-gray-400">
                    Counter resets after reaching 50 ads
                  </p>
                </div>
                
                <Button
                  onClick={() => watchAdMutation.mutate()}
                  disabled={watchAdMutation.isPending || (adData?.adsWatchedToday || 0) >= 50}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Ad (100-500₡)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Mystery Boxes
                </CardTitle>
                <CardDescription>
                  Unlock boxes earned through ad rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-gray-400" />
                      <span>Basic Boxes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {adData?.basicBoxes || 0}
                      </Badge>
                      <Button
                        onClick={() => openMysteryBoxMutation.mutate("basic")}
                        disabled={openMysteryBoxMutation.isPending || (adData?.basicBoxes || 0) === 0}
                        size="sm"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Premium Boxes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-500/20">
                        {adData?.premiumBoxes || 0}
                      </Badge>
                      <Button
                        onClick={() => openMysteryBoxMutation.mutate("premium")}
                        disabled={openMysteryBoxMutation.isPending || (adData?.premiumBoxes || 0) === 0}
                        size="sm"
                        variant="outline"
                        className="border-yellow-500"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 p-3 bg-gray-800 rounded">
                  <p>• Basic boxes: Earned every 5 ads watched</p>
                  <p>• Premium boxes: Earned after 50 ads watched</p>
                  <p>• Contains credits, items, and rare abilities</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="premium" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeData?.premiumItems?.map((item: any) => (
              <Card key={item.id} className="border-yellow-500/50 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <Badge className={getRarityColor(item.rarity)}>
                        {item.rarity}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.statBoosts && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Stat Boosts:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.statBoosts).map(([stat, value]) => (
                          <Badge key={stat} variant="outline" className="text-xs">
                            {stat}: +{value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-lg text-yellow-400">
                        {item.price}
                      </span>
                      <span className="text-sm text-yellow-400">💎</span>
                    </div>
                    <Button
                      onClick={() => purchaseItemMutation.mutate({
                        itemId: item.id,
                        currency: item.currency
                      })}
                      disabled={purchaseItemMutation.isPending}
                      variant="outline"
                      className="border-yellow-500 text-yellow-400"
                    >
                      Buy with 💎
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                Premium Currency
              </CardTitle>
              <CardDescription>
                Premium gems can be earned through tournaments, achievements, or special events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Your Premium Gems:</span>
                <span className="font-bold text-yellow-400 text-lg">
                  {finances?.premiumCurrency || 0} 💎
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}