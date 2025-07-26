import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InteractiveGoalChart } from "@/components/interactive-goal-chart"
import { TrendingUp, AlertTriangle, CheckCircle, TrendingDown, DollarSign, Target, PiggyBank, Home, CreditCard, Building2, Smartphone, Star, Pin, Eye, Zap } from "lucide-react"
import { useState } from "react"

// Enhanced styling classes for the premium dashboard experience
const glassmorphismCard = "backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/20 shadow-[0_2px_16px_rgba(0,0,0,0.05),inset_0_0_0.5px_rgba(255,255,255,0.15)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_0_0.5px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_0_0.5px_rgba(255,255,255,0.2)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_0_0.5px_rgba(255,255,255,0.1)] transition-all duration-300 ease-in-out hover:scale-[1.02]"

const gradientText = "bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent"

const pulseGlow = "animate-pulse shadow-[0_0_20px_rgba(0,186,199,0.3)] dark:shadow-[0_0_20px_rgba(70,220,143,0.3)]"

const sampleAccounts = [
  { name: "Chase Total Checking", type: "Checking", balance: 8450.32, institution: "Chase Bank", icon: Building2, status: "healthy", color: "#0066CC" },
  { name: "Chase Sapphire Preferred", type: "Credit Card", balance: -2341.67, institution: "Chase Bank", icon: CreditCard, status: "caution", color: "#0066CC" },
  { name: "Ally High Yield Savings", type: "Savings", balance: 25000.0, institution: "Ally Bank", icon: PiggyBank, status: "excellent", color: "#FF6B35" },
  { name: "Fidelity 401(k)", type: "Retirement", balance: 45230.18, institution: "Fidelity", icon: Target, status: "healthy", color: "#00A651" },
  { name: "Coinbase Pro", type: "Crypto", balance: 3420.89, institution: "Coinbase", icon: Smartphone, status: "healthy", color: "#0052FF" },
  { name: "Amex Gold Card", type: "Credit Card", balance: -892.34, institution: "American Express", icon: CreditCard, status: "good", color: "#FF6600" },
];

const sampleTransactions = [
  { id: 1, date: "2024-01-15", description: "Whole Foods Market", category: "Food & Dining", amount: -89.32, account: "Chase Checking", icon: "🍎", trend: "+12%" },
  { id: 2, date: "2024-01-15", description: "Salary Deposit", category: "Income", amount: 3200.0, account: "Chase Checking", icon: "💰", trend: "on time" },
  { id: 3, date: "2024-01-14", description: "Shell Gas Station", category: "Transportation", amount: -45.67, account: "Chase Credit Card", icon: "⛽", trend: "-5%" },
  { id: 4, date: "2024-01-14", description: "Netflix Subscription", category: "Entertainment", amount: -15.99, account: "Chase Credit Card", icon: "📺", trend: "steady" },
  { id: 5, date: "2024-01-13", description: "Target", category: "Shopping", amount: -127.84, account: "Chase Credit Card", icon: "🛒", trend: "+8%" },
  { id: 6, date: "2024-01-13", description: "Electric Bill", category: "Utilities", amount: -98.45, account: "Chase Checking", icon: "💡", trend: "-2%" },
  { id: 7, date: "2024-01-12", description: "Starbucks", category: "Food & Dining", amount: -12.75, account: "Chase Credit Card", icon: "☕", trend: "+15%" },
  { id: 8, date: "2024-01-12", description: "Uber", category: "Transportation", amount: -23.5, account: "Chase Credit Card", icon: "🚗", trend: "+3%" },
  { id: 9, date: "2024-01-11", description: "Amazon Purchase", category: "Shopping", amount: -67.99, account: "Chase Credit Card", icon: "📦", trend: "+6%" },
  { id: 10, date: "2024-01-11", description: "Gym Membership", category: "Healthcare", amount: -49.99, account: "Chase Checking", icon: "💪", trend: "steady" },
];

