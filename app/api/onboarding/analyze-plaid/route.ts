import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const prisma = new PrismaClient();

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicToken, metadata, accounts, access_token } = body;
    
    // If access_token is provided directly (from onboarding), use it
    // Otherwise try to get user from request for authenticated calls
    let user = null;
    if (!access_token) {
      user = await getUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Try to get actual transaction data if we have a Plaid connection
    let monthlyIncome = 0;
    let expenses = {};
    
    try {
      // Get access token from either the request or the user's Plaid connection
      let accessToken = access_token;
      
      if (!accessToken && user) {
        const plaidConnection = await prisma.plaid_connections.findFirst({
          where: {
            user_id: user.id,
            is_active: true
          },
          orderBy: {
            created_at: 'desc'
          }
        });
        accessToken = plaidConnection?.plaid_access_token;
      }

      if (accessToken) {
        // Fetch recent transactions to analyze income
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        
        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
        });

        const transactions = transactionsResponse.data.transactions;
        
        // Detect income from deposits (more comprehensive)
        const incomeTransactions = transactions.filter(t => {
          const amount = Math.abs(t.amount);
          const name = t.name?.toLowerCase() || '';
          const merchantName = t.merchant_name?.toLowerCase() || '';
          
          // Negative amounts are deposits in Plaid
          if (t.amount >= 0) return false; // Skip expenses
          
          // Check for obvious income patterns
          const incomeKeywords = [
            'payroll', 'salary', 'direct dep', 'wages', 'income',
            'employer', 'pay', 'commission', 'bonus'
          ];
          
          const isLikelyIncome = 
            // Category-based detection
            t.category?.some(cat => 
              cat.toLowerCase().includes('deposit') ||
              cat.toLowerCase().includes('payroll') ||
              cat.toLowerCase().includes('transfer')
            ) ||
            // Name-based detection
            incomeKeywords.some(keyword => 
              name.includes(keyword) || merchantName.includes(keyword)
            ) ||
            // Amount-based detection (regular large deposits)
            (t.category?.includes('Transfer') && amount > 500);
            
          return isLikelyIncome;
        });

        // Group by approximate frequency to find recurring income
        const recurringDeposits: Map<number, number[]> = new Map();
        
        incomeTransactions.forEach(t => {
          const amount = Math.round(Math.abs(t.amount) / 100) * 100; // Round to nearest 100
          if (!recurringDeposits.has(amount)) {
            recurringDeposits.set(amount, []);
          }
          recurringDeposits.get(amount)?.push(Math.abs(t.amount));
        });
        
        // Find the most likely salary amount (most frequent similar deposit)
        let likelySalary = 0;
        let maxFrequency = 0;
        
        recurringDeposits.forEach((amounts, roundedAmount) => {
          if (amounts.length > maxFrequency && roundedAmount >= 1000) {
            maxFrequency = amounts.length;
            likelySalary = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
          }
        });
        
        // Calculate monthly income
        if (likelySalary > 0) {
          // Assume bi-weekly or monthly pay
          if (maxFrequency >= 6) {
            // Likely bi-weekly (6+ deposits in 3 months)
            monthlyIncome = Math.round(likelySalary * 2.17); // 26 pay periods / 12 months
          } else if (maxFrequency >= 3) {
            // Likely monthly
            monthlyIncome = Math.round(likelySalary);
          } else {
            // Fall back to total average
            const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            monthlyIncome = Math.round(totalIncome / 3);
          }
        } else if (incomeTransactions.length > 0) {
          // No clear pattern, use average
          const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          monthlyIncome = Math.round(totalIncome / 3);
        }

        // Analyze expenses by category
        const expenseTransactions = transactions.filter(t => t.amount > 0);
        const categoryTotals: Record<string, number> = {};
        
        expenseTransactions.forEach(t => {
          const category = mapPlaidCategory(t.category?.[0] || 'Other');
          categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
        });

        // Convert to monthly averages
        expenses = Object.entries(categoryTotals).reduce((acc, [cat, total]) => {
          acc[cat] = {
            amount: Math.round(total / 3),
            percentage: 0,
            transactions: []
          };
          return acc;
        }, {} as Record<string, any>);

        // Calculate percentages
        const totalExpenses = Object.values(expenses).reduce((sum: number, e: any) => sum + e.amount, 0);
        Object.values(expenses).forEach((e: any) => {
          e.percentage = Math.round((e.amount / totalExpenses) * 100);
        });
      }
    } catch (plaidError) {
      console.error('Error fetching Plaid transactions:', plaidError);
    }

    // Fall back to estimates if we couldn't get real data
    if (monthlyIncome === 0) {
      monthlyIncome = detectMonthlyIncome(accounts);
    }
    if (Object.keys(expenses).length === 0) {
      expenses = detectExpenseCategories(accounts);
    }

    // Calculate assets and liabilities from accounts
    const assets = calculateAssets(accounts);
    const liabilities = calculateLiabilities(accounts);
    const netWorth = calculateNetWorth(accounts);
    
    // Build analysis response
    const analysis = {
      monthlyIncome,
      expenses,
      debts: liabilities.total,
      accountsCount: accounts?.length || 0,
      netWorth,
      savingsRate: 0,
      recurringCharges: [],
      // Add detailed asset/liability breakdown
      assets: assets,
      liabilities: liabilities,
      detectedAssets: {
        checking: assets.checking,
        savings: assets.savings,
        investments: assets.investments,
        retirement: assets.retirement,
        total: assets.total
      },
      detectedLiabilities: {
        credit_cards: liabilities.creditCards,
        mortgage: liabilities.mortgage,
        auto_loans: liabilities.autoLoans,
        student_loans: liabilities.studentLoans,
        other_loans: liabilities.otherLoans,
        total: liabilities.total
      }
    };

    // Calculate savings rate
    if (analysis.monthlyIncome > 0) {
      const totalExpenses = Object.values(analysis.expenses).reduce((sum: number, val: any) => sum + (val.amount || 0), 0);
      analysis.savingsRate = Math.max(0, Math.round(((analysis.monthlyIncome - totalExpenses) / analysis.monthlyIncome) * 100));
    }

    await prisma.$disconnect();
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing Plaid data:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to analyze account data' },
      { status: 500 }
    );
  }
}

