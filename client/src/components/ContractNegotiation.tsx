import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Define player interface for contract negotiations
interface PlayerForContract {
  id: string;
  firstName: string;
  lastName: string;
  race: string;
  age: number;
  salary?: number;
  role?: string;
  // Add other fields if used by this component like role, specific stats for negotiation basis etc.
}

interface ContractNegotiationProps {
  player: PlayerForContract | null; // Use a more specific player type
  isOpen: boolean;
  onClose: () => void;
  // teamId?: string; // Removed as it's not used by the component based on previous analysis
}

const contractResponses = {
  happy: [
    "I'm thrilled to continue with this team! Let's finalize this deal.",
    "This offer shows you value my contribution. I accept!",
    "Perfect! I'm ready to commit my future to this organization."
  ],
  considering: [
    "This is a fair offer, but I'd like to explore my options in free agency first.",
    "I need some time to think about this. Can we revisit in a few days?",
    "The terms are reasonable, but I want to see what else is available."
  ],
  demanding: [
    "I believe my performance warrants a higher salary. Can we negotiate?",
    "I was expecting more given my contributions to the team.",
    "This offer doesn't reflect my market value. Here's what I'm looking for..."
  ],
  rejecting: [
    "I appreciate the offer, but I've decided to explore free agency.",
    "Thank you for the opportunity, but I'm looking for a new challenge elsewhere.",
    "I've enjoyed my time here, but it's time for me to move on."
  ]
};

