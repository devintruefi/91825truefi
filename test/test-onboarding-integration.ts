/**
 * Integration test for complete onboarding flow
 * Tests all the key requirements from the spec
 */

import { 
  ORDERED_STEPS, 
  STEP_CONFIG, 
  calculateProgress,
  generateStepInstanceId,
  generateNonce,
  getNextStep
} from '../lib/onboarding/canonical-steps';

import { generateTestModeSuggestions } from '../lib/plaid/sync-and-suggest';

// Test results tracking
const testResults: { 
  category: string; 
  test: string; 
  passed: boolean; 
  details?: string 
}[] = [];

function test(category: string, testName: string, condition: boolean, details?: string) {
  testResults.push({ 
    category, 
    test: testName, 
    passed: condition, 
    details: details || (condition ? 'Passed' : 'Failed')
  });
  
  const emoji = condition ? '✅' : '❌';
  console.log(`  ${emoji} ${testName}`);
  if (!condition && details) {
    console.log(`     → ${details}`);
  }
}

// Test 1: Progress Header Calculation
function testProgressHeader() {
  console.log('\n📊 1. PROGRESS HEADER CALCULATION');
  
  // Test that we never show "Step 1 of 9 / 0% Complete"
  const firstStep = calculateProgress('consent');
  test(
    'Progress', 
    'First step shows Step 1 of 28',
    firstStep.currentIndex === 1 && firstStep.total === 28,
    `Got Step ${firstStep.currentIndex} of ${firstStep.total}`
  );
  
  test(
    'Progress',
    'First step percentage is not 0%',
    firstStep.percentage > 0,
    `Got ${firstStep.percentage}%`
  );
  
  // Test middle step
  const middleStep = calculateProgress('expenses_capture');
  test(
    'Progress',
    'Middle step shows correct index',
    middleStep.currentIndex === 14,
    `expenses_capture should be step 14, got ${middleStep.currentIndex}`
  );
  
  // Test "Coming next" label
  test(
    'Progress',
    'Coming next label is accurate',
    firstStep.nextLabel === 'Welcome',
    `After consent, next should be "Welcome", got "${firstStep.nextLabel}"`
  );
  
  // Test final steps
  const almostDone = calculateProgress('celebrate_complete');
  test(
    'Progress',
    'Near-end step shows high percentage',
    almostDone.percentage >= 95,
    `celebrate_complete should be ≥95%, got ${almostDone.percentage}%`
  );
}

// Test 2: State Sync Contract
function testStateSyncContract() {
  console.log('\n🔄 2. STATE SYNC CONTRACT');
  
  // Test nonce/stepInstanceId generation
  const nonce1 = generateNonce();
  const nonce2 = generateNonce();
  const instanceId1 = generateStepInstanceId();
  const instanceId2 = generateStepInstanceId();
  
  test(
    'State Sync',
    'Nonces are unique',
    nonce1 !== nonce2,
    `${nonce1} vs ${nonce2}`
  );
  
  test(
    'State Sync',
    'Step instance IDs are unique',
    instanceId1 !== instanceId2,
    `${instanceId1} vs ${instanceId2}`
  );
  
  test(
    'State Sync',
    'Nonce format is correct',
    nonce1.startsWith('n_') && nonce1.length > 10,
    nonce1
  );
  
  test(
    'State Sync',
    'StepInstanceId format is correct',
    instanceId1.startsWith('s_') && instanceId1.length > 10,
    instanceId1
  );
  
  // Simulate meta object structure
  const metaObject = {
    nonce: generateNonce(),
    stepInstanceId: generateStepInstanceId()
  };
  
  test(
    'State Sync',
    'Meta object has required fields',
    'nonce' in metaObject && 'stepInstanceId' in metaObject,
    JSON.stringify(metaObject)
  );
}

