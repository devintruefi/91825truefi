"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Check, Edit2, TrendingUp } from 'lucide-react';

interface IncomeConfirmProps {
  data: {
    detected: number;
    message: string;
  };
  onComplete: (value: number) => void;
}

export function IncomeConfirm({ data, onComplete }: IncomeConfirmProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [income, setIncome] = useState(data.detected);
  
  const handleConfirm = () => {
    onComplete(income);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSaveEdit = () => {
    setIsEditing(false);
    onComplete(income);
  };
  
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Income Detected</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {data.message}
            </p>
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                  className="w-32 text-lg font-semibold"
                  autoFocus
                />
                <span className="text-sm text-gray-500">/month</span>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${income.toLocaleString()}/month
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Adjust
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        💡 <strong>Why this matters:</strong> Your income helps me create a realistic budget and savings plan that fits your lifestyle.
      </div>
      
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSaveEdit}
            >
              <Check className="h-4 w-4 mr-2" />
              Save Amount
            </Button>
          </>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            onClick={handleConfirm}
          >
            <Check className="h-4 w-4 mr-2" />
            Yes, that's right
          </Button>
        )}
      </div>
    </div>
  );
}