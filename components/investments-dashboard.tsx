"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  ArrowUpRight, ArrowDownRight, ChevronRight, Eye, EyeOff,
  Briefcase, Award, Info, Plus, RefreshCw,
  Edit2, Trash2, Download, Upload, Settings, Filter,
  Calculator, BarChart3, Calendar, Search, X, Check,
  AlertCircle, Star, StarOff, Grid3x3, List, Layers,
  Target, Zap, Database, FileSpreadsheet, MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PlaidConnect } from "@/components/plaid-connect"
import { InvestmentCard } from './investment-card'
import { InvestmentForm } from './investment-form'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line
} from 'recharts'

interface Investment {
  id: string
  name: string
  symbol?: string
  type: "stock" | "bond" | "etf" | "mutual_fund" | "crypto" | "commodity" | "real_estate" | "cash" | "other"
  quantity: number
  purchase_price: number
  current_price: number
  purchase_date: string
  account_id?: string
  notes?: string
  tags?: string[]
  dividends?: number
  expense_ratio?: number
  target_allocation?: number
  risk_level?: "low" | "medium" | "high" | "very_high"
  is_favorite?: boolean
}

interface InvestmentAccount {
  id: string
  name: string
  type: string
  subtype?: string
  institution_name?: string
  balance: number
  holdings: Investment[]
  performance: {
    day: number
    week: number
    month: number
    year: number
    all_time: number
  }
  tax_status?: "taxable" | "tax_deferred" | "tax_free"
}

interface DashboardConfig {
  layout: "grid" | "list" | "kanban"
  showPerformance: boolean
  showAllocation: boolean
  showDividends: boolean
  showNews: boolean
  showTargets: boolean
  groupBy: "account" | "type" | "risk" | "none"
  sortBy: "value" | "performance" | "alpha" | "purchase_date"
  timeframe: "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL"
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

const formatCompact = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
  return formatCurrency(num)
}

// Memoized metrics calculation hook
const usePortfolioMetrics = (investments: Investment[], accounts: InvestmentAccount[]) => {
  return useMemo(() => {
    if (!investments.length) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        totalDividends: 0,
        allocation: {},
        riskDistribution: { low: 0, medium: 0, high: 0, very_high: 0 },
        investmentCount: 0,
        accountCount: accounts.length
      }
    }

    const totalValue = investments.reduce((sum, inv) => 
      sum + (inv.quantity * inv.current_price), 0
    )
    
    const totalCost = investments.reduce((sum, inv) => 
      sum + (inv.quantity * inv.purchase_price), 0
    )
    
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0
    
    const totalDividends = investments.reduce((sum, inv) => 
      sum + (inv.dividends || 0), 0
    )

    // Calculate allocation by type
    const allocation: Record<string, number> = {}
    investments.forEach(inv => {
      const value = inv.quantity * inv.current_price
      allocation[inv.type] = (allocation[inv.type] || 0) + value
    })

    // Calculate risk distribution
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      very_high: 0
    }
    investments.forEach(inv => {
      const value = inv.quantity * inv.current_price
      riskDistribution[inv.risk_level || 'medium'] += value
    })

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      totalDividends,
      allocation,
      riskDistribution,
      investmentCount: investments.length,
      accountCount: accounts.length
    }
  }, [investments, accounts])
}

