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
import { ShoppingCart, Clock, Play, Gift, Sparkles, Zap, Star, Crown, Shield, Coins, ArrowRightLeft, Gem, History } from "lucide-react";
import PaymentHistory from "@/components/PaymentHistory";
import { AdRewardSystem } from "@/components/AdRewardSystem";
import { HelpIcon } from "@/components/help";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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
          description: error.message,
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
  const [selectedGemPackage, setSelectedGemPackage] = useState<any>(null);
  const [showGemPurchase, setShowGemPurchase] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [showGemConverter, setShowGemConverter] = useState(false);
  const [gemsToConvert, setGemsToConvert] = useState(1);
  const { toast } = useToast();

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const { data: storeData } = useQuery({
    queryKey: ["/api/store/items"],
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async (purchase: any) => {
      return await apiRequest("/api/store/purchase", "POST", purchase);
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful",
        description: "Item has been added to your inventory!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
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
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("/api/payments/purchase-gems", "POST", { packageId });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setShowGemPurchase(true);
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
    mutationFn: async (gemsAmount: number) => {
      const response = await apiRequest("/api/store/convert-gems", "POST", { gemsAmount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conversion Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
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

  const handleGemPurchase = (gemPackage: any) => {
    setSelectedGemPackage(gemPackage);
    createGemPaymentMutation.mutate(gemPackage.id);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-600 bg-gray-100";
      case "rare": return "text-blue-600 bg-blue-100";
      case "epic": return "text-purple-600 bg-purple-100";
      case "legendary": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getRarityIcon = (rarity: string) => {
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
              <span className="font-semibold">{finances?.credits?.toLocaleString() || 0}</span>
              <span className="text-sm text-muted-foreground">Credits</span>
              <HelpIcon content="Credits are the main currency in Realm Rivalry. Earn credits by winning matches, selling players, and completing tournaments. Use them to buy equipment, scout new players, and upgrade your stadium." />
            </div>
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">{finances?.premiumCurrency || 0}</span>
              <span className="text-sm text-muted-foreground">Premium Gems</span>
              <HelpIcon content="Premium Gems are the special currency. Purchase them with real money or earn them through achievements. Use them for elite equipment, instant upgrades, and exclusive content. You can also convert them to credits." />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowGemConverter(true)}
                disabled={!finances?.premiumCurrency || finances.premiumCurrency === 0}
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
            <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
              <Gem className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium text-purple-800 dark:text-purple-200">Premium Gem Items</p>
                <p className="text-sm text-purple-600 dark:text-purple-300">
                  4 rare rotating items • Next refresh: {hoursUntilReset}h {minutesUntilReset}m (3:00 AM EST)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeData?.premiumItems?.slice(0, 4).map((item: any) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow border-purple-200 dark:border-purple-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-purple-800 dark:text-purple-200">{item.name}</CardTitle>
                      <Badge className={getRarityColor(item.rarity)}>
                        {getRarityIcon(item.rarity)}
                        {item.rarity}
                      </Badge>
                    </div>
                    <CardDescription className="text-purple-700 dark:text-purple-300">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Gem className="w-5 h-5 text-purple-500" />
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-lg">{item.priceGems} Gems</span>
                      </div>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => purchaseItemMutation.mutate({ itemId: item.id, currency: 'gems' })}
                        disabled={!finances?.premiumCurrency || finances.premiumCurrency < item.priceGems}
                      >
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
              <Coins className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Credit Items</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  6 common rotating items • Next refresh: {hoursUntilReset}h {minutesUntilReset}m (3:00 AM EST)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeData?.items?.slice(0, 6).map((item: any) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow border-yellow-200 dark:border-yellow-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">{item.name}</CardTitle>
                      <Badge className={getRarityColor(item.rarity)}>
                        {getRarityIcon(item.rarity)}
                        {item.rarity}
                      </Badge>
                    </div>
                    <CardDescription className="text-yellow-700 dark:text-yellow-300">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-yellow-600 dark:text-yellow-400 text-lg">{item.price?.toLocaleString()} Credits</span>
                      </div>
                      <Button 
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        onClick={() => purchaseItemMutation.mutate({ itemId: item.id, currency: 'credits' })}
                        disabled={!finances?.credits || finances.credits < item.price}
                      >
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="entries">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeData?.tournamentEntries?.map((entry: any) => (
                <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="w-5 h-5" />
                      {entry.name}
                    </CardTitle>
                    <CardDescription>{entry.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-yellow-500" />
                          <span>{entry.price?.toLocaleString()} Credits</span>
                        </div>
                        <div className="text-sm text-muted-foreground">OR</div>
                        <div className="flex items-center gap-2">
                          <Gem className="w-4 h-4 text-purple-500" />
                          <span>{entry.priceGems} Premium Gems</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button 
                          size="sm"
                          onClick={() => purchaseItemMutation.mutate({ itemId: entry.id, currency: 'credits' })}
                          disabled={!finances?.credits || finances.credits < entry.price}
                        >
                          Buy with Credits
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => purchaseItemMutation.mutate({ itemId: entry.id, currency: 'gems' })}
                          disabled={!finances?.premiumCurrency || finances.premiumCurrency < entry.priceGems}
                        >
                          Buy with Gems
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Daily limit: {entry.dailyLimit}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="buy-gems">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Premium Gem Packages</h2>
                <p className="text-muted-foreground">Purchase Premium Gems with real money to unlock exclusive content</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {storeData?.creditPackages?.map((pkg: any) => (
                  <Card key={pkg.id} className={`hover:shadow-lg transition-shadow ${pkg.rarity === 'epic' ? 'ring-2 ring-purple-500' : ''}`}>
                    <CardHeader className="text-center">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Gem className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                      {pkg.rarity === 'epic' && (
                        <Badge className="bg-purple-100 text-purple-800">Most Popular</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                      <div className="space-y-2">
                        <div className="text-3xl font-bold">${(pkg.price / 100).toFixed(2)}</div>
                        <div className="text-lg">
                          <span className="font-semibold">{pkg.gems}</span> Premium Gems
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="text-sm text-green-600">
                            +{pkg.bonus} Bonus Gems!
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
            <DialogTitle>Purchase {selectedGemPackage?.name}</DialogTitle>
            <DialogDescription>
              You'll receive {selectedGemPackage?.gems} Premium Gems
              {selectedGemPackage?.bonus > 0 && ` + ${selectedGemPackage.bonus} bonus gems`}
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <GemPurchaseForm 
                packageId={selectedGemPackage?.id}
                onSuccess={() => {
                  setShowGemPurchase(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
                  toast({
                    title: "Purchase Successful!",
                    description: `${selectedGemPackage?.gems} Premium Gems added to your account`,
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