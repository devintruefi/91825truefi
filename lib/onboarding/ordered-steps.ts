/**
 * Re-export from canonical-steps.ts - Single source of truth
 */
export { 
  ORDERED_STEPS as ORDERED_ONBOARDING_STEPS,
  ORDERED_STEPS as ONBOARDING_STEPS,
  type StepId as OnboardingStep,
  calculateProgress,
  getNextStep,
  STEP_CONFIG
} from './canonical-steps';