import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, User, Calendar, DollarSign, Clock, TrendingUp, AlertCircle } from "lucide-react";

interface ContractNegotiationProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
}

interface ContractCalculation {
  baseSalary: number;
  marketValue: number;
  minimumOffer: number;
  signingBonus: number;
  salaryRange: {
    min: number;
    max: number;
  };
  yearsRange: {
    min: number;
    max: number;
  };
}

interface ContractInfo {
  currentSalary: number;
  currentYears: number;
  currentSeason: number;
  contractEndsAfterSeason: number;
  nextContractStartsSeason: number;
}

interface NegotiationResponse {
  acceptanceProbability: number;
  playerFeedback: string;
  responseType: 'accepting' | 'considering' | 'demanding' | 'rejecting';
  isAccepted?: boolean;
}

// Race-specific emojis
const getRaceEmoji = (race: string) => {
  const raceMap: { [key: string]: string } = {
    'human': '👤',
    'sylvan': '🍃',
    'gryll': '🪨',
    'lumina': '✨',
    'umbra': '🌙'
  };
  return raceMap[race?.toLowerCase()] || '👤';
};

// Star rating component
const StarRating = ({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) => {
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= rating;
    const partial = !filled && i - 1 < rating && rating < i;
    
    stars.push(
      <Star
        key={i}
        className={`w-5 h-5 ${
          filled 
            ? 'text-yellow-400 fill-yellow-400' 
            : partial 
            ? 'text-yellow-400 fill-yellow-400/50'
            : 'text-gray-300 fill-gray-300'
        }`}
      />
    );
  }
  return <div className="flex gap-1">{stars}</div>;
};

