/**
 * Financial Center Component - Centralized financial management
 * Implements UI/UX requirements for Market District prominence and real-time updates
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  Receipt, 
  Gem,
  Target,
  AlertCircle,
  Coins,
  FileText,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PaymentHistory from "./PaymentHistory";

interface FinancialData {
  credits: number;
  gems: number;
  projectedIncome: number;
  projectedExpenses: number;
  lastSeasonRevenue: number;
  lastSeasonExpenses: number;
  facilitiesMaintenanceCost: number;
  playerSalaries: number;
  staffSalaries: number;
  totalExpenses: number;
  netIncome: number;
}

interface RevenueBreakdown {
  ticketSales: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  apparel: number;
  total: number;
}

interface PlayerContract {
  id: string;
  playerName: string;
  role: string;
  salary: number;
  length: number;
  yearsRemaining: number;
  status: string;
}

interface FinancialCenterProps {
  teamId: string;
}

export default function FinancialCenter({ teamId }: FinancialCenterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSeason, setSelectedSeason] = useState<string>("current");

  // Fetch team finances
  const { data: financesData, isLoading: financesLoading } = useQuery<FinancialData>({
    queryKey: ['/api/teams', teamId, 'finances'],
    queryFn: () => apiRequest<FinancialData>(`/api/teams/${teamId}/finances`),
    enabled: !!teamId,
  });

  // Fetch revenue breakdown
  const { data: revenueData } = useQuery<RevenueBreakdown>({
    queryKey: ['/api/stadium-atmosphere/revenue-breakdown'],
    queryFn: () => apiRequest<RevenueBreakdown>('/api/stadium-atmosphere/revenue-breakdown'),
    enabled: !!teamId,
  });

  // Fetch player contracts
  const { data: contractsData } = useQuery<PlayerContract[]>({
    queryKey: ['/api/teams', teamId, 'contracts'],
    queryFn: () => apiRequest<PlayerContract[]>(`/api/teams/${teamId}/contracts`),
    enabled: !!teamId,
  });

  // Contract negotiation mutation
  const negotiateContractMutation = useMutation({
    mutationFn: ({ playerId, terms }: { playerId: string; terms: any }) =>
      apiRequest(`/api/contracts/negotiate/${playerId}`, 'POST', terms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'finances'] });
      toast({
        title: "Contract Negotiation Complete",
        description: "Player contract has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Negotiation Failed",
        description: error.message || "Failed to negotiate contract",
        variant: "destructive",
      });
    },
  });

  // Process financial data safely
  const finances: FinancialData = financesData ? {
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

  const revenue: RevenueBreakdown = {
    ticketSales: revenueData?.ticketSales || 0,
    concessions: revenueData?.concessions || 0,
    parking: revenueData?.parking || 0,
    vipSuites: revenueData?.vipSuites || 0,
    apparel: revenueData?.apparel || 0,
    total: revenueData?.total || 0,
  };

  const contracts: PlayerContract[] = contractsData || [];

  // Calculate budget health
  const budgetHealth = finances.totalExpenses > 0 
    ? Math.round((finances.projectedIncome / finances.totalExpenses) * 100)
    : finances.projectedIncome > 0 ? 100 : 0;

  const getBudgetHealthColor = (health: number) => {
    if (health >= 120) return 'text-green-600';
    if (health >= 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBudgetHealthLabel = (health: number) => {
    if (health >= 120) return 'Excellent';
    if (health >= 100) return 'Healthy';
    if (health >= 80) return 'Caution';
    return 'Critical';
  };

  if (financesLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
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

  return (
    <div className="space-y-6">
      {/* Financial KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₡{finances.credits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Primary currency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Gems</CardTitle>
            <Gem className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              💎{finances.gems.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Premium currency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${finances.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₡{finances.netIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">After all expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBudgetHealthColor(budgetHealth)}`}>
              {budgetHealth}%
            </div>
            <p className="text-xs text-muted-foreground">
              {getBudgetHealthLabel(budgetHealth)}
            </p>
            <Progress value={Math.min(100, budgetHealth)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Financial Management */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Streams</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="history">Transaction Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income vs Expenses
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="last">Last Season</SelectItem>
                      <SelectItem value="projected">Projected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">Total Income</span>
                    <span className="font-bold text-green-600">
                      ₡{selectedSeason === 'last' 
                        ? finances.lastSeasonRevenue.toLocaleString()
                        : finances.projectedIncome.toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">Total Expenses</span>
                    <span className="font-bold text-red-600">
                      ₡{selectedSeason === 'last' 
                        ? finances.lastSeasonExpenses.toLocaleString()
                        : finances.totalExpenses.toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="font-semibold">Net Result</span>
                    <span className={`font-bold ${finances.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₡{finances.netIncome.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Player Salaries</span>
                    </div>
                    <span className="font-bold">₡{finances.playerSalaries.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Staff Salaries</span>
                    </div>
                    <span className="font-bold">₡{finances.staffSalaries.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Stadium Maintenance</span>
                    </div>
                    <span className="font-bold">₡{finances.facilitiesMaintenanceCost.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stadium Revenue Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Revenue generated from your last home game
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">₡{revenue.ticketSales.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Ticket Sales</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₡{revenue.concessions.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Concessions</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">₡{revenue.parking.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Parking</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">₡{revenue.vipSuites.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">VIP Suites</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">₡{revenue.apparel.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Merchandise</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-muted">
                  <div className="text-2xl font-bold">₡{revenue.total.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Player Contracts Management</span>
                <Button size="sm" variant="outline">
                  Bulk Negotiate
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{contract.playerName}</div>
                        <div className="text-sm text-muted-foreground">{contract.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₡{contract.salary.toLocaleString()}/season</div>
                      <div className="text-sm text-muted-foreground">
                        {contract.yearsRemaining} years remaining
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={contract.status === 'Active' ? 'default' : 'secondary'}>
                        {contract.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => negotiateContractMutation.mutate({ 
                          playerId: contract.id, 
                          terms: { salary: contract.salary, length: contract.length } 
                        })}
                        disabled={negotiateContractMutation.isPending}
                      >
                        Negotiate
                      </Button>
                    </div>
                  </div>
                ))}
                {contracts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No player contracts found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/*
           // @ts-expect-error TS2322 */}
          <PaymentHistory teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}