// Memoized filtered investments hook
const useFilteredInvestments = (
  investments: Investment[], 
  searchQuery: string, 
  selectedAccount: string, 
  selectedType: string,
  selectedRisk: string,
  sortBy: string
) => {
  return useMemo(() => {
    let filtered = [...investments]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(inv => 
        inv.name.toLowerCase().includes(query) ||
        inv.symbol?.toLowerCase().includes(query) ||
        inv.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    if (selectedAccount !== "all") {
      filtered = filtered.filter(inv => inv.account_id === selectedAccount)
    }
    
    if (selectedType !== "all") {
      filtered = filtered.filter(inv => inv.type === selectedType)
    }
    
    if (selectedRisk !== "all") {
      filtered = filtered.filter(inv => (inv.risk_level || "medium") === selectedRisk)
    }
    
    // Sort investments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "value":
          return (b.quantity * b.current_price) - (a.quantity * a.current_price)
        case "performance":
          const perfA = ((a.current_price - a.purchase_price) / a.purchase_price) * 100
          const perfB = ((b.current_price - b.purchase_price) / b.purchase_price) * 100
          return perfB - perfA
        case "alpha":
          return a.name.localeCompare(b.name)
        case "purchase_date":
          return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
        default:
          return 0
      }
    })
    
    return filtered
  }, [investments, searchQuery, selectedAccount, selectedType, selectedRisk, sortBy])
}

// Dummy data for non-logged-in users
const dummyInvestments: Investment[] = [
  {
    id: "1",
    name: "Apple Inc.",
    symbol: "AAPL",
    type: "stock",
    quantity: 50,
    purchase_price: 145.32,
    current_price: 178.65,
    purchase_date: "2023-01-15",
    risk_level: "medium",
    dividends: 150,
    is_favorite: true,
    tags: ["tech", "large-cap"]
  },
  {
    id: "2",
    name: "Vanguard S&P 500 ETF",
    symbol: "VOO",
    type: "etf",
    quantity: 25,
    purchase_price: 380.50,
    current_price: 425.30,
    purchase_date: "2022-09-20",
    risk_level: "low",
    dividends: 320,
    expense_ratio: 0.03,
    is_favorite: true,
    tags: ["index", "diversified"]
  },
  {
    id: "3",
    name: "Microsoft Corporation",
    symbol: "MSFT",
    type: "stock",
    quantity: 30,
    purchase_price: 250.00,
    current_price: 378.50,
    purchase_date: "2023-03-10",
    risk_level: "medium",
    dividends: 90,
    tags: ["tech", "growth"]
  },
  {
    id: "4",
    name: "Tesla Inc.",
    symbol: "TSLA",
    type: "stock",
    quantity: 15,
    purchase_price: 180.25,
    current_price: 248.30,
    purchase_date: "2023-05-22",
    risk_level: "high",
    tags: ["ev", "growth", "volatile"]
  },
  {
    id: "5",
    name: "Bitcoin",
    symbol: "BTC",
    type: "crypto",
    quantity: 0.5,
    purchase_price: 25000,
    current_price: 42000,
    purchase_date: "2023-02-01",
    risk_level: "very_high",
    tags: ["crypto", "alternative"]
  },
  {
    id: "6",
    name: "iShares Core US Aggregate Bond",
    symbol: "AGG",
    type: "bond",
    quantity: 100,
    purchase_price: 98.50,
    current_price: 97.25,
    purchase_date: "2022-12-01",
    risk_level: "low",
    dividends: 280,
    tags: ["fixed-income", "stable"]
  },
  {
    id: "7",
    name: "Amazon.com Inc.",
    symbol: "AMZN",
    type: "stock",
    quantity: 20,
    purchase_price: 95.40,
    current_price: 152.30,
    purchase_date: "2023-04-15",
    risk_level: "medium",
    tags: ["tech", "e-commerce"]
  },
  {
    id: "8",
    name: "NVIDIA Corporation",
    symbol: "NVDA",
    type: "stock",
    quantity: 10,
    purchase_price: 280.00,
    current_price: 485.20,
    purchase_date: "2023-06-01",
    risk_level: "high",
    dividends: 10,
    is_favorite: true,
    tags: ["tech", "ai", "semiconductors"]
  },
  {
    id: "9",
    name: "JPMorgan Chase & Co.",
    symbol: "JPM",
    type: "stock",
    quantity: 35,
    purchase_price: 135.80,
    current_price: 158.45,
    purchase_date: "2023-02-28",
    risk_level: "medium",
    dividends: 140,
    tags: ["financial", "dividend"]
  },
  {
    id: "10",
    name: "Gold ETF",
    symbol: "GLD",
    type: "commodity",
    quantity: 40,
    purchase_price: 175.00,
    current_price: 185.50,
    purchase_date: "2023-01-20",
    risk_level: "medium",
    tags: ["commodity", "hedge"]
  },
  {
    id: "11",
    name: "Ethereum",
    symbol: "ETH",
    type: "crypto",
    quantity: 2,
    purchase_price: 1500,
    current_price: 2250,
    purchase_date: "2023-03-15",
    risk_level: "very_high",
    tags: ["crypto", "smart-contracts"]
  },
  {
    id: "12",
    name: "Real Estate Investment Trust",
    symbol: "VNQ",
    type: "real_estate",
    quantity: 50,
    purchase_price: 82.30,
    current_price: 88.75,
    purchase_date: "2022-11-10",
    risk_level: "medium",
    dividends: 180,
    tags: ["reit", "income"]
  }
]

