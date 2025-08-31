/**
 * Integration test for onboarding flow
 */

import { PrismaClient } from '@prisma/client';
import {
  ORDERED_STEPS_V2,
  initializeOnboardingState,
  advanceState,
  calculateProgressV2,
  isValidTransitionV2,
  createStepInstance,
  validateStepInstance
} from '../lib/onboarding/canonical-v2';

const prisma = new PrismaClient();

// Test user data
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_SESSION_ID = 'test-session-' + Date.now();

async function runIntegrationTest() {
  console.log('🧪 Starting Onboarding V2 Integration Test\n');
  console.log('═══════════════════════════════════════════\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Initialize onboarding state
    console.log('Test 1: Initialize onboarding state');
    const state = initializeOnboardingState(TEST_USER_ID, TEST_SESSION_ID);
    
    if (state.currentStep === 'privacy_consent' && state.completedSteps.length === 0) {
      console.log('✅ State initialized correctly\n');
      passed++;
    } else {
      console.log('❌ State initialization failed\n');
      failed++;
    }
    
    // Test 2: Progress calculation
    console.log('Test 2: Progress calculation');
    const progress = calculateProgressV2([], 'privacy_consent');
    
    if (progress.percentComplete === 0 && progress.itemsCollected === 0) {
      console.log('✅ Initial progress calculated correctly');
      console.log(`   Percent: ${progress.percentComplete}%, Items: ${progress.itemsCollected}\n`);
      passed++;
    } else {
      console.log('❌ Progress calculation incorrect\n');
      failed++;
    }
    
    // Test 3: Valid transition check
    console.log('Test 3: Transition validation');
    const validTransition = isValidTransitionV2('privacy_consent', 'welcome', ['privacy_consent']);
    const invalidTransition = isValidTransitionV2('privacy_consent', 'verify_income', []);
    
    if (validTransition.valid && !invalidTransition.valid) {
      console.log('✅ Transition validation works correctly\n');
      passed++;
    } else {
      console.log('❌ Transition validation failed\n');
      failed++;
    }
    
    // Test 4: Step instance validation
    console.log('Test 4: Step instance validation');
    const stepInstance = createStepInstance('welcome');
    const validValidation = validateStepInstance(stepInstance, {
      stepId: 'welcome',
      instanceId: stepInstance.instanceId,
      nonce: stepInstance.nonce
    });
    const invalidValidation = validateStepInstance(stepInstance, {
      stepId: 'main_goal',
      instanceId: stepInstance.instanceId,
      nonce: stepInstance.nonce
    });
    
    if (validValidation.valid && !invalidValidation.valid) {
      console.log('✅ Step instance validation works correctly\n');
      passed++;
    } else {
      console.log('❌ Step instance validation failed\n');
      failed++;
    }
    
    // Test 5: Full flow simulation
    console.log('Test 5: Full onboarding flow simulation');
    let currentState = initializeOnboardingState(TEST_USER_ID, TEST_SESSION_ID);
    let completedCount = 0;
    
    for (const expectedStep of ORDERED_STEPS_V2) {
      if (currentState.currentStep !== expectedStep) {
        console.log(`❌ Expected step ${expectedStep}, got ${currentState.currentStep}`);
        failed++;
        break;
      }
      
      // Create mock payload
      const payload = getMockPayload(expectedStep);
      
      // Advance state
      const { newState, error } = advanceState(currentState, payload);
      
      if (error) {
        console.log(`❌ Error advancing from ${expectedStep}: ${error}`);
        failed++;
        break;
      }
      
      currentState = newState;
      completedCount++;
    }
    
    if (completedCount === ORDERED_STEPS_V2.length) {
      console.log(`✅ Successfully completed all ${ORDERED_STEPS_V2.length} steps\n`);
      passed++;
    } else {
      console.log(`❌ Only completed ${completedCount} of ${ORDERED_STEPS_V2.length} steps\n`);
      failed++;
    }
    
    // Test 6: Progress at midpoint
    console.log('Test 6: Progress calculation at midpoint');
    const midIndex = Math.floor(ORDERED_STEPS_V2.length / 2);
    const midProgress = calculateProgressV2(
      ORDERED_STEPS_V2.slice(0, midIndex) as any,
      ORDERED_STEPS_V2[midIndex]
    );
    
    const expectedPercent = Math.floor((midIndex / ORDERED_STEPS_V2.length) * 100);
    if (Math.abs(midProgress.percentComplete - expectedPercent) <= 5) {
      console.log(`✅ Midpoint progress correct: ${midProgress.percentComplete}%\n`);
      passed++;
    } else {
      console.log(`❌ Midpoint progress incorrect: ${midProgress.percentComplete}% (expected ~${expectedPercent}%)\n`);
      failed++;
    }
    
    // Test 7: OUT_OF_SYNC detection
    console.log('Test 7: OUT_OF_SYNC detection');
    const wrongInstance = createStepInstance('welcome');
    const syncValidation = validateStepInstance(wrongInstance, {
      stepId: 'main_goal', // Wrong step
      instanceId: wrongInstance.instanceId,
      nonce: wrongInstance.nonce
    });
    
    if (!syncValidation.valid && syncValidation.error?.includes('Expected step')) {
      console.log('✅ OUT_OF_SYNC correctly detected\n');
      passed++;
    } else {
      console.log('❌ OUT_OF_SYNC not detected properly\n');
      failed++;
    }
    
  } catch (error) {
    console.error('❌ Test crashed:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }
  
  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  console.log(`   Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Onboarding V2 is ready for production.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review and fix issues before deployment.\n');
    process.exit(1);
  }
}

// Helper function for mock payloads
function getMockPayload(step: string): any {
  const payloads: Record<string, any> = {
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
  
  return payloads[step] || {};
}

// Run the test
runIntegrationTest().catch(console.error);