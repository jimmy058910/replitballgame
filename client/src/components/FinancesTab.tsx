import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gem, TrendingUp, TrendingDown, DollarSign, Users, Calendar, FileText, Filter, Search, ChevronDown, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PaymentHistory from './PaymentHistory';

interface Team {
  id: number;
  name: string;
}

interface TeamFinances {
  credits: string;
  gems: string;
  escrowCredits: string;
  escrowGems: string;
  projectedIncome: string;
  projectedExpenses: string;
  lastSeasonRevenue: string;
  lastSeasonExpenses: string;
}

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface Staff {
  id: number;
  name: string;
  type: string;
}

interface Contract {
  id: number;
  playerId?: number;
  staffId?: number;
  salary: string;
  length: number;
  startDate: string;
  player?: Player;
  staff?: Staff;
}

type TimeframeType = 'current' | 'last_season' | 'projected';

export default function FinancesTab() {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [timeframe, setTimeframe] = useState<TimeframeType>('current');

  // Fetch team data
  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  // Fetch team finances
  const { data: teamFinances } = useQuery<TeamFinances>({
    queryKey: ["/api/teams/" + team?.id + "/finances"],
    enabled: !!team?.id
  });

  // Fetch contracts
  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ["/api/teams/" + team?.id + "/contracts"],
    enabled: !!team?.id
  });

  const credits = parseInt(teamFinances?.credits || '0');
  const gems = parseInt(teamFinances?.gems || '0');
  const projectedIncome = parseInt(teamFinances?.projectedIncome || '0');
  const projectedExpenses = parseInt(teamFinances?.projectedExpenses || '0');
  const netIncome = projectedIncome - projectedExpenses;

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs and Timeframe Selector */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="transaction-log">Transaction Log</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={timeframe} onValueChange={(value: TimeframeType) => setTimeframe(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Season</SelectItem>
              <SelectItem value="last_season">Last Season</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeSubTab === 'overview' && <OverviewTab 
          credits={credits} 
          gems={gems} 
          netIncome={netIncome}
          timeframe={timeframe}
          teamFinances={teamFinances}
        />}
        {activeSubTab === 'contracts' && <ContractsTab contracts={contracts || []} />}
        {activeSubTab === 'transaction-log' && <TransactionLogTab />}
      </div>
    </div>
  );
}

// Overview Sub-Tab Component
function OverviewTab({ 
  credits, 
  gems, 
  netIncome, 
  timeframe, 
  teamFinances 
}: { 
  credits: number; 
  gems: number; 
  netIncome: number; 
  timeframe: TimeframeType;
  teamFinances?: TeamFinances;
}) {
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'current': return 'Current Season';
      case 'last_season': return 'Last Season';
      case 'projected': return 'Projected';
      default: return 'Current Season';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800/40 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Credits Balance</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your current in-game credits available for purchases</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {credits.toLocaleString()} ₡
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Gems Balance</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-purple-500" />
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Premium currency for special purchases and convenience features</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              {gems.toLocaleString()} ♦
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Net Income ({getTimeframeLabel()})</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    {netIncome >= 0 ? 
                      <TrendingUp className="h-5 w-5 text-green-500" /> :
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    }
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total income minus expenses for the selected timeframe</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome.toLocaleString()} ₡
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income & Expense Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Streams */}
        <Card className="bg-gray-800/40 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income Streams ({getTimeframeLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <IncomeItem label="Stadium Revenue" amount={45000} trend="up" />
            <IncomeItem label="Match Rewards" amount={12000} trend="stable" />
            <IncomeItem label="Tournament Prizes" amount={8500} trend="up" />
            <IncomeItem label="Player Sales" amount={25000} trend="down" />
            <IncomeItem label="Sponsorships" amount={15000} trend="stable" />
            <IncomeItem label="Other Income" amount={3200} trend="up" />
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="bg-gray-800/40 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Expense Breakdown ({getTimeframeLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExpenseItem label="Player Salaries" amount={85000} trend="up" />
            <ExpenseItem label="Staff Salaries" amount={25000} trend="stable" />
            <ExpenseItem label="Facility Maintenance" amount={5000} trend="stable" />
            <ExpenseItem label="Store Purchases" amount={8200} trend="up" />
            <ExpenseItem label="Marketplace Fees" amount={1500} trend="down" />
            <ExpenseItem label="Other Expenses" amount={2000} trend="stable" />
          </CardContent>
        </Card>
      </div>

      {/* Net Result Gauge */}
      <Card className="bg-gray-800/40 border-gray-600/20">
        <CardHeader>
          <CardTitle className="text-center">Financial Performance ({getTimeframeLabel()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="w-full bg-gray-700 rounded-full h-6 relative overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(Math.abs(netIncome) / 50000 * 100, 100)}%`,
                  marginLeft: netIncome < 0 ? `${100 - Math.min(Math.abs(netIncome) / 50000 * 100, 100)}%` : '0%'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                {netIncome >= 0 ? '+' : ''}{netIncome.toLocaleString()} ₡
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>-50k ₡</span>
              <span>Break Even</span>
              <span>+50k ₡</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Income Item Component
function IncomeItem({ label, amount, trend }: { label: string; amount: number; trend: 'up' | 'down' | 'stable' }) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-300">{label}</span>
        {getTrendIcon()}
      </div>
      <span className="text-green-400 font-medium">+{amount.toLocaleString()} ₡</span>
    </div>
  );
}

