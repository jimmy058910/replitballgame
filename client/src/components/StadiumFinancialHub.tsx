import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Building, 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Star,
  Zap,
  Trophy,
  Target,
  BarChart3,
  Coins,
  Heart,
  AlertTriangle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

interface StadiumFinancialHubProps {
  team: any;
  stadium: any;
}

interface StadiumData {
  capacity: number;
  concessionsLevel: number;
  parkingLevel: number;
  vipSuitesLevel: number;
  merchandisingLevel: number;
  lightingScreensLevel: number;
  fanLoyalty?: number;
}

interface RevenueBreakdown {
  ticketSales: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  apparelSales: number;
  atmosphereBonus: number;
}

interface UpgradeOption {
  name: string;
  currentLevel: number;
  cost: number;
  effect: string;
  revenueIncrease: number;
}

const StadiumFinancialHub: React.FC<StadiumFinancialHubProps> = ({ team, stadium }) => {
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeOption | null>(null);
  
  // Calculate fan attendance algorithm
  const calculateAttendance = (stadium: StadiumData, division: number = 8, fanLoyalty: number = 50, winStreak: number = 0) => {
    const capacity = stadium?.capacity || 5000;
    
    // Division Modifier
    const divisionModifiers: Record<number, number> = {
      1: 1.2, 2: 1.1, 3: 1.05, 4: 1.0, 5: 0.95, 6: 0.9, 7: 0.85, 8: 0.8
    };
    const divisionMod = divisionModifiers[division] || 0.8;
    
    // Fan Loyalty Modifier (0.75x to 1.25x)
    const loyaltyMod = 0.75 + (fanLoyalty / 100) * 0.5;
    
    // Win Streak Modifier
    let winStreakMod = 1.0;
    if (winStreak >= 8) winStreakMod = 1.5;
    else if (winStreak >= 5) winStreakMod = 1.25;
    else if (winStreak >= 3) winStreakMod = 1.1;
    
    const attendance = Math.floor(capacity * divisionMod * loyaltyMod * winStreakMod);
    return Math.min(attendance, capacity);
  };

  // Calculate revenue breakdown
  const calculateRevenue = (stadium: StadiumData, attendance: number): RevenueBreakdown => {
    const concessionsLevel = stadium?.concessionsLevel || 1;
    const parkingLevel = stadium?.parkingLevel || 1;
    const vipSuitesLevel = stadium?.vipSuitesLevel || 0;
    const merchandisingLevel = stadium?.merchandisingLevel || 1;
    
    return {
      ticketSales: attendance * 25,
      concessions: attendance * 8 * concessionsLevel,
      parking: Math.floor(attendance * 0.3) * 10 * parkingLevel,
      vipSuites: vipSuitesLevel * 5000,
      apparelSales: attendance * 3 * merchandisingLevel,
      atmosphereBonus: 0 // TODO: Implement based on fan loyalty
    };
  };

  // Get upgrade costs and effects
  const getUpgradeOptions = (stadium: StadiumData): UpgradeOption[] => {
    const capacity = stadium?.capacity || 5000;
    const concessionsLevel = stadium?.concessionsLevel || 1;
    const parkingLevel = stadium?.parkingLevel || 1;
    const vipSuitesLevel = stadium?.vipSuitesLevel || 0;
    const merchandisingLevel = stadium?.merchandisingLevel || 1;
    const lightingLevel = stadium?.lightingScreensLevel || 1;
    
    return [
      {
        name: 'Capacity Expansion',
        currentLevel: Math.floor(capacity / 5000),
        cost: Math.floor(capacity * 10),
        effect: '+5,000 seats',
        revenueIncrease: 5000 * 25 // Base ticket revenue
      },
      {
        name: 'Premium Concessions',
        currentLevel: concessionsLevel,
        cost: 30000 * Math.pow(1.5, concessionsLevel - 1),
        effect: `Level ${concessionsLevel + 1} (+${concessionsLevel + 1}x multiplier)`,
        revenueIncrease: calculateAttendance(stadium) * 8 // Per game increase
      },
      {
        name: 'Expand Parking',
        currentLevel: parkingLevel,
        cost: 25000 * Math.pow(1.5, parkingLevel - 1),
        effect: `Level ${parkingLevel + 1} (+${parkingLevel + 1}x multiplier)`,
        revenueIncrease: Math.floor(calculateAttendance(stadium) * 0.3) * 10
      },
      {
        name: 'VIP Suites',
        currentLevel: vipSuitesLevel,
        cost: 100000 * Math.pow(2, vipSuitesLevel),
        effect: '+1 VIP Suite (+₡5,000/game)',
        revenueIncrease: 5000
      },
      {
        name: 'Merchandising Kiosk',
        currentLevel: merchandisingLevel,
        cost: 40000 * Math.pow(1.5, merchandisingLevel - 1),
        effect: `Level ${merchandisingLevel + 1} (+${merchandisingLevel + 1}x multiplier)`,
        revenueIncrease: calculateAttendance(stadium) * 3
      },
      {
        name: 'Lighting/Screens',
        currentLevel: lightingLevel,
        cost: 60000 * Math.pow(1.8, lightingLevel - 1),
        effect: `Level ${lightingLevel + 1} (+5% Fan Loyalty/season)`,
        revenueIncrease: 0 // Indirect through fan loyalty
      }
    ];
  };

  const currentStadium: StadiumData = {
    capacity: stadium?.capacity || 5000,
    concessionsLevel: stadium?.concessionsLevel || 1,
    parkingLevel: stadium?.parkingLevel || 1,
    vipSuitesLevel: stadium?.vipSuitesLevel || 0,
    merchandisingLevel: stadium?.merchandisingLevel || 1,
    lightingScreensLevel: stadium?.lightingScreensLevel || 1,
    fanLoyalty: team?.fanLoyalty || 50
  };

  const division = team?.division || 8;
  const fanLoyalty = team?.fanLoyalty || 50;
  const winStreak = 0; // TODO: Get from team data

  const projectedAttendance = calculateAttendance(currentStadium, division, fanLoyalty, winStreak);
  const revenueBreakdown = calculateRevenue(currentStadium, projectedAttendance);
  const totalRevenue = Object.values(revenueBreakdown).reduce((sum, val) => sum + val, 0);
  const upgradeOptions = getUpgradeOptions(currentStadium);

  // Calculate daily maintenance cost (0.2% of total stadium investment)
  const totalInvestment = (currentStadium.capacity - 5000) * 10 + 
    (currentStadium.concessionsLevel - 1) * 30000 +
    (currentStadium.parkingLevel - 1) * 25000 +
    currentStadium.vipSuitesLevel * 100000 +
    (currentStadium.merchandisingLevel - 1) * 40000 +
    (currentStadium.lightingScreensLevel - 1) * 60000;
  
  const dailyMaintenanceCost = Math.floor(totalInvestment * 0.002);

  return (
    <div className="space-y-6">
      {/* Stadium Overview Header */}
      <Card className="bg-gradient-to-r from-purple-800 to-purple-900 border-2 border-purple-400">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center">
              <Building className="w-6 h-6 mr-3 text-purple-400" />
              🏟️ {stadium?.name || team?.name + ' Stadium'}
            </div>
            <Badge className="bg-purple-600 text-white">
              Division {division}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-purple-900/50 p-3 rounded-lg">
              <Users className="w-5 h-5 mx-auto mb-2 text-purple-400" />
              <div className="text-white/70 text-xs">Capacity</div>
              <div className="text-white font-bold">
                {currentStadium.capacity.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-900/50 p-3 rounded-lg">
              <Heart className="w-5 h-5 mx-auto mb-2 text-green-400" />
              <div className="text-white/70 text-xs">Fan Loyalty</div>
              <div className="text-white font-bold">{fanLoyalty}%</div>
            </div>
            <div className="bg-blue-900/50 p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-400" />
              <div className="text-white/70 text-xs">Attendance</div>
              <div className="text-white font-bold">
                {projectedAttendance.toLocaleString()}
              </div>
            </div>
            <div className="bg-yellow-900/50 p-3 rounded-lg">
              <span className="text-xl font-bold text-yellow-400 block text-center mb-2">₡</span>
              <div className="text-white/70 text-xs">Game Revenue</div>
              <div className="text-green-400 font-bold">
                ₡{totalRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800">
          <TabsTrigger value="revenue" className="text-white">Revenue</TabsTrigger>
          <TabsTrigger value="upgrades" className="text-white">Upgrades</TabsTrigger>
          <TabsTrigger value="expenses" className="text-white">Expenses</TabsTrigger>
          <TabsTrigger value="analytics" className="text-white">Analytics</TabsTrigger>
        </TabsList>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-4">
          {/* Fan Attendance Algorithm */}
          <Card className="bg-gradient-to-r from-blue-800 to-blue-900 border-2 border-blue-400">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="w-5 h-5 mr-3 text-blue-400" />
                Fan Attendance Algorithm
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="text-white/90 text-sm">
                  <strong>Formula:</strong> BaseCapacity × DivisionModifier × FanLoyaltyModifier × WinStreakModifier
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-blue-900/50 p-2 rounded">
                    <div className="text-blue-200">Base Capacity</div>
                    <div className="text-white font-semibold">{currentStadium.capacity.toLocaleString()}</div>
                  </div>
                  <div className="bg-blue-900/50 p-2 rounded">
                    <div className="text-blue-200">Division Mod</div>
                    <div className="text-white font-semibold">
                      {((0.8 + (8 - division) * 0.05) || 0.8).toFixed(2)}x
                    </div>
                  </div>
                  <div className="bg-blue-900/50 p-2 rounded">
                    <div className="text-blue-200">Loyalty Mod</div>
                    <div className="text-white font-semibold">
                      {(0.75 + (fanLoyalty / 100) * 0.5).toFixed(2)}x
                    </div>
                  </div>
                  <div className="bg-blue-900/50 p-2 rounded">
                    <div className="text-blue-200">Win Streak</div>
                    <div className="text-white font-semibold">1.00x</div>
                  </div>
                </div>
                <div className="bg-green-900/50 p-3 rounded-lg border border-green-400">
                  <div className="text-green-200 text-sm">Projected Game Attendance</div>
                  <div className="text-green-400 text-2xl font-bold">
                    {projectedAttendance.toLocaleString()} fans
                  </div>
                  <div className="text-green-200 text-xs">
                    ({((projectedAttendance / currentStadium.capacity) * 100).toFixed(1)}% capacity)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Streams Breakdown */}
          <Card className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-400">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-5 h-5 mr-3 text-green-400" />
                Income Streams (Per Home Game)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  {
                    name: 'Ticket Sales',
                    formula: 'GameAttendance × 25₡',
                    amount: revenueBreakdown.ticketSales,
                    icon: <Users className="w-4 h-4" />
                  },
                  {
                    name: 'Concessions',
                    formula: `GameAttendance × 8₡ × Level ${currentStadium.concessionsLevel}`,
                    amount: revenueBreakdown.concessions,
                    icon: <Zap className="w-4 h-4" />
                  },
                  {
                    name: 'Parking',
                    formula: `(GameAttendance × 0.3) × 10₡ × Level ${currentStadium.parkingLevel}`,
                    amount: revenueBreakdown.parking,
                    icon: <Target className="w-4 h-4" />
                  },
                  {
                    name: 'VIP Suites',
                    formula: `${currentStadium.vipSuitesLevel} Suites × 5,000₡`,
                    amount: revenueBreakdown.vipSuites,
                    icon: <Star className="w-4 h-4" />
                  },
                  {
                    name: 'Apparel Sales',
                    formula: `GameAttendance × 3₡ × Level ${currentStadium.merchandisingLevel}`,
                    amount: revenueBreakdown.apparelSales,
                    icon: <Trophy className="w-4 h-4" />
                  }
                ].map((stream, index) => (
                  <div key={index} className="bg-green-900/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-green-400">{stream.icon}</div>
                      <div>
                        <div className="text-white font-semibold">{stream.name}</div>
                        <div className="text-green-200 text-xs">{stream.formula}</div>
                      </div>
                    </div>
                    <div className="text-green-400 font-bold">
                      ₡{stream.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                
                <div className="bg-yellow-900/50 p-4 rounded-lg border-2 border-yellow-400">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-yellow-200 font-semibold">Total Game Revenue</div>
                      <div className="text-yellow-100 text-sm">Per home game day</div>
                    </div>
                    <div className="text-yellow-400 text-2xl font-bold">
                      ₡{totalRevenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UPGRADES TAB */}
        <TabsContent value="upgrades" className="space-y-4">
          <Card className="bg-gradient-to-r from-orange-800 to-orange-900 border-2 border-orange-400">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ArrowUp className="w-5 h-5 mr-3 text-orange-400" />
                Stadium & Facility Upgrades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {upgradeOptions.map((upgrade, index) => (
                  <div 
                    key={index} 
                    className="bg-orange-900/50 p-4 rounded-lg border border-orange-600 hover:border-orange-400 transition-colors cursor-pointer"
                    onClick={() => setSelectedUpgrade(upgrade)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="text-white font-semibold">{upgrade.name}</div>
                          <Badge className="bg-orange-600 text-white text-xs">
                            Level {upgrade.currentLevel}
                          </Badge>
                        </div>
                        <div className="text-orange-200 text-sm mb-2">{upgrade.effect}</div>
                        {upgrade.revenueIncrease > 0 && (
                          <div className="text-green-400 text-xs flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +₡{upgrade.revenueIncrease.toLocaleString()} revenue/game
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">
                          ₡{upgrade.cost.toLocaleString()}
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-400">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ArrowDown className="w-5 h-5 mr-3 text-red-400" />
                Expense Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="bg-red-900/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-white font-semibold">Facilities Maintenance</div>
                    <div className="text-red-400 font-bold">₡{dailyMaintenanceCost.toLocaleString()}/day</div>
                  </div>
                  <div className="text-red-200 text-sm">
                    Daily fee of 0.2% of total stadium investment (₡{totalInvestment.toLocaleString()})
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={(dailyMaintenanceCost / Math.max(totalRevenue * 0.1, 100)) * 100} 
                      className="h-2" 
                    />
                    <div className="text-red-200 text-xs mt-1">
                      {((dailyMaintenanceCost / Math.max(totalRevenue, 1)) * 100).toFixed(1)}% of game revenue
                    </div>
                  </div>
                </div>

                <div className="bg-red-900/50 p-4 rounded-lg">
                  <div className="text-white font-semibold mb-2">Other Expenses</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-red-200">
                      <span>Player & Staff Salaries:</span>
                      <span>Paid Day 1 each season</span>
                    </div>
                    <div className="flex justify-between text-red-200">
                      <span>Marketplace Listing Fee:</span>
                      <span>2% of asking price</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-semibold">Net Income Projection</div>
                      <div className="text-gray-300 text-sm">Per game day after maintenance</div>
                    </div>
                    <div className={`text-2xl font-bold ${totalRevenue - dailyMaintenanceCost > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₡{(totalRevenue - dailyMaintenanceCost).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-gradient-to-r from-indigo-800 to-indigo-900 border-2 border-indigo-400">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-5 h-5 mr-3 text-indigo-400" />
                Stadium Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fan Loyalty Breakdown */}
                <div className="bg-indigo-900/50 p-4 rounded-lg">
                  <div className="text-white font-semibold mb-3">Fan Loyalty Factors</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Win Percentage:</span>
                      <span className="text-white">
                        {(((team?.wins || 0) / Math.max((team?.wins || 0) + (team?.losses || 0), 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Division Prestige:</span>
                      <span className="text-white">Division {division}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Stadium Quality:</span>
                      <span className="text-white">Level {currentStadium.lightingScreensLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Revenue Efficiency */}
                <div className="bg-indigo-900/50 p-4 rounded-lg">
                  <div className="text-white font-semibold mb-3">Revenue Efficiency</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Revenue per Fan:</span>
                      <span className="text-white">
                        ₡{(totalRevenue / Math.max(projectedAttendance, 1)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Capacity Utilization:</span>
                      <span className="text-white">
                        {((projectedAttendance / currentStadium.capacity) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-200">ROI Potential:</span>
                      <span className="text-green-400">
                        {totalRevenue > dailyMaintenanceCost ? 'Positive' : 'Break-even'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StadiumFinancialHub;