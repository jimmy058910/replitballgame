import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { DollarSign, TrendingUp, AlertTriangle, Users, Calculator, FileText, Clock, Target } from "lucide-react";
import { AnimatedCounter, PulseWrapper, HoverCard, InteractiveButton } from "@/components/MicroInteractions";

// Define interfaces based on expected data structures
interface PlayerData {
  id: string;
  name: string;
  position: string;
  overall: number;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  stamina: number;
  leadership: number;
  agility: number;
  role?: string; // Optional, as it's calculated
  // Add other player properties if needed by suggestSalary or other logic
}

interface TeamData {
  id: string;
  name: string;
  // Add other team properties if needed
}

interface PlayerContract {
  id: string;
  playerId: string;
  teamId: string;
  salary: number;
  duration: number;
  remainingYears: number;
  contractType: string;
  signedDate: string;
  expiryDate: string;
  bonuses?: {
    performance?: number;
    playoff?: number;
    championship?: number;
  };
  player?: {
    id: string;
    name: string;
    race?: string; // Made optional as not used directly in PlayerContract card
    position?: string; // Made optional
    overall?: number; // Made optional
    role?: string; // Added for salary suggestion
  };
}

interface SalaryCap {
  id: string;
  teamId: string;
  season: number;
  totalSalary: number;
  capLimit: number;
  capSpace: number;
  luxuryTax: number;
  penalties: number;
}

