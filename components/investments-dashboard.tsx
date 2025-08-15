"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  TrendingUp, TrendingDown, DollarSign, PieChart, Activity, 
  ArrowUpRight, ArrowDownRight, ChevronRight, Eye, EyeOff,
  Briefcase, Award, LineChart, Info, Plus, RefreshCw,
  Edit2, Trash2, Download, Upload, Settings, Filter,
  Calculator, BarChart3, Calendar, Search, X, Check,
  AlertCircle, Star, StarOff, Grid3x3, List, Layers,
  Target, Zap, Database, FileSpreadsheet, MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PlaidConnect } from "@/components/plaid-connect"

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

  // New investment form state
  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
    type: "stock",
    quantity: 0,
    purchase_price: 0,
    current_price: 0,
    purchase_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (userId) {
      fetchInvestmentData()
    }
  }, [userId])

  const fetchInvestmentData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/investments/${userId}`)
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
  }

  const saveInvestment = async (investment: Partial<Investment>) => {
    try {
      const url = investment.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/investments/${userId}/${investment.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/investments/${userId}`
      
      const method = investment.id ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(investment)
      })

      if (response.ok) {
        await fetchInvestmentData()
        setShowAddInvestment(false)
        setEditingInvestment(null)
        setNewInvestment({
          type: "stock",
          quantity: 0,
          purchase_price: 0,
          current_price: 0,
          purchase_date: new Date().toISOString().split('T')[0]
        })
      }
    } catch (error) {
      console.error("Failed to save investment:", error)
    }
  }

  const deleteInvestment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment?")) return
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/investments/${userId}/${id}`,
        { method: "DELETE" }
      )
      if (response.ok) {
        await fetchInvestmentData()
      }
    } catch (error) {
      console.error("Failed to delete investment:", error)
    }
  }

  const toggleFavorite = async (id: string) => {
    const investment = investments.find(i => i.id === id)
    if (investment) {
      await saveInvestment({ ...investment, is_favorite: !investment.is_favorite })
    }
  }

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
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

  // Filter investments
  const filteredInvestments = useMemo(() => {
    let filtered = [...investments]
    
    if (searchQuery) {
      filtered = filtered.filter(inv => 
        inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    if (selectedAccount !== "all") {
      filtered = filtered.filter(inv => inv.account_id === selectedAccount)
    }
    
    if (selectedType !== "all") {
      filtered = filtered.filter(inv => inv.type === selectedType)
    }
    
    // Sort investments
    filtered.sort((a, b) => {
      switch (config.sortBy) {
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
  }, [investments, searchQuery, selectedAccount, selectedType, config.sortBy])

  const exportData = () => {
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
  }

  const InvestmentCard = ({ investment }: { investment: Investment }) => {
    const value = investment.quantity * investment.current_price
    const gainLoss = (investment.current_price - investment.purchase_price) * investment.quantity
    const gainLossPercent = ((investment.current_price - investment.purchase_price) / investment.purchase_price) * 100

    return (
      <Card className="hover:shadow-lg transition-all duration-200 group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleFavorite(investment.id)}
              >
                {investment.is_favorite ? 
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : 
                  <StarOff className="h-4 w-4" />
                }
              </Button>
              <div>
                <h4 className="font-semibold text-sm">{investment.name}</h4>
                {investment.symbol && (
                  <p className="text-xs text-gray-500">{investment.symbol}</p>
                )}
              </div>
            </div>
            <Badge variant={gainLoss >= 0 ? "default" : "destructive"} className="text-xs">
              {investment.type}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Value</span>
              <span className="font-semibold">{formatCurrency(value)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Gain/Loss</span>
              <span className={cn(
                "text-sm font-medium",
                gainLoss >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{investment.quantity} shares</span>
              <span className="text-xs text-gray-500">@ {formatCurrency(investment.current_price)}</span>
            </div>
          </div>

          <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => {
                setEditingInvestment(investment)
                setNewInvestment(investment)
                setShowAddInvestment(true)
              }}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs text-red-600 hover:text-red-700"
              onClick={() => deleteInvestment(investment.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 text-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Investment Portfolio</h2>
                <p className="text-white/80 text-sm">Track and manage all your investments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportData}
                className="bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchInvestmentData}
                className="bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-white/70 mb-1">Total Value</p>
              <p className="text-xl font-bold">{formatCompact(metrics.totalValue)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-white/70 mb-1">Total Return</p>
              <p className={cn(
                "text-xl font-bold",
                metrics.totalGainLoss >= 0 ? "text-green-300" : "text-red-300"
              )}>
                {formatPercent(metrics.totalGainLossPercent)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-white/70 mb-1">Dividends</p>
              <p className="text-xl font-bold">{formatCompact(metrics.totalDividends)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-white/70 mb-1">Holdings</p>
              <p className="text-xl font-bold">{metrics.investmentCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search investments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-32">
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
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={config.layout === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setConfig({...config, layout: "grid"})}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.layout === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setConfig({...config, layout: "list"})}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.layout === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setConfig({...config, layout: "kanban"})}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </div>

              <Button
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                onClick={() => {
                  setEditingInvestment(null)
                  setNewInvestment({
                    type: "stock",
                    quantity: 0,
                    purchase_price: 0,
                    current_price: 0,
                    purchase_date: new Date().toISOString().split('T')[0]
                  })
                  setShowAddInvestment(true)
                }}
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
                  {filteredInvestments.filter(i => i.is_favorite).map(inv => (
                    <InvestmentCard key={inv.id} investment={inv} />
                  ))}
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
                  {filteredInvestments.map(investment => (
                    <InvestmentCard key={investment.id} investment={investment} />
                  ))}
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
                                  setNewInvestment(investment)
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
                        {filteredInvestments
                          .filter(i => (i.risk_level || "medium") === risk)
                          .map(investment => (
                            <InvestmentCard key={investment.id} investment={investment} />
                          ))}
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
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Performance charts coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Portfolio Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">Diversification Score: Good</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your portfolio is well-diversified across {Object.keys(metrics.allocation).length} asset types.
                  Consider rebalancing quarterly to maintain optimal allocation.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">Risk Assessment</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your portfolio has a balanced risk profile. Consider your investment timeline and adjust risk levels accordingly.
                </p>
              </div>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Investment Name</Label>
              <Input
                value={newInvestment.name || ""}
                onChange={(e) => setNewInvestment({...newInvestment, name: e.target.value})}
                placeholder="e.g., Apple Inc."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Symbol (Optional)</Label>
              <Input
                value={newInvestment.symbol || ""}
                onChange={(e) => setNewInvestment({...newInvestment, symbol: e.target.value})}
                placeholder="e.g., AAPL"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newInvestment.type} 
                onValueChange={(value) => setNewInvestment({...newInvestment, type: value as Investment["type"]})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="commodity">Commodity</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select 
                value={newInvestment.risk_level || "medium"} 
                onValueChange={(value) => setNewInvestment({...newInvestment, risk_level: value as Investment["risk_level"]})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={newInvestment.quantity || ""}
                onChange={(e) => setNewInvestment({...newInvestment, quantity: parseFloat(e.target.value)})}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={newInvestment.purchase_price || ""}
                onChange={(e) => setNewInvestment({...newInvestment, purchase_price: parseFloat(e.target.value)})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Current Price</Label>
              <Input
                type="number"
                value={newInvestment.current_price || ""}
                onChange={(e) => setNewInvestment({...newInvestment, current_price: parseFloat(e.target.value)})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={newInvestment.purchase_date || ""}
                onChange={(e) => setNewInvestment({...newInvestment, purchase_date: e.target.value})}
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newInvestment.notes || ""}
                onChange={(e) => setNewInvestment({...newInvestment, notes: e.target.value})}
                placeholder="Add any notes about this investment..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInvestment(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveInvestment(newInvestment)}
              disabled={!newInvestment.name || !newInvestment.quantity || !newInvestment.purchase_price || !newInvestment.current_price}
            >
              {editingInvestment ? "Update" : "Add"} Investment
            </Button>
          </DialogFooter>
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