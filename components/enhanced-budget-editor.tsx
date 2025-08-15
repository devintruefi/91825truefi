import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit3, Save, X, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBudget } from '@/hooks/use-budget';
import { useUser } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';

// Utility function for currency formatting
const formatCurrency = (amount: number): string => {
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
  actual_amount: number;
  manual_amount: number;
  transaction_amount: number;
  month: string;
  year: number;
}

interface EnhancedBudgetEditorProps {
  className?: string;
}

export function EnhancedBudgetEditor({ className }: EnhancedBudgetEditorProps) {
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

  // Fetch budget spending data
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

  const handleUpdateManualSpending = useCallback(async (categoryId: string) => {
    if (!user?.id) return;

    const amount = parseFloat(manualSpending[categoryId] || '0');
    if (isNaN(amount)) return;

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
        throw new Error('Failed to update spending');
      }

      await fetchBudgetSpending();
      setEditingSpending(null);
      setManualSpending(prev => ({ ...prev, [categoryId]: '' }));
      
      toast({
        title: "Spending updated",
        description: "Manual spending amount has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update spending. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.id, manualSpending, fetchBudgetSpending, toast]);

  const getSpendingForCategory = (categoryId: string): BudgetSpending | null => {
    return budgetSpending.find(s => s.category_id === categoryId) || null;
  };

  const totalBudget = budget?.budget_categories.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;
  const totalSpent = budgetSpending.reduce((sum, spending) => sum + spending.actual_amount, 0);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Budget vs Actual Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading budget: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Budget vs Actual Spending</CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Budget: {formatCurrency(totalBudget)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Spent: {formatCurrency(totalSpent)}
            </p>
            <p className={`text-sm font-medium ${totalSpent <= totalBudget ? 'text-green-600' : 'text-red-600'}`}>
              {totalSpent <= totalBudget ? 'Under' : 'Over'} by {formatCurrency(Math.abs(totalBudget - totalSpent))}
            </p>
          </div>
        </div>
        
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Budget Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategory.category}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Groceries"
                />
              </div>
              <div>
                <Label htmlFor="category-amount">Budget Amount</Label>
                <Input
                  id="category-amount"
                  type="number"
                  value={newCategory.amount}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCategory} className="flex-1">
                  Add Category
                </Button>
                <Button variant="outline" onClick={() => setIsAddingCategory(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {budget?.budget_categories.map((category) => {
            const amount = Number(category.amount);
            const spending = getSpendingForCategory(category.id);
            const actualSpent = spending?.actual_amount || 0;
            const transactionSpent = spending?.transaction_amount || 0;
            const manualSpent = spending?.manual_amount || 0;
            const percentage = amount > 0 ? Math.min((actualSpent / amount) * 100, 100) : 0;
            const isOverBudget = actualSpent > amount;
            
            return (
              <div key={category.id} className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {editingCategory === category.id ? (
                      <>
                        <Input
                          value={editingValues.category}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, category: e.target.value }))}
                          className="w-40"
                        />
                        <Input
                          type="number"
                          value={editingValues.amount}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-32"
                          step="0.01"
                        />
                        <Button size="sm" onClick={handleSaveCategory}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-lg">{category.category}</span>
                        <Badge variant="outline" className="text-sm">
                          Budget: {formatCurrency(amount)}
                        </Badge>
                        {actualSpent > 0 && (
                          <Badge variant={isOverBudget ? "destructive" : "secondary"} className="text-sm">
                            Spent: {formatCurrency(actualSpent)}
                          </Badge>
                        )}
                        {isOverBudget && (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        )}
                      </>
                    )}
                  </div>
                  
                  {editingCategory !== category.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{percentage.toFixed(1)}% of budget used</span>
                    <span>{formatCurrency(amount - actualSpent)} remaining</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-3 ${isOverBudget ? 'bg-red-100' : 'bg-gray-200'}`}
                  />
                </div>

                {/* Spending Breakdown */}
                {actualSpent > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-md p-3 space-y-2">
                    <h4 className="font-medium text-sm">Spending Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">From Transactions:</span>
                        <span className="font-medium">{formatCurrency(transactionSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Manual Entries:</span>
                        <span className="font-medium">{formatCurrency(manualSpent)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Spending Entry */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {editingSpending === category.id ? (
                    <>
                      <Label className="text-sm">Add cash spending:</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={manualSpending[category.id] || ''}
                        onChange={(e) => setManualSpending(prev => ({ ...prev, [category.id]: e.target.value }))}
                        className="w-24 h-8"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateManualSpending(category.id)}
                        className="h-8"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingSpending(null)}
                        className="h-8"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSpending(category.id)}
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="w-3 h-3" />
                      Add Cash Spending
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}