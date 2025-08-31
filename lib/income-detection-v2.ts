/**
 * Income Detection V2 - Reliable Plaid-based income detection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IncomeDetectionResult {
  monthlyIncome: number;
  confidence: number; // 0-100
  source: 'transactions' | 'payroll' | 'mixed' | 'manual';
  details: {
    recurringDeposits?: Array<{
      name: string;
      amount: number;
      frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
      lastDate: Date;
    }>;
    payrollData?: {
      employer: string;
      grossPay: number;
      netPay: number;
      payFrequency: string;
    };
  };
}

/**
 * Detect monthly income from Plaid transactions and payroll data
 */
export async function detectMonthlyIncomeV2(userId: string): Promise<IncomeDetectionResult | null> {
  try {
    // Get transactions from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: ninetyDaysAgo
        },
        amount: {
          lt: 0 // Negative amounts in Plaid are deposits/income
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    if (transactions.length === 0) {
      return null;
    }
    
    // Group transactions by normalized name and detect patterns
    const transactionGroups = new Map<string, typeof transactions>();
    
    for (const txn of transactions) {
      const normalizedName = normalizeTransactionName(txn.name || '');
      if (!transactionGroups.has(normalizedName)) {
        transactionGroups.set(normalizedName, []);
      }
      transactionGroups.get(normalizedName)!.push(txn);
    }
    
    // Detect recurring deposits
    const recurringDeposits: IncomeDetectionResult['details']['recurringDeposits'] = [];
    let totalMonthlyIncome = 0;
    let hasHighConfidenceIncome = false;
    
    for (const [name, txns] of transactionGroups) {
      if (txns.length < 2) continue; // Need at least 2 transactions to detect pattern
      
      // Check if this looks like income
      if (!looksLikeIncome(name, txns)) continue;
      
      // Detect frequency
      const frequency = detectFrequency(txns);
      if (!frequency) continue;
      
      // Calculate average amount (convert from negative to positive)
      const avgAmount = Math.abs(
        txns.reduce((sum, t) => sum + (t.amount || 0), 0) / txns.length
      );
      
      // Convert to monthly
      const monthlyAmount = convertToMonthly(avgAmount, frequency);
      
      recurringDeposits.push({
        name,
        amount: avgAmount,
        frequency,
        lastDate: txns[0].date ? new Date(txns[0].date) : new Date()
      });
      
      totalMonthlyIncome += monthlyAmount;
      
      // High confidence if we have payroll/salary patterns
      if (name.toLowerCase().includes('payroll') || 
          name.toLowerCase().includes('salary') ||
          name.toLowerCase().includes('direct dep')) {
        hasHighConfidenceIncome = true;
      }
    }
    
    if (totalMonthlyIncome === 0) {
      return null;
    }
    
    // Calculate confidence score
    const confidence = calculateConfidence(recurringDeposits, hasHighConfidenceIncome);
    
    return {
      monthlyIncome: Math.round(totalMonthlyIncome),
      confidence,
      source: 'transactions',
      details: {
        recurringDeposits
      }
    };
    
  } catch (error) {
    console.error('Error detecting monthly income:', error);
    return null;
  }
}

/**
 * Normalize transaction names for grouping
 */
function normalizeTransactionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[0-9]/g, '') // Remove numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
}

/**
 * Check if transactions look like income
 */
function looksLikeIncome(name: string, transactions: any[]): boolean {
  const incomeKeywords = [
    'payroll', 'salary', 'direct dep', 'dd', 'wages', 'paycheck',
    'employer', 'earnings', 'compensation', 'commision', 'bonus'
  ];
  
  const nameLower = name.toLowerCase();
  
  // Check for income keywords
  if (incomeKeywords.some(keyword => nameLower.includes(keyword))) {
    return true;
  }
  
  // Check if amounts are consistent and substantial
  const amounts = transactions.map(t => Math.abs(t.amount || 0));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  
  // Income tends to be consistent amounts
  const variance = (maxAmount - minAmount) / avgAmount;
  
  // Likely income if:
  // - Amount is > $500 (typical paycheck)
  // - Variance is < 20% (consistent amounts)
  // - Regular timing (checked separately)
  return avgAmount > 500 && variance < 0.2;
}

/**
 * Detect payment frequency from transaction dates
 */
