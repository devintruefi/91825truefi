'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/navbar'
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Tag,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Edit3,
  Check,
  X
} from 'lucide-react'
import { useUser } from '@/contexts/user-context'
import { useFinancialData } from '@/hooks/use-financial-data'
import { apiClient } from '@/lib/api-client'
import { CATEGORY_META } from '@/utils/category-meta'

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

export default function TransactionsPage() {
  const { user } = useUser()
  const { data: financialData, loading, error, refresh } = useFinancialData(user?.id || '')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [dateFilter, setDateFilter] = useState<string>('All')
  const [amountFilter, setAmountFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState('')
  const [updatingTransaction, setUpdatingTransaction] = useState<string | null>(null)
  const [applyToSimilar, setApplyToSimilar] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  
  const transactions = financialData?.recent_transactions || []
  const itemsPerPage = 20

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category || 'Uncategorized')))

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'All' || transaction.category === categoryFilter
      
      const matchesDate = dateFilter === 'All' || (() => {
        const transactionDate = new Date(transaction.date)
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        
        switch (dateFilter) {
          case 'Last 30 days':
            return transactionDate >= thirtyDaysAgo
          case 'Last 90 days':
            return transactionDate >= ninetyDaysAgo
          case 'This month':
            return transactionDate.getMonth() === now.getMonth() && 
                   transactionDate.getFullYear() === now.getFullYear()
          case 'Last month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            return transactionDate >= lastMonth && transactionDate <= lastMonthEnd
          default:
            return true
        }
      })()
      
      const matchesAmount = amountFilter === 'All' || (() => {
        const amount = Math.abs(transaction.amount)
        switch (amountFilter) {
          case 'Under $50':
            return amount < 50
          case '$50 - $200':
            return amount >= 50 && amount <= 200
          case '$200 - $500':
            return amount > 200 && amount <= 500
          case 'Over $500':
            return amount > 500
          default:
            return true
        }
      })()
      
      return matchesSearch && matchesCategory && matchesDate && matchesAmount
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, dateFilter, amountFilter])

  const handleSort = (field: 'date' | 'amount' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Name', 'Amount', 'Category', 'Account', 'Pending'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        `"${t.name}"`,
        t.amount,
        t.category || 'Uncategorized',
        t.account_name || 'Unknown',
        t.pending ? 'Yes' : 'No'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Category editing functions
  const startEditing = (transaction: Transaction) => {
    setEditingTransaction(transaction.id)
    setEditingCategory(transaction.category || 'Uncategorized')
  }

  const cancelEditing = () => {
    setEditingTransaction(null)
    setEditingCategory('')
    setApplyToSimilar(false)
  }

  const saveCategory = async (transactionId: string) => {
    if (!editingCategory.trim()) return
    
    setUpdatingTransaction(transactionId)
    setBulkUpdating(applyToSimilar)
    
    try {
      // Find the transaction to get merchant name
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (applyToSimilar && transaction.merchant_name) {
        // Bulk update similar transactions
        const result = await apiClient.bulkUpdateSimilarTransactions(
          user?.id || '',
          transaction.merchant_name,
          editingCategory
        )
        
        // Refresh data to show all updates
        refresh()
        
        // Show success message
        alert(`Updated ${result.updated_count} similar transactions!`)
      } else {
        // Single transaction update
        await apiClient.updateTransactionCategory(transactionId, editingCategory)
        
        // Update the local state
        const updatedTransactions = transactions.map(t => 
          t.id === transactionId 
            ? { ...t, category: editingCategory }
            : t
        )
        
        // Update the financial data context
        if (financialData) {
          const updatedFinancialData = {
            ...financialData,
            recent_transactions: updatedTransactions
          }
          // Note: In a real app, you'd want to update the context properly
          // For now, we'll just refresh the data
          refresh()
        }
      }
      
      setEditingTransaction(null)
      setEditingCategory('')
      setApplyToSimilar(false)
    } catch (error) {
      console.error('Failed to update category:', error)
      alert('Failed to update category. Please try again.')
    } finally {
      setUpdatingTransaction(null)
      setBulkUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">Error Loading Transactions</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen">
        <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Transactions</h1>
            <p className="text-gray-600">
              View and manage your financial transactions across all connected accounts
            </p>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="All">All Time</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="This month">This month</option>
                  <option value="Last month">Last month</option>
                </select>

                {/* Amount Filter */}
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="All">All Amounts</option>
                  <option value="Under $50">Under $50</option>
                  <option value="$50 - $200">$50 - $200</option>
                  <option value="$200 - $500">$200 - $500</option>
                  <option value="Over $500">Over $500</option>
                </select>

                {/* Export Button */}
                <Button onClick={exportTransactions} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </div>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Transactions
            </Button>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Date
                          {sortBy === 'date' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Description
                          {sortBy === 'name' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('amount')}>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Amount
                          {sortBy === 'amount' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          Category
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedTransactions.map((transaction) => {
                      const meta = CATEGORY_META[transaction.category] || CATEGORY_META['Uncategorized']
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                            <div>
                              <div className="font-medium">{transaction.name}</div>
                              {transaction.pending && (
                                <div className="text-xs text-orange-600">Pending</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {editingTransaction === transaction.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}>
                                    {meta.icon}
                                  </div>
                                  <select
                                    value={editingCategory}
                                    onChange={(e) => setEditingCategory(e.target.value)}
                                    className="border rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 min-w-[120px]"
                                    disabled={updatingTransaction === transaction.id || bulkUpdating}
                                  >
                                    {Object.keys(CATEGORY_META).map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => saveCategory(transaction.id)}
                                      disabled={updatingTransaction === transaction.id || bulkUpdating}
                                      className="h-6 w-6 p-0"
                                    >
                                      {updatingTransaction === transaction.id || bulkUpdating ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                      ) : (
                                        <Check className="h-3 w-3 text-green-600" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelEditing}
                                      disabled={updatingTransaction === transaction.id || bulkUpdating}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    id={`apply-similar-${transaction.id}`}
                                    checked={applyToSimilar}
                                    onChange={(e) => setApplyToSimilar(e.target.checked)}
                                    disabled={updatingTransaction === transaction.id || bulkUpdating}
                                    className="rounded border-gray-300"
                                  />
                                  <label 
                                    htmlFor={`apply-similar-${transaction.id}`}
                                    className="text-gray-600 dark:text-gray-400 cursor-pointer"
                                  >
                                    Apply to all similar transactions
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}>
                                  {meta.icon}
                                </div>
                                <span className="text-sm capitalize">{transaction.category || 'Uncategorized'}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(transaction)}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit3 className="h-3 w-3 text-gray-400" />
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {transaction.account_name || 'Unknown Account'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {transaction.pending ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Posted
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {paginatedTransactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-2">No transactions found</div>
                  <p className="text-sm text-gray-400 mb-4">
                    {filteredTransactions.length === 0 && transactions.length > 0 
                      ? 'Try adjusting your filters to see more results.'
                      : 'Connect your bank account to see your transactions here.'
                    }
                  </p>
                  {transactions.length === 0 && (
                    <Button onClick={refresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Transactions
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 