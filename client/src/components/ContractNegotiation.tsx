import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ContractNegotiationProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
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

export default function ContractNegotiation({ player, isOpen, onClose, teamId }: ContractNegotiationProps) {
  // Early return if player is null or missing required properties
  if (!player || !player.firstName || !player.lastName) {
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

  const [currentOffer, setCurrentOffer] = useState({
    salary: player?.salary || 50000,
    years: 3,
    bonus: 10000
  });
  const [playerResponse, setPlayerResponse] = useState<string | null>(null);
  const [negotiationPhase, setNegotiationPhase] = useState<'offer' | 'response' | 'counter'>('offer');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateResponse = (offerQuality: number, isAccepted: boolean) => {
    let responseType: keyof typeof contractResponses;
    
    if (isAccepted) {
      // If offer is accepted, use happy responses regardless of quality
      responseType = 'happy';
    } else if (offerQuality >= 0.8) {
      responseType = 'demanding';
    } else {
      responseType = 'rejecting';
    }

    const responses = contractResponses[responseType];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const negotiateMutation = useMutation({
    mutationFn: async (offer: typeof currentOffer) => {
      const marketValue = player.salary * 1.1; // 10% above current
      const offerQuality = offer.salary / marketValue;
      const isAccepted = offerQuality >= 0.9;
      
      const response = generateResponse(offerQuality, isAccepted);
      
      return { 
        success: isAccepted,
        response,
        counterOffer: !isAccepted && offerQuality >= 0.8 ? {
          salary: Math.floor(marketValue),
          years: offer.years,
          bonus: Math.floor(marketValue * 0.2)
        } : null
      };
    },
    onSuccess: (data) => {
      setPlayerResponse(data.response);
      
      if (data.success) {
        toast({
          title: "Contract Accepted!",
          description: `${player.firstName} ${player.lastName} has agreed to the terms.`,
        });
        setNegotiationPhase('response');
        // Automatically finalize the accepted contract
        finalizeContractMutation.mutate();
      } else if (data.counterOffer) {
        setCurrentOffer(data.counterOffer);
        setNegotiationPhase('counter');
      } else {
        setNegotiationPhase('response');
      }
    }
  });

  const finalizeContractMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/players/${player.id}/negotiate`, "POST", {
        seasons: currentOffer.years,
        salary: currentOffer.salary,
        bonus: currentOffer.bonus
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Finalized",
        description: "The new contract has been officially signed!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/my/finances`] });
      onClose();
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
            <Badge variant="outline">Current Salary: {player.salary?.toLocaleString()}/season</Badge>
          </div>
        </div>

        {/* Current Offer */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Contract Offer</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Annual Salary</label>
              <div className="font-semibold">{currentOffer.salary.toLocaleString()}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Contract Length</label>
              <div className="font-semibold">{currentOffer.years} years</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Signing Bonus</label>
              <div className="font-semibold">{currentOffer.bonus.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Player Response */}
        {playerResponse && (
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">{player.firstName}'s Response:</h4>
            <p className="italic text-gray-800 dark:text-gray-200">"{playerResponse}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {negotiationPhase === 'offer' && (
            <Button 
              onClick={() => negotiateMutation.mutate(currentOffer)}
              disabled={negotiateMutation.isPending}
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