import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Heart, 
  Home, 
  Star, 
  DollarSign, 
  Users, 
  Zap, 
  Shield,
  Car,
  Monitor,
  ShoppingBag
} from "lucide-react";

// Type interfaces
interface StadiumData {
  success: boolean;
  data: {
    stadium: {
      id: string;
      name: string;
      level: number;
      capacity: number;
      fieldSize: string;
      lightingLevel: number;
      concessionsLevel: number;
      parkingLevel: number;
      merchandisingLevel: number;
      vipSuitesLevel: number;
      screensLevel: number;
      securityLevel: number;
      maintenanceCost: number;
    };
    availableUpgrades: Array<{
      type: string;
      name: string;
      description: string;
      cost: number;
      currentLevel: number;
      maxLevel: number;
    }>;
    events: any[];
    atmosphere: {
      fanLoyalty: number;
      homeAdvantage: number;
      facilityQuality: number;
      description: string;
    };
  };
}

interface RevenueData {
  success: boolean;
  data: {
    stadium: any;
    fanLoyalty: number;
    projectedAttendance: {
      attendance: number;
      attendanceRate: number;
      description: string;
    };
    projectedRevenue: {
      ticketSales: number;
      concessionSales: number;
      parkingRevenue: number;
      apparelSales: number;
      vipSuiteRevenue: number;
      atmosphereBonus: number;
      totalRevenue: number;
      maintenanceCost: number;
      netRevenue: number;
    };
  };
}

interface Finances {
  credits: number;
  gems: number;
}

