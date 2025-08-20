// Validation logic for onboarding steps
import { OnboardingStep, ONBOARDING_STEPS } from './onboarding-manager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone.length >= 10 && phoneRegex.test(phone);
}

// Validate main goal selection
export function validateMainGoal(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || !data.goal) {
    errors.push('Please select your main financial goal');
  }
  
  const validGoals = ['financial-plan', 'fix-budget', 'understand-investments', 'big-event', 'other'];
  if (data.goal && !validGoals.includes(data.goal)) {
    errors.push('Invalid goal selected');
  }
  
  if (data.goal === 'other' && !data.customGoal) {
    errors.push('Please describe your custom goal');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate life stage selection
export function validateLifeStage(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || !data.stage) {
    errors.push('Please select your current life stage');
  }
  
  const validStages = ['student', 'working', 'married', 'parent', 'retired', 'other'];
  if (data.stage && !validStages.includes(data.stage)) {
    errors.push('Invalid life stage selected');
  }
  
  // Add contextual warnings
  if (data.stage === 'student' && data.hasIncome) {
    warnings.push('As a student with income, consider setting up automatic savings');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate dependents input
export function validateDependents(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (data === undefined || data === null || data.dependents === undefined) {
    errors.push('Please specify the number of dependents');
  }
  
  const dependentCount = parseInt(data.dependents);
  if (isNaN(dependentCount) || dependentCount < 0) {
    errors.push('Invalid number of dependents');
  }
  
  if (dependentCount > 20) {
    errors.push('Please enter a valid number of dependents');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate bank connection
export function validateBankConnection(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Bank connection is optional, so we validate only if data is provided
  if (data && data.connected) {
    if (!data.publicToken && !data.accounts) {
      warnings.push('Bank connection initiated but no account data received');
    }
    
    if (data.accounts && !Array.isArray(data.accounts)) {
      errors.push('Invalid account data format');
    }
    
    if (data.accounts && data.accounts.length === 0) {
      warnings.push('No accounts found in connected institution');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate income confirmation
export function validateIncomeConfirmation(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || data.monthlyIncome === undefined) {
    errors.push('Please confirm your monthly income');
  }
  
  const income = parseFloat(data.monthlyIncome);
  if (isNaN(income) || income < 0) {
    errors.push('Invalid income amount');
  }
  
  if (income === 0) {
    warnings.push('Zero income detected - make sure to update this when you have income');
  }
  
  if (income > 1000000) {
    warnings.push('High income detected - consider advanced tax planning strategies');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate risk tolerance
export function validateRiskTolerance(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || data.riskTolerance === undefined) {
    errors.push('Please select your risk tolerance level');
  }
  
  const riskLevel = parseInt(data.riskTolerance);
  if (isNaN(riskLevel) || riskLevel < 1 || riskLevel > 10) {
    errors.push('Risk tolerance must be between 1 and 10');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate goals selection
export function validateGoalsSelection(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || !data.goals || !Array.isArray(data.goals)) {
    errors.push('Please select at least one financial goal');
  } else if (data.goals.length === 0) {
    errors.push('Please select at least one financial goal');
  } else if (data.goals.length > 10) {
    warnings.push('Consider focusing on fewer goals for better results');
  }
  
  // Validate each goal has required fields
  if (data.goals && Array.isArray(data.goals)) {
    data.goals.forEach((goal: any, index: number) => {
      if (!goal.name && !goal.label) {
        errors.push(`Goal ${index + 1} is missing a name`);
      }
      if (goal.target_amount !== undefined && goal.target_amount < 0) {
        errors.push(`Goal ${index + 1} has an invalid target amount`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate budget review
export function validateBudgetReview(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || !data.budget) {
    errors.push('Budget data is missing');
  }
  
  if (data.budget) {
    // Check if budget has categories
    if (!data.budget.categories || !Array.isArray(data.budget.categories)) {
      errors.push('Budget categories are missing');
    } else if (data.budget.categories.length === 0) {
      errors.push('Budget must have at least one category');
    }
    
    // Validate category amounts
    let totalBudget = 0;
    data.budget.categories.forEach((category: any, index: number) => {
      if (!category.name) {
        errors.push(`Budget category ${index + 1} is missing a name`);
      }
      if (category.amount === undefined || category.amount < 0) {
        errors.push(`Budget category ${category.name || index + 1} has an invalid amount`);
      }
      totalBudget += category.amount || 0;
    });
    
    // Check if budget exceeds income (if income is available)
    if (data.monthlyIncome && totalBudget > data.monthlyIncome) {
      warnings.push('Your budget exceeds your monthly income');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Main validation function for any step
export function validateOnboardingStep(step: OnboardingStep | string, data: any): ValidationResult {
  switch (step) {
    case ONBOARDING_STEPS.MAIN_GOAL:
      return validateMainGoal(data);
    
    case ONBOARDING_STEPS.LIFE_STAGE:
      return validateLifeStage(data);
    
    case ONBOARDING_STEPS.DEPENDENTS:
      return validateDependents(data);
    
    case ONBOARDING_STEPS.BANK_CONNECTION:
      return validateBankConnection(data);
    
    case ONBOARDING_STEPS.INCOME_CONFIRMATION:
      return validateIncomeConfirmation(data);
    
    case ONBOARDING_STEPS.RISK_TOLERANCE:
      return validateRiskTolerance(data);
    
    case ONBOARDING_STEPS.GOALS_SELECTION:
      return validateGoalsSelection(data);
    
    case ONBOARDING_STEPS.BUDGET_REVIEW:
      return validateBudgetReview(data);
    
    case ONBOARDING_STEPS.DASHBOARD_PREVIEW:
    case ONBOARDING_STEPS.COMPLETE:
      // These steps don't require validation
      return { isValid: true, errors: [] };
    
    default:
      return {
        isValid: false,
        errors: [`Unknown step: ${step}`]
      };
  }
}

// Validate entire onboarding flow completion
export function validateOnboardingCompletion(responses: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check all required steps have data
  const requiredSteps = [
    ONBOARDING_STEPS.MAIN_GOAL,
    ONBOARDING_STEPS.LIFE_STAGE,
    ONBOARDING_STEPS.DEPENDENTS,
    ONBOARDING_STEPS.RISK_TOLERANCE,
    ONBOARDING_STEPS.GOALS_SELECTION
  ];
  
  for (const step of requiredSteps) {
    if (!responses[step]) {
      errors.push(`Missing data for step: ${step}`);
    } else {
      // Validate each step's data
      const stepValidation = validateOnboardingStep(step, responses[step]);
      errors.push(...stepValidation.errors);
      if (stepValidation.warnings) {
        warnings.push(...stepValidation.warnings);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}