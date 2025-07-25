import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Coins, Gem, TrendingUp, Building, Trophy, Gift, Star, Crown, CreditCard, Package } from "lucide-react";
import { useLocation } from 'wouter';
import TryoutSystem from "@/components/TryoutSystem";
import DynamicMarketplaceManager from "@/components/DynamicMarketplaceManager";
import FinancesTab from "@/components/FinancesTab";
import EnhancedInventoryHub from "@/components/EnhancedInventoryHub";

// Type interfaces
interface Team {
  id: string;
  name: string;
  credits: number;
}

interface TeamFinances {
  credits: number | string;
  gems: number;
  premiumCurrency: number;
  netRevenue: number;
  stadiumRevenue: number;
  maintenanceCosts: number;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price?: number;
  priceGems?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
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

// Remove hardcoded items - we'll fetch from API

const getTierColor = (tier: string): string => {
  const colors = {
    common: 'bg-gray-500',
    uncommon: 'bg-green-500', 
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500'
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

// Get item icon based on type and name
const getItemIcon = (item: any) => {
  const effect = item.effect || item.metadata?.effect;
  const itemName = item.name?.toLowerCase() || '';
  const slot = item.slot?.toLowerCase() || '';
  
  // Debug logging to check item structure
  console.log('Item for icon detection:', {
    name: item.name,
    itemType: item.itemType,
    category: item.category,
    slot: item.slot,
    effect: effect
  });
  
  // Team boost items
  if (effect?.includes("team_")) {
    return "🌟";
  }
  
  // Check by slot first (most reliable for equipment)
  if (slot === "helmet" || slot === "helm" || slot === "Helmet") {
    return "🪖";
  }
  if (slot === "gloves" || slot === "Gloves") {
    return "🧤";  
  }
  if (slot === "shoes" || slot === "boots" || slot === "Shoes") {
    return "👟";
  }
  if (slot === "armor" || slot === "chest" || slot === "Chest Armor") {
    return "🛡️";
  }
  
  // Equipment items (check multiple possible field values)
  if (item.itemType === "EQUIPMENT" || item.itemType === "equipment" || 
      item.category === "Equipment" || item.category === "equipment" ||
      slot) {
    // Check by name patterns
    if (itemName.includes("helmet") || itemName.includes("helm") || 
        itemName.includes("circlet") || itemName.includes("crest") || itemName.includes("cowl")) {
      return "🪖";
    }
    if (itemName.includes("glove") || itemName.includes("grip") || 
        itemName.includes("gauntlet") || itemName.includes("fist")) {
      return "🧤";
    }
    if (itemName.includes("boot") || itemName.includes("cleat") || 
        itemName.includes("tread") || itemName.includes("stride") || itemName.includes("greaves")) {
      return "👟";
    }
    if (itemName.includes("armor") || itemName.includes("plate") || 
        itemName.includes("aegis") || itemName.includes("mail") || 
        itemName.includes("tunic") || itemName.includes("pauldron") || itemName.includes("carrier")) {
      return "🛡️";
    }
    return "⚔️";
  }
  
  // Recovery items
  if (item.itemType === "CONSUMABLE_RECOVERY" || item.category === "Medical") {
    if (itemName.includes("medical") || itemName.includes("heal") || 
        itemName.includes("treatment") || itemName.includes("tincture") || itemName.includes("salve")) {
      return "🩹";
    }
    if (itemName.includes("stamina") || itemName.includes("recovery") || 
        itemName.includes("energy") || itemName.includes("serum") || itemName.includes("elixir")) {
      return "⚡";
    }
    return "🧪";
  }
  
  // Effect-based detection
  if (effect?.includes("stamina")) {
    return "⚡";
  }
  if (effect?.includes("injury")) {
    return "🩹";
  }
  
  if (item.itemType === "GAME_ENTRY") return "🎫";
  if (item.itemType === "trophy") return "🏆";
  return "📦";
};

export default function Market() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [storeTab, setStoreTab] = useState("featured");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: rawTeam } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  const { data: teamFinances } = useQuery<TeamFinances>({
    queryKey: ["/api/teams/" + rawTeam?.id + "/finances"],
    enabled: !!rawTeam?.id
  });

  // Fetch Gem Store items (gem-only items)
  const { data: gemStoreData } = useQuery({
    queryKey: ["/api/store/"],
    select: (data: any) => {
      const gemItems = data?.consumables || [];
      console.log('Gem store items:', gemItems.length, gemItems);
      return gemItems;
    }
  });

  // Fetch Unified Store Data (Master Economy v5 - 8-item daily rotation)
  const { data: unifiedStoreData } = useQuery({
    queryKey: ["/api/store/items"],
    select: (data: any) => {
      // Master Economy v5 returns dailyItems array with 8 items containing mixed equipment and consumables
      const dailyItems = data?.dailyItems || [];
      console.log('Unified store items:', dailyItems.length, dailyItems);
      return dailyItems;
    }
  });

  const gemItems = gemStoreData || [];
  const unifiedItems = unifiedStoreData || [];

  const team = (rawTeam || {}) as Team;

  // Fetch gem packages
  const { data: gemPackagesData } = useQuery({
    queryKey: ["/api/store/gem-packages"],
    select: (data: any) => data?.data || []
  });

  // Fetch Realm Pass data
  const { data: realmPassData } = useQuery({
    queryKey: ["/api/store/realm-pass"],
    select: (data: any) => data?.data || {}
  });

  const gemPackages = gemPackagesData || [];
  const realmPass = realmPassData || {};

  // Purchase mutations
  const purchaseWithGemsMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/store/purchase/${itemId}`, 'POST', { currency: 'gems' }),
    onSuccess: (data, itemId) => {
      const item = [...gemItems, ...unifiedItems].find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with gems.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/"] });
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
      const item = [...gemItems, ...unifiedItems].find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with credits.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/"] });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Not enough credits or item unavailable.",
        variant: "destructive",
      });
    },
  });

  // Gem Exchange mutation
  const gemExchangeMutation = useMutation({
    mutationFn: (gemAmount: number) =>
      apiRequest('/api/store/exchange-gems', 'POST', { gemAmount }),
    onSuccess: (data, gemAmount) => {
      toast({
        title: "Gem Exchange Successful!",
        description: `Exchanged ${gemAmount} gems for ${(data as any)?.data?.creditsReceived?.toLocaleString() || '0'} credits.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/" + rawTeam?.id + "/finances"] });
    },
    onError: () => {
      toast({
        title: "Exchange Failed",
        description: "Not enough gems or transaction failed.",
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

  const handleGemExchange = (gems: number, credits: number) => {
    gemExchangeMutation.mutate(gems);
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
                  ₡{(parseInt(teamFinances?.credits as string) || teamFinances?.credits || team?.credits || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Gem className="h-6 w-6 text-blue-300 mr-2" />
                  <span className="text-white font-medium">Premium Gems</span>
                </div>
                <div className="text-2xl font-bold text-blue-300 mb-2">
                  💎{(teamFinances?.premiumCurrency || teamFinances?.gems || 0).toLocaleString()}
                </div>
                {(teamFinances?.premiumCurrency || teamFinances?.gems || 0) <= 10 && (
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('gems')}
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="marketplace">Player Marketplace</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="ads">Ad Rewards</TabsTrigger>
            <TabsTrigger value="gems">Buy Gems</TabsTrigger>
            <TabsTrigger value="realm-pass">Realm Pass</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <DynamicMarketplaceManager teamId={team?.id} />
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Team Inventory
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your equipment, consumables, and boosts
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedInventoryHub teamId={team?.id} />
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
                  Purchase equipment, consumables, and more
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Daily Rotating Items - No more tabs */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Daily Rotating Items</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      8 items with mixed equipment and consumables, refreshes daily at 3AM EDT
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {unifiedItems.map((item: any) => {
                      // Debug logging to see item structure
                      console.log('🔍 Market Item Debug:', {
                        name: item.name,
                        raceRestriction: item.raceRestriction,
                        statEffects: item.statEffects,
                        effect: item.effect,
                        slot: item.slot
                      });
                      return (
                        <Card key={item.id} className="border-2 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getItemIcon(item)}</span>
                              <h4 className="font-medium text-lg">{item.name}</h4>
                            </div>
                            <Badge className={`${getTierColor(item.tier || item.rarity)} text-white text-xs`}>
                              {(item.tier || item.rarity)?.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                            {item.description && <p className="text-xs">{item.description}</p>}
                            
                            {/* Race Restriction */}
                            {item.raceRestriction && item.raceRestriction !== 'universal' && (
                              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                <strong>Race:</strong> {item.raceRestriction === 'LUMINA' ? 'Lumina' : 
                                                        item.raceRestriction === 'GRYLL' ? 'Gryll' : 
                                                        item.raceRestriction === 'SYLVAN' ? 'Sylvan' : 
                                                        item.raceRestriction === 'UMBRA' ? 'Umbra' : 
                                                        item.raceRestriction === 'HUMAN' ? 'Human' : 
                                                        item.raceRestriction.charAt(0).toUpperCase() + item.raceRestriction.slice(1).toLowerCase()} only
                              </p>
                            )}
                            
                            {/* Equipment Slot */}
                            {item.slot && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                <strong>Equipment Slot:</strong> {item.slot}
                              </p>
                            )}

                            {/* Stat Effects (for equipment) */}
                            {item.statEffects && Object.keys(item.statEffects).length > 0 && (
                              <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                <strong>Player Benefits:</strong> {Object.entries(item.statEffects).map(([stat, value]: [string, any]) => 
                                  `${stat === 'stamina' ? 'Stamina' : 
                                    stat === 'leadership' ? 'Leadership' : 
                                    stat === 'throwing' ? 'Throwing' : 
                                    stat === 'power' ? 'Power' : 
                                    stat === 'agility' ? 'Agility' : 
                                    stat === 'catching' ? 'Catching' : 
                                    stat === 'kicking' ? 'Kicking' : 
                                    stat === 'speed' ? 'Speed' : 
                                    stat.charAt(0).toUpperCase() + stat.slice(1)} ${value > 0 ? '+' : ''}${value}`
                                ).join(', ')}
                              </div>
                            )}

                            {/* Stat Boosts (backup for legacy items) */}
                            {item.statBoosts && Object.keys(item.statBoosts).length > 0 && (
                              <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                <strong>Player Benefits:</strong> {Object.entries(item.statBoosts).map(([stat, value]: [string, any]) => 
                                  `${stat === 'stamina' ? 'Stamina' : 
                                    stat === 'leadership' ? 'Leadership' : 
                                    stat === 'throwing' ? 'Throwing' : 
                                    stat === 'power' ? 'Power' : 
                                    stat === 'agility' ? 'Agility' : 
                                    stat === 'catching' ? 'Catching' : 
                                    stat === 'kicking' ? 'Kicking' : 
                                    stat === 'speed' ? 'Speed' : 
                                    stat.charAt(0).toUpperCase() + stat.slice(1)} ${value > 0 ? '+' : ''}${value}`
                                ).join(', ')}
                              </div>
                            )}
                            
                            {/* Effect */}
                            {item.effect && (
                              <div className={`text-xs p-2 rounded ${
                                item.effect.includes('team_') ? 
                                  'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' :
                                  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              }`}>
                                <strong>{item.effect.includes('team_') ? 'Team Effect:' : 'Player Effect:'}</strong> {
                                  item.effect.includes('team_leadership') ? `Team Leadership Boost +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('team_agility') ? `Team Agility Boost +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('team_stamina') ? `Team Stamina Boost +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('team_power') ? `Team Power Boost +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('team_all_stats') ? `Team All Stats Boost +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('restore_stamina') ? `Restores Stamina +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.includes('reduce_injury') ? `Reduces Injury ${item.effect.match(/\d+/)?.[0] || '?'} points` :
                                  item.effect.includes('heal_any_injury') ? `Heals Any Injury` :
                                  item.effect.includes('restore_team_stamina') ? `Restores Team Stamina +${item.effect.match(/\d+/)?.[0] || '?'}` :
                                  item.effect.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                                }
                              </div>
                            )}
                            
                            {/* Cosmetic */}
                            {item.cosmetic && (
                              <div className="text-xs text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 p-2 rounded">
                                <strong>Cosmetic Item</strong> - No stat effects
                              </div>
                            )}
                          </div>
                          
                          {/* Purchase Limit */}
                          {item.dailyLimit && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded mb-3">
                              <strong>Purchased {item.purchased || 0}/{item.dailyLimit} Today</strong>
                            </div>
                          )}
                          
                          {/* Purchase Buttons */}
                          <div className="flex gap-2">
                            {item.credits && (
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handlePurchase(item.id, 'credits')}
                                disabled={purchaseWithCreditsMutation.isPending || !item.canPurchase}
                              >
                                {item.canPurchase ? `₡${item.credits.toLocaleString()}` : 'Daily Limit Reached'}
                              </Button>
                            )}
                            {item.gems && (
                              <Button 
                                size="sm" 
                                className={`flex-1 ${item.canPurchase ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}
                                onClick={() => handlePurchase(item.id, 'gems')}
                                disabled={purchaseWithGemsMutation.isPending || !item.canPurchase}
                              >
                                {item.canPurchase ? `💎${item.gems}` : 'Daily Limit Reached'}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Game & Tournament Entries */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Game & Tournament Entries</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Purchase additional game opportunities and tournament entries
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-blue-600" />
                          Exhibition Game Entry
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <ul className="text-sm space-y-1 text-gray-600">
                            <li>• Additional exhibition match</li>
                            <li>• Extra player experience</li>
                            <li>• Match revenue opportunity</li>
                            <li>• Daily limit: 3 purchases</li>
                          </ul>
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1 bg-blue-600 hover:bg-blue-700" 
                              size="sm"
                              onClick={() => handlePurchase('exhibition_match_entry', 'gems')}
                            >
                              💎10 Gems
                            </Button>
                            <Button 
                              className="flex-1" 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePurchase('exhibition_match_entry', 'credits')}
                            >
                              ₡25,000
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 text-center">Purchased today: 0/3</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Crown className="h-5 w-5 text-orange-600" />
                          Tournament Entry
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <ul className="text-sm space-y-1 text-gray-600">
                            <li>• Special tournament participation</li>
                            <li>• Compete for exclusive rewards</li>
                            <li>• Enhanced prestige and recognition</li>
                            <li>• Daily limit: 1 purchase</li>
                          </ul>
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1 bg-orange-600 hover:bg-orange-700" 
                              size="sm"
                              onClick={() => handlePurchase('tournament_gem', 'gems')}
                            >
                              💎25 Gems
                            </Button>
                            <Button 
                              className="flex-1" 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePurchase('tournament_credit', 'credits')}
                            >
                              ₡150,000
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 text-center">Purchased today: 0/1</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
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



          <TabsContent value="ads">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Ad Rewards
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Watch ads to earn 500-10,000 credits. Daily limit: 10 ads. Halftime ads count toward daily limit.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h3 className="font-semibold text-green-800 mb-3">Daily Ad Rewards</h3>
                        <div className="text-2xl font-bold text-green-600 mb-2">₡500-10,000</div>
                        <p className="text-sm text-green-700 mb-1">Credit range per ad</p>
                        <p className="text-xs text-green-600 mb-4">Daily limit: 10 ads</p>
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                          Watch Ad for Credits
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-slate-800 border-slate-600 dark:bg-slate-800 dark:border-slate-600">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-blue-300 mb-3">Today's Progress</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white">Ads Watched Today</span>
                            <span className="text-sm font-bold text-green-400">0/10</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white">Credits Earned Today</span>
                            <span className="text-sm font-bold text-green-400">₡0</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{width: '0%'}}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800 border-slate-600 dark:bg-slate-800 dark:border-slate-600">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-purple-300 mb-3">Premium Box Progress</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white">Total Ads Watched</span>
                            <span className="text-sm font-bold text-purple-400">0/50</span>
                          </div>
                          <div className="text-xs text-purple-300">
                            Premium box contains: Rare items, bonus credits, special equipment
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{width: '0%'}}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-yellow-800 mb-2">💎 Premium Box Milestone</h3>
                      <p className="text-sm text-yellow-700">
                        Watch 50 ads total to unlock a premium reward box containing rare items, bonus credits, and exclusive equipment!
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gems">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5" />
                  Buy Premium Gems
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Purchase Premium Gems with real money for exclusive content
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gemPackages.map((gemPackage: any, index: number) => {
                    const isPopular = gemPackage.name.toLowerCase().includes('popular') || gemPackage.name.toLowerCase().includes('value');
                    const tierColors = ['blue', 'purple', 'orange', 'yellow', 'green'];
                    const color = tierColors[index % tierColors.length];
                    
                    return (
                      <Card key={gemPackage.id} className={`border-2 hover:border-${color}-400 transition-colors ${isPopular ? `border-${color}-400 ring-2 ring-${color}-200` : ''}`}>
                        <CardHeader className="text-center">
                          {isPopular && <Badge className={`mb-2 bg-${color}-600`}>Most Popular</Badge>}
                          <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                            <Gem className={`w-6 h-6 text-${color}-600`} />
                          </div>
                          <CardTitle className="text-lg">{gemPackage.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-3">
                          <div className="text-2xl font-bold">${gemPackage.price.toFixed(2)}</div>
                          <div className={`text-lg font-semibold text-${color}-600`}>
                            {gemPackage.gems + gemPackage.bonus} 💎
                          </div>
                          {gemPackage.bonus > 0 && (
                            <div className="text-sm text-green-600">+{gemPackage.bonus} Bonus!</div>
                          )}
                          <Button 
                            className={`w-full bg-${color}-600 hover:bg-${color}-700`}
                            onClick={() => setLocation(`/gem-checkout/${gemPackage.id}`)}
                          >
                            Purchase
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                {gemPackages.length === 0 && (
                  <div className="text-center py-8">
                    <Gem className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 text-lg">No gem packages available</p>
                    <p className="text-gray-400 text-sm mt-2">Check back later for gem purchase options</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Gem Exchange Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Gem Exchange
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exchange your gems for credits at competitive rates
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 10 Gems -> 4,000 Credits */}
                  <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                    <CardHeader className="text-center pb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Gem className="w-5 h-5 text-green-600" />
                      </div>
                      <CardTitle className="text-lg">Starter Pack</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="text-2xl font-bold text-green-600">₡4,000</div>
                      <div className="text-lg font-semibold text-gray-700">for 10 💎</div>
                      <div className="text-sm text-gray-500">Rate: 1:400</div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleGemExchange(10, 4000)}
                        disabled={!teamFinances || (teamFinances.gems || 0) < 10}
                      >
                        Exchange
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 50 Gems -> 22,500 Credits */}
                  <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="text-center pb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Gem className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">Value Pack</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="text-2xl font-bold text-blue-600">₡22,500</div>
                      <div className="text-lg font-semibold text-gray-700">for 50 💎</div>
                      <div className="text-sm text-gray-500">Rate: 1:450</div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleGemExchange(50, 22500)}
                        disabled={!teamFinances || (teamFinances.gems || 0) < 50}
                      >
                        Exchange
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 300 Gems -> 150,000 Credits */}
                  <Card className="border-2 border-purple-200 hover:border-purple-300 transition-colors">
                    <CardHeader className="text-center pb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Gem className="w-5 h-5 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg">Premium Pack</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="text-2xl font-bold text-purple-600">₡150,000</div>
                      <div className="text-lg font-semibold text-gray-700">for 300 💎</div>
                      <div className="text-sm text-gray-500">Rate: 1:500</div>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleGemExchange(300, 150000)}
                        disabled={!teamFinances || (teamFinances.gems || 0) < 300}
                      >
                        Exchange
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 1,000 Gems -> 550,000 Credits */}
                  <Card className="border-2 border-orange-200 hover:border-orange-300 transition-colors">
                    <CardHeader className="text-center pb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Gem className="w-5 h-5 text-orange-600" />
                      </div>
                      <CardTitle className="text-lg">Elite Pack</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="text-2xl font-bold text-orange-600">₡550,000</div>
                      <div className="text-lg font-semibold text-gray-700">for 1,000 💎</div>
                      <div className="text-sm text-gray-500">Rate: 1:550</div>
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleGemExchange(1000, 550000)}
                        disabled={!teamFinances || (teamFinances.gems || 0) < 1000}
                      >
                        Exchange
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">Exchange Information</h3>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Higher gem amounts offer better exchange rates</li>
                    <li>• All exchanges are permanent and cannot be reversed</li>
                    <li>• Your current gems: {(teamFinances?.gems || 0).toLocaleString()} 💎</li>
                    <li>• Your current credits: {(teamFinances?.credits || 0).toLocaleString()} ₡</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realm-pass">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Realm Pass Subscription
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monthly subscription for continuous premium benefits
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-w-2xl mx-auto">
                  <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                    <CardHeader className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-8 h-8 text-purple-600" />
                      </div>
                      <CardTitle className="text-2xl text-purple-800 dark:text-purple-200">
                        {realmPass.name || 'Realm Pass'}
                      </CardTitle>
                      <div className="text-3xl font-bold text-purple-600">
                        ${(realmPass.price || 9.95).toFixed(2)}/month
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="max-w-md mx-auto">
                        <div className="space-y-4">
                          <h3 className="font-bold text-lg text-purple-800 dark:text-purple-200 text-center">Premium Benefits:</h3>
                          
                          {/* Featured gem benefit */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-center gap-3">
                              <Gem className="w-8 h-8 text-blue-500" />
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {realmPass.monthlyGems || 350} Premium Gems
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">Every month</div>
                              </div>
                            </div>
                          </div>

                          {/* Other benefits */}
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <Star className="w-6 h-6 text-yellow-500" />
                              <span className="font-semibold text-yellow-700 dark:text-yellow-300">Ad-free experience</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                              <Trophy className="w-6 h-6 text-orange-500" />
                              <span className="font-semibold text-orange-700 dark:text-orange-300">Daily cache rewards</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Button 
                          size="lg" 
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => setLocation('/realm-pass-checkout')}
                        >
                          <Crown className="w-5 h-5 mr-2" />
                          Subscribe to Realm Pass
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Cancel anytime • Secure payment processing • No commitments
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances">
            <FinancesTab />
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
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Credits to Exchange</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400" 
                        placeholder="Enter amount..." 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Gems Received</label>
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 border rounded text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
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