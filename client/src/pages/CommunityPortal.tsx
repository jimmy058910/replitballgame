import { useState, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonalUI } from "@/hooks/useSeasonalUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StoreSystem from "@/components/StoreSystem";
import DynamicMarketplaceManager from "@/components/DynamicMarketplaceManager";
import { 
  ShoppingCart, Users, TrendingUp, Coins, Gem,
  Package, History, CreditCard, Store, Gavel
} from "lucide-react";

// Enhanced interfaces for Market District
interface Team {
  id: string;
  name: string;
}

interface Finances {
  credits: number;
  gems: number;
}

interface MarketplaceStats {
  activePlayers: number;
  averagePrice: number;
  totalTransactions: number;
  myListings: number;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  costCredits: number;
  costGems: number;
  category: string;
  rarity: string;
  icon: string;
}

interface Transaction {
  id: string;
  type: string;
  item: string;
  credits: number;
  gems: number;
  date: string;
  status: string;
}

type TabType = 'overview' | 'marketplace' | 'store' | 'inventory' | 'transactions';

export default function MarketDistrict() {
  const { isAuthenticated } = useAuth();
  const { seasonalState } = useSeasonalUI();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id,
  });

  const { data: marketplaceStats } = useQuery<MarketplaceStats>({
    queryKey: ["/api/marketplace/stats"],
    enabled: isAuthenticated,
  });

  const { data: featuredItems } = useQuery<StoreItem[]>({
    queryKey: ["/api/store/featured"],
    enabled: isAuthenticated,
  });

  const { data: recentTransactions } = useQuery<Transaction[]>({
    queryKey: [`/api/teams/${team?.id}/transactions`],
    enabled: !!team?.id,
  });

  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: [`/api/teams/${team?.id}/inventory`],
    enabled: !!team?.id,
  });

  const getItemIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'helmet': return '🪖';
      case 'gloves': return '🧤';
      case 'boots': return '👟';
      case 'armor': return '🛡️';
      case 'stamina': return '⚡';
      case 'medical': return '🩹';
      case 'boost': return '🌟';
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

  const formatCurrency = (amount: number, type: 'credits' | 'gems') => {
    if (type === 'gems') {
      return `${amount.toLocaleString()}💎`;
    }
    return `${amount.toLocaleString()}₡`;
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="font-orbitron text-3xl font-bold mb-6">Market District</h1>
          <p className="text-gray-300 mb-8">Create your team to access trading and store features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Market Overview */}
        <div className="hub-market rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-hero font-orbitron text-white">Market District</h1>
              <p className="text-purple-200">Trading, shopping & economics</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              {/* Credits Display */}
              <div className="flex items-center bg-gray-800/50 px-3 py-2 rounded-lg">
                <Coins className="h-4 w-4 text-yellow-400 mr-2" />
                <span className="text-white font-semibold">
                  {(finances?.credits || 0).toLocaleString()}
                </span>
                <span className="text-yellow-400 ml-1">₡</span>
              </div>
              
              {/* Gems Display */}
              <div className="flex items-center bg-gray-800/50 px-3 py-2 rounded-lg">
                <Gem className="h-4 w-4 text-purple-400 mr-2" />
                <span className="text-white font-semibold">
                  {(finances?.gems || 0).toLocaleString()}
                </span>
                <span className="text-purple-400 ml-1">💎</span>
              </div>
            </div>
          </div>

          {/* Market Quick Stats */}
          <div className="grid-stats">
            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Active Players</p>
                  <p className="text-xl font-bold text-blue-400">
                    {marketplaceStats?.activePlayers || 0}
                  </p>
                </div>
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Avg Price</p>
                  <p className="text-xl font-bold text-green-400">
                    {marketplaceStats?.averagePrice ? 
                      `${marketplaceStats.averagePrice.toLocaleString()}₡` : 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">My Listings</p>
                  <p className="text-xl font-bold text-purple-400">
                    {marketplaceStats?.myListings || 0}
                  </p>
                </div>
                <Gavel className="h-5 w-5 text-purple-400" />
              </div>
            </div>

            <div className="mobile-card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Inventory</p>
                  <p className="text-xl font-bold text-orange-400">
                    {inventoryItems?.length || 0}
                  </p>
                </div>
                <Package className="h-5 w-5 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Seasonal Trading Restrictions */}
        {seasonalState.disabledFeatures.includes('marketplace') && (
          <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
            <Package className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <strong>Trading Restricted:</strong> Player marketplace unavailable during {seasonalState.currentPhase.toLowerCase().replace('_', ' ')}.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
          
          {/* Mobile-Optimized Tab Navigation */}
          <div className="mb-6 overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full bg-gray-800 p-1">
              <TabsTrigger value="overview" className="touch-target flex-1 min-w-[90px]">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="touch-target flex-1 min-w-[100px]">
                <Gavel className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Trading</span>
              </TabsTrigger>
              <TabsTrigger value="store" className="touch-target flex-1 min-w-[80px]">
                <Store className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Store</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="touch-target flex-1 min-w-[90px]">
                <Package className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="touch-target flex-1 min-w-[90px]">
                <History className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            
            {/* Featured Store Items */}
            {featuredItems && featuredItems.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-purple-400" />
                    Featured Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid-mobile-cards">
                    {featuredItems.slice(0, 6).map((item) => (
                      <div key={item.id} className="mobile-card-interactive">
                        <div className="text-center mb-3">
                          <div className="text-2xl mb-2">{getItemIcon(item.category)}</div>
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <Badge className={`text-xs mt-1 ${getRarityColor(item.rarity)}`}>
                            {item.rarity}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                          
                          <div className="flex items-center justify-between">
                            {item.costCredits > 0 && (
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs">{item.costCredits.toLocaleString()}</span>
                              </div>
                            )}
                            {item.costGems > 0 && (
                              <div className="flex items-center gap-1">
                                <Gem className="h-3 w-3 text-purple-400" />
                                <span className="text-xs">{item.costGems}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {recentTransactions && recentTransactions.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-green-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="mobile-card-interactive">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {transaction.type}
                              </Badge>
                              <span className="font-semibold truncate">{transaction.item}</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            {transaction.credits > 0 && (
                              <div className="text-sm font-semibold text-yellow-400">
                                {transaction.credits > 0 ? '+' : ''}{transaction.credits.toLocaleString()}₡
                              </div>
                            )}
                            {transaction.gems > 0 && (
                              <div className="text-sm font-semibold text-purple-400">
                                {transaction.gems > 0 ? '+' : ''}{transaction.gems}💎
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="touch-target-large"
                    onClick={() => setActiveTab('marketplace')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Browse Players
                  </Button>
                  <Button 
                    variant="outline" 
                    className="touch-target-large"
                    onClick={() => setActiveTab('store')}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Visit Store
                  </Button>
                  <Button 
                    variant="outline" 
                    className="touch-target-large"
                    onClick={() => setActiveTab('inventory')}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    My Items
                  </Button>
                  <Button 
                    variant="outline" 
                    className="touch-target-large"
                    onClick={() => setActiveTab('transactions')}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <DynamicMarketplaceManager />
          </TabsContent>

          {/* Store Tab */}
          <TabsContent value="store" className="space-y-6">
            <StoreSystem teamId={team?.id || ""} />
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  My Inventory ({inventoryItems?.length || 0} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryItems && inventoryItems.length > 0 ? (
                  <div className="grid-mobile-cards">
                    {inventoryItems.map((item, index) => (
                      <div key={index} className="mobile-card-interactive">
                        <div className="text-center">
                          <div className="text-2xl mb-2">{getItemIcon(item.category || 'default')}</div>
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity || 1}</p>
                          {item.rarity && (
                            <Badge className={`text-xs mt-2 ${getRarityColor(item.rarity)}`}>
                              {item.rarity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No items in inventory</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab('store')}
                    >
                      Visit Store
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions && recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="mobile-card-interactive">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  transaction.type === 'PURCHASE' ? 'text-red-400' :
                                  transaction.type === 'SALE' ? 'text-green-400' :
                                  'text-blue-400'
                                }`}
                              >
                                {transaction.type}
                              </Badge>
                              <span className="font-semibold truncate">{transaction.item}</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.date).toLocaleString()}
                            </p>
                            <Badge 
                              className={`text-xs mt-1 ${
                                transaction.status === 'COMPLETED' ? 'bg-green-600' :
                                transaction.status === 'PENDING' ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            {transaction.credits !== 0 && (
                              <div className={`text-sm font-semibold ${
                                transaction.credits > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {transaction.credits > 0 ? '+' : ''}{transaction.credits.toLocaleString()}₡
                              </div>
                            )}
                            {transaction.gems !== 0 && (
                              <div className={`text-sm font-semibold ${
                                transaction.gems > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {transaction.gems > 0 ? '+' : ''}{transaction.gems}💎
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No transaction history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}