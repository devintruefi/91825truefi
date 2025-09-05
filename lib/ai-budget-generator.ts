import prisma from '@/lib/db';

// Types for budget generation
interface BudgetCategory {
  category: string;
  amount: number;
  priority: 'essential' | 'discretionary' | 'savings';
  isFixed?: boolean;
  notes?: string;
}

interface SmartBudgetResult {
  totalBudget: number;
  categories: BudgetCategory[];
  framework: string;
  insights: string[];
  warnings?: string[];
}

interface IncomeAnalysis {
  monthlyIncome: number;
  incomeStreams: Array<{
    source: string;
    amount: number;
    frequency: string;
    isStable: boolean;
  }>;
  stability: 'stable' | 'variable' | 'uncertain';
}

interface SpendingPattern {
  category: string;
  monthlyAverage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  isEssential: boolean;
  transactions: number;
}

// Essential categories that should always be included
const ESSENTIAL_CATEGORIES = new Set([
  'Housing', 'Utilities', 'Groceries', 'Transportation',
  'Healthcare', 'Insurance', 'Minimum Debt Payments'
]);

const DISCRETIONARY_CATEGORIES = new Set([
  'Dining Out', 'Entertainment', 'Shopping', 'Personal Care',
  'Hobbies', 'Subscriptions', 'Travel', 'Fitness'
]);

const SAVINGS_CATEGORIES = new Set([
  'Emergency Fund', 'Retirement', 'Investments',
  'Goals Savings', 'Education Fund'
]);

/**
 * Analyzes user's income from transactions
 */
async function analyzeUserIncome(userId: string, months: number = 6): Promise<IncomeAnalysis> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get user's recurring income if defined
  const recurringIncome = await prisma.recurring_income.findMany({
    where: {
      user_id: userId,
      OR: [
        { effective_to: null },
        { effective_to: { gte: new Date() } }
      ]
    }
  });

  // Get income transactions (negative amounts in our system represent money coming in)
  const incomeTransactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lte: endDate
      },
      amount: { lt: 0 }, // Negative = income in Plaid
      OR: [
        { category: { contains: 'Deposit' } },
        { category: { contains: 'Transfer' } },
        { category: { contains: 'Payroll' } },
        { name: { contains: 'Direct Deposit' } },
        { name: { contains: 'Salary' } },
        { name: { contains: 'Paycheck' } }
      ]
    },
    orderBy: { date: 'desc' }
  });

  // Combine recurring income and detected income
  const incomeStreams: Array<{
    source: string;
    amount: number;
    frequency: string;
    isStable: boolean;
  }> = [];

  // Add recurring income
  for (const income of recurringIncome) {
    const monthlyAmount = income.is_net 
      ? Number(income.net_monthly || income.gross_monthly)
      : Number(income.gross_monthly);
    
    incomeStreams.push({
      source: income.source || 'Recurring Income',
      amount: monthlyAmount,
      frequency: income.frequency || 'monthly',
      isStable: true
    });
  }

  // Analyze transaction-based income patterns
  if (incomeTransactions.length > 0) {
    const incomeBySource: Map<string, number[]> = new Map();
    
    for (const transaction of incomeTransactions) {
      const source = transaction.merchant_name || transaction.name || 'Unknown Source';
      const amount = Math.abs(transaction.amount);
      
      if (!incomeBySource.has(source)) {
        incomeBySource.set(source, []);
      }
      incomeBySource.get(source)!.push(amount);
    }

    // Calculate average monthly income from transactions
    for (const [source, amounts] of incomeBySource.entries()) {
      const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
      const monthlyAverage = totalAmount / months;
      
      // Only include significant income sources (> $100/month)
      if (monthlyAverage > 100) {
        // Check if this is already in recurring income
        const isDuplicate = incomeStreams.some(stream => 
          stream.source.toLowerCase().includes(source.toLowerCase()) ||
          source.toLowerCase().includes(stream.source.toLowerCase())
        );
        
        if (!isDuplicate) {
          incomeStreams.push({
            source,
            amount: Math.round(monthlyAverage),
            frequency: 'monthly',
            isStable: amounts.length >= months * 0.8 // Stable if present in 80% of months
          });
        }
      }
    }
  }

  // Calculate total monthly income
  const monthlyIncome = incomeStreams.reduce((sum, stream) => {
    if (stream.frequency === 'monthly') {
      return sum + stream.amount;
    } else if (stream.frequency === 'biweekly') {
      return sum + (stream.amount * 26 / 12);
    } else if (stream.frequency === 'weekly') {
      return sum + (stream.amount * 52 / 12);
    }
    return sum + stream.amount;
  }, 0);

  // Determine income stability
  const stableStreams = incomeStreams.filter(s => s.isStable).length;
  const stability = stableStreams === incomeStreams.length ? 'stable' :
                   stableStreams > 0 ? 'variable' : 'uncertain';

  return {
    monthlyIncome: Math.round(monthlyIncome),
    incomeStreams,
    stability
  };
}

