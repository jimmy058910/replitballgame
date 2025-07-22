import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import InventoryDisplay from "@/components/InventoryDisplay";
import PaymentHistory from "@/components/PaymentHistory";
import FinancialCenter from "@/components/FinancialCenter";
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
  Sword
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
}

interface MarketplaceItem {
  id: string;
  playerName: string;
  teamName: string;
  role: string;
  power: number;
  startingBid: number;
  currentBid?: number;
  timeRemaining: string;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  item: string;
  credits?: number;
  gems?: number;
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

  // Get team data for inventory and transactions
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

  const { data: marketplaceItems, isLoading: marketplaceLoading } = useQuery<MarketplaceItem[]>({
    queryKey: ['/api/marketplace/listings'],
    queryFn: () => apiRequest('/api/marketplace/listings'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
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

  const handlePurchase = (itemId: string, currency: 'credits' | 'gems') => {
    if (currency === 'gems') {
      purchaseWithGemsMutation.mutate(itemId);
    } else {
      purchaseWithCreditsMutation.mutate(itemId);
    }
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
      
      <div className="p-4">
        {/* Market District Header */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-white">Market</h1>
          <p className="text-gray-400">Trading, shopping, and economic center</p>
        </div>

        <Tabs defaultValue="finances" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="finances" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Finances
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* Financial Center Tab */}
          <TabsContent value="finances" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Financial Management Center
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Centralized financial dashboard with real-time updates and revenue tracking
                </p>
              </CardHeader>
              <CardContent>
                {team?.id && <FinancialCenter teamId={team.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Store Tab */}
          <TabsContent value="store" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                  Daily Rotating Items
                </CardTitle>
                <p className="text-sm text-gray-400">
                  8 items with mixed equipment and consumables, refreshes daily at 3AM EDT
                </p>
              </CardHeader>
              <CardContent>
                {storeLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
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
                          
                          <div className="text-sm text-gray-300 mb-4 space-y-2">
                            {/* Race Restriction */}
                            {item.raceRestriction && item.raceRestriction !== 'universal' && (
                              <p className="text-xs text-purple-400 font-medium">
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
                              <p className="text-xs text-blue-400 font-medium">
                                <strong>Equipment Slot:</strong> {item.slot}
                              </p>
                            )}

                            {/* Stat Effects */}
                            {item.statEffects && Object.keys(item.statEffects).length > 0 && (
                              <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No store items available</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                {marketplaceLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : marketplaceItems?.length ? (
                  <div className="space-y-4">
                    {marketplaceItems.map((item) => (
                      <div key={item.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-semibold">{item.playerName}</h4>
                          <p className="text-gray-300 text-sm">{item.teamName} • {item.role} • Power: {item.power}</p>
                          <p className="text-gray-400 text-xs">{item.timeRemaining}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">
                            {item.currentBid || item.startingBid}₡
                          </div>
                          <Button size="sm" className="mt-1">
                            {item.currentBid ? 'Bid' : 'Start Bid'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No marketplace listings available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {team?.id ? (
              <InventoryDisplay teamId={team.id.toString()} />
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Package className="h-5 w-5 text-orange-400" />
                    Your Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-400">Loading team data...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}