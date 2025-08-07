/**
 * Stadium Overview Component - Centralized stadium management
 * Follows UI/UX requirements for prominent placement and real-time updates
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Wrench, 
  Star,
  ArrowUp,
  Calculator,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StadiumData {
  capacity: number;
  concessionsLevel: number;
  parkingLevel: number;
  vipSuitesLevel: number;
  merchandisingLevel: number;
  lightingScreensLevel: number;
  maintenanceCost: number;
  fanLoyalty: number;
  attendanceRate: number;
  stadiumValue: number;
}

interface UpgradeCosts {
  capacity: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  merchandising: number;
  lighting: number;
}

interface StadiumOverviewProps {
  teamId: string;
  showUpgrades?: boolean;
}

export default function StadiumOverview({ teamId, showUpgrades = true }: StadiumOverviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stadium data
  const { data: stadiumData, isLoading } = useQuery({
    queryKey: ['/api/stadium-atmosphere/stadium-data', teamId],
    queryFn: () => apiRequest('/api/stadium-atmosphere/stadium-data'),
    enabled: !!teamId,
  });

  // Fetch atmosphere data for fan loyalty and attendance
  const { data: atmosphereData } = useQuery({
    queryKey: ['/api/stadium-atmosphere/atmosphere-data', teamId],
    queryFn: () => apiRequest('/api/stadium-atmosphere/atmosphere-data'),
    enabled: !!teamId,
  });

  // Fetch upgrade costs
  const { data: upgradeCosts } = useQuery({
    queryKey: ['/api/stadium-atmosphere/upgrade-costs'],
    queryFn: () => apiRequest('/api/stadium-atmosphere/upgrade-costs'),
    enabled: !!teamId,
  });

  // Stadium upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: ({ facility }: { facility: string }) =>
      apiRequest(`/api/stadium-atmosphere/upgrade/${facility}`, 'POST'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stadium-atmosphere'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'finances'] });
      toast({
        title: "Stadium Upgrade Complete",
        description: data.message || "Facility has been upgraded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to complete stadium upgrade",
        variant: "destructive",
      });
    },
  });

  const stadium: StadiumData = {
    capacity: (stadiumData as any)?.data?.capacity || 5000,
    concessionsLevel: (stadiumData as any)?.data?.concessionsLevel || 1,
    parkingLevel: (stadiumData as any)?.data?.parkingLevel || 1,
    vipSuitesLevel: (stadiumData as any)?.data?.vipSuitesLevel || 1,
    merchandisingLevel: (stadiumData as any)?.data?.merchandisingLevel || 1,
    lightingScreensLevel: (stadiumData as any)?.data?.lightingScreensLevel || 1,
    maintenanceCost: (stadiumData as any)?.data?.maintenanceCost || 5000,
    fanLoyalty: (atmosphereData as any)?.data?.fanLoyalty || 50,
    attendanceRate: (atmosphereData as any)?.data?.attendanceRate || 65,
    stadiumValue: (stadiumData as any)?.data?.stadiumValue || 250000,
  };

  const costs: UpgradeCosts = {
    capacity: (upgradeCosts as any)?.data?.capacity || 50000,
    concessions: (upgradeCosts as any)?.data?.concessions || 25000,
    parking: (upgradeCosts as any)?.data?.parking || 15000,
    vipSuites: (upgradeCosts as any)?.data?.vipSuites || 75000,
    merchandising: (upgradeCosts as any)?.data?.merchandising || 20000,
    lighting: (upgradeCosts as any)?.data?.lighting || 30000,
  };

  // Calculate KPIs
  const capacityUtilization = Math.round((stadium.attendanceRate * stadium.capacity) / stadium.capacity * 100);
  const estimatedGameRevenue = Math.round(stadium.capacity * stadium.attendanceRate * 0.01 * 35); // Approximate revenue per game

  const facilities = [
    {
      name: "Stadium Capacity",
      current: stadium.capacity,
      level: Math.floor(stadium.capacity / 2500), // Tier based on capacity
      upgradeCost: costs.capacity,
      icon: Building,
      description: "Increases ticket sales and fan engagement",
      roi: "High - Direct revenue impact"
    },
    {
      name: "Concessions",
      current: stadium.concessionsLevel,
      level: stadium.concessionsLevel,
      upgradeCost: costs.concessions,
      icon: DollarSign,
      description: "Food & beverage sales during matches",
      roi: "Medium - Steady revenue stream"
    },
    {
      name: "Parking",
      current: stadium.parkingLevel,
      level: stadium.parkingLevel,
      upgradeCost: costs.parking,
      icon: Users,
      description: "Parking fees and fan convenience",
      roi: "Low - Convenience upgrade"
    },
    {
      name: "VIP Suites",
      current: stadium.vipSuitesLevel,
      level: stadium.vipSuitesLevel,
      upgradeCost: costs.vipSuites,
      icon: Star,
      description: "Premium seating and experiences",
      roi: "Very High - Premium pricing"
    },
    {
      name: "Merchandising",
      current: stadium.merchandisingLevel,
      level: stadium.merchandisingLevel,
      upgradeCost: costs.merchandising,
      icon: TrendingUp,
      description: "Team merchandise and apparel sales",
      roi: "Medium - Brand building"
    },
    {
      name: "Lighting & Screens",
      current: stadium.lightingScreensLevel,
      level: stadium.lightingScreensLevel,
      upgradeCost: costs.lighting,
      icon: Wrench,
      description: "Atmosphere and fan experience",
      roi: "High - Fan loyalty impact"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stadium KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stadium Capacity</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stadium.capacity.toLocaleString()}</div>
            <Progress value={Math.min(100, (stadium.capacity / 25000) * 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Tier {Math.floor(stadium.capacity / 2500)} Stadium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fan Loyalty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stadium.fanLoyalty}%</div>
            <Progress value={stadium.fanLoyalty} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stadium.fanLoyalty >= 80 ? 'Excellent' : stadium.fanLoyalty >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stadium.attendanceRate}%</div>
            <Progress value={stadium.attendanceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(stadium.capacity * stadium.attendanceRate * 0.01)} fans per game
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Maintenance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₡{stadium.maintenanceCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Daily operational costs
            </p>
            <p className="text-xs text-muted-foreground">
              Est. game revenue: ₡{estimatedGameRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stadium Facilities Management */}
      {showUpgrades && (
        <Tabs defaultValue="facilities" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="facilities">Facilities Overview</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrade Center</TabsTrigger>
          </TabsList>
          
          <TabsContent value="facilities" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((facility) => (
                <Card key={facility.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{facility.name}</CardTitle>
                    <facility.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl font-bold">
                        {facility.name === "Stadium Capacity" 
                          ? facility.current.toLocaleString()
                          : `Level ${facility.level}`
                        }
                      </div>
                      <Badge variant="outline">
                        Tier {facility.level}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {facility.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-muted-foreground">ROI: {facility.roi}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upgrades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="h-5 w-5" />
                  Stadium Upgrade Center
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upgrade your stadium facilities to increase revenue and fan engagement
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilities.map((facility) => (
                    <div key={facility.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <facility.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{facility.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Current: Level {facility.level}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₡{facility.upgradeCost.toLocaleString()}</div>
                        <Button
                          size="sm"
                          onClick={() => upgradeMutation.mutate({ facility: facility.name.toLowerCase().replace(/\s+/g, '') })}
                          disabled={upgradeMutation.isPending}
                          className="mt-2"
                        >
                          {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* ROI Helper */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Upgrade ROI Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current estimated revenue per game:</span>
                    <span className="font-bold">₡{estimatedGameRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily maintenance cost:</span>
                    <span className="font-bold text-red-600">₡{stadium.maintenanceCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Net revenue per game:</span>
                    <span className={`font-bold ${estimatedGameRevenue - stadium.maintenanceCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₡{(estimatedGameRevenue - stadium.maintenanceCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}