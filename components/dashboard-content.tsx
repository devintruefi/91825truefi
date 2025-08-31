"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InteractiveGoalChart } from "@/components/interactive-goal-chart"
import { 
  TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, CreditCard, 
  Building2, ArrowUpRight, ArrowDownRight, Search, Filter, Calendar,
  Bell, Settings, RefreshCw, Plus, Edit2, Trash2, Check, X, Loader2,
  Home, Car, Briefcase, Heart, ShoppingBag, Utensils, Plane, Zap,
  BarChart3, PieChart, Activity, Sparkles, ChevronRight, ChevronDown,
  Eye, EyeOff, Download, Upload, MoreVertical, Info, AlertCircle,
  AlertTriangle, CheckCircle, Smartphone, Star, Pin
} from "lucide-react"

// Enhanced styling classes for the premium dashboard experience
const glassmorphismCard = "backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl shadow-gray-200/20 dark:shadow-gray-950/20 hover:shadow-3xl hover:shadow-gray-300/30 dark:hover:shadow-gray-900/40 transition-all duration-500 ease-out hover:scale-[1.01] hover:-translate-y-1 rounded-2xl"

const gradientText = "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 dark:from-cyan-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent font-semibold"

const pulseGlow = "shadow-[0_0_30px_rgba(6,182,212,0.4)] dark:shadow-[0_0_30px_rgba(52,211,153,0.4)]"

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

// Sample data for non-logged-in users
const sampleAccounts = [
  { name: "Chase Total Checking", type: "Checking", balance: 8450.32, institution: "Chase Bank", icon: Building2, status: "healthy", color: "#0066CC" },
  { name: "Chase Sapphire Preferred", type: "Credit Card", balance: -2341.67, institution: "Chase Bank", icon: CreditCard, status: "caution", color: "#0066CC" },
  { name: "Ally High Yield Savings", type: "Savings", balance: 25000.0, institution: "Ally Bank", icon: PiggyBank, status: "excellent", color: "#FF6B35" },
  { name: "Fidelity 401(k)", type: "Retirement", balance: 45230.18, institution: "Fidelity", icon: Target, status: "healthy", color: "#00A651" },
  { name: "Coinbase Pro", type: "Crypto", balance: 3420.89, institution: "Coinbase", icon: Smartphone, status: "healthy", color: "#0052FF" },
  { name: "Amex Gold Card", type: "Credit Card", balance: -892.34, institution: "American Express", icon: CreditCard, status: "good", color: "#FF6600" },
];

