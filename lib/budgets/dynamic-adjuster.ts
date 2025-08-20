// Dynamic budget adjustment algorithm
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BudgetCategory {
  id: string;
  name: string;
  currentAmount: number;
  suggestedAmount: number;
  isFixed: boolean;
  averageSpending: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  adjustmentReason?: string;
}

export interface DynamicBudget {
  userId: string;
  categories: BudgetCategory[];
  totalBudget: number;
  totalIncome: number;
  savingsRate: number;
  recommendations: string[];
}

// Main dynamic adjustment function
export async function adjustBudgetDynamically(
  userId: string,
  lookbackMonths: number = 3
): Promise<DynamicBudget> {
  // Get current budget
  const currentBudget = await prisma.budgets.findFirst({
    where: { user_id: userId, is_active: true },
    include: { budget_categories: true }
  });
  
  if (!currentBudget) {
    throw new Error('No active budget found');
  }
  
  // Get user's income
  const income = await getUserMonthlyIncome(userId);
  
  // Get spending history
  const spendingHistory = await getSpendingHistory(userId, lookbackMonths);
  
  // Calculate rolling averages and trends
  const categoryAnalysis = await analyzeCategorySpending(
    currentBudget.budget_categories,
    spendingHistory
  );
  
  // Apply dynamic adjustments
  const adjustedCategories = applyDynamicAdjustments(
    categoryAnalysis,
    income
  );
  
  // Generate recommendations
  const recommendations = generateBudgetRecommendations(
    adjustedCategories,
    income,
    spendingHistory
  );
  
  // Calculate totals
  const totalBudget = adjustedCategories.reduce(
    (sum, cat) => sum + cat.suggestedAmount,
    0
  );
  
  const savingsRate = ((income - totalBudget) / income) * 100;
  
  return {
    userId,
    categories: adjustedCategories,
    totalBudget,
    totalIncome: income,
    savingsRate,
    recommendations
  };
}

// Get user's monthly income
async function getUserMonthlyIncome(userId: string): Promise<number> {
  const incomeRecords = await prisma.recurring_income.findMany({
    where: { user_id: userId }
  });
  
  return incomeRecords.reduce((total, record) => {
    const monthly = Number(record.gross_monthly || 0);
    return total + monthly;
  }, 0);
}

// Get spending history by category
async function getSpendingHistory(
  userId: string,
  months: number
): Promise<Map<string, number[]>> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: startDate },
      amount: { gt: 0 } // Expenses are positive
    },
    orderBy: { date: 'asc' }
  });
  
  // Group by month and category
  const spendingByCategory = new Map<string, number[]>();
  
  for (let i = 0; i < months; i++) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate < monthEnd;
    });
    
    // Aggregate by category
    const categoryTotals = new Map<string, number>();
    
    for (const tx of monthTransactions) {
      const category = mapTransactionCategory(tx.category || 'Other');
      const current = categoryTotals.get(category) || 0;
      categoryTotals.set(category, current + Math.abs(tx.amount));
    }
    
    // Add to history
    for (const [category, amount] of categoryTotals) {
      if (!spendingByCategory.has(category)) {
        spendingByCategory.set(category, []);
      }
      spendingByCategory.get(category)!.push(amount);
    }
  }
  
  return spendingByCategory;
}

// Map transaction categories to budget categories
function mapTransactionCategory(transactionCategory: string): string {
  const mapping: Record<string, string> = {
    'Food and Drink': 'Food & Dining',
    'Restaurants': 'Dining Out',
    'Groceries': 'Groceries',
    'Transportation': 'Transportation',
    'Shopping': 'Shopping',
    'Entertainment': 'Entertainment',
    'Bills & Utilities': 'Utilities',
    'Healthcare': 'Healthcare',
    'Travel': 'Travel',
    'Personal': 'Personal Care',
    'Education': 'Education',
    'Rent': 'Housing',
    'Mortgage': 'Housing'
  };
  
  return mapping[transactionCategory] || transactionCategory;
}

