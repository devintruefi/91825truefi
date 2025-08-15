'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlobalHeader } from '@/components/global-header'
import { 
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
  Plus,
  Search,
  Filter,
  Trash2,
  Settings,
  Link,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronRight,
  Banknote,
  Wallet
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useUser } from '@/contexts/user-context'
import { useRouter } from 'next/navigation'
import { PlaidConnect } from '@/components/plaid-connect'
import { motion, AnimatePresence } from 'framer-motion'

interface Account {
  id: string
  name: string
  type: string
  subtype: string
  current_balance: number
  available_balance: number
  currency: string
  institution: string
  plaid_account_id: string
  mask?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface PlaidConnection {
  id: string
  institution_name: string
  plaid_item_id: string
  is_active: boolean
  created_at: string
  last_sync_at?: string
  accounts_count: number
}

export default function ManageAccountsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [plaidConnections, setPlaidConnections] = useState<PlaidConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showBalances, setShowBalances] = useState(true)
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null)
  const [deletingConnection, setDeletingConnection] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [financialData, connectionsData] = await Promise.all([
        apiClient.getFinancialData(user?.id || ''),
        apiClient.getPlaidConnections(user?.id || '')
      ])
      console.log('Financial data:', financialData)
      console.log('Accounts:', financialData.accounts)
      setAccounts(financialData.accounts)
      setPlaidConnections(connectionsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  const getAccountIcon = (type: string, subtype: string) => {
    switch (type) {
      case 'credit':
        return <CreditCard className="h-5 w-5" />
      case 'loan':
        if (subtype?.includes('student')) return <GraduationCap className="h-5 w-5" />
        if (subtype?.includes('mortgage')) return <Home className="h-5 w-5" />
        return <Building2 className="h-5 w-5" />
      case 'investment':
        return <TrendingUp className="h-5 w-5" />
      case 'depository':
      default:
        return <PiggyBank className="h-5 w-5" />
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
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getAccountStatus = (account: Account) => {
    if (!account.is_active) return { text: 'Inactive', color: 'bg-gray-100 text-gray-600' }
    if (parseFloat(account.current_balance?.toString() || '0') < 0) return { text: 'Overdrawn', color: 'bg-red-100 text-red-600' }
    return { text: 'Active', color: 'bg-green-100 text-green-600' }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.institution.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'All' || account.type === typeFilter.toLowerCase()
    return matchesSearch && matchesType
  })

  const handleDeleteAccount = async (accountId: string) => {
    try {
      setDeletingAccount(accountId)
      await apiClient.deleteAccount(accountId)
      setAccounts(prev => prev.filter(acc => acc.id !== accountId))
    } catch (err) {
      console.error('Failed to delete account:', err)
      setError('Failed to delete account')
    } finally {
      setDeletingAccount(null)
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      setDeletingConnection(connectionId)
      await apiClient.deletePlaidConnection(user?.id || '', connectionId)
      setPlaidConnections(prev => prev.filter(conn => conn.id !== connectionId))
      // Also remove associated accounts
      const connection = plaidConnections.find(conn => conn.id === connectionId)
      if (connection) {
        setAccounts(prev => prev.filter(acc => acc.institution !== connection.institution_name))
      }
    } catch (err) {
      console.error('Failed to delete connection:', err)
      setError('Failed to delete bank connection')
    } finally {
      setDeletingConnection(null)
    }
  }

  const handleRefreshData = async () => {
    try {
      setRefreshing(true)
      await loadData()
    } catch (err) {
      console.error('Failed to refresh data:', err)
      setError('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  const totalBalance = accounts.reduce((sum, account) => {
    console.log('Account:', account.name, 'Balance:', account.current_balance, 'Type:', typeof account.current_balance)
    const balance = parseFloat(account.current_balance?.toString() || '0')
    return sum + balance
  }, 0)
  console.log('Total balance calculation:', totalBalance)
  const activeAccounts = accounts.filter(acc => acc.is_active !== false)

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading your accounts...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Accounts
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Connect, view, and manage your bank accounts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
              >
                ← Back to Dashboard
              </Button>
              <Button
                onClick={handleRefreshData}
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                onClick={() => setShowBalances(!showBalances)}
                variant="outline"
                size="sm"
              >
                {showBalances ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showBalances ? 'Hide' : 'Show'} Balances
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
                    <p className="text-2xl font-bold">
                      {showBalances ? formatCurrency(totalBalance) : '••••••'}
                    </p>
                  </div>
                  <Banknote className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Accounts</p>
                    <p className="text-2xl font-bold">{activeAccounts.length}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connected Banks</p>
                    <p className="text-2xl font-bold">{plaidConnections.length}</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts">Accounts ({accounts.length})</TabsTrigger>
            <TabsTrigger value="connections">Bank Connections ({plaidConnections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6">
            {/* Connect New Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Connect New Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlaidConnect />
              </CardContent>
            </Card>

            {/* Accounts List */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Your Accounts</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="All">All Types</option>
                      <option value="depository">Checking/Savings</option>
                      <option value="credit">Credit Cards</option>
                      <option value="loan">Loans</option>
                      <option value="investment">Investments</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  {filteredAccounts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="text-gray-500 mb-2">
                        {accounts.length === 0 ? 'No accounts connected' : 'No accounts match your search'}
                      </div>
                      <p className="text-sm text-gray-400 mb-4">
                        {accounts.length === 0 
                          ? 'Connect your first bank account to get started.'
                          : 'Try adjusting your search or filters.'
                        }
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAccounts.map((account, index) => (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                                {getAccountIcon(account.type, account.subtype)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {account.name}
                                  </h3>
                                  {account.mask && (
                                    <span className="text-sm text-gray-500">••••{account.mask}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getAccountTypeColor(account.type)}>
                                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                                  </Badge>
                                  <Badge className={getAccountStatus(account).color}>
                                    {getAccountStatus(account).text}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {account.institution}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {showBalances ? formatCurrency(parseFloat(account.current_balance?.toString() || '0')) : '••••••'}
                                </p>
                                {parseFloat(account.available_balance?.toString() || '0') !== parseFloat(account.current_balance?.toString() || '0') && (
                                  <p className="text-sm text-gray-500">
                                    Available: {showBalances ? formatCurrency(parseFloat(account.available_balance?.toString() || '0')) : '••••••'}
                                  </p>
                                )}
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove "{account.name}" from your account? 
                                      This will also remove all associated transaction data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAccount(account.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deletingAccount === account.id}
                                    >
                                      {deletingAccount === account.id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                          Removing...
                                        </>
                                      ) : (
                                        'Remove Account'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Bank Connections
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your connected financial institutions
                </p>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  {plaidConnections.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="text-gray-500 mb-2">No bank connections</div>
                      <p className="text-sm text-gray-400">
                        Connect your first bank account to see it here.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {plaidConnections.map((connection, index) => (
                        <motion.div
                          key={connection.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {connection.institution_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={connection.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                                    {connection.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {connection.accounts_count} account{connection.accounts_count !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>Connected: {formatDate(connection.created_at)}</span>
                                  {connection.last_sync_at && (
                                    <span>Last sync: {formatDate(connection.last_sync_at)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRefreshData()}
                                disabled={refreshing}
                              >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Unlink className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Bank Connection</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove the connection to "{connection.institution_name}"? 
                                      This will remove all associated accounts and transaction data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteConnection(connection.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deletingConnection === connection.id}
                                    >
                                      {deletingConnection === connection.id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                          Removing...
                                        </>
                                      ) : (
                                        'Remove Connection'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 