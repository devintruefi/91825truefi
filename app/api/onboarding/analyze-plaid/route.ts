import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicToken, metadata, accounts } = await request.json();

    // Here we would normally exchange the public token for an access token
    // and fetch actual transaction data from Plaid
    // For now, we'll simulate the analysis

    // Simulate analyzing transactions to detect patterns
    const analysis = {
      monthlyIncome: detectMonthlyIncome(accounts),
      expenses: detectExpenseCategories(accounts),
      debts: detectDebts(accounts),
      accountsCount: accounts?.length || 0,
      netWorth: calculateNetWorth(accounts),
      savingsRate: 0,
      recurringCharges: []
    };

    // Calculate savings rate
    if (analysis.monthlyIncome > 0) {
      const totalExpenses = Object.values(analysis.expenses).reduce((sum: number, val: any) => sum + (val.amount || 0), 0);
      analysis.savingsRate = Math.max(0, Math.round(((analysis.monthlyIncome - totalExpenses) / analysis.monthlyIncome) * 100));
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing Plaid data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze account data' },
      { status: 500 }
    );
  }
}

function detectMonthlyIncome(accounts: any[]): number {
  // Simulate income detection from checking accounts
  // In production, this would analyze actual deposit transactions
  if (!accounts || accounts.length === 0) return 0;
  
  // Look for checking accounts
  const checkingAccount = accounts.find(acc => 
    acc.subtype === 'checking' || acc.type === 'depository'
  );
  
  if (checkingAccount) {
    // Estimate based on balance (very rough estimate)
    // In production, we'd analyze recurring deposits
    const balance = checkingAccount.balances?.current || 0;
    // Assume monthly income is roughly 40% of checking balance
    return Math.round(balance * 0.4);
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

function calculateNetWorth(accounts: any[]): number {
  if (!accounts || accounts.length === 0) return 0;
  
  let assets = 0;
  let liabilities = 0;
  
  accounts.forEach(account => {
    const balance = account.balances?.current || 0;
    
    if (account.type === 'depository' || account.type === 'investment') {
      assets += Math.abs(balance);
    } else if (account.type === 'credit' || account.type === 'loan') {
      liabilities += Math.abs(balance);
    }
  });
  
  return assets - liabilities;
}