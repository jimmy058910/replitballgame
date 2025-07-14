import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const GemCheckoutForm = ({ packageData }: { packageData: any }) => {
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
        title: "Payment Successful",
        description: `You've successfully purchased ${packageData.name}!`,
      });
      setLocation('/dashboard');
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Purchase</h1>
          <p className="text-gray-300">Secure payment powered by Stripe</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Package Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <Gem className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-white">{packageData.name}</CardTitle>
              <CardDescription className="text-gray-400">
                Premium gem package
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {packageData.gems} <span className="text-lg text-gray-400">gems</span>
                </div>
                {packageData.bonus > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    +{packageData.bonus} bonus gems
                  </Badge>
                )}
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Price</span>
                  <span className="text-2xl font-bold text-white">
                    ${packageData.price}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">Total Gems</span>
                  <span className="text-lg font-semibold text-blue-400">
                    {packageData.gems + packageData.bonus}
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Processing...' : `Pay $${packageData.price}`}
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

export default function GemCheckout() {
  const [, params] = useRoute('/gem-checkout/:packageId');
  const packageId = params?.packageId;
  const [clientSecret, setClientSecret] = useState("");
  const [packageData, setPackageData] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!packageId) {
      setLocation('/dashboard');
      return;
    }

    // Get gem packages and create payment intent
    const initializePayment = async () => {
      try {
        // Get available packages
        const packagesResponse = await apiRequest("GET", "/api/store/gem-packages");
        const packages = packagesResponse.data;
        
        const selectedPackage = packages.find((pkg: any) => pkg.id === packageId);
        if (!selectedPackage) {
          toast({
            title: "Package Not Found",
            description: "The selected gem package is not available.",
            variant: "destructive",
          });
          setLocation('/dashboard');
          return;
        }

        setPackageData(selectedPackage);

        // Create payment intent
        const response = await apiRequest("POST", "/api/payments/purchase-gems", {
          packageId: packageId
        });
        
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Error initializing payment:", error);
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
        setLocation('/dashboard');
      }
    };

    initializePayment();
  }, [packageId, setLocation, toast]);

  if (!clientSecret || !packageData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Loading payment form...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <GemCheckoutForm packageData={packageData} />
    </Elements>
  );
}