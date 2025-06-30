import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Shirt } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Team, TeamFinances as TeamFinancesData } from "shared/schema"; // Renamed to avoid conflict

interface TeamFinancesProps {
  teamId: string;
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

  // Provide default structure matching TeamFinancesData if financesData is null/undefined
  const currentFinances: TeamFinancesData = financesData ?? {
    id: "", // Default ID or handle differently if ID is crucial and missing
    teamId: teamId,
    season: 1,
    ticketSales: 0,
    concessionSales: 0,
    jerseySales: 0,
    sponsorships: 0,
    playerSalaries: 0,
    staffSalaries: 0,
    facilities: 0,
    credits: 0, // Note: TeamFinancesData has credits, teamData also has credits. Clarify which is primary.
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    premiumCurrency: 0,
    createdAt: new Date(), // Default date
  };

  const totalExpensesSafe = (currentFinances.totalExpenses == null || currentFinances.totalExpenses === 0) ? 1 : currentFinances.totalExpenses; // Avoid division by zero and handle null

  const budgetHealth = currentFinances.totalIncome != null && currentFinances.totalExpenses != null
    ? ((currentFinances.totalIncome ?? 0) / totalExpensesSafe) * 100
    : 0;
  const salaryCapUsed = currentFinances.playerSalaries != null
    ? ((currentFinances.playerSalaries ?? 0) / 200000) * 100 // Assume 200k salary cap for now
    : 0;

  const incomeStreams = [
    {
      name: "Ticket Sales",
      amount: currentFinances.ticketSales ?? 0,
      icon: Users,
      description: "Revenue from match attendance",
      growth: "+12%" // Placeholder
    },
    {
      name: "Concessions",
      amount: currentFinances.concessionSales ?? 0,
      icon: ShoppingBag,
      description: "Food and beverage sales",
      growth: "+8%" // Placeholder
    },
    {
      name: "Jersey Sales",
      amount: currentFinances.jerseySales ?? 0,
      icon: Shirt,
      description: "Team merchandise revenue",
      growth: "+15%" // Placeholder
    },
    {
      name: "Sponsorships",
      amount: currentFinances.sponsorships ?? 0,
      icon: DollarSign,
      description: "Corporate sponsorship deals",
      growth: "+5%" // Placeholder
    },
  ];

  const expenses = [
    {
      name: "Player Salaries",
      amount: currentFinances.playerSalaries ?? 0,
      description: "Total player compensation",
      percentage: currentFinances.playerSalaries != null && currentFinances.totalExpenses != null ? ((currentFinances.playerSalaries ?? 0) / totalExpensesSafe) * 100 : 0
    },
    {
      name: "Staff Salaries",
      amount: currentFinances.staffSalaries ?? 0,
      description: "Coaching and support staff",
      percentage: currentFinances.staffSalaries != null && currentFinances.totalExpenses != null ? ((currentFinances.staffSalaries ?? 0) / totalExpensesSafe) * 100 : 0
    },
    {
      name: "Facilities",
      amount: currentFinances.facilities ?? 0,
      description: "Stadium and training ground costs",
      percentage: currentFinances.facilities != null && currentFinances.totalExpenses != null ? ((currentFinances.facilities ?? 0) / totalExpensesSafe) * 100 : 0
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Finances</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Available Credits</p>
          <p className="text-2xl font-bold">
            ${teamData?.credits?.toLocaleString() ?? "0"}
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
              ${(currentFinances.totalIncome ?? 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mt-1">This season</p>
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
              ${(currentFinances.totalExpenses ?? 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mt-1">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className={(currentFinances.netIncome ?? 0) >= 0 ? "text-green-600" : "text-red-600"} size={20} />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(currentFinances.netIncome ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(currentFinances.netIncome ?? 0) >= 0 ? "+" : ""}${(currentFinances.netIncome ?? 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mt-1">Profit/Loss</p>
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
            <CardTitle className="text-lg">Salary Cap Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Player Salaries</span>
                <span className="text-sm">{salaryCapUsed.toFixed(1)}%</span>
              </div>
              <Progress 
                value={salaryCapUsed} 
                className="h-3"
              />
              <div className="text-xs text-gray-500 mt-1">
                ${(200000 - (currentFinances.playerSalaries ?? 0)).toLocaleString()} remaining cap space
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Revenue Streams</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                      {currentFinances.totalIncome != null && currentFinances.totalIncome !== 0
                        ? ((stream.amount / currentFinances.totalIncome) * 100).toFixed(1)
                        : "0.0"}% of total income
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
                      <span>Salary Efficiency:</span>
                      <span className={salaryCapUsed > 85 ? "text-red-600" : "text-green-600"}>
                        {salaryCapUsed > 85 ? "Over budget" : "Within budget"}
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
                  <div className={`text-2xl font-bold ${(currentFinances.netIncome ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(currentFinances.netIncome ?? 0) >= 0 ? "+" : ""}${((currentFinances.netIncome ?? 0) * 1.2).toLocaleString()} profit
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on current performance trends
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}