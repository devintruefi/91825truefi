"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InteractiveGoalChart } from "@/components/interactive-goal-chart";
import { BudgetEditor } from "@/components/budget-editor";
import { TrendingUp, AlertTriangle, CheckCircle, TrendingDown, DollarSign, Target, PiggyBank, Home, CreditCard, Building2, Smartphone, Star, Pin, Eye, Zap, Search, Edit3, Loader2, Calendar, Tag, RefreshCw, Save, X } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useFinancialData } from '@/hooks/use-financial-data';
import { usePaginatedTransactions } from '@/hooks/use-transactions';
import { useBudget } from '@/hooks/use-budget';
import { useDashboardSpending } from '@/hooks/use-dashboard-spending';
import { PlaidConnect } from './plaid-connect';
import { useUser } from '@/contexts/user-context';
import { CATEGORY_META } from '@/utils/category-meta';

// Use backend types
import type { Account as BackendAccount, Transaction as BackendTransaction } from '@/lib/api-client';

// Extend Goal type locally to include chart_data and ai_suggestion if not present
interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  priority?: string;
  is_active?: boolean;
  chart_data?: Array<{ month: string; current: number; projected: number }>;
  ai_suggestion?: string;
}

interface Account extends BackendAccount {
  balance: number; // mapped from current_balance
}

interface Transaction extends BackendTransaction {}

const glassmorphismCard = "backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/20 shadow-[0_2px_16px_rgba(0,0,0,0.05),inset_0_0_0.5px_rgba(255,255,255,0.15)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_0_0.5px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_0_0.5px_rgba(255,255,255,0.2)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_0_0.5px_rgba(255,255,255,0.1)] transition-all duration-300 ease-in-out hover:scale-[1.02]";
const gradientText = "bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent";
const pulseGlow = "animate-pulse shadow-[0_0_20px_rgba(0,186,199,0.3)] dark:shadow-[0_0_20px_rgba(70,220,143,0.3)]";

