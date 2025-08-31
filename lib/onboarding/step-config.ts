import { OnboardingStep } from './ordered-steps';

export interface StepConfig {
  id: OnboardingStep;
  message: string;
  component: {
    type: string;
    data: any;
  };
  onAnswer?: (value: any, ctx: any) => Promise<void>;
  next: (state: any) => OnboardingStep;
}

export const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
  consent: {
    id: 'consent',
    message: "Before we begin, I need your consent to help manage your financial data securely.",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Please review and accept:',
        options: [
          { id: 'tos', label: 'I accept the Terms of Service', value: 'tos', required: true },
          { id: 'privacy', label: 'I accept the Privacy Policy', value: 'privacy', required: true },
          { id: 'data', label: 'I consent to secure data processing', value: 'data', required: true }
        ]
      }
    },
    next: () => 'welcome'
  },

  welcome: {
    id: 'welcome',
    message: "Welcome! I'm Penny, your AI financial assistant. I'll help you build a personalized financial plan in just a few minutes.",
    component: {
      type: 'buttons',
      data: {
        question: "Ready to get started?",
        options: [
          { id: 'start', label: "Let's do this! 🚀", value: 'start', icon: '✨' }
        ]
      }
    },
    next: () => 'main_goal'
  },

  main_goal: {
    id: 'main_goal',
    message: "Great! First, what brings you to TrueFi today?",
    component: {
      type: 'buttons',
      data: {
        question: "What's your primary financial focus?",
        options: [
          { id: 'understand', label: 'Understand my finances', value: 'understand', icon: '📊' },
          { id: 'budget', label: 'Create a budget', value: 'budget', icon: '💰' },
          { id: 'goals', label: 'Save for goals', value: 'goals', icon: '🎯' },
          { id: 'invest', label: 'Start investing', value: 'invest', icon: '📈' },
          { id: 'debt', label: 'Pay off debt', value: 'debt', icon: '💳' },
          { id: 'other', label: 'Something else', value: 'other', icon: '💭' }
        ]
      }
    },
    next: () => 'life_stage'
  },

  life_stage: {
    id: 'life_stage',
    message: "Understanding your life stage helps me personalize your plan.",
    component: {
      type: 'buttons',
      data: {
        question: "Which best describes you?",
        options: [
          { id: 'student', label: 'Student', value: 'student', icon: '🎓' },
          { id: 'working', label: 'Working Professional', value: 'working', icon: '💼' },
          { id: 'partnership', label: 'Married/Partnership', value: 'partnership', icon: '💑' },
          { id: 'parent', label: 'Parent', value: 'parent', icon: '👨‍👩‍👧‍👦' },
          { id: 'near_retirement', label: 'Near Retirement', value: 'near_retirement', icon: '🏖️' }
        ]
      }
    },
    next: () => 'dependents'
  },

  dependents: {
    id: 'dependents',
    message: "Do you have any dependents?",
    component: {
      type: 'buttons',
      data: {
        question: "Number of dependents:",
        options: [
          { id: 'zero', label: '0', value: '0', icon: '👤' },
          { id: 'one', label: '1', value: '1', icon: '👥' },
          { id: 'two', label: '2', value: '2', icon: '👨‍👩‍👧' },
          { id: 'three_plus', label: '3+', value: '3+', icon: '👨‍👩‍👧‍👦' }
        ]
      }
    },
    next: () => 'jurisdiction'
  },

  jurisdiction: {
    id: 'jurisdiction',
    message: "Where are you located? This helps with tax and regulatory guidance.",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'country', 
            label: 'Country', 
            type: 'select', 
            options: [
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' }
            ], 
            required: true 
          },
          { 
            id: 'state', 
            label: 'State/Province', 
            type: 'combobox', 
            required: true,
            placeholder: 'Type to search...',
            options: [] // Will be populated dynamically based on country
          }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    next: () => 'plaid_connection'
  },

  plaid_connection: {
    id: 'plaid_connection',
    message: "Now let's connect your accounts. This will automatically detect your income, expenses, and net worth to save you time.",
    component: {
      type: 'plaid',
      data: {
        question: 'Connect your bank accounts securely',
        description: 'Your data is encrypted and we never store your credentials'
      }
    },
    next: () => 'household'
  },

  household: {
    id: 'household',
    message: "Let's confirm your household financial information.",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'partner_income', 
            label: "Partner's Monthly Income", 
            type: 'currency', 
            placeholder: '$0',
            required: false
          },
          { 
            id: 'shared_expenses', 
            label: 'Shared Monthly Expenses', 
            type: 'currency', 
            placeholder: '$0',
            required: false
          },
          { 
            id: 'household_net_worth', 
            label: 'Total Household Net Worth', 
            type: 'currency',
            placeholder: 'Auto-calculated from accounts',
            required: false
            // Will be prefilled from Plaid: assets - liabilities
          }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    next: (state: any) => state.hasPlaidData ? 'income_confirmation' : 'income_capture'
  },

  income_capture: {
    id: 'income_capture',
    message: "Let me help you with your income information.",
    component: {
      type: 'buttons',
      data: {
        question: "How would you like to proceed?",
        options: [] // Will be populated dynamically with detection results
      }
    },
    next: (state: any) => {
      const value = state.responses?.income_capture;
      if (value === '__retry__') return 'income_capture';
      if (value === 'manual' || value === 'variable') return 'manual_income';
      return 'income_confirmation';
    }
  },

  manual_income: {
    id: 'manual_income',
    message: "Let's set up your income information.",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'monthly_income', 
            label: 'Monthly Income', 
            type: 'currency', 
            required: true,
            placeholder: 'Total monthly income'
          },
          { 
            id: 'pay_frequency', 
            label: 'Pay Frequency', 
            type: 'select',
            options: [
              { value: 'monthly', label: 'Monthly' },
              { value: 'biweekly', label: 'Bi-weekly' },
              { value: 'weekly', label: 'Weekly' }
            ],
            required: false
          }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    next: () => 'income_confirmation'
  },

  income_confirmation: {
    id: 'income_confirmation',
    message: "Let me confirm your income.",
    component: {
      type: 'buttons',
      data: {
        question: "Is this monthly income correct?",
        options: [] // Will be populated with detected/entered amount
      }
    },
    next: (state: any) => {
      const value = state.responses?.income_confirmation;
      if (value === 'edit') return 'manual_income';
      return 'pay_structure';
    }
  },

  pay_structure: {
    id: 'pay_structure',
    message: "How is your income structured?",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'type', 
            label: 'Income Type', 
            type: 'select',
            options: [
              { value: 'salaried', label: 'Salaried' },
              { value: 'variable', label: 'Variable/Commission' },
              { value: 'self_employed', label: 'Self-Employed' }
            ],
            required: true
          },
          { 
            id: 'variable_pct', 
            label: 'Variable Income %', 
            type: 'slider',
            min: 0,
            max: 100,
            step: 5,
            required: false
          }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    next: () => 'benefits_equity'
  },

  benefits_equity: {
    id: 'benefits_equity',
    message: "Tell me about your employment benefits and equity.",
    component: {
      type: 'form',
      data: {
        fields: [
          { id: '401k_match', label: '401k Match %', type: 'number', placeholder: '0-100' },
          { id: 'rsu_value', label: 'RSU Value', type: 'currency', placeholder: '$0' },
          { id: 'stock_options', label: 'Stock Options Value', type: 'currency', placeholder: '$0' }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    next: () => 'expenses_capture'
  },

  expenses_capture: {
    id: 'expenses_capture',
    message: "Let's review your monthly expenses.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Adjust your expense categories',
        editable: true,
        categories: [] // Will be populated from Plaid or defaults
      }
    },
    next: () => 'debts_detail'
  },

  debts_detail: {
    id: 'debts_detail',
    message: "Let's detail your debts for optimization.",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'credit_cards', 
            label: 'Credit Card Debt', 
            type: 'currency',
            subfields: ['balance', 'apr', 'min_payment']
          },
          { 
            id: 'student_loans', 
            label: 'Student Loans', 
            type: 'currency',
            subfields: ['balance', 'apr', 'min_payment']
          },
          { 
            id: 'auto_loans', 
            label: 'Auto Loans', 
            type: 'currency',
            subfields: ['balance', 'apr', 'min_payment']
          },
          { 
            id: 'personal_loans', 
            label: 'Personal Loans', 
            type: 'currency',
            subfields: ['balance', 'apr', 'min_payment']
          }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    next: () => 'housing'
  },

  housing: {
    id: 'housing',
    message: "Tell me about your housing situation.",
    component: {
      type: 'buttons',
      data: {
        question: "Do you rent or own?",
        options: [
          { id: 'rent', label: 'Rent', value: 'rent', icon: '🏢' },
          { id: 'own', label: 'Own', value: 'own', icon: '🏠' },
          { id: 'other', label: 'Other', value: 'other', icon: '🏘️' }
        ]
      }
    },
    next: () => 'insurance'
  },

  insurance: {
    id: 'insurance',
    message: "What insurance coverage do you have?",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Select all that apply:',
        options: [
          { id: 'health', label: 'Health Insurance', value: 'health' },
          { id: 'life', label: 'Life Insurance', value: 'life' },
          { id: 'disability', label: 'Disability Insurance', value: 'disability' },
          { id: 'home_renters', label: 'Home/Renters Insurance', value: 'home_renters' },
          { id: 'auto', label: 'Auto Insurance', value: 'auto' }
        ]
      }
    },
    next: () => 'emergency_fund'
  },

  emergency_fund: {
    id: 'emergency_fund',
    message: "An emergency fund is crucial for financial security.",
    component: {
      type: 'slider',
      data: {
        question: 'How many months of expenses do you have saved?',
        min: 0,
        max: 12,
        step: 1,
        unit: 'months',
        currentLabel: 'Current:', // Will show: "Current: ~$X (Y months)"
        targetLabel: 'Recommended: 3-6 months'
        // Will be prefilled: savings balance ÷ monthly expenses
      }
    },
    next: () => 'risk_tolerance'
  },

  risk_tolerance: {
    id: 'risk_tolerance',
    message: "Let's understand your risk comfort level.",
    component: {
      type: 'slider',
      data: {
        question: 'How comfortable are you with investment risk?',
        min: 1,
        max: 10,
        step: 1,
        labels: {
          1: 'Very Conservative',
          5: 'Moderate',
          10: 'Very Aggressive'
        }
      }
    },
    next: () => 'risk_capacity'
  },

  risk_capacity: {
    id: 'risk_capacity',
    message: "Now let's assess your actual capacity for risk.",
    component: {
      type: 'form',
      data: {
        fields: [
          { 
            id: 'income_stability', 
            label: 'Income Stability', 
            type: 'select',
            options: [
              { value: 'very_stable', label: 'Very Stable' },
              { value: 'stable', label: 'Stable' },
              { value: 'variable', label: 'Variable' },
              { value: 'unstable', label: 'Unstable' }
            ]
          },
          { 
            id: 'investment_horizon', 
            label: 'Investment Timeline', 
            type: 'select',
            options: [
              { value: 'short', label: '< 3 years' },
              { value: 'medium', label: '3-10 years' },
              { value: 'long', label: '> 10 years' }
            ]
          },
          { 
            id: 'liquidity_needs', 
            label: 'Need for Quick Access', 
            type: 'select',
            options: [
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]
          }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    next: () => 'goals_selection'
  },

  goals_selection: {
    id: 'goals_selection',
    message: "What financial goals would you like to work toward?",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Select up to 3 goals:',
        maxSelections: 3,
        options: [
          { id: 'emergency_fund', label: 'Build Emergency Fund', value: 'emergency_fund', icon: '🛡️' },
          { id: 'pay_debt', label: 'Pay Off Debt', value: 'pay_debt', icon: '💳' },
          { id: 'buy_home', label: 'Buy a Home', value: 'buy_home', icon: '🏠' },
          { id: 'retirement', label: 'Save for Retirement', value: 'retirement', icon: '🏖️' },
          { id: 'invest', label: 'Build Wealth', value: 'invest', icon: '📈' },
          { id: 'vacation', label: 'Dream Vacation', value: 'vacation', icon: '✈️' },
          { id: 'education', label: 'Education', value: 'education', icon: '🎓' },
          { id: 'other', label: 'Other Goal', value: 'other', icon: '🎯' }
        ]
      }
    },
    next: (state: any) => {
      const goals = state.responses?.goals_selection || [];
      return goals.length > 0 ? 'goal_parameters' : 'budget_review';
    }
  },

  goal_parameters: {
    id: 'goal_parameters',
    message: "Let's set targets for your goals.",
    component: {
      type: 'form',
      data: {
        fields: [], // Will be populated based on selected goals
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    next: () => 'budget_review'
  },

  budget_review: {
    id: 'budget_review',
    message: "Here's your optimized budget based on your income and goals.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Review and adjust your budget',
        editable: true,
        categories: [] // Will be populated with AI-optimized budget
      }
    },
    next: () => 'savings_auto_rules'
  },

  savings_auto_rules: {
    id: 'savings_auto_rules',
    message: "Would you like to automate your savings?",
    component: {
      type: 'buttons',
      data: {
        question: 'Enable auto-allocation?',
        options: [
          { id: 'enable', label: 'Yes, automate my savings', value: 'on', icon: '🤖' },
          { id: 'disable', label: 'No, I\'ll manage manually', value: 'off', icon: '🙌' }
        ]
      }
    },
    next: () => 'plan_tradeoffs'
  },

  plan_tradeoffs: {
    id: 'plan_tradeoffs',
    message: "Let's explore some trade-offs in your financial plan.",
    component: {
      type: 'tradeoffs',
      data: {
        question: 'Adjust these levers to see impact:',
        scenarios: [
          { id: 'retire_age', label: 'Retirement Age', min: 55, max: 70, current: 65 },
          { id: 'savings_rate', label: 'Savings Rate', min: 5, max: 30, current: 15, unit: '%' },
          { id: 'risk_level', label: 'Investment Risk', min: 1, max: 10, current: 5 }
        ]
      }
    },
    next: () => 'dashboard_preview'
  },

  dashboard_preview: {
    id: 'dashboard_preview',
    message: "Here's your personalized financial dashboard!",
    component: {
      type: 'dashboardPreview',
      data: {
        widgets: ['net_worth', 'budget', 'goals', 'next_steps']
      }
    },
    next: () => 'celebrate_complete'
  },

  celebrate_complete: {
    id: 'celebrate_complete',
    message: "🎉 Congratulations! Your financial plan is ready. You're on your way to achieving your goals!",
    component: {
      type: 'buttons',
      data: {
        question: 'What would you like to do next?',
        options: [
          { id: 'dashboard', label: 'View My Dashboard', value: 'dashboard', icon: '📊' },
          { id: 'chat', label: 'Ask Penny a Question', value: 'chat', icon: '💬' }
        ]
      }
    },
    next: () => 'complete'
  },

  complete: {
    id: 'complete',
    message: "Welcome to your financial command center! I'm here whenever you need guidance.",
    component: {
      type: 'complete',
      data: {}
    },
    next: () => 'complete'
  }
};