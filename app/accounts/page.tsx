'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/navbar'
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
  Filter
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useUser } from '@/contexts/user-context'
import { useRouter } from 'next/navigation'

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

export default function AccountsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => {
    if (user?.id) {
      loadAccounts()
    }
  }, [user?.id])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const accountsData = await apiClient.getAccounts(user?.id || '')
      setAccounts(accountsData)
    } catch (err) {
      console.error('Failed to load accounts:', err)
      setError('Failed to load accounts')
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
      if (utilization > 0.8) return { status: 'High Utilization', color: 'text-red-600' }
      if (utilization > 0.5) return { status: 'Moderate Utilization', color: 'text-yellow-600' }
      return { status: 'Good Standing', color: 'text-green-600' }
    }
    
    if (account.type === 'loan') {
      return { status: 'Active Loan', color: 'text-blue-600' }
    }
    
    if (account.type === 'investment') {
      return { status: 'Active Investment', color: 'text-green-600' }
    }
    
    return { status: 'Active Account', color: 'text-green-600' }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.institution.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'All' || account.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalBalance = accounts.reduce((sum, account) => sum + account.current_balance, 0)
  const totalAvailable = accounts.reduce((sum, account) => sum + account.available_balance, 0)

  const accountTypes = Array.from(new Set(accounts.map(acc => acc.type)))

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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Error Loading Accounts</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadAccounts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen">
        <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Accounts</h1>
            <p className="text-gray-600">
              Manage and monitor all your connected financial accounts
            </p>
          </div>

          {/* Account Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {accounts.length} accounts
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
                  {formatCurrency(totalAvailable)}
                </div>
                <p className="text-xs text-muted-foreground">Liquid funds</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credit Used</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(accounts.filter(acc => acc.type === 'credit').reduce((sum, acc) => sum + acc.current_balance, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Credit accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(accounts.filter(acc => acc.type === 'loan').reduce((sum, acc) => sum + acc.current_balance, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Loan accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md text-sm bg-white dark:bg-gray-800"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="All">All Types</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((account) => {
              const accountStatus = getAccountStatus(account)
              return (
                <Card 
                  key={account.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/accounts/${account.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getAccountTypeColor(account.type)}`}>
                          {getAccountIcon(account.type, account.subtype)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                          <p className="text-sm text-gray-600">{account.institution}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Current Balance</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(account.current_balance)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {account.type === 'credit' ? 'Credit Limit' : 'Available'}
                        </span>
                        <span className="text-sm">
                          {formatCurrency(account.available_balance)}
                        </span>
                      </div>

                      {account.type === 'credit' && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Utilization</span>
                          <span className="text-sm">
                            {account.available_balance > 0
                              ? ((account.current_balance / account.available_balance) * 100).toFixed(1) + '%'
                              : 'N/A'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Badge className={getAccountTypeColor(account.type)}>
                          {account.type} • {account.subtype}
                        </Badge>
                        <span className={`text-xs ${accountStatus.color}`}>
                          {accountStatus.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredAccounts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 mb-2">No accounts found</div>
                <p className="text-sm text-gray-400 mb-4">
                  {accounts.length === 0 
                    ? 'Connect your bank account to see your accounts here.'
                    : 'Try adjusting your search or filters.'
                  }
                </p>
                {accounts.length === 0 && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Bank Account
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
} 