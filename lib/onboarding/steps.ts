import * as crypto from 'crypto';

// Canonical onboarding step IDs - single source of truth
export const ONBOARDING_STEPS = {
  consent: 'consent',
  welcome: 'welcome',
  main_goal: 'main_goal',
  life_stage: 'life_stage',
  dependents: 'dependents',
  jurisdiction: 'jurisdiction',
  household: 'household',
  plaid_connection: 'plaid_connection',
  income_capture: 'income_capture',
  income_confirmation: 'income_confirmation',
  manual_income: 'manual_income',
  pay_structure: 'pay_structure',
  benefits_equity: 'benefits_equity',
  expenses_capture: 'expenses_capture',
  detected_expenses: 'detected_expenses',
  manual_expenses: 'manual_expenses',
  quick_accounts: 'quick_accounts',
  debts_detail: 'debts_detail',
  housing: 'housing',
  insurance: 'insurance',
  emergency_fund: 'emergency_fund',
  risk_tolerance: 'risk_tolerance',
  risk_capacity: 'risk_capacity',
  preferences_values: 'preferences_values',
  goals_selection: 'goals_selection',
  goal_parameters: 'goal_parameters',
  budget_review: 'budget_review',
  savings_auto_rules: 'savings_auto_rules',
  plan_tradeoffs: 'plan_tradeoffs',
  dashboard_preview: 'dashboard_preview',
  first_actions: 'first_actions',
  monitoring_preferences: 'monitoring_preferences',
  celebrate_complete: 'celebrate_complete',
  complete: 'complete'
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

// Component type definitions
export type ComponentType = 
  | 'buttons' 
  | 'cards' 
  | 'checkboxes' 
  | 'slider' 
  | 'plaid' 
  | 'quickAdd' 
  | 'pieChart' 
  | 'assetsInput' 
  | 'liabilitiesInput' 
  | 'dashboardPreview' 
  | 'form' 
  | 'tradeoffs';

// Component data schemas
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'combobox';
  options?: Array<{ value: string; label: string; group?: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface FormComponentData {
  fields: FormField[];
  submitLabel: string;
  allowSkip: boolean;
}

export interface TradeoffLever {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
}

export interface TradeoffsComponentData {
  levers: TradeoffLever[];
  submitLabel: string;
  allowSkip: boolean;
}

// Step configuration type
export interface StepConfig {
  id: OnboardingStep;
  message: string;
  component: {
    type: ComponentType;
    data: any;
  };
  onAnswer?: (value: any, ctx: any) => Promise<void>;
  next?: (state: any) => OnboardingStep | 'complete';
}

// Step configurations with DB write mappings
export const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
  consent: {
    id: 'consent',
    message: 'Before we begin, I need your consent to help manage your financial data.',
    component: {
      type: 'checkboxes',
      data: {
        question: 'Please review and accept:',
        options: [
          { id: 'terms', label: 'I accept the Terms of Service' },
          { id: 'privacy', label: 'I accept the Privacy Policy' },
          { id: 'data', label: 'I consent to secure financial data processing' }
        ],
        requireAll: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Store in user_onboarding_responses only
    },
    next: () => 'welcome'
  },

  welcome: {
    id: 'welcome',
    message: "Welcome! I'm Penny, your financial wellness companion. Let's get to know each other better.",
    component: {
      type: 'buttons',
      data: {
        question: "What would you like me to call you?",
        buttons: ['Continue'],
        requiresInput: true,
        inputPlaceholder: 'Enter your name'
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // If full name present, upsert user_identity.full_name
    },
    next: () => 'main_goal'
  },

  main_goal: {
    id: 'main_goal',
    message: "Great! Now, what brings you to TrueFi today?",
    component: {
      type: 'buttons',
      data: {
        question: "What's your primary financial goal?",
        options: [
          { id: 'understand-finances', label: 'Understand my finances', value: 'understand_finances', icon: '📊', description: 'Get clarity on income, expenses, and net worth' },
          { id: 'fix-budget', label: 'Fix my budget', value: 'fix_budget', icon: '💰', description: 'Control spending and optimize cash flow' },
          { id: 'save-goals', label: 'Save for goals', value: 'save_goals', icon: '🎯', description: 'Build savings for specific objectives' },
          { id: 'grow-wealth', label: 'Grow wealth', value: 'grow_wealth', icon: '📈', description: 'Invest and build long-term wealth' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Store in user_onboarding_responses
      await ctx.prisma.user_onboarding_responses.create({
        data: {
          id: crypto.randomUUID(),
          user_id: ctx.userId,
          question: 'main_goal',
          answer: value,
          created_at: new Date()
        }
      });
    },
    next: () => 'life_stage'  // Go to life_stage next
  },

  life_stage: {
    id: 'life_stage',
    message: "Understanding your life stage helps me personalize your financial plan.",
    component: {
      type: 'buttons',
      data: {
        question: "Which best describes your current life stage?",
        options: [
          { id: 'student', label: 'Student', value: 'student', icon: '🎓', description: 'In school or recently graduated' },
          { id: 'working', label: 'Working Professional', value: 'working', icon: '💼', description: 'Building my career' },
          { id: 'married', label: 'Married/Partnership', value: 'married', icon: '💑', description: 'Managing finances together' },
          { id: 'parent', label: 'Parent', value: 'parent', icon: '👨‍👩‍👧‍👦', description: 'Raising a family' },
          { id: 'retiring', label: 'Near Retirement', value: 'retiring', icon: '🏖️', description: 'Planning for retirement' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update user_demographics.life_stage
    },
    next: () => 'dependents'
  },

  dependents: {
    id: 'dependents',
    message: "Do you have any dependents?",
    component: {
      type: 'buttons',
      data: {
        question: "How many dependents do you have?",
        options: [
          { id: 'zero', label: '0', value: '0', icon: '👤' },
          { id: 'one', label: '1', value: '1', icon: '👥' },
          { id: 'two', label: '2', value: '2', icon: '👨‍👩‍👧' },
          { id: 'three-plus', label: '3+', value: '3+', icon: '👨‍👩‍👧‍👦' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update user_demographics.dependents
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
          { id: 'country', label: 'Country', type: 'select', options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' }
          ], required: true },
          { id: 'state', label: 'State/Province', type: 'combobox', required: true, 
            options: [
              // US States
              { value: 'AL', label: 'Alabama', group: 'US' },
              { value: 'AK', label: 'Alaska', group: 'US' },
              { value: 'AZ', label: 'Arizona', group: 'US' },
              { value: 'AR', label: 'Arkansas', group: 'US' },
              { value: 'CA', label: 'California', group: 'US' },
              { value: 'CO', label: 'Colorado', group: 'US' },
              { value: 'CT', label: 'Connecticut', group: 'US' },
              { value: 'DE', label: 'Delaware', group: 'US' },
              { value: 'FL', label: 'Florida', group: 'US' },
              { value: 'GA', label: 'Georgia', group: 'US' },
              { value: 'HI', label: 'Hawaii', group: 'US' },
              { value: 'ID', label: 'Idaho', group: 'US' },
              { value: 'IL', label: 'Illinois', group: 'US' },
              { value: 'IN', label: 'Indiana', group: 'US' },
              { value: 'IA', label: 'Iowa', group: 'US' },
              { value: 'KS', label: 'Kansas', group: 'US' },
              { value: 'KY', label: 'Kentucky', group: 'US' },
              { value: 'LA', label: 'Louisiana', group: 'US' },
              { value: 'ME', label: 'Maine', group: 'US' },
              { value: 'MD', label: 'Maryland', group: 'US' },
              { value: 'MA', label: 'Massachusetts', group: 'US' },
              { value: 'MI', label: 'Michigan', group: 'US' },
              { value: 'MN', label: 'Minnesota', group: 'US' },
              { value: 'MS', label: 'Mississippi', group: 'US' },
              { value: 'MO', label: 'Missouri', group: 'US' },
              { value: 'MT', label: 'Montana', group: 'US' },
              { value: 'NE', label: 'Nebraska', group: 'US' },
              { value: 'NV', label: 'Nevada', group: 'US' },
              { value: 'NH', label: 'New Hampshire', group: 'US' },
              { value: 'NJ', label: 'New Jersey', group: 'US' },
              { value: 'NM', label: 'New Mexico', group: 'US' },
              { value: 'NY', label: 'New York', group: 'US' },
              { value: 'NC', label: 'North Carolina', group: 'US' },
              { value: 'ND', label: 'North Dakota', group: 'US' },
              { value: 'OH', label: 'Ohio', group: 'US' },
              { value: 'OK', label: 'Oklahoma', group: 'US' },
              { value: 'OR', label: 'Oregon', group: 'US' },
              { value: 'PA', label: 'Pennsylvania', group: 'US' },
              { value: 'RI', label: 'Rhode Island', group: 'US' },
              { value: 'SC', label: 'South Carolina', group: 'US' },
              { value: 'SD', label: 'South Dakota', group: 'US' },
              { value: 'TN', label: 'Tennessee', group: 'US' },
              { value: 'TX', label: 'Texas', group: 'US' },
              { value: 'UT', label: 'Utah', group: 'US' },
              { value: 'VT', label: 'Vermont', group: 'US' },
              { value: 'VA', label: 'Virginia', group: 'US' },
              { value: 'WA', label: 'Washington', group: 'US' },
              { value: 'WV', label: 'West Virginia', group: 'US' },
              { value: 'WI', label: 'Wisconsin', group: 'US' },
              { value: 'WY', label: 'Wyoming', group: 'US' },
              { value: 'DC', label: 'District of Columbia', group: 'US' },
              // Canadian Provinces and Territories
              { value: 'AB', label: 'Alberta', group: 'CA' },
              { value: 'BC', label: 'British Columbia', group: 'CA' },
              { value: 'MB', label: 'Manitoba', group: 'CA' },
              { value: 'NB', label: 'New Brunswick', group: 'CA' },
              { value: 'NL', label: 'Newfoundland and Labrador', group: 'CA' },
              { value: 'NS', label: 'Nova Scotia', group: 'CA' },
              { value: 'ON', label: 'Ontario', group: 'CA' },
              { value: 'PE', label: 'Prince Edward Island', group: 'CA' },
              { value: 'QC', label: 'Quebec', group: 'CA' },
              { value: 'SK', label: 'Saskatchewan', group: 'CA' },
              { value: 'NT', label: 'Northwest Territories', group: 'CA' },
              { value: 'NU', label: 'Nunavut', group: 'CA' },
              { value: 'YT', label: 'Yukon', group: 'CA' }
            ],
            placeholder: 'Select your state or province'
          }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Upsert user_identity.country/state
    },
    next: () => 'household'
  },

  plaid_connection: {
    id: 'plaid_connection',
    message: "Let's connect your accounts to automate your financial setup.",
    component: {
      type: 'plaid',
      data: {
        question: 'Connect your bank accounts securely',
        description: 'This will automatically detect your income, expenses, and net worth to save you time',
        title: 'Secure Bank Connection',
        subtitle: 'We use bank-level encryption to keep your data safe',
        benefits: [
          'Automatic income detection',
          'Expense categorization',
          'Real-time net worth tracking',
          'Personalized recommendations'
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Plaid connection handled by separate API
      // Auto-detection happens in /api/plaid/exchange
    },
    next: () => 'income_capture'
  },

  household: {
    id: 'household',
    message: "Let's confirm your household financial information.",
    component: {
      type: 'form',
      data: {
        fields: [
          { id: 'partner_income', label: "Partner's Monthly Income", type: 'number', placeholder: '$0' },
          { id: 'shared_expenses', label: 'Shared Monthly Expenses', type: 'number', placeholder: '$0' },
          { id: 'household_net_worth', label: 'Combined Net Worth', type: 'number', placeholder: '$0' }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Upsert user_demographics with household data
    },
    next: (state: any) => state.hasPlaidData ? 'income_confirmation' : 'plaid_connection'
  },

  income_capture: {
    id: 'income_capture',
    message: "Let me help you understand your income streams.",
    component: {
      type: 'buttons',
      data: {
        question: "How would you like to proceed with income information?",
        description: "I'll help you track and understand your income.",
        options: [
          { id: 'detected', label: 'Use detected income', value: 'use_detected', icon: '✅', description: 'Amount detected from accounts' },
          { id: 'manual', label: 'Enter income manually', value: 'manual', icon: '📝', description: 'Input your income details' },
          { id: 'variable', label: 'My income varies', value: 'variable', icon: '📊', description: 'Set up variable income tracking' },
          { id: 'skip', label: 'Skip for now', value: '__skip__', icon: '⏭️', description: 'Come back to this later' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Handle special values
      if (value === '__retry__') return;
      if (value === '__skip__') return;
      // Store choice in preferences
      // TODO: Store in user_preferences.financial_goals.incomeType
    },
    next: (state: any) => {
      const value = state.responses?.income_capture;
      if (value === '__retry__') return 'income_capture';
      if (value === '__skip__' || value === 'skip') return 'pay_structure';
      if (value === 'use_detected') return 'income_confirmation';
      if (value === 'manual' || value === 'variable') return 'manual_income';
      return 'pay_structure';
    }
  },

  income_confirmation: {
    id: 'income_confirmation',
    message: "I detected your income from your connected accounts.",
    component: {
      type: 'buttons',
      data: {
        question: "Is this monthly income correct?",
        description: "Checking your income...",
        options: [
          { id: 'yes', label: 'Yes, correct', value: 'confirmed', icon: '✅' },
          { id: 'no', label: 'No, let me adjust', value: 'adjust', icon: '✏️' },
          { id: 'manual', label: 'Enter manually', value: 'manual', icon: '📝' },
          { id: 'retry', label: 'Retry detection', value: '__retry__', icon: '🔄' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Handle special values
      if (value === '__retry__') return;
      if (value === '__skip__') return;
      // Store confirmed income
      // TODO: Store confirmed income
    },
    next: (state: any) => {
      const value = state.responses?.income_confirmation;
      if (value === '__retry__') return 'income_confirmation';
      if (value === '__skip__') return 'pay_structure';
      if (value === 'confirmed' || value === 'yes') return 'pay_structure';
      if (value === 'adjust' || value === 'no' || value === 'manual') return 'manual_income';
      return 'pay_structure';
    }
  },

  manual_income: {
    id: 'manual_income',
    message: "Let's set up your income information.",
    component: {
      type: 'form',
      data: {
        fields: [
          { id: 'monthly_income', label: 'Monthly Income', type: 'currency', required: true },
          { id: 'pay_frequency', label: 'Pay Frequency', type: 'select', required: false, options: [
            { value: 'monthly', label: 'Monthly' },
            { value: 'biweekly', label: 'Bi-weekly' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'variable', label: 'Variable' }
          ]}
        ],
        submitLabel: 'Save income',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // Handle special values
      if (value === '__retry__') return;
      if (value === '__skip__') return;
      // TODO: Update income in database
    },
    next: (state: any) => {
      const value = state.responses?.manual_income;
      if (value === '__retry__') return 'manual_income';
      if (value === '__skip__') return 'pay_structure';
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
          { id: 'pay_frequency', label: 'Pay Frequency', type: 'select', options: [
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Bi-weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]},
          { id: 'variable_income', label: 'Variable Income %', type: 'number', placeholder: '0-100' }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Store in user_preferences.financial_goals.payStructure
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
          { id: '401k_match', label: '401k Match %', type: 'number' },
          { id: 'rsu_value', label: 'RSU Value', type: 'number' },
          { id: 'stock_options', label: 'Stock Options', type: 'number' }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Store in user_preferences.financial_goals.employerBenefits
    },
    next: (state: any) => state.hasPlaidData ? 'detected_expenses' : 'expenses_capture'
  },

  expenses_capture: {
    id: 'expenses_capture',
    message: "Now let's map out your monthly expenses.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Adjust your expense categories',
        categories: [
          { id: 'housing', label: 'Housing', amount: 0 },
          { id: 'food', label: 'Food', amount: 0 },
          { id: 'transport', label: 'Transport', amount: 0 },
          { id: 'utilities', label: 'Utilities', amount: 0 },
          { id: 'entertainment', label: 'Entertainment', amount: 0 },
          { id: 'other', label: 'Other', amount: 0 }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Create budget and budget_categories
    },
    next: () => 'quick_accounts'
  },

  detected_expenses: {
    id: 'detected_expenses',
    message: "I've analyzed your spending patterns.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Review and adjust detected expenses',
        categories: [] // Populated from detected data
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update budget_categories
    },
    next: () => 'quick_accounts'
  },

  manual_expenses: {
    id: 'manual_expenses',
    message: "Let's manually enter your expenses.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Enter your monthly expenses',
        categories: []
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Create budget_categories
    },
    next: () => 'quick_accounts'
  },

  quick_accounts: {
    id: 'quick_accounts',
    message: "Quick add any assets or liabilities not in connected accounts.",
    component: {
      type: 'quickAdd',
      data: {
        question: 'Add other accounts',
        fields: [
          { id: 'savings', label: 'Other Savings', icon: '💰', type: 'asset' },
          { id: 'investments', label: 'Investments', icon: '📈', type: 'asset' },
          { id: 'property', label: 'Property Value', icon: '🏠', type: 'asset' },
          { id: 'vehicles', label: 'Vehicle Value', icon: '🚗', type: 'asset' },
          { id: 'credit_cards', label: 'Credit Card Debt', icon: '💳', type: 'liability' },
          { id: 'student_loans', label: 'Student Loans', icon: '🎓', type: 'liability' },
          { id: 'personal_loans', label: 'Personal Loans', icon: '📋', type: 'liability' },
          { id: 'mortgage', label: 'Mortgage', icon: '🏡', type: 'liability' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Create manual assets/liabilities
    },
    next: () => 'debts_detail'
  },

  debts_detail: {
    id: 'debts_detail',
    message: "Let's detail any debts for optimization.",
    component: {
      type: 'liabilitiesInput',
      data: {
        question: 'Add debt details',
        fields: ['APR', 'minimum payment', 'term']
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update liabilities details
    },
    next: () => 'housing'
  },

  housing: {
    id: 'housing',
    message: "Tell me about your housing situation.",
    component: {
      type: 'buttons',
      data: {
        question: 'Do you rent or own?',
        options: [
          { id: 'rent', label: 'Rent', value: 'rent', icon: '🏢' },
          { id: 'own', label: 'Own', value: 'own', icon: '🏡' },
          { id: 'other', label: 'Other', value: 'other', icon: '🏘️' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Create real estate asset or record rent in budget
    },
    next: () => 'insurance'
  },

  insurance: {
    id: 'insurance',
    message: "What insurance coverage do you have?",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Select all that apply',
        options: [
          { id: 'health', label: 'Health Insurance' },
          { id: 'life', label: 'Life Insurance' },
          { id: 'disability', label: 'Disability Insurance' },
          { id: 'home', label: 'Home/Renters Insurance' },
          { id: 'auto', label: 'Auto Insurance' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Store in user_preferences.financial_goals.insurance
    },
    next: () => 'emergency_fund'
  },

  emergency_fund: {
    id: 'emergency_fund',
    message: "An emergency fund is crucial for financial security.",
    component: {
      type: 'slider',
      data: {
        question: 'How many months of expenses for emergency fund?',
        min: 1,
        max: 12,
        step: 1,
        default: 3
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Calculate and store emergencyFundMonths and targetEmergencyFund
    },
    next: () => 'risk_tolerance'
  },

  risk_tolerance: {
    id: 'risk_tolerance',
    message: "Let's understand your risk comfort level.",
    component: {
      type: 'slider',
      data: {
        question: 'Rate your risk tolerance',
        min: 1,
        max: 10,
        step: 1,
        default: 5,
        labels: { 1: 'Conservative', 5: 'Moderate', 10: 'Aggressive' }
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update user_preferences.risk_tolerance and investment_horizon
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
          { id: 'job_stability', label: 'Job Stability', type: 'select', options: [
            { value: 'very_stable', label: 'Very Stable' },
            { value: 'stable', label: 'Stable' },
            { value: 'uncertain', label: 'Uncertain' }
          ]},
          { id: 'income_sources', label: 'Number of Income Sources', type: 'number' },
          { id: 'liquid_assets', label: 'Liquid Assets Available', type: 'number' }
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Store in user_preferences.financial_goals.riskCapacity
    },
    next: () => 'preferences_values'
  },

  preferences_values: {
    id: 'preferences_values',
    message: "Any investment preferences or values?",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Select any that apply',
        options: [
          { id: 'esg', label: 'ESG/Sustainable Investing' },
          { id: 'crypto', label: 'Include Cryptocurrency' },
          { id: 'real_estate', label: 'Real Estate Focus' },
          { id: 'domestic', label: 'Domestic Only' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Store in user_preferences.investing_values
    },
    next: () => 'goals_selection'
  },

  goals_selection: {
    id: 'goals_selection',
    message: "What financial goals would you like to work toward?",
    component: {
      type: 'checkboxes',
      data: {
        question: 'Select your goals',
        options: [
          { id: 'emergency', label: 'Emergency Fund' },
          { id: 'debt', label: 'Pay Off Debt' },
          { id: 'home', label: 'Save for Home' },
          { id: 'retirement', label: 'Retirement' },
          { id: 'invest', label: 'Grow Investments' },
          { id: 'college', label: 'College Savings' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Create goals records
    },
    next: () => 'goal_parameters'
  },

  goal_parameters: {
    id: 'goal_parameters',
    message: "Let's set targets for your goals.",
    component: {
      type: 'form',
      data: {
        fields: [], // Dynamically populated based on selected goals
        submitLabel: 'Set Targets',
        allowSkip: false
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update goals with targets
    },
    next: () => 'budget_review'
  },

  budget_review: {
    id: 'budget_review',
    message: "Here's your optimized budget.",
    component: {
      type: 'pieChart',
      data: {
        question: 'Review and adjust your budget',
        editable: true,
        categories: [] // Populated from budget
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Finalize budget_categories
    },
    next: () => 'savings_auto_rules'
  },

  savings_auto_rules: {
    id: 'savings_auto_rules',
    message: "Would you like to automate your savings?",
    component: {
      type: 'form',
      data: {
        fields: [
          { id: 'auto_enabled', label: 'Enable Auto-Allocation', type: 'checkbox' },
          { id: 'frequency', label: 'Frequency', type: 'select', options: [
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
        ],
        submitLabel: 'Continue',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update users.auto_allocation_enabled and frequency
    },
    next: () => 'plan_tradeoffs'
  },

  plan_tradeoffs: {
    id: 'plan_tradeoffs',
    message: "Let's explore trade-offs in your financial plan.",
    component: {
      type: 'tradeoffs',
      data: {
        levers: [
          { id: 'savings_rate', label: 'Savings Rate', min: 0, max: 50, value: 20, unit: '%' },
          { id: 'retirement_age', label: 'Retirement Age', min: 50, max: 75, value: 65 },
          { id: 'risk_level', label: 'Risk Level', min: 1, max: 10, value: 5 }
        ],
        submitLabel: 'Accept Plan',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update goals/budget based on tradeoffs
    },
    next: () => 'dashboard_preview'
  },

  dashboard_preview: {
    id: 'dashboard_preview',
    message: "Here's your personalized financial dashboard!",
    component: {
      type: 'dashboardPreview',
      data: {
        widgets: ['netWorth', 'cashflow', 'budget', 'goals']
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: No DB writes needed
    },
    next: () => 'first_actions'
  },

  first_actions: {
    id: 'first_actions',
    message: "Here are your first recommended actions.",
    component: {
      type: 'cards',
      data: {
        question: 'Choose an action to start with',
        cards: [
          { id: 'fund_emergency', title: 'Fund Emergency Account', description: 'Transfer $500 to start' },
          { id: 'automate_bills', title: 'Automate Bills', description: 'Set up auto-pay' },
          { id: 'review_subscriptions', title: 'Review Subscriptions', description: 'Cancel unused services' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Log selected action
    },
    next: () => 'monitoring_preferences'
  },

  monitoring_preferences: {
    id: 'monitoring_preferences',
    message: "How would you like me to keep you on track?",
    component: {
      type: 'form',
      data: {
        fields: [
          { id: 'notifications', label: 'Enable Notifications', type: 'checkbox' },
          { id: 'frequency', label: 'Check-in Frequency', type: 'select', options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
        ],
        submitLabel: 'Set Preferences',
        allowSkip: true
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Update user_preferences.notifications_enabled and engagement_frequency
    },
    next: () => 'celebrate_complete'
  },

  celebrate_complete: {
    id: 'celebrate_complete',
    message: "🎉 Congratulations! Your financial wellness journey begins now!",
    component: {
      type: 'buttons',
      data: {
        question: 'You\'re all set!',
        options: [
          { id: 'dashboard', label: 'Go to Dashboard', value: 'dashboard', icon: '📊' }
        ]
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: No DB writes
    },
    next: () => 'complete'
  },

  complete: {
    id: 'complete',
    message: "Welcome to your financial command center!",
    component: {
      type: 'dashboardPreview',
      data: {
        widgets: ['netWorth', 'cashflow', 'budget', 'goals', 'accounts']
      }
    },
    onAnswer: async (value: any, ctx: any) => {
      // TODO: Set onboarding_progress.is_complete = true
    },
    next: () => 'complete'
  }
};