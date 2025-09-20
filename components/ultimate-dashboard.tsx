"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { ReactNode } from "react"
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
import { FinancialReportPDF } from "@/components/financial-report-pdf"
import { useRouter } from "next/navigation"
import { 
  TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, CreditCard, 
  Building2, ArrowUpRight, ArrowDownRight, Search, Filter, Calendar,
  Bell, Settings, RefreshCw, Plus, Edit2, Trash2, Check, X, Loader2,
  Home, Car, Briefcase, Heart, ShoppingBag, Utensils, Plane, Zap,
  BarChart3, PieChart, Activity, Sparkles, ChevronRight, ChevronDown,
  Eye, EyeOff, Download, Upload, MoreVertical, Info, AlertCircle,
  User, CheckCircle2, Circle, ExternalLink
} from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { useFinancialData } from "@/hooks/use-financial-data"
import { usePaginatedTransactions } from "@/hooks/use-transactions"
import { useBudget } from "@/hooks/use-budget"
import { useDashboardSpending } from "@/hooks/use-dashboard-spending"
import { useNotifications } from "@/hooks/use-notifications"
import { CATEGORY_META } from "@/utils/category-meta"
import { Account, Transaction } from "@/lib/api-client"
import { AboutMeForm } from "@/components/about-me-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import confetti from "canvas-confetti"
import { GuidedOnboardingManager } from "@/components/guided-onboarding/GuidedOnboardingManager"
import { authenticatedFetch } from "@/lib/api-helpers"

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

