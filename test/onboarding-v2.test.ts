/**
 * Onboarding V2 - Comprehensive automated tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  OnboardingStepV2,
  ORDERED_STEPS_V2,
  initializeOnboardingState,
  advanceState,
  calculateProgressV2,
  isValidTransitionV2,
  getNextStepV2,
  validateStepInstance,
  createStepInstance
} from '../lib/onboarding/canonical-v2';
import { detectMonthlyIncomeV2 } from '../lib/income-detection-v2';
import { calculateBudgetV2 } from '../lib/budget-calculator-v2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Onboarding V2 - Step Engine', () => {
  
  describe('Happy Path - Full flow', () => {
    it('should complete entire onboarding flow without errors', async () => {
      const userId = 'test-user-' + Date.now();
      const sessionId = 'test-session-' + Date.now();
      
      let state = initializeOnboardingState(userId, sessionId);
      const completedSteps: OnboardingStepV2[] = [];
      
      // Go through each step
      for (const expectedStep of ORDERED_STEPS_V2) {
        expect(state.currentStep).toBe(expectedStep);
        
        // Create mock payload for step
        const payload = getMockPayload(expectedStep);
        
        // Advance state
        const { newState, error } = advanceState(state, payload);
        
        expect(error).toBeUndefined();
        expect(newState).toBeDefined();
        
        if (expectedStep !== 'wrap_up') {
          completedSteps.push(expectedStep);
          expect(newState.completedSteps).toEqual(completedSteps);
        }
        
        state = newState;
      }
      
      // Should be on wrap_up at the end
      expect(state.currentStep).toBe('wrap_up');
      expect(state.completedSteps.length).toBe(ORDERED_STEPS_V2.length - 1);
    });
  });
  
  describe('Out-of-order submissions', () => {
    it('should reject out-of-order step submissions', () => {
      const userId = 'test-user-' + Date.now();
      const sessionId = 'test-session-' + Date.now();
      
      const state = initializeOnboardingState(userId, sessionId);
      
      // Try to submit verify_income while on privacy_consent
      const validation = isValidTransitionV2(
        'privacy_consent',
        'verify_income',
        []
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('must be completed before');
    });
    
    it('should return 409 OUT_OF_SYNC for wrong step instance', () => {
      const expected = createStepInstance('welcome');
      const received = {
        stepId: 'main_goal',
        instanceId: expected.instanceId,
        nonce: expected.nonce
      };
      
      const validation = validateStepInstance(expected, received);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Expected step');
      expect(validation.error).toContain('welcome');
      expect(validation.error).toContain('main_goal');
    });
  });
  
  describe('Idempotency', () => {
    it('should handle duplicate submissions of same step', async () => {
      const userId = 'test-user-' + Date.now();
      const sessionId = 'test-session-' + Date.now();
      
      const state = initializeOnboardingState(userId, sessionId);
      const payload = { choice: 'accept' };
      
      // Submit same step twice
      const { newState: state1 } = advanceState(state, payload);
      const { newState: state2 } = advanceState(state, payload);
      
      // Both should result in same next step
      expect(state1.currentStep).toBe(state2.currentStep);
      expect(state1.completedSteps).toEqual(state2.completedSteps);
    });
  });
  
  describe('Progress calculation', () => {
    it('should calculate correct progress percentages', () => {
      const testCases = [
        { completed: [], current: 'privacy_consent', expected: 0 },
        { completed: ['privacy_consent'], current: 'welcome', expected: 5 },
        { completed: ['privacy_consent', 'welcome'], current: 'main_goal', expected: 10 },
        { 
          completed: ORDERED_STEPS_V2.slice(0, 10) as OnboardingStepV2[], 
          current: ORDERED_STEPS_V2[10], 
          expected: 52 
        },
        { 
          completed: ORDERED_STEPS_V2.slice(0, -1) as OnboardingStepV2[], 
          current: 'wrap_up', 
          expected: 94 
        }
      ];
      
      for (const testCase of testCases) {
        const progress = calculateProgressV2(testCase.completed, testCase.current);
        expect(progress.percentComplete).toBe(testCase.expected);
        expect(progress.itemsCollected).toBe(testCase.completed.length);
      }
    });
    
    it('should provide correct next step labels', () => {
      const progress = calculateProgressV2([], 'privacy_consent');
      
      expect(progress.nextStep).toBe('welcome');
      expect(progress.nextLabel).toBe('Welcome');
      expect(progress.remainingCount).toBe(ORDERED_STEPS_V2.length - 1);
    });
  });
});

describe('Income Detection', () => {
  
  beforeEach(async () => {
    // Clean test data
    await prisma.transactions.deleteMany({
      where: { user_id: { startsWith: 'test-' } }
    });
  });
  
  it('should detect income from recurring payroll transactions', async () => {
    const userId = 'test-income-' + Date.now();
    
    // Create mock payroll transactions
    const biweeklyAmount = 2500;
    const dates = [
      new Date('2024-08-15'),
      new Date('2024-08-01'),
      new Date('2024-07-18'),
      new Date('2024-07-04')
    ];
    
    for (const date of dates) {
      await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          account_id: crypto.randomUUID(),
          plaid_transaction_id: 'test-' + date.getTime(),
          amount: -biweeklyAmount, // Negative = deposit in Plaid
          currency_code: 'USD',
          date,
          name: 'EMPLOYER PAYROLL DD',
          category: 'TRANSFER',
          pending: false,
          created_at: new Date()
        }
      });
    }
    
    const detection = await detectMonthlyIncomeV2(userId);
    
    expect(detection).toBeDefined();
    expect(detection?.monthlyIncome).toBeGreaterThan(0);
    expect(detection?.confidence).toBeGreaterThan(70);
    expect(detection?.source).toBe('transactions');
    
    // Should detect biweekly frequency
    const deposits = detection?.details.recurringDeposits;
    expect(deposits?.length).toBeGreaterThan(0);
    expect(deposits?.[0].frequency).toBe('biweekly');
    
    // Monthly should be ~5416 (2500 * 26 / 12)
    const expectedMonthly = Math.round(biweeklyAmount * 26 / 12);
    expect(detection?.monthlyIncome).toBeCloseTo(expectedMonthly, -2);
  });
  
  it('should return null when no income detected', async () => {
    const userId = 'test-no-income-' + Date.now();
    
    // Create only expense transactions
    await prisma.transactions.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        account_id: crypto.randomUUID(),
        plaid_transaction_id: 'test-expense',
        amount: 50, // Positive = expense
        currency_code: 'USD',
        date: new Date(),
        name: 'GROCERY STORE',
        category: 'SHOPS',
        pending: false,
        created_at: new Date()
      }
    });
    
    const detection = await detectMonthlyIncomeV2(userId);
    expect(detection).toBeNull();
  });
});

describe('Budget Calculation', () => {
  
  it('should return placeholder when no income', async () => {
    const userId = 'test-no-income-budget-' + Date.now();
    
    const budget = await calculateBudgetV2(userId);
    
    expect(budget.isPlaceholder).toBe(true);
    expect(budget.totalPercentage).toBe(0);
    expect(budget.message).toContain("We'll build your budget");
  });
  
  it('should return 50/30/20 budget with income', async () => {
    const userId = 'test-budget-' + Date.now();
    const monthlyIncome = 5000;
    
    // Set up user with income
    await prisma.user_preferences.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        financial_goals: {
          monthlyIncome
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    const budget = await calculateBudgetV2(userId);
    
    expect(budget.isPlaceholder).toBe(false);
    expect(budget.monthlyIncome).toBe(monthlyIncome);
    expect(budget.totalPercentage).toBe(100);
    
    // Check 50/30/20 split
    const needs = budget.categories.find(c => c.id === 'needs');
    const wants = budget.categories.find(c => c.id === 'wants');
    const savings = budget.categories.find(c => c.id === 'savings');
    
    expect(needs?.percentage).toBe(50);
    expect(wants?.percentage).toBe(30);
    expect(savings?.percentage).toBe(20);
    
    expect(needs?.amount).toBe(2500);
    expect(wants?.amount).toBe(1500);
    expect(savings?.amount).toBe(1000);
  });
});

describe('/resync endpoint', () => {
  it('should restore client to correct state', async () => {
    const userId = 'test-resync-' + Date.now();
    const sessionId = 'test-session-' + Date.now();
    
    // Initialize state at step 5
    const state = initializeOnboardingState(userId, sessionId);
    state.currentStep = ORDERED_STEPS_V2[5];
    state.completedSteps = ORDERED_STEPS_V2.slice(0, 5) as OnboardingStepV2[];
    
    // Simulate resync
    const progress = calculateProgressV2(state.completedSteps, state.currentStep);
    
    expect(progress.current).toBe(ORDERED_STEPS_V2[5]);
    expect(progress.completed).toHaveLength(5);
    expect(progress.itemsCollected).toBe(5);
    expect(progress.nextStep).toBe(ORDERED_STEPS_V2[6]);
  });
});

// Helper function to generate mock payloads
function getMockPayload(step: OnboardingStepV2): any {
  const payloads: Record<OnboardingStepV2, any> = {
    privacy_consent: { accepted: true },
    welcome: { name: 'Test User' },
    main_goal: { goal: 'save_money' },
    life_stage: { stage: 'working' },
    family_size: { size: 2 },
    location: { country: 'United States', state: 'CA' },
    household_snapshot: {
      partner_income: 0,
      shared_expenses: 0,
      household_net_worth: 10000
    },
    connect_accounts: { connected: true },
    verify_income: { choice: 'manual', amount: 5000 },
    income_structure: { frequency: 'monthly', variable: false },
    benefits_equity: { benefits: ['401k'] },
    budget_review: { approved: true },
    assets_liabilities_quick_add: { assets: 10000, liabilities: 5000 },
    debts_breakdown: { debts: [] },
    housing: { type: 'rent' },
    insurance: { types: ['health', 'auto'] },
    emergency_fund: { months: 3 },
    risk_comfort: { level: 5 },
    wrap_up: { complete: true }
  };
  
  return payloads[step];
}

// Cleanup after tests
afterEach(async () => {
  await prisma.$disconnect();
});