/**
 * Analyzes user's spending patterns
 */
async function analyzeSpendingPatterns(userId: string, months: number = 3): Promise<SpendingPattern[]> {
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
      amount: { gt: 0 } // Positive = spending in Plaid
    },
    orderBy: { date: 'desc' }
  });

  // Group transactions by category
  const spendingByCategory: Map<string, {
    amounts: number[];
    count: number;
    dates: Date[];
  }> = new Map();

  for (const transaction of transactions) {
    const category = normalizeCategory(transaction.category || 'Uncategorized');
    
    if (!spendingByCategory.has(category)) {
      spendingByCategory.set(category, {
        amounts: [],
        count: 0,
        dates: []
      });
    }
    
    const data = spendingByCategory.get(category)!;
    data.amounts.push(Math.abs(transaction.amount));
    data.count++;
    data.dates.push(new Date(transaction.date));
  }

  // Analyze patterns for each category
  const patterns: SpendingPattern[] = [];
  
  for (const [category, data] of spendingByCategory.entries()) {
    const totalSpending = data.amounts.reduce((sum, amt) => sum + amt, 0);
    const monthlyAverage = totalSpending / months;
    
    // Determine trend
    const firstHalf = data.amounts.slice(0, Math.floor(data.amounts.length / 2));
    const secondHalf = data.amounts.slice(Math.floor(data.amounts.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, amt) => sum + amt, 0) / Math.max(firstHalf.length, 1);
    const secondHalfAvg = secondHalf.reduce((sum, amt) => sum + amt, 0) / Math.max(secondHalf.length, 1);
    
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';
    
    patterns.push({
      category,
      monthlyAverage: Math.round(monthlyAverage),
      trend,
      isEssential: ESSENTIAL_CATEGORIES.has(category),
      transactions: data.count
    });
  }
  
  return patterns.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
}

/**
 * Normalizes transaction categories to standard budget categories
 */
