// Single source of truth for demo/sample user data
// This file is used by both frontend and backend to ensure consistency

export const DEMO_DATA = {
  user: {
    name: "Sample User",
    memberSince: "January 2024",
    netWorth: 79107.21,
    monthlyIncome: 7000,
    monthlySavings: 1400,
    creditUtilization: 0.23, // 23%
  },

  accounts: [
    {
      id: "demo-checking-001",
      name: "Chase Total Checking",
      balance: 8450.32,
      type: "checking",
      institution: "Chase Bank",
      mask: "4832"
    },
    {
      id: "demo-savings-001",
      name: "Ally High Yield Savings",
      balance: 25000.00,
      type: "savings",
      apy: 4.25,
      institution: "Ally Bank",
      mask: "9001"
    },
    {
      id: "demo-401k-001",
      name: "Fidelity 401(k)",
      balance: 45230.18,
      type: "retirement",
      ytdReturn: 12.3,
      institution: "Fidelity",
      mask: "7234"
    },
    {
      id: "demo-brokerage-001",
      name: "Vanguard Brokerage",
      balance: 12500.00,
      type: "investment",
      ytdReturn: 15.2,
      institution: "Vanguard",
      mask: "5678"
    },
    {
      id: "demo-crypto-001",
      name: "Coinbase Pro",
      balance: 3420.89,
      type: "cryptocurrency",
      ytdReturn: 28.5,
      institution: "Coinbase",
      mask: "3456"
    },
    {
      id: "demo-cc-001",
      name: "Chase Sapphire Preferred",
      balance: -2341.67,
      type: "credit",
      limit: 10000,
      apr: 24.99,
      institution: "Chase Bank",
      mask: "1234"
    },
    {
      id: "demo-cc-002",
      name: "Amex Gold Card",
      balance: -892.34,
      type: "credit",
      limit: 8000,
      apr: 22.99,
      institution: "American Express",
      mask: "5678"
    }
  ],

  // Key transactions that represent typical spending patterns
  keyTransactions: [
    { id: 1, date: "2024-01-18", merchant: "Direct Deposit - TechCorp", amount: 3200.00, category: "Income", type: "deposit" },
    { id: 2, date: "2024-01-17", merchant: "Whole Foods Market", amount: -127.43, category: "Groceries", type: "debit" },
    { id: 3, date: "2024-01-16", merchant: "Netflix", amount: -15.99, category: "Entertainment", recurring: true, type: "debit" },
    { id: 4, date: "2024-01-15", merchant: "Oakwood Apartments", amount: -1850.00, category: "Housing", recurring: true, type: "ach" },
    { id: 5, date: "2024-01-14", merchant: "Sweetgreen", amount: -18.75, category: "Dining", type: "credit" },
    { id: 6, date: "2024-01-13", merchant: "Con Edison", amount: -125.00, category: "Utilities", recurring: true, type: "ach" },
    { id: 7, date: "2024-01-12", merchant: "Equinox Gym", amount: -185.00, category: "Health & Fitness", recurring: true, type: "credit" },
    { id: 8, date: "2024-01-11", merchant: "Amazon", amount: -87.23, category: "Shopping", type: "credit" },
    { id: 9, date: "2024-01-10", merchant: "Shell Gas Station", amount: -45.00, category: "Transportation", type: "credit" },
    { id: 10, date: "2024-01-09", merchant: "Freelance Payment", amount: 1800.00, category: "Income", type: "deposit" },
    { id: 11, date: "2024-01-08", merchant: "Trader Joe's", amount: -89.50, category: "Groceries", type: "debit" },
    { id: 12, date: "2024-01-07", merchant: "Spotify Premium", amount: -10.99, category: "Entertainment", recurring: true, type: "credit" },
    { id: 13, date: "2024-01-06", merchant: "Uber", amount: -23.40, category: "Transportation", type: "credit" },
    { id: 14, date: "2024-01-05", merchant: "Chipotle", amount: -14.25, category: "Dining", type: "credit" },
    { id: 15, date: "2024-01-04", merchant: "401k Contribution", amount: -750.00, category: "Retirement", type: "deduction" }
  ],

  // Pre-computed insights to avoid recalculation
  insights: {
    avgMonthlyDining: 847,
    avgMonthlyGroceries: 420,
    avgMonthlyEntertainment: 215,
    avgMonthlyTransportation: 200,
    savingsRate: 0.20,
    emergencyMonths: 4.2,
    topSpendCategory: { name: "Housing", amount: 1850, percent: 26 },
    secondSpendCategory: { name: "Food & Dining", amount: 847, percent: 12 },
    thirdSpendCategory: { name: "Shopping", amount: 423, percent: 6 },
    totalMonthlyExpenses: 5600,
    totalMonthlyIncome: 7000,
    netCashFlow: 1400,
    debtToIncomeRatio: 0.46,
    investmentGrowthYTD: 0.152,
    suggestedSavings: 247 // Potential monthly savings from dining budget
  },

  goals: [
    {
      id: "goal-001",
      name: "Emergency Fund",
      current: 5000,
      target: 15000,
      icon: "🛡️",
      percentComplete: 33,
      monthlyContribution: 500,
      projectedCompletion: "November 2024"
    },
    {
      id: "goal-002",
      name: "Hawaii Vacation",
      current: 2000,
      target: 5000,
      icon: "🏝️",
      percentComplete: 40,
      monthlyContribution: 250,
      projectedCompletion: "December 2024"
    },
    {
      id: "goal-003",
      name: "New Car Down Payment",
      current: 3000,
      target: 10000,
      icon: "🚗",
      percentComplete: 30,
      monthlyContribution: 350,
      projectedCompletion: "August 2025"
    },
    {
      id: "goal-004",
      name: "House Down Payment",
      current: 12000,
      target: 60000,
      icon: "🏠",
      percentComplete: 20,
      monthlyContribution: 300,
      projectedCompletion: "December 2027"
    }
  ],

  budget: {
    monthly: 7000,
    categories: [
      { name: "Housing", allocated: 1850, spent: 1850, remaining: 0 },
      { name: "Food & Dining", allocated: 600, spent: 847, remaining: -247 },
      { name: "Transportation", allocated: 250, spent: 200, remaining: 50 },
      { name: "Shopping", allocated: 400, spent: 423, remaining: -23 },
      { name: "Entertainment", allocated: 200, spent: 215, remaining: -15 },
      { name: "Utilities", allocated: 250, spent: 225, remaining: 25 },
      { name: "Health & Fitness", allocated: 200, spent: 185, remaining: 15 },
      { name: "Savings", allocated: 1400, spent: 1400, remaining: 0 },
      { name: "Investments", allocated: 850, spent: 850, remaining: 0 }
    ]
  },

  investments: {
    totalValue: 61151.07,
    totalCostBasis: 52000,
    totalGain: 9151.07,
    totalGainPercent: 17.6,
    holdings: [
      { symbol: "VTI", name: "Vanguard Total Market ETF", shares: 45, value: 10125.00, gain: 1125.00 },
      { symbol: "VXUS", name: "Vanguard International ETF", shares: 80, value: 4800.00, gain: 320.00 },
      { symbol: "AAPL", name: "Apple Inc.", shares: 25, value: 4825.00, gain: 825.00 },
      { symbol: "MSFT", name: "Microsoft Corp", shares: 10, value: 4100.00, gain: 600.00 },
      { symbol: "BTC", name: "Bitcoin", quantity: 0.08, value: 3420.89, gain: 920.89 }
    ]
  },

  recommendations: [
    "You could save $247/month by sticking to your dining budget",
    "Your emergency fund needs $10,000 more to reach the recommended 6 months of expenses",
    "Consider increasing your 401(k) contribution by 2% to maximize employer match",
    "Your credit utilization is healthy at 23% - keep it below 30%",
    "You're on track to save $16,800 this year - great job!"
  ]
};

// Export specific demo questions based on the data
export const DEMO_QUESTIONS = [
  `Why is my dining spending $${DEMO_DATA.insights.avgMonthlyDining - 600} over budget?`,
  "How can I reach my 6-month emergency fund goal faster?",
  "Show me my investment portfolio performance",
  "What's my current savings rate and how can I improve it?",
  "Analyze my spending patterns for the last month",
  "Should I pay off my credit cards or invest more?"
];

// Helper function to get formatted currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper to get account summary text
export const getDemoAccountSummary = (): string => {
  const checking = DEMO_DATA.accounts.find(a => a.type === 'checking')?.balance || 0;
  const savings = DEMO_DATA.accounts.find(a => a.type === 'savings')?.balance || 0;
  const retirement = DEMO_DATA.accounts.filter(a => a.type === 'retirement')
    .reduce((sum, a) => sum + a.balance, 0);
  const credit = DEMO_DATA.accounts.filter(a => a.type === 'credit')
    .reduce((sum, a) => sum + a.balance, 0);

  return `Checking: ${formatCurrency(checking)}, Savings: ${formatCurrency(savings)}, Retirement: ${formatCurrency(retirement)}, Credit Cards: ${formatCurrency(Math.abs(credit))}`;
};