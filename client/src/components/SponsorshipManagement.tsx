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
import { Building2, TrendingUp, DollarSign, Award, Users, Target, Calendar, Briefcase } from "lucide-react";
import { AnimatedCounter, PulseWrapper, HoverCard, InteractiveButton } from "@/components/MicroInteractions";

interface SponsorshipDeal {
  id: string;
  teamId: string;
  sponsorName: string;
  dealType: string;
  value: number;
  duration: number;
  remainingYears: number;
  bonusConditions?: any;
  status: string;
  signedDate: string;
  expiryDate: string;
}

interface StadiumRevenue {
  id: string;
  teamId: string;
  season: number;
  ticketSales: number;
  concessionSales: number;
  merchandiseSales: number;
  parkingRevenue: number;
  corporateBoxes: number;
  namingRights: number;
  totalRevenue: number;
  month: number;
}

export default function SponsorshipManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [dealForm, setDealForm] = useState({
    sponsorName: "",
    dealType: "jersey",
    value: 0,
    duration: 1,
    bonusConditions: {
      playoffBonus: 0,
      championshipBonus: 0,
      attendanceThreshold: 0,
    }
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const { data: sponsorshipDeals } = useQuery({
    queryKey: ["/api/sponsorships", team?.id],
    enabled: !!team?.id,
  });

  const { data: stadiumRevenue } = useQuery({
    queryKey: ["/api/stadium/revenue", team?.id],
    enabled: !!team?.id,
  });

  const { data: availableSponsors } = useQuery({
    queryKey: ["/api/sponsorships/available"],
  });

  const { data: revenueAnalytics } = useQuery({
    queryKey: ["/api/stadium/analytics", team?.id],
    enabled: !!team?.id,
  });

  const negotiateSponsorshipMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/sponsorships/negotiate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsorships"] });
      setShowDealDialog(false);
      toast({
        title: "Sponsorship Deal Signed!",
        description: "New sponsorship agreement has been successfully negotiated.",
      });
    },
  });

  const renewSponsorshipMutation = useMutation({
    mutationFn: (data: { dealId: string; newTerms: any }) =>
      apiRequest(`/api/sponsorships/${data.dealId}/renew`, {
        method: "POST",
        body: JSON.stringify(data.newTerms),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsorships"] });
      toast({
        title: "Sponsorship Renewed",
        description: "Sponsorship deal has been successfully renewed.",
      });
    },
  });

  const updateStadiumMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/stadium/upgrade`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stadium/revenue"] });
      toast({
        title: "Stadium Upgraded",
        description: "Stadium improvements will increase revenue potential.",
      });
    },
  });

  const getDealTypeColor = (dealType: string) => {
    const colors = {
      jersey: "bg-blue-500",
      stadium: "bg-green-500",
      equipment: "bg-purple-500",
      naming_rights: "bg-yellow-500",
    };
    return colors[dealType] || "bg-gray-500";
  };

  const getDealTypeIcon = (dealType: string) => {
    const icons = {
      jersey: Users,
      stadium: Building2,
      equipment: Target,
      naming_rights: Award,
    };
    return icons[dealType] || Briefcase;
  };

  const calculateTotalSponsorshipValue = () => {
    return sponsorshipDeals?.reduce((sum: number, deal: SponsorshipDeal) => 
      deal.status === "active" ? sum + deal.value : sum, 0) || 0;
  };

  const calculateMonthlyRevenue = () => {
    const currentMonth = stadiumRevenue?.find((r: StadiumRevenue) => r.month === new Date().getMonth() + 1);
    return currentMonth?.totalRevenue || 0;
  };

  const getRevenueGrowth = () => {
    if (!stadiumRevenue || stadiumRevenue.length < 2) return 0;
    const current = stadiumRevenue[stadiumRevenue.length - 1]?.totalRevenue || 0;
    const previous = stadiumRevenue[stadiumRevenue.length - 2]?.totalRevenue || 0;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  const handleNegotiateDeal = () => {
    negotiateSponsorshipMutation.mutate({
      teamId: team.id,
      sponsorName: dealForm.sponsorName,
      dealType: dealForm.dealType,
      value: dealForm.value,
      duration: dealForm.duration,
      bonusConditions: dealForm.bonusConditions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Sponsorships</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedCounter 
                value={calculateTotalSponsorshipValue()} 
                className="text-2xl font-bold text-green-400" 
                prefix="$" 
                suffix="M"
                decimals={1}
              />
              <p className="text-xs text-gray-500 mt-1">
                {sponsorshipDeals?.filter((d: SponsorshipDeal) => d.status === "active").length || 0} active deals
              </p>
            </CardContent>
          </Card>
        </HoverCard>

        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedCounter 
                value={calculateMonthlyRevenue()} 
                className="text-2xl font-bold text-blue-400" 
                prefix="$" 
                suffix="K"
                decimals={0}
              />
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                <span className="text-xs text-green-400">
                  {getRevenueGrowth() > 0 ? '+' : ''}{getRevenueGrowth().toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </HoverCard>

        <HoverCard>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Stadium Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedCounter 
                value={team?.stadiumCapacity || 50000} 
                className="text-2xl font-bold text-purple-400" 
                suffix="K"
                decimals={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                {((team?.averageAttendance || 35000) / (team?.stadiumCapacity || 50000) * 100).toFixed(1)}% avg attendance
              </p>
            </CardContent>
          </Card>
        </HoverCard>

        <PulseWrapper pulse={sponsorshipDeals?.some((d: SponsorshipDeal) => d.remainingYears <= 1)}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Expiring Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {sponsorshipDeals?.filter((d: SponsorshipDeal) => d.remainingYears <= 1).length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">requiring renewal</p>
            </CardContent>
          </Card>
        </PulseWrapper>
      </div>

      <Tabs defaultValue="deals" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="deals">Active Deals</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
            <DialogTrigger asChild>
              <InteractiveButton variant="default" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                New Deal
              </InteractiveButton>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Negotiate Sponsorship Deal</DialogTitle>
                <DialogDescription>
                  Create a new sponsorship agreement with potential partners
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sponsor-name">Sponsor Name</Label>
                  <Input
                    id="sponsor-name"
                    value={dealForm.sponsorName}
                    onChange={(e) => setDealForm(prev => ({ ...prev, sponsorName: e.target.value }))}
                    placeholder="Enter sponsor company name"
                  />
                </div>

                <div>
                  <Label htmlFor="deal-type">Deal Type</Label>
                  <Select 
                    value={dealForm.dealType} 
                    onValueChange={(value) => setDealForm(prev => ({ ...prev, dealType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jersey">Jersey Sponsorship</SelectItem>
                      <SelectItem value="stadium">Stadium Sponsorship</SelectItem>
                      <SelectItem value="equipment">Equipment Partnership</SelectItem>
                      <SelectItem value="naming_rights">Naming Rights</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deal-value">Annual Value ($)</Label>
                  <Input
                    id="deal-value"
                    type="number"
                    value={dealForm.value}
                    onChange={(e) => setDealForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                    placeholder="Enter annual value"
                  />
                </div>

                <div>
                  <Label htmlFor="deal-duration">Duration (Years)</Label>
                  <Select 
                    value={dealForm.duration.toString()} 
                    onValueChange={(value) => setDealForm(prev => ({ ...prev, duration: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Year</SelectItem>
                      <SelectItem value="2">2 Years</SelectItem>
                      <SelectItem value="3">3 Years</SelectItem>
                      <SelectItem value="5">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Performance Bonuses</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label htmlFor="playoff-bonus">Playoff Bonus</Label>
                      <Input
                        id="playoff-bonus"
                        type="number"
                        placeholder="0"
                        value={dealForm.bonusConditions.playoffBonus}
                        onChange={(e) => setDealForm(prev => ({
                          ...prev,
                          bonusConditions: { ...prev.bonusConditions, playoffBonus: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="championship-bonus">Championship Bonus</Label>
                      <Input
                        id="championship-bonus"
                        type="number"
                        placeholder="0"
                        value={dealForm.bonusConditions.championshipBonus}
                        onChange={(e) => setDealForm(prev => ({
                          ...prev,
                          bonusConditions: { ...prev.bonusConditions, championshipBonus: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleNegotiateDeal}
                  disabled={!dealForm.sponsorName || dealForm.value === 0 || negotiateSponsorshipMutation.isPending}
                  className="w-full"
                >
                  {negotiateSponsorshipMutation.isPending ? "Negotiating..." : "Sign Deal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="deals" className="space-y-4">
          <div className="grid gap-4">
            {sponsorshipDeals?.map((deal: SponsorshipDeal) => {
              const IconComponent = getDealTypeIcon(deal.dealType);
              return (
                <Card key={deal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getDealTypeColor(deal.dealType)}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{deal.sponsorName}</p>
                          <p className="text-sm text-gray-400 capitalize">
                            {deal.dealType.replace('_', ' ')} • {deal.duration} year deal
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-green-400">
                          ${(deal.value / 1000000).toFixed(1)}M/year
                        </p>
                        <Badge variant={deal.remainingYears <= 1 ? "destructive" : "default"} size="sm">
                          {deal.remainingYears} years left
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            renewSponsorshipMutation.mutate({
                              dealId: deal.id,
                              newTerms: { duration: deal.duration + 1, value: deal.value * 1.1 }
                            });
                          }}
                          disabled={renewSponsorshipMutation.isPending}
                        >
                          Renew
                        </Button>
                      </div>
                    </div>
                    {deal.bonusConditions && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Performance Bonuses:</p>
                        <div className="flex gap-3 text-xs">
                          {deal.bonusConditions.playoffBonus > 0 && (
                            <span>Playoffs: ${deal.bonusConditions.playoffBonus.toLocaleString()}</span>
                          )}
                          {deal.bonusConditions.championshipBonus > 0 && (
                            <span>Championship: ${deal.bonusConditions.championshipBonus.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Ticket Sales', value: stadiumRevenue?.[0]?.ticketSales || 0, color: 'bg-blue-500' },
                    { name: 'Concessions', value: stadiumRevenue?.[0]?.concessionSales || 0, color: 'bg-green-500' },
                    { name: 'Merchandise', value: stadiumRevenue?.[0]?.merchandiseSales || 0, color: 'bg-purple-500' },
                    { name: 'Corporate Boxes', value: stadiumRevenue?.[0]?.corporateBoxes || 0, color: 'bg-yellow-500' },
                  ].map((item) => {
                    const total = stadiumRevenue?.[0]?.totalRevenue || 1;
                    const percentage = (item.value / total) * 100;
                    
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span>${(item.value / 1000).toFixed(0)}K ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Stadium Upgrades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Expand Seating', cost: 5000000, revenue: 500000, description: 'Add 10,000 seats' },
                    { name: 'Luxury Suites', cost: 3000000, revenue: 750000, description: '20 premium suites' },
                    { name: 'Concession Upgrade', cost: 1500000, revenue: 200000, description: 'Modern food courts' },
                    { name: 'Parking Expansion', cost: 2000000, revenue: 150000, description: '500 new spots' },
                  ].map((upgrade) => (
                    <div key={upgrade.name} className="p-3 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{upgrade.name}</p>
                          <p className="text-xs text-gray-400">{upgrade.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStadiumMutation.mutate(upgrade)}
                          disabled={updateStadiumMutation.isPending}
                        >
                          Upgrade
                        </Button>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-400">Cost: ${(upgrade.cost / 1000000).toFixed(1)}M</span>
                        <span className="text-green-400">+${(upgrade.revenue / 1000).toFixed(0)}K/month</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {availableSponsors?.map((sponsor: any) => (
              <Card key={sponsor.id} className="cursor-pointer hover:bg-gray-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {sponsor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{sponsor.name}</p>
                        <p className="text-sm text-gray-400">{sponsor.industry}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">
                        ${(sponsor.maxValue / 1000000).toFixed(1)}M
                      </p>
                      <Badge variant="outline" size="sm">
                        {sponsor.preferredDealType}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Min Duration:</span>
                      <span className="ml-1">{sponsor.minDuration} years</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Interest Level:</span>
                      <span className="ml-1">{sponsor.interestLevel}/10</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => {
                      setDealForm(prev => ({
                        ...prev,
                        sponsorName: sponsor.name,
                        dealType: sponsor.preferredDealType,
                        value: sponsor.maxValue * 0.8,
                        duration: sponsor.minDuration,
                      }));
                      setShowDealDialog(true);
                    }}
                  >
                    Negotiate Deal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}