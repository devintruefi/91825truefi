import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface DetectedFinancialData {
  monthlyIncome: number | null;
  netWorth: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  monthlyExpenses: Record<string, number>;
  suggestedBudget: Record<string, number>;
  accounts: {
    checking: number;
    savings: number;
    investment: number;
    credit: number;
    loan: number;
    mortgage: number;
  };
  detectedAt: Date;
}

/**
 * Comprehensive financial detection from Plaid data
 */
export async function detectFinancialProfile(userId: string): Promise<DetectedFinancialData> {
  const result: DetectedFinancialData = {
    monthlyIncome: null,
    netWorth: null,
    totalAssets: null,
    totalLiabilities: null,
    monthlyExpenses: {},
    suggestedBudget: {},
    accounts: {
      checking: 0,
      savings: 0,
      investment: 0,
      credit: 0,
      loan: 0,
      mortgage: 0,
    },
    detectedAt: new Date(),
  };

  try {
    // 1. Get all accounts and calculate net worth
    const accounts = await prisma.accounts.findMany({
      where: { 
        user_id: userId,
        is_active: true
      }
    });

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of accounts) {
      const balance = Number(account.balance) || 0;
      const type = account.type?.toLowerCase() || '';
      const subtype = account.subtype?.toLowerCase() || '';

      // Categorize accounts
      if (type === 'depository') {
        if (subtype.includes('checking')) {
          result.accounts.checking += balance;
          totalAssets += balance;
        } else if (subtype.includes('savings')) {
          result.accounts.savings += balance;
          totalAssets += balance;
        } else {
          totalAssets += balance;
        }
      } else if (type === 'investment' || type === 'brokerage') {
        result.accounts.investment += balance;
        totalAssets += balance;
      } else if (type === 'credit') {
        result.accounts.credit += Math.abs(balance);
        totalLiabilities += Math.abs(balance);
      } else if (type === 'loan') {
        if (subtype.includes('mortgage')) {
          result.accounts.mortgage += Math.abs(balance);
        } else {
          result.accounts.loan += Math.abs(balance);
        }
        totalLiabilities += Math.abs(balance);
      }
    }

    result.totalAssets = totalAssets;
    result.totalLiabilities = totalLiabilities;
    result.netWorth = totalAssets - totalLiabilities;

    // 2. Detect monthly income from transactions
    result.monthlyIncome = await detectEnhancedMonthlyIncome(userId);

    // 3. Analyze expense patterns
    const expenses = await analyzeMonthlyExpenses(userId);
    result.monthlyExpenses = expenses;

    // 4. Generate budget suggestions based on income and expenses
    if (result.monthlyIncome) {
      result.suggestedBudget = generateBudgetSuggestions(
        result.monthlyIncome,
        expenses
      );
    }

    // 5. Store detected data in preferences
    await storeDetectedFinancialData(userId, result);

    return result;
  } catch (error) {
    console.error('Error detecting financial profile:', error);
    return result;
  }
}

/**
 * Enhanced income detection with multiple methods
 */