const carGoalData = [
  { month: "Jan", current: 12000, projected: 12000 },
  { month: "Feb", current: 14500, projected: 14200 },
  { month: "Mar", current: 16800, projected: 16400 },
  { month: "Apr", current: 18200, projected: 18600 },
  { month: "May", current: 20500, projected: 20800 },
  { month: "Jun", current: 22800, projected: 23000 },
  { month: "Jul", current: 25200, projected: 25200 },
  { month: "Aug", current: 27500, projected: 27400 },
  { month: "Sep", current: 29800, projected: 29600 },
  { month: "Oct", current: 32000, projected: 31800 },
  { month: "Nov", current: 34200, projected: 34000 },
  { month: "Dec", current: 36500, projected: 36200 },
];
const homeGoalData = [
  { month: "2020", current: 45000, projected: 45000 },
  { month: "2021", current: 62000, projected: 60000 },
  { month: "2022", current: 78000, projected: 75000 },
  { month: "2023", current: 95000, projected: 90000 },
  { month: "2024", current: 109000, projected: 105000 },
];
const retirementGoalData = [
  { month: "Age 25", current: 15000, projected: 15000 },
  { month: "Age 30", current: 85000, projected: 80000 },
  { month: "Age 35", current: 180000, projected: 175000 },
  { month: "Age 40", current: 320000, projected: 315000 },
  { month: "Age 45", current: 520000, projected: 510000 },
  { month: "Age 50", current: 780000, projected: 770000 },
  { month: "Age 55", current: 1100000, projected: 1080000 },
  { month: "Age 60", current: 1500000, projected: 1480000 },
];

const sampleInvestmentPortfolio = {
  totalValue: 187000,
  performance: 12,
  holdings: [
    { name: "Company Stock", value: 92000, performance: 4.2 },
    { name: "Stocks & ETFs", value: 30000, performance: 2.5 },
    { name: "401(k)", value: 20000, performance: 1.5 },
    { name: "Cash Savings", value: 25000, performance: 0.3 },
  ],
  individualStocks: [
    { symbol: "AAPL", name: "Apple Inc.", shares: 25, price: 185.92, value: 4648, percentage: 15.5, change: 2.3, pinned: true, star: true },
    { symbol: "MSFT", name: "Microsoft Corp.", shares: 18, price: 378.85, value: 6819.3, percentage: 22.7, change: 1.8, pinned: false, star: false },
    { symbol: "GOOGL", name: "Alphabet Inc.", shares: 12, price: 142.56, value: 1710.72, percentage: 5.7, change: -0.9, pinned: false, star: false },
    { symbol: "TSLA", name: "Tesla Inc.", shares: 8, price: 248.42, value: 1987.36, percentage: 6.6, change: 4.2, pinned: true, star: false },
    { symbol: "AMZN", name: "Amazon.com Inc.", shares: 15, price: 155.89, value: 2338.35, percentage: 7.8, change: 0.7, pinned: false, star: false },
    { symbol: "NVDA", name: "NVIDIA Corp.", shares: 6, price: 722.48, value: 4334.88, percentage: 14.4, change: 3.1, pinned: false, star: true },
    { symbol: "SPY", name: "SPDR S&P 500 ETF", shares: 45, price: 478.23, value: 21520.35, percentage: 71.7, change: 1.2, pinned: false, star: false },
    { symbol: "VTI", name: "Vanguard Total Stock", shares: 35, price: 245.67, value: 8598.45, percentage: 28.7, change: 0.8, pinned: false, star: false },
  ],
};

