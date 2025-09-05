import { useState, useEffect } from 'react';

interface DashboardSpendingData {
  spentByMain: {
    'Monthly Budget': number;
    'Essentials': number;
    'Lifestyle': number;
    'Savings': number;
  };
  totalIncome: number;
  totalSpending: number;
  savingsRate: number;
  cashFlow: number;
  month: string;
  transactionCount: number;
  incomeSource?: 'recurring_income' | 'transactions';
  incomeDetails?: {
    recurring: number;
    transactionBased: number;
    incomeTransactionCount: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
}

export function useDashboardSpending(userId: string | null, dateRange: string = '30') {
  const [data, setData] = useState<DashboardSpendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dashboard/spending/${userId}?days=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard spending data');
      }
      
      const spendingData = await response.json();
      setData(spendingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard spending data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, dateRange]); // Add dateRange as dependency

  const refresh = () => {
    fetchData();
  };

  return { data, loading, error, refresh };
} 