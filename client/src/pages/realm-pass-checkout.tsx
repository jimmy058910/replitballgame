import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Gem, Zap } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const RealmPassCheckoutForm = ({ realmPassData }: { realmPassData: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Realm Pass!",
        description: "You're now subscribed to Realm Pass with exclusive benefits.",
      });
      setLocation('/dashboard');
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Realm Pass</h1>
          <p className="text-gray-300">Unlock premium features and benefits</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Realm Pass Benefits */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  PREMIUM
                </Badge>
              </div>
              <CardTitle className="text-white">Realm Pass Monthly</CardTitle>
              <CardDescription className="text-gray-400">
                Premium subscription with exclusive benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {realmPassData.monthlyGems} <span className="text-lg text-gray-400">gems</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Monthly gems allocation</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Ad-free experience</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Daily cache rewards</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Exclusive cosmetics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Gem className="h-5 w-5 text-blue-400" />
                  <span className="text-gray-300">2,000 daily credits</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="text-gray-300">Random performance boosts</span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Monthly Price</span>
                  <span className="text-2xl font-bold text-white">
                    ${realmPassData.price}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <PaymentElement />
                </div>
                <Button 
                  type="submit" 
                  disabled={!stripe || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isProcessing ? 'Processing...' : `Subscribe for $${realmPassData.price}/month`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/dashboard')}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function RealmPassCheckout() {
  const [clientSecret, setClientSecret] = useState("");
  const [realmPassData, setRealmPassData] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get Realm Pass data and create payment intent
    const initializePayment = async () => {
      try {
        // Get Realm Pass information
        const realmPassResponse = await apiRequest("GET", "/api/store/realm-pass");
        const realmPassInfo = realmPassResponse.data;
        
        setRealmPassData(realmPassInfo);

        // Create payment intent
        const response = await apiRequest("POST", "/api/payments/create-subscription", {});
        
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Error initializing Realm Pass subscription:", error);
        toast({
          title: "Subscription Error",
          description: "Failed to initialize subscription. Please try again.",
          variant: "destructive",
        });
        setLocation('/dashboard');
      }
    };

    initializePayment();
  }, [setLocation, toast]);

  if (!clientSecret || !realmPassData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Loading subscription form...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <RealmPassCheckoutForm realmPassData={realmPassData} />
    </Elements>
  );
}