function normalizeCategory(rawCategory: string): string {
  const categoryMap: Record<string, string> = {
    // Housing
    'rent': 'Housing',
    'mortgage': 'Housing',
    'home': 'Housing',
    'property': 'Housing',
    
    // Transportation
    'gas': 'Transportation',
    'fuel': 'Transportation',
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'parking': 'Transportation',
    'transit': 'Transportation',
    'car': 'Transportation',
    'auto': 'Transportation',
    
    // Food
    'grocery': 'Groceries',
    'groceries': 'Groceries',
    'supermarket': 'Groceries',
    'restaurant': 'Dining Out',
    'food': 'Dining Out',
    'coffee': 'Dining Out',
    'fast food': 'Dining Out',
    
    // Utilities
    'electric': 'Utilities',
    'water': 'Utilities',
    'gas bill': 'Utilities',
    'internet': 'Utilities',
    'phone': 'Utilities',
    'utility': 'Utilities',
    
    // Entertainment
    'entertainment': 'Entertainment',
    'movie': 'Entertainment',
    'streaming': 'Subscriptions',
    'subscription': 'Subscriptions',
    'netflix': 'Subscriptions',
    'spotify': 'Subscriptions',
    
    // Shopping
    'shopping': 'Shopping',
    'clothing': 'Shopping',
    'amazon': 'Shopping',
    'retail': 'Shopping',
    
    // Health
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'pharmacy': 'Healthcare',
    'doctor': 'Healthcare',
    'insurance': 'Insurance',
    
    // Debt
    'loan': 'Minimum Debt Payments',
    'credit card': 'Minimum Debt Payments',
    'student loan': 'Minimum Debt Payments',
    
    // Fitness
    'gym': 'Fitness',
    'fitness': 'Fitness',
    
    // Personal
    'salon': 'Personal Care',
    'barber': 'Personal Care',
    'personal': 'Personal Care',
    
    // Travel
    'travel': 'Travel',
    'hotel': 'Travel',
    'airline': 'Travel',
    'vacation': 'Travel'
  };
  
  const lowerCategory = rawCategory.toLowerCase();
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerCategory.includes(key)) {
      return value;
    }
  }
  
  // Return original category if no match found
  return rawCategory;
}

/**
 * Generate budget based on 50/30/20 framework
 */
function generate503020Budget(
  monthlyIncome: number,
  spendingPatterns: SpendingPattern[],
  existingDebts: number = 0
): BudgetCategory[] {
  const categories: BudgetCategory[] = [];
  
  // 50% for needs
  const needsBudget = monthlyIncome * 0.50;
  
  // 30% for wants
  const wantsBudget = monthlyIncome * 0.30;
  
  // 20% for savings and debt repayment
  const savingsBudget = monthlyIncome * 0.20;
  
  // Allocate essentials first
  let needsAllocated = 0;
  for (const pattern of spendingPatterns) {
    if (ESSENTIAL_CATEGORIES.has(pattern.category)) {
      const amount = Math.min(pattern.monthlyAverage, needsBudget * 0.4); // Cap each essential at 40% of needs budget
      categories.push({
        category: pattern.category,
        amount: Math.round(amount),
        priority: 'essential',
        isFixed: pattern.transactions > 2
      });
      needsAllocated += amount;
    }
  }
  
  // Ensure all essential categories are present
  for (const essential of ESSENTIAL_CATEGORIES) {
    if (!categories.find(c => c.category === essential)) {
      const pattern = spendingPatterns.find(p => p.category === essential);
      const amount = pattern ? pattern.monthlyAverage : getMinimumAmount(essential, monthlyIncome);
      if (amount > 0) {
        categories.push({
          category: essential,
          amount: Math.round(amount),
          priority: 'essential',
          isFixed: false
        });
        needsAllocated += amount;
      }
    }
  }
  
  // Allocate wants
  let wantsAllocated = 0;
  for (const pattern of spendingPatterns) {
    if (DISCRETIONARY_CATEGORIES.has(pattern.category)) {
      const suggestedAmount = pattern.trend === 'increasing' 
        ? pattern.monthlyAverage * 0.9  // Reduce if increasing
        : pattern.monthlyAverage;
      
      const amount = Math.min(suggestedAmount, wantsBudget * 0.3); // Cap each want at 30% of wants budget
      categories.push({
        category: pattern.category,
        amount: Math.round(amount),
        priority: 'discretionary',
        notes: pattern.trend === 'increasing' ? 'Consider reducing - spending trending up' : undefined
      });
      wantsAllocated += amount;
    }
  }
  
  // Allocate savings
  const debtPayment = Math.min(existingDebts * 0.1, savingsBudget * 0.5);
  const emergencyFund = savingsBudget * 0.3;
  const retirement = savingsBudget * 0.3;
  const otherSavings = savingsBudget - debtPayment - emergencyFund - retirement;
  
  if (emergencyFund > 0) {
    categories.push({
      category: 'Emergency Fund',
      amount: Math.round(emergencyFund),
      priority: 'savings',
      isFixed: true
    });
  }
  
  if (retirement > 0) {
    categories.push({
      category: 'Retirement',
      amount: Math.round(retirement),
      priority: 'savings',
      isFixed: true
    });
  }
  
  if (debtPayment > 0) {
    categories.push({
      category: 'Extra Debt Payments',
      amount: Math.round(debtPayment),
      priority: 'savings',
      notes: 'Additional payments beyond minimums'
    });
  }
  
  if (otherSavings > 50) {
    categories.push({
      category: 'Goals Savings',
      amount: Math.round(otherSavings),
      priority: 'savings'
    });
  }
  
  return categories;
}

