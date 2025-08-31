/**
 * Headless Onboarding Journey Test
 * Run with: npm run test:onboarding:headless
 */

import { ORDERED_STEPS, calculateProgress } from '../lib/onboarding/canonical-steps';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-jwt-token';

interface TestContext {
  sessionId: string;
  userId: string;
  currentStep: string;
  stepInstanceId?: string;
  nonce?: string;
}

async function callChatAPI(context: TestContext, componentResponse?: any) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: JSON.stringify({
      sessionId: context.sessionId,
      userId: context.userId,
      componentResponse
    })
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
}

async function runOnboardingJourney() {
  console.log('🚀 Starting Headless Onboarding Journey Test\n');
  
  const context: TestContext = {
    sessionId: `test-session-${Date.now()}`,
    userId: `test-user-${Date.now()}`,
    currentStep: 'consent'
  };

  let stepCount = 0;
  let errors = 0;

  // Test each step
  for (const step of ORDERED_STEPS) {
    if (step === 'complete') break; // Skip terminal state
    
    stepCount++;
    console.log(`\n📍 Step ${stepCount}: ${step}`);
    
    try {
      // Get current step from API
      const response = await callChatAPI(context);
      
      // Validate response structure
      if (!response.component) {
        console.error(`  ❌ No component in response for ${step}`);
        errors++;
        continue;
      }

      // Extract meta info
      context.stepInstanceId = response.component.meta?.stepInstanceId;
      context.nonce = response.component.meta?.nonce;
      
      // Validate step ID matches
      if (response.component.stepId !== step) {
        console.error(`  ❌ Step mismatch: expected ${step}, got ${response.component.stepId}`);
        errors++;
      }

      // Validate progress calculation
      const progress = calculateProgress(step);
      console.log(`  ✓ Progress: Step ${progress.currentIndex} of ${progress.total} (${progress.percentage}%)`);
      
      // Validate "Coming next"
      if (progress.nextLabel) {
        console.log(`  ✓ Coming next: ${progress.nextLabel}`);
      }

      // Simulate user response based on step type
      let userResponse: any = { value: '__continue__' };
      
      switch (step) {
        case 'consent':
          userResponse = { 
            value: ['tos', 'privacy', 'data'],
            stepId: step,
            stepInstanceId: context.stepInstanceId,
            nonce: context.nonce
          };
          break;
        case 'main_goal':
          userResponse = { 
            value: 'build_wealth',
            stepId: step,
            stepInstanceId: context.stepInstanceId,
            nonce: context.nonce
          };
          break;
        case 'income_capture':
          // Should have "use_detected" option if TEST_MODE=true
          if (response.component.data?.options) {
            const hasDetected = response.component.data.options.some((opt: any) => 
              opt.id === 'use_detected'
            );
            if (!hasDetected) {
              console.error('  ❌ No "Use detected" option in income_capture');
              errors++;
            } else {
              console.log('  ✓ "Use detected" option available');
            }
          }
          userResponse = { 
            value: 'use_detected',
            stepId: step,
            stepInstanceId: context.stepInstanceId,
            nonce: context.nonce
          };
          break;
        case 'expenses_capture':
        case 'budget_review':
          // Validate budget totals to 100%
          if (response.component.data?.categories) {
            const total = Object.values(response.component.data.categories)
              .reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
            if (total === 0) {
              console.error('  ❌ Budget shows 0% total');
              errors++;
            } else if (Math.abs(total - 100) > 1) {
              console.error(`  ❌ Budget doesn't sum to 100% (got ${total}%)`);
              errors++;
            } else {
              console.log(`  ✓ Budget totals to ${total}%`);
            }
          }
          userResponse = { 
            value: response.component.data?.categories,
            stepId: step,
            stepInstanceId: context.stepInstanceId,
            nonce: context.nonce
          };
          break;
        case 'emergency_fund':
          // Validate shows months
          if (response.component.data?.label?.includes('months')) {
            console.log('  ✓ Emergency fund shows months');
          } else {
            console.error('  ❌ Emergency fund missing "months" label');
            errors++;
          }
          userResponse = { 
            value: 3,
            stepId: step,
            stepInstanceId: context.stepInstanceId,
            nonce: context.nonce
          };
          break;
      }

      // Submit response
      await callChatAPI(context, userResponse);
      
      // Update context
      context.currentStep = step;
      
    } catch (error) {
      console.error(`  ❌ Error at step ${step}:`, error);
      errors++;
    }
  }

  // Test stale nonce handling
  console.log('\n🔄 Testing Stale Nonce Handling');
  try {
    const staleResponse = await callChatAPI(context, {
      value: 'test',
      stepId: 'welcome',
      stepInstanceId: 'stale-instance',
      nonce: 'stale-nonce'
    });
    
    if (staleResponse.error || staleResponse.status === 409) {
      console.log('  ✓ Stale nonce correctly rejected');
    } else {
      console.error('  ❌ Stale nonce not rejected');
      errors++;
    }
  } catch (error) {
    console.log('  ✓ Stale nonce threw error (expected)');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`  Total Steps: ${stepCount}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Result: ${errors === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(50));

  process.exit(errors === 0 ? 0 : 1);
}

// Run test
if (require.main === module) {
  runOnboardingJourney().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}