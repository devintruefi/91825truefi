'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/navbar'
import { 
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  PiggyBank,
  Home,
  GraduationCap,
  Building2,
  RefreshCw,
  Download,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useUser } from '@/contexts/user-context'
import { CATEGORY_META } from '@/utils/category-meta'

interface Account {
  id: string
  name: string
  type: string
  subtype: string
  current_balance: number
  available_balance: number
  currency: string
  institution: string
}

interface Transaction {
  id: string
  amount: number
  name: string
  merchant_name?: string
  category: string
  date: string
  pending: boolean
  account_name?: string
}

export default function AccountPage() {
  const params = useParams()
  const { user } = useUser()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const accountId = params.accountId as string

  useEffect(() => {
    if (user?.id && accountId) {
      loadAccountData()
    }
  }, [user?.id, accountId])

  const loadAccountData = async () => {
    try {
      setLoading(true)
      // Get account details
      const accounts = await apiClient.getAccounts(user?.id || '')
      const foundAccount = accounts.find(acc => acc.id === accountId)
      
      if (!foundAccount) {
        setError('Account not found')
        return
      }
      
      setAccount(foundAccount)
      
      // Get transactions for this account
      const allTransactions = await apiClient.getTransactions(user?.id || '', 100, 0)
      const accountTransactions = allTransactions.filter(t => t.account_name === foundAccount.name)
      setTransactions(accountTransactions)
      
    } catch (err) {
      console.error('Failed to load account data:', err)
      setError('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  const getAccountIcon = (type: string, subtype: string) => {
    switch (type) {
      case 'credit':
        return <CreditCard className="h-6 w-6" />
      case 'loan':
        if (subtype?.includes('student')) return <GraduationCap className="h-6 w-6" />
        if (subtype?.includes('mortgage')) return <Home className="h-6 w-6" />
        return <Building2 className="h-6 w-6" />
      case 'investment':
        return <TrendingUp className="h-6 w-6" />
      case 'depository':
      default:
        return <PiggyBank className="h-6 w-6" />
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'loan':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'investment':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'depository':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getAccountStatus = (account: Account) => {
    if (account.type === 'credit') {
      const utilization = account.available_balance > 0 ? account.current_balance / account.available_balance : 0
      if (utilization > 0.8) return { status: 'High Utilization', color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> }
      if (utilization > 0.5) return { status: 'Moderate Utilization', color: 'text-yellow-600', icon: <Clock className="h-4 w-4" /> }
      return { status: 'Good Standing', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> }
    }
    
    if (account.type === 'loan') {
      return { status: 'Active Loan', color: 'text-blue-600', icon: <Building2 className="h-4 w-4" /> }
    }
    
    if (account.type === 'investment') {
      return { status: 'Active Investment', color: 'text-green-600', icon: <TrendingUp className="h-4 w-4" /> }
    }
    
    return { status: 'Active Account', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Account Not Found</h3>
          <p className="text-gray-600 mb-4">{error || 'The requested account could not be found.'}</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const accountStatus = getAccountStatus(account)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen">
        <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-lg ${getAccountTypeColor(account.type)}`}>
                {getAccountIcon(account.type, account.subtype)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{account.name}</h1>
                <p className="text-gray-600">{account.institution}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className={getAccountTypeColor(account.type)}>
                {account.type} • {account.subtype}
              </Badge>
              <div className={`flex items-center gap-1 ${accountStatus.color}`}>
                {accountStatus.icon}
                <span className="text-sm">{accountStatus.status}</span>
              </div>
            </div>
          </div>

          {/* Account Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(account.current_balance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {account.type === 'credit' ? 'Credit Used' : 'Total Balance'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(account.available_balance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {account.type === 'credit' ? 'Credit Limit' : 'Available Funds'}
                </p>
              </CardContent>
            </Card>

            {account.type === 'credit' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {account.available_balance > 0
                      ? ((account.current_balance / account.available_balance) * 100).toFixed(1) + '%'
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(account.current_balance)} of {formatCurrency(account.available_balance)}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transactions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadAccountData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction) => {
                    const meta = CATEGORY_META[transaction.category] || CATEGORY_META['Uncategorized']
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <div className="font-medium">{transaction.name}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                          {transaction.pending && (
                            <div className="text-xs text-orange-600">Pending</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">No transactions found</div>
                  <p className="text-sm text-gray-400">
                    This account has no recent transactions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 