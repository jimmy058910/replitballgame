import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  Gem,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Filter,
  Search,
  Info,
  ChevronDown,
  Eye,
  Building,
  Trophy,
  Ticket,
  Store,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  User
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import PaymentHistory from './PaymentHistory';

interface FinancialData {
  credits: number;
  gems: number;
  netIncome: number;
  incomeStreams: {
    ticketSales: number;
    concessions: number;
    parking: number;
    vipSuites: number;
    merchandising: number;
    exhibitionFees: number;
    tournamentRewards: number;
    seasonBonuses: number;
    storeTransactions: number;
    miscellaneous: number;
  };
  expenseBreakdown: {
    playerSalaries: number;
    staffSalaries: number;
    facilityUpgrades: number;
    storePurchases: number;
    marketplaceFees: number;
    maintenanceCosts: number;
  };
}

interface Contract {
  id: string;
  playerName?: string;
  staffName?: string;
  role: string;
  annualSalary: number;
  yearsRemaining: number;
  totalCommitment: number;
  type: 'player' | 'staff';
}

// Transaction interface removed - PaymentHistory has its own transaction types

interface EnhancedFinancesTabProps {
  teamId: string;
}

export function EnhancedFinancesTab({ teamId }: EnhancedFinancesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('current');
  // PaymentHistory component handles its own state management

  // Get team data from the Market District's team query (should already be loaded)
  const { data: teamFromMarket } = useQuery({
    queryKey: ['/api/teams/my'],
    enabled: false // Don't fetch again, should use cached data
  });

  // Fetch team finances
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'finances'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/finances`),
    enabled: !!teamId
  });

  // Fetch contracts
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'contracts'], 
    queryFn: () => apiRequest(`/api/teams/${teamId}/contracts`),
    enabled: !!teamId
  });

  // PaymentHistory component handles its own data fetching

  // Map the actual financial data to our expected format
  const rawFinancialData = financialData as any;
  const financial: FinancialData = {
    credits: parseInt(rawFinancialData?.credits || '0'),
    gems: parseInt(rawFinancialData?.gems || '0'),
    netIncome: rawFinancialData?.netIncome || 0,
    incomeStreams: {
      ticketSales: rawFinancialData?.ticketSales || 0,
      concessions: rawFinancialData?.concessions || 0,
      parking: rawFinancialData?.parking || 0,
      vipSuites: rawFinancialData?.vipSuites || 0,
      merchandising: rawFinancialData?.merchandising || 0,
      exhibitionFees: 0,
      tournamentRewards: 0,
      seasonBonuses: 0,
      storeTransactions: 0,
      miscellaneous: 0
    },
    expenseBreakdown: {
      playerSalaries: rawFinancialData?.playerSalaries || 0,
      staffSalaries: rawFinancialData?.staffSalaries || 0,
      facilityUpgrades: 0,
      storePurchases: 0,
      marketplaceFees: 0,
      maintenanceCosts: rawFinancialData?.facilitiesMaintenanceCost || 0
    }
  };

  // Map contracts data from the API response
  const contractsList: Contract[] = contractsData?.players ? contractsData.players.map((player: any) => ({
    id: player.id?.toString() || 'unknown',
    playerName: `${player.firstName} ${player.lastName}`,
    staffName: undefined,
    role: player.role,
    annualSalary: player.salary || 0,
    yearsRemaining: player.contractLength || 0,
    totalCommitment: (player.salary || 0) * (player.contractLength || 0),
    type: 'player' as const
  })) : [];

  // Remove transactionsList - PaymentHistory handles this internally

  const formatCurrency = (amount: number, currency = 'credits') => {
    const symbol = currency === 'gems' ? '💎' : '₡';
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const getNetIncomeColor = (amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getNetIncomeGaugeColor = (amount: number) => {
    return amount >= 0 ? 'bg-green-500' : 'bg-red-500';
  };

  // Removed openTransactionDetail - PaymentHistory handles transaction details internally

  if (financialLoading || contractsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sub-tabs and Timeframe Selector */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
              <TabsTrigger value="contracts" className="text-sm">Contracts</TabsTrigger>
              <TabsTrigger value="transactions" className="text-sm">Transactions</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="last_season">Last Season</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Sub-Tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-500/20 p-3 rounded-lg">
                    <Coins className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-medium text-gray-300">Credits Balance</h3>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(financial.credits)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <Gem className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-medium text-gray-300">Gems Balance</h3>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(financial.gems, 'gems')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${financial.netIncome >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {financial.netIncome >= 0 ? 
                      <TrendingUp className="w-6 h-6 text-green-400" /> : 
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-medium text-gray-300">Net Income</h3>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className={`text-2xl font-bold ${getNetIncomeColor(financial.netIncome)}`}>
                      {formatCurrency(financial.netIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income & Expense Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Streams */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <ArrowUpRight className="w-5 h-5" />
                  Income Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Ticket Sales</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.ticketSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Concessions</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.concessions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Parking</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.parking)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">VIP Suites</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.vipSuites)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Merchandising</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.merchandising)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Exhibition Fees</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.exhibitionFees)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Tournament Rewards</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.tournamentRewards)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Season Bonuses</span>
                  <span className="text-green-400 font-medium">{formatCurrency(financial.incomeStreams.seasonBonuses)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <ArrowDownRight className="w-5 h-5" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Player Salaries</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.playerSalaries)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Staff Salaries</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.staffSalaries)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Facility Upgrades</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.facilityUpgrades)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Store Purchases</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.storePurchases)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Marketplace Fees</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.marketplaceFees)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Maintenance Costs</span>
                  <span className="text-red-400 font-medium">−{formatCurrency(financial.expenseBreakdown.maintenanceCosts)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net Result Gauge */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white text-center">Net Income Result</h3>
                <div className="relative">
                  <div className="w-full bg-gray-700 rounded-full h-8">
                    <div 
                      className={`h-8 rounded-full ${getNetIncomeGaugeColor(financial.netIncome)} transition-all duration-500`}
                      style={{ width: `${Math.min(Math.abs(financial.netIncome) / 100000 * 100, 100)}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold text-lg ${getNetIncomeColor(financial.netIncome)}`}>
                      {formatCurrency(financial.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contracts Sub-Tab */}
      {activeSubTab === 'contracts' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5" />
              Contract Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Annual Salary</TableHead>
                    <TableHead className="text-gray-300">Years Remaining</TableHead>
                    <TableHead className="text-gray-300">Total Commitment</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsList.map((contract) => (
                    <TableRow key={contract.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          {contract.type === 'player' ? (
                            <User className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Users className="w-4 h-4 text-green-400" />
                          )}
                          {contract.playerName || contract.staffName}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{contract.role}</TableCell>
                      <TableCell className="text-green-400">{formatCurrency(contract.annualSalary)}</TableCell>
                      <TableCell className="text-gray-300">{contract.yearsRemaining} years</TableCell>
                      <TableCell className="text-yellow-400">{formatCurrency(contract.totalCommitment)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Sub-Tab */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                Complete Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistory className="bg-transparent border-none shadow-none" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Detail Sheet removed - PaymentHistory handles transaction details internally */}
    </div>
  );
}

export default EnhancedFinancesTab;