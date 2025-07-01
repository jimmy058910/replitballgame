import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building, 
  Users, 
  TrendingUp, 
  Heart, 
  Zap, 
  DollarSign,
  Home,
  Volume2,
  Trophy,
  Star,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface StadiumData {
  capacity: number;
  concessionLevel: number;
  parkingLevel: number;
  vipSuitesLevel: number;
  merchandisingLevel: number;
  lightingLevel: number;
  totalValue: number;
  maintenanceCost: number;
}

interface AtmosphereData {
  fanLoyalty: number;
  baseAttendance: number;
  actualAttendance: number;
  attendancePercentage: number;
  loyaltyTrend: 'rising' | 'stable' | 'falling';
  homeFieldAdvantage: number;
  intimidationFactor: number;
  crowdNoise: number;
}

interface RevenueBreakdown {
  ticketSales: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  merchandising: number;
  atmosphereBonus: number;
  total: number;
}

interface TeamPowerTier {
  tier: 'Foundation' | 'Developing' | 'Competitive' | 'Contender' | 'Elite';
  description: string;
  carThreshold: number;
  color: string;
}

interface UpgradeCosts {
  capacity: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  merchandising: number;
  lighting: number;
}

interface LoyaltyFactors {
  performance: number;
  form: number;
  facilities: number;
  total: number;
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'Foundation': return <Building className="w-4 h-4" />;
    case 'Developing': return <TrendingUp className="w-4 h-4" />;
    case 'Competitive': return <Star className="w-4 h-4" />;
    case 'Contender': return <Trophy className="w-4 h-4" />;
    case 'Elite': return <Zap className="w-4 h-4" />;
    default: return <Building className="w-4 h-4" />;
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'rising': return <ArrowUp className="w-4 h-4 text-green-500" />;
    case 'falling': return <ArrowDown className="w-4 h-4 text-red-500" />;
    default: return <Minus className="w-4 h-4 text-gray-500" />;
  }
};

const formatCurrency = (amount: number): string => {
  return `₡${amount.toLocaleString()}`;
};

