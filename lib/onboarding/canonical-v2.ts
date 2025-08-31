/**
 * Canonical Step Engine V2 - Bulletproof Single Source of Truth
 * ===============================================================
 * This is the AUTHORITATIVE onboarding flow definition.
 * All clients and servers MUST use this module.
 */

// FIRST_PAYLOAD_SAMPLE - Example of what client receives on initial GET /api/onboarding/v2
// {
//   "currentStep": "main_goal",  // After auto-advance from welcome
//   "stepInstance": {
//     "stepId": "main_goal",
//     "instanceId": "si_1234567890_abc123def",
//     "nonce": "n_1234567890_xyz789ghi",
//     "createdAt": 1704124800000
//   },
//   "stepConfig": {
//     "label": "Main Financial Goal",
//     "component": "buttons"
//   },
//   "progress": {
//     "orderedSteps": ["privacy_consent", "welcome", "main_goal", ...],
//     "completed": ["privacy_consent", "welcome"],
//     "current": "main_goal",
//     "remainingCount": 16,
//     "itemsCollected": 2,
//     "percentComplete": 10,
//     "nextStep": "life_stage",
//     "nextLabel": "Life Stage"
//   },
//   "completedSteps": ["privacy_consent", "welcome"],
//   "sessionId": "sess_abc123"
// }

export type OnboardingStepV2 =
  | 'privacy_consent'
  | 'welcome'
  | 'main_goal'
  | 'life_stage'
  | 'family_size'
  | 'location'              // country + state/province (dropdown + typeahead)
  | 'household_snapshot'    // partner income, shared expenses, combined net worth
  | 'connect_accounts'      // Plaid Link
  | 'verify_income'         // suggestions + manual
  | 'income_structure'      // pay frequency, variable %
  | 'benefits_equity'       // 401k match, RSU, options
  | 'budget_review'         // show calculated allocations
  | 'assets_liabilities_quick_add'
  | 'debts_breakdown'
  | 'housing'
  | 'insurance'
  | 'emergency_fund'
  | 'risk_comfort'
  | 'wrap_up';              // final summary & dashboard handoff

export type ComponentTypeV2 = 
  | 'buttons' 
  | 'form' 
  | 'checkboxes' 
  | 'cards' 
  | 'plaid' 
  | 'pieChart' 
  | 'slider'
  | 'dropdown';

export interface StepConfigV2 {
  label: string;
  component: ComponentTypeV2;
  skipAllowed?: boolean;
  requiresPrevious?: OnboardingStepV2[];
}

export interface StepInstanceV2 {
  stepId: OnboardingStepV2;
  instanceId: string;
  nonce: string;
  createdAt: number;
}

/**
 * Immutable ordered steps - DO NOT CHANGE
 */
export const ORDERED_STEPS_V2: readonly OnboardingStepV2[] = Object.freeze([
  'privacy_consent',
  'welcome',
  'main_goal',
  'life_stage',
  'family_size',
  'location',
  'household_snapshot',
  'connect_accounts',
  'verify_income',
  'income_structure',
  'benefits_equity',
  'budget_review',
  'assets_liabilities_quick_add',
  'debts_breakdown',
  'housing',
  'insurance',
  'emergency_fund',
  'risk_comfort',
  'wrap_up'
]);

/**
 * Step configuration with labels and components
 */
export const STEP_CONFIG_V2: Readonly<Record<OnboardingStepV2, StepConfigV2>> = Object.freeze({
  privacy_consent: { 
    label: 'Privacy & Consent', 
    component: 'buttons' 
  },
  welcome: { 
    label: 'Welcome', 
    component: 'buttons' 
  },
  main_goal: { 
    label: 'Main Financial Goal', 
    component: 'buttons' 
  },
  life_stage: { 
    label: 'Life Stage', 
    component: 'buttons' 
  },
  family_size: { 
    label: 'Family Size', 
    component: 'buttons' 
  },
  location: { 
    label: 'Location', 
    component: 'dropdown' 
  },
  household_snapshot: { 
    label: 'Household Finances', 
    component: 'form',
    requiresPrevious: ['life_stage', 'location']
  },
  connect_accounts: { 
    label: 'Connect Accounts', 
    component: 'plaid',
    requiresPrevious: ['household_snapshot']
  },
  verify_income: { 
    label: 'Verify Income', 
    component: 'buttons',
    requiresPrevious: ['connect_accounts']
  },
  income_structure: { 
    label: 'Income Structure', 
    component: 'form',
    requiresPrevious: ['verify_income']
  },
  benefits_equity: { 
    label: 'Benefits & Equity', 
    component: 'checkboxes' 
  },
  budget_review: { 
    label: 'Budget Review', 
    component: 'pieChart',
    requiresPrevious: ['verify_income']
  },
  assets_liabilities_quick_add: { 
    label: 'Assets & Liabilities', 
    component: 'form',
    skipAllowed: true 
  },
  debts_breakdown: { 
    label: 'Debts Breakdown', 
    component: 'form',
    skipAllowed: true 
  },
  housing: { 
    label: 'Housing Situation', 
    component: 'buttons' 
  },
  insurance: { 
    label: 'Insurance Coverage', 
    component: 'checkboxes' 
  },
  emergency_fund: { 
    label: 'Emergency Fund', 
    component: 'slider' 
  },
  risk_comfort: { 
    label: 'Risk Comfort', 
    component: 'slider' 
  },
  wrap_up: { 
    label: 'Complete!', 
    component: 'cards' 
  }
});

