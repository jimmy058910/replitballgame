import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, Store, Coins, Package, Star, 
  Zap, Shield, Trophy, Clock, Users 
} from "lucide-react";

export default function Commerce() {
  const { toast } = useToast();
  const [bidAmount, setBidAmount] = useState<{ [key: string]: number }>({});

  const { data: storeData } = useQuery({
    queryKey: ["/api/store"],
  });

  const { data: adData } = useQuery({
    queryKey: ["/api/store/ads"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const { data: marketplacePlayers } = useQuery({
    queryKey: ["/api/marketplace/players"],
  });

  const { data: activeAuctions } = useQuery({
    queryKey: ["/api/auctions/active"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/store/ads"] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not complete purchase",
        variant: "destructive",
      });
    },
  });

  // Marketplace bid mutation
  const placeBidMutation = useMutation({
    mutationFn: async (data: { auctionId: string; bidAmount: number }) => {
      return await apiRequest("/api/auctions/bid", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Bid Placed",
        description: "Your bid has been submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Bid Failed",
        description: error.message || "Could not place bid",
        variant: "destructive",
      });
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "bg-yellow-600 text-white";
      case "epic": return "bg-purple-600 text-white";
      case "rare": return "bg-blue-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case "passer": return "text-blue-400";
      case "runner": return "text-green-400";
      case "blocker": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-8 w-8 text-green-400" />
          <h1 className="text-3xl font-bold font-orbitron">Store Hub</h1>
        </div>

        {/* Currency Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-400" />
                  <span>Inventory Items</span>
                </div>
                <span className="font-bold text-xl text-blue-400">
                  {storeData?.inventoryCount || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
          </TabsList>

          {/* Store Tab */}
          <TabsContent value="store" className="space-y-6">
            <Tabs defaultValue="premium" className="space-y-4">
              <TabsList className="bg-gray-800">
                <TabsTrigger value="premium">Premium Items</TabsTrigger>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="boosts">Entries</TabsTrigger>
              </TabsList>

              <TabsContent value="premium" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeData?.premiumItems?.map((item: any) => (
                    <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors">
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
                                <Badge key={stat} variant="outline" className="text-xs">
                                  {stat} +{value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-lg text-purple-400">
                              {item.price}
                            </span>
                            <span className="text-sm text-purple-400">💎</span>
                          </div>
                          <Button
                            onClick={() => purchaseItemMutation.mutate({
                              itemId: item.id,
                              currency: item.currency
                            })}
                            disabled={purchaseItemMutation.isPending}
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                          >
                            Buy with 💎
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <Card className="bg-gray-800 border-gray-700 col-span-full">
                      <CardContent className="text-center py-8">
                        <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">No premium items available</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeData?.items?.map((item: any) => (
                    <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-green-500 transition-colors">
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
                                <Badge key={stat} variant="outline" className="text-xs">
                                  {stat} +{value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-lg text-green-400">
                              {item.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-green-400">
                              {item.currency === 'credits' ? '₡' : '💎'}
                            </span>
                          </div>
                          <Button
                            onClick={() => purchaseItemMutation.mutate({
                              itemId: item.id,
                              currency: item.currency
                            })}
                            disabled={purchaseItemMutation.isPending}
                            variant="outline"
                            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                          >
                            {purchaseItemMutation.isPending ? "Purchasing..." : "Buy Equipment"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Loading equipment...</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="boosts" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeData?.tournamentEntries?.map((entry: any) => (
                    <Card key={entry.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
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
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>Daily Limit: {entry.dailyLimit}</span>
                            <span>Available: {entry.maxPurchases || entry.dailyLimit}</span>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-lg text-blue-400">
                                  {entry.price.toLocaleString()}
                                </span>
                                <span className="text-sm text-blue-400">₡</span>
                              </div>
                              <Button
                                onClick={() => purchaseItemMutation.mutate({
                                  itemId: entry.id,
                                  currency: 'credits'
                                })}
                                disabled={purchaseItemMutation.isPending}
                                variant="outline"
                                className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                                size="sm"
                              >
                                {purchaseItemMutation.isPending ? "Buying..." : "Buy with Credits"}
                              </Button>
                            </div>
                            
                            {entry.priceGems && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-lg text-purple-400">
                                    {entry.priceGems}
                                  </span>
                                  <span className="text-sm text-purple-400">💎</span>
                                </div>
                                <Button
                                  onClick={() => purchaseItemMutation.mutate({
                                    itemId: entry.id,
                                    currency: 'gems'
                                  })}
                                  disabled={purchaseItemMutation.isPending}
                                  variant="outline"
                                  className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                                  size="sm"
                                >
                                  {purchaseItemMutation.isPending ? "Buying..." : "Buy with Gems"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="text-center py-8">
                        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Loading tournament entries...</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Auctions */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  Active Auctions
                </h3>
                
                {activeAuctions && activeAuctions.length > 0 ? (
                  activeAuctions.map((auction: any) => (
                    <Card key={auction.id} className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{auction.playerName}</span>
                          </div>
                          <Badge className={getPositionColor(auction.position)}>
                            {auction.position}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Race: {auction.race}</div>
                          <div>Power: {auction.power}</div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-400">Current Bid</div>
                            <div className="font-bold text-yellow-400">
                              {auction.currentBid?.toLocaleString() || auction.startingPrice?.toLocaleString()} ₡
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Time Left</div>
                            <div className="font-bold text-red-400">
                              {auction.timeLeft || "2h 30m"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Bid amount"
                            value={bidAmount[auction.id] || ''}
                            onChange={(e) => setBidAmount({
                              ...bidAmount,
                              [auction.id]: Number(e.target.value)
                            })}
                            className="bg-gray-700 border-gray-600"
                          />
                          <Button
                            onClick={() => placeBidMutation.mutate({
                              auctionId: auction.id,
                              bidAmount: bidAmount[auction.id]
                            })}
                            disabled={!bidAmount[auction.id] || placeBidMutation.isPending}
                            variant="outline"
                            className="border-yellow-500 text-yellow-400"
                          >
                            Bid
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No active auctions</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Direct Purchase Players */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-400" />
                  Buy Now Players
                </h3>
                
                {marketplacePlayers && marketplacePlayers.length > 0 ? (
                  marketplacePlayers.filter((player: any) => player.marketplacePrice).map((player: any) => (
                    <Card key={player.id} className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{player.firstName} {player.lastName}</span>
                          </div>
                          <Badge className={getPositionColor(player.position)}>
                            {player.position}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Race: {player.race}</div>
                          <div>Power: {player.speed + player.power + player.throwing + player.catching + player.kicking}</div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-400">Buy Now Price</div>
                            <div className="font-bold text-green-400">
                              {player.marketplacePrice?.toLocaleString()} ₡
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="border-green-500 text-green-400"
                          >
                            Buy Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="text-center py-8">
                      <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No players available for direct purchase</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}