"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AssetsLiabilitiesTables } from "@/components/assets-liabilities-tables"
import { InteractiveGoalChart } from "@/components/interactive-goal-chart"
import { BudgetEditor } from "@/components/budget-editor"
import { PlaidConnect } from "@/components/plaid-connect"
import { 
  TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, 
  CreditCard, Building2, ArrowUpRight, ArrowDownRight, 
  Calendar, Bell, ChevronRight, MoreHorizontal,
  Zap, Shield, Star, Activity
} from "lucide-react"
import { useState, useEffect } from "react"
import { useFinancialData } from "@/hooks/use-financial-data"
import { usePaginatedTransactions } from "@/hooks/use-transactions"
import { useBudget } from "@/hooks/use-budget"
import { useDashboardSpending } from "@/hooks/use-dashboard-spending"
import { useUser } from "@/contexts/user-context"
import { CATEGORY_META } from "@/utils/category-meta"

const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return "$0"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function AppleEnhancedDashboard() {
  const { user } = useUser()
  const { data, loading, error, refresh } = useFinancialData(user?.id || null)
  const { budget, loading: budgetLoading } = useBudget()
  const { data: spendingData } = useDashboardSpending(user?.id || null)
  const {
    transactions,
    loading: transactionsLoading,
    pagination,
    search,
    searchTerm
  } = usePaginatedTransactions(user?.id || null)

  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  const accounts = data?.accounts || []
  const goals = data?.goals || []
  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance?.toString() || "0")), 0)

  // Calculate spending insights
  const monthlySpending = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const monthlyIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpending) / monthlyIncome) * 100 : 0

  // Get top spending categories
  const categorySpending = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => {
      const category = t.category || "Other"
      acc[category] = (acc[category] || 0) + Math.abs(t.amount)
      return acc
    }, {} as Record<string, number>)

  const topCategories = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-[32px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.021em"}}>
              Welcome back, {user?.first_name}
            </h1>
            <p className="text-[15px] text-gray-600 dark:text-gray-400 mt-1" style={{letterSpacing: "-0.016em"}}>
              Here's your financial overview for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <PlaidConnect />
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-0">
                +12.5%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-gray-500 dark:text-gray-400" style={{letterSpacing: "-0.014em"}}>
                Total Balance
              </p>
              <p className="text-[28px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.021em"}}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 border-0">
                +8.3%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-gray-500 dark:text-gray-400" style={{letterSpacing: "-0.014em"}}>
                Monthly Income
              </p>
              <p className="text-[28px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.021em"}}>
                {formatCurrency(monthlyIncome)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <Badge variant="secondary" className="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border-0">
                -5.2%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-gray-500 dark:text-gray-400" style={{letterSpacing: "-0.014em"}}>
                Monthly Spending
              </p>
              <p className="text-[28px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.021em"}}>
                {formatCurrency(monthlySpending)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
                <PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-0">
                Good
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-gray-500 dark:text-gray-400" style={{letterSpacing: "-0.014em"}}>
                Savings Rate
              </p>
              <p className="text-[28px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.021em"}}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Spending Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[17px] font-semibold" style={{letterSpacing: "-0.019em"}}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <Zap className="h-5 w-5 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[13px] font-medium" style={{letterSpacing: "-0.014em"}}>Pay Bills</p>
                </button>
                <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <Shield className="h-5 w-5 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[13px] font-medium" style={{letterSpacing: "-0.014em"}}>Insurance</p>
                </button>
                <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <Star className="h-5 w-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[13px] font-medium" style={{letterSpacing: "-0.014em"}}>Invest</p>
                </button>
                <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <Activity className="h-5 w-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[13px] font-medium" style={{letterSpacing: "-0.014em"}}>Analytics</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Spending by Category */}
          <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[17px] font-semibold" style={{letterSpacing: "-0.019em"}}>
                Top Spending Categories
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCategories.map(([category, amount], index) => {
                  const percentage = (amount / monthlySpending) * 100
                  const meta = CATEGORY_META[category] || { icon: "💵", color: "gray" }
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{meta.icon}</div>
                          <div>
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white" style={{letterSpacing: "-0.016em"}}>
                              {category}
                            </p>
                            <p className="text-[12px] text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}% of spending
                            </p>
                          </div>
                        </div>
                        <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Accounts Summary */}
          <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[17px] font-semibold" style={{letterSpacing: "-0.019em"}}>
                Accounts
              </CardTitle>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accounts.slice(0, 3).map((account) => (
                  <div key={account.account_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white dark:bg-gray-900 rounded-lg">
                        <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white" style={{letterSpacing: "-0.014em"}}>
                          {account.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {account.institution_name}
                        </p>
                      </div>
                    </div>
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                      {formatCompactNumber(parseFloat(account.current_balance || "0"))}
                    </p>
                  </div>
                ))}
                {accounts.length > 3 && (
                  <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700">
                    Show {accounts.length - 3} more
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[17px] font-semibold" style={{letterSpacing: "-0.019em"}}>
                Recent Activity
              </CardTitle>
              <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 border-0">
                {transactions.length} today
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => {
                  const meta = CATEGORY_META[transaction.category || "Other"] || { icon: "💵" }
                  return (
                    <div key={transaction.transaction_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">{meta.icon}</div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900 dark:text-white line-clamp-1" style={{letterSpacing: "-0.014em"}}>
                            {transaction.name}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className={`text-[14px] font-semibold ${
                        transaction.amount < 0 
                          ? "text-red-600 dark:text-red-400" 
                          : "text-green-600 dark:text-green-400"
                      }`}>
                        {transaction.amount < 0 ? "-" : "+"}
                        ${Math.abs(transaction.amount).toFixed(0)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assets and Liabilities Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.019em"}}>
            Net Worth Tracker
          </h2>
        </div>
        <AssetsLiabilitiesTables />
      </div>

      {/* Goals Section */}
      {goals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.019em"}}>
              Financial Goals
            </h2>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
              Add Goal
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const progress = ((goal.current_amount || 0) / goal.target_amount) * 100
              return (
                <Card key={goal.id} className="bg-white dark:bg-gray-900 border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-0">
                        {progress.toFixed(0)}%
                      </Badge>
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-2" style={{letterSpacing: "-0.016em"}}>
                      {goal.name}
                    </h3>
                    <Progress value={progress} className="h-2 mb-3" />
                    <div className="flex justify-between text-[12px] text-gray-500 dark:text-gray-400">
                      <span>{formatCurrency(goal.current_amount || 0)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Budget Editor Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: "-0.019em"}}>
            Budget Management
          </h2>
        </div>
        <BudgetEditor />
      </div>
    </div>
  )
}