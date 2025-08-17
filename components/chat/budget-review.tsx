"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Home, 
  ShoppingCart, 
  Car, 
  Zap, 
  Music, 
  PiggyBank,
  MoreHorizontal,
  Edit2,
  Check,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface BudgetReviewProps {
  data: {
    income: number;
    categories: Record<string, number>;
  };
  onComplete: (value: any) => void;
  onSkip?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  housing: Home,
  food: ShoppingCart,
  transportation: Car,
  utilities: Zap,
  entertainment: Music,
  savings: PiggyBank,
  other: MoreHorizontal
};

const CATEGORY_COLORS: Record<string, string> = {
  housing: 'from-blue-500 to-blue-600',
  food: 'from-green-500 to-green-600',
  transportation: 'from-purple-500 to-purple-600',
  utilities: 'from-yellow-500 to-yellow-600',
  entertainment: 'from-pink-500 to-pink-600',
  savings: 'from-emerald-500 to-emerald-600',
  other: 'from-gray-500 to-gray-600'
};

export function BudgetReview({ data, onComplete, onSkip }: BudgetReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState(data.categories);
  
  const totalAllocated = Object.values(categories).reduce((sum, val) => sum + val, 0);
  const remaining = data.income - totalAllocated;
  const savingsRate = (categories.savings / data.income) * 100;
  
  const handleCategoryChange = (category: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setCategories(prev => ({ ...prev, [category]: amount }));
  };
  
  const handleComplete = () => {
    onComplete(categories);
  };
  
  return (
    <div className="space-y-4">
      {/* Income Summary */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              ${data.income.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Savings Rate</p>
            <p className={`text-2xl font-bold ${
              savingsRate >= 20 ? 'text-green-600' : 
              savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {savingsRate.toFixed(0)}%
            </p>
          </div>
        </div>
      </Card>
      
      {/* Budget Categories */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Your Smart Budget</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-600"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? 'Done' : 'Adjust'}
          </Button>
        </div>
        
        <div className="space-y-3">
          {Object.entries(categories).map(([category, amount]) => {
            const Icon = CATEGORY_ICONS[category];
            const percentage = (amount / data.income) * 100;
            
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${CATEGORY_COLORS[category]} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium capitalize">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">$</span>
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => handleCategoryChange(category, e.target.value)}
                          className="w-24 h-8 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-semibold">${amount.toLocaleString()}</span>
                    )}
                    <span className="text-xs text-gray-500 w-10 text-right">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
        
        {/* Remaining Budget */}
        <div className={`mt-4 p-3 rounded-lg ${
          remaining >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {remaining >= 0 ? 'Unallocated' : 'Over Budget'}
            </span>
            <div className="flex items-center gap-2">
              {remaining >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-bold ${
                remaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${Math.abs(remaining).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Insight */}
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        💡 <strong>Smart tip:</strong> {
          savingsRate >= 20 ? "Excellent savings rate! You're building wealth effectively." :
          savingsRate >= 10 ? "Good start on savings! Consider increasing it gradually." :
          "Try to save at least 10% of your income for financial security."
        }
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Use Defaults
          </Button>
        )}
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          onClick={handleComplete}
          disabled={Math.abs(remaining) > data.income * 0.5}
        >
          <Check className="h-4 w-4 mr-2" />
          Looks Good!
        </Button>
      </div>
    </div>
  );
}