export default function StadiumAtmosphereManager({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);

  // Fetch stadium data
  const { data: stadiumData, isLoading: loadingStadium } = useQuery({
    queryKey: ['/api/stadium-atmosphere/stadium-data', teamId],
    enabled: !!teamId
  });

  // Fetch atmosphere data
  const { data: atmosphereData, isLoading: loadingAtmosphere } = useQuery({
    queryKey: ['/api/stadium-atmosphere/atmosphere-data', teamId],
    enabled: !!teamId
  });

  // Fetch revenue breakdown
  const { data: revenueData } = useQuery({
    queryKey: ['/api/stadium-atmosphere/revenue-breakdown', teamId],
    enabled: !!teamId
  });

  // Fetch team power tier
  const { data: teamPowerTier } = useQuery({
    queryKey: ['/api/stadium-atmosphere/team-power-tier', teamId],
    enabled: !!teamId
  });

  // Fetch upgrade costs
  const { data: upgradeCosts } = useQuery({
    queryKey: ['/api/stadium-atmosphere/upgrade-costs', teamId],
    enabled: !!teamId
  });

  // Fetch loyalty factors
  const { data: loyaltyFactors } = useQuery({
    queryKey: ['/api/stadium-atmosphere/loyalty-factors', teamId],
    enabled: !!teamId
  });

  // Stadium upgrade mutation
  const upgradeStadiumMutation = useMutation({
    mutationFn: (upgradeType: string) =>
      apiRequest(`/api/stadium-atmosphere/upgrade/${teamId}`, 'POST', { upgradeType }),
    onSuccess: () => {
      toast({
        title: 'Stadium Upgraded',
        description: 'Your stadium upgrade has been completed successfully!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stadium-atmosphere'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Failed to complete stadium upgrade',
        variant: 'destructive'
      });
    }
  });

  // End of season loyalty processing (admin only)
  const processEndOfSeasonMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/stadium-atmosphere/process-end-season/${teamId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: 'End of Season Processed',
        description: 'Fan loyalty has been updated based on season performance.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stadium-atmosphere'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process end of season',
        variant: 'destructive'
      });
    }
  });

  if (loadingStadium || loadingAtmosphere) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stadium, Finance & Atmosphere System</h2>
          <p className="text-gray-600">Integrated fan loyalty, dynamic attendance, and home field advantage management</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Fan Loyalty</div>
          <div className="text-2xl font-bold text-red-600">{atmosphereData?.fanLoyalty || 50}%</div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="atmosphere">Fan Atmosphere</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="upgrades">Stadium Upgrades</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stadium Capacity</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stadiumData?.capacity?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Total seats</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fan Loyalty</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{atmosphereData?.fanLoyalty || 50}%</div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(atmosphereData?.loyaltyTrend || 'stable')}
                  <p className="text-xs text-muted-foreground capitalize">
                    {atmosphereData?.loyaltyTrend || 'stable'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{atmosphereData?.attendancePercentage || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {atmosphereData?.actualAttendance?.toLocaleString() || 0} fans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stadium Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stadiumData?.totalValue || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Daily cost: {formatCurrency(stadiumData?.maintenanceCost || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Power Classification</CardTitle>
                <CardDescription>Current tier based on Combined Adjusted Rating (CAR)</CardDescription>
              </CardHeader>
              <CardContent>
                {teamPowerTier && (
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${teamPowerTier.color}`}>
                      {getTierIcon(teamPowerTier.tier)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{teamPowerTier.tier} Team</h3>
                      <p className="text-sm text-gray-600">{teamPowerTier.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        CAR Threshold: {teamPowerTier.carThreshold}+
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Home Field Advantage</CardTitle>
                <CardDescription>Intimidation factor and crowd noise effects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Intimidation Factor</span>
                      <span className="text-sm font-medium">{atmosphereData?.intimidationFactor || 0}</span>
                    </div>
                    <Progress value={(atmosphereData?.intimidationFactor || 0) * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Crowd Noise Level</span>
                      <span className="text-sm font-medium">{atmosphereData?.crowdNoise || 0} dB</span>
                    </div>
                    <Progress value={(atmosphereData?.crowdNoise || 0) / 100 * 100} className="h-2" />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        Opponent Debuff: -{Math.floor((atmosphereData?.intimidationFactor || 0) / 2)} Catching/Throwing
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stadium Facilities Overview</CardTitle>
              <CardDescription>Current facility levels and upgrade status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 border rounded">
                  <Building className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                  <div className="text-xs text-gray-600">Capacity</div>
                  <div className="font-medium">{stadiumData?.capacity?.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <DollarSign className="w-6 h-6 mx-auto mb-1 text-green-500" />
                  <div className="text-xs text-gray-600">Concessions</div>
                  <div className="font-medium">Level {stadiumData?.concessionLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Home className="w-6 h-6 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs text-gray-600">Parking</div>
                  <div className="font-medium">Level {stadiumData?.parkingLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Trophy className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                  <div className="text-xs text-gray-600">VIP Suites</div>
                  <div className="font-medium">Level {stadiumData?.vipSuitesLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                  <div className="text-xs text-gray-600">Merchandise</div>
                  <div className="font-medium">Level {stadiumData?.merchandisingLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Zap className="w-6 h-6 mx-auto mb-1 text-red-500" />
                  <div className="text-xs text-gray-600">Lighting</div>
                  <div className="font-medium">Level {stadiumData?.lightingLevel || 1}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atmosphere" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fan Loyalty Breakdown</CardTitle>
                <CardDescription>Factors contributing to overall fan loyalty</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Performance Impact</span>
                      <span className="text-sm font-medium">{loyaltyFactors?.performance || 0}%</span>
                    </div>
                    <Progress value={loyaltyFactors?.performance || 0} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Based on win rate and playoff success</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Current Form</span>
                      <span className="text-sm font-medium">{loyaltyFactors?.form || 0}%</span>
                    </div>
                    <Progress value={loyaltyFactors?.form || 0} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Recent match results and momentum</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Facilities Bonus</span>
                      <span className="text-sm font-medium">{loyaltyFactors?.facilities || 0}%</span>
                    </div>
                    <Progress value={loyaltyFactors?.facilities || 0} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Stadium quality and amenities</p>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Fan Loyalty</span>
                      <span className="font-bold text-lg">{loyaltyFactors?.total || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Engine</CardTitle>
                <CardDescription>Dynamic attendance calculation system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <div className="text-xs text-gray-600">Base Attendance</div>
                      <div className="font-medium">{atmosphereData?.baseAttendance || 35}%</div>
                      <div className="text-xs text-gray-500">Minimum guaranteed</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-xs text-gray-600">Loyalty Bonus</div>
                      <div className="font-medium">+{Math.round((atmosphereData?.fanLoyalty || 50) / 2)}%</div>
                      <div className="text-xs text-gray-500">Up to +50% max</div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-2">Attendance Calculation</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Base: {atmosphereData?.baseAttendance || 35}%</div>
                      <div>+ Loyalty: {Math.round((atmosphereData?.fanLoyalty || 50) / 2)}%</div>
                      <div>+ Win Streak: Up to 15%</div>
                      <div className="border-t pt-1 font-medium">
                        = {atmosphereData?.attendancePercentage || 0}% ({atmosphereData?.actualAttendance?.toLocaleString() || 0} fans)
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border border-blue-200 bg-blue-50 rounded">
                    <div className="flex items-center space-x-2 mb-2">
                      <Home className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Home Field Advantage</span>
                    </div>
                    <div className="text-xs text-blue-700">
                      High attendance creates intimidation factor, reducing opponent accuracy by {Math.floor((atmosphereData?.intimidationFactor || 0) / 2)} points per 2 intimidation
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Atmosphere Features</CardTitle>
              <CardDescription>Advanced stadium atmosphere mechanics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <h5 className="font-medium text-sm">Persistent Fan Loyalty</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Fan loyalty persists across seasons and affects attendance, revenue, and home field advantage
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <h5 className="font-medium text-sm">Dynamic Attendance</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Attendance calculated based on loyalty, performance, win streaks, and facility quality
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Volume2 className="w-4 h-4 text-green-500" />
                    <h5 className="font-medium text-sm">Intimidation Effects</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Crowd noise creates debuffs for visiting teams, affecting their passing and catching accuracy
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <h5 className="font-medium text-sm">Revenue Integration</h5>
                  </div>
                  <p className="text-xs text-gray-600">
                    Actual attendance directly affects ticket sales, concessions, and all revenue streams
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>Attendance-based stadium revenue analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 border rounded">
                  <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-xs text-gray-600">Ticket Sales</div>
                  <div className="font-bold">{formatCurrency(revenueData?.ticketSales || 0)}</div>
                  <div className="text-xs text-gray-500">Capacity × ₡25</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="text-xs text-gray-600">Concessions</div>
                  <div className="font-bold">{formatCurrency(revenueData?.concessions || 0)}</div>
                  <div className="text-xs text-gray-500">Capacity × ₡8 × Level</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <Home className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-xs text-gray-600">Parking</div>
                  <div className="font-bold">{formatCurrency(revenueData?.parking || 0)}</div>
                  <div className="text-xs text-gray-500">(Capacity × 0.3) × ₡10 × Level</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-xs text-gray-600">VIP Suites</div>
                  <div className="font-bold">{formatCurrency(revenueData?.vipSuites || 0)}</div>
                  <div className="text-xs text-gray-500">Level × ₡5,000</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-xs text-gray-600">Merchandise</div>
                  <div className="font-bold">{formatCurrency(revenueData?.merchandising || 0)}</div>
                  <div className="text-xs text-gray-500">Capacity × ₡3 × Level</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <div className="text-xs text-gray-600">Atmosphere Bonus</div>
                  <div className="font-bold">{formatCurrency(revenueData?.atmosphereBonus || 0)}</div>
                  <div className="text-xs text-gray-500">High loyalty bonus</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Match Revenue:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueData?.total || 0)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Based on {atmosphereData?.actualAttendance?.toLocaleString() || 0} fans ({atmosphereData?.attendancePercentage || 0}% attendance)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stadium Upgrades</CardTitle>
              <CardDescription>Improve facilities to boost revenue and fan loyalty</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upgradeCosts && Object.entries(upgradeCosts).map(([upgradeType, cost]) => (
                  <Card key={upgradeType} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium capitalize">{upgradeType} Upgrade</h4>
                      <Badge variant="outline">
                        Level {stadiumData?.[`${upgradeType}Level` as keyof typeof stadiumData] || (upgradeType === 'capacity' ? stadiumData?.capacity : 1)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{formatCurrency(cost as number)}</div>
                      <p className="text-xs text-gray-600">
                        {upgradeType === 'capacity' && 'Increase stadium seating capacity'}
                        {upgradeType === 'concessions' && 'Improve food and beverage facilities'}
                        {upgradeType === 'parking' && 'Expand parking capacity and convenience'}
                        {upgradeType === 'vipSuites' && 'Add premium VIP suite amenities'}
                        {upgradeType === 'merchandising' && 'Enhance team store and merchandise areas'}
                        {upgradeType === 'lighting' && 'Upgrade stadium lighting and atmosphere'}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => upgradeStadiumMutation.mutate(upgradeType)}
                        disabled={upgradeStadiumMutation.isPending}
                      >
                        Upgrade {upgradeType}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Upgrade Benefits</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Higher capacity = more ticket sales and crowd noise</li>
                  <li>• Better facilities = increased fan loyalty and revenue multipliers</li>
                  <li>• Premium amenities = enhanced home field advantage</li>
                  <li>• All upgrades contribute to intimidation factor</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key stadium and atmosphere performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Revenue per Fan</span>
                      <span className="font-medium">
                        {formatCurrency(Math.round((revenueData?.total || 0) / (atmosphereData?.actualAttendance || 1)))}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stadium Utilization</span>
                      <span className="font-medium">{atmosphereData?.attendancePercentage || 0}%</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Loyalty Efficiency</span>
                      <span className="font-medium">
                        {Math.round(((atmosphereData?.fanLoyalty || 50) / 100) * (atmosphereData?.attendancePercentage || 0))}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Intimidation Rating</span>
                      <span className="font-medium">{atmosphereData?.intimidationFactor || 0}/10</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Integration</CardTitle>
                <CardDescription>How stadium atmosphere connects with other game systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <h5 className="font-medium text-sm">Match Simulation</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Intimidation factor applies debuffs to visiting teams during live matches
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <h5 className="font-medium text-sm">Economic System</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Stadium revenue directly feeds into enhanced game economy and dual currency system
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <h5 className="font-medium text-sm">Season Progression</h5>
                    </div>
                    <p className="text-xs text-gray-600">
                      Fan loyalty updates at end of season based on performance, form, and facility quality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}