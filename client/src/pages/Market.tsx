import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Coins, Gem, TrendingUp, Building, Trophy, Gift, Star, Crown } from "lucide-react";
import TryoutSystem from "@/components/TryoutSystem";
import DynamicMarketplaceManager from "@/components/DynamicMarketplaceManager";

// Type interfaces
interface Team {
  id: string;
  name: string;
  credits: number;
}

interface TeamFinances {
  credits: number;
  gems: number;
  netRevenue: number;
  stadiumRevenue: number;
  maintenanceCosts: number;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  credits?: number;
  gems?: number;
  tier: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  category: string;
  dailyLimit?: number;
  purchased?: number;
}

const divisionRewards = [
  {
    division: 1,
    name: "Diamond League",
    champion: { credits: 1000000, gems: 500 },
    runnerUp: { credits: 750000, gems: 375 },
    regularWinner: { credits: 500000, gems: 250 }
  },
  {
    division: 2,
    name: "Platinum League", 
    champion: { credits: 800000, gems: 400 },
    runnerUp: { credits: 600000, gems: 300 },
    regularWinner: { credits: 400000, gems: 200 }
  },
  {
    division: 3,
    name: "Gold League",
    champion: { credits: 600000, gems: 300 },
    runnerUp: { credits: 450000, gems: 225 },
    regularWinner: { credits: 300000, gems: 150 }
  },
  {
    division: 4,
    name: "Silver League",
    champion: { credits: 400000, gems: 200 },
    runnerUp: { credits: 300000, gems: 150 },
    regularWinner: { credits: 200000, gems: 100 }
  },
  {
    division: 5,
    name: "Bronze League",
    champion: { credits: 250000, gems: 125 },
    runnerUp: { credits: 187500, gems: 94 },
    regularWinner: { credits: 125000, gems: 62 }
  },
  {
    division: 6,
    name: "Iron League",
    champion: { credits: 150000, gems: 75 },
    runnerUp: { credits: 112500, gems: 56 },
    regularWinner: { credits: 75000, gems: 37 }
  },
  {
    division: 7,
    name: "Stone League",
    champion: { credits: 75000, gems: 37 },
    runnerUp: { credits: 56250, gems: 28 },
    regularWinner: { credits: 37500, gems: 19 }
  },
  {
    division: 8,
    name: "Copper League",
    champion: { credits: 15000, gems: 0 },
    runnerUp: { credits: 11250, gems: 0 },
    regularWinner: { credits: 7500, gems: 0 }
  }
];

const featuredItems: StoreItem[] = [
  {
    id: "premium_helmet_1",
    name: "Elite Velocity Helmet",
    description: "Rare helmet that increases Speed by +3 for the entire season",
    gems: 25,
    credits: 15000,
    tier: "Rare",
    category: "Equipment",
    dailyLimit: 1
  },
  {
    id: "premium_boots_1", 
    name: "Legendary Swift Boots",
    description: "Legendary footwear providing +5 Speed and +2 Agility",
    gems: 75,
    credits: 45000,
    tier: "Legendary",
    category: "Equipment",
    dailyLimit: 1
  },
  {
    id: "premium_energy_1",
    name: "Epic Energy Drink",
    description: "Restores 50 stamina and provides +10% performance for 3 games",
    gems: 15,
    credits: 8000,
    tier: "Epic", 
    category: "Consumable",
    dailyLimit: 3
  },
  {
    id: "premium_training_1",
    name: "Advanced Training Session",
    description: "Permanent +2 to a random stat for selected player",
    gems: 50,
    credits: 30000,
    tier: "Epic",
    category: "Training",
    dailyLimit: 1
  }
];

const creditStoreItems: StoreItem[] = [
  {
    id: "basic_helmet_1",
    name: "Standard Team Helmet", 
    description: "Basic helmet providing +1 Power for the season",
    credits: 2500,
    tier: "Common",
    category: "Equipment",
    dailyLimit: 2
  },
  {
    id: "basic_energy_1",
    name: "Energy Booster",
    description: "Restores 25 stamina instantly",
    credits: 1500,
    tier: "Common", 
    category: "Consumable",
    dailyLimit: 5
  },
  {
    id: "uncommon_gloves_1",
    name: "Pro Catching Gloves",
    description: "Uncommon gloves providing +2 Catching for the season",
    credits: 5000,
    tier: "Uncommon",
    category: "Equipment", 
    dailyLimit: 1
  },
  {
    id: "basic_recovery_1",
    name: "Recovery Supplement",
    description: "Reduces injury recovery time by 1 day",
    credits: 3500,
    tier: "Uncommon",
    category: "Medical",
    dailyLimit: 3
  },
  {
    id: "basic_training_1", 
    name: "Basic Training Session",
    description: "Permanent +1 to a random stat for selected player",
    credits: 8000,
    tier: "Uncommon",
    category: "Training",
    dailyLimit: 2
  },
  {
    id: "basic_stamina_1",
    name: "Stamina Drink",
    description: "Restores 15 stamina and prevents fatigue for 1 game",
    credits: 2000,
    tier: "Common",
    category: "Consumable",
    dailyLimit: 4
  }
];

