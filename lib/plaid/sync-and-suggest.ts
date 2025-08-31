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

interface IncomeSuggestion {
  monthly_net_income: number;
  primary_employer?: string;
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'variable';
  variable_income_pct: number;
}

interface BudgetSuggestion {
  categories: Record<string, number>;
  isFromPlaidData: boolean;
}

/**
 * Main function to sync Plaid data and generate suggestions
 */
export async function plaidSyncAndSuggest(userId: string): Promise<void> {
  try {
    // Get user's Plaid connections
    const plaidConnections = await prisma.plaid_connections.findMany({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (!plaidConnections.length) {
      return;
    }

    const suggestions: Record<string, any> = {};

    // Process each connection
    for (const connection of plaidConnections) {
      if (!connection.plaid_access_token) continue;

      // Fetch accounts and balances
      const accountsResponse = await plaidClient.accountsBalanceGet({
        access_token: connection.plaid_access_token
      });

      // Fetch transactions (last 90-120 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 120);

      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: connection.plaid_access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: 500,
          include_personal_finance_category: true
        }
      });

      // Generate income suggestions
      const incomeSuggestion = detectIncome(transactionsResponse.data.transactions);
      if (incomeSuggestion) {
        suggestions.income_capture = incomeSuggestion;
        suggestions.manual_income = incomeSuggestion;
        suggestions.income_confirmation = incomeSuggestion;
      }

      // Generate budget suggestions
      const budgetSuggestion = generateBudgetBaseline(
        transactionsResponse.data.transactions,
        incomeSuggestion?.monthly_net_income
      );
      suggestions.expenses_capture = budgetSuggestion;
      suggestions.budget_review = budgetSuggestion;

      // Fetch and process liabilities
      try {
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: connection.plaid_access_token
        });

        const debts = processLiabilities(liabilitiesResponse.data.liabilities);
        suggestions.debts_detail = { debts };
      } catch (e) {
        // Liabilities might not be available for all accounts
        console.log('Liabilities not available:', e);
      }

      // Calculate net worth and emergency fund
      const netWorth = calculateNetWorth(accountsResponse.data.accounts);
      suggestions.household = { 
        household_net_worth: netWorth.total,
        assets: netWorth.assets,
        liabilities: netWorth.liabilities
      };

      // Emergency fund calculation
      const liquidSavings = accountsResponse.data.accounts
        .filter((a: any) => a.type === 'depository' && a.subtype === 'savings')
        .reduce((sum: number, a: any) => sum + (a.balances.current || 0), 0);
      
      const monthlyExpenses = Object.values(budgetSuggestion.categories)
        .reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
      
      const emergencyMonths = monthlyExpenses > 0 ? Math.round(liquidSavings / monthlyExpenses * 10) / 10 : 0;
      
      suggestions.emergency_fund = {
        current_amount: liquidSavings,
        current_months: emergencyMonths,
        recommended_months: 3
      };
    }

    // Store suggestions in the active chat session
    const activeSession = await prisma.chat_sessions.findFirst({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (activeSession) {
      // Create a message to store suggestions
      await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          session_id: activeSession.id,
          user_id: userId,
          message_type: 'system',
          content: 'Plaid data synced and suggestions generated',
          rich_content: { suggestions },
          turn_number: 0,
          created_at: new Date()
        }
      });
    }

  } catch (error) {
    console.error('Error in plaidSyncAndSuggest:', error);
  }
}

/**
 * Detect income from transactions
 */
