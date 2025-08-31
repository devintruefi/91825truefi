import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * Detect monthly income from connected accounts and transactions
 */
export async function detectMonthlyIncome(userId: string): Promise<number | null> {
  try {
    // Get accounts for the user
    const accounts = await prisma.accounts.findMany({
      where: { 
        user_id: userId,
        is_active: true
      }
    });

    if (accounts.length === 0) {
      return null;
    }

    // Get recent transactions to analyze income patterns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: thirtyDaysAgo
        },
        amount: {
          lt: 0 // In Plaid, negative amounts are income/credits
        }
      },
      orderBy: {
        amount: 'asc' // Most negative (highest income) first
      }
    });

    if (transactions.length === 0) {
      return null;
    }

    // Look for recurring income patterns (salary, etc.)
    const incomeTransactions = transactions.filter(t => {
      const category = t.category?.toLowerCase() || '';
      const name = t.name?.toLowerCase() || '';
      
      // Common income indicators
      return (
        category.includes('deposit') ||
        category.includes('payroll') ||
        category.includes('salary') ||
        category.includes('income') ||
        category.includes('transfer') ||
        name.includes('payroll') ||
        name.includes('salary') ||
        name.includes('direct dep') ||
        name.includes('dd ') ||
        Math.abs(Number(t.amount)) > 1000 // Likely income if > $1000
      );
    });

    if (incomeTransactions.length === 0) {
      // Fall back to largest deposits
      const largestDeposits = transactions.slice(0, 5);
      const totalIncome = largestDeposits.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      return Math.round(totalIncome);
    }

    // Calculate monthly income from detected transactions
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    // If we have multiple income transactions, they might be bi-weekly
    if (incomeTransactions.length >= 2) {
      // Assume bi-weekly pay if we see 2+ deposits
      return Math.round(totalIncome * 2.17); // Convert bi-weekly to monthly
    }
    
    return Math.round(totalIncome);
  } catch (error) {
    console.error('Error detecting income:', error);
    return null;
  }
}

/**
 * Store detected income in user preferences
 */
export async function storeDetectedIncome(userId: string, monthlyIncome: number): Promise<void> {
  try {
    await prisma.user_preferences.upsert({
      where: { user_id: userId },
      update: {
        financial_goals: {
          ...(await prisma.user_preferences.findUnique({ 
            where: { user_id: userId } 
          }))?.financial_goals as any || {},
          detectedMonthlyIncome: monthlyIncome,
          incomeDetectedAt: new Date()
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
          detectedMonthlyIncome: monthlyIncome,
          incomeDetectedAt: new Date()
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error storing detected income:', error);
  }
}