import prisma from '@/lib/db';
import { generateAIBudget } from '@/lib/ai-budget-generator';

interface BudgetAnalysis {
  overBudgetCategories: Array<{
    category: string;
    budgeted: number;
    spent: number;
    overAmount: number;
    percentage: number;
  }>;
  underBudgetCategories: Array<{
    category: string;
    budgeted: number;
    spent: number;
    underAmount: number;
    percentage: number;
  }>;
  recommendations: string[];
  needsAdjustment: boolean;
}

/**
 * Analyzes user's spending against their budget
 */
export async function analyzeBudgetPerformance(userId: string): Promise<BudgetAnalysis> {
  // Skip for demo user
  if (userId === '123e4567-e89b-12d3-a456-426614174000') {
    throw new Error('Budget automation not available for demo user');
  }
  
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get active budget
  const budget = await prisma.budgets.findFirst({
    where: {
      user_id: userId,
      is_active: true
    },
    include: {
      budget_categories: true
    }
  });
  
  if (!budget) {
    return {
      overBudgetCategories: [],
      underBudgetCategories: [],
      recommendations: ['No active budget found. Consider creating one.'],
      needsAdjustment: false
    };
  }
  
  // Get spending for current month
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      amount: { gt: 0 } // Positive = spending in our system
    }
  });
  
  // Group spending by category
  const spendingByCategory = new Map<string, number>();
  for (const tx of transactions) {
    const category = normalizeCategory(tx.category || 'Other');
    const current = spendingByCategory.get(category) || 0;
    spendingByCategory.set(category, current + tx.amount);
  }
  
  // Analyze budget vs actual
  const overBudgetCategories: BudgetAnalysis['overBudgetCategories'] = [];
  const underBudgetCategories: BudgetAnalysis['underBudgetCategories'] = [];
  const recommendations: string[] = [];
  
  for (const budgetCat of budget.budget_categories) {
    const spent = spendingByCategory.get(budgetCat.category) || 0;
    const budgeted = Number(budgetCat.amount);
    
    if (spent > budgeted * 1.1) { // Over by 10%
      const overAmount = spent - budgeted;
      overBudgetCategories.push({
        category: budgetCat.category,
        budgeted,
        spent,
        overAmount,
        percentage: ((spent - budgeted) / budgeted) * 100
      });
    } else if (spent < budgeted * 0.5) { // Under by 50%
      const underAmount = budgeted - spent;
      underBudgetCategories.push({
        category: budgetCat.category,
        budgeted,
        spent,
        underAmount,
        percentage: ((budgeted - spent) / budgeted) * 100
      });
    }
  }
  
  // Generate recommendations
  if (overBudgetCategories.length > 0) {
    const topOverCategory = overBudgetCategories[0];
    recommendations.push(
      `You're overspending in ${topOverCategory.category} by ${topOverCategory.percentage.toFixed(0)}%. Consider reducing expenses here.`
    );
  }
  
  if (underBudgetCategories.length > 0 && overBudgetCategories.length > 0) {
    const surplus = underBudgetCategories.reduce((sum, cat) => sum + cat.underAmount, 0);
    const deficit = overBudgetCategories.reduce((sum, cat) => sum + cat.overAmount, 0);
    
    if (surplus > deficit) {
      recommendations.push(
        `You have $${(surplus - deficit).toFixed(0)} in unused budget that could be reallocated to overspent categories or savings.`
      );
    }
  }
  
  // Check if significant adjustment is needed
  const needsAdjustment = 
    overBudgetCategories.length >= 3 || // Multiple categories over budget
    overBudgetCategories.some(cat => cat.percentage > 25) || // Significantly over in any category
    underBudgetCategories.length >= budget.budget_categories.length * 0.5; // Half categories underutilized
  
  if (needsAdjustment) {
    recommendations.push('Your spending patterns have changed significantly. Consider updating your budget.');
  }
  
  return {
    overBudgetCategories,
    underBudgetCategories,
    recommendations,
    needsAdjustment
  };
}

/**
 * Automatically adjusts budget based on spending patterns
 */
