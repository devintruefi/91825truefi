"use client"

import { useState } from "react"
import Link from "next/link"
import { useUser } from "@/contexts/user-context"
import { DynamicInsights } from "@/components/dynamic-insights"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  AlertTriangle, CheckCircle, Smartphone, Star, Pin, Award, LineChart,
  User, MapPin, Shield, Globe, Lock
} from "lucide-react"
import { LineChart as RechartsLineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

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

// Generate realistic portfolio performance data (last 12 months)
const generatePortfolioData = () => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const baseValue = 250000; // Starting portfolio value
  let currentValue = baseValue;
  const data = [];

  // Generate realistic monthly returns with some volatility
  const monthlyReturns = [
    0.023, -0.012, 0.031, 0.018, -0.008, 0.027,
    0.019, 0.011, -0.015, 0.034, 0.028, 0.022
  ];

  months.forEach((month, i) => {
    currentValue = currentValue * (1 + monthlyReturns[i]);
    data.push({
      month,
      value: Math.round(currentValue),
      return: (monthlyReturns[i] * 100).toFixed(1),
      benchmark: Math.round(baseValue * (1 + (i + 1) * 0.008)) // 0.8% monthly benchmark
    });
  });

  return data;
};

const portfolioPerformanceData = generatePortfolioData();

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
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("overview")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  
  // Check if user is authenticated and not a demo user
  const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'
  const isAuthenticatedRealUser = user && user.id && user.id !== DEMO_USER_ID

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
            {["overview", "about", "transactions", "assets", "budget", "goals", "investments"].map((tab) => (
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
                    {isAuthenticatedRealUser ? (
                      // Dynamic insights for authenticated real users
                      <DynamicInsights userId={user.id} />
                    ) : (
                      // Hardcoded insights for demo/non-authenticated users
                      <>
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
                      </>
                    )}
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
              {/* Portfolio Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                        <p className="text-2xl font-bold">$247,589.42</p>
                        <p className="text-sm text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +12.4% YTD
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Day Change</p>
                        <p className="text-2xl font-bold">+$2,458.23</p>
                        <p className="text-sm text-green-600 flex items-center mt-1">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          +1.0%
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Gain</p>
                        <p className="text-2xl font-bold">$47,589.42</p>
                        <p className="text-sm text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +23.8%
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                        <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dividends (YTD)</p>
                        <p className="text-2xl font-bold">$3,254.00</p>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Next: Dec 15
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Investment Tabs */}
              <Tabs defaultValue="holdings" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="holdings">Holdings</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>

                {/* Holdings Tab */}
                <TabsContent value="holdings" className="space-y-4">
                  <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold">Portfolio Holdings</CardTitle>
                        <Badge variant="outline" className="text-xs mt-2">Sample Data</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Shares</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                              <TableHead className="text-right">Gain/Loss</TableHead>
                              <TableHead className="text-right">% of Portfolio</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">AAPL</TableCell>
                              <TableCell>Apple Inc.</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">150</TableCell>
                              <TableCell className="text-right">$195.89</TableCell>
                              <TableCell className="text-right font-bold">$29,383.50</TableCell>
                              <TableCell className="text-right text-green-600">+$5,383.50 (+22.4%)</TableCell>
                              <TableCell className="text-right">11.9%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">VOO</TableCell>
                              <TableCell>Vanguard S&P 500 ETF</TableCell>
                              <TableCell><Badge variant="secondary">ETF</Badge></TableCell>
                              <TableCell className="text-right">85</TableCell>
                              <TableCell className="text-right">$482.55</TableCell>
                              <TableCell className="text-right font-bold">$41,016.75</TableCell>
                              <TableCell className="text-right text-green-600">+$8,016.75 (+24.3%)</TableCell>
                              <TableCell className="text-right">16.6%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">MSFT</TableCell>
                              <TableCell>Microsoft Corporation</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">100</TableCell>
                              <TableCell className="text-right">$429.68</TableCell>
                              <TableCell className="text-right font-bold">$42,968.00</TableCell>
                              <TableCell className="text-right text-green-600">+$12,968.00 (+43.2%)</TableCell>
                              <TableCell className="text-right">17.3%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">BND</TableCell>
                              <TableCell>Vanguard Total Bond Market ETF</TableCell>
                              <TableCell><Badge variant="secondary">Bond ETF</Badge></TableCell>
                              <TableCell className="text-right">200</TableCell>
                              <TableCell className="text-right">$71.23</TableCell>
                              <TableCell className="text-right font-bold">$14,246.00</TableCell>
                              <TableCell className="text-right text-red-600">-$754.00 (-5.0%)</TableCell>
                              <TableCell className="text-right">5.8%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">GOOGL</TableCell>
                              <TableCell>Alphabet Inc.</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">120</TableCell>
                              <TableCell className="text-right">$178.45</TableCell>
                              <TableCell className="text-right font-bold">$21,414.00</TableCell>
                              <TableCell className="text-right text-green-600">+$3,414.00 (+19.0%)</TableCell>
                              <TableCell className="text-right">8.6%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">TSLA</TableCell>
                              <TableCell>Tesla Inc.</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">50</TableCell>
                              <TableCell className="text-right">$389.22</TableCell>
                              <TableCell className="text-right font-bold">$19,461.00</TableCell>
                              <TableCell className="text-right text-green-600">+$7,461.00 (+62.2%)</TableCell>
                              <TableCell className="text-right">7.9%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">AMZN</TableCell>
                              <TableCell>Amazon.com Inc.</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">80</TableCell>
                              <TableCell className="text-right">$218.16</TableCell>
                              <TableCell className="text-right font-bold">$17,452.80</TableCell>
                              <TableCell className="text-right text-green-600">+$4,452.80 (+34.3%)</TableCell>
                              <TableCell className="text-right">7.0%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">VTI</TableCell>
                              <TableCell>Vanguard Total Stock Market ETF</TableCell>
                              <TableCell><Badge variant="secondary">ETF</Badge></TableCell>
                              <TableCell className="text-right">125</TableCell>
                              <TableCell className="text-right">$278.92</TableCell>
                              <TableCell className="text-right font-bold">$34,865.00</TableCell>
                              <TableCell className="text-right text-green-600">+$6,865.00 (+24.5%)</TableCell>
                              <TableCell className="text-right">14.1%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">NVDA</TableCell>
                              <TableCell>NVIDIA Corporation</TableCell>
                              <TableCell><Badge variant="secondary">Stock</Badge></TableCell>
                              <TableCell className="text-right">25</TableCell>
                              <TableCell className="text-right">$145.52</TableCell>
                              <TableCell className="text-right font-bold">$3,638.00</TableCell>
                              <TableCell className="text-right text-green-600">+$1,138.00 (+45.5%)</TableCell>
                              <TableCell className="text-right">1.5%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">BTC</TableCell>
                              <TableCell>Bitcoin</TableCell>
                              <TableCell><Badge variant="secondary">Crypto</Badge></TableCell>
                              <TableCell className="text-right">0.5</TableCell>
                              <TableCell className="text-right">$88,468.74</TableCell>
                              <TableCell className="text-right font-bold">$44,234.37</TableCell>
                              <TableCell className="text-right text-green-600">+$24,234.37 (+121.2%)</TableCell>
                              <TableCell className="text-right">17.9%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                  <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm">1D</Button>
                        <Button variant="outline" size="sm">1W</Button>
                        <Button variant="outline" size="sm">1M</Button>
                        <Button variant="outline" size="sm">3M</Button>
                        <Button variant="default" size="sm">YTD</Button>
                        <Button variant="outline" size="sm">1Y</Button>
                        <Button variant="outline" size="sm">All</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Portfolio Performance Chart - Polygon Style */}
                      <div className="relative">
                        {/* Performance Summary */}
                        <div className="mb-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(portfolioPerformanceData[portfolioPerformanceData.length - 1].value)}
                            </span>
                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                              +{formatCurrency(portfolioPerformanceData[portfolioPerformanceData.length - 1].value - 250000)}
                            </span>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              +{((portfolioPerformanceData[portfolioPerformanceData.length - 1].value / 250000 - 1) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Portfolio Value</p>
                        </div>

                        {/* Actual Chart */}
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={portfolioPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                                strokeOpacity={0.3}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                dy={10}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                domain={[240000, 'dataMax']}
                                dx={-10}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  backdropFilter: 'blur(10px)',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                                }}
                                labelStyle={{ fontWeight: 600, color: '#111827' }}
                                formatter={(value: any, name: string) => {
                                  if (name === 'value') return [`${formatCurrency(value)}`, 'Portfolio'];
                                  if (name === 'benchmark') return [`${formatCurrency(value)}`, 'S&P 500'];
                                  return [value, name];
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="benchmark"
                                stroke="#6366f1"
                                strokeWidth={1.5}
                                fill="url(#benchmarkGradient)"
                                strokeDasharray="5 5"
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#portfolioGradient)"
                              />
                              <ReferenceLine
                                y={250000}
                                stroke="#9ca3af"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                label={{ value: "Initial", position: "left", fill: '#6b7280', fontSize: 11 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-6 mt-4 justify-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Your Portfolio</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">S&P 500 Benchmark</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Best Performer</p>
                          <p className="font-bold">BTC</p>
                          <p className="text-sm text-green-600">+121.2%</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Worst Performer</p>
                          <p className="font-bold">BND</p>
                          <p className="text-sm text-red-600">-5.0%</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</p>
                          <p className="font-bold">1.42</p>
                          <p className="text-sm text-gray-600">Good</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Beta</p>
                          <p className="font-bold">1.18</p>
                          <p className="text-sm text-gray-600">Moderate Risk</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-4">
                  <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">Portfolio Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Asset Allocation */}
                      <div>
                        <h3 className="font-semibold mb-3">Asset Allocation</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Stocks</span>
                              <span className="text-sm font-bold">55%</span>
                            </div>
                            <Progress value={55} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">ETFs</span>
                              <span className="text-sm font-bold">31%</span>
                            </div>
                            <Progress value={31} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Bonds</span>
                              <span className="text-sm font-bold">6%</span>
                            </div>
                            <Progress value={6} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Crypto</span>
                              <span className="text-sm font-bold">18%</span>
                            </div>
                            <Progress value={18} className="h-2" />
                          </div>
                        </div>
                      </div>

                      {/* Sector Allocation */}
                      <div>
                        <h3 className="font-semibold mb-3">Sector Allocation</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Technology</span>
                            <span className="text-sm font-bold">42%</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Consumer</span>
                            <span className="text-sm font-bold">18%</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Healthcare</span>
                            <span className="text-sm font-bold">12%</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Financial</span>
                            <span className="text-sm font-bold">10%</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Energy</span>
                            <span className="text-sm font-bold">8%</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">Other</span>
                            <span className="text-sm font-bold">10%</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Analysis */}
                      <div>
                        <h3 className="font-semibold mb-3">Risk Analysis</h3>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-amber-900 dark:text-amber-200">Moderate-High Risk Portfolio</p>
                              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                                Your portfolio has a beta of 1.18, indicating higher volatility than the market average. 
                                Consider adding more bonds or defensive stocks to reduce risk.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              {/* Privacy Notice */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-900 dark:text-green-200 font-medium">Your Privacy is Our Priority</p>
                    <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                      All user information in TrueFi.ai is encrypted, private, and secure. Only you can see your own information. 
                      We never share or sell your data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">About Me</h2>
                <Badge variant="default" className="px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Sample Profile
                </Badge>
              </div>

              <Tabs defaultValue="identity" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="identity">
                    <User className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Identity</span>
                  </TabsTrigger>
                  <TabsTrigger value="taxes">
                    <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Taxes</span>
                  </TabsTrigger>
                  <TabsTrigger value="risk">
                    <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Risk</span>
                  </TabsTrigger>
                  <TabsTrigger value="budgeting">
                    <Heart className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Budget</span>
                  </TabsTrigger>
                  <TabsTrigger value="debt">
                    <AlertCircle className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Debt</span>
                  </TabsTrigger>
                  <TabsTrigger value="investing">
                    <Globe className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Invest</span>
                  </TabsTrigger>
                  <TabsTrigger value="preferences">
                    <Settings className="h-4 w-4 mr-1 hidden sm:inline" />
                    <span className="text-xs">Prefs</span>
                  </TabsTrigger>
                </TabsList>

                {/* Identity & Locale Tab */}
                <TabsContent value="identity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Identity & Location</CardTitle>
                      <CardDescription>Basic information for personalized recommendations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <p className="font-medium mt-1">Sample</p>
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <p className="font-medium mt-1">User</p>
                        </div>
                        <div>
                          <Label>Country</Label>
                          <p className="font-medium mt-1">United States</p>
                        </div>
                        <div>
                          <Label>State/Province</Label>
                          <p className="font-medium mt-1">California</p>
                        </div>
                        <div>
                          <Label>City</Label>
                          <p className="font-medium mt-1">San Francisco</p>
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <p className="font-medium mt-1">94105</p>
                        </div>
                        <div>
                          <Label>Marital Status</Label>
                          <p className="font-medium mt-1">Married</p>
                        </div>
                        <div>
                          <Label>Dependents</Label>
                          <p className="font-medium mt-1">2</p>
                        </div>
                        <div>
                          <Label>Currency</Label>
                          <p className="font-medium mt-1">USD ($)</p>
                        </div>
                        <div>
                          <Label>Language</Label>
                          <p className="font-medium mt-1">English</p>
                        </div>
                        <div>
                          <Label>Timezone</Label>
                          <p className="font-medium mt-1">Pacific Time (PT)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Taxes Tab */}
                <TabsContent value="taxes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tax Information</CardTitle>
                      <CardDescription>Tax filing details for accurate calculations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Filing Status</Label>
                          <p className="font-medium mt-1">Married Filing Jointly</p>
                        </div>
                        <div>
                          <Label>Tax State</Label>
                          <p className="font-medium mt-1">California</p>
                        </div>
                        <div>
                          <Label>Federal Tax Rate</Label>
                          <p className="font-medium mt-1">24%</p>
                        </div>
                        <div>
                          <Label>State Tax Rate</Label>
                          <p className="font-medium mt-1">9.3%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Risk & Goals Tab */}
                <TabsContent value="risk" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Tolerance & Financial Goals</CardTitle>
                      <CardDescription>Your investment profile and objectives</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Risk Tolerance</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={70} className="flex-1" />
                          <span className="font-medium">7/10</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Moderate-Aggressive</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Investment Horizon</Label>
                          <p className="font-medium mt-1">Long-term (10+ years)</p>
                        </div>
                        <div>
                          <Label>Emergency Fund Target</Label>
                          <p className="font-medium mt-1">6 months of expenses</p>
                        </div>
                        <div>
                          <Label>Job Stability</Label>
                          <p className="font-medium mt-1">Very Stable</p>
                        </div>
                        <div>
                          <Label>Income Sources</Label>
                          <p className="font-medium mt-1">2 sources</p>
                        </div>
                        <div>
                          <Label>Liquid Cushion</Label>
                          <p className="font-medium mt-1">3-6 months</p>
                        </div>
                        <div>
                          <Label>Engagement Frequency</Label>
                          <p className="font-medium mt-1">Weekly</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Budgeting Tab */}
                <TabsContent value="budgeting" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Budgeting & Cash Flow</CardTitle>
                      <CardDescription>Income and spending management preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pay Schedule</Label>
                          <p className="font-medium mt-1">Bi-weekly</p>
                        </div>
                        <div>
                          <Label>Paycheck Day</Label>
                          <p className="font-medium mt-1">15th & 30th</p>
                        </div>
                        <div>
                          <Label>Budget Framework</Label>
                          <p className="font-medium mt-1">50/30/20 Rule</p>
                        </div>
                        <div>
                          <Label>Target Savings Rate</Label>
                          <p className="font-medium mt-1">25% of income</p>
                        </div>
                        <div>
                          <Label>Checking Buffer</Label>
                          <p className="font-medium mt-1">$2,000</p>
                        </div>
                        <div>
                          <Label>Auto-Budget</Label>
                          <p className="font-medium mt-1">Enabled</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Debt & Housing Tab */}
                <TabsContent value="debt" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Debt & Housing Profile</CardTitle>
                      <CardDescription>Housing status and debt management strategy</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Housing Status</Label>
                          <p className="font-medium mt-1">Homeowner</p>
                        </div>
                        <div>
                          <Label>Monthly Payment</Label>
                          <p className="font-medium mt-1">$3,500</p>
                        </div>
                        <div>
                          <Label>Debt Strategy</Label>
                          <p className="font-medium mt-1">Avalanche Method</p>
                        </div>
                        <div>
                          <Label>Extra Payment Target</Label>
                          <p className="font-medium mt-1">$500/month</p>
                        </div>
                        <div>
                          <Label>Student Loans</Label>
                          <p className="font-medium mt-1">In Repayment</p>
                        </div>
                        <div>
                          <Label>Prepay Mortgage</Label>
                          <p className="font-medium mt-1">Yes, when possible</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Investing Tab */}
                <TabsContent value="investing" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Investment Preferences</CardTitle>
                      <CardDescription>Your investing values and strategy</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Investment Style</Label>
                        <p className="font-medium mt-1">Growth-oriented with value picks</p>
                      </div>
                      <div>
                        <Label>Investment Values</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary">ESG Investing</Badge>
                          <Badge variant="secondary">Real Estate</Badge>
                          <Badge variant="secondary">Index Funds</Badge>
                          <Badge variant="secondary">Domestic Only</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label>Account Priority</Label>
                          <p className="font-medium mt-1">401(k) → IRA → Taxable</p>
                        </div>
                        <div>
                          <Label>Dividend Preference</Label>
                          <p className="font-medium mt-1">Reinvest automatically</p>
                        </div>
                        <div>
                          <Label>Rebalance Frequency</Label>
                          <p className="font-medium mt-1">Quarterly</p>
                        </div>
                        <div>
                          <Label>Rebalance Threshold</Label>
                          <p className="font-medium mt-1">5% deviation</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Preferences</CardTitle>
                      <CardDescription>Notifications and interaction settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Advice Style</Label>
                          <p className="font-medium mt-1">Detailed explanations</p>
                        </div>
                        <div>
                          <Label>Auto Allocation</Label>
                          <p className="font-medium mt-1">Enabled</p>
                        </div>
                        <div>
                          <Label>Allocation Frequency</Label>
                          <p className="font-medium mt-1">Monthly</p>
                        </div>
                        <div>
                          <Label>Notifications</Label>
                          <p className="font-medium mt-1">All enabled</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Notification Channels</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Email Notifications</span>
                            <Badge variant="secondary">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Push Notifications</span>
                            <Badge variant="secondary">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">SMS Alerts</span>
                            <Badge variant="outline">Disabled</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Note about sample data */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">Sample Profile Data</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                      This is example data showing what your complete profile will look like once you've connected your accounts and completed onboarding.
                    </p>
                  </div>
                </div>
              </div>
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
                    Get Started
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