// Test 3: Income Detection and Suggestions
function testIncomeDetection() {
  console.log('\n💰 3. INCOME DETECTION & SUGGESTIONS');
  
  const suggestions = generateTestModeSuggestions();
  
  test(
    'Income',
    'Test mode generates income suggestions',
    suggestions.income_capture !== undefined,
    'income_capture key exists'
  );
  
  test(
    'Income',
    'Income amount is reasonable',
    suggestions.income_capture.monthly_net_income === 6520,
    `Expected $6,520, got $${suggestions.income_capture.monthly_net_income}`
  );
  
  test(
    'Income',
    'Pay frequency is detected',
    suggestions.income_capture.pay_frequency === 'biweekly',
    `Got ${suggestions.income_capture.pay_frequency}`
  );
  
  test(
    'Income',
    'Variable income percentage included',
    suggestions.income_capture.variable_income_pct === 12,
    `Got ${suggestions.income_capture.variable_income_pct}%`
  );
}

// Test 4: Budget Defaults
function testBudgetDefaults() {
  console.log('\n📊 4. BUDGET DEFAULTS');
  
  const suggestions = generateTestModeSuggestions();
  const budgetCategories = suggestions.expenses_capture.categories;
  
  test(
    'Budget',
    'Budget categories exist',
    budgetCategories !== undefined,
    'Has categories object'
  );
  
  const total = Object.values(budgetCategories)
    .reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
  
  test(
    'Budget',
    'Budget totals to 100%',
    total === 100,
    `Sum is ${total}%`
  );
  
  test(
    'Budget',
    'No category is 0%',
    !Object.values(budgetCategories).includes(0),
    'All categories have values'
  );
  
  test(
    'Budget',
    'Housing is reasonable percentage',
    budgetCategories.Housing >= 20 && budgetCategories.Housing <= 35,
    `Housing is ${budgetCategories.Housing}%`
  );
}

// Test 5: Debt Details
function testDebtDetails() {
  console.log('\n💳 5. DEBT DETAILS');
  
  const suggestions = generateTestModeSuggestions();
  
  test(
    'Debt',
    'Debts detail suggestions exist',
    suggestions.debts_detail !== undefined,
    'debts_detail key exists'
  );
  
  test(
    'Debt',
    'Debts array is provided',
    Array.isArray(suggestions.debts_detail.debts),
    'debts is an array'
  );
  
  const firstDebt = suggestions.debts_detail.debts[0];
  test(
    'Debt',
    'Debt has required fields',
    firstDebt && 
    'lender' in firstDebt && 
    'type' in firstDebt && 
    'balance' in firstDebt && 
    'apr' in firstDebt,
    firstDebt ? Object.keys(firstDebt).join(', ') : 'No debt'
  );
  
  test(
    'Debt',
    'APR is sorted descending (avalanche)',
    suggestions.debts_detail.debts.length <= 1 || 
    suggestions.debts_detail.debts[0].apr >= suggestions.debts_detail.debts[1]?.apr,
    'Highest APR first'
  );
}

// Test 6: Emergency Fund
function testEmergencyFund() {
  console.log('\n🛡️ 6. EMERGENCY FUND');
  
  const suggestions = generateTestModeSuggestions();
  
  test(
    'Emergency Fund',
    'Emergency fund suggestions exist',
    suggestions.emergency_fund !== undefined,
    'emergency_fund key exists'
  );
  
  test(
    'Emergency Fund',
    'Shows current months',
    typeof suggestions.emergency_fund.current_months === 'number',
    `Current: ${suggestions.emergency_fund.current_months} months`
  );
  
  test(
    'Emergency Fund',
    'Shows recommended months',
    suggestions.emergency_fund.recommended_months === 3,
    `Recommended: ${suggestions.emergency_fund.recommended_months} months`
  );
  
  test(
    'Emergency Fund',
    'Current amount is provided',
    typeof suggestions.emergency_fund.current_amount === 'number',
    `Current amount: $${suggestions.emergency_fund.current_amount}`
  );
}

