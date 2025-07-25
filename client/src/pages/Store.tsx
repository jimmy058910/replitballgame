import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Clock, Play, Gift, Sparkles, Zap, Star, Crown, Shield, Coins, ArrowRightLeft, Gem, History, Footprints, Shirt, Coffee, Heart, Eye, Dumbbell } from "lucide-react";
import PaymentHistory from "@/components/PaymentHistory";
import { AdRewardSystem } from "@/components/AdRewardSystem";
import { HelpIcon } from "@/components/help";

// Type interfaces for API responses
interface Team {
  id: string;
  name: string;
  credits: number;
}

interface Finances {
  credits: number;
  premiumCurrency: number;
}

interface StoreData {
  resetTime: string;
  premiumItems: any[];
  items: any[];
  tournamentEntries: any[];
  creditPackages: any[];
}

// Utility functions for item visuals
const getItemIcon = (category: string, itemId: string, itemName?: string) => {
  const name = (itemName || itemId || '').toLowerCase();
  
  // Medical/Recovery items
  if (name.includes('medical') || name.includes('treatment') || name.includes('heal')) return Heart;
  if (name.includes('energy') || name.includes('stamina') || name.includes('recovery')) return Zap;
  
  // Equipment items
  if (name.includes('helmet') || name.includes('helm')) return Shield;
  if (name.includes('gloves') || name.includes('gauntlet')) return Shirt;
  if (name.includes('boots') || name.includes('shoes')) return Footprints;
  if (name.includes('armor') || name.includes('plate') || name.includes('mail')) return Shield;
  
  // Training/Performance items
  if (name.includes('training') || name.includes('draft')) return Dumbbell;
  if (name.includes('scouting') || name.includes('scout')) return Eye;
  if (name.includes('performance') || name.includes('enhancer')) return Sparkles;
  if (name.includes('power') || name.includes('strength')) return Zap;
  if (name.includes('leadership')) return Crown;
  
  // Tournament/Game items
  if (name.includes('exhibition') || name.includes('match')) return Play;
  if (name.includes('tournament') || name.includes('cup')) return Crown;
  
  // Fallback by category
  switch (category) {
    case 'equipment': return Shield;
    case 'consumable': return Coffee;
    case 'consumable_recovery': return Heart;
    case 'currency': return Coins;
    case 'contract': return Star;
    case 'intel': return Eye;
    case 'tournament': return Crown;
    case 'game_entry': return Crown;
    default: return Gift;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'from-slate-600 to-slate-700';
    case 'rare': return 'from-blue-600 to-blue-700';
    case 'epic': return 'from-purple-600 to-purple-700';
    case 'legendary': return 'from-amber-500 to-orange-600';
    default: return 'from-slate-600 to-slate-700';
  }
};

const getRarityButtonColor = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'bg-slate-700 hover:bg-slate-800 text-white';
    case 'rare': return 'bg-blue-700 hover:bg-blue-800 text-white';
    case 'epic': return 'bg-purple-700 hover:bg-purple-800 text-white';
    case 'legendary': return 'bg-amber-600 hover:bg-amber-700 text-white';
    default: return 'bg-slate-700 hover:bg-slate-800 text-white';
  }
};

const getRarityBorder = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'border-slate-400 dark:border-slate-500';
    case 'rare': return 'border-blue-400 dark:border-blue-500';
    case 'epic': return 'border-purple-400 dark:border-purple-500';
    case 'legendary': return 'border-amber-400 dark:border-amber-500';
    default: return 'border-slate-400 dark:border-slate-500';
  }
};

const getRarityBadge = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
    case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200';
    case 'legendary': return 'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-200';
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  }
};

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);


// Client-side specific types for store items
interface StoreItemBase {
  id: string;
  name: string;
  description?: string;
  rarity: string;
}

interface PremiumStoreItem extends StoreItemBase {
  priceGems: number;
}

interface EquipmentStoreItem extends StoreItemBase {
  price?: number; // Assuming credits
  statBoosts?: Record<string, number>;
}

interface RegularStoreItem extends StoreItemBase {
  price?: number; // Assuming credits
}

interface TournamentEntryStoreItem extends StoreItemBase {
  price?: number; // Assuming credits
  priceGems: number;
  dailyLimit?: number;
}

// For credit packages that give gems (purchased with real money)
// Aligning with SharedCreditPackage from schema.ts
// SharedCreditPackage has: id, name, description, credits (amount of gems/premium currency), price (real money), bonusCredits, isActive, popularTag, discountPercent
interface ClientCreditPackage extends SharedCreditPackage {
  // No additional fields needed if SharedCreditPackage is sufficient
  // The VITE_STRIPE_PUBLIC_KEY check should be at the top level of the module, not inside a component.
}



