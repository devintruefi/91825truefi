// Mock data for public/non-authenticated users
// This keeps demo logic separate from production code

export const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

export const DEMO_ESSENTIALS_CATEGORIES = [
  'Housing', 'Transportation', 'Food & Dining', 'Utilities', 
  'Healthcare', 'Insurance', 'Debt Payments', 'Basic Groceries'
];

export const DEMO_LIFESTYLE_CATEGORIES = [
  'Entertainment', 'Shopping', 'Personal Care', 'Dining Out',
  'Travel', 'Hobbies', 'Subscriptions', 'Fitness'
];

export const DEMO_SAVINGS_CATEGORIES = [
  'Savings', 'Investments', 'Emergency Fund', 'Retirement',
  'Education', 'Major Purchases'
];

export function getDemoDefaultAmount(category: string): number {
  const defaults: Record<string, number> = {
    'Housing': 1500,
    'Transportation': 400,
    'Food & Dining': 600,
    'Utilities': 200,
    'Healthcare': 300,
    'Insurance': 200,
    'Debt Payments': 500,
    'Basic Groceries': 400,
    'Entertainment': 200,
    'Shopping': 300,
    'Personal Care': 100,
    'Dining Out': 200,
    'Travel': 100,
    'Hobbies': 100,
    'Subscriptions': 50,
    'Fitness': 50,
    'Savings': 500,
    'Investments': 200,
    'Emergency Fund': 200,
    'Retirement': 300,
    'Education': 100,
    'Major Purchases': 100
  };
  return defaults[category] || 100;
}

export function getMockAccounts() {
  return [
    {
      id: 'mock-account-1',
      name: 'Sample Checking',
      type: 'depository',
      balance: 5234.50,
      current_balance: 5234.50,
      available_balance: 5234.50,
      currency: 'USD'
    },
    {
      id: 'mock-account-2',
      name: 'Sample Savings',
      type: 'depository',
      balance: 12500.00,
      current_balance: 12500.00,
      available_balance: 12500.00,
      currency: 'USD'
    },
    {
      id: 'mock-account-3',
      name: 'Sample Credit Card',
      type: 'credit',
      balance: -1245.75,
      current_balance: -1245.75,
      available_balance: 3754.25,
      currency: 'USD'
    }
  ];
}

export function getMockTransactions() {
  const now = new Date();
  const transactions = [];
  
  // Generate sample transactions for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add various transaction types
    if (i % 3 === 0) {
      transactions.push({
        id: `mock-tx-${i}-1`,
        amount: -45.50,
        name: 'Sample Restaurant',
        merchant_name: 'Restaurant Co',
        category: 'Food and Drink',
        date: date.toISOString(),
        pending: false,
        currency_code: 'USD'
      });
    }
    
    if (i % 5 === 0) {
      transactions.push({
        id: `mock-tx-${i}-2`,
        amount: -125.00,
        name: 'Sample Store',
        merchant_name: 'Retail Store',
        category: 'Shops',
        date: date.toISOString(),
        pending: false,
        currency_code: 'USD'
      });
    }
    
    if (i === 15) {
      transactions.push({
        id: `mock-tx-${i}-3`,
        amount: 3500.00,
        name: 'Direct Deposit',
        merchant_name: 'Employer',
        category: 'Transfer',
        date: date.toISOString(),
        pending: false,
        currency_code: 'USD'
      });
    }
  }
  
  return transactions;
}

export function getMockGoals() {
  return [
    {
      id: 'mock-goal-1',
      name: 'Emergency Fund',
      description: 'Build 6 months of expenses',
      target_amount: 15000,
      current_amount: 5000,
      target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      is_active: true
    },
    {
      id: 'mock-goal-2',
      name: 'Vacation Fund',
      description: 'Summer vacation savings',
      target_amount: 3000,
      current_amount: 750,
      target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      is_active: true
    }
  ];
}

export function getMockBudget() {
  const categories = [
    { category: 'Housing', amount: 1500, spent: 1200, priority: 'high' },
    { category: 'Transportation', amount: 400, spent: 350, priority: 'high' },
    { category: 'Food & Dining', amount: 600, spent: 450, priority: 'high' },
    { category: 'Utilities', amount: 200, spent: 180, priority: 'high' },
    { category: 'Healthcare', amount: 300, spent: 250, priority: 'high' },
    { category: 'Insurance', amount: 200, spent: 200, priority: 'high' },
    { category: 'Entertainment', amount: 200, spent: 150, priority: 'medium' },
    { category: 'Shopping', amount: 300, spent: 275, priority: 'medium' },
    { category: 'Savings', amount: 500, spent: 500, priority: 'high' },
    { category: 'Investments', amount: 200, spent: 200, priority: 'medium' }
  ];
  
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  
  return {
    id: 'mock-budget-1',
    name: 'Sample Monthly Budget',
    amount: totalAmount,
    categories,
    period: 'monthly',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    is_active: true
  };
}

export function getMockInvestments() {
  // Static data - no Math.random()
  return {
    accounts: [
      {
        id: 'mock-inv-account-1',
        name: 'Sample 401(k)',
        type: 'investment',
        subtype: '401k',
        institution_name: 'Sample Broker',
        balance: 45000,
        holdings: [],
        performance: {
          day: 1.2,
          week: 2.5,
          month: 3.8,
          year: 12.5,
          all_time: 35.0
        },
        tax_status: 'tax_deferred'
      }
    ],
    investments: [
      {
        id: 'mock-inv-1',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'stock',
        quantity: 10,
        purchase_price: 120,
        current_price: 150,
        current_value: 1500,
        cost_basis: 1200,
        purchase_date: '2023-01-15',
        risk_level: 'high',
        source: 'demo'
      },
      {
        id: 'mock-inv-2',
        name: 'Vanguard S&P 500 ETF',
        symbol: 'VOO',
        type: 'etf',
        quantity: 5,
        purchase_price: 400,
        current_price: 420,
        current_value: 2100,
        cost_basis: 2000,
        purchase_date: '2023-03-20',
        risk_level: 'medium',
        source: 'demo'
      }
    ],
    totalValue: 47100,
    totalGainLoss: 2400,
    totalGainLossPercent: 5.37,
    dayChange: 565.20,
    dayChangePercent: 1.21
  };
}

export function getMockSpendingData() {
  return {
    spentByMain: {
      'Monthly Budget': 3755,
      'Essentials': 2380,
      'Lifestyle': 875,
      'Savings': 700
    },
    totalIncome: 5000,
    totalSpending: 3755,
    savingsRate: 24.9,
    cashFlow: 1245,
    incomeTransactions: [
      { amount: 2500, category: 'Payroll', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { amount: 2500, category: 'Payroll', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
    ]
  };
}

export function getMockAssets() {
  return [
    {
      id: 'mock-asset-1',
      name: 'Primary Residence',
      asset_class: 'Real Estate',
      value: 350000,
      notes: 'Sample home value',
      source: 'demo',
      user_id: DEMO_USER_ID,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'mock-asset-2',
      name: 'Sample Vehicle',
      asset_class: 'Vehicle',
      value: 25000,
      notes: '2020 Model',
      source: 'demo',
      user_id: DEMO_USER_ID,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
}

export function getMockSecurities() {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', current_price: null },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', current_price: null },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', currency: 'USD', current_price: null },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', current_price: null },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', current_price: null },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', exchange: 'NYSE', currency: 'USD', current_price: null },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', exchange: 'NYSE', currency: 'USD', current_price: null },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ', currency: 'USD', current_price: null }
  ];
}