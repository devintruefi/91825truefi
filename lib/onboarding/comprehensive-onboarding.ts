// Comprehensive onboarding flow for TrueFi
// This implements a conversational, friendly onboarding that feels natural rather than form-like

export interface OnboardingState {
  currentStep: string
  isComplete: boolean
  mode: 'quick' | 'standard' | 'complete'
  responses: Record<string, any>
  plaidData?: any
  dashboardReady: boolean
  resumePoint?: string
}

// Onboarding flow steps - organized for value-first approach
export const ONBOARDING_FLOW = {
  // Phase 1: Welcome & Goal Setting
  WELCOME: {
    id: 'welcome',
    message: (name?: string) => name 
      ? `Hi ${name}! Welcome back. Let's continue building your financial future together. 🌟`
      : "Hi there! I'm Penny, your AI financial assistant. Welcome to TrueFi! 🪙 What should I call you?",
    component: null, // Text input handled inline
    saveKey: 'firstName',
    next: 'MAIN_GOAL'
  },

  MAIN_GOAL: {
    id: 'main_goal',
    message: (name: string) => `Nice to meet you, ${name}! What brought you to TrueFi today? What's your main financial goal right now?`,
    component: {
      type: 'buttons',
      data: {
        options: [
          { id: 'debt', label: 'Pay off debt', value: 'debt_payoff', icon: '🎯' },
          { id: 'emergency', label: 'Save for emergencies', value: 'emergency_fund', icon: '🛡️' },
          { id: 'home', label: 'Save for a home', value: 'home_purchase', icon: '🏠' },
          { id: 'retirement', label: 'Plan for retirement', value: 'retirement', icon: '🏖️' },
          { id: 'travel', label: 'Save for travel', value: 'travel', icon: '✈️' },
          { id: 'wealth', label: 'Build wealth', value: 'investments', icon: '📈' },
          { id: 'other', label: 'Something else', value: 'other', icon: '💭' }
        ]
      }
    },
    saveKey: 'mainGoal',
    next: 'LIFE_STAGE'
  },

  // Phase 2: Quick Context
  LIFE_STAGE: {
    id: 'life_stage',
    message: () => "Great choice! To give you the best advice, which life stage best describes you?",
    component: {
      type: 'cards',
      data: {
        options: [
          { 
            id: 'student',
            title: 'Student',
            description: 'In school or recent grad',
            icon: '🎓',
            value: 'student'
          },
          {
            id: 'working',
            title: 'Working Professional',
            description: 'Building my career',
            icon: '💼',
            value: 'working_professional'
          },
          {
            id: 'family',
            title: 'Married/Partnered',
            description: 'Managing finances together',
            icon: '💑',
            value: 'married_partnered'
          },
          {
            id: 'parent',
            title: 'Parent',
            description: 'Raising a family',
            icon: '👨‍👩‍👧‍👦',
            value: 'parent'
          },
          {
            id: 'retired',
            title: 'Retired',
            description: 'Enjoying retirement',
            icon: '🌴',
            value: 'retired'
          }
        ]
      }
    },
    saveKey: 'lifeStage',
    next: 'PLAID_CONNECTION'
  },

  // Phase 3: Critical Early Connection (Plaid)
  PLAID_CONNECTION: {
    id: 'plaid_connection',
    message: () => "Perfect! Now, let me connect to your bank accounts to see your real financial picture. This helps me give you advice that actually works for YOUR situation.",
    component: {
      type: 'plaid',
      data: {
        title: "Connect Your Accounts",
        subtitle: "Bank-level security • Read-only access • I can't move money",
        benefits: [
          "Auto-track all transactions",
          "See your real spending patterns",
          "Get personalized insights",
          "Never miss a bill"
        ]
      }
    },
    saveKey: 'plaidConnection',
    next: (response: any) => {
      if (response?.publicToken || response?.accounts) {
        return 'AUTO_ANALYSIS';
      }
      return 'MANUAL_INCOME';
    }
  },

  // Phase 4A: Auto-Analysis (if Plaid connected)
  AUTO_ANALYSIS: {
    id: 'auto_analysis',
    message: () => "Excellent! I'm analyzing your accounts now... 🔍",
    component: null, // This triggers backend analysis
    autoProgress: true,
    saveKey: 'autoAnalysis',
    next: 'INCOME_CONFIRMATION'
  },

  INCOME_CONFIRMATION: {
    id: 'income_confirmation',
    message: (name: string, data: any) => {
      const income = data?.detectedIncome || 0;
      return `Based on your deposits, I see you're earning about $${income.toLocaleString()}/month. Does that sound right?`;
    },
    component: {
      type: 'buttons',
      data: {
        options: [
          { id: 'correct', label: 'Yes, that\'s right', value: 'confirmed' },
          { id: 'adjust', label: 'Let me adjust it', value: 'adjust' }
        ]
      }
    },
    saveKey: 'incomeConfirmed',
    next: 'DETECTED_EXPENSES'
  },

  DETECTED_EXPENSES: {
    id: 'detected_expenses',
    message: (name: string, data: any) => {
      const expenses = data?.detectedExpenses || {};
      return `I've categorized your spending from the last 3 months. Your biggest categories are ${Object.keys(expenses).slice(0, 3).join(', ')}. Ready to see your personalized budget?`;
    },
    component: {
      type: 'pieChart',
      data: {
        title: 'Your Detected Spending',
        editable: true,
        categories: [] // Populated from detected data
      }
    },
    saveKey: 'expenseCategories',
    next: 'RISK_TOLERANCE'
  },

  // Phase 4B: Manual Entry (if Plaid skipped)
  MANUAL_INCOME: {
    id: 'manual_income',
    message: () => "No problem! Let's do this quickly. What's your monthly income after taxes?",
    component: {
      type: 'slider',
      data: {
        min: 0,
        max: 25000,
        step: 100,
        prefix: '$',
        default: 5000,
        labels: {
          0: '$0',
          5000: '$5k',
          10000: '$10k',
          25000: '$25k+'
        }
      }
    },
    saveKey: 'monthlyIncome',
    next: 'MANUAL_EXPENSES'
  },

  MANUAL_EXPENSES: {
    id: 'manual_expenses',
    message: () => "And roughly how much do you spend each month?",
    component: {
      type: 'slider',
      data: {
        min: 0,
        max: 20000,
        step: 100,
        prefix: '$',
        smartDefault: true // Based on income
      }
    },
    saveKey: 'monthlyExpenses',
    next: 'QUICK_ACCOUNTS'
  },

  QUICK_ACCOUNTS: {
    id: 'quick_accounts',
    message: () => "Let's add your main account balances (you can skip this if you want):",
    component: {
      type: 'quickAdd',
      data: {
        fields: [
          { id: 'checking', label: 'Checking', type: 'currency', icon: '🏦' },
          { id: 'savings', label: 'Savings', type: 'currency', icon: '💰' },
          { id: 'credit_cards', label: 'Credit Card Debt', type: 'currency', icon: '💳' },
          { id: 'investments', label: 'Investments', type: 'currency', icon: '📈' }
        ]
      }
    },
    saveKey: 'manualAccounts',
    skipOption: true,
    next: 'RISK_TOLERANCE'
  },

  // Phase 5: Personalization
  RISK_TOLERANCE: {
    id: 'risk_tolerance',
    message: () => "How do you feel about financial risk when investing?",
    component: {
      type: 'slider',
      data: {
        title: 'Risk Comfort Level',
        min: 1,
        max: 10,
        default: 5,
        labels: {
          1: 'Very Safe',
          5: 'Balanced',
          10: 'Very Aggressive'
        },
        descriptions: {
          low: 'I prefer guaranteed returns',
          medium: 'Balance of safety and growth',
          high: 'I can handle ups and downs'
        }
      }
    },
    saveKey: 'riskTolerance',
    next: 'GOALS_SELECTION'
  },

  GOALS_SELECTION: {
    id: 'goals_selection',
    message: () => "What financial goals are important to you? Choose up to 5:",
    component: {
      type: 'checkboxes',
      data: {
        options: [
          { id: 'emergency', label: 'Emergency Fund', value: 'emergency_fund', icon: '🛡️', recommended: true },
          { id: 'debt', label: 'Pay Off Debt', value: 'debt_payoff', icon: '💳' },
          { id: 'home', label: 'Buy a Home', value: 'home_purchase', icon: '🏠' },
          { id: 'retirement', label: 'Retirement', value: 'retirement', icon: '🏖️', recommended: true },
          { id: 'invest', label: 'Build Wealth', value: 'investments', icon: '📈' },
          { id: 'travel', label: 'Travel Fund', value: 'travel', icon: '✈️' },
          { id: 'education', label: 'Education', value: 'education', icon: '🎓' },
          { id: 'business', label: 'Start Business', value: 'business', icon: '🚀' }
        ],
        minSelect: 1,
        maxSelect: 5
      }
    },
    saveKey: 'selectedGoals',
    next: (response: any, progress: any) => {
      // Skip manual asset/liability input if we already have them from Plaid
      if (progress?.detectedAssets || progress?.hasConnectedAccounts) {
        return 'DASHBOARD_PREVIEW';
      }
      return 'ASSETS_INPUT';
    }
  },

  // New: Assets Input
  ASSETS_INPUT: {
    id: 'assets_input',
    message: () => "Great goals! Now let's quickly add any assets you own (you can skip this):",
    component: {
      type: 'assetsInput',
      data: {
        skipOption: true
      }
    },
    saveKey: 'manualAssets',
    skipOption: true,
    next: 'LIABILITIES_INPUT'
  },

  // New: Liabilities Input
  LIABILITIES_INPUT: {
    id: 'liabilities_input',
    message: () => "And what about any debts or loans? (you can skip this too):",
    component: {
      type: 'liabilitiesInput',
      data: {
        skipOption: true
      }
    },
    saveKey: 'manualLiabilities',
    skipOption: true,
    next: 'DASHBOARD_PREVIEW'
  },

  // Phase 6: Preview & Complete
  DASHBOARD_PREVIEW: {
    id: 'dashboard_preview',
    message: (name: string) => `Amazing work, ${name}! Here's your personalized financial dashboard:`,
    component: {
      type: 'dashboardPreview',
      data: {} // Populated with calculated data
    },
    saveKey: 'dashboardViewed',
    next: 'COMPLETE'
  },

  COMPLETE: {
    id: 'complete',
    message: (name: string) => `🎉 You're all set, ${name}! Your dashboard is ready with personalized insights, smart budgeting, and goal tracking. You can always update your information by saying "update my profile". What would you like to explore first?`,
    component: null,
    saveKey: 'onboardingComplete',
    next: null
  }
};

