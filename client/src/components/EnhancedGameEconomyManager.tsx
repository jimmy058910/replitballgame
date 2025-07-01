import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Coins, 
  Gem, 
  TrendingUp, 
  Building, 
  Trophy, 
  ShoppingBag,
  Zap,
  Gift,
  BarChart3,
  DollarSign,
  Crown,
  Star,
  Users,
  Home
} from 'lucide-react';

interface EconomyOverview {
  credits: number;
  gems: number;
  stadiumRevenue: {
    ticketSales: number;
    concessions: number;
    parking: number;
    vipSuites: number;
    apparel: number;
    total: number;
  };
  maintenanceCosts: number;
  netRevenue: number;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'revenue' | 'expense' | 'purchase' | 'reward';
  description: string;
  credits?: number;
  gems?: number;
  timestamp: string;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  credits?: number;
  gems?: number;
  tier: string;
  category: string;
  purchaseLimit?: number;
  purchased?: number;
}

interface DivisionRewards {
  division: number;
  rewards: {
    champion: { credits: number; gems: number };
    runnerUp: { credits: number; gems: number };
    regularWinner: { credits: number; gems: number };
    promotion: { credits: number; gems: number };
  };
  description: string;
}

interface ExchangeRates {
  creditsPerGem: number;
  minimumExchange: number;
  maximumExchange: number;
  dailyLimit: number;
  currentExchangeToday: number;
}

const formatCurrency = (amount: number, currency: 'credits' | 'gems'): string => {
  return currency === 'credits' ? `₡${amount.toLocaleString()}` : `💎${amount.toLocaleString()}`;
};

const getTierColor = (tier: string): string => {
  const colors = {
    Basic: 'bg-gray-500',
    Standard: 'bg-blue-500',
    Premium: 'bg-purple-500',
    Elite: 'bg-yellow-500'
  };
  return colors[tier as keyof typeof colors] || 'bg-gray-500';
};

const getDivisionColor = (division: number): string => {
  const colors = [
    'text-yellow-600', // Division 1 - Diamond
    'text-gray-600',   // Division 2 - Platinum
    'text-orange-600', // Division 3 - Gold
    'text-gray-500',   // Division 4 - Silver
    'text-amber-600',  // Division 5 - Bronze
    'text-green-600',  // Division 6 - Iron
    'text-blue-600',   // Division 7 - Stone
    'text-red-600'     // Division 8 - Copper
  ];
  return colors[division - 1] || 'text-gray-600';
};

