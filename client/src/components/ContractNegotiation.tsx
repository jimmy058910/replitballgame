import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Heart } from "lucide-react";

interface ContractNegotiationProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}

export default function ContractNegotiation({ player, isOpen, onClose, teamId }: ContractNegotiationProps) {
  const [proposedSalary, setProposedSalary] = useState(player?.salary || 0);
  const [proposedSeasons, setProposedSeasons] = useState(3);
  const [negotiationStep, setNegotiationStep] = useState(0);

  const negotiateMutation = useMutation({
    mutationFn: async (terms: any) => {
      return apiRequest(`/api/teams/${teamId}/players/${player.id}/negotiate`, {
        method: "POST",
        body: JSON.stringify(terms),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/players`] });
      onClose();
    },
  });

  if (!player) return null;

  // Calculate player market value based on attributes and performance
  const calculateMarketValue = () => {
    const avgStats = (player.speed + player.power + player.throwing + player.catching + 
                     player.kicking + player.stamina + player.leadership + player.agility) / 8;
    const baseValue = avgStats * 1000;
    const ageMultiplier = player.age < 25 ? 1.2 : player.age > 30 ? 0.8 : 1.0;
    const camaraderieBonus = (player.camaraderie || 50) > 70 ? 0.9 : 1.0; // Team loyalty discount
    
    return Math.floor(baseValue * ageMultiplier * camaraderieBonus);
  };

  const marketValue = calculateMarketValue();
  const currentSalary = player.salary;
  const camaraderie = player.camaraderie || 50;
  const contractRemaining = (player.contractSeasons || 3) - (player.contractStartSeason || 0);

  // Negotiation logic
  const getPlayerResponse = () => {
    const salaryIncrease = ((proposedSalary - currentSalary) / currentSalary) * 100;
    
    if (proposedSalary >= marketValue * 1.1) {
      return {
        response: "accept",
        message: "I'm very pleased with this offer! I accept these terms.",
        likelihood: 95,
        color: "text-green-600"
      };
    } else if (proposedSalary >= marketValue * 0.95) {
      if (camaraderie >= 70) {
        return {
          response: "accept",
          message: "I love this team and these terms work for me. Let's do it!",
          likelihood: 85,
          color: "text-green-600"
        };
      } else {
        return {
          response: "consider",
          message: "This is close to what I'm looking for. Can we add a small bonus?",
          likelihood: 60,
          color: "text-yellow-600"
        };
      }
    } else if (proposedSalary >= marketValue * 0.8) {
      if (camaraderie >= 80) {
        return {
          response: "consider",
          message: "I'd take a small cut to stay with this great team. Deal!",
          likelihood: 70,
          color: "text-yellow-600"
        };
      } else {
        return {
          response: "counter",
          message: `I think I'm worth more than that. How about ${marketValue.toLocaleString()}?`,
          likelihood: 30,
          color: "text-red-600"
        };
      }
    } else {
      return {
        response: "reject",
        message: "That's well below my market value. I'll need to explore other options.",
        likelihood: 10,
        color: "text-red-600"
      };
    }
  };

  const playerResponse = getPlayerResponse();

  const handleNegotiate = () => {
    if (playerResponse.response === "accept" || (playerResponse.response === "consider" && Math.random() * 100 < playerResponse.likelihood)) {
      negotiateMutation.mutate({
        salary: proposedSalary,
        contractSeasons: proposedSeasons,
        contractValue: proposedSalary * proposedSeasons,
      });
    } else {
      setNegotiationStep(1);
    }
  };

  const handleCounterOffer = () => {
    setProposedSalary(Math.floor(marketValue * 0.95));
    setNegotiationStep(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={24} />
            Contract Negotiation - {player.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Player Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${currentSalary.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Current Salary</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${marketValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Market Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {contractRemaining}
                  </div>
                  <div className="text-sm text-gray-500">Seasons Left</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Team Camaraderie</span>
                  <span className="text-sm">{camaraderie}/100</span>
                </div>
                <Progress value={camaraderie} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {camaraderie >= 80 ? "Loves the team - may accept lower salary" :
                   camaraderie >= 60 ? "Enjoys playing here" :
                   camaraderie >= 40 ? "Neutral about the team" : "Unhappy with current situation"}
                </div>
              </div>
            </CardContent>
          </Card>

          {negotiationStep === 0 ? (
            <>
              {/* Negotiation Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proposed Contract Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salary">Annual Salary</Label>
                      <Input
                        id="salary"
                        type="number"
                        value={proposedSalary}
                        onChange={(e) => setProposedSalary(parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="seasons">Contract Length (Seasons)</Label>
                      <Input
                        id="seasons"
                        type="number"
                        min="1"
                        max="5"
                        value={proposedSeasons}
                        onChange={(e) => setProposedSeasons(parseInt(e.target.value) || 3)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Contract Value:</span>
                      <span className="text-xl font-bold">
                        ${(proposedSalary * proposedSeasons).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {proposedSalary > currentSalary ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : proposedSalary < currentSalary ? (
                      <TrendingDown className="text-red-600" size={20} />
                    ) : null}
                    <span className="text-sm">
                      {proposedSalary > currentSalary ? 
                        `+${(((proposedSalary - currentSalary) / currentSalary) * 100).toFixed(1)}% increase` :
                        proposedSalary < currentSalary ?
                        `${(((proposedSalary - currentSalary) / currentSalary) * 100).toFixed(1)}% decrease` :
                        "No salary change"
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Player Response Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart size={20} />
                    Player Response Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Acceptance Likelihood:</span>
                      <Badge variant={
                        playerResponse.likelihood >= 70 ? "default" :
                        playerResponse.likelihood >= 40 ? "secondary" : "destructive"
                      }>
                        {playerResponse.likelihood}%
                      </Badge>
                    </div>
                    <div className={`p-3 border rounded-lg ${playerResponse.color}`}>
                      "{playerResponse.message}"
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleNegotiate} disabled={negotiateMutation.isPending}>
                  Present Offer
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Counter Offer / Rejection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Negotiation Update</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-red-700 dark:text-red-300">
                        "{playerResponse.message}"
                      </p>
                    </div>

                    {playerResponse.response === "counter" && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                          The player has made a counter-offer of ${marketValue.toLocaleString()}/season.
                        </p>
                        <div className="flex gap-2">
                          <Button onClick={handleCounterOffer} size="sm">
                            Accept Counter-Offer
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setNegotiationStep(0)}>
                            Make New Offer
                          </Button>
                        </div>
                      </div>
                    )}

                    {playerResponse.response === "reject" && (
                      <div className="text-center py-4">
                        <p className="text-gray-600 mb-4">
                          The player has rejected your offer and will likely leave at the end of the season.
                        </p>
                        <Button variant="outline" onClick={onClose}>
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}