function mapPlaidCategory(plaidCategory: string): string {
  const categoryMap: Record<string, string> = {
    'Food and Drink': 'food',
    'Shops': 'shopping',
    'Travel': 'travel',
    'Transportation': 'transportation',
    'Service': 'services',
    'Healthcare': 'healthcare',
    'Recreation': 'entertainment',
    'Transfer': 'transfers',
    'Payment': 'bills',
    'Interest': 'interest',
    'Bank Fees': 'fees',
    'Cash Advance': 'cash',
    'Tax': 'taxes'
  };
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (plaidCategory.includes(key)) {
      return value;
    }
  }
  
  return 'other';
}

function detectMonthlyIncome(accounts: any[]): number {
  // Simulate income detection from checking accounts
  if (!accounts || accounts.length === 0) return 5000; // Default if no accounts
  
  // Look for checking accounts
  const checkingAccount = accounts.find(acc => 
    acc.subtype === 'checking' || acc.type === 'depository'
  );
  
  if (checkingAccount) {
    // For sandbox accounts, use a reasonable estimate based on account type
    // Plaid sandbox accounts don't have realistic balance patterns
    const balance = checkingAccount.balances?.current || checkingAccount.balances?.available || 0;
    
    // If balance is very low (common in sandbox), use reasonable defaults
    if (balance < 100) {
      return 5000; // Default monthly income for sandbox
    }
    
    // Otherwise estimate based on balance
    // Assume monthly income is roughly 40% of checking balance
    return Math.max(2000, Math.min(25000, Math.round(balance * 0.4)));
  }
  
  return 5000; // Default estimate
}