export default function Stadium() {
  const { toast } = useToast();
  const [selectedUpgrade, setSelectedUpgrade] = useState<any>(null);

  const { data: stadiumData, isLoading } = useQuery<StadiumData>({
    queryKey: ["/api/stadium"],
  });

  const { data: revenueData } = useQuery<RevenueData>({
    queryKey: ["/api/stadium/revenue"],
  });

  const { data: finances } = useQuery<Finances>({
    queryKey: ["/api/teams/my/finances"],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (upgrade: any) => {
      return await apiRequest("/api/stadium/upgrade", "POST", {
        upgradeType: upgrade.type,
        upgradeName: upgrade.name
      });
    },
    onSuccess: () => {
      toast({
        title: "Stadium Upgraded",
        description: "Your stadium has been successfully upgraded!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium/revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
      setSelectedUpgrade(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Could not upgrade stadium",
        variant: "destructive",
      });
    },
  });

  const formatCredits = (amount: number) => {
    return `₡${amount?.toLocaleString()}`;
  };

  const getFieldSizeDescription = (size: string) => {
    switch (size) {
      case "standard": return "Standard Field";
      case "large": return "Large Field";
      case "small": return "Small Field";
      default: return size;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading stadium data...</div>
        </div>
      </div>
    );
  }

  const stadium = stadiumData?.data?.stadium;
  const availableUpgrades = stadiumData?.data?.availableUpgrades || [];
  const atmosphere = stadiumData?.data?.atmosphere;
  const revenue = revenueData?.data?.projectedRevenue;
  const attendance = revenueData?.data?.projectedAttendance;

  // Fix capacity display issue - show 15,000 if 0 or null
  const displayCapacity = stadium?.capacity && stadium.capacity > 0 ? stadium.capacity : 15000;

  if (!stadium) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">No Stadium Found</h2>
            <p className="text-gray-400">Unable to load stadium data. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Stadium Management</h1>
          <p className="text-gray-400">Manage your stadium facilities, revenue, and fan atmosphere</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="upgrades">Stadium Upgrades</TabsTrigger>
            <TabsTrigger value="atmosphere">Fan Atmosphere</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stadium Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Stadium Capacity</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{displayCapacity.toLocaleString()}</div>
                  <p className="text-xs text-gray-400">Total seats</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Fan Loyalty</CardTitle>
                  <Heart className="h-4 w-4 text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">{atmosphere?.fanLoyalty || 50}%</div>
                  <p className="text-xs text-gray-400">Current loyalty</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Home Advantage</CardTitle>
                  <Home className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{atmosphere?.homeAdvantage || 0}%</div>
                  <p className="text-xs text-gray-400">Field advantage</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Stadium Level</CardTitle>
                  <Star className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">{stadium.level || 1}</div>
                  <p className="text-xs text-gray-400">Upgrade level</p>
                </CardContent>
              </Card>
            </div>

            {/* Stadium Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Stadium Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stadium Name:</span>
                    <span className="text-white">{stadium.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Field Size:</span>
                    <Badge variant="outline" className="text-white border-gray-500">
                      {getFieldSizeDescription(stadium.fieldSize)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Maintenance Cost:</span>
                    <span className="text-red-400">{formatCredits(stadium.maintenanceCost)}/day</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Facility Levels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lighting:</span>
                      <span className="text-white">Level {stadium.lightingLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Concessions:</span>
                      <span className="text-white">Level {stadium.concessionsLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Parking:</span>
                      <span className="text-white">Level {stadium.parkingLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VIP Suites:</span>
                      <span className="text-white">Level {stadium.vipSuitesLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Merchandising:</span>
                      <span className="text-white">Level {stadium.merchandisingLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Security:</span>
                      <span className="text-white">Level {stadium.securityLevel}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown - Fixed text visibility */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Analysis</CardTitle>
                  <p className="text-gray-300">Projected revenue per home match</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ticket Sales:</span>
                      <span className="text-green-400">{formatCredits(revenue?.ticketSales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Concessions:</span>
                      <span className="text-green-400">{formatCredits(revenue?.concessionSales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Parking:</span>
                      <span className="text-green-400">{formatCredits(revenue?.parkingRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">VIP Suites:</span>
                      <span className="text-green-400">{formatCredits(revenue?.vipSuiteRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Merchandising:</span>
                      <span className="text-green-400">{formatCredits(revenue?.apparelSales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Atmosphere Bonus:</span>
                      <span className="text-blue-400">{formatCredits(revenue?.atmosphereBonus || 0)}</span>
                    </div>
                    <hr className="border-gray-600" />
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Revenue:</span>
                      <span className="text-green-400">{formatCredits(revenue?.totalRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Maintenance Cost:</span>
                      <span className="text-red-400">-{formatCredits(revenue?.maintenanceCost || stadium.maintenanceCost || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-white">Net Revenue:</span>
                      <span className="text-yellow-400">{formatCredits(revenue?.netRevenue || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Details (Less Prominent) */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Projected Attendance</CardTitle>
                  <p className="text-gray-400 text-sm">Based on current fan loyalty</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-blue-400">
                      {attendance?.attendanceRate ? `${Math.round(attendance.attendanceRate * 100)}%` : '65%'}
                    </div>
                    <p className="text-gray-400 text-sm">Expected attendance rate</p>
                    <div className="text-lg text-white">
                      {attendance?.attendance?.toLocaleString() || (Math.round(displayCapacity * 0.65)).toLocaleString()} fans
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress 
                      value={attendance?.attendanceRate ? attendance.attendanceRate * 100 : 65} 
                      className="h-2" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Attendance calculated from fan loyalty and team performance
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upgrades" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Stadium Upgrades</CardTitle>
                <p className="text-gray-400">Improve your stadium facilities to increase revenue and fan loyalty</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Capacity Expansion */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">Capacity Expansion</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Increase stadium capacity by 5,000 seats</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Capacity:</span>
                        <span className="text-white">{displayCapacity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(250000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 250000}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {(finances?.credits || 0) >= 250000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Concession Upgrade */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">Concession Upgrade</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-green-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Improve concession stands for higher revenue</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Level:</span>
                        <span className="text-white">{stadium.concessionsLevel}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(75000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 75000 || stadium.concessionsLevel >= 5}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {stadium.concessionsLevel >= 5 ? "Max Level" : (finances?.credits || 0) >= 75000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* VIP Suite Addition */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">VIP Suite Addition</CardTitle>
                        <Star className="h-4 w-4 text-yellow-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Add luxury VIP suites for premium revenue</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Level:</span>
                        <span className="text-white">{stadium.vipSuitesLevel}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(500000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 500000 || stadium.vipSuitesLevel >= 5}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {stadium.vipSuitesLevel >= 5 ? "Max Level" : (finances?.credits || 0) >= 500000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lighting System */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">Lighting System</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Enhanced LED lighting for better fan experience</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Level:</span>
                        <span className="text-white">{stadium.lightingLevel}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(150000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 150000 || stadium.lightingLevel >= 5}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {stadium.lightingLevel >= 5 ? "Max Level" : (finances?.credits || 0) >= 150000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Parking Expansion */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">Parking Expansion</CardTitle>
                        <Car className="h-4 w-4 text-blue-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Expand parking facilities for easier access</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Level:</span>
                        <span className="text-white">{stadium.parkingLevel}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(100000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 100000 || stadium.parkingLevel >= 5}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {stadium.parkingLevel >= 5 ? "Max Level" : (finances?.credits || 0) >= 100000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Systems */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-white">Security Systems</CardTitle>
                        <Shield className="h-4 w-4 text-red-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">Advanced security for fan safety and comfort</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Level:</span>
                        <span className="text-white">{stadium.securityLevel}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-400">{formatCredits(125000)}</span>
                        <Button
                          size="sm"
                          disabled={(finances?.credits || 0) < 125000 || stadium.securityLevel >= 5}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {stadium.securityLevel >= 5 ? "Max Level" : (finances?.credits || 0) >= 125000 ? "Upgrade" : "Insufficient Funds"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atmosphere" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Fan Atmosphere</CardTitle>
                  <p className="text-gray-400">Current fan engagement and stadium atmosphere</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fan Loyalty:</span>
                      <span className="text-red-400 font-bold">{atmosphere?.fanLoyalty || 50}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Home Field Advantage:</span>
                      <span className="text-green-400 font-bold">{atmosphere?.homeAdvantage || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Facility Quality:</span>
                      <span className="text-blue-400 font-bold">{atmosphere?.facilityQuality || 50}%</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-700 rounded">
                    <p className="text-sm text-gray-300">
                      {atmosphere?.description || "Your stadium atmosphere is developing. Improve facilities and team performance to increase fan loyalty."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Team Resources</CardTitle>
                  <p className="text-gray-400">Available funds for stadium improvements</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available Credits:</span>
                      <span className="text-green-400 font-bold">
                        {formatCredits(finances?.credits || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Premium Gems:</span>
                      <span className="text-purple-400 font-bold">
                        💎{finances?.gems || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Daily Maintenance:</span>
                      <span className="text-red-400">
                        -{formatCredits(stadium.maintenanceCost)}/day
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}