function detectIncome(transactions: any[]): IncomeSuggestion | null {
  const incomeTransactions = transactions.filter(t => {
    const category = t.personal_finance_category?.primary || t.category?.[0] || '';
    const name = t.name?.toLowerCase() || '';
    
    return (
      t.amount < 0 && // Credits are negative in Plaid
      (
        category.includes('PAYROLL') ||
        category.includes('DEPOSIT') ||
        name.includes('payroll') ||
        name.includes('salary') ||
        name.includes('wages') ||
        name.includes('paycheck') ||
        name.includes('direct dep')
      ) &&
      !name.includes('transfer') &&
      !name.includes('refund')
    );
  });

  if (!incomeTransactions.length) {
    return null;
  }

  // Group by month
  const monthlyIncome: Record<string, number> = {};
  incomeTransactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    monthlyIncome[month] = (monthlyIncome[month] || 0) + Math.abs(t.amount);
  });

  const months = Object.keys(monthlyIncome).sort();
  const last3Months = months.slice(-3);
  
  if (last3Months.length < 2) {
    return null;
  }

  const incomeValues = last3Months.map(m => monthlyIncome[m]);
  const avgIncome = incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
  
  // Detect pay frequency
  const intervals: number[] = [];
  for (let i = 1; i < incomeTransactions.length; i++) {
    const days = Math.abs(
      new Date(incomeTransactions[i].date).getTime() - 
      new Date(incomeTransactions[i-1].date).getTime()
    ) / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }
  
  const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)] || 30;
  let payFrequency: IncomeSuggestion['pay_frequency'] = 'monthly';
  
  if (medianInterval <= 8) payFrequency = 'weekly';
  else if (medianInterval <= 16) payFrequency = 'biweekly';
  else if (medianInterval <= 19) payFrequency = 'semimonthly';
  else if (medianInterval <= 33) payFrequency = 'monthly';
  else payFrequency = 'variable';

  // Calculate variability
  const mean = avgIncome;
  const variance = incomeValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / incomeValues.length;
  const stdev = Math.sqrt(variance);
  const variablePct = Math.round((stdev / mean) * 100);

  // Find primary employer
  const employerCounts: Record<string, number> = {};
  incomeTransactions.forEach(t => {
    const employer = t.merchant_name || t.name || 'Unknown';
    employerCounts[employer] = (employerCounts[employer] || 0) + 1;
  });
  
  const primaryEmployer = Object.entries(employerCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    monthly_net_income: Math.round(avgIncome),
    primary_employer: primaryEmployer,
    pay_frequency: payFrequency,
    variable_income_pct: variablePct
  };
}

/**
 * Generate budget baseline from transactions
 */
function generateBudgetBaseline(
  transactions: any[], 
  monthlyIncome?: number
): BudgetSuggestion {
  const categoryMapping: Record<string, string> = {
    'RENT_AND_UTILITIES': 'Housing',
    'MORTGAGE': 'Housing',
    'HOME': 'Housing',
    'TRANSPORTATION': 'Transportation',
    'AUTO': 'Transportation',
    'GAS': 'Transportation',
    'FOOD_AND_DRINK': 'Food',
    'GROCERIES': 'Food',
    'RESTAURANTS': 'Food',
    'LOAN': 'Debt Payments',
    'CREDIT_CARD': 'Debt Payments',
    'HEALTHCARE': 'Insurance & Healthcare',
    'INSURANCE': 'Insurance & Healthcare',
    'TRANSFER': 'Savings & Investments',
    'INVESTMENT': 'Savings & Investments',
    'SAVINGS': 'Savings & Investments',
    'ENTERTAINMENT': 'Discretionary',
    'SHOPPING': 'Discretionary',
    'TRAVEL': 'Discretionary',
    'UTILITIES': 'Bills & Utilities',
    'SUBSCRIPTIONS': 'Bills & Utilities'
  };

  const spending: Record<string, number> = {
    'Housing': 0,
    'Transportation': 0,
    'Food': 0,
    'Debt Payments': 0,
    'Insurance & Healthcare': 0,
    'Savings & Investments': 0,
    'Bills & Utilities': 0,
    'Discretionary': 0,
    'Other': 0
  };

  // Only look at debits (positive amounts in Plaid)
  const expenses = transactions.filter(t => t.amount > 0);
  
  expenses.forEach(t => {
    const plaidCategory = t.personal_finance_category?.primary || t.category?.[0] || '';
    let trueFiCategory = 'Other';
    
    for (const [plaid, truefi] of Object.entries(categoryMapping)) {
      if (plaidCategory.toUpperCase().includes(plaid)) {
        trueFiCategory = truefi;
        break;
      }
    }
    
    spending[trueFiCategory] += t.amount;
  });

  // Convert to monthly averages
  const months = new Set(transactions.map(t => t.date.substring(0, 7))).size || 1;
  Object.keys(spending).forEach(key => {
    spending[key] = Math.round(spending[key] / months);
  });

  // If we have income, convert to percentages
  if (monthlyIncome && monthlyIncome > 0) {
    const total = Object.values(spending).reduce((a, b) => a + b, 0);
    const scale = monthlyIncome / total;
    
    Object.keys(spending).forEach(key => {
      spending[key] = Math.round((spending[key] * scale / monthlyIncome) * 100);
    });
  }

  // If no data or total is 0, use sensible defaults
  const total = Object.values(spending).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return {
      categories: {
        'Housing': 25,
        'Food': 12,
        'Transportation': 8,
        'Bills & Utilities': 6,
        'Insurance & Healthcare': 6,
        'Debt Payments': 8,
        'Savings & Investments': 15,
        'Discretionary': 15,
        'Other': 5
      },
      isFromPlaidData: false
    };
  }

  return {
    categories: spending,
    isFromPlaidData: true
  };
}

