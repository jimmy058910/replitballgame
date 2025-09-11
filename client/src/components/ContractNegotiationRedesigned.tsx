import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  Minus,
  CheckCircle,
  XCircle,
  Info,
  Coins
} from "lucide-react";
import type { Player } from "@shared/types/models";

interface ContractNegotiationProps {
  player: Player;
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

interface SeasonInfo {
  currentDay: number;
  currentPhase: string;
}

interface ContractNegotiationData {
  calculation: ContractCalculation;
  contractInfo: ContractInfo;
  seasonInfo: SeasonInfo;
}

interface NegotiationResponse {
  acceptanceProbability: number;
  playerFeedback: string;
  responseType: 'accepting' | 'considering' | 'demanding' | 'rejecting';
}

interface SubmitOfferResponse {
  accepted: boolean;
  feedback?: string;
  startSeason?: number;
  endSeason?: number;
  signingBonus?: number;
}

// Race-specific emojis with color themes
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

const getRaceGradient = (race: string) => {
  const gradientMap: { [key: string]: string } = {
    'human': 'from-blue-600 via-blue-700 to-blue-800',
    'sylvan': 'from-green-600 via-emerald-700 to-green-800',
    'gryll': 'from-amber-600 via-orange-700 to-amber-800',
    'lumina': 'from-purple-600 via-violet-700 to-purple-800',
    'umbra': 'from-gray-600 via-slate-700 to-gray-800'
  };
  return gradientMap[race?.toLowerCase()] || 'from-blue-600 via-blue-700 to-blue-800';
};

// Enhanced Star Rating Component with Potential Color Coding
const StarRating = ({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  // Color based on potential rating
  const getStarColor = (starIndex: number, rating: number) => {
    if (rating >= 4.5) return 'text-yellow-400 fill-yellow-400'; // Elite
    if (rating >= 3.5) return 'text-purple-400 fill-purple-400';  // High  
    if (rating >= 2.5) return 'text-blue-400 fill-blue-400';      // Good
    if (rating >= 1.5) return 'text-green-400 fill-green-400';    // Decent
    return 'text-gray-400 fill-gray-400';                         // Developing
  };
  
  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= fullStars;
    const partial = !filled && i === fullStars + 1 && hasHalfStar;
    
    stars.push(
      <Star
        key={i}
        className={`w-5 h-5 transition-colors ${
          filled || partial
            ? getStarColor(i, rating)
            : 'text-gray-600 fill-gray-600'
        } ${partial ? 'opacity-50' : ''}`}
      />
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      <span className="text-sm text-gray-300 font-medium ml-1">
        {rating.toFixed(1)}/5
      </span>
    </div>
  );
};

// Mobile-First Stepper Component
const MobileStepper = ({ 
  value, 
  onChange, 
  min = 1, 
  max = 5, 
  label,
  suffix = ""
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="flex items-center justify-center gap-4 bg-gray-800 rounded-lg p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-12 h-12 rounded-full p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
        >
          <Minus className="h-5 w-5" />
        </Button>
        
        <div className="text-center min-w-[80px]">
          <div className="text-2xl font-bold text-white">
            {value}{suffix}
          </div>
          <div className="text-xs text-gray-400">
            {value === 1 ? 'year' : 'years'}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-12 h-12 rounded-full p-0 bg-gray-700 hover:bg-gray-600 border-gray-600"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// Acceptance Probability Indicator
const AcceptanceProbability = ({ 
  probability, 
  feedback, 
  responseType 
}: { 
  probability: number; 
  feedback: string;
  responseType: string;
}) => {
  const getColorClass = (prob: number) => {
    if (prob >= 80) return 'bg-green-600';
    if (prob >= 60) return 'bg-yellow-500'; 
    if (prob >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getTextColor = (prob: number) => {
    if (prob >= 80) return 'text-green-400';
    if (prob >= 60) return 'text-yellow-400';
    if (prob >= 40) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'accepting': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'considering': return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'demanding': return <TrendingUp className="h-5 w-5 text-orange-400" />;
      default: return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };
  
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Acceptance Probability</span>
          <div className="flex items-center gap-2">
            {getIcon(responseType)}
            <span className={`text-lg font-bold ${getTextColor(probability)}`}>
              {probability}%
            </span>
          </div>
        </div>
        
        <Progress 
          value={probability} 
          className="h-2"
          style={{
            // @ts-ignore - Custom CSS variable for dynamic color
            '--progress-foreground': getColorClass(probability).replace('bg-', '')
          }}
        />
        
        <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-gray-600">
          <p className="text-sm text-gray-300 italic">
            "{feedback}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ContractNegotiationRedesigned({ player, isOpen, onClose }: ContractNegotiationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [offerSalary, setOfferSalary] = useState<number>(0);
  const [offerYears, setOfferYears] = useState<number>(3);

  // Fetch contract calculations and current contract info  
  const { data: contractData, isLoading: isLoadingContract } = useQuery<ContractNegotiationData>({
    queryKey: ['/api/players', player?.id, 'contract-negotiation-data'],
    queryFn: async () => {
      const response = await apiRequest(`/api/players/${player.id}/contract-negotiation-data`);
      return response as ContractNegotiationData;
    },
    enabled: !!player?.id && isOpen,
  });

  // Fetch live negotiation feedback as user adjusts offer
  const { data: negotiationFeedback, isLoading: isLoadingFeedback } = useQuery<NegotiationResponse>({
    queryKey: ['/api/players', player?.id, 'negotiation-feedback', offerSalary, offerYears],
    queryFn: async () => {
      const response = await apiRequest(`/api/players/${player.id}/negotiation-feedback`, 'POST', {
        salary: offerSalary,
        years: offerYears
      });
      return response as NegotiationResponse;
    },
    enabled: !!player?.id && offerSalary > 0 && offerYears > 0 && !!contractData,
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
    mutationFn: async (offer: { salary: number; years: number }): Promise<SubmitOfferResponse> => {
      const response = await apiRequest(`/api/players/${player.id}/negotiate-contract`, 'POST', offer);
      return response as SubmitOfferResponse;
    },
    onSuccess: (data) => {
      if (data.accepted) {
        toast({
          title: "Contract Accepted!",
          description: `New contract runs Season ${data.startSeason}-${data.endSeason}. ${data?.signingBonus?.toLocaleString() || '0'}₡ bonus paid now.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        onClose();
      } else {
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

  if (!player) return null;

  const calculation = contractData?.calculation;
  const contractInfo = contractData?.contractInfo;
  const seasonInfo = contractData?.seasonInfo;
  
  const isOfferValid = calculation && 
    offerSalary >= calculation.salaryRange.min && 
    offerSalary <= calculation.salaryRange.max &&
    offerYears >= calculation.yearsRange.min &&
    offerYears <= calculation.yearsRange.max;

  const formatCredits = (amount: number) => {
    return `${amount.toLocaleString()}₡`;
  };

  const totalPackageValue = (offerSalary * offerYears) + (calculation?.signingBonus || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
        {/* Enhanced Mobile-First Header */}
        <div className={`bg-gradient-to-r ${getRaceGradient(player.race)} p-6 -m-6 mb-6 rounded-t-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-3xl border-2 border-white/20">
              {getRaceEmoji(player.race)}
            </div>
            
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-black text-white mb-1 truncate">
                {player.firstName} {player.lastName}
              </DialogTitle>
              
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30 font-semibold">
                  {player.role?.toUpperCase()}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 font-semibold">
                  {player.race?.toUpperCase()}
                </Badge>
                <span className="text-white/80 text-sm">
                  Age {player.age} • #{player.jerseyNumber || '??'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <StarRating rating={parseFloat(player.potentialRating?.toString() || '0')} />
                <div className="text-right">
                  <div className="text-3xl font-black text-white">
                    {/* Calculate total power score */}
                    {Math.round(
                      ((player.speed || 0) + (player.power || 0) + (player.throwing || 0) + 
                       (player.catching || 0) + (player.kicking || 0) + (player.leadership || 0) + 
                       (player.agility || 0) + (player.stamina || 0)) / 8
                    )}
                  </div>
                  <div className="text-sm text-white/70">Overall Power</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoadingContract ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-gray-800 rounded-lg"></div>
            <div className="h-48 bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-800 rounded-lg"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Contract Status */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Current Contract Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {contractInfo?.currentSalary ? formatCredits(contractInfo.currentSalary) : '₡0'}/season
                    </div>
                    <div className="text-sm text-gray-400">
                      {contractInfo?.currentYears || 0} seasons remaining
                    </div>
                  </div>
                  <div className="text-right sm:text-right text-left">
                    <div className="text-sm text-gray-300">
                      Contract ends after Season {contractInfo?.contractEndsAfterSeason || 'Unknown'}
                    </div>
                    <div className="text-sm text-blue-400">
                      New contract starts Season {contractInfo?.nextContractStartsSeason || 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <Alert className="bg-blue-900/30 border-blue-500/30">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-blue-200">
                    Today is Season {contractInfo?.currentSeason || '?'}, Day {seasonInfo?.currentDay || '?'} 
                    ({seasonInfo?.currentPhase || 'Unknown'}). 
                    Renegotiations will take effect at the start of Season {contractInfo?.nextContractStartsSeason || '?'}.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Contract Offer Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Contract Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Annual Salary Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-200">Annual Salary</label>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-400">
                        {formatCredits(offerSalary)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Expected: {calculation ? formatCredits(calculation.minimumOffer) : '₡0'} - {calculation ? formatCredits(calculation.marketValue * 1.2) : '₡0'}
                      </div>
                    </div>
                  </div>
                  
                  {calculation && (
                    <Slider
                      value={[offerSalary]}
                      onValueChange={(values) => setOfferSalary(values[0])}
                      min={calculation.salaryRange.min}
                      max={calculation.salaryRange.max}
                      step={1000}
                      className="w-full"
                    />
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Min: {calculation ? formatCredits(calculation.salaryRange.min) : '₡0'}</span>
                    <span>Market: {calculation ? formatCredits(calculation.marketValue) : '₡0'}</span>
                    <span>Max: {calculation ? formatCredits(calculation.salaryRange.max) : '₡0'}</span>
                  </div>
                </div>

                {/* Contract Length Stepper */}
                <MobileStepper
                  value={offerYears}
                  onChange={setOfferYears}
                  min={calculation?.yearsRange.min || 1}
                  max={calculation?.yearsRange.max || 5}
                  label="Contract Length"
                />

                {/* Signing Bonus */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      <span className="font-medium text-gray-200">Signing Bonus</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-400">
                      {calculation ? formatCredits(calculation.signingBonus) : '₡0'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Will be paid immediately if contract is accepted
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Live Acceptance Feedback */}
            {negotiationFeedback && !isLoadingFeedback && (
              <AcceptanceProbability
                probability={negotiationFeedback.acceptanceProbability}
                feedback={negotiationFeedback.playerFeedback}
                responseType={negotiationFeedback.responseType}
              />
            )}

            {/* Contract Timeline & Total Value */}
            <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-500/30">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">If Accepted</h3>
                  <p className="text-blue-200">
                    Contract will begin at start of Season {contractInfo?.nextContractStartsSeason || '?'} and run until end of Season {(contractInfo?.nextContractStartsSeason || 1) + offerYears - 1}
                  </p>
                  <div className="text-2xl font-black text-white">
                    Total Value: {formatCredits(totalPackageValue)} over {offerYears} season{offerYears !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => submitOfferMutation.mutate({ salary: offerSalary, years: offerYears })}
                disabled={!isOfferValid || submitOfferMutation.isPending}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {submitOfferMutation.isPending ? 'Submitting...' : 'Submit Offer'}
              </Button>
            </div>

            {/* Validation Messages */}
            {!isOfferValid && calculation && (
              <Alert className="bg-red-900/30 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  {offerSalary < calculation.salaryRange.min && 
                    `Salary must be at least ${formatCredits(calculation.salaryRange.min)}`}
                  {offerSalary > calculation.salaryRange.max && 
                    `Salary cannot exceed ${formatCredits(calculation.salaryRange.max)}`}
                  {(offerYears < calculation.yearsRange.min || offerYears > calculation.yearsRange.max) && 
                    `Contract length must be ${calculation.yearsRange.min}-${calculation.yearsRange.max} years`}
                </AlertDescription>
              </Alert>
            )}

            {/* Helper Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Most contract activity occurs during Off-season (Days 16-17)
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}