import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
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
import ModernStickyHeader from "@/components/ModernStickyHeader";
import InventoryDisplay from "@/components/InventoryDisplay";
import EnhancedInventoryHub from "@/components/EnhancedInventoryHub";
import EnhancedMarketplace from "@/components/EnhancedMarketplace";
import { EnhancedInventoryTab } from "@/components/EnhancedInventoryTab";
import { EnhancedFinancesTab } from "@/components/EnhancedFinancesTab";
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
  effect?: string;
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
  bonus?: number; // bonus gems
  // @ts-expect-error TS2687
  popular?: boolean;
  // @ts-expect-error TS2687
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

interface GemPackage {
  id: string;
  name: string;
  // @ts-expect-error TS2687
  description: string;
  gems: number;
  bonus?: number;
  price: number;
  currency: string;
  // @ts-expect-error TS2687
  popular: boolean;
}

// Helper functions for item display
function getItemIcon(item: StoreItem) {
  if (item.slot) {
    if (item.slot.includes('Helmet') || item.slot.includes('Head')) return '🪖';
    if (item.slot.includes('Gloves') || item.slot.includes('Hands')) return '🧤';
    if (item.slot.includes('Boots') || item.slot.includes('Feet') || item.slot.includes('Shoes') || item.slot.includes('footwear')) return '👟';
    if (item.slot.includes('Armor') || item.slot.includes('Chest')) return '🛡️';
    if (item.slot.includes('Weapon') || item.slot.includes('Sword')) return '⚔️';
  }
  // Consumables
  if (item.name.toLowerCase().includes('stamina') || item.name.toLowerCase().includes('energy') || item.name.toLowerCase().includes('drink')) return '⚡';
  if (item.name.toLowerCase().includes('recovery') || item.name.toLowerCase().includes('medical') || item.name.toLowerCase().includes('treatment') || item.name.toLowerCase().includes('heal')) return '🩹';
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
  const { isAuthenticated } = useUnifiedAuth();
  const { toast } = useToast();
  const [gemsToExchange, setGemsToExchange] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  // Collapsible section state
  const [storeSectionOpen, setStoreSectionOpen] = useState(true);
  const [gemSectionOpen, setGemSectionOpen] = useState(true);
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
    select: (data: any) => {
      // API returns array directly from minimal backend
      const packages = Array.isArray(data) ? data : (data?.data || []);
      console.log('Gem packages received:', packages.length, packages);
      return packages;
    }
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
      const creditsReceived = data?.data?.creditsReceived || (gemAmount * 200);
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

  // Exhibition purchase mutation
  const exhibitionPurchaseMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/store/purchase/exhibition_credit', 'POST', { 
        currency: 'credits',
        expectedPrice: 1000
      }),
    onSuccess: () => {
      toast({
        title: "Exhibition Token Purchased!",
        description: "You can now play an additional exhibition match.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exhibitions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to purchase exhibition token. Check your credits.",
        variant: "destructive",
      });
    },
  });

  const handleExhibitionPurchase = () => {
    exhibitionPurchaseMutation.mutate();
  };

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
    <>
      <ModernStickyHeader />
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
                  <span className="text-white font-bold">₡{((team as any)?.finances?.credits || (team as any)?.credits || 0).toLocaleString()}</span>
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

      <div className="container mx-auto max-w-7xl p-4 space-y-6">
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
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleExhibitionPurchase()}
                      disabled={exhibitionPurchaseMutation.isPending}
                    >
                      {exhibitionPurchaseMutation.isPending ? 'Purchasing...' : 'Buy Additional'}
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
                        {storeItems.map((item) => {
                          // Debug logging to see item structure
                          console.log('🔍 MarketDistrict Item Debug:', {
                            name: item.name,
                            raceRestriction: item.raceRestriction,
                            statEffects: item.statEffects,
                            effect: item.effect,
                            slot: item.slot,
                            fullItem: item
                          });
                          return (
                          <Card key={item.id} className="border-2 hover:border-blue-300 transition-colors bg-gray-700 border-gray-600">
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getItemIcon(item)}</span>
                                  <h4 className="font-medium text-lg text-white">{item.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={`${getTierColor(item.tier)} text-white text-xs`}>
                                    {item.tier?.toUpperCase()}
                                  </Badge>
                                  {item.slot && (
                                    <Badge className="bg-gray-600 text-gray-200 text-xs">
                                      {item.slot}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Enhanced Item Information - Effects, Stats, Race Restrictions */}
                              <div className="space-y-2 mb-3">
                                {/* Item Description */}
                                {item.description && (
                                  <div className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded">
                                    <p className="leading-tight">{item.description}</p>
                                  </div>
                                )}
                                
                                {/* Race Restriction */}
                                {item.raceRestriction && (
                                  <div className="text-xs bg-purple-900/30 border border-purple-500/30 rounded p-2">
                                    <div className="flex items-center gap-1 text-purple-300">
                                      <span className="font-semibold">Race:</span>
                                      <span className="capitalize">{item.raceRestriction.toLowerCase()}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Stat Effects */}
                                {item.statEffects && Object.keys(item.statEffects).length > 0 && (
                                  <div className="text-xs bg-green-900/30 border border-green-500/30 rounded p-2">
                                    <div className="font-semibold text-green-300 mb-1">Stat Bonuses:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(item.statEffects).map(([stat, value]) => (
                                        <span key={stat} className="bg-green-700/50 text-green-200 px-2 py-1 rounded text-xs">
                                          +{String(value)} {stat.charAt(0).toUpperCase() + stat.slice(1)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Special Effect */}
                                {item.effect && (
                                  <div className="text-xs bg-blue-900/30 border border-blue-500/30 rounded p-2">
                                    <div className="flex items-center gap-1 text-blue-300">
                                      <span className="font-semibold">Effect:</span>
                                      <span className="capitalize">{item.effect.replace(/_/g, ' ')}</span>
                                    </div>
                                  </div>
                                )}
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
                          );
                        })}
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
                    {/* Gem Packages */}
                    {gemPackagesLoading ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading gem packages...</p>
                      </div>
                    ) : (gemPackages && gemPackages.length > 0) ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Gem className="h-5 w-5 text-blue-400" />
                          Gem Packages
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {gemPackages.map((pkg, index) => {
                            const totalGems = pkg.gems + (pkg.bonus || 0);
                            const colors = [
                              'border-green-500/30 bg-green-900/20', // Pouch
                              'border-blue-500/30 bg-blue-900/20',   // Sack  
                              'border-purple-500/30 bg-purple-900/20', // Crate
                              'border-orange-500/30 bg-orange-900/20', // Cart
                              'border-red-500/30 bg-red-900/20',     // Chest
                              'border-yellow-500/30 bg-yellow-900/20' // Vault
                            ];
                            const textColors = [
                              'text-green-300', 'text-blue-300', 'text-purple-300', 
                              'text-orange-300', 'text-red-300', 'text-yellow-300'
                            ];
                            const buttonColors = [
                              'bg-green-600 hover:bg-green-700', 
                              'bg-blue-600 hover:bg-blue-700',
                              'bg-purple-600 hover:bg-purple-700',
                              'bg-orange-600 hover:bg-orange-700',
                              'bg-red-600 hover:bg-red-700',
                              'bg-yellow-600 hover:bg-yellow-700'
                            ];
                            
                            return (
                              <Card key={pkg.id} className={`${colors[index]} border transition-all hover:scale-105`}>
                                <CardContent className="p-4 text-center">
                                  <div className="mb-3">
                                    <Gem className={`h-8 w-8 mx-auto mb-2 ${textColors[index]}`} />
                                    <h4 className="font-bold text-white">{pkg.name}</h4>
                                  </div>
                                  
                                  <div className="space-y-2 mb-4">
                                    <div className={`text-2xl font-bold ${textColors[index]}`}>
                                      ${pkg.price.toFixed(2)}
                                    </div>
                                    <div className="text-white">
                                      💎 {pkg.gems.toLocaleString()}
                                      {pkg.bonus && pkg.bonus > 0 && (
                                        <span className={`text-sm ${textColors[index]} font-semibold`}>
                                          {" "}+ {pkg.bonus.toLocaleString()} bonus
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      Total: {totalGems.toLocaleString()} gems
                                    </div>
                                  </div>
                                  
                                  <Button 
                                    className={`w-full ${buttonColors[index]} text-white font-bold`}
                                    onClick={() => {
                                      // Future: integrate with Stripe payment
                                      toast({
                                        title: "Payment System",
                                        description: `${pkg.name} - $${pkg.price.toFixed(2)} payment integration coming soon`,
                                      });
                                    }}
                                  >
                                    Purchase
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <Gem className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No gem packages available at this time.</p>
                          <p className="text-sm mt-2">Check back later for premium offers!</p>
                        </div>
                      </div>
                    )}

                    {/* Realm Pass */}
                    <div className="border-t border-gray-600 pt-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-400" />
                        Realm Pass Subscription
                      </h3>
                      <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-800/30 border-yellow-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Crown className="h-6 w-6 text-yellow-400" />
                              <div>
                                <h4 className="text-lg font-bold text-yellow-300">Realm Pass</h4>
                                <p className="text-sm text-yellow-200">Premium monthly subscription</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-yellow-300">$9.99</p>
                              <p className="text-sm text-yellow-200">per month</p>
                            </div>
                          </div>
                          
                          <div className="text-sm text-yellow-200 mb-4 space-y-1">
                            • Monthly gem allowance: 350 💎
                            • Ad-free experience
                            • Daily cache rewards
                            • Future cosmetic items
                          </div>
                          
                          <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold">
                            Subscribe
                          </Button>
                        </CardContent>
                      </Card>
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
                          { gems: 10, credits: 2000, ratio: 200, label: "Starter" },
                          { gems: 50, credits: 11250, ratio: 225, label: "Popular" },
                          { gems: 300, credits: 75000, ratio: 250, label: "Best Value" },
                          { gems: 1000, credits: 275000, ratio: 275, label: "Bulk" }
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
            {(team as any)?.id && (
              <EnhancedInventoryTab teamId={(team as any).id.toString()} />
            )}
            {!(team as any)?.id && (
              <div className="text-center py-8">
                <p className="text-gray-400">Please log in to access your inventory.</p>
              </div>
            )}
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-4">
            {(team as any)?.id && (
              <EnhancedFinancesTab teamId={(team as any).id.toString()} />
            )}
            {!(team as any)?.id && (
              <div className="text-center py-8">
                <p className="text-gray-400">Please log in to access financial data.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}