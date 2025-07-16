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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upgrades">Stadium Upgrades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stadium Capacity</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stadiumData?.data?.capacity?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Total seats</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fan Loyalty</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{atmosphereData?.data?.fanLoyalty || 50}%</div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(atmosphereData?.data?.loyaltyTrend || 'stable')}
                  <p className="text-xs text-muted-foreground capitalize">
                    {atmosphereData?.data?.loyaltyTrend || 'stable'}
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
                <div className="text-2xl font-bold">{atmosphereData?.data?.attendancePercentage || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {atmosphereData?.data?.actualAttendance?.toLocaleString() || 0} fans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stadium Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stadiumData?.data?.totalValue || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Daily cost: {formatCurrency(stadiumData?.data?.maintenanceCost || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

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
                    <span className="text-sm font-medium">{atmosphereData?.data?.intimidationFactor || 0}</span>
                  </div>
                  <Progress value={(atmosphereData?.data?.intimidationFactor || 0) * 10} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Crowd Noise Level</span>
                    <span className="text-sm font-medium">{atmosphereData?.data?.crowdNoise || 0} dB</span>
                  </div>
                  <Progress value={(atmosphereData?.data?.crowdNoise || 0) / 100 * 100} className="h-2" />
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Opponent Debuff: -{Math.floor((atmosphereData?.data?.intimidationFactor || 0) / 2)} Catching/Throwing
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stadium Facilities Overview</CardTitle>
              <CardDescription>Current facility levels and revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="text-center p-3 border rounded">
                  <Building className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                  <div className="text-xs text-gray-600">Capacity</div>
                  <div className="font-medium">{stadiumData?.data?.capacity?.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <DollarSign className="w-6 h-6 mx-auto mb-1 text-green-500" />
                  <div className="text-xs text-gray-600">Concessions</div>
                  <div className="font-medium">Level {stadiumData?.data?.concessionLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Home className="w-6 h-6 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs text-gray-600">Parking</div>
                  <div className="font-medium">Level {stadiumData?.data?.parkingLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Trophy className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                  <div className="text-xs text-gray-600">VIP Suites</div>
                  <div className="font-medium">Level {stadiumData?.data?.vipSuitesLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                  <div className="text-xs text-gray-600">Merchandise</div>
                  <div className="font-medium">Level {stadiumData?.data?.merchandisingLevel || 1}</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <Zap className="w-6 h-6 mx-auto mb-1 text-red-500" />
                  <div className="text-xs text-gray-600">Lighting</div>
                  <div className="font-medium">Level {stadiumData?.data?.lightingLevel || 1}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Revenue Breakdown (Per Home Game)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-3 border rounded">
                    <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-xs text-gray-600">Ticket Sales</div>
                    <div className="font-bold">{formatCurrency(revenueData?.ticketSales || 0)}</div>
                    <div className="text-xs text-gray-500">₡25 per fan</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <div className="text-xs text-gray-600">Concessions</div>
                    <div className="font-bold">{formatCurrency(revenueData?.concessions || 0)}</div>
                    <div className="text-xs text-gray-500">₡8 × Level</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Home className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <div className="text-xs text-gray-600">Parking</div>
                    <div className="font-bold">{formatCurrency(revenueData?.parking || 0)}</div>
                    <div className="text-xs text-gray-500">₡10 × Level</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <div className="text-xs text-gray-600">VIP Suites</div>
                    <div className="font-bold">{formatCurrency(revenueData?.vipSuites || 0)}</div>
                    <div className="text-xs text-gray-500">₡5,000 × Level</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <div className="text-xs text-gray-600">Merchandise</div>
                    <div className="font-bold">{formatCurrency(revenueData?.merchandising || 0)}</div>
                    <div className="text-xs text-gray-500">₡3 × Level</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <div className="text-xs text-gray-600">Atmosphere Bonus</div>
                    <div className="font-bold">{formatCurrency(revenueData?.atmosphereBonus || 0)}</div>
                    <div className="text-xs text-gray-500">Loyalty bonus</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Match Revenue:</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(revenueData?.total || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Based on {atmosphereData?.data?.actualAttendance?.toLocaleString() || 0} fans ({atmosphereData?.data?.attendancePercentage || 0}% attendance)
                  </div>
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
                {upgradeCosts?.data && Object.entries(upgradeCosts.data).map(([upgradeType, cost]) => {
                  const currentLevel = stadiumData?.data?.[`${upgradeType}Level` as keyof typeof stadiumData.data] || 1;
                  const currentCapacity = stadiumData?.data?.capacity || 5000;
                  
                  return (
                    <Card key={upgradeType} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{upgradeType} Upgrade</h4>
                        <Badge variant="outline">
                          Level {currentLevel}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">{formatCurrency(cost as number)}</div>
                        
                        {/* Current Function */}
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Current: </strong>
                          {upgradeType === 'capacity' && `${currentCapacity.toLocaleString()} seats`}
                          {upgradeType === 'concessions' && `Level ${currentLevel} food & beverage`}
                          {upgradeType === 'parking' && `Level ${currentLevel} parking facilities`}
                          {upgradeType === 'vipSuites' && `Level ${currentLevel} VIP amenities`}
                          {upgradeType === 'merchandising' && `Level ${currentLevel} team store`}
                          {upgradeType === 'lighting' && `Level ${currentLevel} stadium lighting`}
                        </div>
                        
                        {/* Enhancement Details */}
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          <strong>Upgrade: </strong>
                          {upgradeType === 'capacity' && 'Increase seating capacity for more ticket sales'}
                          {upgradeType === 'concessions' && 'Higher revenue per fan from food & drinks'}
                          {upgradeType === 'parking' && 'More parking revenue and fan convenience'}
                          {upgradeType === 'vipSuites' && 'Premium VIP suite revenue boost'}
                          {upgradeType === 'merchandising' && 'Enhanced merchandise sales per fan'}
                          {upgradeType === 'lighting' && 'Better atmosphere and intimidation factor'}
                        </div>
                        
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => upgradeStadiumMutation.mutate(upgradeType)}
                          disabled={upgradeStadiumMutation.isPending}
                        >
                          Upgrade
                        </Button>
                      </div>
                    </Card>
                  );
                })}
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
      </Tabs>
    </div>
  );
}