// Helper to get next step
export function getNextOnboardingStep(currentStep: string, response: any, progress?: any): string | null {
  const step = ONBOARDING_FLOW[currentStep as keyof typeof ONBOARDING_FLOW];
  if (!step) return null;
  
  if (typeof step.next === 'function') {
    return step.next(response, progress);
  }
  
  return step.next;
}

// Helper to check if should show dashboard preview
export function shouldShowDashboardPreview(responses: Record<string, any>): boolean {
  // Show preview after collecting key data points
  const hasIncome = responses.monthlyIncome || responses.incomeConfirmed;
  const hasGoals = responses.selectedGoals || responses.mainGoal;
  const hasAccounts = responses.plaidConnection || responses.manualAccounts;
  
  return (hasIncome && hasGoals) || hasAccounts;
}

// Generate contextual follow-up message
export function getContextualFollowUp(step: string, response: any, userName: string): string {
  const contextualResponses: Record<string, (response: any, name: string) => string> = {
    main_goal: (res, name) => {
      const goalMessages = {
        debt_payoff: `Debt can feel overwhelming, but we'll tackle it together!`,
        emergency_fund: `Smart choice! An emergency fund is the foundation of financial security.`,
        home_purchase: `Exciting! Let's build a plan to get you into your dream home.`,
        retirement: `Planning ahead - I love it! Time is your biggest asset.`,
        travel: `Adventures await! Let's make sure you can afford them comfortably.`,
        investments: `Building wealth is a journey - let's start it right!`,
        other: `No problem! I'll help you achieve whatever you have in mind.`
      };
      return goalMessages[res] || `Great choice! Let's make it happen.`;
    },
    
    plaid_connection: (res, name) => {
      if (res?.publicToken) {
        return `Perfect! I can see you have ${res.accounts?.length || 'multiple'} accounts. This is going to make everything so much easier!`;
      }
      return `No worries at all! We can still build your perfect financial plan.`;
    },
    
    risk_tolerance: (res, name) => {
      const risk = parseInt(res);
      if (risk <= 3) return `Safety first - totally understand! We'll focus on secure, steady growth.`;
      if (risk <= 7) return `Balanced approach - smart! We'll mix stability with growth opportunities.`;
      return `You're comfortable with risk - great! Higher risk can mean higher rewards.`;
    },
    
    goals_selection: (res, name) => {
      const count = res?.selected?.length || res?.length || 0;
      if (count === 1) return `Focused approach - I like it! Let's nail this goal.`;
      if (count <= 3) return `Perfect number of goals! We can definitely handle these together.`;
      return `Ambitious! I'll help you balance and prioritize all ${count} goals.`;
    }
  };
  
  const handler = contextualResponses[step];
  return handler ? handler(response, userName) : '';
}

