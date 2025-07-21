import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { 
  Store, 
  Users, 
  TrendingUp, 
  Receipt, 
  Package, 
  DollarSign,
  ShoppingCart,
  BarChart3
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  costGems?: number;
  category: string;
  purchaseLimit: number;
  purchasedToday: number;
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

export default function MarketDistrict() {
  const { isAuthenticated } = useAuth();

  const { data: storeItems, isLoading: storeLoading } = useQuery<StoreItem[]>({
    queryKey: ['/api/store/items'],
    queryFn: () => apiRequest('/api/store/items'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Market District.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      
      <div className="p-4">
        {/* Market District Header */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-white">Market District</h1>
          <p className="text-gray-400">Trading, shopping, and economic center</p>
        </div>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
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

          {/* Store Tab */}
          <TabsContent value="store" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                  Store Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storeLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : storeItems?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storeItems.map((item) => (
                      <div key={item.id} className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="text-white font-semibold">{item.name}</h4>
                        <p className="text-gray-300 text-sm mb-2">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="text-yellow-400 font-bold">
                            {item.cost}₡
                            {item.costGems && (
                              <span className="text-purple-400 ml-2">{item.costGems}💎</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.purchasedToday}/{item.purchaseLimit}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-2"
                          disabled={item.purchasedToday >= item.purchaseLimit}
                        >
                          Purchase
                        </Button>
                      </div>
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
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Package className="h-5 w-5 text-orange-400" />
                  Your Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-400">Inventory system coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : transactions?.length ? (
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                        <div>
                          <p className="text-white text-sm">{transaction.item}</p>
                          <p className="text-gray-400 text-xs">{transaction.date} • {transaction.type}</p>
                        </div>
                        <div className="text-right">
                          {transaction.credits && (
                            <span className="text-yellow-400">{transaction.credits}₡</span>
                          )}
                          {transaction.gems && (
                            <span className="text-purple-400 ml-2">{transaction.gems}💎</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No transactions found</p>
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