async function detectEnhancedMonthlyIncome(userId: string): Promise<number | null> {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: { gte: sixtyDaysAgo },
        amount: { lt: 0 } // Negative = income in Plaid
      },
      orderBy: { date: 'desc' }
    });

    if (transactions.length === 0) return null;

    // Method 1: Look for recurring deposits with similar amounts
    const incomePatterns = new Map<number, number[]>();
    
    for (const txn of transactions) {
      const amount = Math.abs(Number(txn.amount));
      const roundedAmount = Math.round(amount / 100) * 100; // Round to nearest $100
      
      if (amount > 500) { // Likely income if > $500
        if (!incomePatterns.has(roundedAmount)) {
          incomePatterns.set(roundedAmount, []);
        }
        incomePatterns.get(roundedAmount)!.push(amount);
      }
    }

    // Find most frequent income amount
    let mostLikelyIncome = 0;
    let maxFrequency = 0;

    for (const [rounded, amounts] of incomePatterns) {
      if (amounts.length > maxFrequency) {
        maxFrequency = amounts.length;
        mostLikelyIncome = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      }
    }

    // Method 2: Analyze by category and name patterns
    const incomeTransactions = transactions.filter(t => {
      const category = (t.category || '').toLowerCase();
      const name = (t.name || '').toLowerCase();
      const amount = Math.abs(Number(t.amount));
      
      return (
        amount > 500 && (
          category.includes('deposit') ||
          category.includes('payroll') ||
          category.includes('transfer') ||
          name.includes('payroll') ||
          name.includes('salary') ||
          name.includes('direct dep') ||
          name.includes('payment from') ||
          name.includes('dd ')
        )
      );
    });

    if (incomeTransactions.length === 0 && mostLikelyIncome === 0) {
      // Fallback: Use largest recurring deposits
      const largeDeposits = transactions
        .filter(t => Math.abs(Number(t.amount)) > 1000)
        .slice(0, 4);
      
      if (largeDeposits.length > 0) {
        const total = largeDeposits.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        return Math.round(total / 2); // Assume bi-weekly
      }
      return null;
    }

    // Calculate monthly income based on frequency
    if (incomeTransactions.length >= 4) {
      // Likely bi-weekly pay
      const total = incomeTransactions
        .slice(0, 4)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      return Math.round((total / 4) * 2.17); // Convert bi-weekly to monthly
    } else if (incomeTransactions.length >= 2) {
      // Could be bi-weekly or semi-monthly
      const total = incomeTransactions
        .slice(0, 2)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      return Math.round(total); // Assume monthly equivalent
    } else if (mostLikelyIncome > 0) {
      // Use pattern-detected income
      return Math.round(mostLikelyIncome * 2.17); // Assume bi-weekly
    }

    // Single large deposit - assume monthly
    return Math.round(Math.abs(Number(incomeTransactions[0]?.amount || 0)));
  } catch (error) {
    console.error('Error detecting enhanced income:', error);
    return null;
  }
}

/**
 * Analyze monthly spending patterns by category
 */
async function analyzeMonthlyExpenses(userId: string): Promise<Record<string, number>> {
  const expenses: Record<string, number> = {
    housing: 0,
    food: 0,
    transport: 0,
    utilities: 0,
    insurance: 0,
    healthcare: 0,
    entertainment: 0,
    shopping: 0,
    personal: 0,
    other: 0
  };

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: { gte: thirtyDaysAgo },
        amount: { gt: 0 } // Positive = expense in Plaid
      }
    });

    for (const txn of transactions) {
      const amount = Number(txn.amount) || 0;
      const category = (txn.category || '').toLowerCase();
      const name = (txn.name || '').toLowerCase();

      // Categorize expenses
      if (category.includes('rent') || category.includes('mortgage') || 
          name.includes('rent') || name.includes('mortgage')) {
        expenses.housing += amount;
      } else if (category.includes('food') || category.includes('restaurant') || 
                 category.includes('groceries') || name.includes('grocery')) {
        expenses.food += amount;
      } else if (category.includes('transport') || category.includes('gas') || 
                 category.includes('uber') || category.includes('lyft')) {
        expenses.transport += amount;
      } else if (category.includes('utilities') || name.includes('electric') || 
                 name.includes('water') || name.includes('gas co')) {
        expenses.utilities += amount;
      } else if (category.includes('insurance') || name.includes('insurance')) {
        expenses.insurance += amount;
      } else if (category.includes('medical') || category.includes('health')) {
        expenses.healthcare += amount;
      } else if (category.includes('entertainment') || category.includes('recreation')) {
        expenses.entertainment += amount;
      } else if (category.includes('shops') || category.includes('merchandise')) {
        expenses.shopping += amount;
      } else if (category.includes('personal')) {
        expenses.personal += amount;
      } else {
        expenses.other += amount;
      }
    }

    // Round all expenses
    for (const key in expenses) {
      expenses[key] = Math.round(expenses[key]);
    }

    return expenses;
  } catch (error) {
    console.error('Error analyzing expenses:', error);
    return expenses;
  }
}