// Test 7: Step Flow and Branching
function testStepFlow() {
  console.log('\n🔀 7. STEP FLOW & BRANCHING');
  
  // Test linear flow
  test(
    'Flow',
    'consent → welcome',
    getNextStep('consent') === 'welcome',
    'Linear progression'
  );
  
  test(
    'Flow',
    'plaid_connection → household',
    getNextStep('plaid_connection') === 'household',
    'After Plaid goes to household'
  );
  
  // Test income branching
  test(
    'Flow',
    'income_capture + use_detected → income_confirmation',
    getNextStep('income_capture', { incomeChoice: 'use_detected' }) === 'income_confirmation',
    'Detected income needs confirmation'
  );
  
  test(
    'Flow',
    'income_capture + manual → manual_income',
    getNextStep('income_capture', { incomeChoice: 'manual' }) === 'manual_income',
    'Manual entry flow'
  );
  
  test(
    'Flow',
    'income_confirmation + confirmed → pay_structure',
    getNextStep('income_confirmation', { incomeConfirmed: true }) === 'pay_structure',
    'Confirmed income continues'
  );
  
  test(
    'Flow',
    'income_confirmation + edit → manual_income',
    getNextStep('income_confirmation', { incomeConfirmed: false }) === 'manual_income',
    'Edit goes back to manual'
  );
}

// Test 8: Component Types
function testComponentTypes() {
  console.log('\n🎨 8. COMPONENT TYPES');
  
  const componentTests = [
    { step: 'consent', expected: 'buttons' },
    { step: 'plaid_connection', expected: 'plaid' },
    { step: 'emergency_fund', expected: 'slider' },
    { step: 'expenses_capture', expected: 'pieChart' },
    { step: 'budget_review', expected: 'pieChart' },
    { step: 'jurisdiction', expected: 'form' },
    { step: 'benefits_equity', expected: 'checkboxes' }
  ];
  
  componentTests.forEach(({ step, expected }) => {
    const config = STEP_CONFIG[step as keyof typeof STEP_CONFIG];
    test(
      'Components',
      `${step} uses ${expected}`,
      config.component === expected,
      `Got ${config.component}`
    );
  });
}

// Test 9: Step Count and Order
function testStepCount() {
  console.log('\n📝 9. STEP COUNT & ORDER');
  
  test(
    'Steps',
    'Total steps is 28',
    ORDERED_STEPS.length === 28,
    `Got ${ORDERED_STEPS.length} steps`
  );
  
  test(
    'Steps',
    'First step is consent',
    ORDERED_STEPS[0] === 'consent',
    ORDERED_STEPS[0]
  );
  
  test(
    'Steps',
    'Last step is complete',
    ORDERED_STEPS[27] === 'complete',
    ORDERED_STEPS[27]
  );
  
  test(
    'Steps',
    'No duplicate steps',
    new Set(ORDERED_STEPS).size === ORDERED_STEPS.length,
    'All unique'
  );
  
  // Check critical steps are present
  const criticalSteps = [
    'income_capture',
    'expenses_capture', 
    'debts_detail',
    'emergency_fund',
    'budget_review'
  ];
  
  criticalSteps.forEach(step => {
    test(
      'Steps',
      `Contains ${step}`,
      ORDERED_STEPS.includes(step as any),
      ORDERED_STEPS.includes(step as any) ? 'Present' : 'Missing'
    );
  });
}

// Run all tests
function runIntegrationTests() {
  console.log('🧪 ONBOARDING INTEGRATION TEST SUITE');
  console.log('=' .repeat(50));
  
  testProgressHeader();
  testStateSyncContract();
  testIncomeDetection();
  testBudgetDefaults();
  testDebtDetails();
  testEmergencyFund();
  testStepFlow();
  testComponentTypes();
  testStepCount();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY\n');
  
  const categories = [...new Set(testResults.map(r => r.category))];
  categories.forEach(category => {
    const categoryTests = testResults.filter(r => r.category === category);
    const passed = categoryTests.filter(r => r.passed).length;
    const total = categoryTests.length;
    const rate = Math.round((passed / total) * 100);
    
    const emoji = rate === 100 ? '✅' : rate >= 75 ? '⚠️' : '❌';
    console.log(`${emoji} ${category}: ${passed}/${total} (${rate}%)`);
  });
  
  const totalPassed = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const successRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  console.log(successRate === 100 ? '✅ ALL TESTS PASSED!' : `⚠️ ${totalTests - totalPassed} tests failed`);
  console.log('='.repeat(50));
  
  // Exit with appropriate code
  process.exit(successRate === 100 ? 0 : 1);
}

// Run tests
runIntegrationTests();