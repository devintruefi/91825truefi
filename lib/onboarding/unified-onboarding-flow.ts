// Unified, production-ready onboarding flow
// This is the single source of truth for onboarding steps and logic

export const UNIFIED_ONBOARDING_STEPS = {
  // Step 1: Always start with account connection (skippable)
  CONNECT_ACCOUNTS: 'connect_accounts',
  // Step 2: Confirm income (auto-filled from Plaid)
  CONFIRM_INCOME: 'confirm_income',
  // Step 3: Main goal selection (1-2 goals)
  MAIN_GOAL: 'main_goal',
  // Step 4: Risk tolerance (1-10 slider)
  RISK_TOLERANCE: 'risk_tolerance',
  // Step 5: Optional quick dependents
  DEPENDENTS: 'dependents',
  // Step 6: Budget seed and review
  BUDGET_REVIEW: 'budget_review',
  // Step 7: Finish and redirect
  COMPLETE: 'complete'
} as const;

export type UnifiedOnboardingStep = typeof UNIFIED_ONBOARDING_STEPS[keyof typeof UNIFIED_ONBOARDING_STEPS];

export interface OnboardingState {
  userId: string;
  currentStep: UnifiedOnboardingStep;
  completedSteps: UnifiedOnboardingStep[];
  responses: OnboardingResponses;
  plaidConnection?: PlaidConnectionData;
  isComplete: boolean;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingResponses {
  // Step 1: Account Connection
  hasConnectedAccounts?: boolean;
  plaidPublicToken?: string;
  plaidAccountIds?: string[];
  skipPlaidReason?: string;
  
  // Step 2: Income Confirmation (auto-filled from Plaid)
  monthlyIncome?: number;
  incomeConfirmed?: boolean;
  incomeSource?: 'plaid' | 'manual';
  
  // Step 3: Goals (1-2 primary goals)
  mainGoal?: 'build_wealth' | 'reduce_debt' | 'save_home' | 'retirement' | 'emergency_fund' | 'other';
  secondaryGoal?: 'build_wealth' | 'reduce_debt' | 'save_home' | 'retirement' | 'emergency_fund' | 'other';
  customGoal?: string;
  
  // Step 4: Risk Tolerance (1-10 scale)
  riskTolerance?: number; // 1-10
  
  // Step 5: Dependents (quick select)
  dependents?: 0 | 1 | 2 | 3; // 3 means 3+
  
  // Step 6: Budget Review (seeded from Plaid or defaults)
  budgetCategories?: Record<string, number>;
  budgetConfirmed?: boolean;
  monthlyExpenses?: number;
  
  // Metadata
  confirmedData?: boolean;
  consentToAnalysis?: boolean;
}

export interface PlaidConnectionData {
  itemId: string;
  accessToken?: string;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    subtype: string;
    balance: number;
  }>;
  institution: {
    id: string;
    name: string;
  };
  connectedAt: Date;
}

