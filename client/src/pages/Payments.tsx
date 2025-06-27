import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, Crown, Zap, Star, CheckCircle, History } from "lucide-react";
import Navigation from "@/components/Navigation";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ packageData, onSuccess }: { packageData: any, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/payments?success=true",
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `Successfully purchased ${packageData.name}!`,
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
        <div className="flex justify-between items-center mb-2">
          <span>{packageData.name}</span>
          <span>${(packageData.price / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>Credits: {packageData.credits.toLocaleString()}</span>
          {packageData.bonusCredits > 0 && (
            <span className="text-green-400">
              +{packageData.bonusCredits.toLocaleString()} bonus
            </span>
          )}
        </div>
        <div className="border-t border-gray-700 mt-3 pt-3">
          <div className="flex justify-between items-center font-semibold">
            <span>Total Credits:</span>
            <span className="text-blue-400">
              {(packageData.credits + (packageData.bonusCredits || 0)).toLocaleString()}₡
            </span>
          </div>
        </div>
      </div>

      <PaymentElement />
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isProcessing ? "Processing..." : `Pay $${(packageData.price / 100).toFixed(2)}`}
      </Button>
    </form>
  );
};

const PaymentCheckout = ({ selectedPackage, onBack }: { selectedPackage: any, onBack: () => void }) => {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Create PaymentIntent when component loads
    apiRequest("/api/payments/create-payment-intent", "POST", { packageId: selectedPackage.id })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.message || "Failed to create payment intent");
        }
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to initialize payment",
          variant: "destructive",
        });
      });
  }, [selectedPackage]);

  if (!clientSecret) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4"
        >
          ← Back to Packages
        </Button>
        <h2 className="text-2xl font-bold mb-2">Complete Purchase</h2>
        <p className="text-gray-400">Secure payment powered by Stripe</p>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm 
          packageData={selectedPackage} 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
            onBack();
          }}
        />
      </Elements>
    </div>
  );
};

export default function Payments() {
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery({
    queryKey: ["/api/payments/packages"],
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ["/api/payments/history"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const seedPackagesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/payments/seed-packages", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit packages have been set up!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/packages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (selectedPackage) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <PaymentCheckout 
            selectedPackage={selectedPackage} 
            onBack={() => setSelectedPackage(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 font-orbitron">
              <CreditCard className="inline-block w-10 h-10 mr-3 text-blue-400" />
              Credit Store
            </h1>
            <p className="text-gray-400 text-lg">
              Purchase premium credits to enhance your team and dominate the competition
            </p>
            <div className="mt-4 p-4 bg-gray-800 rounded-lg inline-block">
              <p className="text-lg">
                Current Balance: <span className="text-blue-400 font-bold">
                  {(finances?.credits || 0).toLocaleString()}₡
                </span>
              </p>
            </div>
          </div>

          <Tabs defaultValue="packages" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="packages">Credit Packages</TabsTrigger>
              <TabsTrigger value="history">Purchase History</TabsTrigger>
            </TabsList>

            <TabsContent value="packages" className="space-y-6">
              {isLoading && (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                </div>
              )}

              {!isLoading && (!packages || packages.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No credit packages available yet.</p>
                  <Button 
                    onClick={() => seedPackagesMutation.mutate()}
                    disabled={seedPackagesMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {seedPackagesMutation.isPending ? "Setting up..." : "Set Up Credit Packages"}
                  </Button>
                </div>
              )}

              {packages && packages.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {packages.map((pkg: any) => (
                    <Card 
                      key={pkg.id} 
                      className={`bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors relative ${
                        pkg.popularTag ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {pkg.popularTag && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-600 text-white px-3 py-1">
                            <Crown className="w-4 h-4 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl font-orbitron">
                          {pkg.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {pkg.description}
                        </CardDescription>
                        <div className="text-3xl font-bold text-blue-400 mt-2">
                          {formatPrice(pkg.price)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Base Credits:</span>
                            <span className="font-semibold">{pkg.credits.toLocaleString()}₡</span>
                          </div>
                          
                          {pkg.bonusCredits > 0 && (
                            <div className="flex justify-between items-center text-green-400">
                              <span>Bonus Credits:</span>
                              <span className="font-semibold">+{pkg.bonusCredits.toLocaleString()}₡</span>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-700 pt-2">
                            <div className="flex justify-between items-center font-bold">
                              <span>Total Credits:</span>
                              <span className="text-blue-400">
                                {(pkg.credits + (pkg.bonusCredits || 0)).toLocaleString()}₡
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 text-center">
                            Value: {Math.round(((pkg.credits + (pkg.bonusCredits || 0)) / pkg.price) * 100)} credits per cent
                          </div>
                        </div>

                        <Button 
                          onClick={() => setSelectedPackage(pkg)}
                          className={`w-full ${
                            pkg.popularTag 
                              ? 'bg-blue-600 hover:bg-blue-700' 
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Purchase Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Purchase History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!paymentHistory || paymentHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No purchases yet. Buy your first credit package above!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentHistory.map((transaction: any) => (
                        <div 
                          key={transaction.id}
                          className="flex justify-between items-center p-4 bg-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold">{transaction.credits.toLocaleString()}₡ Credits</p>
                            <p className="text-sm text-gray-400">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatPrice(transaction.amount)}</p>
                            <div className="flex items-center text-sm">
                              {transaction.status === 'completed' ? (
                                <><CheckCircle className="w-4 h-4 mr-1 text-green-400" /> Completed</>
                              ) : transaction.status === 'pending' ? (
                                <><div className="w-4 h-4 mr-1 rounded-full bg-yellow-400" /> Pending</>
                              ) : (
                                <><div className="w-4 h-4 mr-1 rounded-full bg-red-400" /> Failed</>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}