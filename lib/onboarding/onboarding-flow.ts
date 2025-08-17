import { OnboardingFlow, QuickStartTemplate, LifeEvent } from './types';

export const quickStartTemplates: QuickStartTemplate[] = [
  {
    id: 'debt-crusher',
    title: "I'm drowning in debt",
    description: 'Focus on paying off debt and regaining control',
    icon: '🎯',
    presets: {
      goals: ['debt_payoff', 'emergency_fund'],
      budgetFocus: 'aggressive_saving',
      riskTolerance: 2,
      notifications: 'daily'
    }
  },
  {
    id: 'first-timer',
    title: "I'm new to budgeting",
    description: 'Start with the basics and build good habits',
    icon: '🌱',
    presets: {
      goals: ['budget_tracking', 'emergency_fund'],
      budgetFocus: 'balanced',
      riskTolerance: 5,
      notifications: 'weekly'
    }
  },
  {
    id: 'wealth-builder',
    title: "I want to build wealth",
    description: 'Focus on investments and long-term growth',
    icon: '📈',
    presets: {
      goals: ['investments', 'retirement', 'real_estate'],
      budgetFocus: 'investment_heavy',
      riskTolerance: 7,
      notifications: 'weekly'
    }
  },
  {
    id: 'family-focused',
    title: "Planning for my family",
    description: 'Balance current needs with future security',
    icon: '👨‍👩‍👧‍👦',
    presets: {
      goals: ['emergency_fund', 'college_savings', 'home_purchase'],
      budgetFocus: 'family_oriented',
      riskTolerance: 4,
      notifications: 'bi-weekly'
    }
  }
];

export const commonLifeEvents: LifeEvent[] = [
  {
    id: 'wedding',
    name: 'Getting Married',
    icon: '💍',
    timeframe: '6-18 months',
    financialImpact: { savingsNeeded: 25000 }
  },
  {
    id: 'baby',
    name: 'Having a Baby',
    icon: '👶',
    timeframe: '9 months',
    financialImpact: { 
      savingsNeeded: 5000,
      budgetAdjustment: { childcare: 1500, healthcare: 300 }
    }
  },
  {
    id: 'home',
    name: 'Buying First Home',
    icon: '🏠',
    timeframe: '1-3 years',
    financialImpact: { savingsNeeded: 50000 }
  },
  {
    id: 'college',
    name: 'Starting College',
    icon: '🎓',
    timeframe: 'Now',
    financialImpact: { cost: 30000 }
  },
  {
    id: 'retirement',
    name: 'Planning Retirement',
    icon: '🏖️',
    timeframe: '5+ years',
    financialImpact: { savingsNeeded: 1000000 }
  },
  {
    id: 'career-change',
    name: 'Changing Careers',
    icon: '💼',
    timeframe: '3-6 months',
    financialImpact: { savingsNeeded: 10000 }
  }
];

