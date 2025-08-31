/**
 * Budget Calculator V2 - Reliable budget calculations with no 0% issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BudgetCategory {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  isFixed?: boolean;
}

export interface BudgetCalculationResult {
  categories: BudgetCategory[];
  totalAmount: number;
  totalPercentage: number;
  monthlyIncome: number;
  isPlaceholder: boolean;
  message: string;
}

// Default budget colors
const CATEGORY_COLORS: Record<string, string> = {
  housing: '#3B82F6',
  food: '#10B981',
  transport: '#F59E0B',
  utilities: '#8B5CF6',
  insurance: '#EF4444',
  healthcare: '#EC4899',
  entertainment: '#06B6D4',
  shopping: '#F97316',
  personal: '#84CC16',
  savings: '#22C55E',
  emergency: '#6366F1',
  investments: '#14B8A6',
  debt: '#F43F5E',
  other: '#6B7280',
  needs: '#3B82F6',
  wants: '#10B981'
};

/**
 * Calculate budget based on income and detected expenses
 */
export async function calculateBudgetV2(userId: string): Promise<BudgetCalculationResult> {
  try {
    // Get user's monthly income
    const userPrefs = await prisma.user_preferences.findUnique({
      where: { user_id: userId }
    });
    
    const financialGoals = userPrefs?.financial_goals as any || {};
    const monthlyIncome = financialGoals.monthlyIncome || 0;
    
    // If no income yet, return placeholder
    if (monthlyIncome === 0) {
      return getPlaceholderBudget();
    }
    
    // Check for detected expenses from Plaid
    const hasPlaid = await checkPlaidConnection(userId);
    
    if (hasPlaid) {
      // Try to get actual spending from transactions
      const detectedBudget = await getDetectedBudget(userId, monthlyIncome);
      if (detectedBudget && detectedBudget.categories.length > 0) {
        return detectedBudget;
      }
    }
    
    // Check for existing budget categories
    const existingBudget = await getExistingBudget(userId);
    if (existingBudget && existingBudget.categories.length > 0) {
      return recalculateBudgetPercentages(existingBudget, monthlyIncome);
    }
    
    // Return default 50/30/20 budget based on income
    return getDefaultBudget(monthlyIncome);
    
  } catch (error) {
    console.error('Error calculating budget:', error);
    return getPlaceholderBudget();
  }
}

/**
 * Get placeholder budget when income is not set
 */
function getPlaceholderBudget(): BudgetCalculationResult {
  return {
    categories: [
      {
        id: 'placeholder',
        label: 'Waiting for income data',
        amount: 0,
        percentage: 0,
        color: '#6B7280'
      }
    ],
    totalAmount: 0,
    totalPercentage: 0,
    monthlyIncome: 0,
    isPlaceholder: true,
    message: "We'll build your budget as soon as we confirm your income."
  };
}

/**
 * Get default 50/30/20 budget
 */
function getDefaultBudget(monthlyIncome: number): BudgetCalculationResult {
  const categories: BudgetCategory[] = [
    {
      id: 'needs',
      label: 'Needs (Housing, Food, Utilities)',
      amount: Math.round(monthlyIncome * 0.50),
      percentage: 50,
      color: CATEGORY_COLORS.needs
    },
    {
      id: 'wants',
      label: 'Wants (Entertainment, Dining Out)',
      amount: Math.round(monthlyIncome * 0.30),
      percentage: 30,
      color: CATEGORY_COLORS.wants
    },
    {
      id: 'savings',
      label: 'Savings & Debt Payment',
      amount: Math.round(monthlyIncome * 0.20),
      percentage: 20,
      color: CATEGORY_COLORS.savings
    }
  ];
  
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  
  return {
    categories,
    totalAmount,
    totalPercentage,
    monthlyIncome,
    isPlaceholder: false,
    message: 'Recommended 50/30/20 budget based on your income'
  };
}

/**
 * Get budget based on detected spending patterns
 */
async function getDetectedBudget(
  userId: string,
  monthlyIncome: number
): Promise<BudgetCalculationResult | null> {
  try {
    // Get transactions from last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: sixtyDaysAgo
        },
        amount: {
          gt: 0 // Positive amounts in Plaid are expenses
        }
      }
    });
    
    if (transactions.length === 0) {
      return null;
    }
    
    // Categorize spending
    const categoryTotals = new Map<string, number>();
    
    for (const txn of transactions) {
      const category = mapTransactionCategory(txn.category || txn.pfc_primary || 'other');
      const current = categoryTotals.get(category) || 0;
      categoryTotals.set(category, current + Math.abs(txn.amount));
    }
    
    // Convert to monthly averages (60 days = ~2 months)
    const categories: BudgetCategory[] = [];
    let totalSpending = 0;
    
    for (const [categoryId, amount] of categoryTotals) {
      const monthlyAmount = Math.round(amount / 2); // Average over 2 months
      const percentage = Math.round((monthlyAmount / monthlyIncome) * 100);
      
      categories.push({
        id: categoryId,
        label: formatCategoryLabel(categoryId),
        amount: monthlyAmount,
        percentage,
        color: CATEGORY_COLORS[categoryId] || CATEGORY_COLORS.other
      });
      
      totalSpending += monthlyAmount;
    }
    
    // Add savings category if there's leftover income
    if (totalSpending < monthlyIncome) {
      const savingsAmount = monthlyIncome - totalSpending;
      const savingsPercentage = Math.round((savingsAmount / monthlyIncome) * 100);
      
      categories.push({
        id: 'savings',
        label: 'Available for Savings',
        amount: savingsAmount,
        percentage: savingsPercentage,
        color: CATEGORY_COLORS.savings
      });
      
      totalSpending += savingsAmount;
    }
    
    // Sort by amount descending
    categories.sort((a, b) => b.amount - a.amount);
    
    const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
    
    return {
      categories,
      totalAmount: totalSpending,
      totalPercentage,
      monthlyIncome,
      isPlaceholder: false,
      message: 'Budget based on your actual spending patterns'
    };
    
  } catch (error) {
    console.error('Error detecting budget:', error);
    return null;
  }
}