// Hydration-safe date formatting
const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid Date"
    
    // Use a consistent format that won't cause hydration mismatches
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}/${year}`
  } catch {
    return "Invalid Date"
  }
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
  
  // State management (must come before hooks that use these values)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  
  const { data, loading, error, refresh } = useFinancialData(user?.id || null)
  const { budget, loading: budgetLoading, updateBudget } = useBudget()
  const { data: spendingData, refresh: refreshSpending } = useDashboardSpending(user?.id || null, dateRange)
  const { 
    notifications, 
    unreadCount, 
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead 
  } = useNotifications(user?.id || null)
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

  // Onboarding state
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [isGuidedMode, setIsGuidedMode] = useState(false)
  const [loadingOnboarding, setLoadingOnboarding] = useState(true)
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const [editingBudget, setEditingBudget] = useState(false)
  const [assetsLiabilities, setAssetsLiabilities] = useState<any>(null)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddLiability, setShowAddLiability] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [autoBudgetEnabled, setAutoBudgetEnabled] = useState(false)
  const [loadingAutoBudget, setLoadingAutoBudget] = useState(false)
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0)
  const [showManageAccounts, setShowManageAccounts] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string>('')
  const [updatingTransaction, setUpdatingTransaction] = useState<string | null>(null)

  // Calculate derived data
  const accounts = data?.accounts || []
  const goals = data?.goals || []
  const totalBalance = accounts.reduce((sum: number, acc: Account) => sum + parseFloat(acc.current_balance?.toString() || "0"), 0)
  
  // Debug assets and liabilities state
  console.log('Current assetsLiabilities state:', assetsLiabilities)
  console.log('Total assets from state:', assetsLiabilities?.total_assets)
  console.log('Total liabilities from state:', assetsLiabilities?.total_liabilities)
  
  // Calculate monthly metrics - use API data when available, fallback to local calculation
  const monthlyTransactions = transactions.filter((t: Transaction) => {
    const date = new Date(t.date)
    const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysAgo <= parseInt(dateRange)
  })

  // Use API data if available, otherwise calculate locally
  const monthlySpending = spendingData?.totalSpending || monthlyTransactions
    .filter((t: Transaction) => t.amount < 0)
    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0)
  
  const monthlyIncome = spendingData?.totalIncome || monthlyTransactions
    .filter((t: Transaction) => t.amount > 0)
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

  const savingsRate = spendingData?.savingsRate ?? (monthlyIncome > 0 ? ((monthlyIncome - monthlySpending) / monthlyIncome) * 100 : 0)
  const cashFlow = spendingData?.cashFlow ?? (monthlyIncome - monthlySpending)

  // Fetch assets and liabilities
  useEffect(() => {
    console.log('useEffect triggered, user:', user)
    if (user?.id) {
      console.log('Calling fetchAssetsLiabilities for user:', user.id)
      fetchAssetsLiabilities()
      fetchOnboardingStatus()
    }
  }, [user])

  const fetchOnboardingStatus = async () => {
    if (!user?.id) return
    
    setLoadingOnboarding(true)
    try {
      const response = await authenticatedFetch(`/api/dashboard-onboarding/status?userId=${user.id}`)
      
      if (response.ok) {
        const status = await response.json()
        setOnboardingStatus(status)
        setIsGuidedMode(!status.complete)
        
        // If onboarding just completed, show celebration
        if (status.complete && status.percent === 100 && !localStorage.getItem('onboarding_celebrated')) {
          localStorage.setItem('onboarding_celebrated', 'true')
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
          toast({
            title: "Congratulations! 🎉",
            description: "You've completed your financial profile setup!",
          })
        }
      }
    } catch (error) {
      console.error('Error fetching onboarding status:', error)
    } finally {
      setLoadingOnboarding(false)
    }
  }

  const fetchAssetsLiabilities = async () => {
    if (!user?.id) return
    
    try {
      setLoadingAssets(true)
      
      // Fetch assets and liabilities separately from new API endpoints
      const baseUrl = '/api'
      const [assetsResponse, liabilitiesResponse] = await Promise.all([
        authenticatedFetch(`${baseUrl}/assets/${user.id}`),
        authenticatedFetch(`${baseUrl}/liabilities/${user.id}`)
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

  // Load auto-budget preference from database
  useEffect(() => {
    const loadAutoBudgetPreference = async () => {
      if (!user?.id || user.id === '123e4567-e89b-12d3-a456-426614174000') return
      
      try {
        const response = await authenticatedFetch(`/api/profile/about-me`)
        if (response.ok) {
          const data = await response.json()
          setAutoBudgetEnabled(data.auto_budget_enabled || false)
        }
      } catch (error) {
        console.error('Failed to load auto-budget preference:', error)
      }
    }
    
    loadAutoBudgetPreference()
  }, [user?.id])

  // Monitor budget performance when auto-budget is enabled
  useEffect(() => {
    if (!autoBudgetEnabled || !user?.id || user.id === '123e4567-e89b-12d3-a456-426614174000') {
      return
    }
    
    const checkBudgetPerformance = async () => {
      try {
        const response = await authenticatedFetch(`/api/budgets/${user.id}/analyze`, {
          method: 'POST',
          body: JSON.stringify({ autoAdjust: true })
        })
        
        if (response.ok) {
          const result = await response.json()
          
          if (result.adjusted) {
            // Budget was automatically adjusted
            toast({
              title: "Budget Optimized",
              description: result.message || "Your budget has been automatically adjusted based on recent spending patterns.",
            })
            
            // Refresh budget data
            await fetchOnboardingStatus()
            setBudgetRefreshKey(prev => prev + 1)
          }
        }
      } catch (error) {
        console.error('Failed to check budget performance:', error)
      }
    }
    
    // Check after a delay when first enabled (not immediately)
    const initialTimeout = setTimeout(checkBudgetPerformance, 10000) // 10 seconds
    
    // Then check periodically (every 6 hours instead of daily for better UX)
    const interval = setInterval(checkBudgetPerformance, 6 * 60 * 60 * 1000)
    
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [autoBudgetEnabled, user?.id, fetchOnboardingStatus, toast])

  // Re-analyze budget when transactions change
  useEffect(() => {
    if (!autoBudgetEnabled || !user?.id || user.id === '123e4567-e89b-12d3-a456-426614174000') {
      return
    }
    
    // Trigger budget analysis when transactions update
    const checkBudget = async () => {
      try {
        const response = await authenticatedFetch(`/api/budgets/${user.id}/analyze`)
        if (response.ok) {
          const result = await response.json()
          if (result.analysis?.needsAdjustment) {
            console.log('Budget may need adjustment:', result.analysis.recommendations)
          }
        }
      } catch (error) {
        console.error('Failed to analyze budget:', error)
      }
    }
    
    // Debounce check after transactions load
    const timeout = setTimeout(checkBudget, 5000) // Wait 5 seconds after transactions load
    
    return () => clearTimeout(timeout)
  }, [transactions, autoBudgetEnabled, user?.id])

  // Save auto-budget preference to database
  const toggleAutoBudget = async () => {
    if (!user?.id || user.id === '123e4567-e89b-12d3-a456-426614174000') {
      // Show info for demo user
      toast({
        title: "Demo Mode",
        description: "Auto-budget is not available in demo mode. Please sign up to use this feature.",
        variant: "default"
      })
      return
    }
    
    const newValue = !autoBudgetEnabled
    
    // Optimistically update UI
    setAutoBudgetEnabled(newValue)
    setLoadingAutoBudget(true)
    
    try {
      const response = await authenticatedFetch(`/api/profile/about-me`, {
        method: 'PUT',
        body: JSON.stringify({ auto_budget_enabled: newValue })
      })
      
      if (response.ok) {
        // If enabling, trigger automatic budget generation
        if (newValue) {
          toast({
            title: "Generating Budget",
            description: "Analyzing your spending patterns...",
          })
          await applyAutoBudget()
        } else {
          toast({
            title: "Auto-Budget Disabled",
            description: "You can now manage your budget manually.",
          })
          setLoadingAutoBudget(false)
        }
      } else {
        // Revert on error
        setAutoBudgetEnabled(!newValue)
        toast({
          title: "Error",
          description: "Failed to update auto-budget setting. Please try again.",
          variant: "destructive"
        })
        setLoadingAutoBudget(false)
      }
    } catch (error) {
      console.error('Failed to update auto-budget preference:', error)
      // Revert on error
      setAutoBudgetEnabled(!newValue)
      toast({
        title: "Error",
        description: "Network error. Please check your connection.",
        variant: "destructive"
      })
      setLoadingAutoBudget(false)
    }
  }

  // Apply AI-generated budget automatically
  const applyAutoBudget = async () => {
    if (!user?.id || user.id === '123e4567-e89b-12d3-a456-426614174000') return
    
    setLoadingAutoBudget(true)
    try {
      // Trigger budget regeneration with AI
      const response = await authenticatedFetch(`/api/budgets/${user.id}/auto-apply`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        // Show success notification
        toast({
          title: "Auto-Budget Applied",
          description: result.insights?.length > 0 
            ? result.insights[0] 
            : `Your budget has been optimized using the ${result.framework || '50-30-20'} framework.`,
        })
        
        // Refresh all budget-related data
        await Promise.all([
          fetchOnboardingStatus(),
          // Trigger a refresh in BudgetEditor by passing a key prop
        ])
        
        // Force re-render of BudgetEditor
        setBudgetRefreshKey(prev => prev + 1)
        
      } else {
        // Handle warnings or errors
        const message = result.warnings?.length > 0 
          ? result.warnings[0]
          : result.error || 'Unable to generate auto-budget. Please ensure you have transaction data.'
          
        toast({
          title: "Auto-Budget Issue",
          description: message,
          variant: "destructive"
        })
        
        // If there was an error, revert the toggle
        if (!result.success) {
          setAutoBudgetEnabled(false)
        }
      }
    } catch (error) {
      console.error('Failed to apply auto-budget:', error)
      toast({
        title: "Error",
        description: "Failed to apply auto-budget. Please try again later.",
        variant: "destructive"
      })
      setAutoBudgetEnabled(false)
    } finally {
      setLoadingAutoBudget(false)
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
      .filter((t: Transaction) => t.amount < 0 && ["Food", "Transportation", "Healthcare", "Insurance"].includes(t.category || ""))
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0)

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
      fetchAssetsLiabilities(),
      fetchOnboardingStatus()
    ])
    setRefreshing(false)
  }
  
  // Check and complete onboarding if all tasks done
  const checkAndCompleteOnboarding = async () => {
    if (onboardingStatus?.percent === 100 && !onboardingStatus?.complete) {
      try {
        const response = await fetch('/api/dashboard-onboarding/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.complete) {
            fetchOnboardingStatus()
          }
        }
      } catch (error) {
        console.error('Error completing onboarding:', error)
      }
    }
  }
  
  // Watch for onboarding completion
  useEffect(() => {
    checkAndCompleteOnboarding()
  }, [onboardingStatus?.percent])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    searchTransactions(query)
  }

  // Category spending breakdown
  const categoryBreakdown = monthlyTransactions
    .filter((t: Transaction) => t.amount < 0)
    .reduce((acc: Record<string, number>, t: Transaction) => {
      const category = t.category || "Other"
      acc[category] = (acc[category] || 0) + Math.abs(t.amount)
      return acc
    }, {} as Record<string, number>)

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)

  // Filter transactions
  const filteredTransactions = selectedCategory === "all" 
    ? monthlyTransactions 
    : monthlyTransactions.filter((t: Transaction) => t.category === selectedCategory)

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
      const baseUrl = '/api'
      const response = await fetch(`${baseUrl}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editingCategory })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Update local state
        const updatedTransactions = transactions.map((t: Transaction) => 
          t.id === transactionId 
            ? { ...t, category: editingCategory }
            : t
        )
        
        // Refresh all relevant data
        refreshTransactions()
        
        // If this category change affects income status, refresh spending data
        if (result.incomeStatusChanged) {
          refreshSpending()
        }
        
        fetchOnboardingStatus()
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
            {["overview", "about", "transactions", "assets", "budget", "goals", "investments"].map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
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
                id="onb-connect-accounts-btn"
                onClick={() => {
                  router.push('/accounts/manage')
                  // Note: fetchOnboardingStatus will be called when user returns and accounts are connected
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Connect Bank Accounts
              </Button>
              <FinancialReportPDF
                data={{
                  accounts: accounts,
                  goals: goals,
                  netWorth: assetsLiabilities?.net_worth || 0,
                  monthlyIncome: (budget?.budget_categories || []).filter((c: any) => c.type === 'income').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
                  monthlyExpenses: (budget?.budget_categories || []).filter((c: any) => c.type === 'expense').reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
                }}
                buttonText={
                  <>
                    <Download className="w-4 h-4" />
                    Export Report
                  </>
                }
              />
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
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  +12%
                </span>
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
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  +8%
                </span>
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
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  -5%
                </span>
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
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Good
                </span>
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetsLiabilities?.net_worth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {assetsLiabilities?.net_worth >= 0 ? "+" : "-"}
                </span>
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
          {/* Inline Helper Banners for Guided Mode */}
          {isGuidedMode && !dismissedBanners.has(activeTab) && (
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">
                  {activeTab === 'overview' && "Welcome! Start by connecting your accounts to unlock automated insights."}
                  {activeTab === 'about' && "Complete your profile so Penny can personalize recommendations for your unique situation."}
                  {activeTab === 'transactions' && "Review the last 60-90 days and fix any incorrect categories."}
                  {activeTab === 'assets' && "Add or edit any assets and liabilities that weren't imported automatically."}
                  {activeTab === 'budget' && "We created a baseline budget from your activity — tweak amounts, then save."}
                  {activeTab === 'goals' && "Add your top 1-3 financial goals to get personalized guidance."}
                  {activeTab === 'investments' && "Review imported holdings and learn how to add or exclude accounts."}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissedBanners(prev => new Set([...prev, activeTab]))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Accounts Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Dynamic To-Do Card */}
                  <Card id="onb-checklist-card" className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-xl font-bold">Setup Checklist</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={onboardingStatus?.complete ? "default" : "secondary"} className="px-2 py-1">
                          {onboardingStatus?.percent || 0}% Complete
                        </Badge>
                        {onboardingStatus?.complete && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingOnboarding ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Connect Accounts */}
                          <button
                            onClick={() => router.push('/accounts/manage')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.connectAccounts ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.connectAccounts ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Connect bank accounts
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.connectAccounts ? 'Complete' : 'Link your financial accounts'}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </button>

                          {/* Review Transactions */}
                          <button
                            onClick={() => setActiveTab('transactions')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.reviewTransactions ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.reviewTransactions ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Review transactions
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.reviewTransactions ? 'Complete' : 'Categorize recent spending'}
                              </p>
                            </div>
                          </button>

                          {/* Verify Assets & Liabilities */}
                          <button
                            onClick={() => setActiveTab('assets')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.verifyAssetsLiabilities ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.verifyAssetsLiabilities ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Verify assets & liabilities
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.verifyAssetsLiabilities ? 'Complete' : 'Add missing items'}
                              </p>
                            </div>
                          </button>

                          {/* Set up Budget */}
                          <button
                            onClick={() => setActiveTab('budget')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.budget ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.budget ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Set up budget
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.budget ? 'Complete' : 'Review and adjust'}
                              </p>
                            </div>
                          </button>

                          {/* Add Goals */}
                          <button
                            onClick={() => setActiveTab('goals')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.goals ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.goals ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Add goals
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.goals ? 'Complete' : 'Set your top priorities'}
                              </p>
                            </div>
                          </button>

                          {/* Review Investments */}
                          <button
                            onClick={() => setActiveTab('investments')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.investments ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.investments ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Review investments
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.investments ? 'Complete' : 'Check holdings'}
                              </p>
                            </div>
                          </button>

                          {/* Fill out About Me */}
                          <button
                            onClick={() => setActiveTab('about')}
                            className="w-full flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            {onboardingStatus?.checklist?.aboutMe ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${onboardingStatus?.checklist?.aboutMe ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                Complete profile
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {onboardingStatus?.checklist?.aboutMe ? 'Complete' : 'Tell us about yourself'}
                              </p>
                            </div>
                          </button>

                          {/* Progress bar */}
                          <div className="pt-3 border-t">
                            <Progress value={onboardingStatus?.percent || 0} className="h-2" />
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              {Object.values(onboardingStatus?.checklist || {}).filter(Boolean).length} of 7 tasks complete
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Connected Accounts Card */}
                  <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-xl font-bold">Connected Accounts</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleManageAccounts}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {accounts.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                          {accounts.slice(0, 3).map((account: Account) => (
                            <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{account.type}</p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(account.current_balance || 0)}
                              </p>
                            </div>
                          ))}
                          {accounts.length > 3 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-xs"
                              onClick={handleManageAccounts}
                            >
                              View all {accounts.length} accounts
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            No accounts connected
                          </p>
                          <div id="onb-connect-accounts-btn">
                            <PlaidConnect 
                              onSuccess={() => {
                                refresh()
                                fetchAssetsLiabilities()
                                fetchOnboardingStatus()
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Spending by Category */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Spending Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCategories.map(([category, amount], index) => {
                        const percentage = ((amount as number) / monthlySpending) * 100
                        const meta = CATEGORY_META[category] || { icon: "", color: "gray" }
                        
                        return (
                          <div key={`category-${category}-${index}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{meta.icon}</span>
                                <span className="font-medium">{category}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(amount as number)}</p>
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
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                        {unreadCount || 0}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notifications && notifications.length > 0 ? (
                      <div className="space-y-2">
                        {notifications.slice(0, 5).map((notif: any) => (
                          <div 
                            key={notif.id} 
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={() => markNotificationAsRead(notif.id)}
                          >
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{notif.title}</p>
                                <p className="text-xs text-gray-500">{notif.message}</p>
                              </div>
                              {!notif.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        ))}
                        {notifications.length > 5 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab('notifications')}
                          >
                            View all ({notifications.length})
                          </Button>
                        )}
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
                      {transactions.slice(0, 5).map((transaction: Transaction) => {
                        const meta = CATEGORY_META[transaction.category || "Other"] || { icon: "💵" }
                        return (
                          <div key={transaction.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{meta.icon}</span>
                              <div>
                                <p className="text-sm font-medium line-clamp-1">{transaction.name}</p>
                                <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
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

          {/* About Me Tab */}
          {activeTab === "about" && (
            <div className="w-full">
              <AboutMeForm onComplete={() => {
                fetchOnboardingStatus()
                toast({
                  title: "Profile Complete!",
                  description: "Your profile has been saved successfully.",
                })
              }} />
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
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
                      {filteredTransactions.map((transaction: Transaction) => {
                        const meta = CATEGORY_META[transaction.category || "Other"] || { icon: "💵" }
                        return (
                          <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <TableCell>{formatDate(transaction.date)}</TableCell>
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
                                    data-onb="tx-category-edit"
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetsLiabilities?.net_worth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {assetsLiabilities?.net_worth >= 0 ? "Positive" : "Negative"}
                      </span>
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
                    id="onb-add-asset-btn"
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
                                    const baseUrl = '/api'
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {asset.name}
                                {asset.source === 'plaid' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Connected
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{asset.asset_class || asset.type || "Other"}</TableCell>
                            <TableCell className="font-bold text-green-600">{formatCurrency(asset.value)}</TableCell>
                            <TableCell>
                              {/* Only show edit/delete actions for manual assets, not Plaid-connected ones */}
                              {asset.source === 'manual' ? actionButtons : (
                                <span className="text-sm text-gray-500">Auto-synced</span>
                              )}
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
                    id="onb-add-liability-btn"
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
                                    const baseUrl = '/api'
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {liability.name}
                                {liability.source === 'plaid' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Connected
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{liability.liability_class || liability.type || "Other"}</TableCell>
                            <TableCell className="font-bold text-red-600">{formatCurrency(liability.balance)}</TableCell>
                            <TableCell>{liability.interest_rate ? `${liability.interest_rate}%` : "-"}</TableCell>
                            <TableCell>
                              {/* Only show edit/delete actions for manual liabilities, not Plaid-connected ones */}
                              {liability.source === 'manual' ? actionButtons : (
                                <span className="text-sm text-gray-500">Auto-synced</span>
                              )}
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
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Budget Management
                      <button
                        type="button"
                        className="group relative"
                        aria-label="Learn about auto-budget"
                      >
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-72 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <strong className="text-cyan-600">Auto-Budget</strong> uses AI to:
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                            <li>Analyze your income and spending patterns</li>
                            <li>Generate budgets using frameworks like 50-30-20</li>
                            <li>Automatically adjust as your spending changes</li>
                            <li>Provide insights and recommendations</li>
                          </ul>
                        </div>
                      </button>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {autoBudgetEnabled 
                        ? "✨ Auto-adjusting based on your spending patterns"
                        : "AI-powered budget recommendations based on your spending"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Label htmlFor="auto-budget" className="cursor-pointer">Auto-Budget</Label>
                    <button
                      id="auto-budget"
                      onClick={toggleAutoBudget}
                      disabled={loadingAutoBudget}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                        autoBudgetEnabled ? "bg-cyan-500" : "bg-gray-300"
                      } ${loadingAutoBudget ? "opacity-50 cursor-wait" : "cursor-pointer hover:shadow-md"}`}
                      aria-label={autoBudgetEnabled ? "Disable auto-budget" : "Enable auto-budget"}
                    >
                      {loadingAutoBudget ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                      ) : (
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                          autoBudgetEnabled ? "translate-x-6" : "translate-x-1"
                        }`} />
                      )}
                    </button>
                    {loadingAutoBudget && (
                      <span className="text-xs text-cyan-600 font-medium animate-pulse">
                        {autoBudgetEnabled ? "Generating budget..." : "Disabling..."}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <BudgetEditor key={budgetRefreshKey} onSave={fetchOnboardingStatus} />
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
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    id="onb-add-goal-btn"
                    onClick={() => {
                      setEditingGoal({
                        name: '',
                        target_amount: '',
                        current_amount: 0,
                        target_date: '',
                        priority: 'medium'
                      })
                      setShowGoalModal(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(goals || []).map((goal: any, index: number) => {
                      const progress = goal.target_amount && goal.target_amount > 0 
                        ? ((goal.current_amount || 0) / goal.target_amount) * 100 
                        : 0
                      return (
                        <Card key={`goal-${goal.id || index}`} className="hover:shadow-lg transition-shadow group">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <Target className="h-6 w-6 text-purple-600" />
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors">
                                  {formatPercent(progress)} Complete
                                </span>
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
                                          const token = localStorage.getItem('token')
                                          const response = await fetch(
                                            `/api/goals/${goal.id}`,
                                            {
                                              method: "DELETE",
                                              headers: {
                                                'Authorization': `Bearer ${token}`
                                              }
                                            }
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
                                Target: {formatDate(goal.target_date)}
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
              fetchOnboardingStatus()
              setShowAddAsset(false)
            }}
            onCancel={() => setShowAddAsset(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingAsset !== null} onOpenChange={(open: boolean) => !open && setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <AssetForm 
            asset={editingAsset}
            onSuccess={() => {
              fetchAssetsLiabilities()
              fetchOnboardingStatus()
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
              fetchOnboardingStatus()
              setShowAddLiability(false)
            }}
            onCancel={() => setShowAddLiability(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingLiability !== null} onOpenChange={(open: boolean) => !open && setEditingLiability(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Liability</DialogTitle>
          </DialogHeader>
          <LiabilityForm 
            liability={editingLiability}
            onSuccess={() => {
              fetchAssetsLiabilities()
              fetchOnboardingStatus()
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingGoal({...editingGoal, name: e.target.value})}
                  placeholder="e.g., Emergency Fund"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  value={editingGoal?.target_amount || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingGoal({...editingGoal, target_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingGoal({...editingGoal, current_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date (Optional)</Label>
              <Input
                type="date"
                value={editingGoal?.target_date ? new Date(editingGoal.target_date).toISOString().split('T')[0] : ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingGoal({...editingGoal, target_date: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowGoalModal(false)
                setEditingGoal(null)
              }}>
                Cancel
              </Button>
              <Button onClick={async () => {
                // Handle save logic here
                // Ensure numeric values are properly converted before saving
                const goalToSave = {
                  ...editingGoal,
                  target_amount: editingGoal?.target_amount === '' ? 0 : editingGoal?.target_amount,
                  current_amount: editingGoal?.current_amount === '' ? 0 : editingGoal?.current_amount
                }
                
                // Save goal to database
                try {
                  const response = await fetch('/api/goals', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify({ 
                      goal: goalToSave,
                      replaceAll: false  // Add single goal, don't replace all
                    })
                  })
                  
                  if (response.ok) {
                    const result = await response.json()
                    console.log('Goal saved:', result)
                    
                    // Refresh data and close modal
                    refresh()
                    fetchOnboardingStatus()
                    setShowGoalModal(false)
                    setEditingGoal(null)
                  } else {
                    const errorData = await response.text()
                    console.error('Failed to save goal:', response.status, errorData)
                  }
                } catch (error) {
                  console.error('Error saving goal:', error)
                }
              }}>
                {editingGoal ? "Update" : "Add"} Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Guided Onboarding Manager */}
      <GuidedOnboardingManager
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fetchOnboardingStatus={fetchOnboardingStatus}
      />
    </div>
  )
}