/**
 * Generate budget based on Zero-Based framework
 */
function generateZeroBasedBudget(
  monthlyIncome: number,
  spendingPatterns: SpendingPattern[],
  userGoals: any[]
): BudgetCategory[] {
  const categories: BudgetCategory[] = [];
  let remainingIncome = monthlyIncome;
  
  // Start with actual spending patterns and optimize
  const sortedPatterns = [...spendingPatterns].sort((a, b) => {
    // Prioritize essentials, then by amount
    if (a.isEssential !== b.isEssential) {
      return a.isEssential ? -1 : 1;
    }
    return b.monthlyAverage - a.monthlyAverage;
  });
  
  // Allocate every dollar
  for (const pattern of sortedPatterns) {
    if (remainingIncome <= 0) break;
    
    let amount = pattern.monthlyAverage;
    
    // Adjust based on trends and priorities
    if (pattern.trend === 'increasing' && !pattern.isEssential) {
      amount *= 0.95; // Reduce non-essential increasing spending
    }
    
    amount = Math.min(amount, remainingIncome);
    
    if (amount > 10) { // Only include if meaningful amount
      categories.push({
        category: pattern.category,
        amount: Math.round(amount),
        priority: pattern.isEssential ? 'essential' : 'discretionary',
        notes: `Based on ${pattern.transactions} transactions over 3 months`
      });
      remainingIncome -= amount;
    }
  }
  
  // Add essential categories not in spending
  for (const essential of ESSENTIAL_CATEGORIES) {
    if (!categories.find(c => c.category === essential)) {
      const amount = getMinimumAmount(essential, monthlyIncome);
      if (amount > 0 && remainingIncome >= amount) {
        categories.push({
          category: essential,
          amount: Math.round(amount),
          priority: 'essential',
          notes: 'Added as essential category'
        });
        remainingIncome -= amount;
      }
    }
  }
  
  // Allocate remaining to savings and goals
  if (remainingIncome > 50) {
    const savingsAmount = remainingIncome * 0.6;
    const goalsAmount = remainingIncome * 0.4;
    
    categories.push({
      category: 'Emergency Fund',
      amount: Math.round(savingsAmount),
      priority: 'savings',
      notes: 'Allocated from unassigned income'
    });
    
    if (goalsAmount > 0) {
      categories.push({
        category: 'Goals Savings',
        amount: Math.round(goalsAmount),
        priority: 'savings',
        notes: 'For financial goals'
      });
    }
  }
  
  return categories;
}

/**
 * Generate budget based on Envelope framework
 */
