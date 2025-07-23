import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import InventoryDisplay from "@/components/InventoryDisplay";
import EnhancedMarketplace from "@/components/EnhancedMarketplace";
import FinancialCenter from "@/components/FinancialCenter";
import DynamicMarketplaceManager from "@/components/DynamicMarketplaceManager";
import StadiumOverview from "@/components/StadiumOverview";
import StadiumAtmosphereManager from "@/components/StadiumAtmosphereManager";
import { 
  Store, 
  Users, 
  TrendingUp, 
  Receipt, 
  Package, 
  DollarSign,
  ShoppingCart,
  BarChart3,
  Crown,
  Shield,
  Sword,
  ChevronDown,
  Gem,
  Zap,
  Trophy,
  Coins,
  ArrowRightLeft,
  Star,
  Calendar,
  Plus,
  Play,
  AlertCircle,
  Building,
  Gamepad2,
  CreditCard,
  ExternalLink,
  Filter,
  RefreshCw
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  description?: string;
  credits: number;
  gems?: number;
  tier: string;
  raceRestriction?: string;
  statEffects?: any;
  slot?: string;
  purchased: number;
  dailyLimit: number;
  canPurchase: boolean;
  category?: string;
}

interface GemExchangeRate {
  gems: number;
  credits: number;
  ratio: number;
}

interface GemPackage {
  id: string;
  name: string;
  price: number; // USD price
  gems: number;
  bonusGems?: number;
  popular?: boolean;
  description?: string;
}

interface RealmPassData {
  name: string;
  price: number; // Monthly price in USD
  monthlyGems: number;
  benefits: string[];
  active: boolean;
}

interface TeamFinancesData {
  credits: number;
  gems: number;
  projectedIncome: number;
  projectedExpenses: number;
  lastSeasonRevenue: number;
  lastSeasonExpenses: number;
  purchasedExhibitions?: number;
  purchasedTournamentEntries?: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface ContractData {
  id: string;
  playerId: string;
  playerName: string;
  role: string;
  age: number;
  race: string;
  salary: number;
  length: number;
  yearsRemaining: number;
}

// Helper functions for item display
function getItemIcon(item: StoreItem) {
  if (item.slot) {
    if (item.slot.includes('Helmet') || item.slot.includes('Head')) return '🪖';
    if (item.slot.includes('Gloves') || item.slot.includes('Hands')) return '🧤';
    if (item.slot.includes('Boots') || item.slot.includes('Feet')) return '👟';
    if (item.slot.includes('Armor') || item.slot.includes('Chest')) return '🛡️';
    if (item.slot.includes('Weapon') || item.slot.includes('Sword')) return '⚔️';
  }
  // Consumables
  if (item.name.toLowerCase().includes('stamina')) return '⚡';
  if (item.name.toLowerCase().includes('recovery') || item.name.toLowerCase().includes('medical')) return '🩹';
  if (item.name.toLowerCase().includes('boost') || item.name.toLowerCase().includes('team')) return '🌟';
  if (item.name.toLowerCase().includes('exhibition')) return '🎮';
  if (item.name.toLowerCase().includes('tournament')) return '🏆';
  return '📦';
}

function getTierColor(tier: string) {
  switch (tier?.toLowerCase()) {
    case 'legendary': return 'bg-orange-600';
    case 'epic': return 'bg-purple-600';
    case 'rare': return 'bg-blue-600';
    case 'uncommon': return 'bg-green-600';
    case 'common': 
    default: return 'bg-gray-600';
  }
}

export default function MarketDistrict() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [gemsToExchange, setGemsToExchange] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  // Collapsible section state
  const [storeSectionOpen, setStoreSectionOpen] = useState(true);
  const [gemSectionOpen, setGemSectionOpen] = useState(false);
  const [exchangeSectionOpen, setExchangeSectionOpen] = useState(false);

  // Get team and financial data
  const { data: team } = useQuery({
    queryKey: ['/api/teams/my'],
    queryFn: () => apiRequest('/api/teams/my'),
    enabled: isAuthenticated,
  });