/**
 * Generate unique step instance ID
 */
export function generateStepInstanceId(): string {
  return `si_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate unique nonce for request tracking
 */
export function generateNonce(): string {
  return `n_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate data-driven progress
 */
export function calculateProgressV2(
  completedSteps: OnboardingStepV2[],
  currentStep: OnboardingStepV2
): {
  orderedSteps: readonly OnboardingStepV2[];
  completed: OnboardingStepV2[];
  current: OnboardingStepV2;
  remainingCount: number;
  itemsCollected: number;
  percentComplete: number;
  nextStep: OnboardingStepV2 | null;
  nextLabel: string | null;
} {
  const currentIndex = ORDERED_STEPS_V2.indexOf(currentStep);
  const totalSteps = ORDERED_STEPS_V2.length;
  
  // Items collected = steps with persisted payload
  const itemsCollected = completedSteps.length;
  
  // Remaining steps
  const remainingCount = totalSteps - currentIndex - 1;
  
  // Percentage (round down as per spec)
  const percentComplete = Math.floor((itemsCollected / totalSteps) * 100);
  
  // Next step
  const nextIndex = currentIndex + 1;
  const nextStep = nextIndex < totalSteps ? ORDERED_STEPS_V2[nextIndex] : null;
  const nextLabel = nextStep ? STEP_CONFIG_V2[nextStep].label : null;
  
  return {
    orderedSteps: ORDERED_STEPS_V2,
    completed: completedSteps,
    current: currentStep,
    remainingCount,
    itemsCollected,
    percentComplete,
    nextStep,
    nextLabel
  };
}

/**
 * Validate step transition
 */
export function isValidTransitionV2(
  from: OnboardingStepV2,
  to: OnboardingStepV2,
  completedSteps: OnboardingStepV2[]
): { valid: boolean; reason?: string } {
  // Check if target step exists
  if (!ORDERED_STEPS_V2.includes(to)) {
    return { valid: false, reason: 'Invalid target step' };
  }
  
  // Check required previous steps
  const config = STEP_CONFIG_V2[to];
  if (config.requiresPrevious) {
    for (const required of config.requiresPrevious) {
      if (!completedSteps.includes(required)) {
        return { 
          valid: false, 
          reason: `Step '${required}' must be completed before '${to}'` 
        };
      }
    }
  }
  
  // Only allow forward progression or same step (idempotent)
  const fromIndex = ORDERED_STEPS_V2.indexOf(from);
  const toIndex = ORDERED_STEPS_V2.indexOf(to);
  
  if (toIndex < fromIndex) {
    return { valid: false, reason: 'Backward navigation not allowed' };
  }
  
  // Check if it's the expected next step (allow skipping if skipAllowed)
  if (toIndex === fromIndex + 1) {
    return { valid: true };
  }
  
  // Allow staying on same step (idempotent)
  if (toIndex === fromIndex) {
    return { valid: true };
  }
  
  // Check if steps in between can be skipped
  for (let i = fromIndex + 1; i < toIndex; i++) {
    const stepBetween = ORDERED_STEPS_V2[i];
    if (!STEP_CONFIG_V2[stepBetween].skipAllowed) {
      return { 
        valid: false, 
        reason: `Cannot skip required step '${stepBetween}'` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Get the next valid step based on context
 */
export function getNextStepV2(
  currentStep: OnboardingStepV2,
  completedSteps: OnboardingStepV2[],
  context?: {
    hasPlaidConnection?: boolean;
    incomeChoice?: 'detected' | 'manual' | 'skip';
    incomeAmount?: number;
  }
): OnboardingStepV2 | null {
  const currentIndex = ORDERED_STEPS_V2.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex >= ORDERED_STEPS_V2.length - 1) {
    return null;
  }
  
  // Default to next step in sequence
  let nextIndex = currentIndex + 1;
  let nextStep = ORDERED_STEPS_V2[nextIndex];
  
  // Skip optional steps if conditions are met
  while (nextStep && shouldSkipStep(nextStep, completedSteps, context)) {
    nextIndex++;
    if (nextIndex >= ORDERED_STEPS_V2.length) {
      return null;
    }
    nextStep = ORDERED_STEPS_V2[nextIndex];
  }
  
  return nextStep;
}

/**
 * Determine if a step should be skipped
 */
function shouldSkipStep(
  step: OnboardingStepV2,
  completedSteps: OnboardingStepV2[],
  context?: {
    hasPlaidConnection?: boolean;
    incomeChoice?: 'detected' | 'manual' | 'skip';
    incomeAmount?: number;
  }
): boolean {
  // Never skip required steps unless explicitly marked as skipAllowed
  const config = STEP_CONFIG_V2[step];
  
  // Check if prerequisites are met
  if (config.requiresPrevious) {
    for (const required of config.requiresPrevious) {
      if (!completedSteps.includes(required)) {
        // Can't do this step yet, but don't skip - it's an error
        return false;
      }
    }
  }
  
  // Context-based skipping rules
  switch (step) {
    case 'assets_liabilities_quick_add':
    case 'debts_breakdown':
      // These are optional and can be skipped if user has Plaid
      return context?.hasPlaidConnection === true && config.skipAllowed === true;
    
    default:
      return false;
  }
}

/**
 * Create a new step instance with tracking IDs
 */
export function createStepInstance(stepId: OnboardingStepV2): StepInstanceV2 {
  return {
    stepId,
    instanceId: generateStepInstanceId(),
    nonce: generateNonce(),
    createdAt: Date.now()
  };
}

/**
 * Validate incoming request against expected step instance
 */
export function validateStepInstance(
  expected: StepInstanceV2,
  received: { stepId: string; instanceId: string; nonce?: string }
): { valid: boolean; error?: string } {
  if (expected.stepId !== received.stepId) {
    return {
      valid: false,
      error: `Expected step '${expected.stepId}' but received '${received.stepId}'`
    };
  }
  
  if (expected.instanceId !== received.instanceId) {
    return {
      valid: false,
      error: `Invalid step instance ID. Expected '${expected.instanceId}' but received '${received.instanceId}'`
    };
  }
  
  // Nonce is optional but if provided must match
  if (received.nonce && expected.nonce !== received.nonce) {
    return {
      valid: false,
      error: 'Request nonce mismatch'
    };
  }
  
  return { valid: true };
}

/**
 * State machine contract for strict step progression
 */
export interface OnboardingStateV2 {
  userId: string;
  sessionId: string;
  currentStep: OnboardingStepV2;
  currentInstance: StepInstanceV2;
  completedSteps: OnboardingStepV2[];
  stepPayloads: Record<OnboardingStepV2, any>;
  lastUpdated: number;
}

/**
 * Initialize a new onboarding state
 */
export function initializeOnboardingState(userId: string, sessionId: string): OnboardingStateV2 {
  const firstStep = ORDERED_STEPS_V2[0];
  return {
    userId,
    sessionId,
    currentStep: firstStep,
    currentInstance: createStepInstance(firstStep),
    completedSteps: [],
    stepPayloads: {},
    lastUpdated: Date.now()
  };
}

/**
 * Advance state machine to next step
 */
export function advanceState(
  state: OnboardingStateV2,
  payload: any,
  context?: any
): { 
  newState: OnboardingStateV2; 
  error?: string 
} {
  // Save payload for current step
  const updatedPayloads = {
    ...state.stepPayloads,
    [state.currentStep]: payload
  };
  
  // Mark current step as completed if not already
  const updatedCompleted = state.completedSteps.includes(state.currentStep)
    ? state.completedSteps
    : [...state.completedSteps, state.currentStep];
  
  // Get next step
  const nextStep = getNextStepV2(state.currentStep, updatedCompleted, context);
  
  if (!nextStep) {
    // Onboarding complete
    return {
      newState: {
        ...state,
        stepPayloads: updatedPayloads,
        completedSteps: updatedCompleted,
        lastUpdated: Date.now()
      }
    };
  }
  
  // Validate transition
  const validation = isValidTransitionV2(state.currentStep, nextStep, updatedCompleted);
  if (!validation.valid) {
    return {
      newState: state,
      error: validation.reason
    };
  }
  
  // Create new state with next step
  return {
    newState: {
      ...state,
      currentStep: nextStep,
      currentInstance: createStepInstance(nextStep),
      completedSteps: updatedCompleted,
      stepPayloads: updatedPayloads,
      lastUpdated: Date.now()
    }
  };
}