const getTierColor = (tier: string): string => {
  const colors = {
    Common: 'bg-gray-500',
    Uncommon: 'bg-green-500', 
    Rare: 'bg-blue-500',
    Epic: 'bg-purple-500',
    Legendary: 'bg-yellow-500'
  };
  return colors[tier as keyof typeof colors] || 'bg-gray-500';
};

const getDivisionColor = (division: number): string => {
  const colors = [
    'text-yellow-600', // Diamond
    'text-gray-600',   // Platinum  
    'text-orange-600', // Gold
    'text-gray-500',   // Silver
    'text-amber-600',  // Bronze
    'text-green-600',  // Iron
    'text-blue-600',   // Stone
    'text-red-600'     // Copper
  ];
  return colors[division - 1] || 'text-gray-600';
};

export default function Market() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [storeTab, setStoreTab] = useState("featured");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawTeam } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: teamFinances } = useQuery<TeamFinances>({
    queryKey: ["/api/teams/" + rawTeam?.id + "/finances"],
    enabled: !!rawTeam?.id
  });

  const team = (rawTeam || {}) as Team;

  // Purchase mutations
  const purchaseWithGemsMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/store/purchase/${itemId}`, 'POST', { currency: 'gems' }),
    onSuccess: (data, itemId) => {
      const item = [...featuredItems, ...creditStoreItems].find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with gems.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Not enough gems or item unavailable.",
        variant: "destructive",
      });
    },
  });

  const purchaseWithCreditsMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/store/purchase/${itemId}`, 'POST', { currency: 'credits' }),
    onSuccess: (data, itemId) => {
      const item = [...featuredItems, ...creditStoreItems].find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with credits.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Not enough credits or item unavailable.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (itemId: string, currency: 'gems' | 'credits') => {
    if (currency === 'gems') {
      purchaseWithGemsMutation.mutate(itemId);
    } else {
      purchaseWithCreditsMutation.mutate(itemId);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Fixed Header with Proper Contrast */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white dark:text-white flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-white" />
            Market Hub
          </h1>
          <p className="text-gray-200 dark:text-gray-200 mt-2">
            All transactions - buy, sell, trade players and items
          </p>
        </div>

        {/* Unified Financial Summary Panel with Purple Gradient */}
        <Card className="mb-6 bg-gradient-to-r from-purple-600 to-purple-800 border-purple-400">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="h-6 w-6 text-yellow-300 mr-2" />
                  <span className="text-white font-medium">Total Credits</span>
                </div>
                <div className="text-2xl font-bold text-yellow-300">
                  ₡{(teamFinances?.credits || team?.credits || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Gem className="h-6 w-6 text-blue-300 mr-2" />
                  <span className="text-white font-medium">Premium Gems</span>
                </div>
                <div className="text-2xl font-bold text-blue-300 mb-2">
                  💎{(teamFinances?.gems || 0).toLocaleString()}
                </div>
                {(teamFinances?.gems || 0) <= 10 && (
                  <Button
                    size="sm"
                    onClick={() => window.location.href = '/store'}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                  >
                    <Gem className="h-3 w-3 mr-1" />
                    Buy Gems
                  </Button>
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Building className="h-6 w-6 text-green-300 mr-2" />
                  <span className="text-white font-medium">Stadium Revenue</span>
                </div>
                <div className="text-xl font-bold text-green-300">
                  ₡{(teamFinances?.stadiumRevenue || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-white mr-2" />
                  <span className="text-white font-medium">Net Revenue</span>
                </div>
                <div className="text-xl font-bold text-white">
                  ₡{(teamFinances?.netRevenue || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="marketplace">Player Marketplace</TabsTrigger>
            <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="rewards">Division Rewards</TabsTrigger>
            <TabsTrigger value="exchange">Currency Exchange</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <DynamicMarketplaceManager teamId={team?.id} />
          </TabsContent>

          <TabsContent value="recruiting">
            <Card>
              <CardHeader>
                <CardTitle>Player Recruiting</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate new rookie players for your team
                </p>
              </CardHeader>
              <CardContent>
                <TryoutSystem teamId={team?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Store
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Purchase equipment, consumables, and training items
                </p>
              </CardHeader>
              <CardContent>
                <Tabs value={storeTab} onValueChange={setStoreTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="featured">Gem Store</TabsTrigger>
                    <TabsTrigger value="credit">Credit Store</TabsTrigger>
                  </TabsList>

                  <TabsContent value="featured" className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Premium Items - Daily Rotation</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        High-quality items available for Gems or Credits (rotating daily)
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featuredItems.map((item) => (
                        <Card key={item.id} className="border-2 border-purple-200 dark:border-purple-700">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{item.name}</h4>
                                <Badge className={`${getTierColor(item.tier)} text-white text-xs`}>
                                  {item.tier}
                                </Badge>
                              </div>
                              <div className="text-right">
                                {item.gems && (
                                  <div className="text-blue-600 font-bold">💎{item.gems}</div>
                                )}
                                {item.credits && (
                                  <div className="text-yellow-600 font-bold">₡{item.credits.toLocaleString()}</div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {item.description}
                            </p>
                            <div className="flex gap-2">
                              {item.gems && (
                                <Button 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => handlePurchase(item.id, 'gems')}
                                  disabled={purchaseWithGemsMutation.isPending}
                                >
                                  Buy with Gems
                                </Button>
                              )}
                              {item.credits && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => handlePurchase(item.id, 'credits')}
                                  disabled={purchaseWithCreditsMutation.isPending}
                                >
                                  Buy with Credits
                                </Button>
                              )}
                            </div>
                            {item.dailyLimit && (
                              <p className="text-xs text-gray-500 mt-2">
                                Daily limit: {item.dailyLimit} | Purchased: {item.purchased || 0}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="credit" className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Credit Store - Daily Rotation</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Basic and uncommon items available for Credits only
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {creditStoreItems.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium">{item.name}</h4>
                                <Badge className={`${getTierColor(item.tier)} text-white text-xs`}>
                                  {item.tier}
                                </Badge>
                              </div>
                              <div className="text-yellow-600 font-bold">
                                ₡{item.credits?.toLocaleString()}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {item.description}
                            </p>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handlePurchase(item.id, 'credits')}
                              disabled={purchaseWithCreditsMutation.isPending}
                            >
                              Purchase
                            </Button>
                            {item.dailyLimit && (
                              <p className="text-xs text-gray-500 mt-2">
                                Daily limit: {item.dailyLimit} | Purchased: {item.purchased || 0}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Division Rewards Structure
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Seasonal rewards for each division level
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {divisionRewards.map((division) => (
                    <Card key={division.division} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`text-lg font-bold ${getDivisionColor(division.division)}`}>
                            Division {division.division} - {division.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Crown className={`h-5 w-5 ${getDivisionColor(division.division)}`} />
                            <Star className={`h-5 w-5 ${getDivisionColor(division.division)}`} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Playoff Champion</h4>
                            <div className="text-lg font-bold">₡{division.champion.credits.toLocaleString()}</div>
                            {division.champion.gems > 0 && (
                              <div className="text-blue-600">💎{division.champion.gems}</div>
                            )}
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Playoff Runner-Up</h4>
                            <div className="text-lg font-bold">₡{division.runnerUp.credits.toLocaleString()}</div>
                            {division.runnerUp.gems > 0 && (
                              <div className="text-blue-600">💎{division.runnerUp.gems}</div>
                            )}
                          </div>
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                            <h4 className="font-semibold text-green-700 dark:text-green-300">Regular Season Winner</h4>
                            <div className="text-lg font-bold">₡{division.regularWinner.credits.toLocaleString()}</div>
                            {division.regularWinner.gems > 0 && (
                              <div className="text-blue-600">💎{division.regularWinner.gems}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exchange">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Currency Exchange
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exchange Credits for Premium Gems
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fixed contrast for exchange information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-800 text-white">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold mb-2">Basic Rate</h4>
                      <div className="text-2xl font-bold">600:1</div>
                      <p className="text-sm text-gray-300">₡600 = 💎1</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 text-white">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold mb-2">Bulk Rate (10+)</h4>
                      <div className="text-2xl font-bold text-green-300">500:1</div>
                      <p className="text-sm text-gray-300">₡500 = 💎1</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 text-white">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold mb-2">Premium Rate (50+)</h4>
                      <div className="text-2xl font-bold text-blue-300">450:1</div>
                      <p className="text-sm text-gray-300">₡450 = 💎1</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-slate-800 text-white">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Exchange Limits</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li>• Maximum 100 gems per day</li>
                      <li>• Minimum exchange: 1 gem (₡600)</li>
                      <li>• Better rates for larger exchanges</li>
                      <li>• Daily limit resets at 3 AM Eastern</li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h4 className="font-semibold">Exchange Credits</h4>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Credits to Exchange</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded" 
                        placeholder="Enter amount..." 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Gems Received</label>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 border rounded">
                        💎0
                      </div>
                    </div>
                    <Button className="mb-0">
                      Exchange
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}