// Calculate and store derived data from onboarding
export async function processOnboardingData(userId: string, responses: Record<string, any>) {
  const processed = {
    // User demographics
    demographics: {
      life_stage: responses.lifeStage,
      dependents: responses.dependents || 0,
      marital_status: responses.lifeStage?.includes('married') ? 'married' : 'single'
    },
    
    // Financial snapshot
    financials: {
      monthly_income: responses.monthlyIncome || responses.detectedIncome || 0,
      monthly_expenses: responses.monthlyExpenses || responses.detectedExpenses?.total || 0,
      net_worth: calculateNetWorth(responses),
      savings_rate: calculateSavingsRate(responses)
    },
    
    // Preferences
    preferences: {
      risk_tolerance: responses.riskTolerance || 5,
      financial_goals: responses.selectedGoals || [responses.mainGoal],
      investment_horizon: getInvestmentHorizon(responses.lifeStage)
    },
    
    // Budget categories (auto-generated or detected)
    budget: responses.expenseCategories || generateSmartBudget(responses),
    
    // Goals with targets
    goals: generateGoalTargets(responses),
    
    // Dashboard configuration
    dashboard: {
      widgets: getRecommendedWidgets(responses),
      insights_frequency: responses.notificationFrequency || 'weekly'
    }
  };
  
  return processed;
}