export async function adjustBudgetAutomatically(userId: string): Promise<boolean> {
  // Skip for demo user
  if (userId === '123e4567-e89b-12d3-a456-426614174000') {
    return false;
  }
  
  try {
    // Check if auto-budget is enabled
    const userPrefs = await prisma.user_preferences.findFirst({
      where: { user_id: userId }
    });
    
    if (!userPrefs?.financial_goals) {
      return false;
    }
    
    const financialGoals = userPrefs.financial_goals as any;
    if (!financialGoals.auto_budget_enabled) {
      return false;
    }
    
    // Analyze current budget performance
    const analysis = await analyzeBudgetPerformance(userId);
    
    if (!analysis.needsAdjustment) {
      return false;
    }
    
    // Generate new AI budget
    const aiResult = await generateAIBudget(userId);
    
    if (aiResult.warnings && aiResult.warnings.length > 0) {
      console.error('AI budget generation warnings:', aiResult.warnings);
      return false;
    }
    
    // Get existing budget
    const existingBudget = await prisma.budgets.findFirst({
      where: {
        user_id: userId,
        is_active: true
      }
    });
    
    if (!existingBudget) {
      return false;
    }
    
    // Update budget categories
    await prisma.budget_categories.deleteMany({
      where: { budget_id: existingBudget.id }
    });
    
    await prisma.budgets.update({
      where: { id: existingBudget.id },
      data: {
        name: `Auto-Adjusted Budget (${aiResult.framework})`,
        description: `Automatically adjusted on ${new Date().toLocaleDateString()} based on spending patterns`,
        amount: aiResult.totalBudget,
        updated_at: new Date()
      }
    });
    
    for (const category of aiResult.categories) {
      await prisma.budget_categories.create({
        data: {
          id: crypto.randomUUID(),
          budget_id: existingBudget.id,
          category: category.category,
          amount: category.amount,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    // Create insight notification
    const changes = analysis.overBudgetCategories.map(cat => 
      `${cat.category}: ${cat.percentage.toFixed(0)}% over`
    ).slice(0, 3);
    
    await prisma.financial_insights.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        insight_type: 'notification',
        title: 'Budget Automatically Adjusted',
        description: `Your budget has been adjusted based on recent spending patterns. Key changes: ${changes.join(', ')}`,
        severity: 'medium',
        data: {
          analysis,
          newBudget: {
            total: aiResult.totalBudget,
            framework: aiResult.framework
          },
          adjustmentDate: new Date().toISOString()
        },
        is_read: false,
        created_at: new Date()
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error adjusting budget automatically:', error);
    return false;
  }
}

/**
 * Monitors all users with auto-budget enabled and adjusts as needed
 */
export async function monitorAllUserBudgets(): Promise<void> {
  try {
    // Get all users with auto-budget enabled
    const usersWithAutoBudget = await prisma.user_preferences.findMany({
      where: {
        financial_goals: {
          path: ['auto_budget_enabled'],
          equals: true
        }
      },
      select: {
        user_id: true
      }
    });
    
    console.log(`Monitoring budgets for ${usersWithAutoBudget.length} users with auto-budget enabled`);
    
    for (const userPref of usersWithAutoBudget) {
      // Skip demo user
      if (userPref.user_id === '123e4567-e89b-12d3-a456-426614174000') {
        continue;
      }
      
      try {
        const adjusted = await adjustBudgetAutomatically(userPref.user_id);
        if (adjusted) {
          console.log(`Budget adjusted for user ${userPref.user_id}`);
        }
      } catch (error) {
        console.error(`Failed to adjust budget for user ${userPref.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error monitoring user budgets:', error);
  }
}

/**
 * Normalizes transaction category to budget category
 */
function normalizeCategory(rawCategory: string): string {
  const categoryMap: Record<string, string> = {
    'rent': 'Housing',
    'mortgage': 'Housing',
    'utilities': 'Utilities',
    'electricity': 'Utilities',
    'water': 'Utilities',
    'internet': 'Utilities',
    'groceries': 'Groceries',
    'food': 'Food & Dining',
    'restaurants': 'Dining Out',
    'transportation': 'Transportation',
    'gas': 'Transportation',
    'uber': 'Transportation',
    'healthcare': 'Healthcare',
    'insurance': 'Insurance',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'travel': 'Travel',
    'savings': 'Savings',
    'investment': 'Investments'
  };
  
  const lowerCategory = rawCategory.toLowerCase();
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerCategory.includes(key)) {
      return value;
    }
  }
  
  return rawCategory;
}

/**
 * Gets spending trends for a user
 */
export async function getSpendingTrends(userId: string, months: number = 3) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lte: endDate
      },
      amount: { gt: 0 }
    },
    orderBy: { date: 'desc' }
  });
  
  // Group by month and category
  const trendsByMonth = new Map<string, Map<string, number>>();
  
  for (const tx of transactions) {
    const monthKey = `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`;
    const category = normalizeCategory(tx.category || 'Other');
    
    if (!trendsByMonth.has(monthKey)) {
      trendsByMonth.set(monthKey, new Map());
    }
    
    const monthData = trendsByMonth.get(monthKey)!;
    const current = monthData.get(category) || 0;
    monthData.set(category, current + tx.amount);
  }
  
  return trendsByMonth;
}