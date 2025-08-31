/**
 * Final test to verify onboarding flow works without fallback messages
 */

import fetch from 'node-fetch';
import * as crypto from 'crypto';

const BASE_URL = 'http://localhost:3003';

async function testOnboardingFlow() {
  console.log('=== Testing Onboarding Flow - Final Verification ===\n');
  
  // Create a test user ID (must be a valid UUID for Prisma)
  const testUserId = crypto.randomUUID();
  const testToken = Buffer.from(JSON.stringify({
    userId: testUserId,
    user_id: testUserId,
    sub: testUserId,
    first_name: 'Test',
    firstName: 'Test',
    email: 'test@example.com',
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000)
  })).toString('base64');
  
  console.log('Test User ID:', testUserId);
  console.log('Test Token:', testToken.substring(0, 20) + '...\n');
  
  try {
    // Step 1: Initialize onboarding
    console.log('Step 1: Initializing onboarding...');
    const initResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        action: 'initialize',
        userId: testUserId
      })
    });
    
    const initData = await initResponse.json();
    console.log('Initial response status:', initResponse.status);
    console.log('Initial step:', initData.state?.currentStep);
    console.log('Component type:', initData.component?.componentType);
    console.log('Question:', initData.component?.componentData?.question);
    
    if (initData.component?.componentData?.question?.includes("didn't load properly")) {
      console.error('❌ FAIL: Got fallback message on initialization!');
      return false;
    }
    
    // Verify we got main_goal (auto-advanced from welcome)
    if (initData.state?.currentStep !== 'main_goal') {
      console.error('❌ FAIL: Expected main_goal, got:', initData.state?.currentStep);
      return false;
    }
    
    console.log('✅ Successfully initialized with main_goal step\n');
    
    // Step 2: Select a main goal
    console.log('Step 2: Selecting main goal...');
    const goalResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        action: 'submit',
        userId: testUserId,
        stepId: 'main_goal',
        instanceId: initData.state?.currentInstance?.instanceId,
        nonce: initData.state?.currentInstance?.nonce,
        payload: {
          selection: 'understand_finances'
        }
      })
    });
    
    const goalData = await goalResponse.json();
    console.log('Goal response status:', goalResponse.status);
    console.log('Next step:', goalData.state?.currentStep);
    console.log('Component type:', goalData.component?.componentType);
    console.log('Question:', goalData.component?.componentData?.question);
    
    if (goalData.component?.componentData?.question?.includes("didn't load properly")) {
      console.error('❌ FAIL: Got fallback message after selecting goal!');
      return false;
    }
    
    // Verify we moved to life_stage
    if (goalData.state?.currentStep !== 'life_stage') {
      console.error('❌ FAIL: Expected life_stage, got:', goalData.state?.currentStep);
      return false;
    }
    
    console.log('✅ Successfully progressed to life_stage\n');
    
    // Step 3: Select life stage
    console.log('Step 3: Selecting life stage...');
    const stageResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        action: 'submit',
        userId: testUserId,
        stepId: 'life_stage',
        instanceId: goalData.state?.currentInstance?.instanceId,
        nonce: goalData.state?.currentInstance?.nonce,
        payload: {
          selection: 'early_career'
        }
      })
    });
    
    const stageData = await stageResponse.json();
    console.log('Stage response status:', stageResponse.status);
    console.log('Next step:', stageData.state?.currentStep);
    console.log('Component type:', stageData.component?.componentType);
    console.log('Question:', stageData.component?.componentData?.question);
    
    if (stageData.component?.componentData?.question?.includes("didn't load properly")) {
      console.error('❌ FAIL: Got fallback message after selecting life stage!');
      return false;
    }
    
    console.log('✅ Successfully progressed from life_stage\n');
    
    console.log('=== ALL TESTS PASSED ===');
    console.log('✅ No fallback messages encountered');
    console.log('✅ Flow progresses correctly: main_goal -> life_stage -> next');
    console.log('✅ Authentication working properly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testOnboardingFlow().then(success => {
  process.exit(success ? 0 : 1);
});