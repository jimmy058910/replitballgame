import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Coins, 
  Gem, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Filter,
  Eye,
  Search
} from "lucide-react";
import { format } from "date-fns";

interface PaymentTransaction {
  id: string;
  transactionType: string;
  itemType: string;
  itemName: string;
  amount: number;
  creditsAmount: string; // BigInt serialized as string
  gemsAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  completedAt: string;
  metadata: any;
}

interface PaymentHistoryProps {
  className?: string;
}

interface PaymentHistoryData {
  transactions: PaymentTransaction[];
  total: number;
}

interface PaymentSummary {
  totalCreditsEarned: number;
  totalCreditsSpent: number;
  totalGemsEarned: number;
  totalSpentUSD: number;
}

export default function PaymentHistory({ className }: PaymentHistoryProps) {
  const [filters, setFilters] = useState({
    currencyFilter: "both" as "credits" | "gems" | "both",
    transactionType: "all",
    status: "all",
    limit: 50,
    offset: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch payment history
  const { data: rawHistoryData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["/api/payment-history", filters],
    enabled: true,
  });
  const historyData = (rawHistoryData || {}) as PaymentHistoryData;

  // Fetch transaction summary
  const { data: rawSummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/payment-history/summary"],
    enabled: true,
  });
  const summary = (rawSummaryData || {}) as PaymentSummary;

  const transactions = historyData?.transactions || [];
  const totalTransactions = historyData?.total || 0;

  // Filter transactions by search term
  const filteredTransactions = transactions.filter((transaction: PaymentTransaction) =>
    transaction.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.transactionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset pagination
    }));
  };

  const loadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  const getTransactionIcon = (transaction: PaymentTransaction) => {
    const creditsAmount = parseInt(transaction.creditsAmount || '0');
    const gemsAmount = transaction.gemsAmount || 0;
    
    if (creditsAmount > 0 || gemsAmount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (creditsAmount < 0 || gemsAmount < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <DollarSign className="h-4 w-4 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, color: "bg-green-500" },
      pending: { variant: "secondary" as const, color: "bg-yellow-500" },
      failed: { variant: "destructive" as const, color: "bg-red-500" },
      refunded: { variant: "outline" as const, color: "bg-gray-500" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <Coins className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {summary.totalCreditsEarned?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Spent</CardTitle>
            <Coins className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {summary.totalCreditsSpent?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gems Earned</CardTitle>
            <Gem className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {summary.totalGemsEarned?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Currency Filter */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={filters.currencyFilter}
                onValueChange={(value) => handleFilterChange("currencyFilter", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">All Currencies</SelectItem>
                  <SelectItem value="credits">Credits Only</SelectItem>
                  <SelectItem value="gems">Gems Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={filters.transactionType}
                onValueChange={(value) => handleFilterChange("transactionType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="reward">Reward</SelectItem>
                  <SelectItem value="admin_grant">Admin Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {totalTransactions} transactions
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHistory()}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Gems</TableHead>
                    <TableHead>USD</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction: PaymentTransaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction)}
                          <div className="text-sm">
                            {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                            <div className="text-xs text-gray-500">
                              {format(new Date(transaction.createdAt), 'HH:mm')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {transaction.transactionType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {transaction.itemName || 'N/A'}
                        </div>
                        {transaction.itemType && (
                          <div className="text-xs text-gray-500 capitalize">
                            {transaction.itemType}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.creditsAmount && parseInt(transaction.creditsAmount) !== 0 && (
                          <div className={`flex items-center gap-1 ${
                            parseInt(transaction.creditsAmount) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <Coins className="h-3 w-3" />
                            {parseInt(transaction.creditsAmount) > 0 ? '+' : ''}
                            {parseInt(transaction.creditsAmount).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.gemsAmount && transaction.gemsAmount !== 0 && (
                          <div className={`flex items-center gap-1 ${
                            transaction.gemsAmount > 0 ? 'text-purple-600' : 'text-red-600'
                          }`}>
                            <Gem className="h-3 w-3" />
                            {transaction.gemsAmount > 0 ? '+' : ''}
                            {transaction.gemsAmount.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.amount && transaction.amount > 0 && (
                          <div className="text-green-600">
                            {formatCurrency(transaction.amount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm capitalize">
                          {transaction.paymentMethod || 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Load More Button */}
              {filteredTransactions.length < totalTransactions && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={historyLoading}
                  >
                    Load More Transactions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}