export default function ContractManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [contractForm, setContractForm] = useState({
    salary: 0,
    duration: 1,
    contractType: "standard",
    bonuses: {
      performance: 0,
      playoff: 0,
      championship: 0,
    }
  });
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);

  const { data: team } = useQuery<TeamData>({
    queryKey: ["/api/teams/my"],
  });

  const { data: contracts } = useQuery<PlayerContract[]>({
    queryKey: ["/api/contracts", team?.id],
    enabled: !!team?.id,
  });

  const { data: salaryCap } = useQuery<SalaryCap>({
    queryKey: ["/api/salary-cap", team?.id],
    enabled: !!team?.id,
  });

  const { data: players } = useQuery<PlayerData[]>({
    queryKey: ["/api/players/team", team?.id], // Assuming this endpoint returns PlayerData[]
    enabled: !!team?.id,
  });

  const { data: contractTemplates } = useQuery<any[]>({ // Using any[] for now for contractTemplates
    queryKey: ["/api/contracts/templates"],
  });

  const negotiateContractMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/contracts/negotiate`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-cap"] });
      setShowNegotiationDialog(false);
      toast({
        title: "Contract Negotiated!",
        description: "The contract has been successfully negotiated and signed.",
      });
    },
  });

  const renewContractMutation = useMutation({
    mutationFn: (data: { contractId: string; newTerms: any }) =>
      apiRequest(`/api/contracts/${data.contractId}/renew`, "POST", data.newTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contract Renewed",
        description: "Player contract has been successfully renewed.",
      });
    },
  });

  const releasePlayerMutation = useMutation({
    mutationFn: (contractId: string) =>
      apiRequest(`/api/contracts/${contractId}/release`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-cap"] });
      toast({
        title: "Player Released",
        description: "Player has been released from their contract.",
      });
    },
  });

  const getContractStatusColor = (contract: PlayerContract) => {
    if (contract.remainingYears <= 1) return "destructive";
    if (contract.remainingYears <= 2) return "secondary";
    return "default";
  };

  const calculateSalaryCapUtilization = () => {
    if (!salaryCap) return 0;
    return ((salaryCap.totalSalary ?? 0) / (salaryCap.capLimit ?? 1)) * 100; // Added nullish coalescing
  };

  const getCapSpaceColor = () => {
    const utilization = calculateSalaryCapUtilization();
    if (utilization >= 95) return "text-red-500";
    if (utilization >= 85) return "text-yellow-500";
    return "text-green-500";
  };

  const handleNegotiateContract = () => {
    if (!selectedPlayer || !team?.id) return; // Added check for team.id
    
    const player = players?.find((p) => p.id === selectedPlayer); // Removed 'any' type
    if (!player) return;

    negotiateContractMutation.mutate({
      playerId: selectedPlayer,
      teamId: team.id, // team.id is now checked
      salary: contractForm.salary,
      duration: contractForm.duration,
      contractType: contractForm.contractType,
      bonuses: contractForm.bonuses,
    });
  };

  const suggestSalary = (player: any) => {
    if (!player) return 0;
    const totalStats = player.speed + player.power + player.throwing + player.catching + player.kicking;
    const baseSalary = totalStats * 1000; // Base calculation using total stats
    const roleMultiplier: Record<string, number> = { // Added type for roleMultiplier
      'Runner': 1.2,
      'Blocker': 1.0,
      'Passer': 1.3,
    };
    const multiplier = player.role ? roleMultiplier[player.role] : 1.0; // Safe access for player.role
    return Math.round(baseSalary * (multiplier || 1.0));
  };

  return (
    <div className="space-y-6">
      {/* Salary Cap Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <HoverCard className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                Salary Cap Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Cap Utilization</span>
                <span className={`font-bold ${getCapSpaceColor()}`}>
                  {calculateSalaryCapUtilization().toFixed(1)}%
                </span>
              </div>
              <Progress value={calculateSalaryCapUtilization()} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Salary:</span>
                  <AnimatedCounter 
                    value={salaryCap?.totalSalary || 0} 
                    prefix="$" 
                    suffix="M"
                    // decimals={1} // Removed decimals
                  />
                </div>
                <div>
                  <span className="text-gray-400">Cap Space:</span>
                  <AnimatedCounter 
                    value={salaryCap?.capSpace || 0} 
                    prefix="$" 
                    suffix="M"
                    // decimals={1} // Removed decimals
                  />
                </div>
              </div>
              {salaryCap?.luxuryTax && salaryCap.luxuryTax > 0 && ( // Added check for salaryCap.luxuryTax
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Luxury Tax: ${salaryCap.luxuryTax.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </HoverCard>

        <PulseWrapper pulse={(contracts?.filter((c: PlayerContract) => c.remainingYears <= 1)?.length ?? 0) > 0}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Expiring Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contracts?.filter((c: PlayerContract) => c.remainingYears <= 1)
                  ?.slice(0, 3) // Added optional chaining
                  ?.map((contract: PlayerContract) => (
                  <div key={contract.id} className="flex items-center justify-between">
                    <span className="text-sm">{contract.player?.name}</span>
                    <Badge variant="destructive"> {/* Removed size="sm" */}
                      {contract.remainingYears}Y left
                    </Badge>
                  </div>
                ))}
                {(contracts?.filter((c: PlayerContract) => c.remainingYears <= 1)?.length ?? 0) === 0 && (
                  <p className="text-sm text-gray-400">No expiring contracts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </PulseWrapper>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">Active Contracts</TabsTrigger>
            <TabsTrigger value="negotiate">Negotiate</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
            <DialogTrigger asChild>
              <InteractiveButton variant="default" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                New Contract
              </InteractiveButton>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Contract Negotiation</DialogTitle>
                <DialogDescription>
                  Negotiate a new contract with your selected player
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="player-select">Player</Label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a player" />
                    </SelectTrigger>
                    <SelectContent>
                      {players?.filter((p: PlayerData) => !contracts?.some((c: PlayerContract) => c.playerId === p.id)) // Used PlayerData
                        ?.map((player: PlayerData) => ( // Used PlayerData
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} - {player.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlayer && (
                  <>
                    <div>
                      <Label htmlFor="salary">Annual Salary</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id="salary"
                            type="number"
                            value={contractForm.salary}
                            onChange={(e) => setContractForm(prev => ({ ...prev, salary: Number(e.target.value) }))}
                            placeholder="Enter salary"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const player = players?.find((p: PlayerData) => p.id === selectedPlayer); // Used PlayerData
                              if (player) setContractForm(prev => ({ ...prev, salary: suggestSalary(player) })); // Added null check
                            }}
                          >
                            Suggest
                          </Button>
                        </div>
                        <Slider
                          value={[contractForm.salary]}
                          onValueChange={(value) => setContractForm(prev => ({ ...prev, salary: value[0] }))}
                          max={10000000}
                          min={500000}
                          step={100000}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration">Contract Duration (Years)</Label>
                      <Select 
                        value={contractForm.duration.toString()} 
                        onValueChange={(value) => setContractForm(prev => ({ ...prev, duration: Number(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Year</SelectItem>
                          <SelectItem value="2">2 Years</SelectItem>
                          <SelectItem value="3">3 Years</SelectItem>
                          <SelectItem value="4">4 Years</SelectItem>
                          <SelectItem value="5">5 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="contract-type">Contract Type</Label>
                      <Select 
                        value={contractForm.contractType} 
                        onValueChange={(value) => setContractForm(prev => ({ ...prev, contractType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="rookie">Rookie</SelectItem>
                          <SelectItem value="veteran">Veteran</SelectItem>
                          <SelectItem value="franchise">Franchise Tag</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Performance Bonuses</Label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <Label htmlFor="perf-bonus">Performance</Label>
                          <Input
                            id="perf-bonus"
                            type="number"
                            placeholder="0"
                            value={contractForm.bonuses.performance}
                            onChange={(e) => setContractForm(prev => ({
                              ...prev,
                              bonuses: { ...prev.bonuses, performance: Number(e.target.value) }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="playoff-bonus">Playoffs</Label>
                          <Input
                            id="playoff-bonus"
                            type="number"
                            placeholder="0"
                            value={contractForm.bonuses.playoff}
                            onChange={(e) => setContractForm(prev => ({
                              ...prev,
                              bonuses: { ...prev.bonuses, playoff: Number(e.target.value) }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="champ-bonus">Championship</Label>
                          <Input
                            id="champ-bonus"
                            type="number"
                            placeholder="0"
                            value={contractForm.bonuses.championship}
                            onChange={(e) => setContractForm(prev => ({
                              ...prev,
                              bonuses: { ...prev.bonuses, championship: Number(e.target.value) }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleNegotiateContract}
                  disabled={!selectedPlayer || contractForm.salary === 0 || negotiateContractMutation.isPending}
                  className="w-full"
                >
                  {negotiateContractMutation.isPending ? "Negotiating..." : "Sign Contract"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {contracts?.map((contract: PlayerContract) => (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{contract.player?.name}</p>
                        <p className="text-sm text-gray-400">
                          {contract.player?.position} • Overall: {contract.player?.overall ?? 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-green-400">
                        ${(contract.salary / 1000000).toFixed(1)}M/year
                      </p>
                      <Badge variant={getContractStatusColor(contract)}> {/* Removed size="sm" */}
                        {contract.remainingYears} years left
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          renewContractMutation.mutate({
                            contractId: contract.id,
                            newTerms: { duration: contract.duration + 1 }
                          });
                        }}
                        disabled={renewContractMutation.isPending}
                      >
                        Renew
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => releasePlayerMutation.mutate(contract.id)}
                        disabled={releasePlayerMutation.isPending}
                      >
                        Release
                      </Button>
                    </div>
                  </div>
                  {contract.bonuses && Object.values(contract.bonuses).some((v: any) => v > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Performance Bonuses:</p>
                      <div className="flex gap-3 text-xs">
                        {contract.bonuses?.performance && contract.bonuses.performance > 0 && (
                          <span>Performance: ${contract.bonuses.performance.toLocaleString()}</span>
                        )}
                        {contract.bonuses?.playoff && contract.bonuses.playoff > 0 && (
                          <span>Playoffs: ${contract.bonuses.playoff.toLocaleString()}</span>
                        )}
                        {contract.bonuses?.championship && contract.bonuses.championship > 0 && (
                          <span>Championship: ${contract.bonuses.championship.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="negotiate" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Contract Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {contractTemplates?.map((template: any) => (
                    <Card key={template.id} className="cursor-pointer hover:bg-gray-800/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-gray-400">{template.description}</p>
                          </div>
                          <Badge variant="outline">{template.type}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Duration:</span>
                            <span className="ml-1">{template.duration} years</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Avg Salary:</span>
                            <span className="ml-1">${(template.avgSalary / 1000000).toFixed(1)}M</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Salary Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Runner', 'Blocker', 'Passer'].map((position) => {
                    const positionSalary = contracts
                      ?.filter((c: PlayerContract) => c.player?.role === position)
                      ?.reduce((sum: number, c: PlayerContract) => sum + c.salary, 0) || 0;
                    const percentage = salaryCap?.totalSalary ? (positionSalary / salaryCap.totalSalary) * 100 : 0; // Added null check for salaryCap.totalSalary
                    
                    return (
                      <div key={position} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{position}</span>
                          <span>${(positionSalary / 1000000).toFixed(1)}M ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Contract Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contracts?.slice(0, 5)?.map((contract: PlayerContract) => { // Added optional chaining for slice
                    const efficiency = contract.player?.overall && contract.salary > 0 ? // Added check for salary > 0
                      (contract.player.overall / (contract.salary / 1000000)) : 0;
                    
                    return (
                      <div key={contract.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{contract.player?.name}</p>
                          <p className="text-xs text-gray-400">
                            ${(contract.salary / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <Badge variant={efficiency > 20 ? "default" : efficiency > 15 ? "secondary" : "destructive"}>
                          {efficiency.toFixed(1)} EFF
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}