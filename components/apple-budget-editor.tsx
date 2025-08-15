import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit3, Save, X, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { useBudget } from '@/hooks/use-budget';
import { useUser } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyDetailed = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface BudgetSpending {
  id: string;
  category_id: string;
  category_name: string;
  budget_amount: number;
  actual_amount: number;
  manual_amount: number;
  transaction_amount: number;
  month: number;
  year: number;
}

interface AppleBudgetEditorProps {
  className?: string;
}

const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color = '#007AFF' }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

export function AppleBudgetEditor({ className }: AppleBudgetEditorProps) {
  const { budget, loading, error, updateBudget, updateCategory, addCategory, deleteCategory } = useBudget();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ category: string; amount: string }>({ category: '', amount: '' });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ category: '', amount: '' });
  const [budgetSpending, setBudgetSpending] = useState<BudgetSpending[]>([]);
  const [loadingSpending, setLoadingSpending] = useState(false);
  const [editingSpending, setEditingSpending] = useState<string | null>(null);
  const [manualSpending, setManualSpending] = useState<{ [key: string]: string }>({});

  const fetchBudgetSpending = useCallback(async () => {
    if (!user?.id || !budget?.budget_categories) return;

    try {
      setLoadingSpending(true);
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/budgets/${user.id}/spending?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch budget spending');
      }
      
      const data = await response.json();
      console.log('Budget spending data received:', data);
      setBudgetSpending(data);
    } catch (err) {
      console.log('Error fetching budget spending:', err);
    } finally {
      setLoadingSpending(false);
    }
  }, [user?.id, budget?.budget_categories]);

  useEffect(() => {
    fetchBudgetSpending();
  }, [fetchBudgetSpending]);
  
  // If no spending data, show default categories
  const displayCategories = budgetSpending.length > 0 ? budgetSpending : [
    { id: 'auto_groceries', category_id: 'auto_groceries', category_name: 'Groceries', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_dining', category_id: 'auto_dining', category_name: 'Dining & Restaurants', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_transportation', category_id: 'auto_transportation', category_name: 'Transportation', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_shopping', category_id: 'auto_shopping', category_name: 'Shopping', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_entertainment', category_id: 'auto_entertainment', category_name: 'Entertainment', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_utilities', category_id: 'auto_utilities', category_name: 'Utilities', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_healthcare', category_id: 'auto_healthcare', category_name: 'Healthcare', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_travel', category_id: 'auto_travel', category_name: 'Travel', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { id: 'auto_other', category_id: 'auto_other', category_name: 'Other Expenses', budget_amount: 0, actual_amount: 0, manual_amount: 0, transaction_amount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
  ];

  const handleEditCategory = useCallback((category: any) => {
    setEditingCategory(category.id);
    setEditingValues({
      category: category.category,
      amount: category.amount.toString()
    });
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!editingCategory) return;

    try {
      await updateCategory(editingCategory, {
        category: editingValues.category,
        amount: parseFloat(editingValues.amount) || 0
      });
      
      setEditingCategory(null);
      toast({
        title: "Category updated",
        description: "Your budget category has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    }
  }, [editingCategory, editingValues, updateCategory, toast]);

  const handleAddCategory = useCallback(async () => {
    if (!newCategory.category || !newCategory.amount) return;

    try {
      await addCategory({
        category: newCategory.category,
        amount: parseFloat(newCategory.amount) || 0
      });
      
      setNewCategory({ category: '', amount: '' });
      setIsAddingCategory(false);
      toast({
        title: "Category added",
        description: "New budget category has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      });
    }
  }, [newCategory, addCategory, toast]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      toast({
        title: "Category deleted",
        description: "Budget category has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    }
  }, [deleteCategory, toast]);

  const handleSaveBudgetAmount = useCallback(async (categoryId: string, amount: string) => {
    if (!user?.id) return;
    
    const categoryName = displayCategories.find(c => c.category_id === categoryId)?.category_name || '';
    console.log('Saving budget amount for category:', categoryId, 'name:', categoryName, 'amount:', amount);
    
    try {
      const token = localStorage.getItem('auth_token');
      const budgetAmount = parseFloat(amount) || 0;
      
      // For auto categories, we need to create/update the budget category
      const response = await fetch(`/api/budgets/${user.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: categoryName,
          amount: budgetAmount
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save budget amount:', errorText);
        throw new Error(`Failed to save budget: ${errorText}`);
      }

      const result = await response.json();
      console.log('Budget saved successfully:', result);
      
      await fetchBudgetSpending();
      setEditingCategory(null);
      toast({
        title: "Budget updated",
        description: "Category budget has been set successfully.",
      });
    } catch (error) {
      console.error('Error saving budget amount:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update budget. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.id, displayCategories, fetchBudgetSpending, toast]);

  const handleUpdateManualSpending = useCallback(async (categoryId: string) => {
    if (!user?.id) return;

    const amount = parseFloat(manualSpending[categoryId] || '0');
    if (isNaN(amount)) return;

    console.log('Updating manual spending for category:', categoryId, 'amount:', amount);

    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/budgets/${user.id}/spending`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: categoryId,
          manual_amount: amount,
          month,
          year
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update spending:', errorText);
        throw new Error(`Failed to update spending: ${errorText}`);
      }

      const result = await response.json();
      console.log('Manual spending updated successfully:', result);

      await fetchBudgetSpending();
      setEditingSpending(null);
      setManualSpending(prev => ({ ...prev, [categoryId]: '' }));
      
      toast({
        title: "Cash spending added",
        description: "Your manual spending has been recorded.",
      });
    } catch (error) {
      console.error('Error updating manual spending:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update spending. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.id, manualSpending, fetchBudgetSpending, toast]);

  const getSpendingForCategory = (categoryId: string): BudgetSpending | null => {
    return budgetSpending.find(s => s.category_id === categoryId) || null;
  };

  // For automatic mapping, budget data comes from spending API, not budget categories
  const totalBudget = displayCategories.reduce((sum, spending) => sum + spending.budget_amount, 0);
  const totalSpent = displayCategories.reduce((sum, spending) => sum + spending.actual_amount, 0);
  const overallPercentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/4 mb-3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to load budget</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Overview</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Track your spending against your budget</p>
              </div>
            </div>
            
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-2xl px-6 py-3 font-medium shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Add Budget Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="category-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategory.category}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Groceries"
                      className="mt-2 rounded-2xl border-gray-200 dark:border-gray-700 px-4 py-3 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Budget</Label>
                    <Input
                      id="category-amount"
                      type="number"
                      value={newCategory.amount}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      step="0.01"
                      className="mt-2 rounded-2xl border-gray-200 dark:border-gray-700 px-4 py-3 text-base"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleAddCategory} 
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-2xl py-3 font-medium"
                    >
                      Add Category
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingCategory(false)} 
                      className="flex-1 rounded-2xl border-gray-200 dark:border-gray-700 py-3 font-medium"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <CircularProgress 
                  percentage={overallPercentage} 
                  size={56} 
                  color={overallPercentage > 100 ? '#EF4444' : overallPercentage > 80 ? '#F59E0B' : '#10B981'} 
                />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">of {formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Budget</p>
                <TrendingUp className={`w-4 h-4 ${totalBudget - totalSpent >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totalBudget - totalSpent)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {totalSpent <= totalBudget ? 'Under budget' : 'Over budget'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Categories</p>
                <Badge variant="secondary" className="rounded-full">
                  {displayCategories.length}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayCategories.filter(spending => spending.actual_amount > 0).length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">with spending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="p-8">
        <div className="space-y-6">
          {displayCategories.map((spending) => {
            const amount = spending.budget_amount;
            const actualSpent = spending.actual_amount;
            const transactionSpent = spending.transaction_amount;
            const manualSpent = spending.manual_amount;
            const percentage = amount > 0 ? Math.min((actualSpent / amount) * 100, 100) : 0;
            const isOverBudget = actualSpent > amount && amount > 0;
            const remaining = amount - actualSpent;
            
            return (
              <div key={spending.id} className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-sm">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {editingCategory === spending.category_id ? (
                      <div className="flex items-center gap-3">
                        <Input
                          value={editingValues.category}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, category: e.target.value }))}
                          className="w-48 rounded-xl border-gray-200 dark:border-gray-600 px-3 py-2"
                          disabled
                        />
                        <Input
                          type="number"
                          value={editingValues.amount}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-32 rounded-xl border-gray-200 dark:border-gray-600 px-3 py-2"
                          step="0.01"
                          placeholder="Budget"
                        />
                        <Button size="sm" onClick={() => handleSaveBudgetAmount(spending.category_id, editingValues.amount)} className="rounded-xl bg-green-600 hover:bg-green-700">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)} className="rounded-xl">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{spending.category_name}</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Budget: {amount > 0 ? formatCurrency(amount) : 'Not set'}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            Spent: {formatCurrency(actualSpent)}
                          </span>
                          {amount > 0 && (
                            <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {remaining >= 0 ? formatCurrency(remaining) + ' left' : formatCurrency(Math.abs(remaining)) + ' over'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {editingCategory !== spending.category_id && (
                    <div className="flex items-center gap-2">
                      <CircularProgress 
                        percentage={amount > 0 ? percentage : (actualSpent > 0 ? 100 : 0)} 
                        size={44} 
                        strokeWidth={4}
                        color={amount === 0 && actualSpent > 0 ? '#6B7280' : isOverBudget ? '#EF4444' : percentage > 80 ? '#F59E0B' : '#10B981'} 
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCategory(spending.category_id);
                          setEditingValues({
                            category: spending.category_name,
                            amount: amount.toString()
                          });
                        }}
                        className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar - always show */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {amount > 0 ? (
                      <>
                        <span>{percentage.toFixed(0)}% of budget used</span>
                        <span>{remaining >= 0 ? 'Remaining: ' + formatCurrency(remaining) : 'Over by: ' + formatCurrency(Math.abs(remaining))}</span>
                      </>
                    ) : actualSpent > 0 ? (
                      <>
                        <span>No budget set</span>
                        <span>Spent: {formatCurrency(actualSpent)}</span>
                      </>
                    ) : (
                      <>
                        <span>No activity</span>
                        <span>Set a budget to track</span>
                      </>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        amount === 0 ? 'bg-gray-400' : isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: amount > 0 ? `${Math.min(percentage, 100)}%` : actualSpent > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                {/* Spending Breakdown */}
                {actualSpent > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Spending Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Card Transactions</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrencyDetailed(transactionSpent)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Cash & Manual</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrencyDetailed(manualSpent)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Spending Entry */}
                <div className="flex items-center gap-3">
                  {editingSpending === spending.category_id ? (
                    <>
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={manualSpending[spending.category_id] || ''}
                        onChange={(e) => setManualSpending(prev => ({ ...prev, [spending.category_id]: e.target.value }))}
                        className="flex-1 rounded-xl border-gray-200 dark:border-gray-600 px-3 py-2 text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateManualSpending(spending.category_id)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4"
                      >
                        Add
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingSpending(null)}
                        className="rounded-xl px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSpending(spending.category_id)}
                      className="rounded-xl border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 px-4 py-2"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Add cash spending
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {displayCategories.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No spending data yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Your transactions will automatically appear here once you connect your bank accounts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}