// Expense Item Component
function ExpenseItem({ label, amount, trend }: { label: string; amount: number; trend: 'up' | 'down' | 'stable' }) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-400" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-300">{label}</span>
        {getTrendIcon()}
      </div>
      <span className="text-red-400 font-medium">-{amount.toLocaleString()} ₡</span>
    </div>
  );
}

// Contracts Sub-Tab Component
function ContractsTab({ contracts }: { contracts: Contract[] }) {
  const [expandedContract, setExpandedContract] = useState<number | null>(null);

  const playerContracts = contracts.filter(c => c.playerId);
  const staffContracts = contracts.filter(c => c.staffId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Contracts */}
        <Card className="bg-gray-800/40 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Player Contracts ({playerContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerContracts.map((contract) => (
                <ContractRow 
                  key={contract.id} 
                  contract={contract} 
                  isExpanded={expandedContract === contract.id}
                  onToggle={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}
                />
              ))}
              {playerContracts.length === 0 && (
                <p className="text-gray-400 text-center py-4">No player contracts found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Contracts */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Staff Contracts ({staffContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staffContracts.map((contract) => (
                <ContractRow 
                  key={contract.id} 
                  contract={contract} 
                  isExpanded={expandedContract === contract.id}
                  onToggle={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}
                />
              ))}
              {staffContracts.length === 0 && (
                <p className="text-gray-400 text-center py-4">No staff contracts found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Contract Row Component
function ContractRow({ 
  contract, 
  isExpanded, 
  onToggle 
}: { 
  contract: Contract; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) {
  const name = contract.player ? 
    `${contract.player.firstName} ${contract.player.lastName}` : 
    contract.staff?.name || 'Unknown';
  
  const role = contract.player?.role || contract.staff?.type || 'Unknown';
  const salary = parseInt(contract.salary || '0');
  const yearsRemaining = contract.length;
  const totalCommitment = salary * yearsRemaining;

  return (
    <div className="border border-gray-700/30 rounded-lg p-3">
      <div 
        className="flex justify-between items-center cursor-pointer hover:bg-gray-700/20 rounded p-2 -m-2"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-medium text-white">{name}</span>
            <Badge variant="outline" className="text-xs">{role}</Badge>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            ₡{salary.toLocaleString()}/year • {yearsRemaining} year{yearsRemaining !== 1 ? 's' : ''} remaining
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-yellow-400">₡{totalCommitment.toLocaleString()}</div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-700/30 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Start Date:</span>
              <div className="text-white">{new Date(contract.startDate).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-gray-400">Annual Salary:</span>
              <div className="text-yellow-400">₡{salary.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="text-xs">
              Negotiate
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-red-400 border-red-400/20">
              Release
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Transaction Log Sub-Tab Component
function TransactionLogTab() {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/40 border-gray-600/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complete Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory className="bg-transparent border-none shadow-none" />
        </CardContent>
      </Card>
    </div>
  );
}