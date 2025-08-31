/**
 * Fresh session invariants for onboarding
 * Ensures proper initialization and component rendering
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { 
  ORDERED_STEPS, 
  STEP_CONFIG, 
  calculateProgress,
  generateStepInstanceId,
  generateNonce,
  type StepId
} from './canonical-steps';

const prisma = new PrismaClient();

/**
 * Check if user has completed consent/ToS
 * This could be from signup flow or previous onboarding
 */
export async function hasCompletedConsent(userId: string): Promise<boolean> {
  // Check if consent was logged in user_onboarding_responses
  const consentResponse = await prisma.user_onboarding_responses.findFirst({
    where: {
      user_id: userId,
      question: 'consent'
    }
  });
  
  // Also check if user accepted ToS during signup (stored in users table)
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { 
      tos_accepted: true,
      privacy_accepted: true,
      created_at: true
    }
  });
  
  // If user accepted ToS/privacy during signup, log it if not already logged
  if (user?.tos_accepted && user?.privacy_accepted && !consentResponse) {
    await prisma.user_onboarding_responses.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        question: 'consent',
        answer: {
          tos: true,
          privacy: true,
          data: true,
          accepted_at: user.created_at
        },
        created_at: user.created_at // Use signup time as consent time
      }
    });
    return true;
  }
  
  return !!(consentResponse || (user?.tos_accepted && user?.privacy_accepted));
}

/**
 * Get the count of items collected for a user
 */
export async function getItemsCollected(userId: string): Promise<number> {
  const responses = await prisma.user_onboarding_responses.findMany({
    where: {
      user_id: userId,
      question: {
        in: ORDERED_STEPS as string[]
      },
      NOT: {
        answer: null
      }
    }
  });
  
  return responses.length;
}

/**
 * Initialize fresh session for onboarding
 */
export async function initializeFreshSession(userId: string): Promise<{
  currentStep: StepId;
  itemsCollected: number;
  shouldStartAtConsent: boolean;
}> {
  const hasConsent = await hasCompletedConsent(userId);
  const itemsCollected = await getItemsCollected(userId);
  
  // Determine starting step - AUTO-ADVANCE from welcome to main_goal
  // If user has consent, skip welcome and go straight to main_goal
  const currentStep: StepId = hasConsent ? 'main_goal' : 'consent';
  const shouldStartAtConsent = !hasConsent;
  
  // Create or update onboarding_progress
  await prisma.onboarding_progress.upsert({
    where: { user_id: userId },
    update: {
      current_step: currentStep,
      is_complete: false,
      updated_at: new Date()
    },
    create: {
      user_id: userId,
      current_step: currentStep,
      is_complete: false,
      updated_at: new Date()
    }
  });
  
  // If we're starting at main_goal, mark welcome as completed
  if (currentStep === 'main_goal') {
    await prisma.user_onboarding_responses.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        question: 'welcome',
        answer: { auto_advanced: true },
        created_at: new Date()
      }
    }).catch(() => {
      // Ignore if already exists
    });
  }
  
  return {
    currentStep,
    itemsCollected: itemsCollected + (currentStep === 'main_goal' ? 1 : 0), // Count welcome as collected if auto-advanced
    shouldStartAtConsent
  };
}

/**
 * Build the initial component message for fresh session
 */
export function buildFreshSessionMessage(currentStep: StepId, itemsCollected: number): any {
  const stepConfig = STEP_CONFIG[currentStep];
  const progress = calculateProgress(currentStep);
  
  // Build component based on step
  let componentData: any = {};
  
  switch (currentStep) {
    case 'consent':
      componentData = {
        question: 'Please review and accept:',
        options: [
          { id: 'tos', label: 'I accept the Terms of Service', value: 'tos', required: true },
          { id: 'privacy', label: 'I accept the Privacy Policy', value: 'privacy', required: true },
          { id: 'data', label: 'I consent to secure data processing', value: 'data', required: true }
        ]
      };
      break;
      
    case 'welcome':
      // Welcome should not be shown - we auto-advance to main_goal
      // If somehow we get here, redirect to main_goal
      componentData = {
        question: "Welcome to TrueFi! Let's get started.",
        options: [
          { id: 'continue', label: 'Continue', value: 'continue', icon: '➡️' }
        ]
      };
      break;
      
    case 'main_goal':
      componentData = {
        question: "What brought you to TrueFi today?",
        options: [
          { id: 'understand-finances', label: 'Understand my finances', value: 'understand_finances', icon: '📊' },
          { id: 'fix-budget', label: 'Fix my budget', value: 'fix_budget', icon: '💰' },
          { id: 'save-goals', label: 'Save for goals', value: 'save_goals', icon: '🎯' },
          { id: 'grow-wealth', label: 'Grow wealth', value: 'grow_wealth', icon: '📈' },
          { id: 'pay-debt', label: 'Pay off debt', value: 'pay_off_debt', icon: '💳' },
          { id: 'something-else', label: 'Something else', value: 'something_else', icon: '💭' }
        ]
      };
      break;
      
    case 'life_stage':
      componentData = {
        question: "Which best describes your current life stage?",
        options: [
          { id: 'student', label: 'Student 🎓', value: 'student', icon: '🎓' },
          { id: 'early_career', label: 'Early career 💼', value: 'early_career', icon: '💼' },
          { id: 'established', label: 'Established professional 📊', value: 'established', icon: '📊' },
          { id: 'parent', label: 'Parent 👨‍👩‍👧‍👦', value: 'parent', icon: '👨‍👩‍👧‍👦' },
          { id: 'pre_retirement', label: 'Pre-retirement 🌅', value: 'pre_retirement', icon: '🌅' },
          { id: 'retired', label: 'Retired 🏖️', value: 'retired', icon: '🏖️' }
        ]
      };
      break;
      
    case 'dependents':
      componentData = {
        question: "Do you have any dependents?",
        options: [
          { id: 'none', label: 'No dependents', value: 0 },
          { id: 'one', label: '1 dependent', value: 1 },
          { id: 'two', label: '2 dependents', value: 2 },
          { id: 'three', label: '3 dependents', value: 3 },
          { id: 'four_plus', label: '4+ dependents', value: 4 }
        ]
      };
      break;
      
    default:
      // For all other steps, provide a reasonable default based on component type
      const componentType = stepConfig.component;
      if (componentType === 'buttons') {
        componentData = {
          question: `Let's talk about ${stepConfig.label.toLowerCase()}`,
          options: [
            { id: 'continue', label: 'Continue', value: '__continue__' }
          ]
        };
      } else if (componentType === 'form') {
        componentData = {
          question: `Please provide your ${stepConfig.label.toLowerCase()} information`,
          fields: []
        };
      } else {
        componentData = {
          question: stepConfig.label
        };
      }
  }
  
  return {
    role: 'assistant',
    kind: 'component',
    stepId: currentStep,
    componentType: stepConfig.component,
    componentData,
    meta: {
      stepInstanceId: generateStepInstanceId(),
      nonce: generateNonce()
    },
    header: {
      index: progress.currentIndex,
      total: progress.total,
      comingNext: progress.nextLabel,
      itemsCollected,
      percentage: progress.percentage
    }
  };
}

/**
 * Ensure proper component message for any onboarding step
 */
export function ensureComponentMessage(currentStep: StepId, itemsCollected: number): any {
  // Never return generic text for a component step
  const stepConfig = STEP_CONFIG[currentStep];
  if (!stepConfig) {
    throw new Error(`No configuration for step: ${currentStep}`);
  }
  
  return buildFreshSessionMessage(currentStep, itemsCollected);
}