export const onboardingFlow: OnboardingFlow = {
  phases: {
    welcome: {
      title: 'Welcome to TrueFi!',
      description: "I'm Penny, your AI financial assistant 🪙",
      questions: [
        {
          id: 'welcome-1',
          type: 'text',
          content: "Hi there! I'm Penny, and I'm here to help you take control of your finances. What should I call you?",
          saveKey: 'firstName',
          required: true
        },
        {
          id: 'welcome-2',
          type: 'buttons',
          content: "Nice to meet you! How much time do you have right now?",
          data: {
            options: [
              { id: 'quick', label: '⚡ 3 minutes - Quick Setup', value: 'quick' },
              { id: 'standard', label: '⏱️ 10 minutes - Recommended', value: 'standard' },
              { id: 'complete', label: '🎯 15+ minutes - Complete Profile', value: 'complete' }
            ]
          },
          saveKey: 'onboardingDepth'
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    'quick-wins': {
      title: 'Quick Wins',
      description: "Let's start with what matters most to you",
      questions: [
        {
          id: 'quick-template',
          type: 'cards',
          content: "Which best describes your current situation?",
          data: {
            templates: quickStartTemplates,
            allowCustom: true
          },
          saveKey: 'quickStartTemplate',
          skipOption: true
        },
        {
          id: 'life-stage',
          type: 'image-choice',
          content: "What stage of life are you in?",
          data: {
            options: [
              { id: 'student', label: 'Student', image: '🎓' },
              { id: 'early-career', label: 'Early Career', image: '💼' },
              { id: 'growing-family', label: 'Growing Family', image: '👨‍👩‍👧' },
              { id: 'established', label: 'Established', image: '🏆' },
              { id: 'pre-retirement', label: 'Pre-Retirement', image: '🌅' },
              { id: 'retired', label: 'Retired', image: '🏖️' }
            ]
          },
          saveKey: 'lifeStage',
          required: true
        },
        {
          id: 'primary-goals',
          type: 'checkbox-group',
          content: "What are your top financial goals? (Select all that apply)",
          data: {
            options: [
              { id: 'emergency-fund', label: '🛡️ Build Emergency Fund', value: 'emergency_fund' },
              { id: 'debt-free', label: '💳 Become Debt Free', value: 'debt_payoff' },
              { id: 'home', label: '🏠 Buy a Home', value: 'home_purchase' },
              { id: 'invest', label: '📈 Start Investing', value: 'investments' },
              { id: 'retire', label: '🏖️ Save for Retirement', value: 'retirement' },
              { id: 'travel', label: '✈️ Travel More', value: 'travel' },
              { id: 'education', label: '🎓 Save for Education', value: 'education' },
              { id: 'business', label: '🚀 Start a Business', value: 'business' }
            ],
            maxSelect: 5,
            minSelect: 1
          },
          saveKey: 'primaryGoals',
          required: true,
          celebration: true
        }
      ],
      minCompletion: 2,
      celebration: true
    },

    'financial-snapshot': {
      title: 'Financial Snapshot',
      description: "Let's understand your current situation",
      questions: [
        {
          id: 'income-range',
          type: 'slider',
          content: "What's your approximate annual income?",
          data: {
            min: 0,
            max: 500000,
            step: 5000,
            prefix: '$',
            labels: {
              0: '$0',
              50000: '$50k',
              100000: '$100k',
              200000: '$200k',
              500000: '$500k+'
            }
          },
          saveKey: 'annualIncome',
          skipOption: true
        },
        {
          id: 'monthly-expenses',
          type: 'slider',
          content: "Roughly how much do you spend each month?",
          data: {
            min: 0,
            max: 20000,
            step: 100,
            prefix: '$',
            smartDefault: 'incomeBasedEstimate' // Will calculate based on income
          },
          saveKey: 'monthlyExpenses',
          skipOption: true
        },
        {
          id: 'connect-accounts',
          type: 'plaid-connect',
          content: "Connect your bank accounts for automatic tracking and personalized insights",
          data: {
            benefits: [
              'Automatic transaction categorization',
              'Real-time balance updates',
              'Spending insights',
              'Bill reminders'
            ],
            skipText: "I'll do this later"
          },
          saveKey: 'plaidConnected',
          skipOption: true
        },
        {
          id: 'manual-accounts',
          type: 'quick-add',
          content: "Or quickly add your account balances manually",
          data: {
            fields: [
              { id: 'checking', label: 'Checking Account', type: 'currency', icon: '🏦' },
              { id: 'savings', label: 'Savings Account', type: 'currency', icon: '💰' },
              { id: 'credit-cards', label: 'Credit Card Debt', type: 'currency', icon: '💳' },
              { id: 'investments', label: 'Investments', type: 'currency', icon: '📈' }
            ]
          },
          saveKey: 'manualBalances',
          skipOption: true
        },
        {
          id: 'existing-debt',
          type: 'checkbox-group',
          content: "Do you have any of these debts?",
          data: {
            options: [
              { id: 'student-loans', label: '🎓 Student Loans', hasAmount: true },
              { id: 'credit-cards', label: '💳 Credit Cards', hasAmount: true },
              { id: 'auto-loan', label: '🚗 Auto Loan', hasAmount: true },
              { id: 'mortgage', label: '🏠 Mortgage', hasAmount: true },
              { id: 'personal-loan', label: '💵 Personal Loan', hasAmount: true }
            ]
          },
          saveKey: 'existingDebt',
          skipOption: true
        }
      ],
      minCompletion: 2,
      celebration: true
    },

    'personalization': {
      title: 'Personalization',
      description: "Let's customize your experience",
      questions: [
        {
          id: 'money-personality',
          type: 'image-choice',
          content: "You find $100 unexpectedly. What do you do?",
          data: {
            options: [
              { id: 'save-all', label: 'Save it all', image: '🏦', value: { spenderSaver: 1 } },
              { id: 'save-most', label: 'Save most, treat myself a little', image: '💰', value: { spenderSaver: 0.5 } },
              { id: 'half-half', label: 'Save half, spend half', image: '⚖️', value: { spenderSaver: 0 } },
              { id: 'spend-most', label: 'Spend most, save a little', image: '🛍️', value: { spenderSaver: -0.5 } },
              { id: 'spend-all', label: 'Treat myself!', image: '🎉', value: { spenderSaver: -1 } }
            ]
          },
          saveKey: 'moneyPersonality',
          required: true
        },
        {
          id: 'risk-tolerance',
          type: 'cards',
          content: "How do you feel about financial risk?",
          data: {
            options: [
              { 
                id: 'conservative',
                title: 'Conservative',
                description: 'I prefer safety over growth',
                icon: '🛡️',
                value: 2
              },
              {
                id: 'moderate',
                title: 'Moderate',
                description: 'Balance of safety and growth',
                icon: '⚖️',
                value: 5
              },
              {
                id: 'aggressive',
                title: 'Aggressive',
                description: 'I can handle ups and downs for growth',
                icon: '🚀',
                value: 8
              }
            ]
          },
          saveKey: 'riskTolerance'
        },
        {
          id: 'budget-categories',
          type: 'pie-chart',
          content: "How would you like to allocate your budget?",
          data: {
            smartDefaults: true, // AI will suggest based on income/lifestyle
            categories: [
              { id: 'housing', label: '🏠 Housing', default: 28 },
              { id: 'food', label: '🍔 Food & Dining', default: 15 },
              { id: 'transport', label: '🚗 Transportation', default: 15 },
              { id: 'utilities', label: '💡 Utilities', default: 5 },
              { id: 'entertainment', label: '🎬 Entertainment', default: 5 },
              { id: 'savings', label: '💰 Savings', default: 20 },
              { id: 'other', label: '📦 Everything Else', default: 12 }
            ]
          },
          saveKey: 'budgetAllocation',
          skipOption: true
        },
        {
          id: 'life-events',
          type: 'checkbox-group',
          content: "Any major life events coming up?",
          data: {
            options: commonLifeEvents.map(event => ({
              id: event.id,
              label: `${event.icon} ${event.name}`,
              value: event.id,
              timeframe: event.timeframe
            }))
          },
          saveKey: 'upcomingLifeEvents',
          skipOption: true
        },
        {
          id: 'notification-preferences',
          type: 'buttons',
          content: "How often would you like financial insights?",
          data: {
            options: [
              { id: 'daily', label: '📅 Daily', value: 'daily' },
              { id: 'weekly', label: '📊 Weekly', value: 'weekly' },
              { id: 'monthly', label: '📈 Monthly', value: 'monthly' },
              { id: 'important', label: '🔔 Only Important', value: 'important' }
            ]
          },
          saveKey: 'notificationFrequency'
        }
      ],
      minCompletion: 3,
      celebration: true
    },

    'goals-dreams': {
      title: 'Goals & Dreams',
      description: "Let's make your dreams a reality",
      questions: [
        {
          id: 'goal-prioritization',
          type: 'drag-sort',
          content: "Drag to prioritize your goals (most important on top)",
          data: {
            items: 'userSelectedGoals', // Will be populated from previous answers
            showEstimates: true
          },
          saveKey: 'goalPriorities'
        },
        {
          id: 'goal-timeline',
          type: 'timeline',
          content: "When would you like to achieve these goals?",
          data: {
            goals: 'prioritizedGoals',
            minYear: 'currentYear',
            maxYear: 'currentYear + 30'
          },
          saveKey: 'goalTimelines'
        },
        {
          id: 'motivation',
          type: 'buttons',
          content: "What motivates you most about managing money?",
          data: {
            options: [
              { id: 'security', label: '🛡️ Security & Peace of Mind', value: 'security' },
              { id: 'freedom', label: '🦅 Financial Freedom', value: 'freedom' },
              { id: 'family', label: '👨‍👩‍👧‍👦 Providing for Family', value: 'family' },
              { id: 'experiences', label: '🌎 Life Experiences', value: 'experience' },
              { id: 'legacy', label: '🏛️ Building a Legacy', value: 'legacy' }
            ]
          },
          saveKey: 'primaryMotivation'
        },
        {
          id: 'subscriptions',
          type: 'checkbox-group',
          content: "Quick check - which subscriptions do you have?",
          data: {
            options: [
              { id: 'netflix', label: '📺 Netflix (~$15)', value: 15 },
              { id: 'spotify', label: '🎵 Spotify (~$10)', value: 10 },
              { id: 'gym', label: '💪 Gym (~$30)', value: 30 },
              { id: 'amazon-prime', label: '📦 Amazon Prime (~$15)', value: 15 },
              { id: 'disney', label: '🏰 Disney+ (~$8)', value: 8 },
              { id: 'hulu', label: '📺 Hulu (~$12)', value: 12 },
              { id: 'apple', label: '🍎 Apple Services (~$10)', value: 10 },
              { id: 'other', label: '➕ Others', customAmount: true }
            ],
            calculateTotal: true
          },
          saveKey: 'subscriptions',
          skipOption: true
        }
      ],
      minCompletion: 2,
      celebration: true
    },

    'complete': {
      title: 'All Set!',
      description: 'Your personalized dashboard is ready',
      questions: [
        {
          id: 'completion-summary',
          type: 'text',
          content: "🎉 Amazing! I've learned so much about you. Based on what you've shared, I've created your personalized financial dashboard with custom insights, budget recommendations, and goal tracking. Ready to see it?",
          celebration: true
        }
      ],
      minCompletion: 0,
      celebration: true
    }
  }
};