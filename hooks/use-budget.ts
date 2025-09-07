import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/user-context';
import { authenticatedFetch } from '@/lib/api-helpers';

interface BudgetCategory {
  id: string;
  category: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

interface Budget {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  amount: number;
  period?: string;
  start_date: string;
  end_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  budget_categories: BudgetCategory[];
}

interface UseBudgetReturn {
  budget: Budget | null;
  loading: boolean;
  error: string | null;
  updateBudget: (updates: Partial<Budget>) => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<BudgetCategory>) => Promise<void>;
  addCategory: (category: Omit<BudgetCategory, 'id'>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBudget(): UseBudgetReturn {
  const { user } = useUser();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/budgets/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget');
      }
      
      const data = await response.json();
      setBudget(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const updateBudget = useCallback(async (updates: Partial<Budget>) => {
    if (!user?.id || !budget) return;

    try {
      setError(null);
      
      const response = await authenticatedFetch(`/api/budgets/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          budget: { ...budget, ...updates },
          categories: budget.budget_categories
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update budget');
      }

      const data = await response.json();
      setBudget(data.budget);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [user?.id, budget]);

  const updateCategory = useCallback(async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (!user?.id) return;

    try {
      setError(null);
      
      const response = await authenticatedFetch(`/api/budgets/${user.id}/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const updatedCategory = await response.json();
      
      setBudget(prev => prev ? {
        ...prev,
        budget_categories: prev.budget_categories.map(cat =>
          cat.id === categoryId ? { ...cat, ...updatedCategory } : cat
        )
      } : null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [user?.id]);

  const addCategory = useCallback(async (category: Omit<BudgetCategory, 'id'>) => {
    if (!user?.id) return;

    try {
      setError(null);
      
      const response = await authenticatedFetch(`/api/budgets/${user.id}/categories`, {
        method: 'POST',
        body: JSON.stringify(category)
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      const newCategory = await response.json();
      
      setBudget(prev => prev ? {
        ...prev,
        budget_categories: [...prev.budget_categories, newCategory]
      } : null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [user?.id]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!user?.id) return;

    try {
      setError(null);
      
      const response = await authenticatedFetch(`/api/budgets/${user.id}/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      setBudget(prev => prev ? {
        ...prev,
        budget_categories: prev.budget_categories.filter(cat => cat.id !== categoryId)
      } : null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [user?.id]);

  return {
    budget,
    loading,
    error,
    updateBudget,
    updateCategory,
    addCategory,
    deleteCategory,
    refresh: fetchBudget
  };
} 