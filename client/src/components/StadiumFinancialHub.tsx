import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
  ChevronRight,
  Home,
  Car,
  ShoppingBag,
  Lightbulb,
  Monitor,
  Crown
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
  type: string;
  currentLevel: number;
  maxLevel: number;
  cost: number;
  effect: string;
  revenueIncrease?: number;
  paybackGames?: number;
}

interface StadiumAnalytics {
  fanLoyalty: number;
  attendanceRate: number;
  actualAttendance: number;
  atmosphereBonus: string;
  dailyUpkeep: number;
  upgradeOptions: UpgradeOption[];
  revenueBreakdown: RevenueBreakdown;
}

// Tier Ladder Component
const TierLadder: React.FC<{
  currentLevel: number;
  maxLevel: number;
  upgradeType: string;
  cost: number;
  effect: string;
  paybackGames?: number;
  onUpgrade: () => void;
}> = ({ currentLevel, maxLevel, upgradeType, cost, effect, paybackGames, onUpgrade }) => {
  const renderDots = () => {
    return Array.from({ length: maxLevel }, (_, i) => (
      <span
        key={i}
        className={`inline-block w-3 h-3 rounded-full mx-0.5 ${
          i < currentLevel 
            ? 'bg-purple-500 shadow-lg shadow-purple-500/30' 
            : 'bg-gray-600 border border-gray-500'
        }`}
      />
    ));
  };

  const getUpgradeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      capacity: Home,
      concessions: ShoppingBag,
      parking: Car,
      vipSuites: Crown,
      merchandising: ShoppingBag,
      lighting: Lightbulb
    };
    const Icon = iconMap[type] || Building;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2 min-w-20">
          {getUpgradeIcon(upgradeType)}
          <span className="text-sm font-medium text-white capitalize">
            {upgradeType === 'vipSuites' ? 'VIP' : upgradeType}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {renderDots()}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-white">₡{cost.toLocaleString()}</div>
          {paybackGames && (
            <div className="text-xs text-gray-400">≈ {paybackGames} games</div>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onUpgrade}
                disabled={currentLevel >= maxLevel}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 h-8"
              >
                Upgrade ▶
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{effect}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// Radial Gauge Component
const RadialGauge: React.FC<{
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}> = ({ value, max, size = 80, strokeWidth = 8, color = '#8b5cf6', label, showValue = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{Math.round(value)}</span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-sm text-gray-400 mt-2 text-center max-w-20">{label}</span>
      )}
    </div>
  );
};