  const { data: storeItems, isLoading: storeLoading } = useQuery<StoreItem[]>({
    queryKey: ['/api/store/items'],
    queryFn: () => apiRequest('/api/store/items'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    select: (data: any) => {
      // API returns { dailyItems: [...] } structure
      const dailyItems = data?.dailyItems || [];
      console.log('Store items received:', dailyItems.length, dailyItems);
      return dailyItems;
    }
  });

  const { data: gemPackages, isLoading: gemPackagesLoading } = useQuery<GemPackage[]>({
    queryKey: ['/api/store/gem-packages'],
    queryFn: () => apiRequest('/api/store/gem-packages'),
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/teams/transactions'],
    queryFn: () => apiRequest('/api/teams/transactions'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    }
  });

  // Purchase mutations
  const purchaseWithGemsMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/store/purchase/${itemId}`, 'POST', { currency: 'gems' }),
    onSuccess: (data, itemId) => {
      const item = storeItems?.find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with gems.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/items"] });
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
      const item = storeItems?.find(i => i.id === itemId);
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${item?.name} with credits.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/items"] });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Not enough credits or item unavailable.",
        variant: "destructive",
      });
    },
  });

  const gemExchangeMutation = useMutation({
    mutationFn: (gemAmount: number) =>
      apiRequest('/api/store/exchange-gems', 'POST', { gemAmount }),
    onSuccess: (data: any, gemAmount: number) => {
      const creditsReceived = data?.data?.creditsReceived || (gemAmount * 400);
      toast({
        title: "Exchange Successful!",
        description: `Exchanged ${gemAmount} gems for ₡${creditsReceived.toLocaleString()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: () => {
      toast({
        title: "Exchange Failed",
        description: "Not enough gems or exchange unavailable.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (itemId: string, currency: 'credits' | 'gems') => {
    if (currency === 'gems') {
      purchaseWithGemsMutation.mutate(itemId);
    } else {
      purchaseWithCreditsMutation.mutate(itemId);
    }
  };

  const calculateCreditsFromGems = (gems: number) => {
    // Basic exchange rate: 1 gem = 400 credits
    return gems * 400;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Market District.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dramatic Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-cyan-700 to-blue-800 opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.3),transparent_50%)]" />
        <div className="relative px-4 py-8 sm:py-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
              Market District
            </h1>
            <p className="text-lg sm:text-xl text-cyan-100 max-w-2xl mx-auto font-medium">
              Economic hub for trading, shopping, and financial management
            </p>
            
            {/* Financial Summary Bar */}
            {team && (
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm sm:text-base">
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                  <Coins className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-bold">₡{(team as any)?.finances?.credits?.toLocaleString() || (team as any)?.credits?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                  <Gem className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-bold">{(team as any)?.finances?.gems || (team as any)?.gems || 0} 💎</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                  <Building className="h-5 w-5 text-green-400" />
                  <span className="text-white font-bold">Stadium Revenue</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Tabs */}
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 h-auto p-1">
            <TabsTrigger value="store" className="flex flex-col items-center gap-1 py-3 px-2 text-xs sm:text-sm">
              <Store className="h-5 w-5" />
              Store
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex flex-col items-center gap-1 py-3 px-2 text-xs sm:text-sm">
              <Users className="h-5 w-5" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex flex-col items-center gap-1 py-3 px-2 text-xs sm:text-sm">
              <Package className="h-5 w-5" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="finances" className="flex flex-col items-center gap-1 py-3 px-2 text-xs sm:text-sm">
              <BarChart3 className="h-5 w-5" />
              Finances
            </TabsTrigger>
          </TabsList>

          {/* Store Tab - Enhanced with Progressive Disclosure */}
          <TabsContent value="store" className="space-y-6">
            {/* Daily Entries Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-900/50 to-emerald-800/30 border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-300">
                    <Play className="h-5 w-5" />
                    Exhibition Entry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Daily limit: 3</span>
                      <span className="text-green-400 font-bold">₡500</span>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      Buy Additional
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/50 to-violet-800/30 border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-300">
                    <Trophy className="h-5 w-5" />
                    Tournament Entry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Daily limit: 1</span>
                      <span className="text-purple-400 font-bold">₡2,000</span>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Buy Token
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Rotating Items */}
            <Collapsible open={storeSectionOpen} onOpenChange={setStoreSectionOpen}>
              <CollapsibleTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-400" />
                        Daily Rotating Items
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${storeSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    {storeLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-32 bg-gray-700 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : storeItems?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {storeItems.map((item) => (
                          <Card key={item.id} className="border-2 hover:border-blue-300 transition-colors bg-gray-700 border-gray-600">
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getItemIcon(item)}</span>
                                  <h4 className="font-medium text-lg text-white">{item.name}</h4>
                                </div>
                                <Badge className={`${getTierColor(item.tier)} text-white text-xs`}>
                                  {item.tier?.toUpperCase()}
                                </Badge>
                              </div>
                              
                              {/* Purchase Limit */}
                              {item.dailyLimit && (
                                <div className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded mb-3">
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
                                    {item.canPurchase ? `₡${item.credits.toLocaleString()}` : 'Limit Reached'}
                                  </Button>
                                )}
                                {item.gems && (
                                  <Button 
                                    size="sm" 
                                    className={`flex-1 ${item.canPurchase ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}
                                    onClick={() => handlePurchase(item.id, 'gems')}
                                    disabled={purchaseWithGemsMutation.isPending || !item.canPurchase}
                                  >
                                    {item.canPurchase ? `💎${item.gems}` : 'Limit Reached'}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No store items available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Gem Packages */}
            <Collapsible open={gemSectionOpen} onOpenChange={setGemSectionOpen}>
              <CollapsibleTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Gem className="h-5 w-5 text-blue-400" />
                        Gem Packages & Realm Pass
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${gemSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 space-y-6">
                    {/* Realm Pass */}
                    <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-800/30 border-yellow-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Crown className="h-6 w-6 text-yellow-400" />
                            <div>
                              <h3 className="text-lg font-bold text-yellow-300">Realm Pass</h3>
                              <p className="text-sm text-yellow-200">Premium monthly subscription</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-yellow-300">$9.99</p>
                            <p className="text-sm text-yellow-200">per month</p>
                          </div>
                        </div>
                        <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold">
                          Subscribe
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Realm Pass Coming Soon */}
                    <div className="text-center py-8">
                      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
                        <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                        <h4 className="text-white font-bold text-lg mb-2">Realm Pass Premium</h4>
                        <p className="text-gray-300 mb-4">
                          Monthly subscription with exclusive perks, bonus gems, and premium features
                        </p>
                        <div className="text-sm text-gray-400 mb-4">
                          • Monthly gem allowance<br/>
                          • Exclusive cosmetic items<br/>
                          • Priority queue access<br/>
                          • Advanced analytics dashboard
                        </div>
                        <Badge className="bg-purple-600 text-white px-4 py-1">
                          Coming Soon
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Gem Exchange with Backend Rates */}
            <Collapsible open={exchangeSectionOpen} onOpenChange={setExchangeSectionOpen}>
              <CollapsibleTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
                        Gem ↔ Credits Exchange
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${exchangeSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 space-y-6">
                    {/* Gem Exchange Purchase Options */}
                    <div>
                      <h4 className="text-white font-bold mb-3">Exchange Gem Packages</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { gems: 10, credits: 4000, ratio: 400, label: "Starter" },
                          { gems: 50, credits: 22500, ratio: 450, label: "Popular" },
                          { gems: 300, credits: 150000, ratio: 500, label: "Best Value" },
                          { gems: 1000, credits: 550000, ratio: 550, label: "Bulk" }
                        ].map((rate, index) => (
                          <Card key={index} className="bg-gray-700 border-gray-600 text-center hover:border-cyan-400 transition-colors">
                            <CardContent className="p-3">
                              <div className="text-purple-400 font-bold text-sm">{rate.gems} 💎</div>
                              <ArrowRightLeft className="h-3 w-3 text-gray-400 mx-auto my-1" />
                              <div className="text-green-400 font-bold text-sm">₡{rate.credits.toLocaleString()}</div>
                              <div className="text-gray-500 text-xs mb-2">1:{rate.ratio}</div>
                              <Badge className="mb-2 bg-blue-600 text-xs">
                                {rate.label}
                              </Badge>
                              <Button 
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs" 
                                size="sm"
                                onClick={() => gemExchangeMutation.mutate(rate.gems)}
                                disabled={gemExchangeMutation.isPending || ((team as any)?.finances?.gems || (team as any)?.gems || 0) < rate.gems}
                              >
                                {gemExchangeMutation.isPending ? 'Processing...' : 'Purchase'}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        Available Gems: {(team as any)?.finances?.gems || (team as any)?.gems || 0} 💎
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Player Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedMarketplace />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Package className="h-5 w-5 text-purple-400" />
                  Team Inventory & Boosts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(team as any)?.id && <InventoryDisplay teamId={(team as any).id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Financial Management Center
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Comprehensive financial overview with contracts, stadium, and projections
                </p>
              </CardHeader>
              <CardContent>
                {(team as any)?.id && <FinancialCenter teamId={(team as any).id} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}