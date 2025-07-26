import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/api-client';

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UsePaginatedTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  pagination: PaginationInfo;
  loadMore: () => Promise<void>;
  refresh: () => void;
  search: (term: string) => void;
  searchTerm: string;
}

export function usePaginatedTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!userId) return;
    
    const isInitialLoad = offset === 0;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const response = await fetch(`/api/financial-data/${userId}?limit=10&offset=${offset}&includeTransactions=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      
      if (append) {
        setTransactions(prev => [...prev, ...data.recent_transactions]);
      } else {
        setTransactions(data.recent_transactions);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (pagination.hasMore && !loadingMore) {
      await fetchTransactions(pagination.offset + pagination.limit, true);
    }
  }, [pagination, loadingMore, fetchTransactions]);

  const refresh = useCallback(() => {
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  useEffect(() => {
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    
    return transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return {
    transactions: filteredTransactions,
    loading,
    loadingMore,
    error,
    pagination,
    loadMore,
    refresh,
    search,
    searchTerm
  };
}

// Keep the old interface for backward compatibility
export function useTransactions() {
  return usePaginatedTransactions(null);
} 