export function DashboardContent() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 space-y-8">
      {/* Dynamic Greeting Header */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-light ${gradientText} mb-2`}>
          Hello Alex!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-light">
          You're <span className="font-semibold text-green-600 dark:text-green-400">$2.4K ahead</span> of your quarterly savings goal 🎯
        </p>
      </div>

      {/* Budget Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`${glassmorphismCard} ${hoveredCard === 'budget' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('budget')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Budget</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">💰</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$7,500</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current month breakdown</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 dark:text-green-400">🔺 Dining +12%</span>
              <span className="text-blue-600 dark:text-blue-400">🧠 3% under typical Essentials</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} ${hoveredCard === 'essentials' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('essentials')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Essentials</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">🏠</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$3,300</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Rent, utilities, groceries</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 dark:text-green-400">✅ On track</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} ${hoveredCard === 'lifestyle' ? pulseGlow : ''}`}
              onMouseEnter={() => setHoveredCard('lifestyle')}
              onMouseLeave={() => setHoveredCard(null)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Lifestyle</CardTitle>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">🎯</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$1,250</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Entertainment, dining, travel</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-orange-600 dark:text-orange-400">⚠️ 8% over budget</span>
            </div>
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
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">$1,500</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Emergency fund & investments</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 dark:text-green-400">🚀 15% ahead of goal</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className={`${glassmorphismCard} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-400/20 dark:to-blue-400/20"></div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚗</span>
                Car Purchase
              </div>
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">55%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">$30,000</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Target amount</p>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative">
              <Progress value={55} className="w-full h-3 bg-gray-200 dark:bg-gray-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full h-3 transition-all duration-1000 ease-out" style={{ width: '55%' }}></div>
              <div className="absolute -top-1 left-[55%] w-2 h-5 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-cyan-500"></div>
            </div>
            
            <div className="hidden sm:block">
              <InteractiveGoalChart data={carGoalData} title="Car Purchase Progress" target={30000} color="#06b6d4" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">55% toward goal, estimated completion in 11 months</p>
            
            {/* Milestone Markers */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Start</span>
              <span>Halfway</span>
              <span>Goal</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-400/20 dark:to-emerald-400/20"></div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏠</span>
                Home Purchase
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">100%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">$109,000</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Target amount</p>
            </div>
            
            {/* Success Animation */}
            <div className="relative">
              <Progress value={100} className="w-full h-3 bg-gray-200 dark:bg-gray-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full h-3 animate-pulse"></div>
            </div>
            
            <div className="hidden sm:block">
              <InteractiveGoalChart data={homeGoalData} title="Home Purchase Progress" target={109000} color="#10b981" />
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4 animate-bounce" />
              <span className="font-medium">Goal met with successful purchase! 🎉</span>
            </div>
            
            {/* Success Celebration */}
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassmorphismCard} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-400/20 dark:to-pink-400/20"></div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌅</span>
                Retirement
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">75%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">$2M</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Target amount</p>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative">
              <Progress value={75} className="w-full h-3 bg-gray-200 dark:bg-gray-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-3 transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
              <div className="absolute -top-1 left-[75%] w-2 h-5 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-purple-500"></div>
            </div>
            
            <div className="hidden sm:block">
              <InteractiveGoalChart data={retirementGoalData} title="Retirement Progress" target={2000000} color="#8b5cf6" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">On track for retirement at 60 with 5-7% annual return</p>
            
            {/* AI Insight */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 mt-2">
              <p className="text-xs text-purple-700 dark:text-purple-300">
                🧠 AI Suggestion: Boost retirement $200/mo based on your cash flow
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Overview - Enhanced */}
      <Card className={`${glassmorphismCard} hover:scale-[1.01] transition-all duration-300`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              Investment Overview
            </div>
            <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{sampleInvestmentPortfolio.performance}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">${sampleInvestmentPortfolio.totalValue.toLocaleString()}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total portfolio value</p>
            </div>
            
            {/* Enhanced Holdings Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Holding</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Value</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleInvestmentPortfolio.holdings.map((holding, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{holding.name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm text-gray-900 dark:text-white">${holding.value.toLocaleString()}</TableCell>
                      <TableCell className={`text-right text-xs sm:text-sm font-medium flex items-center justify-end gap-1 ${holding.performance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {holding.performance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {holding.performance >= 0 ? '+' : ''}{holding.performance}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Enhanced Individual Stocks Table */}
            <div className="pt-4">
              <div className="font-semibold mb-4 text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <span>📊</span>
                Individual Stocks & ETFs
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-700">
                      <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Company</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Shares</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Price</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Value</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">% Portfolio</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleInvestmentPortfolio.individualStocks.map((stock, idx) => (
                      <TableRow key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <TableCell className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {stock.pinned && <Pin className="w-3 h-3 text-yellow-500" />}
                            {stock.star && <Star className="w-3 h-3 text-yellow-400 animate-pulse" />}
                            {stock.symbol}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-white">{stock.name}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-gray-900 dark:text-white">{stock.shares}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-gray-900 dark:text-white">${stock.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm text-gray-900 dark:text-white">${stock.value.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-gray-900 dark:text-white">{stock.percentage}%</TableCell>
                        <TableCell className={`text-right font-medium text-xs sm:text-sm flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stock.change >= 0 ? '+' : ''}{stock.change}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Overview - Enhanced */}
      <Card className={`${glassmorphismCard} hover:scale-[1.01] transition-all duration-300`}>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">🏦</span>
            Accounts Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Account</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Institution</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleAccounts.map((account, index) => {
                  const IconComponent = account.icon;
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'excellent': return 'text-green-600 dark:text-green-400';
                      case 'healthy': return 'text-green-600 dark:text-green-400';
                      case 'good': return 'text-blue-600 dark:text-blue-400';
                      case 'caution': return 'text-orange-600 dark:text-orange-400';
                      default: return 'text-gray-600 dark:text-gray-400';
                    }
                  };
                  const getStatusText = (status: string) => {
                    switch (status) {
                      case 'excellent': return '✅ Excellent';
                      case 'healthy': return '✅ All good';
                      case 'good': return '✅ Good';
                      case 'caution': return '⚠️ Near limit';
                      default: return 'ℹ️ Normal';
                    }
                  };
                  
                  return (
                    <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                            <IconComponent className="h-4 w-4" style={{ color: account.color }} />
                          </div>
                          <span className="text-xs sm:text-sm text-gray-900 dark:text-white">{account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-white">{account.type}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-white">{account.institution}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-medium text-xs sm:text-sm ${account.balance < 0 ? "text-red-600 dark:text-red-400" : getStatusColor(account.status)}`}>
                            ${Math.abs(account.balance).toLocaleString()}
                          </span>
                          <span className={`text-xs ${getStatusColor(account.status)}`}>
                            {getStatusText(account.status)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions - Enhanced */}
      <Card className={`${glassmorphismCard} hover:scale-[1.01] transition-all duration-300`}>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">📅</span>
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Description</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Account</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-white">{transaction.date}</TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{transaction.icon}</span>
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-white">{transaction.account}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-medium text-xs sm:text-sm ${transaction.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {transaction.amount < 0 ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.trend}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Notifications - Enhanced */}
      <Card className={`${glassmorphismCard} hover:scale-[1.01] transition-all duration-300`}>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">🧠</span>
            Smart Insights & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Monthly Spending Alert</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Food & Dining Alert: Spending increased due to Cabo trip; current budget unaffected.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-700 dark:text-yellow-300">🔥 Overspending detected</span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-500 dark:text-gray-400">Tap to dismiss</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Savings Reminder</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {"You're"} on track to meet the quarterly savings goal!
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-700 dark:text-green-300">✅ Goal achieved</span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-500 dark:text-gray-400">Keep it up!</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Budget Update Suggestions</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Expense Adjustments: Suggests $100 monthly savings on dining out to redirect to long-term savings.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-700 dark:text-blue-300">🧠 AI Suggestion</span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-500 dark:text-gray-400">Tap to apply</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer group">
          <div className="relative">
            <span className="text-white text-lg">🤖</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Ask Penny anything
          </div>
        </div>
      </div>
    </div>
  )
}