// Helper functions
function calculateNetWorth(responses: any): number {
  const assets = (responses.manualAccounts?.checking || 0) +
                 (responses.manualAccounts?.savings || 0) +
                 (responses.manualAccounts?.investments || 0);
  
  const liabilities = (responses.manualAccounts?.credit_cards || 0) +
                      (responses.detectedDebts?.total || 0);
  
  return assets - liabilities;
}

function calculateSavingsRate(responses: any): number {
  const income = responses.monthlyIncome || responses.detectedIncome || 0;
  const expenses = responses.monthlyExpenses || responses.detectedExpenses?.total || 0;
  
  if (income === 0) return 0;
  return Math.max(0, Math.round(((income - expenses) / income) * 100));
}

function getInvestmentHorizon(lifeStage: string): string {
  const horizons: Record<string, string> = {
    student: 'long_term',
    working_professional: 'long_term',
    married_partnered: 'medium_term',
    parent: 'medium_term',
    retired: 'short_term'
  };
  return horizons[lifeStage] || 'medium_term';
}

function generateSmartBudget(responses: any): Record<string, number> {
  const income = responses.monthlyIncome || 5000;
  
  // Smart defaults based on life stage and goals
  const baseAllocation = {
    housing: 0.28,
    food: 0.12,
    transportation: 0.15,
    utilities: 0.08,
    entertainment: 0.05,
    savings: 0.20,
    other: 0.12
  };
  
  // Adjust based on goals
  if (responses.mainGoal === 'debt_payoff') {
    baseAllocation.savings = 0.30;
    baseAllocation.entertainment = 0.03;
  }
  
  const budget: Record<string, number> = {};
  Object.entries(baseAllocation).forEach(([category, percentage]) => {
    budget[category] = Math.round(income * percentage);
  });
  
  return budget;
}

function generateGoalTargets(responses: any): any[] {
  const goals = responses.selectedGoals || [responses.mainGoal];
  const income = responses.monthlyIncome || 5000;
  
  return goals.map((goalId: string) => {
    const goalConfigs: Record<string, any> = {
      emergency_fund: {
        name: 'Emergency Fund',
        target_amount: income * 6,
        monthly_contribution: income * 0.1,
        target_months: 60
      },
      debt_payoff: {
        name: 'Debt Freedom',
        target_amount: responses.totalDebt || 10000,
        monthly_contribution: income * 0.25,
        target_months: 40
      },
      home_purchase: {
        name: 'Home Down Payment',
        target_amount: income * 10,
        monthly_contribution: income * 0.15,
        target_months: 67
      },
      retirement: {
        name: 'Retirement',
        target_amount: income * 200,
        monthly_contribution: income * 0.15,
        target_months: 360
      }
    };
    
    return goalConfigs[goalId] || {
      name: goalId,
      target_amount: income * 5,
      monthly_contribution: income * 0.1,
      target_months: 50
    };
  });
}

function getRecommendedWidgets(responses: any): string[] {
  const widgets = ['net_worth', 'monthly_cashflow'];
  
  if (responses.selectedGoals?.includes('debt_payoff')) {
    widgets.push('debt_tracker');
  }
  
  if (responses.plaidConnection) {
    widgets.push('spending_insights', 'account_balances');
  }
  
  if (responses.selectedGoals?.includes('investments')) {
    widgets.push('investment_performance');
  }
  
  widgets.push('goal_progress', 'ai_insights');
  
  return widgets;
}

// Export the complete onboarding manager
export const OnboardingManager = {
  flow: ONBOARDING_FLOW,
  getNextStep: getNextOnboardingStep,
  shouldShowPreview: shouldShowDashboardPreview,
  getFollowUp: getContextualFollowUp,
  processData: processOnboardingData
};