const StadiumFinancialHub: React.FC<StadiumFinancialHubProps> = ({ team, stadium }) => {
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeOption | null>(null);

  // Fetch stadium analytics from backend
  const { data: stadiumAnalytics, isLoading } = useQuery({
    queryKey: [`/api/stadium-atmosphere/team/${team?.id}/analytics`],
    enabled: !!team?.id
  });

  // Use actual stadium data from props
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
  
  // Calculate attendance rate
  const attendanceRate = Math.min(85, Math.max(35, (fanLoyalty * 0.6) + (division <= 4 ? 15 : 5)));
  const actualAttendance = Math.floor((currentStadium.capacity * attendanceRate) / 100);
  
  // Calculate atmosphere bonus based on fan loyalty with proper game stats
  const atmosphereBonus = fanLoyalty > 75 ? '+3% Leadership' : fanLoyalty > 50 ? '+2% Catching' : '+1% Agility';
  
  // Calculate stadium value based on upgrades
  const stadiumValue = 100000 + // Base stadium value
    (currentStadium.capacity - 5000) * 10 + // Capacity investment
    (currentStadium.concessionsLevel - 1) * 15000 + // Concessions upgrades
    (currentStadium.parkingLevel - 1) * 20000 + // Parking upgrades
    currentStadium.vipSuitesLevel * 75000 + // VIP suites
    (currentStadium.merchandisingLevel - 1) * 12000 + // Merchandising upgrades
    (currentStadium.lightingScreensLevel - 1) * 30000; // Lighting upgrades
  
  // Calculate daily upkeep as 1% of stadium value per day (increased from 0.2%)
  const dailyUpkeep = Math.floor(stadiumValue * 0.01); // 1.0% of stadium value
  
  // Calculate revenue breakdown with division scaling
  // Division 1-2: ×1.5, Division 3-5: ×1.2, Division 6-7: ×1.1, Division 8: ×1.0
  let divisionMultiplier = 1.0;
  if (division <= 2) divisionMultiplier = 1.5;
  else if (division <= 5) divisionMultiplier = 1.2;
  else if (division <= 7) divisionMultiplier = 1.1;
  
  const revenueBreakdown: RevenueBreakdown = {
    ticketSales: Math.floor(actualAttendance * 25 * divisionMultiplier),
    concessions: Math.floor(actualAttendance * 8 * currentStadium.concessionsLevel * divisionMultiplier),
    parking: Math.floor(actualAttendance * 0.3 * 10 * currentStadium.parkingLevel * divisionMultiplier),
    vipSuites: currentStadium.vipSuitesLevel * 5000, // VIP suites unaffected by division
    apparelSales: Math.floor(actualAttendance * 3 * currentStadium.merchandisingLevel * divisionMultiplier),
    atmosphereBonus: fanLoyalty > 80 ? actualAttendance * 2 : 0
  };
  
  const totalGameRevenue = Object.values(revenueBreakdown).reduce((sum, val) => sum + val, 0);
  
  // Upgrade options with BALANCED COSTS for 4-6 game ROI
  const upgradeOptions: UpgradeOption[] = [
    {
      name: 'Capacity',
      type: 'capacity',
      currentLevel: Math.floor(currentStadium.capacity / 5000), // Based on 5k base capacity
      maxLevel: 5,
      cost: 15000, // Fixed ₡15k per +5k seats
      effect: '+5,000 seats, increased revenue potential',
      paybackGames: Math.ceil(15000 / (5000 * 25))
    },
    {
      name: 'Concessions',
      type: 'concessions',
      currentLevel: currentStadium.concessionsLevel,
      maxLevel: 5,
      cost: 52500 * Math.pow(1.5, currentStadium.concessionsLevel - 1), // 75% increase from 30k
      effect: '+8₡ per fan per level',
      paybackGames: Math.ceil((52500 * Math.pow(1.5, currentStadium.concessionsLevel - 1)) / (actualAttendance * 8))
    },
    {
      name: 'Parking',
      type: 'parking',
      currentLevel: currentStadium.parkingLevel,
      maxLevel: 5,
      cost: 43750 * Math.pow(1.5, currentStadium.parkingLevel - 1), // 75% increase from 25k
      effect: '+3₡ per 30% of fans',
      paybackGames: Math.ceil((43750 * Math.pow(1.5, currentStadium.parkingLevel - 1)) / (Math.floor(actualAttendance * 0.3) * 3))
    },
    {
      name: 'VIP Suites',
      type: 'vipSuites',
      currentLevel: currentStadium.vipSuitesLevel,
      maxLevel: 5,
      cost: 100000 * Math.pow(1.5, currentStadium.vipSuitesLevel), // Keep as prestige capstone
      effect: '+₡5,000 / game',
      paybackGames: Math.ceil((100000 * Math.pow(1.5, currentStadium.vipSuitesLevel)) / 5000)
    },
    {
      name: 'Merchandise',
      type: 'merchandising',
      currentLevel: currentStadium.merchandisingLevel,
      maxLevel: 5,
      cost: 70000 * Math.pow(1.5, currentStadium.merchandisingLevel - 1), // 75% increase from 40k
      effect: '+3₡ per fan per level',
      paybackGames: Math.ceil((70000 * Math.pow(1.5, currentStadium.merchandisingLevel - 1)) / (actualAttendance * 3))
    },
    {
      name: 'Lighting',
      type: 'lighting',
      currentLevel: currentStadium.lightingScreensLevel,
      maxLevel: 5,
      cost: 60000 * Math.pow(1.5, currentStadium.lightingScreensLevel - 1), // Keep at 60k base for loyalty
      effect: '+0.75 Loyalty per level (was +0.5)',
      paybackGames: 0 // Long-term benefit through fan loyalty
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading stadium data...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="px-4 py-8 bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* 1. Above-the-Fold KPI Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Capacity Progress Bar */}
            <Card className="bg-gray-800/90 border-gray-700 col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Capacity</span>
                </div>
                <Progress 
                  value={(currentStadium.capacity / 40000) * 100} 
                  className="mb-2 h-2" 
                />
                <Tooltip>
                  <TooltipTrigger className="text-xs text-gray-300 cursor-help">
                    {currentStadium.capacity.toLocaleString()} / 40,000
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to open capacity upgrade options</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            {/* Fan Loyalty Radial Gauge */}
            <Card className="bg-gray-800/90 border-gray-700">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-white">Fan Loyalty</span>
                </div>
                <RadialGauge 
                  value={fanLoyalty} 
                  max={100} 
                  size={60} 
                  strokeWidth={6}
                  color={fanLoyalty > 75 ? '#22c55e' : fanLoyalty > 50 ? '#f59e0b' : '#ef4444'}
                />
              </CardContent>
            </Card>

            {/* Season Avg Attendance */}
            <Card className="bg-gray-800/90 border-gray-700">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Attendance</span>
                </div>
                <RadialGauge 
                  value={attendanceRate} 
                  max={100} 
                  size={60} 
                  strokeWidth={6}
                  color={fanLoyalty > 75 ? '#22c55e' : fanLoyalty > 50 ? '#f59e0b' : '#ef4444'}
                  showValue={false}
                />
                <span className="text-xs text-gray-300 mt-1">{attendanceRate}%</span>
              </CardContent>
            </Card>

            {/* Daily Upkeep */}
            <Card className="bg-gray-800/90 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">Daily Upkeep</span>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="bg-red-600/80 text-white">
                      –₡{dailyUpkeep.toLocaleString()} / day
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-xs">
                      <p>Stadium maintenance: ₡{Math.floor(stadiumValue * 0.002).toLocaleString()}</p>
                      <p>Base operations: ₡1,000</p>
                      <p>Total daily cost: ₡{dailyUpkeep.toLocaleString()}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            {/* Atmosphere Bonus */}
            <Card className="bg-gray-800/90 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Atmosphere</span>
                </div>
                <Badge className="bg-purple-600/80 text-white">
                  {atmosphereBonus}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* 2. Facilities & Upgrades - Tier Ladder Components */}
          <Card className="bg-gray-800/90 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-400" />
                Facilities & Upgrades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upgradeOptions.map((option) => (
                <TierLadder
                  key={option.type}
                  currentLevel={option.currentLevel}
                  maxLevel={option.maxLevel}
                  upgradeType={option.type}
                  cost={option.cost}
                  effect={option.effect}
                  paybackGames={option.paybackGames}
                  onUpgrade={() => setSelectedUpgrade(option)}
                />
              ))}
            </CardContent>
          </Card>

          {/* 3. Revenue Breakdown & Attendance Analytics */}
          <Card className="bg-gray-800/90 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-400" />
                Revenue Breakdown & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left text-gray-300 py-2">Stream</th>
                      <th className="text-right text-gray-300 py-2">Formula Example</th>
                      <th className="text-right text-gray-300 py-2">This Season (Est.)</th>
                      <th className="text-right text-gray-300 py-2">Per Home Game</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr className="border-b border-gray-700/50">
                      <td className="text-white py-2">Tickets</td>
                      <td className="text-gray-400 text-right">25₡ × attendance</td>
                      <td className="text-green-400 text-right font-medium">₡{(revenueBreakdown.ticketSales * 8).toLocaleString()}</td>
                      <td className="text-white text-right">₡{revenueBreakdown.ticketSales.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="text-white py-2">Concessions</td>
                      <td className="text-gray-400 text-right">8₡ × attendance × lvl</td>
                      <td className="text-green-400 text-right font-medium">₡{(revenueBreakdown.concessions * 8).toLocaleString()}</td>
                      <td className="text-white text-right">₡{revenueBreakdown.concessions.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="text-white py-2">Parking</td>
                      <td className="text-gray-400 text-right">10₡ × (0.3 att) × lvl</td>
                      <td className="text-green-400 text-right font-medium">₡{(revenueBreakdown.parking * 8).toLocaleString()}</td>
                      <td className="text-white text-right">₡{revenueBreakdown.parking.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="text-white py-2">VIP Suites</td>
                      <td className="text-gray-400 text-right">5,000₡ × suites</td>
                      <td className="text-green-400 text-right font-medium">₡{(revenueBreakdown.vipSuites * 8).toLocaleString()}</td>
                      <td className="text-white text-right">₡{revenueBreakdown.vipSuites.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="text-white py-2">Merchandise</td>
                      <td className="text-gray-400 text-right">3₡ × attendance × lvl</td>
                      <td className="text-green-400 text-right font-medium">₡{(revenueBreakdown.apparelSales * 8).toLocaleString()}</td>
                      <td className="text-white text-right">₡{revenueBreakdown.apparelSales.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-green-400/50 font-bold">
                      <td className="text-white py-2">Total</td>
                      <td className="text-gray-400 text-right"></td>
                      <td className="text-green-400 text-right text-lg">₡{(totalGameRevenue * 8).toLocaleString()}</td>
                      <td className="text-green-400 text-right text-lg">₡{totalGameRevenue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance trend placeholder */}
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">Last 5 Home Games Attendance Trend</div>
                <div className="flex items-end gap-2 h-16">
                  {[68, 72, 65, 74, 70].map((attendance, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger>
                        <div 
                          className="bg-blue-500 w-8 rounded-t cursor-help transition-colors hover:bg-blue-400"
                          style={{ height: `${attendance}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Game {i + 1}: {attendance}% attendance</p>
                        <p>vs Mock Opponent</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>
    </TooltipProvider>
  );
};

export default StadiumFinancialHub;