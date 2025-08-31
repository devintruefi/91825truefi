// Ordered list of onboarding steps for progress calculation
export const ORDERED_ONBOARDING_STEPS = [
  'consent',
  'welcome',
  'main_goal',
  'life_stage',
  'dependents',
  'jurisdiction',
  'plaid_connection',
  'household',
  'income_confirmation',
  'income_capture',
  'manual_income',
  'pay_structure',
  'benefits_equity',
  'expenses_capture',
  'detected_expenses',
  'manual_expenses',
  'debts_detail',
  'housing',
  'insurance',
  'emergency_fund',
  'risk_tolerance',
  'risk_capacity',
  'preferences_values',
  'goals_selection',
  'goal_parameters',
  'budget_review',
  'savings_auto_rules',
  'plan_tradeoffs',
  'dashboard_preview',
  'first_actions',
  'monitoring_preferences',
  'celebrate_complete',
  'complete'
] as const;

/**
 * Calculate progress with step number and percentage
 */
export function calculateOnboardingProgress(currentStep: string) {
  const stepIndex = ORDERED_ONBOARDING_STEPS.indexOf(currentStep as any);
  
  if (stepIndex === -1) {
    console.warn(`Unknown step: ${currentStep}, defaulting to step 1`);
    return {
      stepNumber: 1,
      totalSteps: ORDERED_ONBOARDING_STEPS.length - 1, // Exclude 'complete'
      percent: 0
    };
  }
  
  // Don't count 'complete' as a step
  const totalSteps = ORDERED_ONBOARDING_STEPS.length - 1;
  const stepNumber = stepIndex + 1;
  
  // Calculate percentage (0-100)
  const percent = Math.round((stepIndex / Math.max(totalSteps - 1, 1)) * 100);
  
  return {
    stepNumber,
    totalSteps,
    percent: Math.min(100, Math.max(0, percent))
  };
}

/**
 * Get display text for progress
 */
export function getProgressDisplay(currentStep: string) {
  const progress = calculateOnboardingProgress(currentStep);
  
  if (currentStep === 'complete') {
    return {
      text: 'Setup Complete!',
      subtitle: 'Welcome to your financial dashboard',
      stepText: 'Complete',
      percent: 100
    };
  }
  
  return {
    text: `Step ${progress.stepNumber} of ${progress.totalSteps}`,
    subtitle: 'Setting up your personalized financial profile',
    stepText: `Step ${progress.stepNumber}`,
    percent: progress.percent
  };
}