/**
 * Generate budget suggestions based on income and spending
 */
function generateBudgetSuggestions(
  monthlyIncome: number,
  currentExpenses: Record<string, number>
): Record<string, number> {
  // Use 50/30/20 rule as baseline, adjusted for actual spending
  const needs = monthlyIncome * 0.5;
  const wants = monthlyIncome * 0.3;
  const savings = monthlyIncome * 0.2;

  const suggestedBudget: Record<string, number> = {
    housing: Math.max(currentExpenses.housing || 0, monthlyIncome * 0.28),
    food: Math.max(currentExpenses.food || 0, monthlyIncome * 0.12),
    transport: Math.max(currentExpenses.transport || 0, monthlyIncome * 0.15),
    utilities: Math.max(currentExpenses.utilities || 0, monthlyIncome * 0.05),
    insurance: Math.max(currentExpenses.insurance || 0, monthlyIncome * 0.05),
    healthcare: Math.max(currentExpenses.healthcare || 0, monthlyIncome * 0.05),
    entertainment: Math.min(currentExpenses.entertainment || monthlyIncome * 0.05, monthlyIncome * 0.05),
    shopping: Math.min(currentExpenses.shopping || monthlyIncome * 0.05, monthlyIncome * 0.05),
    personal: Math.min(currentExpenses.personal || monthlyIncome * 0.05, monthlyIncome * 0.05),
    savings: savings,
    emergency: monthlyIncome * 0.1,
    investments: monthlyIncome * 0.1
  };

  // Round all values
  for (const key in suggestedBudget) {
    suggestedBudget[key] = Math.round(suggestedBudget[key]);
  }

  return suggestedBudget;
}

/**
 * Store all detected financial data
 */
async function storeDetectedFinancialData(
  userId: string,
  data: DetectedFinancialData
): Promise<void> {
  try {
    await prisma.user_preferences.upsert({
      where: { user_id: userId },
      update: {
        financial_goals: {
          ...(await prisma.user_preferences.findUnique({ 
            where: { user_id: userId } 
          }))?.financial_goals as any || {},
          detectedMonthlyIncome: data.monthlyIncome,
          detectedNetWorth: data.netWorth,
          detectedAssets: data.totalAssets,
          detectedLiabilities: data.totalLiabilities,
          detectedExpenses: data.monthlyExpenses,
          suggestedBudget: data.suggestedBudget,
          detectedAccounts: data.accounts,
          lastDetectionDate: data.detectedAt
        },
        updated_at: new Date()
      },
      create: {
        id: randomUUID(),
        user_id: userId,
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        financial_goals: {
          detectedMonthlyIncome: data.monthlyIncome,
          detectedNetWorth: data.netWorth,
          detectedAssets: data.totalAssets,
          detectedLiabilities: data.totalLiabilities,
          detectedExpenses: data.monthlyExpenses,
          suggestedBudget: data.suggestedBudget,
          detectedAccounts: data.accounts,
          lastDetectionDate: data.detectedAt
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Also create initial budget if it doesn't exist
    if (data.suggestedBudget && Object.keys(data.suggestedBudget).length > 0) {
      const existingBudget = await prisma.budgets.findFirst({
        where: { 
          user_id: userId,
          name: 'Monthly Budget'
        }
      });

      if (!existingBudget) {
        const budget = await prisma.budgets.create({
          data: {
            id: randomUUID(),
            user_id: userId,
            name: 'Monthly Budget',
            description: 'Auto-generated from your spending patterns',
            amount: data.monthlyIncome || 0,
            period: 'monthly',
            start_date: new Date(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // Create budget categories
        for (const [category, amount] of Object.entries(data.suggestedBudget)) {
          if (amount > 0) {
            await prisma.budget_categories.create({
              data: {
                id: randomUUID(),
                budget_id: budget.id,
                category: category,
                amount: amount,
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error storing detected financial data:', error);
  }
}