const sampleTransactions = [
  // Income transactions
  { id: 1, date: "2024-01-15", description: "Salary Deposit", category: "Income", amount: 5200.0, account: "Chase Checking", icon: "💰", trend: "on time" },
  { id: 2, date: "2024-01-01", description: "Freelance Payment", category: "Income", amount: 1800.0, account: "Chase Checking", icon: "💼", trend: "+15%" },
  
  // Housing & Fixed Expenses
  { id: 3, date: "2024-01-01", description: "Rent Payment", category: "Housing", amount: -1850.0, account: "Chase Checking", icon: "🏠", trend: "steady" },
  { id: 4, date: "2024-01-13", description: "Electric Bill", category: "Utilities", amount: -135.45, account: "Chase Checking", icon: "💡", trend: "-2%" },
  { id: 5, date: "2024-01-10", description: "Internet Bill", category: "Utilities", amount: -89.99, account: "Chase Credit Card", icon: "📶", trend: "steady" },
  { id: 6, date: "2024-01-05", description: "Car Insurance", category: "Transportation", amount: -142.50, account: "Chase Checking", icon: "🚗", trend: "steady" },
  
  // Food & Dining
  { id: 7, date: "2024-01-15", description: "Whole Foods Market", category: "Food & Dining", amount: -89.32, account: "Chase Checking", icon: "🍎", trend: "+12%" },
  { id: 8, date: "2024-01-12", description: "Starbucks", category: "Food & Dining", amount: -12.75, account: "Chase Credit Card", icon: "☕", trend: "+15%" },
  { id: 9, date: "2024-01-08", description: "Restaurant Dinner", category: "Food & Dining", amount: -78.50, account: "Chase Credit Card", icon: "🍽️", trend: "+10%" },
  { id: 10, date: "2024-01-03", description: "Grocery Store", category: "Food & Dining", amount: -156.89, account: "Chase Checking", icon: "🛒", trend: "+8%" },
  
  // Transportation
  { id: 11, date: "2024-01-14", description: "Shell Gas Station", category: "Transportation", amount: -65.67, account: "Chase Credit Card", icon: "⛽", trend: "-5%" },
  { id: 12, date: "2024-01-12", description: "Uber", category: "Transportation", amount: -23.50, account: "Chase Credit Card", icon: "🚗", trend: "+3%" },
  { id: 13, date: "2024-01-07", description: "Parking Fee", category: "Transportation", amount: -15.00, account: "Chase Credit Card", icon: "🅿️", trend: "steady" },
  
  // Shopping & Entertainment
  { id: 14, date: "2024-01-13", description: "Target", category: "Shopping", amount: -127.84, account: "Chase Credit Card", icon: "🛒", trend: "+8%" },
  { id: 15, date: "2024-01-11", description: "Amazon Purchase", category: "Shopping", amount: -67.99, account: "Chase Credit Card", icon: "📦", trend: "+6%" },
  { id: 16, date: "2024-01-14", description: "Netflix Subscription", category: "Entertainment", amount: -15.99, account: "Chase Credit Card", icon: "📺", trend: "steady" },
  { id: 17, date: "2024-01-09", description: "Movie Tickets", category: "Entertainment", amount: -28.50, account: "Chase Credit Card", icon: "🎬", trend: "+5%" },
  
  // Healthcare & Other
  { id: 18, date: "2024-01-11", description: "Gym Membership", category: "Healthcare", amount: -49.99, account: "Chase Checking", icon: "💪", trend: "steady" },
  { id: 19, date: "2024-01-06", description: "Pharmacy", category: "Healthcare", amount: -24.75, account: "Chase Credit Card", icon: "💊", trend: "steady" },
  { id: 20, date: "2024-01-02", description: "Phone Bill", category: "Utilities", amount: -85.00, account: "Chase Credit Card", icon: "📱", trend: "steady" },
];

const sampleAssets = [
  { id: 1, name: "Primary Home", type: "Real Estate", value: 450000, description: "3 bed, 2 bath in suburban area" },
  { id: 2, name: "Investment Portfolio", type: "Stocks & ETFs", value: 125000, description: "Diversified portfolio with tech focus" },
  { id: 3, name: "Emergency Fund", type: "Cash", value: 25000, description: "High-yield savings account" },
  { id: 4, name: "Car", type: "Vehicle", value: 28000, description: "2020 Honda Accord" },
  { id: 5, name: "Jewelry Collection", type: "Collectibles", value: 15000, description: "Family heirlooms and investments" },
];

const sampleLiabilities = [
  { id: 1, name: "Mortgage", type: "Real Estate", balance: 320000, interest_rate: 3.25, minimum_payment: 1850 },
  { id: 2, name: "Car Loan", type: "Vehicle", balance: 18000, interest_rate: 4.5, minimum_payment: 450 },
  { id: 3, name: "Student Loans", type: "Education", balance: 45000, interest_rate: 5.2, minimum_payment: 380 },
  { id: 4, name: "Credit Card", type: "Revolving", balance: 8500, interest_rate: 18.99, minimum_payment: 250 },
];

const sampleGoals = [
  { id: 1, name: "Emergency Fund", target_amount: 50000, current_amount: 25000, target_date: "2024-12-31" },
  { id: 2, name: "Vacation Fund", target_amount: 8000, current_amount: 3200, target_date: "2024-06-30" },
  { id: 3, name: "Home Renovation", target_amount: 25000, current_amount: 8500, target_date: "2025-03-31" },
  { id: 4, name: "Retirement", target_amount: 2000000, current_amount: 125000, target_date: "2040-01-01" },
];

const sampleInvestments = [
  { id: 1, name: "401(k) Plan", type: "Retirement", value: 125000, performance: 8.5, allocation: 40 },
  { id: 2, name: "Individual Stocks", type: "Equities", value: 45000, performance: 12.3, allocation: 15 },
  { id: 3, name: "Index Funds", type: "ETFs", value: 35000, performance: 6.8, allocation: 12 },
  { id: 4, name: "Real Estate", type: "Property", value: 25000, performance: 4.2, allocation: 8 },
  { id: 5, name: "Bonds", type: "Fixed Income", value: 20000, performance: 2.1, allocation: 7 },
];

