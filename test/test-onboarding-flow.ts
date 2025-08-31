// Simple test to verify the onboarding flow works
import { normalizeStepId, isValidStepId } from '../lib/onboarding/step-utils';
import { ONBOARDING_STEPS } from '../lib/onboarding/steps';

console.log('Testing step ID normalization...');

// Test cases
const testCases = [
  { input: 'MAIN_GOAL', expected: 'main_goal' },
  { input: 'main-goal', expected: 'main_goal' },
  { input: 'life_stage', expected: 'life_stage' },
  { input: 'LIFE_STAGE', expected: 'life_stage' },
  { input: 'life-stage', expected: 'life_stage' },
  { input: 'plaid_connection', expected: 'plaid_connection' },
  { input: 'bank-connection', expected: 'plaid_connection' },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = normalizeStepId(test.input);
  if (result === test.expected) {
    console.log(`✅ PASS: ${test.input} → ${result}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.input} → ${result} (expected: ${test.expected})`);
    failed++;
  }
});

console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

// Test valid step IDs
console.log('\nTesting valid step IDs...');
const validSteps = ['welcome', 'main_goal', 'life_stage', 'complete'];
validSteps.forEach(step => {
  console.log(`${step}: ${isValidStepId(step) ? '✅ valid' : '❌ invalid'}`);
});

// Print all canonical step IDs
console.log('\nCanonical Step IDs:');
Object.entries(ONBOARDING_STEPS).forEach(([key, value]) => {
  console.log(`  ${key}: "${value}"`);
});

export {};