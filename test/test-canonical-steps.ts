/**
 * Test the canonical step engine implementation
 */

import { 
  ORDERED_STEPS, 
  STEP_CONFIG, 
  calculateProgress, 
  getNextStep,
  generateStepInstanceId,
  generateNonce,
  type StepId
} from '../lib/onboarding/canonical-steps';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ ${message}`);
    testsFailed++;
  }
}

function testProgressCalculation() {
  console.log('\n📊 Testing Progress Calculation:');
  
  // Test first step (consent)
  const consentProgress = calculateProgress('consent');
  assert(consentProgress.currentIndex === 1, `Consent should be step 1, got ${consentProgress.currentIndex}`);
  assert(consentProgress.total === 28, `Total should be 28, got ${consentProgress.total}`);
  assert(consentProgress.percentage === 4, `Consent percentage should be 4%, got ${consentProgress.percentage}%`);
  assert(consentProgress.nextStep === 'welcome', `Next after consent should be welcome, got ${consentProgress.nextStep}`);
  
  // Test middle step (income_capture - step 9)
  const incomeProgress = calculateProgress('income_capture');
  assert(incomeProgress.currentIndex === 9, `Income capture should be step 9, got ${incomeProgress.currentIndex}`);
  assert(incomeProgress.percentage === 32, `Income capture percentage should be 32%, got ${incomeProgress.percentage}%`);
  
  // Test near-end step (celebrate_complete - step 27)
  const celebrateProgress = calculateProgress('celebrate_complete');
  assert(celebrateProgress.currentIndex === 27, `Celebrate should be step 27, got ${celebrateProgress.currentIndex}`);
  assert(celebrateProgress.percentage === 96, `Celebrate percentage should be 96%, got ${celebrateProgress.percentage}%`);
  assert(celebrateProgress.nextStep === 'complete', `Next after celebrate should be complete, got ${celebrateProgress.nextStep}`);
  
  // Test final step
  const completeProgress = calculateProgress('complete');
  assert(completeProgress.currentIndex === 28, `Complete should be step 28, got ${completeProgress.currentIndex}`);
  assert(completeProgress.percentage === 100, `Complete percentage should be 100%, got ${completeProgress.percentage}%`);
  assert(completeProgress.nextStep === null, `Next after complete should be null, got ${completeProgress.nextStep}`);
}

function testStepOrder() {
  console.log('\n📝 Testing Step Order:');
  
  assert(ORDERED_STEPS.length === 28, `Should have 28 steps, got ${ORDERED_STEPS.length}`);
  assert(ORDERED_STEPS[0] === 'consent', `First step should be consent, got ${ORDERED_STEPS[0]}`);
  assert(ORDERED_STEPS[27] === 'complete', `Last step should be complete, got ${ORDERED_STEPS[27]}`);
  
  // Check for duplicates
  const uniqueSteps = new Set(ORDERED_STEPS);
  assert(uniqueSteps.size === ORDERED_STEPS.length, `No duplicate steps allowed`);
}

function testStepConfiguration() {
  console.log('\n⚙️ Testing Step Configuration:');
  
  // Every step should have a config
  for (const step of ORDERED_STEPS) {
    const config = STEP_CONFIG[step];
    assert(config !== undefined, `Step ${step} should have configuration`);
    assert(config.label !== undefined, `Step ${step} should have a label`);
    assert(config.component !== undefined, `Step ${step} should have a component type`);
  }
  
  // Test specific configurations
  assert(STEP_CONFIG.consent.component === 'buttons', `Consent should use buttons`);
  assert(STEP_CONFIG.plaid_connection.component === 'plaid', `Plaid connection should use plaid component`);
  assert(STEP_CONFIG.emergency_fund.component === 'slider', `Emergency fund should use slider`);
  assert(STEP_CONFIG.expenses_capture.component === 'pieChart', `Expenses should use pieChart`);
  assert(STEP_CONFIG.plan_tradeoffs.skipAllowed === true, `Plan tradeoffs should be skippable`);
}

function testBranchingLogic() {
  console.log('\n🔀 Testing Branching Logic:');
  
  // After plaid_connection should go to household
  const afterPlaid = getNextStep('plaid_connection');
  assert(afterPlaid === 'household', `After plaid_connection should be household, got ${afterPlaid}`);
  
  // Income capture branches
  const afterIncomeDetected = getNextStep('income_capture', { incomeChoice: 'use_detected' });
  assert(afterIncomeDetected === 'income_confirmation', `After income_capture with use_detected should be income_confirmation, got ${afterIncomeDetected}`);
  
  const afterIncomeManual = getNextStep('income_capture', { incomeChoice: 'manual' });
  assert(afterIncomeManual === 'manual_income', `After income_capture with manual should be manual_income, got ${afterIncomeManual}`);
  
  const afterIncomeRetry = getNextStep('income_capture', { incomeChoice: 'retry' });
  assert(afterIncomeRetry === 'income_capture', `After income_capture with retry should stay on income_capture, got ${afterIncomeRetry}`);
  
  // Income confirmation branches
  const afterConfirmYes = getNextStep('income_confirmation', { incomeConfirmed: true });
  assert(afterConfirmYes === 'pay_structure', `After confirmed income should be pay_structure, got ${afterConfirmYes}`);
  
  const afterConfirmNo = getNextStep('income_confirmation', { incomeConfirmed: false });
  assert(afterConfirmNo === 'manual_income', `After rejected income should be manual_income, got ${afterConfirmNo}`);
}

function testIdGeneration() {
  console.log('\n🆔 Testing ID Generation:');
  
  const instanceId1 = generateStepInstanceId();
  const instanceId2 = generateStepInstanceId();
  assert(instanceId1 !== instanceId2, `Step instance IDs should be unique`);
  assert(instanceId1.startsWith('s_'), `Step instance ID should start with s_`);
  
  const nonce1 = generateNonce();
  const nonce2 = generateNonce();
  assert(nonce1 !== nonce2, `Nonces should be unique`);
  assert(nonce1.startsWith('n_'), `Nonce should start with n_`);
}

function testNextStepLabels() {
  console.log('\n🏷️ Testing Next Step Labels:');
  
  // Check that "Coming next" labels work correctly
  const steps: StepId[] = ['consent', 'welcome', 'main_goal', 'income_capture', 'emergency_fund'];
  
  for (const step of steps) {
    const progress = calculateProgress(step);
    if (progress.nextStep) {
      const nextConfig = STEP_CONFIG[progress.nextStep];
      assert(
        progress.nextLabel === nextConfig.label,
        `Next label for ${step} should be "${nextConfig.label}", got "${progress.nextLabel}"`
      );
    }
  }
}

function runTests() {
  console.log('🧪 Testing Canonical Step Engine\n');
  console.log('='.repeat(50));
  
  testStepOrder();
  testStepConfiguration();
  testProgressCalculation();
  testBranchingLogic();
  testIdGeneration();
  testNextStepLabels();
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results:`);
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('='.repeat(50));
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();