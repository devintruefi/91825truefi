import { ONBOARDING_STEPS, OnboardingStep } from './steps';

// Create set of canonical IDs for validation
const CANONICAL_IDS = new Set(Object.values(ONBOARDING_STEPS));

/**
 * Normalize step IDs to handle case mismatches and aliases
 */
export function normalizeStepId(id?: string): string | undefined {
  if (!id) return id;
  
  // Convert to lowercase
  const lc = id.toLowerCase();
  
  // Check if it's already a canonical ID
  if (CANONICAL_IDS.has(lc as OnboardingStep)) {
    return lc;
  }
  
  // Map common aliases and case variations
  const aliasMap: Record<string, string> = {
    // Case variations with dashes
    'main-goal': 'main_goal',
    'life-stage': 'life_stage',
    'bank-connection': 'plaid_connection',
    'plaid-connection': 'plaid_connection',
    'income-capture': 'income_capture',
    'income-confirmation': 'income_confirmation',
    'manual-income': 'manual_income',
    'pay-structure': 'pay_structure',
    'benefits-equity': 'benefits_equity',
    'expenses-capture': 'expenses_capture',
    'detected-expenses': 'detected_expenses',
    'manual-expenses': 'manual_expenses',
    'quick-accounts': 'quick_accounts',
    'debts-detail': 'debts_detail',
    'emergency-fund': 'emergency_fund',
    'risk-tolerance': 'risk_tolerance',
    'risk-capacity': 'risk_capacity',
    'preferences-values': 'preferences_values',
    'goals-selection': 'goals_selection',
    'goal-parameters': 'goal_parameters',
    'budget-review': 'budget_review',
    'savings-auto-rules': 'savings_auto_rules',
    'plan-tradeoffs': 'plan_tradeoffs',
    'dashboard-preview': 'dashboard_preview',
    'first-actions': 'first_actions',
    'monitoring-preferences': 'monitoring_preferences',
    'celebrate-complete': 'celebrate_complete',
    
    // Case variations without separators
    'maingoal': 'main_goal',
    'lifestage': 'life_stage',
    'bankconnection': 'plaid_connection',
    'plaidconnection': 'plaid_connection',
    'incomecapture': 'income_capture',
    'incomeconfirmation': 'income_confirmation',
    'manualincome': 'manual_income',
    'paystructure': 'pay_structure',
    'benefitsequity': 'benefits_equity',
    'expensescapture': 'expenses_capture',
    'detectedexpenses': 'detected_expenses',
    'manualexpenses': 'manual_expenses',
    'quickaccounts': 'quick_accounts',
    'debtsdetail': 'debts_detail',
    'emergencyfund': 'emergency_fund',
    'risktolerance': 'risk_tolerance',
    'riskcapacity': 'risk_capacity',
    'preferencesvalues': 'preferences_values',
    'goalsselection': 'goals_selection',
    'goalparameters': 'goal_parameters',
    'budgetreview': 'budget_review',
    'savingsautorules': 'savings_auto_rules',
    'plantradeoffs': 'plan_tradeoffs',
    'dashboardpreview': 'dashboard_preview',
    'firstactions': 'first_actions',
    'monitoringpreferences': 'monitoring_preferences',
    'celebratecomplete': 'celebrate_complete'
  };
  
  return aliasMap[lc] ?? lc;
}

/**
 * Validate that a step ID is canonical
 */
export function isValidStepId(id: string): boolean {
  return CANONICAL_IDS.has(id as OnboardingStep);
}