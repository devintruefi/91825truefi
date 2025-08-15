"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PlaidConnect } from "@/components/plaid-connect"
import { BudgetEditor } from "@/components/budget-editor"
import { AssetForm } from "@/components/asset-form"
import { LiabilityForm } from "@/components/liability-form"
import { InteractiveGoalChart } from "@/components/interactive-goal-chart"
import { InvestmentsDashboard } from "@/components/investments-dashboard"
import { useRouter } from "next/navigation"
import { 
  TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, CreditCard, 
  Building2, ArrowUpRight, ArrowDownRight, Search, Filter, Calendar,
  Bell, Settings, RefreshCw, Plus, Edit2, Trash2, Check, X, Loader2,
  Home, Car, Briefcase, Heart, ShoppingBag, Utensils, Plane, Zap,
  BarChart3, PieChart, Activity, Sparkles, ChevronRight, ChevronDown,
  Eye, EyeOff, Download, Upload, MoreVertical, Info, AlertCircle
} from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { useFinancialData } from "@/hooks/use-financial-data"
import { usePaginatedTransactions } from "@/hooks/use-transactions"
import { useBudget } from "@/hooks/use-budget"
import { useDashboardSpending } from "@/hooks/use-dashboard-spending"
import { CATEGORY_META } from "@/utils/category-meta"

// Utility functions
const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return "$0"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatCompact = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const formatPercent = (num: number): string => {
  return `${num.toFixed(1)}%`
}

// Asset and Liability types
interface Asset {
  id: string
  name: string
  type?: string
  asset_class?: string
  value: number
  institution?: string
  source: "plaid" | "manual"
  description?: string
}

interface Liability {
  id: string
  name: string
  type?: string
  liability_class?: string
  balance: number
  interest_rate?: number
  minimum_payment?: number
  institution?: string
  source: "plaid" | "manual"
  description?: string
}