export default function ContractNegotiation({ player, isOpen, onClose }: ContractNegotiationProps) {
  // Early return if player is null or missing required properties
  if (!player || !player.id || !player.firstName || !player.lastName) { // Added player.id check
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contract Negotiation Error</DialogTitle>
          </DialogHeader>
          <p className="text-center text-gray-500">Player information is not available.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch contract calculations from API
  const { data: contractCalc, isLoading: isLoadingCalc } = useQuery({
    queryKey: ['/api/players', player.id, 'contract-value'],
    queryFn: () => apiRequest(`/api/players/${player.id}/contract-value`),
    enabled: !!player.id && isOpen,
  });

  const [currentOffer, setCurrentOffer] = useState({
    salary: 50000, // Will be updated when contractCalc loads
    years: 3,
    bonus: 10000
  });
  const [playerResponse, setPlayerResponse] = useState<string | null>(null);
  const [negotiationPhase, setNegotiationPhase] = useState<'offer' | 'response' | 'counter'>('offer');

  // Update initial offer when contract calculations load
  useEffect(() => {
    if (contractCalc && (contractCalc as any)?.contractCalc) {
      setCurrentOffer(prev => ({
        ...prev,
        salary: (contractCalc as any).contractCalc.marketValue,
        bonus: Math.round((contractCalc as any).contractCalc.marketValue * 0.2)
      }));
    }
  }, [contractCalc]);

  const getCamaraderieEffectDescription = (camaraderie: number | undefined): string => {
    if (camaraderie === undefined) return "Neutral";
    if (camaraderie > 70) return "Feeling Good";
    if (camaraderie < 30) return "Feeling Disgruntled";
    return "Neutral";
  };

  const generateResponse = (offerQuality: number) => {
    let responseType: keyof typeof contractResponses;
    // console.log("Generating response for offerQuality:", offerQuality.toFixed(3));
    
    // Thresholds adjusted slightly as camaraderie effect might shift typical offerQuality range
    if (offerQuality >= 1.15) responseType = 'happy';
    else if (offerQuality >= 0.95) responseType = 'considering';
    else if (offerQuality >= 0.75) responseType = 'demanding';
    else responseType = 'rejecting';

    const responses = contractResponses[responseType];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const negotiateMutation = useMutation({
    mutationFn: async (offer: typeof currentOffer) => {
      // Use the actual contract negotiations API endpoint
      const response = await apiRequest(`/api/players/${player.id}/negotiate`, "POST", {
        salary: offer.salary,
        seasons: offer.years
      });
      
      return response;
    },
    onSuccess: (data) => {
      // @ts-expect-error TS18046
      setPlayerResponse(data.negotiationResult.message);
      
      // @ts-expect-error TS18046
      if (data.success) {
        toast({
          title: "Contract Accepted!",
          description: `${player.firstName} ${player.lastName} has agreed to the terms.`,
        });
        setNegotiationPhase('response');
        
        // Invalidate queries to refresh player data
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
      // @ts-expect-error TS18046
      } else if (data.negotiationResult.counterOffer) {
        setCurrentOffer({
          // @ts-expect-error TS18046
          salary: data.negotiationResult.counterOffer.salary,
          years: currentOffer.years,
          // @ts-expect-error TS18046
          bonus: data.negotiationResult.counterOffer.bonus
        });
        setNegotiationPhase('counter');
      } else {
        setNegotiationPhase('response');
      }
    },
    onError: (error: Error) => { // Explicitly type error
      toast({ title: "Negotiation Error", description: error.message, variant: "destructive"});
    }
  });

  const finalizeContractMutation = useMutation({
    mutationFn: async (): Promise<void> => { // Explicit return type
      // Player ID is guaranteed to be present due to the early return
      await apiRequest(`/api/players/${player.id}/contract`, "POST", {
        salary: currentOffer.salary,
        years: currentOffer.years,
        bonus: currentOffer.bonus
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Finalized",
        description: "The new contract has been officially signed!",
      });
      queryClient.invalidateQueries({ queryKey: ["teamPlayers", player.id] }); // More specific invalidation if possible
      onClose();
    },
    onError: (error: Error) => { // Explicitly type error
       toast({ title: "Finalization Error", description: error.message, variant: "destructive"});
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contract Negotiation: {player.firstName} {player.lastName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
        {/* Player Info */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h3 className="font-semibold">{player.firstName} {player.lastName}</h3>
            <p className="text-sm text-gray-500">{player.race} • Age {player.age}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                Current Salary: {(contractCalc as any)?.currentSalary ? `₡${(contractCalc as any).currentSalary.toLocaleString()}` : 'Loading...'}/season
              </Badge>
              {/*
               // @ts-expect-error TS2339 */}
              {player.camaraderie !== undefined && (
                <Badge
                  variant={
                    // @ts-expect-error TS2339
                    player.camaraderie > 70 ? "default" :
                    // @ts-expect-error TS2339
                    player.camaraderie < 30 ? "destructive" : "secondary"
                  }
                  className={
                    // @ts-expect-error TS2339
                    player.camaraderie > 70 ? "bg-green-500 hover:bg-green-600" :
                    // @ts-expect-error TS2339
                    player.camaraderie < 30 ? "bg-red-500 hover:bg-red-600" : ""
                  }
                >
                  {/*
                   // @ts-expect-error TS2339 */}
                  Camaraderie: {player.camaraderie} ({getCamaraderieEffectDescription(player.camaraderie)})
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contract Value Information */}
        {contractCalc && (contractCalc as any).contractCalc && (
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium mb-3">Player Value Assessment</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-500">Market Value</label>
                <div className="font-semibold">₡{(contractCalc as any).contractCalc.marketValue.toLocaleString()}</div>
              </div>
              <div>
                <label className="text-gray-500">Minimum Offer</label>
                <div className="font-semibold">₡{(contractCalc as any).contractCalc.minimumOffer.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current Offer */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Contract Offer</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Annual Salary</label>
              <div className="font-semibold">₡{currentOffer.salary.toLocaleString()}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Contract Length</label>
              <div className="font-semibold">{currentOffer.years} years</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Signing Bonus</label>
              <div className="font-semibold">₡{currentOffer.bonus.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Player Response */}
        {playerResponse && (
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="font-medium mb-2">{player.firstName}'s Response:</h4>
            <p className="italic">"{playerResponse}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {negotiationPhase === 'offer' && (
            <Button 
              onClick={() => negotiateMutation.mutate(currentOffer)}
              disabled={negotiateMutation.isPending || isLoadingCalc}
            >
              {negotiateMutation.isPending ? "Negotiating..." : "Present Offer"}
            </Button>
          )}
          
          {negotiationPhase === 'counter' && (
            <>
              <Button 
                onClick={() => finalizeContractMutation.mutate()}
                disabled={finalizeContractMutation.isPending}
              >
                Accept Counter-Offer
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentOffer(prev => ({
                    ...prev,
                    salary: Math.floor(prev.salary * 0.95)
                  }));
                  setNegotiationPhase('offer');
                  setPlayerResponse(null);
                }}
              >
                Make New Offer
              </Button>
            </>
          )}
          
          {negotiationPhase === 'response' && playerResponse?.includes('accept') && (
            <Button 
              onClick={() => finalizeContractMutation.mutate()}
              disabled={finalizeContractMutation.isPending}
            >
              Finalize Contract
            </Button>
          )}
        </div>

        {/* Offer Adjustment Controls */}
        {negotiationPhase === 'offer' && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Adjust Offer</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-2">Salary Adjustments</label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: Math.max(20000, prev.salary - 1000) }))}
                  >
                    -1K
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: Math.max(20000, prev.salary - 500) }))}
                  >
                    -500
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: Math.max(20000, prev.salary - 100) }))}
                  >
                    -100
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: Math.max(20000, prev.salary - 50) }))}
                  >
                    -50
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: prev.salary + 50 }))}
                  >
                    +50
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: prev.salary + 100 }))}
                  >
                    +100
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: prev.salary + 500 }))}
                  >
                    +500
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, salary: prev.salary + 1000 }))}
                  >
                    +1K
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 block mb-2">Contract Years</label>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, years: Math.max(1, prev.years - 1) }))}
                  >
                    -1 Year
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, years: Math.min(5, prev.years + 1) }))}
                  >
                    +1 Year
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 block mb-2">Signing Bonus</label>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, bonus: Math.max(0, prev.bonus - 2500) }))}
                  >
                    -2.5K
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setCurrentOffer(prev => ({ ...prev, bonus: prev.bonus + 2500 }))}
                  >
                    +2.5K
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}