function detectFrequency(transactions: any[]): 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null {
  if (transactions.length < 2) return null;
  
  // Calculate days between transactions
  const dates = transactions
    .map(t => new Date(t.date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const daysBetween: number[] = [];
  for (let i = 0; i < dates.length - 1; i++) {
    const days = Math.round(
      (dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    daysBetween.push(days);
  }
  
  // Calculate average days between transactions
  const avgDays = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
  
  // Determine frequency based on average days
  if (avgDays >= 6 && avgDays <= 8) return 'weekly';
  if (avgDays >= 13 && avgDays <= 15) return 'biweekly';
  if (avgDays >= 14 && avgDays <= 16) return 'semimonthly';
  if (avgDays >= 28 && avgDays <= 32) return 'monthly';
  
  // Check for semimonthly pattern (1st and 15th)
  const datesOfMonth = dates.map(d => d.getDate());
  const hasSemimonthlyPattern = datesOfMonth.some(d => d <= 3 || d >= 28) &&
                                datesOfMonth.some(d => d >= 14 && d <= 17);
  if (hasSemimonthlyPattern) return 'semimonthly';
  
  return null;
}

/**
 * Convert income amount to monthly equivalent
 */
function convertToMonthly(amount: number, frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'): number {
  switch (frequency) {
    case 'weekly':
      return amount * 52 / 12; // 52 weeks per year / 12 months
    case 'biweekly':
      return amount * 26 / 12; // 26 pay periods per year / 12 months
    case 'semimonthly':
      return amount * 2; // 2 payments per month
    case 'monthly':
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculate confidence score for income detection
 */
function calculateConfidence(
  deposits: NonNullable<IncomeDetectionResult['details']['recurringDeposits']>,
  hasHighConfidencePattern: boolean
): number {
  let confidence = 50; // Base confidence
  
  // Add confidence for number of recurring deposits found
  if (deposits.length > 0) confidence += 20;
  if (deposits.length > 2) confidence += 10;
  
  // Add confidence for high-confidence patterns
  if (hasHighConfidencePattern) confidence += 20;
  
  // Add confidence for regular frequency
  const hasRegularFrequency = deposits.some(d => 
    ['biweekly', 'semimonthly', 'monthly'].includes(d.frequency)
  );
  if (hasRegularFrequency) confidence += 10;
  
  return Math.min(confidence, 100);
}

/**
 * Get income suggestions for verify_income step
 */
export async function getIncomeSuggestions(userId: string): Promise<{
  detected: boolean;
  amount?: number;
  confidence?: number;
  source?: string;
  message: string;
}> {
  const detection = await detectMonthlyIncomeV2(userId);
  
  if (!detection || detection.monthlyIncome === 0) {
    return {
      detected: false,
      message: "I couldn't auto-detect your income. Please enter it manually."
    };
  }
  
  return {
    detected: true,
    amount: detection.monthlyIncome,
    confidence: detection.confidence,
    source: detection.source,
    message: `I detected $${detection.monthlyIncome.toLocaleString()} monthly income from your connected accounts.`
  };
}

/**
 * Persist detected income to database
 */
export async function persistDetectedIncome(
  userId: string,
  incomeData: {
    amount: number;
    source: string;
    frequency?: string;
  }
): Promise<void> {
  try {
    // Update user preferences with detected income
    await prisma.user_preferences.upsert({
      where: { user_id: userId },
      update: {
        financial_goals: {
          ...(await prisma.user_preferences.findUnique({ 
            where: { user_id: userId } 
          }))?.financial_goals as any || {},
          monthlyIncome: incomeData.amount,
          incomeSource: incomeData.source,
          incomeFrequency: incomeData.frequency,
          incomeDetectedAt: new Date()
        },
        updated_at: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        financial_goals: {
          monthlyIncome: incomeData.amount,
          incomeSource: incomeData.source,
          incomeFrequency: incomeData.frequency,
          incomeDetectedAt: new Date()
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Also create/update recurring_income record
    await prisma.recurring_income.upsert({
      where: {
        user_id_source_effective_from: {
          user_id: userId,
          source: incomeData.source,
          effective_from: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      update: {
        gross_monthly: incomeData.amount,
        next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        inflation_adj: false
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        source: incomeData.source,
        gross_monthly: incomeData.amount,
        frequency: incomeData.frequency || 'monthly',
        next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        inflation_adj: false,
        effective_from: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
  } catch (error) {
    console.error('Error persisting detected income:', error);
    throw error;
  }
}