// Utility function for currency formatting
const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function EnhancedDashboardContent() {
  const { user } = useUser();
  const { data, loading, error, refresh } = useFinancialData(user?.id || null);
  const { budget, loading: budgetLoading } = useBudget();
  const { data: spendingData, loading: spendingLoading, error: spendingError, refresh: refreshSpending } = useDashboardSpending(user?.id || null);
  const accounts: Account[] = (data?.accounts || []).map(acc => ({
    ...acc,
    balance: acc.current_balance,
  }));
  const goals = data?.goals || [];
  const hasGoals = goals.length > 0;

  // Use the paginated transactions hook
  const {
    transactions,
    loading: transactionsLoading,
    loadingMore,
    error: transactionsError,
    pagination,
    loadMore,
    refresh: refreshTransactions,
    search,
    searchTerm
  } = usePaginatedTransactions(user?.id || null);

  // Transaction management state
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState('');
  const [updatingTransaction, setUpdatingTransaction] = useState<string | null>(null);

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category || 'Uncategorized')));

  // Calculate totals and categories from real data - FIXED TO HANDLE STRING BALANCES
  const totalBalance = accounts?.reduce((sum, account) => {
    const balance = parseFloat(account.balance?.toString() || '0')
    return sum + balance
  }, 0) || 0;
  
  // Calculate essentials, lifestyle, and savings from budget categories
  const essentialsCategories = ["Housing", "Transportation", "Food & Dining", "Utilities", "Healthcare", "Insurance"];
  const lifestyleCategories = ["Entertainment", "Shopping", "Personal Care"];
  const savingsCategories = ["Savings"];

  // Calculate total budget from all categories
  const totalBudget = budget?.budget_categories?.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  // Calculate budget amounts for each category
  const essentialsBudget = budget?.budget_categories
    ?.filter(cat => essentialsCategories.includes(cat.category))
    ?.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  const lifestyleBudget = budget?.budget_categories
    ?.filter(cat => lifestyleCategories.includes(cat.category))
    ?.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  const savingsBudget = budget?.budget_categories
    ?.filter(cat => savingsCategories.includes(cat.category))
    ?.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  // Get spending amounts from the new API endpoint (current month only)
  const monthlyBudgetSpent = spendingData?.spentByMain['Monthly Budget'] || 0;
  const essentialsSpent = spendingData?.spentByMain['Essentials'] || 0;
  const lifestyleSpent = spendingData?.spentByMain['Lifestyle'] || 0;
  const savingsSpent = spendingData?.spentByMain['Savings'] || 0;

  // Calculate available savings (total balance minus essential and lifestyle spending)
  const availableSavings = totalBalance - essentialsSpent - lifestyleSpent;

  // Budget Categories - Remove the hardcoded calculation since we'll use the BudgetEditor
  const hasBudgetCategories = true; // Always show the budget editor

  // Accounts Overview
  const hasAccounts = accounts.length > 0;

  // Recent Transactions
  const hasTransactions = pagination.total > 0;

  // Category editing functions
  const startEditing = (transaction: Transaction) => {
    setEditingTransaction(transaction.id);
    setEditingCategory(transaction.category || 'Uncategorized');
  };

  const cancelEditing = () => {
    setEditingTransaction(null);
    setEditingCategory('');
  };

  const saveCategory = async (transactionId: string) => {
    if (!editingCategory.trim()) return;
    setUpdatingTransaction(transactionId);
    try {
      await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editingCategory }),
      });
      await refreshTransactions();
      await refreshSpending(); // Also refresh spending data when transaction is updated
      setEditingTransaction(null);
      setEditingCategory('');
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setUpdatingTransaction(null);
    }
  };

  // Goal card colors
  const goalCardColors = [
    { bg: "from-blue-500/20 to-cyan-500/20", bar: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    { bg: "from-emerald-500/20 to-teal-500/20", bar: "from-emerald-500 to-teal-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
    { bg: "from-purple-500/20 to-pink-500/20", bar: "from-purple-500 to-pink-500", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    { bg: "from-orange-500/20 to-red-500/20", bar: "from-orange-500 to-red-500", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    { bg: "from-indigo-500/20 to-blue-500/20", bar: "from-indigo-500 to-blue-500", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
    { bg: "from-pink-500/20 to-rose-500/20", bar: "from-pink-500 to-rose-500", badge: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  ];

  if (!user) {
    return (
      <div className="space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to TrueFi</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Please log in to view your financial dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading || spendingLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {user ? `${user.first_name}'s Dashboard` : 'Financial Dashboard'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {accounts.length > 0 
            ? `Your total balance is ${formatCurrency(totalBalance)} across ${accounts.length} account${accounts.length > 1 ? 's' : ''}`
            : "Connect your bank to get started!"
          }
        </p>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className={`${glassmorphismCard} ${hoveredCard === 'essentials' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('essentials')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Essentials</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">🏠</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(essentialsBudget)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Budgeted for essentials</p>
            {essentialsBudget > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Spent</span>
                  <span>{formatCurrency(essentialsSpent)}</span>
                </div>
                <Progress 
                  value={Math.min((essentialsSpent / essentialsBudget) * 100, 100)} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} ${hoveredCard === 'lifestyle' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('lifestyle')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Lifestyle</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">🎉</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(lifestyleBudget)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Budgeted for lifestyle</p>
            {lifestyleBudget > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Spent</span>
                  <span>{formatCurrency(lifestyleSpent)}</span>
                </div>
                <Progress 
                  value={Math.min((lifestyleSpent / lifestyleBudget) * 100, 100)} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} ${hoveredCard === 'savings' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('savings')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Savings</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">💎</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(savingsBudget)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Budgeted for savings</p>
            {savingsBudget > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Budgeted</span>
                  <span>{formatCurrency(savingsBudget)}</span>
                </div>
                <Progress 
                  value={100} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories - Replace with new BudgetEditor */}
      <BudgetEditor />

      {/* Goals Section */}
      {hasGoals && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(goals as Goal[]).map((goal, idx) => {
            const percent = goal.target_amount
              ? Math.round(100 * ((goal.current_amount || 0) / Number(goal.target_amount)))
              : 0;
            // Pick color/emoji based on index or goal name
            const colorIdx = idx % goalCardColors.length;
            const color = goalCardColors[colorIdx];
            let emoji = "🎯";
            if (goal.name?.toLowerCase().includes("car")) emoji = "🚗";
            else if (goal.name?.toLowerCase().includes("home")) emoji = "🏠";
            else if (goal.name?.toLowerCase().includes("retire")) emoji = "🌅";
            else if (goal.name?.toLowerCase().includes("emerg")) emoji = "💎";
            else if (goal.name?.toLowerCase().includes("vacation")) emoji = "✈️";
            else if (goal.name?.toLowerCase().includes("education")) emoji = "🎓";

            // Placeholder chart data if not available
            const chartData = goal.chart_data || [
              { month: "Jan", current: (goal.current_amount || 0) * 0.2, projected: (goal.target_amount || 0) * 0.2 },
              { month: "Feb", current: (goal.current_amount || 0) * 0.4, projected: (goal.target_amount || 0) * 0.4 },
              { month: "Mar", current: (goal.current_amount || 0) * 0.6, projected: (goal.target_amount || 0) * 0.6 },
              { month: "Apr", current: (goal.current_amount || 0) * 0.8, projected: (goal.target_amount || 0) * 0.8 },
              { month: "May", current: goal.current_amount || 0, projected: goal.target_amount || 0 },
            ];

            return (
              <Card key={goal.id} className={`relative overflow-hidden bg-gradient-to-br ${color.bg}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      {goal.name}
                    </div>
                    <Badge variant="secondary" className={color.badge}>{percent}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(Number(goal.target_amount))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Target amount</p>
                  </div>
                  {/* Progress Bar */}
                  <div className="relative">
                    <Progress value={percent} className="w-full h-3 bg-gray-200 dark:bg-gray-700" />
                    <div className={`absolute inset-0 bg-gradient-to-r ${color.bar} rounded-full h-3 transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
                    <div className="absolute -top-1 left-[calc(var(--percent,0)*1%)] w-2 h-5 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-cyan-500" style={{ left: `calc(${percent}% - 8px)` }}></div>
                  </div>
                  {/* Chart */}
                  <div className="hidden sm:block">
                    <InteractiveGoalChart data={chartData} title={`${goal.name} Progress`} target={goal.target_amount || 0} color={color.bar.split(" ")[0].replace("from-", "#")} />
                  </div>
                  {/* Completion text or AI suggestion */}
                  {percent >= 100 ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <span>✔️ Goal met with successful purchase! 🎉</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{percent}% toward goal{goal.target_date ? `, estimated completion: ${new Date(goal.target_date).toLocaleDateString()}` : ""}</p>
                  )}
                  {/* Milestone Markers */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span>Start</span>
                    <span>Halfway</span>
                    <span>Goal</span>
                  </div>
                  {/* AI Suggestion (if available) */}
                  {goal.ai_suggestion && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 mt-2">
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        💡 {goal.ai_suggestion}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Accounts Overview */}
        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base">Accounts Overview</CardTitle>
            {accounts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/accounts/manage'}>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Accounts
              </Button>
            )}
          </div>
          </CardHeader>
          <CardContent>
          {accounts.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-white text-sm">🏦</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(parseFloat(account.balance?.toString() || '0'))}</p>
                    <p className="text-xs text-gray-500">{account.currency || 'USD'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No accounts connected</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Connect your bank accounts to see your financial overview and get personalized insights.
                </p>
              </div>
              <PlaidConnect />
            </div>
          )}
          </CardContent>
        </Card>

      {/* Enhanced Recent Transactions with Search, Category Editing, and Pagination */}
      {hasTransactions && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-sm sm:text-base">
                Recent Transactions
                <span className="text-xs text-gray-500 ml-2">
                  ({transactions.length} of {pagination.total})
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => search(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Button 
                  onClick={async () => {
                    await refreshTransactions();
                    await refreshSpending();
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <div className="overflow-y-auto" style={{ height: '400px' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[150px]">Category</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map((transaction, index) => {
                        const meta = CATEGORY_META[transaction.category] || CATEGORY_META['Uncategorized'];
                        return (
                          <TableRow 
                            key={transaction.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                          <TableCell className="text-sm">
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{transaction.name || transaction.merchant_name}</div>
                              {transaction.pending && (
                                <div className="text-xs text-orange-600">Pending</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </TableCell>
                          <TableCell>
                            {editingTransaction === transaction.id ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}>
                                  {meta.icon}
                                </div>
                                <Select
                                  value={editingCategory}
                                  onValueChange={setEditingCategory}
                                  disabled={updatingTransaction === transaction.id}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.keys(CATEGORY_META).map((cat) => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => saveCategory(transaction.id)}
                                    disabled={updatingTransaction === transaction.id}
                                  >
                                    {updatingTransaction === transaction.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEditing}
                                    disabled={updatingTransaction === transaction.id}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}>
                                  {meta.icon}
                                </div>
                                <span className="text-sm">{transaction.category || 'Uncategorized'}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingTransaction !== transaction.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(transaction)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Load More Button - appears when there are more transactions to load */}
              {pagination.hasMore && (
                <div className="flex justify-center py-4 border-t bg-gray-50 dark:bg-gray-800">
                  <Button 
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Load 10 More
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Show all transactions loaded message */}
              {!pagination.hasMore && transactions.length > 10 && (
                <div className="text-center py-4 text-sm text-gray-500 border-t bg-gray-50 dark:bg-gray-800">
                  All transactions loaded
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
} 