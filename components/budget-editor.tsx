import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit3, Save, X, DollarSign } from 'lucide-react';
import { useBudget } from '@/hooks/use-budget';
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

interface BudgetEditorProps {
  className?: string;
  onSave?: () => void;
}

export function BudgetEditor({ className, onSave }: BudgetEditorProps) {
  const { budget, loading, error, updateBudget, updateCategory, addCategory, deleteCategory } = useBudget();
  const { toast } = useToast();
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ category: string; amount: string }>({ category: '', amount: '' });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ category: '', amount: '' });

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

  const totalBudget = budget?.budget_categories.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Budget Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
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
          <CardTitle className="text-xl font-semibold">Budget Categories</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Budget: {formatCurrency(totalBudget)}
          </p>
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
              <DialogTitle>Add New Category</DialogTitle>
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
                <Label htmlFor="category-amount">Amount</Label>
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
        <div className="space-y-4">
          {budget?.budget_categories.map((category) => {
            const amount = Number(category.amount);
            const percentage = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
            
            return (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {editingCategory === category.id ? (
                      <>
                        <Input
                          value={editingValues.category}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, category: e.target.value }))}
                          className="w-32"
                        />
                        <Input
                          type="number"
                          value={editingValues.amount}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-24"
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
                        <span className="font-medium">{category.category}</span>
                        <Badge variant="secondary">{formatCurrency(amount)}</Badge>
                        <span className="text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
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
                
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
        
        {/* Main Budget Save Button */}
        <div className="pt-4 border-t">
          <Button 
            id="onb-budget-save-btn"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            onClick={() => {
              // This could trigger a more comprehensive save
              toast({ title: "Budget Saved", description: "Your budget has been saved successfully!" });
              onSave?.();
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Budget
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 