/**
 * Process liabilities into debt details
 */
function processLiabilities(liabilities: any): any[] {
  const debts: any[] = [];
  
  if (liabilities?.credit) {
    liabilities.credit.forEach((card: any) => {
      debts.push({
        lender: card.name || 'Credit Card',
        type: 'credit_card',
        balance: card.balances?.current || 0,
        apr: card.aprs?.purchase_apr || 0,
        min_payment: card.minimum_payment_amount || 0,
        due_day: card.next_payment_due_date?.split('-')[2] || null
      });
    });
  }
  
  if (liabilities?.student) {
    liabilities.student.forEach((loan: any) => {
      debts.push({
        lender: loan.account_name || 'Student Loan',
        type: 'student_loan',
        balance: loan.outstanding_interest_amount || 0,
        apr: loan.interest_rate_percentage || 0,
        min_payment: loan.minimum_payment_amount || 0,
        due_day: loan.next_payment_due_date?.split('-')[2] || null
      });
    });
  }
  
  if (liabilities?.mortgage) {
    liabilities.mortgage.forEach((mortgage: any) => {
      debts.push({
        lender: mortgage.account_name || 'Mortgage',
        type: 'mortgage',
        balance: mortgage.current_balance || 0,
        apr: mortgage.interest_rate?.percentage || 0,
        min_payment: mortgage.monthly_payment || 0,
        due_day: mortgage.next_payment_due_date?.split('-')[2] || null
      });
    });
  }
  
  // Sort by APR descending (avalanche method hint)
  return debts.sort((a, b) => b.apr - a.apr);
}

/**
 * Calculate net worth from accounts
 */
function calculateNetWorth(accounts: any[]): {
  assets: number;
  liabilities: number;
  total: number;
} {
  let assets = 0;
  let liabilities = 0;
  
  accounts.forEach(account => {
    const balance = account.balances.current || 0;
    
    if (account.type === 'depository' || account.type === 'investment') {
      assets += balance;
    } else if (account.type === 'credit' || account.type === 'loan') {
      liabilities += balance;
    }
  });
  
  return {
    assets: Math.round(assets),
    liabilities: Math.round(liabilities),
    total: Math.round(assets - liabilities)
  };
}

/**
 * Generate test mode suggestions for sandbox
 */
export function generateTestModeSuggestions(): Record<string, any> {
  return {
    income_capture: {
      monthly_net_income: 6520,
      primary_employer: 'Acme Inc',
      pay_frequency: 'biweekly',
      variable_income_pct: 12
    },
    manual_income: {
      monthly_net_income: 6520,
      pay_frequency: 'biweekly'
    },
    expenses_capture: {
      categories: {
        'Housing': 25,
        'Food': 12,
        'Transportation': 8,
        'Bills & Utilities': 6,
        'Insurance & Healthcare': 6,
        'Debt Payments': 8,
        'Savings & Investments': 15,
        'Discretionary': 15,
        'Other': 5
      },
      isFromPlaidData: true
    },
    budget_review: {
      categories: {
        'Housing': 25,
        'Food': 12,
        'Transportation': 8,
        'Bills & Utilities': 6,
        'Insurance & Healthcare': 6,
        'Debt Payments': 8,
        'Savings & Investments': 15,
        'Discretionary': 15,
        'Other': 5
      },
      isFromPlaidData: true
    },
    debts_detail: {
      debts: [
        {
          lender: 'Chase Sapphire',
          type: 'credit_card',
          balance: 2500,
          apr: 18.99,
          min_payment: 75,
          due_day: 15
        },
        {
          lender: 'Toyota Financial',
          type: 'auto_loan',
          balance: 15000,
          apr: 4.5,
          min_payment: 350,
          due_day: 1
        }
      ]
    },
    household: {
      household_net_worth: 45000,
      assets: 65000,
      liabilities: 20000
    },
    emergency_fund: {
      current_amount: 8500,
      current_months: 2.1,
      recommended_months: 3
    }
  };
}