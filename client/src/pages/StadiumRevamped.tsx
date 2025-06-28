import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, Users, TrendingUp, Calendar, DollarSign, Wrench, 
  Star, Coins, Shield, Home, Gauge, Zap, Tv, Utensils, Car,
  Heart, Lock, Trophy, Sparkles, BarChart, Activity
} from "lucide-react";

interface StadiumUpgrade {
  id: string;
  name: string;
  type: string;
  cost: number;
  effect: string;
  description: string;
  requirements?: string;
  available: boolean;
}

export default function StadiumRevamped() {
  const { toast } = useToast();
  const [selectedUpgrade, setSelectedUpgrade] = useState<StadiumUpgrade | null>(null);

  const { data: stadiumData, isLoading } = useQuery({
    queryKey: ["/api/stadium/full"],
  });

  const { data: finances } = useQuery({
    queryKey: ["/api/teams/my/finances"],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (upgrade: StadiumUpgrade) => {
      return await apiRequest("/api/stadium/upgrade", "POST", {
        upgradeId: upgrade.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Upgrade Successful",
        description: "Your stadium has been improved!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stadium/full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my/finances"] });
      setSelectedUpgrade(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Could not complete upgrade",
        variant: "destructive",
      });
    },
  });

  const formatCredits = (amount: number) => {
    return `${amount?.toLocaleString() || 0} ₡`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const stadium = stadiumData?.stadium || {
    name: "Loading Arena",
    capacity: 0,
    level: 1,
    facilities: {},
    upgrades: []
  };

  const availableUpgrades = stadiumData?.availableUpgrades || [];
  const revenue = stadiumData?.revenue || {};
  const matchHistory = stadiumData?.matchHistory || [];

  const facilityIcons: Record<string, any> = {
    seating: Users,
    concessions: Utensils,
    parking: Car,
    lighting: Zap,
    screens: Tv,
    medical: Heart,
    security: Shield,
    training: Activity,
    vip: Star
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{stadium.name}</h1>
          <p className="text-gray-400">Manage and upgrade your team's home stadium</p>
        </div>

        {/* Stadium Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Stadium Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                  <div className="text-2xl font-bold">Level {stadium.level}</div>
                  <div className="text-sm text-gray-400">Stadium Tier</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <div className="text-2xl font-bold">{stadium.capacity?.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Capacity</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl font-bold">{stadium.atmosphere || 0}%</div>
                  <div className="text-sm text-gray-400">Atmosphere</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold">+{stadium.revenueBoost || 0}%</div>
                  <div className="text-sm text-gray-400">Revenue Boost</div>
                </div>
              </div>

              {/* Facilities Grid */}
              <h3 className="font-semibold mb-3">Stadium Facilities</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(stadium.facilities || {}).map(([facility, level]: [string, any]) => {
                  const Icon = facilityIcons[facility] || Building2;
                  return (
                    <div key={facility} className="bg-gray-700 p-3 rounded-lg text-center">
                      <Icon className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                      <div className="text-sm capitalize">{facility}</div>
                      <div className="text-xs text-gray-500">Level {level}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Available Credits</span>
                  <span className="text-xl font-bold text-green-400">
                    {formatCredits(finances?.credits || 0)}
                  </span>
                </div>
                <Progress value={Math.min((finances?.credits || 0) / 1000000 * 100, 100)} className="h-2" />
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Match Revenue</span>
                  <span className="text-green-400">+{formatCredits(revenue.matchDay || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Concessions</span>
                  <span className="text-green-400">+{formatCredits(revenue.concessions || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Parking</span>
                  <span className="text-green-400">+{formatCredits(revenue.parking || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">VIP Sales</span>
                  <span className="text-green-400">+{formatCredits(revenue.vip || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Maintenance</span>
                  <span className="text-red-400">-{formatCredits(stadium.maintenanceCost || 0)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Net Income per Match</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCredits((revenue.total || 0) - (stadium.maintenanceCost || 0))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upgrades and History Tabs */}
        <Tabs defaultValue="upgrades" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="upgrades">Available Upgrades</TabsTrigger>
            <TabsTrigger value="history">Match History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Upgrades Tab */}
          <TabsContent value="upgrades">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Stadium Upgrades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableUpgrades.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    All available upgrades have been completed. Check back next season!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableUpgrades.map((upgrade: StadiumUpgrade) => (
                      <div
                        key={upgrade.id}
                        className={`border rounded-lg p-4 transition-all ${
                          upgrade.available 
                            ? 'border-gray-600 hover:border-gray-500' 
                            : 'border-gray-700 opacity-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold">{upgrade.name}</h4>
                          <Badge variant={upgrade.available ? "default" : "secondary"}>
                            {upgrade.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{upgrade.description}</p>
                        <div className="text-sm text-blue-400 mb-3">{upgrade.effect}</div>
                        {upgrade.requirements && (
                          <div className="text-xs text-yellow-400 mb-3 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {upgrade.requirements}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-yellow-400">
                            {formatCredits(upgrade.cost)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => setSelectedUpgrade(upgrade)}
                            disabled={
                              !upgrade.available || 
                              (finances?.credits || 0) < upgrade.cost || 
                              upgradeMutation.isPending
                            }
                          >
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="history">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Match Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matchHistory.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No matches played at home yet this season.
                    </p>
                  ) : (
                    matchHistory.map((match: any, index: number) => (
                      <div key={index} className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-medium">{match.opponent}</div>
                            <div className="text-sm text-gray-400">{match.date}</div>
                          </div>
                          <Badge variant={match.result === 'W' ? 'default' : match.result === 'L' ? 'destructive' : 'secondary'}>
                            {match.result}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">Attendance:</span>
                            <div className="font-medium">{match.attendance?.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Revenue:</span>
                            <div className="font-medium text-green-400">{formatCredits(match.revenue)}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Atmosphere:</span>
                            <div className="font-medium">{match.atmosphere}%</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Stadium Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Revenue Breakdown</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Ticket Sales</span>
                          <span>{((revenue.matchDay || 0) / (revenue.total || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(revenue.matchDay || 0) / (revenue.total || 1) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Concessions</span>
                          <span>{((revenue.concessions || 0) / (revenue.total || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(revenue.concessions || 0) / (revenue.total || 1) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Parking</span>
                          <span>{((revenue.parking || 0) / (revenue.total || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(revenue.parking || 0) / (revenue.total || 1) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>VIP/Premium</span>
                          <span>{((revenue.vip || 0) / (revenue.total || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(revenue.vip || 0) / (revenue.total || 1) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">Average Attendance</div>
                        <div className="text-xl font-bold">{stadium.avgAttendance?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">
                          {((stadium.avgAttendance || 0) / stadium.capacity * 100).toFixed(0)}% capacity
                        </div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">Season Revenue</div>
                        <div className="text-xl font-bold text-green-400">
                          {formatCredits(stadium.seasonRevenue || 0)}
                        </div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">Home Win Rate</div>
                        <div className="text-xl font-bold">{stadium.homeWinRate || 0}%</div>
                        <div className="text-xs text-gray-500">
                          Home advantage: +{stadium.homeAdvantage || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upgrade Confirmation Modal */}
        {selectedUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
              <CardHeader>
                <CardTitle>Confirm Upgrade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">{selectedUpgrade.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">{selectedUpgrade.description}</p>
                    <p className="text-sm text-blue-400">{selectedUpgrade.effect}</p>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Upgrade Cost:</span>
                      <span className="font-bold text-yellow-400">
                        {formatCredits(selectedUpgrade.cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Balance:</span>
                      <span className={`font-bold ${(finances?.credits || 0) >= selectedUpgrade.cost ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCredits(finances?.credits || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-600">
                      <span>After Upgrade:</span>
                      <span className="font-bold">
                        {formatCredits((finances?.credits || 0) - selectedUpgrade.cost)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedUpgrade(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => upgradeMutation.mutate(selectedUpgrade)}
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending ? "Upgrading..." : "Confirm Upgrade"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}