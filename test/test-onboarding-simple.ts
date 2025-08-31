// Simple test to verify onboarding flow
import { ONBOARDING_STEPS, STEP_CONFIG } from '../lib/onboarding/steps';
import { OnboardingManager } from '../lib/onboarding/manager';
import { calculateOnboardingProgress } from '../lib/onboarding/progress-utils';

console.log('🚀 Testing Onboarding Flow\n');

// Test 1: Verify step order
console.log('1️⃣ Step Order Test:');
const expectedOrder = [
  'consent', 'welcome', 'main_goal', 'plaid_connection', 
  'life_stage', 'dependents', 'jurisdiction', 'household'
];

let currentStep = 'consent';
for (let i = 0; i < expectedOrder.length - 1; i++) {
  const config = STEP_CONFIG[currentStep];
  if (!config) {
    console.log(`❌ Missing config for step: ${currentStep}`);
    break;
  }
  
  const nextStep = typeof config.next === 'function' ? 
    config.next({}) : config.next;
  
  const expected = expectedOrder[i + 1];
  if (nextStep === expected) {
    console.log(`✅ ${currentStep} → ${nextStep}`);
  } else {
    console.log(`❌ ${currentStep} → ${nextStep} (expected ${expected})`);
  }
  
  if (nextStep && nextStep !== 'complete') {
    currentStep = nextStep;
  }
}

// Test 2: Progress calculation
console.log('\n2️⃣ Progress Calculation Test:');
const testSteps = ['consent', 'welcome', 'main_goal', 'life_stage', 'plaid_connection'];
for (const step of testSteps) {
  const progress = calculateOnboardingProgress(step);
  const detailed = OnboardingManager.getDetailedProgress({ 
    currentStep: step, 
    userId: 'test',
    responses: {},
    progress: {}
  });
  console.log(`${step}: Step ${detailed.stepNumber}/${detailed.totalSteps} (${detailed.percent}%)`);
}

// Test 3: Income capture options
console.log('\n3️⃣ Income Capture Component Test:');
const incomeConfig = STEP_CONFIG['income_capture'];
if (incomeConfig) {
  console.log('Default options:');
  incomeConfig.component.data.options.forEach(opt => {
    console.log(`  - ${opt.label} (${opt.value}): ${opt.description || ''}`);
  });
}

// Test 4: Component building with state
console.log('\n4️⃣ Component Building Test:');
const mockState = {
  userId: 'test-user',
  currentStep: 'income_capture' as any,
  responses: {},
  progress: { detectedIncome: 5000 },
  hasPlaidData: true
};

async function testComponent() {
  const component = await OnboardingManager.buildComponent(mockState);
  if (component) {
    console.log(`Component type: ${component.type}`);
    console.log(`Step ID: ${component.stepId}`);
    if (component.data.options) {
      console.log('Options after detection:');
      component.data.options.forEach((opt: any) => {
        console.log(`  - ${opt.label}: ${opt.description || opt.value}`);
      });
    }
    if (component.data.description) {
      console.log(`Description: ${component.data.description}`);
    }
  }
}

testComponent().then(() => {
  console.log('\n✅ All tests completed!');
}).catch(err => {
  console.error('❌ Test failed:', err);
});