// Step configuration with validation rules
export const STEP_CONFIG: Record<UnifiedOnboardingStep, StepConfiguration> = {
  [UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS]: {
    title: 'Connect Your Accounts',
    description: 'Securely link your financial accounts for real-time insights',
    required: false,
    canSkip: true,
    skipWarning: 'Connect accounts later for real-time insights',
    validation: (responses: OnboardingResponses) => {
      return responses.hasConnectedAccounts || !!responses.skipPlaidReason;
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.CONFIRM_INCOME
  },
  
  [UNIFIED_ONBOARDING_STEPS.CONFIRM_INCOME]: {
    title: 'Confirm Your Income',
    description: 'We detected your income from your accounts',
    required: true,
    canSkip: false,
    validation: (responses: OnboardingResponses) => {
      return responses.monthlyIncome !== undefined && 
             responses.monthlyIncome > 0 &&
             responses.incomeConfirmed === true;
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.MAIN_GOAL
  },
  
  [UNIFIED_ONBOARDING_STEPS.MAIN_GOAL]: {
    title: 'Select Your Financial Goals',
    description: 'Choose 1-2 primary goals',
    required: true,
    canSkip: false,
    validation: (responses: OnboardingResponses) => {
      return !!responses.mainGoal && (responses.mainGoal !== 'other' || !!responses.customGoal);
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.RISK_TOLERANCE
  },
  
  [UNIFIED_ONBOARDING_STEPS.RISK_TOLERANCE]: {
    title: 'Risk Comfort Level',
    description: 'How comfortable are you with investment risk?',
    required: true,
    canSkip: false,
    validation: (responses: OnboardingResponses) => {
      return responses.riskTolerance !== undefined && 
             responses.riskTolerance >= 1 && 
             responses.riskTolerance <= 10;
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.DEPENDENTS
  },
  
  [UNIFIED_ONBOARDING_STEPS.DEPENDENTS]: {
    title: 'Family Size',
    description: 'Quick question about dependents',
    required: false,
    canSkip: true,
    skipWarning: 'You can update this later',
    validation: (responses: OnboardingResponses) => {
      return responses.dependents !== undefined;
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.BUDGET_REVIEW
  },
  
  [UNIFIED_ONBOARDING_STEPS.BUDGET_REVIEW]: {
    title: 'Review Your Budget',
    description: 'We\'ve created a smart budget based on your spending',
    required: true,
    canSkip: false,
    validation: (responses: OnboardingResponses) => {
      return responses.budgetConfirmed === true && 
             responses.budgetCategories !== undefined;
    },
    nextStep: UNIFIED_ONBOARDING_STEPS.COMPLETE
  },
  
  [UNIFIED_ONBOARDING_STEPS.COMPLETE]: {
    title: 'You\'re All Set!',
    description: 'Your personalized dashboard is ready',
    required: false,
    canSkip: false,
    validation: () => true,
    nextStep: null
  }
};

interface StepConfiguration {
  title: string;
  description: string;
  required: boolean;
  canSkip: boolean;
  skipWarning?: string;
  validation: (responses: OnboardingResponses) => boolean;
  nextStep: UnifiedOnboardingStep | null;
}

// Get next step based on current state
export function getNextStep(
  currentStep: UnifiedOnboardingStep,
  responses: OnboardingResponses,
  completedSteps: UnifiedOnboardingStep[]
): UnifiedOnboardingStep | null {
  // If current step is complete, return null
  if (currentStep === UNIFIED_ONBOARDING_STEPS.COMPLETE) {
    return null;
  }
  
  const config = STEP_CONFIG[currentStep];
  
  // Validate current step before proceeding
  if (!config.validation(responses) && !config.canSkip) {
    return currentStep; // Stay on current step if not valid
  }
  
  // Special logic for account connection
  if (currentStep === UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS) {
    // If accounts are connected, we may have income data
    if (responses.hasConnectedAccounts && responses.monthlyIncome !== undefined) {
      // Skip directly to life stage since we have income
      return UNIFIED_ONBOARDING_STEPS.MAIN_GOAL;
    }
  }
  
  // Return configured next step
  return config.nextStep;
}

// Get previous step for back navigation
export function getPreviousStep(
  currentStep: UnifiedOnboardingStep,
  completedSteps: UnifiedOnboardingStep[]
): UnifiedOnboardingStep | null {
  const steps = Object.values(UNIFIED_ONBOARDING_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  // Find the last completed step before current
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (completedSteps.includes(steps[i]) || i === 0) {
      return steps[i];
    }
  }
  
  return steps[currentIndex - 1];
}

// Check if a step can be skipped
export function canSkipStep(
  step: UnifiedOnboardingStep,
  responses: OnboardingResponses
): boolean {
  const config = STEP_CONFIG[step];
  
  // Cannot skip required steps unless they're already complete
  if (config.required && !config.canSkip) {
    return false;
  }
  
  // Account connection can be skipped with reason
  if (step === UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS) {
    return true; // But functionality will be limited
  }
  
  return config.canSkip;
}

// Validate entire onboarding completion
export function validateOnboardingCompletion(state: OnboardingState): {
  isValid: boolean;
  missingSteps: UnifiedOnboardingStep[];
  warnings: string[];
} {
  const missingSteps: UnifiedOnboardingStep[] = [];
  const warnings: string[] = [];
  
  // Check each required step
  for (const [step, config] of Object.entries(STEP_CONFIG)) {
    if (step === UNIFIED_ONBOARDING_STEPS.COMPLETE) continue;
    
    const stepKey = step as UnifiedOnboardingStep;
    
    if (config.required && !state.completedSteps.includes(stepKey)) {
      if (!config.canSkip) {
        missingSteps.push(stepKey);
      } else if (!config.validation(state.responses)) {
        warnings.push(`${config.title} was skipped - ${config.skipWarning || 'Some features may be limited'}`);
      }
    }
  }
  
  // Special validation for account connection
  if (!state.responses.hasConnectedAccounts && !state.responses.skipPlaidReason) {
    warnings.push('No accounts connected - insights will be limited to manual data');
  }
  
  return {
    isValid: missingSteps.length === 0,
    missingSteps,
    warnings
  };
}

// Calculate progress percentage
export function calculateProgress(completedSteps: UnifiedOnboardingStep[]): number {
  const totalSteps = Object.keys(STEP_CONFIG).length - 1; // Exclude COMPLETE
  const completed = completedSteps.filter(step => step !== UNIFIED_ONBOARDING_STEPS.COMPLETE).length;
  return Math.round((completed / totalSteps) * 100);
}

// Get user-friendly messages for each step
export function getStepMessage(
  step: UnifiedOnboardingStep,
  responses: OnboardingResponses
): string {
  switch (step) {
    case UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS:
      if (responses.hasConnectedAccounts) {
        return 'Great! Your accounts are securely connected.';
      }
      return 'Let\'s connect your accounts to get a complete picture of your finances.';
    
    case UNIFIED_ONBOARDING_STEPS.MAIN_GOAL:
      return 'Understanding your main goal helps us prioritize what matters most to you.';
    
    case UNIFIED_ONBOARDING_STEPS.LIFE_STAGE:
      return 'Your life stage influences your financial priorities and opportunities.';
    
    case UNIFIED_ONBOARDING_STEPS.FAMILY_CONTEXT:
      return 'Family situation affects budgeting, savings goals, and financial planning.';
    
    case UNIFIED_ONBOARDING_STEPS.INCOME_VERIFICATION:
      if (responses.hasConnectedAccounts) {
        return 'We\'ve analyzed your connected accounts. Please verify this looks right.';
      }
      return 'Help us understand your financial capacity for budgeting and goals.';
    
    case UNIFIED_ONBOARDING_STEPS.REVIEW_CONFIRM:
      return 'Almost done! Review your information and we\'ll create your personalized dashboard.';
    
    case UNIFIED_ONBOARDING_STEPS.COMPLETE:
      return 'Welcome to TrueFi! Your personalized financial dashboard is ready.';
    
    default:
      return 'Let\'s continue setting up your account.';
  }
}

// Generate onboarding summary for dashboard creation
export function generateOnboardingSummary(state: OnboardingState): OnboardingSummary {
  const { responses } = state;
  
  return {
    userId: state.userId,
    hasConnectedAccounts: responses.hasConnectedAccounts || false,
    plaidItemId: state.plaidConnection?.itemId,
    mainGoal: responses.mainGoal || 'build_wealth',
    lifeStage: responses.lifeStage || 'early_career',
    maritalStatus: responses.maritalStatus || 'single',
    dependents: responses.dependents || 0,
    monthlyIncome: responses.monthlyIncome || 0,
    monthlyExpenses: responses.monthlyExpenses || 0,
    completedAt: new Date(),
    onboardingVersion: '2.0' // Version for migration tracking
  };
}

export interface OnboardingSummary {
  userId: string;
  hasConnectedAccounts: boolean;
  plaidItemId?: string;
  mainGoal: string;
  lifeStage: string;
  maritalStatus: string;
  dependents: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  completedAt: Date;
  onboardingVersion: string;
}