export function UltimateDashboard() {
  const { user } = useUser()
  const router = useRouter()
  const { data, loading, error, refresh } = useFinancialData(user?.id || null)
  const { budget, loading: budgetLoading, updateBudget } = useBudget()
  const { data: spendingData } = useDashboardSpending(user?.id || null)
  const {
    transactions,
    loading: transactionsLoading,
    loadingMore,
    pagination,
    loadMore,
    search: searchTransactions,
    searchTerm,
    refresh: refreshTransactions
  } = usePaginatedTransactions(user?.id || null)

  // State management
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dateRange, setDateRange] = useState("30")

  const [editingBudget, setEditingBudget] = useState(false)
  const [assetsLiabilities, setAssetsLiabilities] = useState<any>(null)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddLiability, setShowAddLiability] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [autoBudgetEnabled, setAutoBudgetEnabled] = useState(true)
  const [showManageAccounts, setShowManageAccounts] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string>('')
  const [updatingTransaction, setUpdatingTransaction] = useState<string | null>(null)

  // Calculate derived data
  const accounts = data?.accounts || []
  const goals = data?.goals || []
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance?.toString() || "0"), 0)
  
  // Debug assets and liabilities state
  console.log('Current assetsLiabilities state:', assetsLiabilities)
  console.log('Total assets from state:', assetsLiabilities?.total_assets)
  console.log('Total liabilities from state:', assetsLiabilities?.total_liabilities)
  
  // Calculate monthly metrics
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date)
    const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysAgo <= parseInt(dateRange)
  })

  const monthlySpending = monthlyTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const monthlyIncome = monthlyTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpending) / monthlyIncome) * 100 : 0
  const cashFlow = monthlyIncome - monthlySpending

  // Fetch assets and liabilities
  useEffect(() => {
    console.log('useEffect triggered, user:', user)
    if (user?.id) {
      console.log('Calling fetchAssetsLiabilities for user:', user.id)
      fetchAssetsLiabilities()
    }
  }, [user])

  const fetchAssetsLiabilities = async () => {
    if (!user?.id) return
    
    try {
      setLoadingAssets(true)
      
      // Fetch assets and liabilities separately from new API endpoints
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const [assetsResponse, liabilitiesResponse] = await Promise.all([
        fetch(`${baseUrl}/assets/${user.id}`),
        fetch(`${baseUrl}/liabilities/${user.id}`)
      ])
      
      let assets = []
      let liabilities = []
      
      if (assetsResponse.ok) {
        assets = await assetsResponse.json()
        console.log('Assets API response:', assets)
      }
      
      if (liabilitiesResponse.ok) {
        liabilities = await liabilitiesResponse.json()
        console.log('Liabilities API response:', liabilities)
      }
      
      // Calculate net worth
      const totalAssets = assets.reduce((sum: number, asset: any) => {
        // Handle both Decimal objects and regular numbers
        let value = 0
        if (asset.value) {
          if (typeof asset.value === 'object' && asset.value.toNumber) {
            // Prisma Decimal object
            value = asset.value.toNumber()
          } else {
            // Regular number or string
            value = parseFloat(asset.value.toString()) || 0
          }
        }
        console.log(`Asset: ${asset.name}, Value: ${asset.value}, Parsed: ${value}`)
        return sum + value
      }, 0)
      
      const totalLiabilities = liabilities.reduce((sum: number, liability: any) => {
        // Handle both Decimal objects and regular numbers
        let balance = 0
        if (liability.balance) {
                  if (typeof liability.balance === 'object' && liability.balance.toNumber) {
          // Prisma Decimal object
          balance = liability.balance.toNumber()
        } else {
          // Regular number or string
          balance = parseFloat(liability.balance.toString()) || 0
        }
        }
        console.log(`Liability: ${liability.name}, Balance: ${liability.balance}, Parsed: ${balance}`)
        return sum + balance
      }, 0)
      
      const netWorth = totalAssets - totalLiabilities
      
      console.log('Calculated totals:', { totalAssets, totalLiabilities, netWorth })
      
      setAssetsLiabilities({
        assets,
        liabilities,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities
      })
    } catch (error) {
      console.error("Error fetching assets/liabilities:", error)
    } finally {
      setLoadingAssets(false)
    }
  }

  // Auto-calculate budget based on income and spending patterns
  const calculateSmartBudget = useCallback(() => {
    if (!monthlyIncome) return

    const recommendedBudget = {
      essentials: monthlyIncome * 0.50, // 50% for needs
      lifestyle: monthlyIncome * 0.30,   // 30% for wants
      savings: monthlyIncome * 0.20,     // 20% for savings (50/30/20 rule)
    }

    // Adjust based on actual spending patterns
    const essentialsSpending = monthlyTransactions
      .filter(t => t.amount < 0 && ["Food", "Transportation", "Healthcare", "Insurance"].includes(t.category || ""))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    if (essentialsSpending > recommendedBudget.essentials) {
      // If spending more on essentials, adjust the budget
      recommendedBudget.essentials = essentialsSpending * 1.1 // Add 10% buffer
      recommendedBudget.lifestyle = (monthlyIncome - recommendedBudget.essentials) * 0.6
      recommendedBudget.savings = (monthlyIncome - recommendedBudget.essentials) * 0.4
    }

    return recommendedBudget
  }, [monthlyIncome, monthlyTransactions])

  // Handle refresh all data
  const handleRefreshAll = async () => {
    setRefreshing(true)
    await Promise.all([
      refresh(),
      refreshTransactions(),
      fetchAssetsLiabilities()
    ])
    setRefreshing(false)
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    searchTransactions(query)
  }

  // Category spending breakdown
  const categoryBreakdown = monthlyTransactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => {
      const category = t.category || "Other"
      acc[category] = (acc[category] || 0) + Math.abs(t.amount)
      return acc
    }, {} as Record<string, number>)

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  // Filter transactions
  const filteredTransactions = selectedCategory === "all" 
    ? monthlyTransactions 
    : monthlyTransactions.filter(t => t.category === selectedCategory)

  // Add this function to handle navigation
  const handleManageAccounts = () => {
    router.push('/accounts/manage')
  }

  // Handle transaction category editing
  const startEditingCategory = (transactionId: string, currentCategory: string) => {
    setEditingTransaction(transactionId)
    setEditingCategory(currentCategory || 'Uncategorized')
  }

  const cancelEditingCategory = () => {
    setEditingTransaction(null)
    setEditingCategory('')
  }

  const saveTransactionCategory = async (transactionId: string) => {
    if (!editingCategory.trim()) return
    
    setUpdatingTransaction(transactionId)
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${baseUrl}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editingCategory })
      })
      
      if (response.ok) {
        // Update local state
        const updatedTransactions = transactions.map(t => 
          t.id === transactionId 
            ? { ...t, category: editingCategory }
            : t
        )
        
        // Update the transactions in the hook
        // Note: This is a simplified approach - in a real app you'd want to update the hook properly
        // For now, we'll refresh the data
        refreshTransactions()
      } else {
        console.error('Failed to update transaction category')
      }
    } catch (error) {
      console.error('Error updating transaction category:', error)
    } finally {
      setUpdatingTransaction(null)
      setEditingTransaction(null)
      setEditingCategory('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Content starts immediately below the fixed header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-10 pb-8">
        {/* Add the navigation tabs here since we removed the header */}
        <div className="mb-4">
          <nav className="flex space-x-2 sm:space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {["overview", "transactions", "assets", "budget", "goals", "investments"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.first_name}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your net worth is {formatCurrency(assetsLiabilities?.net_worth || 0)} • 
                Cash flow: <span className={cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(cashFlow)}
                </span> this month
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/accounts/manage')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Connect Bank Accounts
              </Button>
              <div className="hidden lg:flex items-center space-x-4">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="7" value="7">Last 7 days</SelectItem>
                    <SelectItem key="30" value="30">Last 30 days</SelectItem>
                    <SelectItem key="90" value="90">Last 90 days</SelectItem>
                    <SelectItem key="365" value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  +12%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Balance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  +8%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(monthlyIncome)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly Income</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  -5%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(monthlySpending)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly Spending</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <PiggyBank className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Good
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPercent(savingsRate)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Savings Rate</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <Badge className={assetsLiabilities?.net_worth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                  {assetsLiabilities?.net_worth >= 0 ? "+" : "-"}
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(assetsLiabilities?.net_worth || 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Net Worth</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Accounts Section */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold">Connected Accounts</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleManageAccounts}
                      >
                        Manage Accounts
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accounts.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 accounts-scrollbar">
                        {accounts.length > 4 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pb-2 border-b border-gray-200 dark:border-gray-700">
                            Scroll to see all {accounts.length} accounts
                          </div>
                        )}
                        {accounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 bg-white dark:bg-gray-900 rounded-full">
                                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{account.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(account.current_balance || 0)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Available: {formatCurrency(account.available_balance || 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Connect your bank accounts to get started
                        </p>
                        <PlaidConnect 
                          onSuccess={() => {
                            refresh()
                            fetchAssetsLiabilities()
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Spending by Category */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Spending Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCategories.map(([category, amount], index) => {
                        const percentage = (amount / monthlySpending) * 100
                        const meta = CATEGORY_META[category] || { icon: "", color: "gray" }
                        
                        return (
                          <div key={`category-${category}-${index}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{meta.icon}</span>
                                <span className="font-medium">{category}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(amount)}</p>
                                <p className="text-xs text-gray-500">{formatPercent(percentage)}</p>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Sidebar */}
              <div className="space-y-6">
                {/* Notifications */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span>Notifications</span>
                      </CardTitle>
                      <Badge variant="secondary">{notifications.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notifications.length > 0 ? (
                      <div className="space-y-2">
                        {notifications.slice(0, 5).map((notif, index) => (
                          <div key={`notif-${notif.id || index}`} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{notif.title}</p>
                                <p className="text-xs text-gray-500">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No new notifications</p>
                    )}
                  </CardContent>
                </Card>

                {/* Smart Budget Recommendations */}
                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold">Smart Budget</CardTitle>
                      <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {autoBudgetEnabled && calculateSmartBudget() ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Essentials</span>
                            <span className="font-bold">{formatCurrency(calculateSmartBudget()?.essentials || 0)}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Lifestyle</span>
                            <span className="font-bold">{formatCurrency(calculateSmartBudget()?.lifestyle || 0)}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Savings</span>
                            <span className="font-bold">{formatCurrency(calculateSmartBudget()?.savings || 0)}</span>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                          onClick={() => setEditingBudget(true)}
                        >
                          Apply Smart Budget
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Connect your accounts to get personalized budget recommendations
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction) => {
                        const meta = CATEGORY_META[transaction.category || "Other"] || { icon: "💵" }
                        return (
                          <div key={transaction.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{meta.icon}</span>
                              <div>
                                <p className="text-sm font-medium line-clamp-1">{transaction.name}</p>
                                <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className={`font-bold ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                              {formatCurrency(Math.abs(transaction.amount))}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <CardTitle className="text-xl font-bold">All Transactions</CardTitle>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="all" value="all">All Categories</SelectItem>
                        {Object.keys(categoryBreakdown).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => {
                        const meta = CATEGORY_META[transaction.category || "Other"] || { icon: "💵" }
                        return (
                          <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span>{meta.icon}</span>
                                <span className="font-medium">{transaction.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingTransaction === transaction.id ? (
                                <div className="flex items-center space-x-2">
                                  <Select value={editingCategory} onValueChange={setEditingCategory}>
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-50" position="popper" side="top" align="start">
                                      {Object.keys(CATEGORY_META).map(category => (
                                        <SelectItem key={category} value={category}>
                                          {category}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={() => saveTransactionCategory(transaction.id)}
                                    disabled={updatingTransaction === transaction.id}
                                    className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                  >
                                    {updatingTransaction === transaction.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEditingCategory}
                                    className="h-7 px-2"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 group">
                                  <span>{transaction.category || "Other"}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditingCategory(transaction.id, transaction.category || "Other")}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{transaction.account_name || "Unknown"}</TableCell>
                            <TableCell className={`text-right font-bold ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                              {transaction.amount < 0 ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {pagination.hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Transactions"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assets & Liabilities Tab */}
          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Net Worth Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Home className="h-8 w-8 text-green-600" />
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(assetsLiabilities?.total_assets || 0)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Assets</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="h-8 w-8 text-red-600" />
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(assetsLiabilities?.total_liabilities || 0)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Liabilities</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="h-8 w-8 text-blue-600" />
                      <Badge className={assetsLiabilities?.net_worth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {assetsLiabilities?.net_worth >= 0 ? "Positive" : "Negative"}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(assetsLiabilities?.net_worth || 0)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Net Worth</p>
                  </CardContent>
                </Card>
              </div>

              {/* Assets Table */}
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Assets</CardTitle>
                  <Button 
                    onClick={() => setShowAddAsset(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(assetsLiabilities?.assets || []).map((asset: Asset, index: number) => {
                        const uniqueKey = asset.id ? `asset-${asset.id}` : `asset-index-${index}`
                        
                        // Create the action buttons with proper keys
                        const actionButtons = (
                          <div key={`asset-actions-${asset.id || index}`} className="inline-flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingAsset(asset)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete this asset?`)) {
                                  try {
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
                                    const response = await fetch(
                                      `${baseUrl}/assets/${user?.id}/${asset.id}`,
                                      { method: "DELETE" }
                                    )
                                    if (response.ok) {
                                      fetchAssetsLiabilities()
                                    }
                                  } catch (error) {
                                    console.error(`Error deleting asset:`, error)
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )

                        return (
                          <TableRow key={uniqueKey}>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{asset.asset_class || asset.type || "Other"}</TableCell>
                            <TableCell className="font-bold text-green-600">{formatCurrency(asset.value)}</TableCell>
                            <TableCell>
                              {actionButtons}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Liabilities Table */}
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Liabilities</CardTitle>
                  <Button 
                    onClick={() => setShowAddLiability(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Liability
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(assetsLiabilities?.liabilities || []).map((liability: Liability, index: number) => {
                        const uniqueKey = liability.id ? `liability-${liability.id}` : `liability-index-${index}`
                        
                        // Create the action buttons with proper keys
                        const actionButtons = (
                          <div key={`liability-actions-${liability.id || index}`} className="inline-flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingLiability(liability)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete this liability?`)) {
                                  try {
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
                                    const response = await fetch(
                                      `${baseUrl}/liabilities/${user?.id}/${liability.id}`,
                                      { method: "DELETE" }
                                    )
                                    if (response.ok) {
                                      fetchAssetsLiabilities()
                                    }
                                  } catch (error) {
                                    console.error(`Error deleting liability:`, error)
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )

                        return (
                          <TableRow key={uniqueKey}>
                            <TableCell className="font-medium">{liability.name}</TableCell>
                            <TableCell>{liability.liability_class || liability.type || "Other"}</TableCell>
                            <TableCell className="font-bold text-red-600">{formatCurrency(liability.balance)}</TableCell>
                            <TableCell>{liability.interest_rate ? `${liability.interest_rate}%` : "-"}</TableCell>
                            <TableCell>
                              {actionButtons}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === "budget" && (
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Budget Management</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      AI-powered budget recommendations based on your spending
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="auto-budget">Auto-Budget</Label>
                    <button
                      id="auto-budget"
                      onClick={() => setAutoBudgetEnabled(!autoBudgetEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoBudgetEnabled ? "bg-cyan-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoBudgetEnabled ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BudgetEditor />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Financial Goals</CardTitle>
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => {
                      setEditingGoal(null)
                      setShowGoalModal(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(goals || []).map((goal, index) => {
                      const progress = ((goal.current_amount || 0) / goal.target_amount) * 100
                      return (
                        <Card key={`goal-${goal.id || index}`} className="hover:shadow-lg transition-shadow group">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <Target className="h-6 w-6 text-purple-600" />
                              <div className="flex items-center space-x-2">
                                <Badge>{formatPercent(progress)} Complete</Badge>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingGoal(goal)
                                      setShowGoalModal(true)
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      if (confirm("Are you sure you want to delete this goal?")) {
                                        try {
                                          const response = await fetch(
                                            `${process.env.NEXT_PUBLIC_API_URL}/api/goals/${user?.id}/${goal.id}`,
                                            { method: "DELETE" }
                                          )
                                          if (response.ok) {
                                            refresh()
                                          }
                                        } catch (error) {
                                          console.error("Error deleting goal:", error)
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{goal.name}</h3>
                            <Progress value={progress} className="h-3 mb-3" />
                            <div className="flex justify-between text-sm">
                              <span>{formatCurrency(goal.current_amount || 0)}</span>
                              <span className="font-bold">{formatCurrency(goal.target_amount)}</span>
                            </div>
                            {goal.target_date && (
                              <p className="text-xs text-gray-500 mt-2">
                                Target: {new Date(goal.target_date).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Investments Tab */}
          {activeTab === "investments" && (
            <div className="space-y-6">
              <InvestmentsDashboard userId={user?.id || null} />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {/* You can also remove the ManageAccountsModal import and usage since it's no longer needed */}
      {/* Remove this block from the JSX: */}
      {/* <ManageAccountsModal
        open={showManageAccounts}
        onOpenChange={setShowManageAccounts}
        accounts={accounts}
        onRefresh={() => {
          refresh()
          fetchAssetsLiabilities()
        }}
      /> */}

      <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <AssetForm 
            onSuccess={() => {
              fetchAssetsLiabilities()
              setShowAddAsset(false)
            }}
            onCancel={() => setShowAddAsset(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingAsset !== null} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <AssetForm 
            asset={editingAsset}
            onSuccess={() => {
              fetchAssetsLiabilities()
              setEditingAsset(null)
            }}
            onCancel={() => setEditingAsset(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddLiability} onOpenChange={setShowAddLiability}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Liability</DialogTitle>
          </DialogHeader>
          <LiabilityForm 
            onSuccess={() => {
              fetchAssetsLiabilities()
              setShowAddLiability(false)
            }}
            onCancel={() => setShowAddLiability(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingLiability !== null} onOpenChange={(open) => !open && setEditingLiability(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Liability</DialogTitle>
          </DialogHeader>
          <LiabilityForm 
            liability={editingLiability}
            onSuccess={() => {
              fetchAssetsLiabilities()
              setEditingLiability(null)
            }}
            onCancel={() => setEditingLiability(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Add New Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={editingGoal?.name || ""}
                  onChange={(e) => setEditingGoal({...editingGoal, name: e.target.value})}
                  placeholder="e.g., Emergency Fund"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  value={editingGoal?.target_amount || ""}
                  onChange={(e) => setEditingGoal({...editingGoal, target_amount: parseFloat(e.target.value)})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current Amount</Label>
              <Input
                type="number"
                value={editingGoal?.current_amount || ""}
                onChange={(e) => setEditingGoal({...editingGoal, current_amount: parseFloat(e.target.value)})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date (Optional)</Label>
              <Input
                type="date"
                value={editingGoal?.target_date ? new Date(editingGoal.target_date).toISOString().split('T')[0] : ""}
                onChange={(e) => setEditingGoal({...editingGoal, target_date: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowGoalModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Handle save logic here
                refresh()
                setShowGoalModal(false)
              }}>
                {editingGoal ? "Update" : "Add"} Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}