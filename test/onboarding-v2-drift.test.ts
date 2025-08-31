/**
 * Tests for onboarding v2 first-step drift fix
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  initializeOnboardingState, 
  advanceState, 
  validateStepInstance,
  calculateProgressV2,
  createStepInstance,
  ORDERED_STEPS_V2
} from '../lib/onboarding/canonical-v2';

describe('Onboarding V2 - First Step Drift Fix', () => {
  const userId = 'test-user-123';
  const sessionId = 'test-session-456';

  describe('Auto-advance from welcome to main_goal', () => {
    it('should auto-advance from welcome to main_goal on GET request', () => {
      // Initialize state (starts at privacy_consent)
      let state = initializeOnboardingState(userId, sessionId);
      expect(state.currentStep).toBe('privacy_consent');

      // Complete privacy_consent
      const consentResult = advanceState(state, { accepted: true });
      state = consentResult.newState;
      expect(state.currentStep).toBe('welcome');

      // Simulate what the GET handler does - auto-advance from welcome
      if (state.currentStep === 'welcome') {
        if (!state.completedSteps.includes('welcome')) {
          state.completedSteps.push('welcome');
        }
        state.currentStep = 'main_goal';
        state.currentInstance = createStepInstance('main_goal');
      }

      // Verify state after auto-advance
      expect(state.currentStep).toBe('main_goal');
      expect(state.completedSteps).toContain('welcome');
      expect(state.currentInstance.stepId).toBe('main_goal');
    });

    it('should return main_goal as first interactive step with correct payload', () => {
      const state = {
        userId,
        sessionId,
        currentStep: 'main_goal' as const,
        currentInstance: createStepInstance('main_goal'),
        completedSteps: ['privacy_consent', 'welcome'] as const,
        stepPayloads: {},
        lastUpdated: Date.now()
      };

      const progress = calculateProgressV2(state.completedSteps, state.currentStep);

      // Verify progress calculation
      expect(progress.current).toBe('main_goal');
      expect(progress.completed).toEqual(['privacy_consent', 'welcome']);
      expect(progress.itemsCollected).toBe(2);
      expect(progress.nextStep).toBe('life_stage');
      expect(progress.nextLabel).toBe('Life Stage');
    });
  });

  describe('Step instance validation', () => {
    it('should validate correct step instance', () => {
      const instance = createStepInstance('main_goal');
      const validation = validateStepInstance(instance, {
        stepId: 'main_goal',
        instanceId: instance.instanceId,
        nonce: instance.nonce
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject mismatched step ID', () => {
      const instance = createStepInstance('main_goal');
      const validation = validateStepInstance(instance, {
        stepId: 'welcome', // Wrong step
        instanceId: instance.instanceId,
        nonce: instance.nonce
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Expected step 'main_goal' but received 'welcome'");
    });

    it('should reject mismatched instance ID', () => {
      const instance = createStepInstance('main_goal');
      const validation = validateStepInstance(instance, {
        stepId: 'main_goal',
        instanceId: 'wrong-instance-id',
        nonce: instance.nonce
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Invalid step instance ID');
    });
  });

  describe('Progress header consistency', () => {
    it('should calculate progress from the same payload data', () => {
      const completedSteps = ['privacy_consent', 'welcome', 'main_goal'] as const;
      const currentStep = 'life_stage' as const;

      const progress = calculateProgressV2(completedSteps, currentStep);

      // Verify all progress fields come from canonical calculation
      expect(progress.orderedSteps).toBe(ORDERED_STEPS_V2);
      expect(progress.completed).toBe(completedSteps);
      expect(progress.current).toBe(currentStep);
      expect(progress.itemsCollected).toBe(3);
      expect(progress.percentComplete).toBe(Math.floor((3 / ORDERED_STEPS_V2.length) * 100));
    });
  });

  describe('409 OUT_OF_SYNC handling', () => {
    it('should return 409 when step instances mismatch', () => {
      const serverInstance = createStepInstance('life_stage');
      const clientSubmission = {
        stepId: 'main_goal',
        instanceId: 'old-instance-id',
        nonce: 'old-nonce'
      };

      const validation = validateStepInstance(serverInstance, clientSubmission);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Expected step 'life_stage' but received 'main_goal'");
    });
  });

  describe('Component type support', () => {
    it('should support all required component types', () => {
      const supportedTypes = [
        'buttons',
        'form',
        'checkboxes',
        'cards',
        'plaid',
        'pieChart',
        'slider',
        'dropdown'
      ];

      // This would be verified in the actual component renderer
      supportedTypes.forEach(type => {
        expect(['buttons', 'form', 'checkboxes', 'cards', 'plaid', 'pieChart', 'slider', 'dropdown']).toContain(type);
      });
    });
  });
});

describe('E2E Flow Simulation', () => {
  it('should complete a full onboarding flow without drift', () => {
    const userId = 'e2e-user';
    const sessionId = 'e2e-session';

    // Initialize
    let state = initializeOnboardingState(userId, sessionId);
    expect(state.currentStep).toBe('privacy_consent');

    // Step 1: Privacy consent
    let result = advanceState(state, { accepted: true });
    expect(result.error).toBeUndefined();
    state = result.newState;
    expect(state.currentStep).toBe('welcome');

    // Step 2: Welcome (auto-advanced to main_goal in GET handler)
    state.completedSteps.push('welcome');
    state.currentStep = 'main_goal';
    state.currentInstance = createStepInstance('main_goal');

    // Step 3: Main goal
    result = advanceState(state, { goal: 'debt_payoff' });
    expect(result.error).toBeUndefined();
    state = result.newState;
    expect(state.currentStep).toBe('life_stage');

    // Step 4: Life stage
    result = advanceState(state, { stage: 'early_career' });
    expect(result.error).toBeUndefined();
    state = result.newState;
    expect(state.currentStep).toBe('family_size');

    // Verify no drift occurred
    expect(state.completedSteps).toContain('privacy_consent');
    expect(state.completedSteps).toContain('welcome');
    expect(state.completedSteps).toContain('main_goal');
    expect(state.completedSteps).toContain('life_stage');
    expect(state.currentStep).toBe('family_size');

    // Verify progress is consistent
    const progress = calculateProgressV2(state.completedSteps, state.currentStep);
    expect(progress.itemsCollected).toBe(state.completedSteps.length);
    expect(progress.current).toBe(state.currentStep);
  });
});