function generateEnvelopeBudget(
  monthlyIncome: number,
  spendingPatterns: SpendingPattern[]
): BudgetCategory[] {
  const categories: BudgetCategory[] = [];
  
  // Create envelopes for major spending categories
  const envelopes = new Map<string, number>();
  
  // Fixed envelopes (bills, rent, etc.)
  const fixedCategories = spendingPatterns.filter(p => 
    p.isEssential || p.transactions >= 3
  );
  
  for (const pattern of fixedCategories) {
    envelopes.set(pattern.category, pattern.monthlyAverage);
  }
  
  // Variable envelopes (discretionary spending)
  const variableCategories = spendingPatterns.filter(p => 
    !p.isEssential && p.transactions < 3
  );
  
  // Group small categories into broader envelopes
  let entertainmentTotal = 0;
  let shoppingTotal = 0;
  let personalTotal = 0;
  
  for (const pattern of variableCategories) {
    if (['Entertainment', 'Dining Out', 'Hobbies'].includes(pattern.category)) {
      entertainmentTotal += pattern.monthlyAverage;
    } else if (['Shopping', 'Clothing', 'Electronics'].includes(pattern.category)) {
      shoppingTotal += pattern.monthlyAverage;
    } else if (['Personal Care', 'Fitness', 'Subscriptions'].includes(pattern.category)) {
      personalTotal += pattern.monthlyAverage;
    } else {
      envelopes.set(pattern.category, pattern.monthlyAverage);
    }
  }
  
  // Create consolidated envelopes
  if (entertainmentTotal > 0) {
    envelopes.set('Entertainment & Dining', Math.round(entertainmentTotal * 0.9));
  }
  if (shoppingTotal > 0) {
    envelopes.set('Shopping & Clothing', Math.round(shoppingTotal * 0.9));
  }
  if (personalTotal > 0) {
    envelopes.set('Personal & Wellness', Math.round(personalTotal));
  }
  
  // Add savings envelope (remaining income)
  const totalAllocated = Array.from(envelopes.values()).reduce((sum, amt) => sum + amt, 0);
  const savingsEnvelope = Math.max(monthlyIncome - totalAllocated, monthlyIncome * 0.1);
  envelopes.set('Savings', savingsEnvelope);
  
  // Convert to budget categories
  for (const [category, amount] of envelopes.entries()) {
    categories.push({
      category,
      amount: Math.round(amount),
      priority: ESSENTIAL_CATEGORIES.has(category) ? 'essential' : 
               category === 'Savings' ? 'savings' : 'discretionary',
      notes: 'Cash envelope allocation'
    });
  }
  
  return categories;
}

/**
 * Generate budget based on Pay-Yourself-First framework
 */
function generatePayYourselfFirstBudget(
  monthlyIncome: number,
  spendingPatterns: SpendingPattern[],
  savingsRate: number = 0.2
): BudgetCategory[] {
  const categories: BudgetCategory[] = [];
  
  // First, allocate to savings
  const totalSavings = monthlyIncome * savingsRate;
  const emergencyFund = totalSavings * 0.4;
  const retirement = totalSavings * 0.4;
  const goalsSavings = totalSavings * 0.2;
  
  categories.push({
    category: 'Emergency Fund',
    amount: Math.round(emergencyFund),
    priority: 'savings',
    isFixed: true,
    notes: 'Pay yourself first - automated savings'
  });
  
  categories.push({
    category: 'Retirement',
    amount: Math.round(retirement),
    priority: 'savings',
    isFixed: true,
    notes: 'Pay yourself first - retirement contribution'
  });
  
  if (goalsSavings > 50) {
    categories.push({
      category: 'Goals Savings',
      amount: Math.round(goalsSavings),
      priority: 'savings',
      isFixed: true,
      notes: 'Pay yourself first - future goals'
    });
  }
  
  // Then allocate remaining to expenses
  const remainingBudget = monthlyIncome - totalSavings;
  let remainingAllocated = 0;
  
  // Priority 1: Essential expenses
  for (const pattern of spendingPatterns) {
    if (pattern.isEssential) {
      const amount = Math.min(pattern.monthlyAverage, remainingBudget * 0.7);
      categories.push({
        category: pattern.category,
        amount: Math.round(amount),
        priority: 'essential'
      });
      remainingAllocated += amount;
    }
  }
  
  // Priority 2: Discretionary with limits
  const discretionaryBudget = remainingBudget - remainingAllocated;
  for (const pattern of spendingPatterns) {
    if (!pattern.isEssential && discretionaryBudget > 0) {
      const suggestedAmount = pattern.trend === 'increasing'
        ? pattern.monthlyAverage * 0.8
        : pattern.monthlyAverage * 0.9;
      
      const amount = Math.min(suggestedAmount, discretionaryBudget * 0.2);
      if (amount > 20) {
        categories.push({
          category: pattern.category,
          amount: Math.round(amount),
          priority: 'discretionary',
          notes: 'After paying yourself first'
        });
      }
    }
  }
  
  return categories;
}