const dummyAccounts: InvestmentAccount[] = [
  {
    id: "acc1",
    name: "Individual Brokerage",
    type: "taxable",
    institution_name: "Vanguard",
    balance: 85420.50,
    holdings: dummyInvestments.slice(0, 6),
    performance: {
      day: 1.2,
      week: 2.8,
      month: 5.4,
      year: 18.5,
      all_time: 32.4
    },
    tax_status: "taxable"
  },
  {
    id: "acc2",
    name: "Roth IRA",
    type: "retirement",
    institution_name: "Fidelity",
    balance: 42350.25,
    holdings: dummyInvestments.slice(6, 10),
    performance: {
      day: 0.8,
      week: 1.5,
      month: 3.2,
      year: 12.8,
      all_time: 28.6
    },
    tax_status: "tax_free"
  },
  {
    id: "acc3",
    name: "401(k)",
    type: "retirement",
    institution_name: "Charles Schwab",
    balance: 125680.75,
    holdings: dummyInvestments.slice(10),
    performance: {
      day: 0.5,
      week: 1.1,
      month: 2.8,
      year: 9.5,
      all_time: 45.2
    },
    tax_status: "tax_deferred"
  }
]

export function InvestmentsDashboard({ userId }: { userId: string | null }) {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [activeView, setActiveView] = useState<"dashboard" | "holdings" | "performance" | "analysis">("dashboard")
  const [config, setConfig] = useState<DashboardConfig>({
    layout: "grid",
    showPerformance: true,
    showAllocation: true,
    showDividends: true,
    showNews: false,
    showTargets: true,
    groupBy: "account",
    sortBy: "value",
    timeframe: "1M"
  })
  
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedRisk, setSelectedRisk] = useState<string>("all")
  
  // Chart and analysis state
  const [selectedHolding, setSelectedHolding] = useState<Investment | null>(null)
  const [timeRange, setTimeRange] = useState('1M')
  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Memoized metrics and filtered investments
  const metrics = usePortfolioMetrics(investments, accounts)
  const filteredInvestments = useFilteredInvestments(
    investments, 
    searchQuery, 
    selectedAccount, 
    selectedType,
    selectedRisk,
    config.sortBy
  )

  // Debounced search to improve performance
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (userId) {
      fetchInvestmentData()
    } else {
      // Load dummy data for non-logged-in users
      setAccounts(dummyAccounts)
      setInvestments(dummyInvestments)
      setLoading(false)
    }
  }, [userId])

  // Set default selected holding for charts (largest by value)
  useEffect(() => {
    if (investments.length > 0 && !selectedHolding) {
      const sortedByValue = [...investments]
        .filter(inv => inv.symbol) // Only holdings with symbols can have charts
        .sort((a, b) => (b.quantity * b.current_price) - (a.quantity * a.current_price))
      
      if (sortedByValue.length > 0) {
        setSelectedHolding(sortedByValue[0])
      }
    }
  }, [investments, selectedHolding])

  // Fetch chart data for performance tab
  const fetchChartData = useCallback(async () => {
    if (!selectedHolding?.symbol || !userId) return
    
    setChartLoading(true)
    try {
      const response = await fetch(
        `/api/securities/history?symbol=${selectedHolding.symbol}&range=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        }
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not logged in for live charts')
          setChartData([])
          return
        }
        throw new Error('Failed to fetch history')
      }
      
      const data = await response.json()
      
      // Format data based on timeframe
      const isIntraday = ['1D', '1W'].includes(timeRange)
      const formatted = data.data?.map(point => ({
        time: isIntraday 
          ? new Date(point.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(point.t).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        price: point.c,
        volume: point.v
      })) || []
      
      setChartData(formatted)
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }, [selectedHolding?.symbol, timeRange, userId])

  // Fetch investment data
  const fetchInvestmentData = useCallback(async (refresh = false) => {
    try {
      setLoading(true)
      const url = refresh ? `/api/investments/${userId}?refresh=true` : `/api/investments/${userId}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        setInvestments(data.investments || [])
      }
    } catch (error) {
      console.error("Failed to fetch investment data:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch chart data when selection changes
  useEffect(() => {
    if (selectedHolding?.symbol && userId) {
      fetchChartData()
    }
  }, [selectedHolding?.symbol, timeRange, userId, fetchChartData])

  // Refresh prices
  const refreshPrices = useCallback(async () => {
    if (!userId) return
    
    setRefreshing(true)
    try {
      await fetchInvestmentData(true)
    } finally {
      setRefreshing(false)
    }
  }, [userId, fetchInvestmentData])

  const saveInvestment = useCallback(async (investment: Partial<Investment>) => {
    if (!userId) {
      alert("Please sign in to manage your investments")
      return
    }
    
    try {
      const url = investment.id 
        ? `/api/investments/${userId}/${investment.id}`
        : `/api/investments/${userId}`
      
      const method = investment.id ? "PUT" : "POST"
      const authToken = localStorage.getItem('auth_token')
      
      if (!authToken) {
        alert("Please sign in to manage your investments")
        return
      }
      
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(investment)
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Investment saved successfully:", result)
        await fetchInvestmentData()
        setShowAddInvestment(false)
        setEditingInvestment(null)
      } else {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        alert(`Failed to save investment: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to save investment:", error)
      alert("Failed to save investment. Please try again.")
    }
  }, [userId, fetchInvestmentData])

  const deleteInvestment = useCallback(async (id: string) => {
    if (!userId) {
      alert("Please sign in to manage your investments")
      return
    }
    
    if (!confirm("Are you sure you want to delete this investment?")) return
    
    try {
      const authToken = localStorage.getItem('auth_token')
      
      if (!authToken) {
        alert("Please sign in to manage your investments")
        return
      }
      
      const response = await fetch(
        `/api/investments/${userId}/${id}`,
        { 
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      )
      if (response.ok) {
        await fetchInvestmentData()
      } else {
        const errorData = await response.json()
        console.error("Delete API Error:", errorData)
        alert(`Failed to delete investment: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to delete investment:", error)
      alert("Failed to delete investment. Please try again.")
    }
  }, [userId, fetchInvestmentData])

  const toggleFavorite = useCallback(async (id: string) => {
    if (!userId) {
      alert("Please sign in to manage favorites")
      return
    }
    
    const investment = investments.find(i => i.id === id)
    if (investment) {
      await saveInvestment({ ...investment, is_favorite: !investment.is_favorite })
    }
  }, [userId, investments, saveInvestment])

  const exportData = useCallback(() => {
    const csv = [
      ["Name", "Symbol", "Type", "Quantity", "Purchase Price", "Current Price", "Total Value", "Gain/Loss", "Purchase Date", "Notes"],
      ...filteredInvestments.map(inv => [
        inv.name,
        inv.symbol || "",
        inv.type,
        inv.quantity.toString(),
        inv.purchase_price.toString(),
        inv.current_price.toString(),
        (inv.quantity * inv.current_price).toString(),
        ((inv.current_price - inv.purchase_price) * inv.quantity).toString(),
        inv.purchase_date,
        inv.notes || ""
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `investments_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }, [filteredInvestments])

  const importPlaidHoldings = useCallback(async () => {
    if (!userId) {
      alert("Please sign in to import holdings")
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch(`/api/plaid/import-holdings/${userId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully imported ${result.imported_count || 0} holdings from your connected accounts!`)
        await fetchInvestmentData() // Refresh the data
      } else {
        const error = await response.json()
        alert(`Failed to import holdings: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import holdings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userId, fetchInvestmentData])

  if (loading) {
    return (
      <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
        <CardContent className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Apple-inspired Design */}
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Clean header with subtle accent */}
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Minimal icon treatment */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-2xl opacity-10 blur-xl"></div>
                  <div className="relative bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm">
                    <TrendingUp className="h-6 w-6 text-blue-500" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* Typography hierarchy */}
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    Portfolio
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Real-time investment tracking
                  </p>
                </div>
              </div>

              {/* Action buttons - subtle and functional */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <Settings className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exportData}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchInvestmentData}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics Section - Clean grid layout */}
          <div className="px-8 py-6 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Total Value */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Value
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCompact(metrics.totalValue)}
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                  <p className="text-xs text-gray-500">
                    {metrics.accountCount} accounts
                  </p>
                </div>
              </div>

              {/* Returns */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Return
                </p>
                <div className="flex items-baseline gap-2">
                  <p className={cn(
                    "text-2xl font-semibold",
                    metrics.totalGainLoss >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  )}>
                    {formatPercent(metrics.totalGainLossPercent)}
                  </p>
                  {metrics.totalGainLoss >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-500" strokeWidth={2} />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-500" strokeWidth={2} />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatCurrency(Math.abs(metrics.totalGainLoss))}
                </p>
              </div>

              {/* Dividends */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dividends
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCompact(metrics.totalDividends)}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics.totalValue > 0 ? `${((metrics.totalDividends / metrics.totalValue) * 100).toFixed(2)}% yield` : '0% yield'}
                </p>
              </div>

              {/* Holdings */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Holdings
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {metrics.investmentCount}
                </p>
                <div className="flex items-center gap-2">
                  {Object.keys(metrics.allocation).length > 0 && (
                    <p className="text-xs text-gray-500">
                      {Object.keys(metrics.allocation).length} types
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
        <CardContent className="p-4 space-y-4">
          {/* Top Row - Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search investments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="stock">Stocks</SelectItem>
                  <SelectItem value="bond">Bonds</SelectItem>
                  <SelectItem value="etf">ETFs</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="commodity">Commodities</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bottom Row - Actions and View Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                View:
              </span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={config.layout === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setConfig({...config, layout: "grid"})}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.layout === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setConfig({...config, layout: "list"})}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.layout === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setConfig({...config, layout: "kanban"})}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              {userId && (
                <Button
                  variant="outline"
                  onClick={() => importPlaidHoldings()}
                  disabled={loading}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 whitespace-nowrap"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Holdings
                </Button>
              )}
              <Button
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 whitespace-nowrap"
                onClick={() => {
                  if (!userId) {
                    alert("Please sign in to add investments")
                    return
                  }
                  setEditingInvestment(null)
                  setShowAddInvestment(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Investment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Allocation Chart */}
          {config.showAllocation && (
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Asset Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {Object.entries(metrics.allocation).map(([type, value]) => {
                      const percentage = (value / metrics.totalValue) * 100
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{type.replace('_', ' ')}</span>
                            <span className="font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                      <p className="text-sm text-gray-500 mt-1">Total Portfolio Value</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Best Performer</p>
                    <p className="text-lg font-bold">
                      {filteredInvestments[0]?.name || "N/A"}
                    </p>
                    <p className="text-sm text-green-600">
                      {filteredInvestments[0] ? 
                        formatPercent(((filteredInvestments[0].current_price - filteredInvestments[0].purchase_price) / filteredInvestments[0].purchase_price) * 100)
                        : "0%"
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Risk Distribution</p>
                    <p className="text-lg font-bold">Balanced</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">Low: {((metrics.riskDistribution.low / metrics.totalValue) * 100).toFixed(0)}%</Badge>
                      <Badge variant="secondary" className="text-xs">Med: {((metrics.riskDistribution.medium / metrics.totalValue) * 100).toFixed(0)}%</Badge>
                      <Badge variant="secondary" className="text-xs">High: {((metrics.riskDistribution.high / metrics.totalValue) * 100).toFixed(0)}%</Badge>
                    </div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Annual Dividends</p>
                    <p className="text-lg font-bold">{formatCurrency(metrics.totalDividends)}</p>
                    <p className="text-sm text-gray-500">
                      Yield: {metrics.totalValue > 0 ? ((metrics.totalDividends / metrics.totalValue) * 100).toFixed(2) : 0}%
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Favorites */}
          {filteredInvestments.filter(i => i.is_favorite).length > 0 && (
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Favorite Holdings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Suspense fallback={<div>Loading...</div>}>
                    {filteredInvestments.filter(i => i.is_favorite).map(inv => (
                      <InvestmentCard 
                        key={inv.id} 
                        investment={inv}
                        onEdit={() => {
                          setEditingInvestment(inv)
                          setShowAddInvestment(true)
                        }}
                        onDelete={() => deleteInvestment(inv.id)}
                        onToggleFavorite={() => toggleFavorite(inv.id)}
                      />
                    ))}
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="holdings" className="mt-6">
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
            <CardHeader>
              <CardTitle>All Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {config.layout === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <Suspense fallback={<div>Loading...</div>}>
                    {filteredInvestments.map(investment => (
                      <InvestmentCard 
                        key={investment.id} 
                        investment={investment}
                        onEdit={() => {
                          setEditingInvestment(investment)
                          setShowAddInvestment(true)
                        }}
                        onDelete={() => deleteInvestment(investment.id)}
                        onToggleFavorite={() => toggleFavorite(investment.id)}
                      />
                    ))}
                  </Suspense>
                </div>
              )}

              {config.layout === "list" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Gain/Loss</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvestments.map(investment => {
                      const value = investment.quantity * investment.current_price
                      const gainLoss = (investment.current_price - investment.purchase_price) * investment.quantity
                      const gainLossPercent = ((investment.current_price - investment.purchase_price) / investment.purchase_price) * 100
                      
                      return (
                        <TableRow key={investment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => toggleFavorite(investment.id)}
                              >
                                {investment.is_favorite ? 
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> : 
                                  <StarOff className="h-3 w-3" />
                                }
                              </Button>
                              <div>
                                <p>{investment.name}</p>
                                {investment.symbol && (
                                  <p className="text-xs text-gray-500">{investment.symbol}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {investment.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{investment.quantity}</TableCell>
                          <TableCell>{formatCurrency(investment.purchase_price)}</TableCell>
                          <TableCell>{formatCurrency(investment.current_price)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(value)}</TableCell>
                          <TableCell>
                            <div className={cn(
                              "font-medium",
                              gainLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              <p>{formatCurrency(gainLoss)}</p>
                              <p className="text-xs">{formatPercent(gainLossPercent)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingInvestment(investment)
                                  setShowAddInvestment(true)
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600"
                                onClick={() => deleteInvestment(investment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              {config.layout === "kanban" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["low", "medium", "high"].map(risk => (
                    <div key={risk} className="space-y-3">
                      <h3 className="font-semibold capitalize flex items-center gap-2">
                        {risk} Risk
                        <Badge variant="secondary">
                          {filteredInvestments.filter(i => (i.risk_level || "medium") === risk).length}
                        </Badge>
                      </h3>
                      <div className="space-y-2">
                        <Suspense fallback={<div>Loading...</div>}>
                          {filteredInvestments
                            .filter(i => (i.risk_level || "medium") === risk)
                            .map(investment => (
                              <InvestmentCard 
                                key={investment.id} 
                                investment={investment}
                                onEdit={() => {
                                  setEditingInvestment(investment)
                                  setShowAddInvestment(true)
                                }}
                                onDelete={() => deleteInvestment(investment.id)}
                                onToggleFavorite={() => toggleFavorite(investment.id)}
                              />
                            ))}
                        </Suspense>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Performance Analysis</CardTitle>
              {userId && (
                <Button 
                  onClick={refreshPrices} 
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
                  {refreshing ? "Refreshing..." : "Refresh Prices"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!userId ? (
                <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-center">
                    Sign in to view live performance charts<br />
                    <span className="text-sm">Charts show sample data for demo purposes</span>
                  </p>
                </div>
              ) : investments.length === 0 ? (
                <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Add some investments to see performance charts</p>
                </div>
              ) : (
                <>
                  {/* Timeframe selector */}
                  <div className="flex gap-2 mb-4">
                    {['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'].map(range => (
                      <Button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        variant={timeRange === range ? "default" : "outline"}
                        size="sm"
                        className="h-8"
                      >
                        {range}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Holding selector */}
                  <Select 
                    value={selectedHolding?.id}
                    onValueChange={(value) => {
                      const holding = investments.find(h => h.id === value)
                      setSelectedHolding(holding || null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a holding to view chart" />
                    </SelectTrigger>
                    <SelectContent>
                      {investments
                        .filter(inv => inv.symbol)
                        .map(holding => (
                          <SelectItem key={holding.id} value={holding.id}>
                            {holding.symbol || holding.name} - {holding.quantity} shares
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Chart */}
                  {chartLoading ? (
                    <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Loading chart data...</p>
                      </div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            domain={['dataMin * 0.95', 'dataMax * 1.05']}
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Price']}
                            labelStyle={{ color: 'var(--foreground)' }}
                            contentStyle={{
                              backgroundColor: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#8884d8" 
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : selectedHolding ? (
                    <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No chart data available</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Historical data may not be available for this security
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Select a holding to view performance chart</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Portfolio Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {investments.length === 0 ? (
                <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Add some investments to see portfolio analysis</p>
                </div>
              ) : (
                <>
                  {/* Portfolio Value */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Portfolio Value</h3>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.totalValue)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Cost basis: {formatCurrency(metrics.totalCost)}
                    </p>
                    <p className={cn(
                      "text-sm font-medium mt-1",
                      metrics.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {metrics.totalGainLoss >= 0 ? "+" : ""}{formatCurrency(metrics.totalGainLoss)} ({formatPercent(metrics.totalGainLossPercent)})
                    </p>
                  </div>

                  {/* Allocation by Type */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Allocation by Type</h3>
                    {Object.keys(metrics.allocation).length > 0 ? (
                      <div className="space-y-4">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.entries(metrics.allocation).map(([key, value]) => ({
                                  name: key.charAt(0).toUpperCase() + key.slice(1),
                                  value,
                                  percentage: ((value / metrics.totalValue) * 100).toFixed(1)
                                }))}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({name, percentage}) => `${name} ${percentage}%`}
                              >
                                {Object.entries(metrics.allocation).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5 % 360}, 70%, 50%)`} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(metrics.allocation)
                            .sort(([,a], [,b]) => b - a)
                            .map(([type, value]) => (
                              <div key={type} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <span className="font-medium capitalize">{type}</span>
                                <span>{((value / metrics.totalValue) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No allocation data available</p>
                    )}
                  </div>

                  {/* Top 5 Holdings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Top 5 Holdings by Value</h3>
                    <div className="space-y-2">
                      {[...investments]
                        .sort((a, b) => (b.quantity * b.current_price) - (a.quantity * a.current_price))
                        .slice(0, 5)
                        .map(holding => {
                          const value = holding.quantity * holding.current_price
                          const weight = ((value / metrics.totalValue) * 100).toFixed(1)
                          return (
                            <div key={holding.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                              <div>
                                <span className="font-medium">{holding.symbol || holding.name}</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {holding.quantity} shares
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-medium">{weight}%</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatCurrency(value)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Portfolio Concentration */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Portfolio Concentration</h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                      {(() => {
                        const weights = investments.map(h => (h.quantity * h.current_price) / metrics.totalValue)
                        const hhi = weights.reduce((sum, w) => sum + (w * w), 0)
                        const top2Weight = weights
                          .sort((a, b) => b - a)
                          .slice(0, 2)
                          .reduce((sum, w) => sum + w, 0) * 100
                        
                        return (
                          <div>
                            <p className="text-sm">
                              <strong>HHI Score:</strong> {hhi.toFixed(4)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              Top 2 holdings represent {top2Weight.toFixed(0)}% of portfolio value.
                              {hhi > 0.25 
                                ? " Portfolio shows high concentration." 
                                : hhi > 0.15 
                                ? " Portfolio has moderate concentration." 
                                : " Portfolio is well diversified."
                              }
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Performance Contributors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Performance Contributors</h3>
                    
                    {(() => {
                      const contributions = investments
                        .map(h => {
                          const currentValue = h.quantity * h.current_price
                          const costBasis = h.quantity * h.purchase_price
                          const contribution = currentValue - costBasis
                          const returnPct = costBasis > 0 ? (contribution / costBasis) * 100 : 0
                          return {
                            name: h.symbol || h.name,
                            contribution,
                            returnPct
                          }
                        })
                        .sort((a, b) => b.contribution - a.contribution)

                      const topPerformers = contributions.slice(0, 3)
                      const bottomPerformers = contributions.slice(-3).reverse()

                      return (
                        <div className="space-y-4">
                          {topPerformers.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-green-600">Top Performers</h4>
                              <div className="space-y-1">
                                {topPerformers.map(c => (
                                  <div key={c.name} className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                    <span>{c.name}</span>
                                    <span className="text-green-600 font-medium">
                                      {c.contribution >= 0 ? '+' : ''}{formatCurrency(c.contribution)} ({c.returnPct.toFixed(1)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {bottomPerformers.some(c => c.contribution < 0) && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-red-600">Underperformers</h4>
                              <div className="space-y-1">
                                {bottomPerformers.filter(c => c.contribution < 0).map(c => (
                                  <div key={c.name} className="flex justify-between text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                    <span>{c.name}</span>
                                    <span className="text-red-600 font-medium">
                                      {formatCurrency(c.contribution)} ({c.returnPct.toFixed(1)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Investment Dialog */}
      <Dialog open={showAddInvestment} onOpenChange={setShowAddInvestment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingInvestment ? "Edit Investment" : "Add New Investment"}
            </DialogTitle>
          </DialogHeader>
          
          <Suspense fallback={<div>Loading form...</div>}>
            <InvestmentForm
              investment={editingInvestment}
              onSave={saveInvestment}
              onCancel={() => setShowAddInvestment(false)}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dashboard Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show Performance Metrics</Label>
              <Switch
                checked={config.showPerformance}
                onCheckedChange={(checked) => setConfig({...config, showPerformance: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Asset Allocation</Label>
              <Switch
                checked={config.showAllocation}
                onCheckedChange={(checked) => setConfig({...config, showAllocation: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Dividends</Label>
              <Switch
                checked={config.showDividends}
                onCheckedChange={(checked) => setConfig({...config, showDividends: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Targets</Label>
              <Switch
                checked={config.showTargets}
                onCheckedChange={(checked) => setConfig({...config, showTargets: checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Default Timeframe</Label>
              <Select value={config.timeframe} onValueChange={(value) => setConfig({...config, timeframe: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1D">1 Day</SelectItem>
                  <SelectItem value="1W">1 Week</SelectItem>
                  <SelectItem value="1M">1 Month</SelectItem>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="YTD">Year to Date</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="ALL">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}