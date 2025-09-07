import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { categorizeTransaction } from '@/lib/categorization';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Check authentication
  const user = await getUserFromRequest(req);
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the days parameter from query string, default to 30
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    // Get transactions from the specified number of days
    const now = new Date();
    const daysAgo = new Date();
    daysAgo.setDate(now.getDate() - days);

    // First, try to get recurring income from the database
    const recurringIncome = await prisma.recurring_income.findMany({
      where: {
        user_id: userId,
        OR: [
          { effective_to: null },
          { effective_to: { gte: now } }
        ]
      }
    });

    // Calculate monthly income from recurring_income table if available
    let monthlyIncomeFromRecurring = 0;
    if (recurringIncome.length > 0) {
      monthlyIncomeFromRecurring = recurringIncome.reduce((sum, income) => {
        const amount = income.gross_monthly || income.net_monthly || 0;
        return sum + Number(amount);
      }, 0);
    }

    let transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: daysAgo,
          lte: now,
        },
      },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
      },
    });

    // If no recent transactions, get the most recent transactions available (fallback)
    if (transactions.length === 0) {
      console.log(`No transactions in last ${days} days for user ${userId}, looking for historical data...`);
      
      // Get the most recent transaction date for this user
      const latestTransaction = await prisma.transactions.findFirst({
        where: { user_id: userId },
        orderBy: { date: 'desc' },
        select: { date: true }
      });

      if (latestTransaction) {
        // Get transactions from the month of the latest transaction
        const latestDate = new Date(latestTransaction.date);
        const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
        const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 23, 59, 59, 999);
        
        console.log(`Getting historical transactions from ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
        
        transactions = await prisma.transactions.findMany({
          where: {
            user_id: userId,
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          select: {
            id: true,
            amount: true,
            category: true,
            date: true,
          },
        });
      }
    }

    // Initialize spending by main category and income tracking
    const spentByMain = {
      'Monthly Budget': 0,
      'Essentials': 0,
      'Lifestyle': 0,
      'Savings': 0,
    };
    
    let totalIncome = 0;
    let totalSpending = 0;
    let transactionBasedIncome = 0;

    // Track categories for debugging
    const categoryBreakdown: Record<string, number> = {};
    const incomeTransactions: Array<{amount: number, category: string | null, date: Date}> = [];
    
    // Define income-related categories and keywords
    const incomeCategories = ['transfer', 'deposit', 'payroll', 'salary', 'wages', 'income'];
    const excludeCategories = ['credit card payment', 'payment', 'loan payment'];
    
    // Aggregate spending by main category and calculate income
    for (const transaction of transactions) {
      const mainCategory = categorizeTransaction(transaction.category);
      const categoryLower = transaction.category?.toLowerCase() || '';
      
      // Track original categories for debugging
      if (transaction.category) {
        categoryBreakdown[transaction.category] = (categoryBreakdown[transaction.category] || 0) + 1;
      }
      
      if (transaction.amount > 0) {
        // Check if this is truly income based on category
        const isIncome = incomeCategories.some(cat => categoryLower.includes(cat)) &&
                        !excludeCategories.some(cat => categoryLower.includes(cat));
        
        if (isIncome || mainCategory === 'Income') {
          transactionBasedIncome += transaction.amount;
          incomeTransactions.push({
            amount: transaction.amount,
            category: transaction.category,
            date: transaction.date
          });
        }
      } else if (transaction.amount < 0 && mainCategory !== 'Income') {
        // Negative amounts are spending (excluding any miscategorized income)
        const amount = Math.abs(transaction.amount);
        totalSpending += amount;
        
        // Add to specific category
        if (mainCategory === 'Essentials') {
          spentByMain['Essentials'] += amount;
        } else if (mainCategory === 'Lifestyle') {
          spentByMain['Lifestyle'] += amount;
        } else if (mainCategory === 'Savings') {
          spentByMain['Savings'] += amount;
        }
        
        // Add to Monthly Budget (sum of all spending except savings)
        if (mainCategory !== 'Savings') {
          spentByMain['Monthly Budget'] += amount;
        }
      }
    }

    // Determine the best income source to use
    // Priority: 1) Recurring income table, 2) Transaction-based detection
    if (monthlyIncomeFromRecurring > 0) {
      // Use recurring income if available
      totalIncome = monthlyIncomeFromRecurring;
      console.log(`Using recurring_income table: $${monthlyIncomeFromRecurring}`);
    } else if (transactionBasedIncome > 0) {
      // Fall back to transaction-based income detection
      // For monthly calculation, we need to normalize to monthly amount
      const daysInPeriod = Math.min(days, 
        Math.floor((now.getTime() - (transactions[transactions.length - 1]?.date ? new Date(transactions[transactions.length - 1].date).getTime() : now.getTime())) / (1000 * 60 * 60 * 24))
      );
      
      // Normalize to monthly (30 days)
      if (daysInPeriod > 0 && daysInPeriod < 30) {
        totalIncome = (transactionBasedIncome / daysInPeriod) * 30;
      } else {
        totalIncome = transactionBasedIncome;
      }
      console.log(`Using transaction-based income: $${transactionBasedIncome} (normalized: $${totalIncome})`);
    } else {
      // No income detected
      totalIncome = 0;
      console.log('No income detected from recurring_income table or transactions');
    }

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0;
    const cashFlow = totalIncome - totalSpending;

    // Debug logging
    console.log(`Dashboard spending calculation for user ${userId} (last ${days} days):`);
    console.log(`Requested date range: ${daysAgo.toISOString()} to ${now.toISOString()}`);
    if (transactions.length > 0) {
      const dates = transactions.map(t => new Date(t.date));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      console.log(`Actual transaction date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
    }
    console.log(`Found ${transactions.length} transactions`);
    console.log(`Recurring income sources: ${recurringIncome.length}`);
    console.log(`Income transactions found: ${incomeTransactions.length}`);
    console.log(`Total income: ${totalIncome} (recurring: ${monthlyIncomeFromRecurring}, transactions: ${transactionBasedIncome})`);
    console.log(`Total spending: ${totalSpending}`);
    console.log(`Savings rate: ${savingsRate}%`);
    console.log('Categories found:', categoryBreakdown);

    return NextResponse.json({ 
      spentByMain,
      totalIncome,
      totalSpending,
      savingsRate,
      cashFlow,
      month: now.toISOString().substring(0, 7), // YYYY-MM format
      transactionCount: transactions.length,
      incomeSource: monthlyIncomeFromRecurring > 0 ? 'recurring_income' : 'transactions',
      incomeDetails: {
        recurring: monthlyIncomeFromRecurring,
        transactionBased: transactionBasedIncome,
        incomeTransactionCount: incomeTransactions.length
      },
      dateRange: {
        start: daysAgo.toISOString(),
        end: now.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard spending data:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 