/**
 * Get minimum amount for essential categories
 */
function getMinimumAmount(category: string, monthlyIncome: number): number {
  const minimums: Record<string, number> = {
    'Housing': monthlyIncome * 0.25,
    'Utilities': monthlyIncome * 0.05,
    'Groceries': monthlyIncome * 0.10,
    'Transportation': monthlyIncome * 0.10,
    'Healthcare': monthlyIncome * 0.05,
    'Insurance': monthlyIncome * 0.05,
    'Minimum Debt Payments': 0 // Will be calculated based on actual debts
  };
  
  return minimums[category] || 0;
}

/**
 * Main function to generate AI-powered budget
 */
export async function generateAIBudget(
  userId: string,
  framework?: string
): Promise<SmartBudgetResult> {
  // Skip AI generation for demo user
  const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  if (userId === DEMO_USER_ID) {
    throw new Error('AI budget generation not available for demo user');
  }
  
  try {
    // Get user preferences if framework not provided
    if (!framework) {
      const userPrefs = await prisma.user_preferences.findFirst({
        where: { user_id: userId }
      });
      
      if (userPrefs?.financial_goals) {
        const goals = userPrefs.financial_goals as any;
        framework = goals.budget_framework || '50-30-20';
      } else {
        framework = '50-30-20'; // Default framework
      }
    }
    
    // Analyze income
    const incomeAnalysis = await analyzeUserIncome(userId);
    
    // If no income detected, provide a warning
    if (incomeAnalysis.monthlyIncome === 0) {
      return {
        totalBudget: 0,
        categories: [],
        framework,
        insights: [],
        warnings: ['No income detected. Please add your income information or connect your bank accounts.']
      };
    }
    
    // Analyze spending patterns
    const spendingPatterns = await analyzeSpendingPatterns(userId);
    
    // Get user's goals for context
    const userGoals = await prisma.goals.findMany({
      where: {
        user_id: userId,
        is_active: true
      }
    });
    
    // Get user's debt information
    const userDebts = await prisma.accounts.findMany({
      where: {
        user_id: userId,
        type: { in: ['credit', 'loan'] }
      }
    });
    
    const totalDebt = userDebts.reduce((sum, account) => 
      sum + Math.abs(Number(account.balance || 0)), 0
    );
    
    // Get target savings rate from preferences
    const userPrefs = await prisma.user_preferences.findFirst({
      where: { user_id: userId }
    });
    const financialGoals = (userPrefs?.financial_goals as any) || {};
    const targetSavingsRate = (financialGoals.target_savings_percent || 20) / 100;
    
    // Generate budget based on framework
    let categories: BudgetCategory[] = [];
    
    switch (framework.toLowerCase()) {
      case '50-30-20':
      case '50/30/20':
        categories = generate503020Budget(
          incomeAnalysis.monthlyIncome,
          spendingPatterns,
          totalDebt
        );
        break;
        
      case 'zero-based':
      case 'zero based':
        categories = generateZeroBasedBudget(
          incomeAnalysis.monthlyIncome,
          spendingPatterns,
          userGoals
        );
        break;
        
      case 'envelope':
      case 'cash envelope':
        categories = generateEnvelopeBudget(
          incomeAnalysis.monthlyIncome,
          spendingPatterns
        );
        break;
        
      case 'pay-yourself-first':
      case 'pay yourself first':
        categories = generatePayYourselfFirstBudget(
          incomeAnalysis.monthlyIncome,
          spendingPatterns,
          targetSavingsRate
        );
        break;
        
      default:
        // Default to 50-30-20 if unknown framework
        categories = generate503020Budget(
          incomeAnalysis.monthlyIncome,
          spendingPatterns,
          totalDebt
        );
        framework = '50-30-20';
    }
    
    // Generate insights
    const insights: string[] = [];
    
    // Income insights
    if (incomeAnalysis.stability === 'stable') {
      insights.push('Your income is stable, allowing for consistent budgeting.');
    } else if (incomeAnalysis.stability === 'variable') {
      insights.push('Your income varies. Consider budgeting based on your lowest monthly income.');
    }
    
    // Spending insights
    const increasingCategories = spendingPatterns.filter(p => p.trend === 'increasing');
    if (increasingCategories.length > 0) {
      insights.push(`Spending is increasing in: ${increasingCategories.slice(0, 3).map(c => c.category).join(', ')}`);
    }
    
    // Savings insights
    const totalSavings = categories
      .filter(c => c.priority === 'savings')
      .reduce((sum, c) => sum + c.amount, 0);
    const savingsRate = (totalSavings / incomeAnalysis.monthlyIncome) * 100;
    
    if (savingsRate >= 20) {
      insights.push(`Great job! You're saving ${savingsRate.toFixed(1)}% of your income.`);
    } else if (savingsRate >= 10) {
      insights.push(`You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing to 20% if possible.`);
    } else {
      insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Try to increase this to at least 10-20%.`);
    }
    
    // Framework-specific insights
    if (framework.includes('50-30-20')) {
      insights.push('Following the 50-30-20 rule: 50% needs, 30% wants, 20% savings & debt repayment.');
    } else if (framework.includes('zero')) {
      insights.push('Zero-based budget: Every dollar is assigned a purpose.');
    } else if (framework.includes('envelope')) {
      insights.push('Envelope system: Fixed amounts for each spending category.');
    } else if (framework.includes('pay')) {
      insights.push('Pay-yourself-first: Savings are prioritized before expenses.');
    }
    
    // Calculate total budget
    const totalBudget = categories.reduce((sum, cat) => sum + cat.amount, 0);
    
    return {
      totalBudget: Math.round(totalBudget),
      categories: categories.filter(c => c.amount > 0), // Remove zero-amount categories
      framework,
      insights,
      warnings: totalBudget > incomeAnalysis.monthlyIncome 
        ? [`Budget exceeds income by $${Math.round(totalBudget - incomeAnalysis.monthlyIncome)}`]
        : undefined
    };
    
  } catch (error) {
    console.error('Error generating AI budget:', error);
    throw new Error('Failed to generate AI budget');
  }
}

/**
 * Update existing budget with AI recommendations
 */
export async function updateBudgetWithAI(
  budgetId: string,
  userId: string
): Promise<BudgetCategory[]> {
  const aiResult = await generateAIBudget(userId);
  
  // Update budget categories based on AI recommendations
  const updatedCategories: BudgetCategory[] = [];
  
  // Get existing categories
  const existingCategories = await prisma.budget_categories.findMany({
    where: { budget_id: budgetId }
  });
  
  // Merge AI recommendations with existing categories
  for (const aiCategory of aiResult.categories) {
    const existing = existingCategories.find(
      ec => ec.category.toLowerCase() === aiCategory.category.toLowerCase()
    );
    
    if (existing) {
      // Update existing category with AI recommendation
      await prisma.budget_categories.update({
        where: { id: existing.id },
        data: {
          amount: aiCategory.amount,
          updated_at: new Date()
        }
      });
    } else {
      // Create new category
      await prisma.budget_categories.create({
        data: {
          id: crypto.randomUUID(),
          budget_id: budgetId,
          category: aiCategory.category,
          amount: aiCategory.amount,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    updatedCategories.push(aiCategory);
  }
  
  return updatedCategories;
}