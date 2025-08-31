/**
 * Canonical Step Engine - Single Source of Truth for Onboarding Flow
 * Do not deviate from this order or IDs
 */

export type StepId = 
  | 'consent'
  | 'welcome'
  | 'main_goal'
  | 'life_stage'
  | 'dependents'
  | 'jurisdiction'
  | 'plaid_connection'
  | 'household'
  | 'income_capture'
  | 'manual_income'
  | 'income_confirmation'
  | 'pay_structure'
  | 'benefits_equity'
  | 'expenses_capture'
  | 'debts_detail'
  | 'housing'
  | 'insurance'
  | 'emergency_fund'
  | 'risk_tolerance'
  | 'risk_capacity'
  | 'goals_selection'
  | 'goal_parameters'
  | 'budget_review'
  | 'savings_auto_rules'
  | 'plan_tradeoffs'
  | 'dashboard_preview'
  | 'celebrate_complete'
  | 'complete';

export type ComponentType = 
  | 'buttons' 
  | 'form' 
  | 'checkboxes' 
  | 'cards' 
  | 'plaid' 
  | 'pieChart' 
  | 'slider';

export interface StepConfig {
  label: string;
  component: ComponentType;
  skipAllowed?: boolean;
}

/**
 * Exact order of steps - DO NOT CHANGE
 */
export const ORDERED_STEPS: StepId[] = [
  'consent',
  'welcome',
  'main_goal',
  'life_stage',
  'dependents',
  'jurisdiction',
  'plaid_connection',
  'household',
  'income_capture',
  'manual_income',
  'income_confirmation',
  'pay_structure',
  'benefits_equity',
  'expenses_capture',
  'debts_detail',
  'housing',
  'insurance',
  'emergency_fund',
  'risk_tolerance',
  'risk_capacity',
  'goals_selection',
  'goal_parameters',
  'budget_review',
  'savings_auto_rules',
  'plan_tradeoffs',
  'dashboard_preview',
  'celebrate_complete',
  'complete'
];

/**
 * Step configuration - labels and component types
 */
export const STEP_CONFIG: Record<StepId, StepConfig> = {
  consent: { label: 'Privacy & Consent', component: 'buttons' },
  welcome: { label: 'Welcome', component: 'buttons' },
  main_goal: { label: 'Main Financial Goal', component: 'buttons' },
  life_stage: { label: 'Life Stage', component: 'buttons' },
  dependents: { label: 'Dependents', component: 'buttons' },
  jurisdiction: { label: 'Location', component: 'form' },
  plaid_connection: { label: 'Connect Accounts', component: 'plaid' },
  household: { label: 'Household Finances', component: 'form' },
  income_capture: { label: 'Income Detection', component: 'buttons' },
  manual_income: { label: 'Enter Income', component: 'form' },
  income_confirmation: { label: 'Confirm Income', component: 'buttons' },
  pay_structure: { label: 'Pay Structure', component: 'form' },
  benefits_equity: { label: 'Benefits & Equity', component: 'checkboxes' },
  expenses_capture: { label: 'Monthly Expenses', component: 'pieChart' },
  debts_detail: { label: 'Debts & Liabilities', component: 'form' },
  housing: { label: 'Housing Situation', component: 'buttons' },
  insurance: { label: 'Insurance Coverage', component: 'checkboxes' },
  emergency_fund: { label: 'Emergency Fund', component: 'slider' },
  risk_tolerance: { label: 'Risk Tolerance', component: 'slider' },
  risk_capacity: { label: 'Risk Capacity', component: 'form' },
  goals_selection: { label: 'Select Goals', component: 'cards' },
  goal_parameters: { label: 'Goal Details', component: 'form' },
  budget_review: { label: 'Budget Review', component: 'pieChart' },
  savings_auto_rules: { label: 'Automation Rules', component: 'checkboxes' },
  plan_tradeoffs: { label: 'Plan Tradeoffs', component: 'cards', skipAllowed: true },
  dashboard_preview: { label: 'Dashboard Preview', component: 'cards' },
  celebrate_complete: { label: 'Celebrate!', component: 'buttons' },
  complete: { label: 'Complete', component: 'buttons' }
};

