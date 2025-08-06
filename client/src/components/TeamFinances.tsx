import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Shirt } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
// Define financial types for this component
interface Team {
  id: string;
  name: string;
  credits: number;
}

interface TeamFinancesData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  credits: number;
}

interface TeamFinancesProps {
  teamId: string;
}

interface PlayerContract {
  id: number;
  salary: number;
  length: number;
  signingBonus: number;
  startDate: string;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    race: string;
    age: number;
    role: string;
  };
}

interface FinancialData {
  ticketSales: number;
  concessionSales: number;
  jerseySales: number;
  sponsorships: number;
  playerSalaries: number;
  staffSalaries: number;
  facilities: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  credits: number;
}

export default function TeamFinances({ teamId }: TeamFinancesProps) {
  const { data: financesData, isLoading: financesLoading, error: financesError } = useQuery<TeamFinancesData, Error>({
    queryKey: [`/api/teams/${teamId}/finances`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/finances`),
    enabled: !!teamId,
  });

  const { data: teamData, isLoading: teamLoading, error: teamError } = useQuery<Team, Error>({
    queryKey: [`/api/teams/${teamId}`],
    queryFn: () => apiRequest(`/api/teams/${teamId}`),
    enabled: !!teamId,
  });

  // Fetch player contracts
  const { data: contractsData, isLoading: contractsLoading } = useQuery<{contracts: PlayerContract[], totalContracts: number}, Error>({
    queryKey: [`/api/teams/${teamId}/contracts`],
    queryFn: () => apiRequest(`/api/teams/${teamId}/contracts`),
    enabled: !!teamId,
  });

  // Ensure we have financial data access
  // Convert credits from string to number for display
  const creditsAmount = financesData?.credits ? parseInt(String(financesData.credits)) : 0;

  if (financesLoading || teamLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
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

  // Use real financial data from API response
  const currentFinances = financesData ? {
    // Convert string fields to numbers
    credits: parseInt(String(financesData.credits)),
    gems: financesData.gems || 0,
    projectedIncome: parseInt(String(financesData.projectedIncome || '0')),
    projectedExpenses: parseInt(String(financesData.projectedExpenses || '0')),
    lastSeasonRevenue: parseInt(String(financesData.lastSeasonRevenue || '0')),
    lastSeasonExpenses: parseInt(String(financesData.lastSeasonExpenses || '0')),
    facilitiesMaintenanceCost: parseInt(String(financesData.facilitiesMaintenanceCost || '0')),
    playerSalaries: financesData.playerSalaries || 0,
    staffSalaries: financesData.staffSalaries || 0,
    totalExpenses: financesData.totalExpenses || 0,
    netIncome: financesData.netIncome || 0,
  } : {
    credits: 0,
    gems: 0,
    projectedIncome: 0,
    projectedExpenses: 0,
    lastSeasonRevenue: 0,
    lastSeasonExpenses: 0,
    facilitiesMaintenanceCost: 0,
    playerSalaries: 0,
    staffSalaries: 0,
    totalExpenses: 0,
    netIncome: 0,
  };

  // Calculate budget health safely (avoid division by zero)
  const budgetHealth = currentFinances.totalExpenses > 0 
    ? Math.round((currentFinances.projectedIncome / currentFinances.totalExpenses) * 100)
    : currentFinances.projectedIncome > 0 ? 100 : 0;

  const incomeStreams = [
    {
      name: "Projected Income",
      amount: currentFinances.projectedIncome,
      icon: TrendingUp,
      description: "Expected revenue this season",
      growth: "+0%"
    },
    {
      name: "Last Season Revenue",
      amount: currentFinances.lastSeasonRevenue,
      icon: DollarSign,
      description: "Previous season earnings",
      growth: "N/A"
    },
  ];

  const expenses = [
    {
      name: "Player Salaries",
      amount: currentFinances.playerSalaries ?? 0,
      description: "Total player compensation",
      percentage: currentFinances.totalExpenses > 0 ? (currentFinances.playerSalaries / currentFinances.totalExpenses) * 100 : 0
    },
    {
      name: "Staff Salaries",
      amount: currentFinances.staffSalaries ?? 0,
      description: "Coaching and support staff",
      percentage: currentFinances.totalExpenses > 0 ? (currentFinances.staffSalaries / currentFinances.totalExpenses) * 100 : 0
    },
    {
      name: "Facilities Maintenance",
      amount: currentFinances.facilitiesMaintenanceCost,
      description: "Stadium and training ground costs",
      percentage: currentFinances.totalExpenses > 0 ? (currentFinances.facilitiesMaintenanceCost / currentFinances.totalExpenses) * 100 : 0
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Finances</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Available Credits</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₡{creditsAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20} />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₡{currentFinances.projectedIncome.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="text-red-600" size={20} />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ₡{currentFinances.totalExpenses.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className={((currentFinances as any).netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"} size={20} />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentFinances.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              {currentFinances.netIncome >= 0 ? "+" : ""}₡{Math.abs(currentFinances.netIncome).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Profit/Loss</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Income vs Expenses</span>
                <span className="text-sm">{budgetHealth.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(budgetHealth, 100)} 
                className="h-3"
              />
              <div className="text-xs text-gray-500 mt-1">
                {budgetHealth >= 100 ? "Healthy budget surplus" :
                 budgetHealth >= 90 ? "Breaking even" :
                 budgetHealth >= 80 ? "Slight deficit" : "Significant deficit"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Player Salaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Total Player Compensation</span>
                <span className="text-sm font-bold">₡{((currentFinances as any).playerSalaries || 0).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((currentFinances as any).playerSalaries / (currentFinances as any).totalExpenses * 100).toFixed(1)}% of total expenses
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Revenue Streams</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="contracts">Player Contracts</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomeStreams.map((stream) => {
              const Icon = stream.icon;
              return (
                <Card key={stream.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon size={20} />
                      {stream.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{stream.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold">
                        ${stream.amount.toLocaleString()}
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        {stream.growth}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {(currentFinances as any).totalIncome > 0 ? ((stream.amount / (currentFinances as any).totalIncome) * 100).toFixed(1) : 0}% of total income
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="space-y-4">
            {expenses.map((expense) => (
              <Card key={expense.name}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-semibold">{expense.name}</h4>
                      <p className="text-sm text-gray-600">{expense.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${expense.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {expense.percentage.toFixed(1)}% of expenses
                      </div>
                    </div>
                  </div>
                  <Progress value={expense.percentage} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Season Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Revenue Factors</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Team Performance:</span>
                      <span className="text-green-600">+15% ticket sales</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Player Popularity:</span>
                      <span className="text-green-600">+8% jersey sales</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stadium Capacity:</span>
                      <span className="text-blue-600">85% average</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Cost Management</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Player Compensation:</span>
                      <span className="text-blue-600">
                        ₡{(((currentFinances as any).playerSalaries || 0) / 1000).toFixed(0)}k total
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff Optimization:</span>
                      <span className="text-blue-600">Good balance</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Facility Costs:</span>
                      <span className="text-green-600">Controlled</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">Projected End-of-Season</div>
                  <div className={`text-2xl font-bold ${(currentFinances as any).netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(currentFinances as any).netIncome >= 0 ? "+" : ""}₡{((currentFinances as any).netIncome * 1.2).toLocaleString()} profit
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on current performance trends
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Contracts
                <Badge variant="outline" className="ml-auto">
                  {contractsData?.totalContracts || 0} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="space-y-1">
                          <div className="w-24 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                          <div className="w-16 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : contractsData?.contracts?.length ? (
                <div className="space-y-3">
                  {contractsData.contracts.map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {contract.player?.firstName?.[0] || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {contract.player?.firstName} {contract.player?.lastName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {contract.player?.role?.toLowerCase()} • {contract.player?.race} • Age {contract.player?.age}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          ₡{contract.salary.toLocaleString()}/season
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {contract.length} year{contract.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Total Contract Value
                      </span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        ₡{contractsData.contracts.reduce((sum, c) => sum + c.salary, 0).toLocaleString()}/season
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No player contracts found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Contracts will appear here once players are signed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}