const sampleBudget = {
  total: 7500,
  categories: [
    { name: "Housing", amount: 2500, type: "expense", percentage: 33.3 },
    { name: "Transportation", amount: 800, type: "expense", percentage: 10.7 },
    { name: "Food", amount: 600, type: "expense", percentage: 8.0 },
    { name: "Utilities", amount: 400, type: "expense", percentage: 5.3 },
    { name: "Healthcare", amount: 300, type: "expense", percentage: 4.0 },
    { name: "Entertainment", amount: 500, type: "expense", percentage: 6.7 },
    { name: "Savings", amount: 1500, type: "savings", percentage: 20.0 },
    { name: "Income", amount: 7500, type: "income", percentage: 100.0 },
  ]
};

const sampleNotifications = [
  { id: 1, title: "Budget Alert", message: "You're approaching your dining budget limit", type: "warning", timestamp: "2 hours ago" },
  { id: 2, title: "Savings Goal", message: "Emergency fund goal is 50% complete!", type: "success", timestamp: "1 day ago" },
  { id: 3, title: "Investment Update", message: "Your portfolio gained 2.3% this week", type: "info", timestamp: "3 days ago" },
  { id: 4, title: "Bill Reminder", message: "Credit card payment due in 5 days", type: "reminder", timestamp: "5 days ago" },
  { id: 5, title: "AI Insight", message: "New spending pattern detected", type: "insight", timestamp: "1 week ago" },
];

const sampleCategories = [
  { name: "Housing", amount: 1850, percentage: 38, icon: "🏠", trend: "steady" },
  { name: "Food & Dining", amount: 337, percentage: 7, icon: "🍽️", trend: "+12%" },
  { name: "Utilities", amount: 310, percentage: 6, icon: "💡", trend: "-2%" },
  { name: "Transportation", amount: 247, percentage: 5, icon: "🚗", trend: "-3%" },
  { name: "Shopping", amount: 196, percentage: 4, icon: "🛒", trend: "+8%" },
  { name: "Healthcare", amount: 75, percentage: 2, icon: "💊", trend: "steady" },
  { name: "Entertainment", amount: 44, percentage: 1, icon: "🎬", trend: "+5%" },
];