export default function ContractNegotiationRedesigned({ player, isOpen, onClose }: ContractNegotiationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [offerSalary, setOfferSalary] = useState<number>(0);
  const [offerYears, setOfferYears] = useState<number>(3);
  const [negotiationHistory, setNegotiationHistory] = useState<any[]>([]);

  // Fetch contract calculations and current contract info
  const { data: contractData, isLoading: isLoadingContract } = useQuery({
    queryKey: ['/api/players', player?.id, 'contract-negotiation-data'],
    queryFn: () => apiRequest(`/api/players/${player.id}/contract-negotiation-data`),
    enabled: !!player?.id && isOpen,
  });

  // Fetch live negotiation feedback as user adjusts offer
  const { data: negotiationFeedback, isLoading: isLoadingFeedback } = useQuery<NegotiationResponse>({
    queryKey: ['/api/players', player?.id, 'negotiation-feedback', offerSalary, offerYears],
    queryFn: () => apiRequest(`/api/players/${player.id}/negotiation-feedback`, 'POST', {
      salary: offerSalary,
      years: offerYears
    }),
    enabled: !!player?.id && offerSalary > 0 && offerYears > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Initialize offer values when contract data loads
  useEffect(() => {
    if (contractData?.calculation) {
      setOfferSalary(contractData.calculation.marketValue);
    }
  }, [contractData]);

  // Submit offer mutation
  const submitOfferMutation = useMutation({
    mutationFn: async (offer: { salary: number; years: number }) => {
      return apiRequest(`/api/players/${player.id}/negotiate-contract`, 'POST', offer);
    },
    onSuccess: (data) => {
      if (data.accepted) {
        toast({
          title: "Contract Accepted!",
          description: `New contract runs Season ${data.startSeason}-${data.endSeason}. ₡${data.signingBonus.toLocaleString()} bonus paid now.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        onClose();
      } else {
        // Add to negotiation history
        setNegotiationHistory(prev => [...prev, {
          salary: offerSalary,
          years: offerYears,
          result: 'rejected',
          feedback: data.feedback,
          date: new Date().toLocaleDateString()
        }]);
        
        toast({
          title: "Offer Rejected",
          description: data.feedback,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Negotiation Failed",
        description: error.message || "Unable to submit offer",
        variant: "destructive"
      });
    }
  });

  if (!player) {
    return null;
  }

  const calculation = contractData?.calculation as ContractCalculation;
  const contractInfo = contractData?.contractInfo as ContractInfo;
  const isOfferValid = offerSalary >= (calculation?.salaryRange?.min || 0) && 
                     offerSalary <= (calculation?.salaryRange?.max || Infinity) &&
                     offerYears >= (calculation?.yearsRange?.min || 1) &&
                     offerYears <= (calculation?.yearsRange?.max || 5);

  const getAcceptanceColor = (probability: number) => {
    if (probability >= 80) return "text-green-400";
    if (probability >= 60) return "text-yellow-400";
    if (probability >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getAcceptanceBarColor = (probability: number) => {
    if (probability >= 80) return "bg-green-500";
    if (probability >= 60) return "bg-yellow-500";
    if (probability >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-white">Contract Negotiation</DialogTitle>
        </DialogHeader>

        {isLoadingContract ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-white">Loading negotiation data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* HEADER - Player Info */}
            <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                      {getRaceEmoji(player.race)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {player.firstName} {player.lastName}
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <Badge className="bg-blue-600 text-white">
                          {player.role} • {player.race}
                        </Badge>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>Age {player.age}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <StarRating rating={player.potentialRating || 2.5} />
                          <span className="text-sm text-gray-300 ml-1">
                            {player.potentialRating?.toFixed(1) || '2.5'}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-400">
                      {Math.round((player.speed + player.power + player.throwing + player.catching + player.kicking + player.agility) / 6)} PWR
                    </div>
                    <div className="text-sm text-gray-400">Overall Power</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CURRENT CONTRACT INFO */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5" />
                  Current Contract Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xl font-bold text-green-400">
                      ₡{contractInfo?.currentSalary?.toLocaleString() || '0'}/season
                    </div>
                    <div className="text-sm text-gray-400">
                      {contractInfo?.currentYears || 0} seasons remaining
                    </div>
                  </div>
                  <div className="text-right md:text-left">
                    <div className="text-white font-semibold">
                      Contract ends after Season {contractInfo?.contractEndsAfterSeason || 'Unknown'}
                    </div>
                    <div className="text-sm text-blue-400">
                      New contract starts Season {contractInfo?.nextContractStartsSeason || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-900/30 rounded-lg">
                  <div className="text-sm text-blue-200">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Today is Season {contractInfo?.currentSeason || 0}. 
                    Renegotiations will take effect at the start of Season {contractInfo?.nextContractStartsSeason || 'Unknown'}.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OFFER INPUTS */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="w-5 h-5" />
                  Contract Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Salary Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-white font-semibold">Annual Salary</Label>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-400">
                        ₡{offerSalary.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        Expected: ₡{calculation?.salaryRange?.min?.toLocaleString() || '0'} - ₡{calculation?.salaryRange?.max?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                  
                  <Slider
                    value={[offerSalary]}
                    onValueChange={(value) => setOfferSalary(value[0])}
                    min={calculation?.salaryRange?.min || 10000}
                    max={calculation?.salaryRange?.max || 100000}
                    step={1000}
                    className="w-full"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Min: ₡{calculation?.salaryRange?.min?.toLocaleString() || '0'}</span>
                    <span>Market: ₡{calculation?.marketValue?.toLocaleString() || '0'}</span>
                    <span>Max: ₡{calculation?.salaryRange?.max?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                {/* Years Stepper */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Contract Length</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOfferYears(Math.max((calculation?.yearsRange?.min || 1), offerYears - 1))}
                      disabled={offerYears <= (calculation?.yearsRange?.min || 1)}
                      className="w-10 h-10"
                    >
                      -
                    </Button>
                    <div className="text-center min-w-[120px]">
                      <div className="text-2xl font-bold text-white">{offerYears}</div>
                      <div className="text-sm text-gray-400">
                        {offerYears === 1 ? 'season' : 'seasons'}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOfferYears(Math.min((calculation?.yearsRange?.max || 5), offerYears + 1))}
                      disabled={offerYears >= (calculation?.yearsRange?.max || 5)}
                      className="w-10 h-10"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Signing Bonus (Read-only) */}
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Signing Bonus</Label>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="text-lg font-bold text-green-400">
                      ₡{calculation?.signingBonus?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Will be paid immediately if contract is accepted
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ACCEPTANCE FEEDBACK */}
            {negotiationFeedback && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" />
                    Player Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">Acceptance Probability</span>
                    <span className={`text-xl font-bold ${getAcceptanceColor(negotiationFeedback.acceptanceProbability)}`}>
                      {negotiationFeedback.acceptanceProbability}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getAcceptanceBarColor(negotiationFeedback.acceptanceProbability)}`}
                      style={{ width: `${negotiationFeedback.acceptanceProbability}%` }}
                    />
                  </div>
                  
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="text-white font-medium mb-2">Player Feedback:</div>
                    <div className="text-gray-300 italic">
                      "{negotiationFeedback.playerFeedback}"
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NEW CONTRACT DETAILS */}
            <Card className="bg-green-900/20 border-green-500/30">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-green-400 font-semibold mb-2">If Accepted:</div>
                  <div className="text-white text-lg">
                    Contract will begin at start of Season {contractInfo?.nextContractStartsSeason || 'Unknown'} 
                    and run until end of Season {(contractInfo?.nextContractStartsSeason || 0) + offerYears - 1}
                  </div>
                  <div className="text-sm text-gray-300 mt-2">
                    Total Value: ₡{(offerSalary * offerYears + (calculation?.signingBonus || 0)).toLocaleString()} 
                    over {offerYears} seasons
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEGOTIATION HISTORY */}
            {negotiationHistory.length > 0 && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white">Previous Offers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {negotiationHistory.map((offer, index) => (
                      <div key={index} className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-white">
                            ₡{offer.salary.toLocaleString()} for {offer.years} seasons
                          </span>
                          <Badge variant="destructive">Rejected</Badge>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {offer.date} - "{offer.feedback}"
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => submitOfferMutation.mutate({ salary: offerSalary, years: offerYears })}
                disabled={!isOfferValid || submitOfferMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-semibold"
              >
                {submitOfferMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Offer'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="px-8 h-12 text-lg"
              >
                Cancel
              </Button>
            </div>

            {/* Validation Errors */}
            {!isOfferValid && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="text-red-400 font-medium">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Invalid Offer
                </div>
                <div className="text-red-300 text-sm mt-1">
                  Salary must be between ₡{calculation?.salaryRange?.min?.toLocaleString() || '0'} 
                  and ₡{calculation?.salaryRange?.max?.toLocaleString() || '0'}, 
                  with {calculation?.yearsRange?.min || 1}-{calculation?.yearsRange?.max || 5} seasons.
                </div>
              </div>
            )}

            {/* Contract Activity Info */}
            <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Most contract activity occurs during Offseason (Days 16-17)
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}