import { useState, useEffect } from 'react';
import { apiClient, FinancialData } from '@/lib/api-client';

export function useFinancialData(userId: string | null) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const financialData = await apiClient.getFinancialData(userId);
      setData(financialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
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