export function DashboardContent() {
  const [activeTab, setActiveTab] = useState("overview")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Calculate derived data
  const totalBalance = sampleAccounts.reduce((sum, acc) => sum + (acc.balance < 0 ? 0 : acc.balance), 0)
  const totalAssets = sampleAssets.reduce((sum, asset) => sum + asset.value, 0)
  const totalLiabilities = sampleLiabilities.reduce((sum, liability) => sum + liability.balance, 0)
  const netWorth = totalAssets - totalLiabilities
  
  // Hardcoded sample monthly metrics for demo purposes
  const monthlyIncome = 7200
  const monthlySpending = 4850
  const savingsRate = 32.6
  const cashFlow = monthlyIncome - monthlySpending

  // Category spending breakdown - using hardcoded sample data
  const topCategories = [
    { category: "Housing", amount: 1850, percentage: 38 },
    { category: "Food & Dining", amount: 337, percentage: 7 },
    { category: "Utilities", amount: 310, percentage: 6 },
    { category: "Transportation", amount: 247, percentage: 5 },
    { category: "Shopping", amount: 196, percentage: 4 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Content starts immediately below the fixed header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-10 pb-8">
        {/* Navigation tabs */}
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
                Welcome to TrueFi.ai!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                This is a sample dashboard showing what your personalized financial overview could look like.
                <br />
                Your net worth would be {formatCurrency(netWorth)} • 
                Cash flow: <span className={cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(cashFlow)}
                </span> this month
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Sample Data</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Non-editable</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Data Disclaimer Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                🎯 This is a Sample Dashboard
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                All data shown is for demonstration purposes. Sign up to connect your real accounts and get personalized insights!
              </p>
            </div>
            <Link href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Get Started
            </Link>
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${netWorth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {netWorth >= 0 ? "+" : "-"}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(netWorth)}
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
                      <Badge variant="outline" className="text-xs">Sample Data</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 accounts-scrollbar">
                      {sampleAccounts.map((account, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                              {formatCurrency(account.balance < 0 ? 0 : account.balance)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {account.institution}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Spending by Category */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Spending Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sampleCategories.map((category, index) => (
                        <div key={`category-${category.name}-${index}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{category.icon}</span>
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(category.amount)}</p>
                              <p className="text-xs text-gray-500">{category.percentage}%</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <Progress value={category.percentage} className="h-2 flex-1 mr-4" />
                            <span className={`text-xs font-medium ${
                              category.trend.includes('+') ? 'text-green-600' : 
                              category.trend.includes('-') ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {category.trend}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Insights & Alerts */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <span>🧠</span>
                      AI Financial Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Spending Alert</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Food & Dining spending increased 15% this month. Consider setting a budget limit.
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-yellow-700 dark:text-yellow-300">🔥 AI Detected</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Savings Opportunity</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          You could save an additional $200/month by optimizing your subscription services.
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-700 dark:text-green-300">✅ AI Suggestion</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Investment Tip</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Consider increasing your 401(k) contribution by 2% to maximize employer matching.
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-700 dark:text-blue-300">🧠 AI Recommendation</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Sidebar */}
              <div className="space-y-6">
                {/* Smart Budget Recommendations */}
                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold">Smart Budget</CardTitle>
                      <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Essentials</span>
                          <span className="font-bold">{formatCurrency(2500)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Lifestyle</span>
                          <span className="font-bold">{formatCurrency(1200)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Savings</span>
                          <span className="font-bold">{formatCurrency(1500)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        AI-powered recommendations based on spending patterns
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span>Notifications</span>
                      </CardTitle>
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                        {sampleNotifications.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sampleNotifications.slice(0, 5).map((notif) => (
                        <div key={notif.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notif.type === 'warning' ? 'bg-yellow-500' :
                              notif.type === 'success' ? 'bg-green-500' :
                              notif.type === 'info' ? 'bg-blue-500' :
                              notif.type === 'reminder' ? 'bg-orange-500' :
                              'bg-purple-500'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-gray-500">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sampleTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{transaction.icon}</span>
                            <div>
                              <p className="text-sm font-medium line-clamp-1">{transaction.description}</p>
                              <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                            </div>
                          </div>
                          <p className={`font-bold ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                      ))}
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
                    <Badge variant="outline" className="text-xs">Sample Data</Badge>
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
                      {sampleTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{transaction.icon}</span>
                              <span className="font-medium">{transaction.description}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.account}</TableCell>
                          <TableCell className={`text-right font-bold ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                            {transaction.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(transaction.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                    <p className="text-3xl font-bold">{formatCurrency(totalAssets)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Assets</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="h-8 w-8 text-red-600" />
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalLiabilities)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Liabilities</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="h-8 w-8 text-blue-600" />
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${netWorth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {netWorth >= 0 ? "Positive" : "Negative"}
                      </span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(netWorth)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Net Worth</p>
                  </CardContent>
                </Card>
              </div>

              {/* Assets Table */}
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Assets</CardTitle>
                  <Badge variant="outline" className="text-xs">Sample Data</Badge>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleAssets.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>{asset.type}</TableCell>
                          <TableCell className="font-bold text-green-600">{formatCurrency(asset.value)}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">{asset.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Liabilities Table */}
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Liabilities</CardTitle>
                  <Badge variant="outline" className="text-xs">Sample Data</Badge>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Min Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleLiabilities.map((liability) => (
                        <TableRow key={liability.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">{liability.name}</TableCell>
                          <TableCell>{liability.type}</TableCell>
                          <TableCell className="font-bold text-red-600">{formatCurrency(liability.balance)}</TableCell>
                          <TableCell>{liability.interest_rate}%</TableCell>
                          <TableCell>{formatCurrency(liability.minimum_payment)}</TableCell>
                        </TableRow>
                      ))}
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
                  <Badge variant="outline" className="text-xs">Sample Data</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(sampleBudget.total)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Monthly Budget</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sampleBudget.categories.map((category, index) => (
                        <div key={index} className="p-4 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{category.name}</span>
                            <span className="text-sm text-gray-500">{category.percentage}%</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {formatCurrency(category.amount)}
                          </div>
                          <Progress value={category.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <Badge variant="outline" className="text-xs">Sample Data</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sampleGoals.map((goal, index) => {
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
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Investment Portfolio</CardTitle>
                  <Badge variant="outline" className="text-xs">Sample Data</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatCurrency(sampleInvestments.reduce((sum, inv) => sum + inv.value, 0))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total portfolio value</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investment</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right">Performance</TableHead>
                            <TableHead className="text-right">Allocation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sampleInvestments.map((investment) => (
                            <TableRow key={investment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <TableCell className="font-medium">{investment.name}</TableCell>
                              <TableCell>{investment.type}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(investment.value)}</TableCell>
                              <TableCell className={`text-right font-medium ${investment.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {investment.performance >= 0 ? '+' : ''}{investment.performance}%
                              </TableCell>
                              <TableCell className="text-right">{investment.allocation}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Call to Action Section - Premium Apple Design */}
      <div className="relative bg-white dark:bg-black py-32 overflow-hidden">
        {/* Sophisticated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-gray-200/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-gray-200/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6">
          {/* Main Content */}
          <div className="text-center space-y-8">
            
            {/* Small Eyebrow Text */}
            <p className="text-sm font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
              Your Complete Financial OS
            </p>
            
            {/* Main Headline - SF Pro Display style */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 dark:text-white leading-[1.1] tracking-[-0.02em]">
              Ready to see your
              <br />
              <span className="relative inline-block mt-1">
                <span className="relative z-10 bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900 dark:from-white dark:via-gray-400 dark:to-white bg-clip-text text-transparent">
                  real numbers?
                </span>
                {/* Subtle underline accent */}
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
              </span>
            </h2>
            
            {/* Subheadline - Clean and minimal */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              Every transaction. Every insight. Every decision.
              <br className="hidden md:block" />
              Unified in one beautifully simple experience.
            </p>
            
            {/* CTA Section with sophisticated buttons */}
            <div className="pt-8 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  href="/auth" 
                  className="group relative overflow-hidden px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[28px] font-medium text-lg transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free Trial
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  {/* Gradient hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-100 dark:to-gray-200 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                </Link>
                
                <Link 
                  href="/how-to-use" 
                  className="group px-10 py-5 text-gray-900 dark:text-white font-medium text-lg transition-all duration-300 relative"
                >
                  <span className="flex items-center gap-2">
                    Watch Demo
                    <div className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-900 transition-colors duration-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </span>
                </Link>
              </div>
              
              {/* Trust text */}
              <p className="text-sm text-gray-500 dark:text-gray-600">
                No credit card required • 30-day free trial • Cancel anytime
              </p>
            </div>
          </div>
          
          {/* Feature Cards - Bento Box Style */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all duration-500 border border-gray-200/50 dark:border-gray-800/50">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black flex items-center justify-center shadow-sm">
                  <Activity className="w-7 h-7 text-gray-700 dark:text-gray-300" strokeWidth={1.25} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Real-time sync
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your accounts update instantly. See every transaction as it happens, across all your institutions.
                </p>
                <div className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live data from 12,000+ banks</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all duration-500 border border-gray-200/50 dark:border-gray-800/50">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black flex items-center justify-center shadow-sm">
                  <Sparkles className="w-7 h-7 text-gray-700 dark:text-gray-300" strokeWidth={1.25} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  AI that learns
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Personalized insights that adapt to your spending patterns and financial goals over time.
                </p>
                <div className="pt-4">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-2 border-white dark:border-black"></div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-black flex items-center justify-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">+2M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all duration-500 border border-gray-200/50 dark:border-gray-800/50">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black flex items-center justify-center shadow-sm">
                  <Eye className="w-7 h-7 text-gray-700 dark:text-gray-300" strokeWidth={1.25} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Complete clarity
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  No hidden fees, no surprises. See exactly where your money goes with surgical precision.
                </p>
                <div className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-400 rounded-full"></div>
                    </div>
                    <span className="text-sm text-gray-500">75% clearer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          
        </div>
      </div>
    </div>
  )
}
