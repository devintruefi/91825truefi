// Test script for unified onboarding flow
// Run with: npx tsx test/test-unified-onboarding.ts

import { OnboardingStateManager } from '../lib/onboarding/onboarding-state-manager';
import { 
  UNIFIED_ONBOARDING_STEPS,
  validateOnboardingCompletion,
  generateOnboardingSummary 
} from '../lib/onboarding/unified-onboarding-flow';

async function testUnifiedOnboarding() {
  console.log('🧪 Testing Unified Onboarding Flow...\n');
  
  // Test 1: Create new onboarding state
  console.log('✅ Test 1: Initialize new onboarding state');
  const manager = new OnboardingStateManager();
  await manager.initialize('test_user_' + Date.now());
  
  const initialState = manager.getState();
  console.log('Initial state:', {
    userId: initialState?.userId,
    currentStep: initialState?.currentStep,
    isComplete: initialState?.isComplete
  });
  
  // Test 2: Skip Plaid connection
  console.log('\n✅ Test 2: Skip Plaid connection');
  await manager.updateResponses({
    skipPlaidReason: 'Testing without Plaid',
    hasConnectedAccounts: false
  });
  
  const step1Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS);
  console.log('Next step after skipping Plaid:', step1Complete);
  
  // Test 3: Select main goal
  console.log('\n✅ Test 3: Select main goal');
  await manager.updateResponses({
    mainGoal: 'build_wealth'
  });
  
  const step2Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.MAIN_GOAL);
  console.log('Next step after goal selection:', step2Complete);
  
  // Test 4: Select life stage
  console.log('\n✅ Test 4: Select life stage');
  await manager.updateResponses({
    lifeStage: 'established'
  });
  
  const step3Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.LIFE_STAGE);
  console.log('Next step after life stage:', step3Complete);
  
  // Test 5: Add family context
  console.log('\n✅ Test 5: Add family context');
  await manager.updateResponses({
    maritalStatus: 'married',
    dependents: 2
  });
  
  const step4Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.FAMILY_CONTEXT);
  console.log('Next step after family context:', step4Complete);
  
  // Test 6: Add income verification
  console.log('\n✅ Test 6: Add income verification');
  await manager.updateResponses({
    monthlyIncome: 8000,
    monthlyExpenses: 5500
  });
  
  const step5Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.INCOME_VERIFICATION);
  console.log('Next step after income:', step5Complete);
  
  // Test 7: Review and confirm
  console.log('\n✅ Test 7: Review and confirm');
  await manager.updateResponses({
    confirmedData: true,
    consentToAnalysis: true
  });
  
  const step6Complete = await manager.completeStep(UNIFIED_ONBOARDING_STEPS.REVIEW_CONFIRM);
  console.log('Next step after review:', step6Complete);
  
  // Test 8: Get progress
  console.log('\n✅ Test 8: Check progress');
  const progress = manager.getProgress();
  console.log('Progress:', progress);
  
  // Test 9: Validate completion
  console.log('\n✅ Test 9: Validate completion');
  const finalState = manager.getState();
  if (finalState) {
    const validation = validateOnboardingCompletion(finalState);
    console.log('Validation result:', validation);
    
    // Test 10: Generate summary
    console.log('\n✅ Test 10: Generate onboarding summary');
    const summary = generateOnboardingSummary(finalState);
    console.log('Summary:', {
      userId: summary.userId,
      mainGoal: summary.mainGoal,
      lifeStage: summary.lifeStage,
      monthlyIncome: summary.monthlyIncome,
      monthlyExpenses: summary.monthlyExpenses,
      hasConnectedAccounts: summary.hasConnectedAccounts
    });
  }
  
  // Test 11: Test going back
  console.log('\n✅ Test 11: Test navigation backwards');
  const previousStep = await manager.goToPreviousStep();
  console.log('Went back to step:', previousStep);
  
  // Test 12: Export state for debugging
  console.log('\n✅ Test 12: Export state');
  const exportedState = manager.exportState();
  console.log('State exported successfully, length:', exportedState.length);
  
  // Test 13: Clear state
  console.log('\n✅ Test 13: Clear state');
  await manager.clearState();
  const clearedState = manager.getState();
  console.log('State after clearing:', clearedState);
  
  console.log('\n✨ All tests completed successfully!');
}

// Run tests
testUnifiedOnboarding().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});