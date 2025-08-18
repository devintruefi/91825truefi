"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  DollarSign, 
  PiggyBank, 
  Target,
  CreditCard,
  Eye,
  ChevronRight
} from 'lucide-react';

interface DashboardPreviewProps {
  data: {
    netWorth?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    savingsRate?: number;
    goals?: Array<{ name: string; progress: number }>;
    accounts?: number;
    debts?: number;
  };
  onContinue: () => void;
  onViewDashboard: () => void;
}

export function DashboardPreview({ data, onContinue, onViewDashboard }: DashboardPreviewProps) {
  const netWorth = data.netWorth || 0;
  const monthlyIncome = data.monthlyIncome || 0;
  const monthlyExpenses = data.monthlyExpenses || monthlyIncome * 0.7;
  const savingsRate = data.savingsRate || ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Your Financial Snapshot 📊</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Here's what we've built so far. Want to keep customizing?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Net Worth */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              ${netWorth.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Cashflow */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Cashflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
              +${(monthlyIncome - monthlyExpenses).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
              {savingsRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
              {data.goals?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Income</span>
            <span className="font-semibold text-green-600">
              ${monthlyIncome.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Expenses</span>
            <span className="font-semibold text-red-600">
              ${monthlyExpenses.toLocaleString()}
            </span>
          </div>
          <Progress value={70} className="h-2 mt-2" />
          <p className="text-xs text-gray-500">70% of income allocated</p>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      {data.accounts && data.accounts > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{data.accounts} accounts connected</span>
              </div>
              <span className="text-xs text-gray-500">Auto-syncing</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button 
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          onClick={onContinue}
        >
          <ChevronRight className="h-4 w-4 mr-2" />
          Continue Setup
        </Button>
        <Button 
          variant="outline"
          className="flex-1"
          onClick={onViewDashboard}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Dashboard
        </Button>
      </div>
    </div>
  );
}