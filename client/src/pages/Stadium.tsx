import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building, Users, Zap, Trophy, Target, DollarSign } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Stadium() {
  const [selectedUpgrade, setSelectedUpgrade] = useState<any>(null);
  const { toast } = useToast();

  const { data: stadium } = useQuery({
    queryKey: ["/api/stadium"],
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  const upgradeStadiumMutation = useMutation({
    mutationFn: async (upgrade: any) => {
      await apiRequest("/api/stadium/upgrade", {
        method: "POST",
        body: JSON.stringify(upgrade),
      });
    },
    onSuccess: () => {
      toast({
        title: "Upgrade Successful",
        description: "Stadium facility has been upgraded!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changeFieldSizeMutation = useMutation({
    mutationFn: async (fieldSize: string) => {
      await apiRequest("/api/stadium/field-size", {
        method: "POST",
        body: JSON.stringify({ fieldSize }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Field Size Changed",
        description: "Your tactical field size has been updated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const manageSponsorMutation = useMutation({
    mutationFn: async (sponsorData: any) => {
      await apiRequest("/api/stadium/sponsors", {
        method: "POST",
        body: JSON.stringify(sponsorData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sponsor Agreement Updated",
        description: "Sponsorship deal has been finalized!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sponsorship Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getFieldSizeDescription = (size: string) => {
    switch (size) {
      case "small":
        return "Compact field favoring quick plays and agility-based tactics";
      case "medium":
        return "Balanced field suitable for all play styles";
      case "large":
        return "Expansive field favoring power plays and long-range strategies";
      default:
        return "";
    }
  };

  const getFieldSizeStats = (size: string) => {
    switch (size) {
      case "small":
        return { agility: "+10%", speed: "+5%", power: "-5%" };
      case "medium":
        return { balanced: "No modifiers" };
      case "large":
        return { power: "+10%", throwing: "+5%", agility: "-5%" };
      default:
        return {};
    }
  };

  const seatingTiers = [
    { name: "Basic Seating", capacity: 5000, cost: 50000, revenue: 1000 },
    { name: "Premium Seating", capacity: 2000, cost: 100000, revenue: 2500 },
    { name: "VIP Boxes", capacity: 500, cost: 200000, revenue: 5000 },
    { name: "Corporate Suites", capacity: 200, cost: 500000, revenue: 15000 },
  ];

  const sponsorshipTiers = [
    { 
      name: "Local Business", 
      tier: "bronze", 
      monthlyRevenue: 5000, 
      cost: 25000,
      requirements: "Team must be in top 50% of division"
    },
    { 
      name: "Regional Brand", 
      tier: "silver", 
      monthlyRevenue: 15000, 
      cost: 75000,
      requirements: "Team must be in top 25% of division"
    },
    { 
      name: "National Corporation", 
      tier: "gold", 
      monthlyRevenue: 35000, 
      cost: 200000,
      requirements: "Team must be in Diamond or Platinum division"
    },
    { 
      name: "Global Enterprise", 
      tier: "platinum", 
      monthlyRevenue: 75000, 
      cost: 500000,
      requirements: "Team must be #1 in Diamond division"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Stadium Management
          </h1>
          <p className="text-gray-400 mt-1">
            Upgrade facilities, manage seating, and secure sponsorship deals
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{stadium?.totalCapacity?.toLocaleString() || 0} seats</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span>{stadium?.monthlyRevenue?.toLocaleString() || 0}₡/month</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seating">Seating</TabsTrigger>
          <TabsTrigger value="field">Field Size</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Stadium Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {stadium?.level || 1}
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {stadium?.name || "Basic Stadium"}
                </p>
                <Progress value={((stadium?.level || 1) / 10) * 100} />
                <p className="text-xs text-gray-400 mt-2">
                  Level {stadium?.level || 1}/10
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Total Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {stadium?.totalCapacity?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Average attendance: {Math.floor((stadium?.totalCapacity || 0) * 0.7).toLocaleString()}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Basic: {stadium?.basicSeating || 0}</span>
                    <span>Premium: {stadium?.premiumSeating || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VIP: {stadium?.vipSeating || 0}</span>
                    <span>Corporate: {stadium?.corporateSeating || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Field Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2 capitalize">
                  {stadium?.fieldSize || "Medium"}
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {getFieldSizeDescription(stadium?.fieldSize || "medium")}
                </p>
                <div className="space-y-1 text-xs">
                  {Object.entries(getFieldSizeStats(stadium?.fieldSize || "medium")).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                      <span className="capitalize">{stat}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Sponsorships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stadium?.sponsors?.map((sponsor: any) => (
                  <div key={sponsor.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-semibold">{sponsor.name}</p>
                      <p className="text-sm text-gray-400">{sponsor.tier} tier</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">{sponsor.monthlyRevenue.toLocaleString()}₡/month</p>
                      <p className="text-xs text-gray-400">{sponsor.contractLength} months left</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-400 col-span-2">No active sponsorships</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seating" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seatingTiers.map((tier) => (
              <Card key={tier.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{tier.name}</span>
                    <Badge variant="outline">{tier.capacity} seats</Badge>
                  </CardTitle>
                  <CardDescription>
                    Monthly revenue per seat: {tier.revenue}₡
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current: {stadium?.[tier.name.toLowerCase().replace(' ', '')] || 0} seats</span>
                    <span className="text-green-400">
                      {((stadium?.[tier.name.toLowerCase().replace(' ', '')] || 0) * tier.revenue).toLocaleString()}₡/month
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Cost: {tier.cost.toLocaleString()}₡</span>
                    <Button
                      onClick={() => upgradeStadiumMutation.mutate({
                        type: 'seating',
                        tier: tier.name,
                        cost: tier.cost
                      })}
                      disabled={upgradeStadiumMutation.isPending}
                      size="sm"
                    >
                      Add +{tier.capacity}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="field" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Size Configuration</CardTitle>
              <CardDescription>
                Change your field size to match your tactical preferences. 
                Current size: <strong className="capitalize">{stadium?.fieldSize || "medium"}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["small", "medium", "large"].map((size) => (
                  <Card key={size} className={`cursor-pointer transition-colors ${
                    stadium?.fieldSize === size ? "border-blue-500 bg-blue-500/10" : "hover:border-gray-400"
                  }`}>
                    <CardHeader>
                      <CardTitle className="capitalize flex items-center justify-between">
                        {size} Field
                        {stadium?.fieldSize === size && (
                          <Badge className="bg-blue-500">Current</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {getFieldSizeDescription(size)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1 text-sm">
                        {Object.entries(getFieldSizeStats(size)).map(([stat, value]) => (
                          <div key={stat} className="flex justify-between">
                            <span className="capitalize">{stat}:</span>
                            <span className={
                              value.includes('+') ? 'text-green-400' : 
                              value.includes('-') ? 'text-red-400' : 'text-gray-400'
                            }>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {stadium?.fieldSize !== size && (
                        <Button
                          onClick={() => changeFieldSizeMutation.mutate(size)}
                          disabled={changeFieldSizeMutation.isPending}
                          variant="outline"
                          className="w-full"
                        >
                          Switch to {size} (50,000₡)
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sponsorshipTiers.map((sponsor) => (
              <Card key={sponsor.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{sponsor.name}</span>
                    <Badge className={`
                      ${sponsor.tier === 'bronze' && 'bg-amber-600'}
                      ${sponsor.tier === 'silver' && 'bg-gray-400'}
                      ${sponsor.tier === 'gold' && 'bg-yellow-500'}
                      ${sponsor.tier === 'platinum' && 'bg-blue-500'}
                      text-black
                    `}>
                      {sponsor.tier}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {sponsor.requirements}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monthly Revenue:</span>
                      <span className="text-green-400 font-bold">
                        {sponsor.monthlyRevenue.toLocaleString()}₡
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Setup Cost:</span>
                      <span>{sponsor.cost.toLocaleString()}₡</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => manageSponsorMutation.mutate({
                      sponsorTier: sponsor.tier,
                      cost: sponsor.cost,
                      monthlyRevenue: sponsor.monthlyRevenue
                    })}
                    disabled={manageSponsorMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {stadium?.sponsors?.find((s: any) => s.tier === sponsor.tier) ? 
                      "Renew Contract" : "Sign Contract"
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}