// Analyze spending patterns for each category
async function analyzeCategorySpending(
  currentCategories: any[],
  spendingHistory: Map<string, number[]>
): Promise<BudgetCategory[]> {
  const analyzed: BudgetCategory[] = [];
  
  for (const category of currentCategories) {
    const history = spendingHistory.get(category.category) || [];
    const average = history.length > 0
      ? history.reduce((sum, val) => sum + val, 0) / history.length
      : Number(category.amount);
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (history.length >= 2) {
      const firstHalf = history.slice(0, Math.floor(history.length / 2));
      const secondHalf = history.slice(Math.floor(history.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
    }
    
    analyzed.push({
      id: category.id,
      name: category.category,
      currentAmount: Number(category.amount),
      suggestedAmount: Number(category.amount), // Will be adjusted
      isFixed: category.is_fixed || false,
      averageSpending: average,
      trend
    });
  }
  
  return analyzed;
}

// Apply dynamic adjustments based on patterns
function applyDynamicAdjustments(
  categories: BudgetCategory[],
  monthlyIncome: number
): BudgetCategory[] {
  const adjusted = [...categories];
  let totalSavings = 0;
  let totalIncreases = 0;
  
  for (const category of adjusted) {
    // Skip fixed expenses
    if (category.isFixed) {
      category.suggestedAmount = category.currentAmount;
      continue;
    }
    
    const difference = category.averageSpending - category.currentAmount;
    const percentDiff = Math.abs(difference) / category.currentAmount;
    
    // Adjust based on spending patterns
    if (category.averageSpending > 0) {
      if (percentDiff > 0.2) {
        // Significant difference detected
        if (category.averageSpending < category.currentAmount * 0.8) {
          // Consistently under budget by >20%
          const reduction = (category.currentAmount - category.averageSpending) * 0.5;
          category.suggestedAmount = category.currentAmount - reduction;
          category.adjustmentReason = `Reduced by ${(reduction).toFixed(0)} based on lower spending`;
          totalSavings += reduction;
        } else if (category.averageSpending > category.currentAmount * 1.1) {
          // Consistently over budget by >10%
          const increase = (category.averageSpending - category.currentAmount) * 0.7;
          category.suggestedAmount = category.currentAmount + increase;
          category.adjustmentReason = `Increased by ${(increase).toFixed(0)} to match spending`;
          totalIncreases += increase;
        }
      }
      
      // Apply trend adjustments
      if (category.trend === 'increasing' && category.suggestedAmount === category.currentAmount) {
        const trendAdjustment = category.currentAmount * 0.05;
        category.suggestedAmount += trendAdjustment;
        category.adjustmentReason = 'Increased due to rising trend';
        totalIncreases += trendAdjustment;
      } else if (category.trend === 'decreasing' && category.suggestedAmount === category.currentAmount) {
        const trendAdjustment = category.currentAmount * 0.05;
        category.suggestedAmount -= trendAdjustment;
        category.adjustmentReason = 'Decreased due to falling trend';
        totalSavings += trendAdjustment;
      }
    }
    
    // Ensure minimum amounts
    const minimums: Record<string, number> = {
      'Food & Dining': 200,
      'Groceries': 150,
      'Transportation': 50,
      'Healthcare': 50,
      'Utilities': 50
    };
    
    const minimum = minimums[category.name] || 0;
    if (category.suggestedAmount < minimum) {
      category.suggestedAmount = minimum;
      category.adjustmentReason = `Set to minimum of ${minimum}`;
    }
  }
  
  // Reallocate saved amounts to goals/savings
  if (totalSavings > totalIncreases) {
    const netSavings = totalSavings - totalIncreases;
    
    // Check if we have a savings category
    let savingsCategory = adjusted.find(c => 
      c.name.toLowerCase().includes('saving') || 
      c.name.toLowerCase().includes('investment')
    );
    
    if (!savingsCategory) {
      // Create a savings category
      savingsCategory = {
        id: 'auto-savings',
        name: 'Savings',
        currentAmount: 0,
        suggestedAmount: netSavings,
        isFixed: false,
        averageSpending: 0,
        trend: 'stable',
        adjustmentReason: 'Auto-allocated from budget optimization'
      };
      adjusted.push(savingsCategory);
    } else {
      savingsCategory.suggestedAmount += netSavings;
      savingsCategory.adjustmentReason = `Increased by ${netSavings.toFixed(0)} from optimizations`;
    }
  }
  
  // Ensure total doesn't exceed income
  const totalSuggested = adjusted.reduce((sum, cat) => sum + cat.suggestedAmount, 0);
  if (totalSuggested > monthlyIncome * 0.95) {
    // Scale down non-fixed categories
    const scaleFactor = (monthlyIncome * 0.95) / totalSuggested;
    for (const category of adjusted) {
      if (!category.isFixed) {
        category.suggestedAmount *= scaleFactor;
        category.adjustmentReason = (category.adjustmentReason || '') + ' (scaled to fit income)';
      }
    }
  }
  
  return adjusted;
}

// Generate budget recommendations
function generateBudgetRecommendations(
  categories: BudgetCategory[],
  income: number,
  spendingHistory: Map<string, number[]>
): string[] {
  const recommendations: string[] = [];
  
  // Calculate metrics
  const totalBudget = categories.reduce((sum, cat) => sum + cat.suggestedAmount, 0);
  const savingsRate = ((income - totalBudget) / income) * 100;
  
  // Savings rate recommendations
  if (savingsRate < 10) {
    recommendations.push('Your savings rate is below 10%. Consider reducing discretionary spending.');
  } else if (savingsRate > 30) {
    recommendations.push('Excellent savings rate! Consider increasing investments or goal contributions.');
  }
  
  // Category-specific recommendations
  for (const category of categories) {
    if (category.trend === 'increasing' && !category.isFixed) {
      recommendations.push(`${category.name} spending is trending up. Review recent transactions.`);
    }
    
    if (category.averageSpending > category.suggestedAmount * 1.2) {
      recommendations.push(`Consider finding ways to reduce ${category.name} expenses.`);
    }
    
    if (category.averageSpending < category.suggestedAmount * 0.5 && !category.isFixed) {
      recommendations.push(`You're doing great with ${category.name}! The extra can go to savings.`);
    }
  }
  
  // Check for missing important categories
  const essentialCategories = ['Emergency Fund', 'Savings', 'Healthcare'];
  for (const essential of essentialCategories) {
    if (!categories.find(c => c.name.includes(essential))) {
      recommendations.push(`Consider adding a budget for ${essential}.`);
    }
  }
  
  // Seasonal adjustments
  const currentMonth = new Date().getMonth();
  if (currentMonth === 11) { // December
    recommendations.push('Holiday season ahead - consider setting aside extra for gifts and travel.');
  } else if (currentMonth === 0) { // January
    recommendations.push('New year - great time to review and optimize all budget categories.');
  }
  
  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

// Save adjusted budget to database
export async function saveAdjustedBudget(
  userId: string,
  adjustedBudget: DynamicBudget
): Promise<void> {
  const budget = await prisma.budgets.findFirst({
    where: { user_id: userId, is_active: true }
  });
  
  if (!budget) {
    throw new Error('No active budget found');
  }
  
  // Update each category
  for (const category of adjustedBudget.categories) {
    if (category.id === 'auto-savings') {
      // Create new savings category
      await prisma.budget_categories.create({
        data: {
          id: crypto.randomUUID(),
          budget_id: budget.id,
          category: category.name,
          amount: category.suggestedAmount,
          is_fixed: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    } else {
      // Update existing category
      await prisma.budget_categories.update({
        where: { id: category.id },
        data: {
          amount: category.suggestedAmount,
          updated_at: new Date()
        }
      });
    }
  }
  
  // Store recommendations in financial_insights
  for (const recommendation of adjustedBudget.recommendations) {
    await prisma.financial_insights.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        insight_type: 'budget_recommendation',
        title: 'Budget Optimization',
        description: recommendation,
        severity: 'info',
        data: {
          savingsRate: adjustedBudget.savingsRate,
          totalBudget: adjustedBudget.totalBudget
        },
        is_read: false,
        created_at: new Date()
      }
    });
  }
}