/**
 * Calculate progress based on current step
 */
export function calculateProgress(currentStep: StepId): {
  currentIndex: number;
  total: number;
  percentage: number;
  nextStep: StepId | null;
  nextLabel: string | null;
} {
  // For users who skip consent (most new users), we treat 'welcome' as step 1
  // The total becomes 27 steps instead of 28
  const rawIndex = ORDERED_STEPS.indexOf(currentStep);
  
  // Adjust index to account for skipped consent step
  // If at 'welcome' (index 1), show as step 1
  // If at 'main_goal' (index 2), show as step 2, etc.
  let currentIndex;
  let total;
  
  if (currentStep === 'consent') {
    // Rare case: user actually sees consent step
    currentIndex = 1;
    total = 28;
  } else {
    // Common case: user skips consent, starts at welcome
    // Subtract 1 from raw index to account for skipped consent
    currentIndex = rawIndex; // This makes welcome (index 1) show as step 1
    total = 27; // Total steps minus consent
  }
  
  // Calculate percentage
  const percentage = Math.round((currentIndex / total) * 100);
  
  // Get next step (guard against end)
  const nextStepIndex = ORDERED_STEPS.indexOf(currentStep) + 1;
  const nextStep = nextStepIndex < ORDERED_STEPS.length ? ORDERED_STEPS[nextStepIndex] : null;
  const nextLabel = nextStep ? STEP_CONFIG[nextStep].label : null;

  return {
    currentIndex,
    total,
    percentage,
    nextStep,
    nextLabel
  };
}

/**
 * Get next step based on current step and branching rules
 */
export function getNextStep(currentStep: StepId, context?: {
  hasPlaidConnection?: boolean;
  incomeChoice?: 'use_detected' | 'manual' | 'variable' | 'retry';
  incomeConfirmed?: boolean;
}): StepId | null {
  // Handle branching rules
  switch (currentStep) {
    case 'plaid_connection':
      return 'household';
      
    case 'income_capture':
      if (context?.incomeChoice === 'use_detected') {
        return 'income_confirmation';
      } else if (context?.incomeChoice === 'manual' || context?.incomeChoice === 'variable') {
        return 'manual_income';
      } else if (context?.incomeChoice === 'retry') {
        return 'income_capture'; // Stay on same step
      }
      break;
      
    case 'income_confirmation':
      if (context?.incomeConfirmed) {
        return 'pay_structure';
      } else {
        return 'manual_income';
      }
      
    case 'manual_income':
      return 'pay_structure';
  }
  
  // Default linear progression
  const currentIndex = ORDERED_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= ORDERED_STEPS.length - 1) {
    return null;
  }
  
  // Skip manual_income and income_confirmation if not in those branches
  let nextIndex = currentIndex + 1;
  const nextStep = ORDERED_STEPS[nextIndex];
  
  if (nextStep === 'manual_income' && currentStep !== 'income_capture' && currentStep !== 'income_confirmation') {
    nextIndex++; // Skip manual_income
  }
  if (nextStep === 'income_confirmation' && currentStep !== 'income_capture') {
    nextIndex++; // Skip income_confirmation
  }
  
  return nextIndex < ORDERED_STEPS.length ? ORDERED_STEPS[nextIndex] : null;
}

/**
 * Validate if a step transition is allowed
 */
export function isValidTransition(fromStep: StepId, toStep: StepId, context?: any): boolean {
  const expectedNext = getNextStep(fromStep, context);
  return expectedNext === toStep;
}

/**
 * Generate unique IDs for step instances
 */
export function generateStepInstanceId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateNonce(): string {
  return `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}