export default function EnhancedGameEconomyManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exchangeAmount, setExchangeAmount] = useState<string>('');

  // Fetch economy overview
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['/api/enhanced-game-economy/overview', teamId],
    enabled: !!teamId
  });

  // Fetch store catalog
  const { data: storeCatalog } = useQuery({
    queryKey: ['/api/enhanced-game-economy/store-catalog']
  });

  // Fetch division rewards
  const { data: divisionRewards } = useQuery({
    queryKey: ['/api/enhanced-game-economy/division-rewards']
  });

  // Fetch exchange rates
  const { data: exchangeRates } = useQuery({
    queryKey: ['/api/enhanced-game-economy/exchange-rates', teamId],
    enabled: !!teamId
  });

  // Purchase item mutation
  const purchaseItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/enhanced-game-economy/purchase/${itemId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: 'Purchase Successful',
        description: 'Item has been added to your inventory!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-game-economy'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to complete purchase',
        variant: 'destructive'
      });
    }
  });

  // Exchange currency mutation
  const exchangeCurrencyMutation = useMutation({
    mutationFn: (data: { gemAmount: number }) =>
      apiRequest('/api/enhanced-game-economy/exchange-currency', 'POST', data),
    onSuccess: () => {
      toast({
        title: 'Exchange Successful',
        description: 'Gems have been exchanged for credits!'
      });
      setExchangeAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-game-economy'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Exchange Failed',
        description: error.message || 'Failed to exchange currency',
        variant: 'destructive'
      });
    }
  });

  if (loadingOverview) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Game Economy</h2>
          <p className="text-gray-600">Dual currency system with stadium revenue and comprehensive reward structure</p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-4">
            <div>
              <div className="text-sm text-gray-500">Credits</div>
              <div className="text-xl font-bold text-green-600">₡{overview?.credits?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gems</div>
              <div className="text-xl font-bold text-purple-600">💎{overview?.gems?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stadium">Stadium Revenue</TabsTrigger>
          <TabsTrigger value="store">Premium Store</TabsTrigger>
          <TabsTrigger value="rewards">Division Rewards</TabsTrigger>
          <TabsTrigger value="exchange">Currency Exchange</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₡{overview?.credits?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Primary currency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Gems</CardTitle>
                <Gem className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">💎{overview?.gems?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Premium currency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stadium Revenue</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₡{overview?.stadiumRevenue?.total?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Last match earnings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${overview?.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₡{overview?.netRevenue?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">After maintenance costs</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview?.recentTransactions?.map((transaction: Transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {transaction.type === 'revenue' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {transaction.type === 'expense' && <DollarSign className="w-4 h-4 text-red-500" />}
                        {transaction.type === 'purchase' && <ShoppingBag className="w-4 h-4 text-blue-500" />}
                        {transaction.type === 'reward' && <Gift className="w-4 h-4 text-purple-500" />}
                        <div>
                          <div className="text-sm font-medium">{transaction.description}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {transaction.credits && (
                          <div className={`text-sm font-medium ${transaction.credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.credits > 0 ? '+' : ''}₡{transaction.credits.toLocaleString()}
                          </div>
                        )}
                        {transaction.gems && (
                          <div className={`text-sm font-medium ${transaction.gems > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                            {transaction.gems > 0 ? '+' : ''}💎{transaction.gems.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!overview?.recentTransactions || overview.recentTransactions.length === 0) && (
                    <div className="text-center py-8">
                      <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No Recent Transactions</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your financial activity will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Economy Features</CardTitle>
                <CardDescription>Advanced economic systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Coins className="w-4 h-4 text-green-500" />
                      <h5 className="font-medium text-sm">Dual Currency Framework</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Credits for daily operations, Gems for premium purchases and accelerated progression
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building className="w-4 h-4 text-blue-500" />
                      <h5 className="font-medium text-sm">Stadium Revenue Engine</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Five income streams: ticket sales, concessions, parking, VIP suites, and merchandise
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <h5 className="font-medium text-sm">Division Rewards</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Structured rewards based on division performance and achievements
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <h5 className="font-medium text-sm">Dynamic Exchange System</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Flexible gem-to-credit exchange with tiered rates and daily limits
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stadium" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stadium Revenue Breakdown</CardTitle>
              <CardDescription>Detailed analysis of your stadium's earning streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Ticket Sales</div>
                        <div className="text-lg font-bold">₡{overview?.stadiumRevenue?.ticketSales?.toLocaleString() || 0}</div>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(overview?.stadiumRevenue?.ticketSales / overview?.stadiumRevenue?.total * 100) || 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Concessions</div>
                        <div className="text-lg font-bold">₡{overview?.stadiumRevenue?.concessions?.toLocaleString() || 0}</div>
                      </div>
                      <ShoppingBag className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(overview?.stadiumRevenue?.concessions / overview?.stadiumRevenue?.total * 100) || 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Parking</div>
                        <div className="text-lg font-bold">₡{overview?.stadiumRevenue?.parking?.toLocaleString() || 0}</div>
                      </div>
                      <Home className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(overview?.stadiumRevenue?.parking / overview?.stadiumRevenue?.total * 100) || 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">VIP Suites</div>
                        <div className="text-lg font-bold">₡{overview?.stadiumRevenue?.vipSuites?.toLocaleString() || 0}</div>
                      </div>
                      <Crown className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(overview?.stadiumRevenue?.vipSuites / overview?.stadiumRevenue?.total * 100) || 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Merchandise</div>
                        <div className="text-lg font-bold">₡{overview?.stadiumRevenue?.apparel?.toLocaleString() || 0}</div>
                      </div>
                      <Star className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(overview?.stadiumRevenue?.apparel / overview?.stadiumRevenue?.total * 100) || 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Maintenance</div>
                        <div className="text-lg font-bold text-red-600">-₡{overview?.maintenanceCosts?.toLocaleString() || 0}</div>
                      </div>
                      <Building className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      0.5% of total stadium value
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Stadium Revenue:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₡{overview?.stadiumRevenue?.total?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Net After Maintenance:</span>
                  <span className={`text-lg font-medium ${overview?.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₡{overview?.netRevenue?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premium Store</CardTitle>
              <CardDescription>Dual currency items for team enhancement</CardDescription>
            </CardHeader>
            <CardContent>
              {storeCatalog && Object.entries(storeCatalog).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(items as StoreItem[]).map((item: StoreItem) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge className={getTierColor(item.tier)}>
                              {item.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <div>
                              {item.credits && (
                                <div className="text-sm font-medium text-green-600">
                                  ₡{item.credits.toLocaleString()}
                                </div>
                              )}
                              {item.gems && (
                                <div className="text-sm font-medium text-purple-600">
                                  💎{item.gems.toLocaleString()}
                                </div>
                              )}
                              {item.purchaseLimit && (
                                <div className="text-xs text-gray-500">
                                  {item.purchased || 0}/{item.purchaseLimit} purchased
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => purchaseItemMutation.mutate(item.id)}
                              disabled={
                                purchaseItemMutation.isPending ||
                                (item.purchaseLimit && (item.purchased || 0) >= item.purchaseLimit)
                              }
                            >
                              Purchase
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Division Reward Structure</CardTitle>
              <CardDescription>Complete 8-division reward system based on performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {divisionRewards?.map((division: DivisionRewards) => (
                  <Card key={division.division}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-lg font-bold ${getDivisionColor(division.division)}`}>
                          Division {division.division}
                        </h3>
                        <Badge variant="outline">{division.description}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 border rounded">
                          <Trophy className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                          <div className="text-xs text-gray-600">Champion</div>
                          <div className="font-medium">
                            ₡{division.rewards.champion.credits.toLocaleString()}
                          </div>
                          <div className="text-purple-600">
                            💎{division.rewards.champion.gems}
                          </div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <Star className="w-6 h-6 mx-auto mb-1 text-gray-500" />
                          <div className="text-xs text-gray-600">Runner-up</div>
                          <div className="font-medium">
                            ₡{division.rewards.runnerUp.credits.toLocaleString()}
                          </div>
                          <div className="text-purple-600">
                            💎{division.rewards.runnerUp.gems}
                          </div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-500" />
                          <div className="text-xs text-gray-600">Winner</div>
                          <div className="font-medium">
                            ₡{division.rewards.regularWinner.credits.toLocaleString()}
                          </div>
                          <div className="text-purple-600">
                            💎{division.rewards.regularWinner.gems}
                          </div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <Crown className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                          <div className="text-xs text-gray-600">Promotion</div>
                          <div className="font-medium">
                            ₡{division.rewards.promotion.credits.toLocaleString()}
                          </div>
                          <div className="text-purple-600">
                            💎{division.rewards.promotion.gems}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currency Exchange</CardTitle>
              <CardDescription>Convert gems to credits with tiered exchange rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Exchange Gems for Credits</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="exchangeAmount">Gems to Exchange</Label>
                      <Input
                        id="exchangeAmount"
                        type="number"
                        value={exchangeAmount}
                        onChange={(e) => setExchangeAmount(e.target.value)}
                        placeholder="Enter gem amount"
                        max={exchangeRates?.maximumExchange || 100}
                        min={exchangeRates?.minimumExchange || 1}
                      />
                    </div>
                    {exchangeAmount && (
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span>Gems to Exchange:</span>
                          <span className="font-medium">💎{parseInt(exchangeAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credits Received:</span>
                          <span className="font-medium text-green-600">
                            ₡{(parseInt(exchangeAmount) * (exchangeRates?.creditsPerGem || 500)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Exchange Rate:</span>
                          <span>₡{exchangeRates?.creditsPerGem || 500} per gem</span>
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => {
                        const amount = parseInt(exchangeAmount);
                        if (amount >= (exchangeRates?.minimumExchange || 1)) {
                          exchangeCurrencyMutation.mutate({ gemAmount: amount });
                        }
                      }}
                      disabled={
                        !exchangeAmount ||
                        parseInt(exchangeAmount) < (exchangeRates?.minimumExchange || 1) ||
                        parseInt(exchangeAmount) > (exchangeRates?.maximumExchange || 100) ||
                        exchangeCurrencyMutation.isPending
                      }
                    >
                      Exchange Currency
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Exchange Information</h4>
                  <div className="space-y-3">
                    <div className="p-3 border rounded">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Rate:</span>
                        <span className="font-medium">₡{exchangeRates?.creditsPerGem || 500} per gem</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Minimum Exchange:</span>
                        <span className="font-medium">💎{exchangeRates?.minimumExchange || 1}</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Maximum Exchange:</span>
                        <span className="font-medium">💎{exchangeRates?.maximumExchange || 100}</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Daily Limit:</span>
                        <span className="font-medium">💎{exchangeRates?.dailyLimit || 100}</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used Today:</span>
                        <span className="font-medium">💎{exchangeRates?.currentExchangeToday || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}