interface StoreData {
  premiumItems: PremiumStoreItem[];
  equipment: EquipmentStoreItem[];
  items: RegularStoreItem[]; // General items
  tournamentEntries: TournamentEntryStoreItem[];
  creditPackages: ClientCreditPackage[]; // For purchasing gems
  resetTime?: string; // ISO date string
}

interface UserFinanceData {
  credits: number;
  premiumCurrency: number;
}

interface PurchasePayload {
  itemId: string;
  currency: 'gems' | 'credits';
}

interface PurchaseResponse { // Assuming a simple message response
  message: string;
  // Potentially include updated inventory or finances if API returns it
}

interface GemPaymentIntentResponse {
  clientSecret: string;
  message?: string;
}

interface ConvertGemsResponse {
  message: string;
  // Potentially updated finances
}


function GemPurchaseForm({ packageId, onSuccess }: { packageId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/store?success=true",
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message ?? "An unknown error occurred.",
          variant: "destructive",
        });
      } else {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? "Processing..." : "Purchase Premium Gems"}
      </Button>
    </form>
  );
}

export default function Store() {
  const [selectedGemPackage, setSelectedGemPackage] = useState<ClientCreditPackage | null>(null);
  const [showGemPurchase, setShowGemPurchase] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showGemConverter, setShowGemConverter] = useState(false);
  const [gemsToConvert, setGemsToConvert] = useState(1);
  const { toast } = useToast();

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });
  const finances = financesQuery.data as UserFinanceData | undefined;

  const { data: rawFinances } = useQuery<Finances>({
    queryKey: [`/api/teams/${team?.id}/finances`],
    enabled: !!team?.id,
  });
  const storeData = storeDataQuery.data as StoreData | undefined;
  const isLoadingStore = storeDataQuery.isLoading;

  const { data: rawStoreData } = useQuery<StoreData>({
    queryKey: ["/api/store"],
  });

  // Type assertions to fix property access issues
  const finances = rawFinances as Finances;
  const storeData = rawStoreData as StoreData;

  const purchaseItemMutation = useMutation({
    mutationFn: (purchaseDetails: PurchasePayload): Promise<PurchaseResponse> =>
      apiRequest("/api/store/purchase", "POST", purchaseDetails),
    onSuccess: (data: PurchaseResponse) => {
      toast({
        title: "Purchase Successful",
        description: data.message || "Item has been added to your inventory!",
      });
      queryClient.invalidateQueries({ queryKey: ["storeItems"] });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Invalidate inventory too
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createGemPaymentMutation = useMutation({
    mutationFn: (packageId: string): Promise<GemPaymentIntentResponse> =>
      apiRequest("/api/payments/purchase-gems", "POST", { packageId }),
    onSuccess: (data: GemPaymentIntentResponse) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowGemPurchase(true);
      } else {
        toast({ title: "Error", description: data.message || "Failed to initiate gem purchase.", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertGemsMutation = useMutation({
    mutationFn: (gemsAmount: number): Promise<ConvertGemsResponse> =>
      apiRequest("/api/store/convert-gems", "POST", { gemsAmount }),
    onSuccess: (data: ConvertGemsResponse) => {
      toast({
        title: "Conversion Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] });
      setShowGemConverter(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGemPurchase = (gemPackage: ClientCreditPackage) => {
    setSelectedGemPackage(gemPackage);
    createGemPaymentMutation.mutate(gemPackage.id);
  };



  const getRarityIcon = (rarity: string | undefined) => {
    switch (rarity) {
      case "common": return <Shield className="w-4 h-4" />;
      case "rare": return <Star className="w-4 h-4" />;
      case "epic": return <Sparkles className="w-4 h-4" />;
      case "legendary": return <Crown className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const timeUntilReset = storeData?.resetTime ? new Date(storeData.resetTime).getTime() - Date.now() : 0;
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Realm Rivalry Store</h1>
            <p className="text-muted-foreground mt-2">Enhance your team with premium items and equipment</p>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">{(finances?.credits ?? 0).toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">Credits</span>
              <HelpIcon content="Credits are the main currency in Realm Rivalry. Earn credits by winning matches, selling players, and completing tournaments. Use them to buy equipment, scout new players, and upgrade your stadium." />
            </div>
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">{finances?.premiumCurrency ?? 0}</span>
              <span className="text-sm text-muted-foreground">Premium Gems</span>
              <HelpIcon content="Premium Gems are the special currency. Purchase them with real money or earn them through achievements. Use them for elite equipment, instant upgrades, and exclusive content. You can also convert them to credits." />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowGemConverter(true)}
                disabled={!finances?.premiumCurrency || (finances.premiumCurrency ?? 0) === 0}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Convert
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="gems" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="gems">
              <Gem className="h-4 w-4 mr-2" />
              Gems
            </TabsTrigger>
            <TabsTrigger value="credits">
              <Coins className="h-4 w-4 mr-2" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="ads">
              <Play className="h-4 w-4 mr-2" />
              Ad Rewards
            </TabsTrigger>
            <TabsTrigger value="buy-gems">Buy Gems</TabsTrigger>
            <TabsTrigger value="transactions">
              <History className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gems" className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-900/20 rounded-lg border border-slate-200">
              <Gem className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Premium Gem Items</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  4 elite rotating items • Next refresh: {hoursUntilReset}h {minutesUntilReset}m (3:00 AM EST)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeData?.premiumItems?.slice(0, 4).map((item: any) => {
                const ItemIcon = getItemIcon(item.category, item.id, item.name);
                return (
                  <Card key={item.id} className={`hover:shadow-lg transition-shadow ${getRarityBorder(item.rarity)} border-2`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getRarityColor(item.rarity)} flex items-center justify-center`}>
                            <ItemIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <Badge className={getRarityBadge(item.rarity)} variant="secondary">
                              {item.rarity?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {item.statBoosts && (
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium">Stat Boosts:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.statBoosts).map(([stat, value]: [string, any]) => (
                              <span key={stat} className="bg-muted px-2 py-1 rounded">
                                +{value} {stat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Gem className="w-5 h-5 text-purple-500" />
                          <span className="font-bold text-lg">{item.priceGems} Gems</span>
                        </div>
                        <Button 
                          className={`${getRarityButtonColor(item.rarity)} font-semibold border-0 shadow-md`}
                          onClick={() => purchaseItemMutation.mutate({ itemId: item.id, currency: 'gems' })}
                          disabled={!finances?.premiumCurrency || finances.premiumCurrency < item.priceGems}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900 dark:to-yellow-900/20 rounded-lg border border-amber-200">
              <Coins className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Credit Items</p>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  6 rotating items • Next refresh: {hoursUntilReset}h {minutesUntilReset}m (3:00 AM EST)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeData?.items?.slice(0, 6).map((item: any) => {
                const ItemIcon = getItemIcon(item.category, item.id, item.name);
                return (
                  <Card key={item.id} className={`hover:shadow-lg transition-shadow ${getRarityBorder(item.rarity)} border-2`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getRarityColor(item.rarity)} flex items-center justify-center`}>
                          <ItemIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <Badge className={getRarityBadge(item.rarity)} variant="secondary">
                            {item.rarity?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {item.statBoosts && (
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium">Stat Boosts:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.statBoosts).map(([stat, value]: [string, any]) => (
                              <span key={stat} className="bg-muted px-2 py-1 rounded">
                                +{value} {stat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-yellow-500" />
                          <span className="font-bold text-lg">{item.price?.toLocaleString()} Credits</span>
                        </div>
                        <Button 
                          className={`${getRarityButtonColor(item.rarity)} font-semibold border-0 shadow-md`}
                          onClick={() => purchaseItemMutation.mutate({ itemId: item.id, currency: 'credits' })}
                          disabled={!finances?.credits || finances.credits < item.price}
                        >
                          Buy Now
                        </Button>
                      </div>
                      {item.dailyLimit && (
                        <div className="text-sm text-muted-foreground">
                          {item.purchasedToday || 0}/{item.dailyLimit} Daily Limit purchased
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="entries" className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900 dark:to-blue-900/20 rounded-lg border border-emerald-200">
              <Crown className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">Division Tournament Entries</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-300">
                  2 division-specific tournament options • Daily limits apply
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeData?.tournamentEntries?.filter((entry: any) => entry.category === 'tournament').map((entry: any) => {
                const ItemIcon = getItemIcon(entry.category, entry.id, entry.name);
                return (
                  <Card key={entry.id} className={`hover:shadow-lg transition-shadow ${getRarityBorder(entry.rarity)} border-2`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getRarityColor(entry.rarity)} flex items-center justify-center`}>
                          <ItemIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{entry.name}</CardTitle>
                          <Badge className={getRarityBadge(entry.rarity)} variant="secondary">
                            {entry.rarity?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{entry.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">{entry.price?.toLocaleString()} Credits</span>
                          </div>
                          <div className="text-sm text-muted-foreground text-center">OR</div>
                          <div className="flex items-center gap-2">
                            <Gem className="w-4 h-4 text-purple-500" />
                            <span className="font-semibold">{entry.priceGems} Premium Gems</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Button 
                            size="sm"
                            className={`${getRarityButtonColor(entry.rarity)} font-semibold border-0 shadow-md`}
                            onClick={() => purchaseItemMutation.mutate({ itemId: entry.id, currency: 'credits' })}
                            disabled={!finances?.credits || finances.credits < entry.price}
                          >
                            Buy with Credits
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold border-0 shadow-md"
                            onClick={() => purchaseItemMutation.mutate({ itemId: entry.id, currency: 'gems' })}
                            disabled={!finances?.premiumCurrency || finances.premiumCurrency < entry.priceGems}
                          >
                            Buy with Gems
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.purchasedToday || 0}/{entry.dailyLimit} Daily Limit purchased
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="buy-gems">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Premium Gem Packages</h2>
                <p className="text-muted-foreground">Purchase Premium Gems with real money to unlock exclusive content</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {storeData?.creditPackages?.map((pkg: ClientCreditPackage) => (
                  <Card key={pkg.id} className={`hover:shadow-lg transition-shadow ${pkg.popularTag ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardHeader className="text-center">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Gem className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description ?? 'Standard gem package.'}</CardDescription>
                      {pkg.popularTag && (
                        <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                      <div className="space-y-2">
                        <div className="text-3xl font-bold">${(pkg.price / 100).toFixed(2)}</div>
                        <div className="text-lg">
                          {/* 'credits' in CreditPackage schema means the amount of premium currency (gems) given */}
                          <span className="font-semibold">{pkg.credits}</span> Premium Gems
                        </div>
                        {(pkg.bonusCredits ?? 0) > 0 && (
                          <div className="text-sm text-green-600">
                            +{(pkg.bonusCredits ?? 0)} Bonus Gems!
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => handleGemPurchase(pkg)}
                        disabled={createGemPaymentMutation.isPending}
                      >
                        {createGemPaymentMutation.isPending ? "Setting up..." : "Purchase"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-muted p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Why Premium Gems?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Access exclusive daily premium items</li>
                  <li>• Convert to regular credits at 1:1000 ratio</li>
                  <li>• Purchase tournament entries</li>
                  <li>• Support Realm Rivalry development</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ads">
            <AdRewardSystem />
          </TabsContent>

          <TabsContent value="transactions">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>

      {/* Stripe Payment Dialog */}
      <Dialog open={showGemPurchase} onOpenChange={setShowGemPurchase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase {selectedGemPackage?.name ?? 'Gems'}</DialogTitle>
            <DialogDescription>
              You'll receive {selectedGemPackage?.credits ?? 0} Premium Gems {/* Use credits field for gem amount */}
              {(selectedGemPackage?.bonusCredits ?? 0) > 0 && ` + ${selectedGemPackage?.bonusCredits} bonus gems`}
            </DialogDescription>
          </DialogHeader>
          {clientSecret && selectedGemPackage && ( // Ensure selectedGemPackage and clientSecret exist
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <GemPurchaseForm 
                packageId={selectedGemPackage.id} // Now safe to access id
                onSuccess={() => {
                  setShowGemPurchase(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
                  toast({
                    title: "Purchase Successful!",
                    description: `${selectedGemPackage?.credits ?? 0} Premium Gems added to your account`,
                  });
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      {/* Gem Converter Dialog */}
      <Dialog open={showGemConverter} onOpenChange={setShowGemConverter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Premium Gems to Credits</DialogTitle>
            <DialogDescription>
              Exchange rate: 1 Premium Gem = 1,000 Credits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gems-amount">Gems to Convert</Label>
              <Input
                id="gems-amount"
                type="number"
                min="1"
                max={finances?.premiumCurrency || 0}
                value={gemsToConvert}
                onChange={(e) => setGemsToConvert(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll receive: {(gemsToConvert * 1000).toLocaleString()} Credits
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowGemConverter(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => convertGemsMutation.mutate(gemsToConvert)}
                disabled={convertGemsMutation.isPending}
              >
                {convertGemsMutation.isPending ? "Converting..." : "Convert"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}