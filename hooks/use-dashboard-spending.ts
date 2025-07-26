import { useState, useEffect } from 'react';

interface DashboardSpendingData {
  spentByMain: {
    'Monthly Budget': number;
    'Essentials': number;
    'Lifestyle': number;
    'Savings': number;
  };
  month: string;
  transactionCount: number;
}

export function useDashboardSpending(userId: string | null) {
  const [data, setData] = useState<DashboardSpendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dashboard/spending/${userId}`);
      
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
  }, [userId]);

  const refresh = () => {
    fetchData();
  };

  return { data, loading, error, refresh };
} 