/**
 * Get existing budget from database
 */
async function getExistingBudget(userId: string): Promise<{
  categories: Array<{ id: string; amount: number }>;
} | null> {
  try {
    const budget = await prisma.budgets.findFirst({
      where: {
        user_id: userId,
        is_active: true
      },
      include: {
        budget_categories: true
      }
    });
    
    if (!budget || !budget.budget_categories?.length) {
      return null;
    }
    
    return {
      categories: budget.budget_categories.map(cat => ({
        id: cat.category,
        amount: Number(cat.amount)
      }))
    };
  } catch (error) {
    console.error('Error getting existing budget:', error);
    return null;
  }
}

/**
 * Recalculate budget percentages based on income
 */
function recalculateBudgetPercentages(
  existingBudget: { categories: Array<{ id: string; amount: number }> },
  monthlyIncome: number
): BudgetCalculationResult {
  const categories: BudgetCategory[] = existingBudget.categories.map(cat => ({
    id: cat.id,
    label: formatCategoryLabel(cat.id),
    amount: cat.amount,
    percentage: Math.round((cat.amount / monthlyIncome) * 100),
    color: CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.other
  }));
  
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  
  return {
    categories,
    totalAmount,
    totalPercentage,
    monthlyIncome,
    isPlaceholder: false,
    message: 'Your current budget allocation'
  };
}

/**
 * Map Plaid transaction categories to our budget categories
 */
function mapTransactionCategory(plaidCategory: string): string {
  const categoryMap: Record<string, string> = {
    'FOOD_AND_DRINK': 'food',
    'SHOPS': 'shopping',
    'RECREATION': 'entertainment',
    'TRAVEL': 'entertainment',
    'TRANSPORTATION': 'transport',
    'BILLS_AND_UTILITIES': 'utilities',
    'HEALTHCARE': 'healthcare',
    'PERSONAL_CARE': 'personal',
    'MORTGAGE_AND_RENT': 'housing',
    'HOME_IMPROVEMENT': 'housing',
    'LOANS': 'debt',
    'TAXES': 'other',
    'FEES': 'other',
    'TRANSFER': 'savings'
  };
  
  const upperCategory = plaidCategory.toUpperCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (upperCategory.includes(key)) {
      return value;
    }
  }
  
  return 'other';
}

/**
 * Format category label for display
 */
function formatCategoryLabel(categoryId: string): string {
  const labels: Record<string, string> = {
    housing: 'Housing',
    food: 'Food & Dining',
    transport: 'Transportation',
    utilities: 'Utilities',
    insurance: 'Insurance',
    healthcare: 'Healthcare',
    entertainment: 'Entertainment',
    shopping: 'Shopping',
    personal: 'Personal Care',
    savings: 'Savings',
    emergency: 'Emergency Fund',
    investments: 'Investments',
    debt: 'Debt Payments',
    other: 'Other',
    needs: 'Needs',
    wants: 'Wants'
  };
  
  return labels[categoryId] || categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

/**
 * Check if user has active Plaid connection
 */
async function checkPlaidConnection(userId: string): Promise<boolean> {
  const connections = await prisma.plaid_connections.count({
    where: { 
      user_id: userId,
      is_active: true
    }
  });
  return connections > 0;
}

/**
 * Update budget categories in database
 */
export async function updateBudgetCategories(
  userId: string,
  categories: Array<{ id: string; amount: number }>
): Promise<void> {
  try {
    // Get or create budget
    let budget = await prisma.budgets.findFirst({
      where: {
        user_id: userId,
        name: 'Primary Budget'
      }
    });
    
    if (!budget) {
      budget = await prisma.budgets.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          name: 'Primary Budget',
          description: 'Monthly budget',
          amount: 0,
          period: 'monthly',
          start_date: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    // Update categories
    for (const category of categories) {
      await prisma.budget_categories.upsert({
        where: {
          budget_id_category: {
            budget_id: budget.id,
            category: category.id
          }
        },
        update: {
          amount: category.amount,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          budget_id: budget.id,
          category: category.id,
          amount: category.amount,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    // Update total budget amount
    const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
    await prisma.budgets.update({
      where: { id: budget.id },
      data: {
        amount: totalAmount,
        updated_at: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error updating budget categories:', error);
    throw error;
  }
}