function detectExpenseCategories(accounts: any[]): Record<string, any> {
  // In production, this would analyze actual transactions
  // For now, return smart defaults
  const monthlyIncome = detectMonthlyIncome(accounts);
  
  return {
    housing: {
      amount: Math.round(monthlyIncome * 0.28),
      percentage: 28,
      transactions: []
    },
    food: {
      amount: Math.round(monthlyIncome * 0.12),
      percentage: 12,
      transactions: []
    },
    transportation: {
      amount: Math.round(monthlyIncome * 0.15),
      percentage: 15,
      transactions: []
    },
    utilities: {
      amount: Math.round(monthlyIncome * 0.08),
      percentage: 8,
      transactions: []
    },
    entertainment: {
      amount: Math.round(monthlyIncome * 0.05),
      percentage: 5,
      transactions: []
    },
    shopping: {
      amount: Math.round(monthlyIncome * 0.07),
      percentage: 7,
      transactions: []
    },
    other: {
      amount: Math.round(monthlyIncome * 0.05),
      percentage: 5,
      transactions: []
    },
    total: Math.round(monthlyIncome * 0.8) // 80% of income as expenses
  };
}

function detectDebts(accounts: any[]): any {
  // Look for credit cards and loans
  const creditCards = accounts?.filter(acc => 
    acc.type === 'credit' || acc.subtype === 'credit card'
  ) || [];
  
  const loans = accounts?.filter(acc => 
    acc.type === 'loan' || acc.subtype?.includes('loan')
  ) || [];
  
  let totalDebt = 0;
  const debtDetails: any[] = [];
  
  creditCards.forEach(card => {
    const balance = card.balances?.current || 0;
    if (balance > 0) {
      totalDebt += balance;
      debtDetails.push({
        type: 'credit_card',
        name: card.name,
        balance: balance,
        minimumPayment: Math.round(balance * 0.02) // 2% minimum
      });
    }
  });
  
  loans.forEach(loan => {
    const balance = loan.balances?.current || 0;
    if (balance > 0) {
      totalDebt += balance;
      debtDetails.push({
        type: loan.subtype || 'loan',
        name: loan.name,
        balance: balance,
        minimumPayment: Math.round(balance * 0.01) // Rough estimate
      });
    }
  });
  
  return {
    total: totalDebt,
    details: debtDetails,
    hasDebt: totalDebt > 0
  };
}

function calculateAssets(accounts: any[]): any {
  const assets = {
    checking: 0,
    savings: 0,
    investments: 0,
    retirement: 0,
    other: 0,
    total: 0
  };
  
  if (!accounts || accounts.length === 0) return assets;
  
  accounts.forEach(account => {
    const balance = Math.abs(account.balances?.current || 0);
    
    if (account.type === 'depository') {
      if (account.subtype === 'checking') {
        assets.checking += balance;
      } else if (account.subtype === 'savings' || account.subtype === 'hsa') {
        assets.savings += balance;
      } else {
        assets.other += balance;
      }
    } else if (account.type === 'investment') {
      if (account.subtype === '401k' || account.subtype === 'ira' || account.subtype === 'roth') {
        assets.retirement += balance;
      } else {
        assets.investments += balance;
      }
    }
  });
  
  assets.total = assets.checking + assets.savings + assets.investments + assets.retirement + assets.other;
  return assets;
}

function calculateLiabilities(accounts: any[]): any {
  const liabilities = {
    creditCards: 0,
    mortgage: 0,
    autoLoans: 0,
    studentLoans: 0,
    otherLoans: 0,
    total: 0
  };
  
  if (!accounts || accounts.length === 0) return liabilities;
  
  accounts.forEach(account => {
    const balance = Math.abs(account.balances?.current || 0);
    
    if (account.type === 'credit') {
      liabilities.creditCards += balance;
    } else if (account.type === 'loan') {
      if (account.subtype === 'mortgage' || account.subtype === 'home') {
        liabilities.mortgage += balance;
      } else if (account.subtype === 'auto') {
        liabilities.autoLoans += balance;
      } else if (account.subtype === 'student') {
        liabilities.studentLoans += balance;
      } else {
        liabilities.otherLoans += balance;
      }
    }
  });
  
  liabilities.total = liabilities.creditCards + liabilities.mortgage + 
                     liabilities.autoLoans + liabilities.studentLoans + liabilities.otherLoans;
  return liabilities;
}

function calculateNetWorth(accounts: any[]): number {
  const assets = calculateAssets(accounts);
  const liabilities = calculateLiabilities(accounts);
  return assets.total - liabilities.total;
}