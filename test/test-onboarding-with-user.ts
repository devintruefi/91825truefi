/**
 * Test onboarding flow with actual user creation
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3003';

async function testOnboardingFlow() {
  console.log('=== Testing Onboarding Flow with Real User ===\n');
  
  // Create a real test user in the database
  const testUserId = crypto.randomUUID();
  const testEmail = `test_${Date.now()}@example.com`;
  
  try {
    // Create user in database
    console.log('Creating test user in database...');
    await prisma.users.create({
      data: {
        id: testUserId,
        email: testEmail,
        password_hash: 'test_password_hash', // Just a placeholder for testing
        first_name: 'Test',
        last_name: 'User',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_advisor: false
      }
    });
    console.log('✅ Test user created:', testUserId);
    
    // Create token for this user
    const testToken = Buffer.from(JSON.stringify({
      userId: testUserId,
      user_id: testUserId,
      sub: testUserId,
      first_name: 'Test',
      firstName: 'Test',
      email: testEmail,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000)
    })).toString('base64');
    
    console.log('Test Token:', testToken.substring(0, 20) + '...\n');
    
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
    
    if (!initResponse.ok) {
      console.error('Error response:', initData);
      return false;
    }
    
    console.log('Initial step:', initData.state?.currentStep);
    console.log('Component type:', initData.component?.type || initData.component?.componentType);
    console.log('Question:', initData.component?.question || initData.component?.componentData?.question);
    
    // Check for fallback message
    const question = initData.component?.question || initData.component?.componentData?.question || '';
    if (question.includes("didn't load properly")) {
      console.error('❌ FAIL: Got fallback message on initialization!');
      return false;
    }
    
    // V2 flow starts with privacy_consent, not main_goal
    const expectedFirstStep = 'privacy_consent';
    if (initData.state?.currentStep !== expectedFirstStep && initData.state?.currentStep !== 'main_goal') {
      console.error(`❌ FAIL: Expected ${expectedFirstStep} or main_goal, got:`, initData.state?.currentStep);
      return false;
    }
    
    console.log(`✅ Successfully initialized with ${initData.state?.currentStep} step - NO FALLBACK MESSAGE!\n`);
    
    let currentState = initData.state;
    
    // If we started with privacy_consent, accept it first
    if (currentState?.currentStep === 'privacy_consent') {
      console.log('Step 1.5: Accepting privacy consent...');
      const consentResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          action: 'submit',
          userId: testUserId,
          stepId: 'privacy_consent',
          instanceId: currentState.currentInstance?.instanceId,
          nonce: currentState.currentInstance?.nonce,
          payload: {
            selection: 'accept'
          }
        })
      });
      
      const consentData = await consentResponse.json();
      console.log('Consent response status:', consentResponse.status);
      console.log('Next step after consent:', consentData.state?.currentStep);
      
      if (!consentResponse.ok) {
        console.error('Error accepting consent:', consentData);
        return false;
      }
      
      currentState = consentData.state;
      console.log('✅ Privacy consent accepted\n');
    }
    
    // Step 2: Now we should be at main_goal
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
        stepId: currentState.currentStep,
        instanceId: currentState.currentInstance?.instanceId,
        nonce: currentState.currentInstance?.nonce,
        payload: {
          selection: 'understand_finances'
        }
      })
    });
    
    const goalData = await goalResponse.json();
    console.log('Goal response status:', goalResponse.status);
    
    if (!goalResponse.ok) {
      console.error('Error response:', goalData);
      return false;
    }
    
    console.log('Next step:', goalData.state?.currentStep);
    console.log('Component type:', goalData.component?.type || goalData.component?.componentType);
    console.log('Question:', goalData.component?.question || goalData.component?.componentData?.question);
    
    const goalQuestion = goalData.component?.question || goalData.component?.componentData?.question || '';
    if (goalQuestion.includes("didn't load properly")) {
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
    
    if (!stageResponse.ok) {
      console.error('Error response:', stageData);
      return false;
    }
    
    console.log('Next step:', stageData.state?.currentStep);
    console.log('Component type:', stageData.component?.type || stageData.component?.componentType);
    console.log('Question:', stageData.component?.question || stageData.component?.componentData?.question);
    
    const stageQuestion = stageData.component?.question || stageData.component?.componentData?.question || '';
    if (stageQuestion.includes("didn't load properly")) {
      console.error('❌ FAIL: Got fallback message after selecting life stage!');
      return false;
    }
    
    console.log('✅ Successfully progressed from life_stage\n');
    
    console.log('=== ALL TESTS PASSED ===');
    console.log('✅ No fallback messages encountered');
    console.log('✅ Flow progresses correctly: main_goal -> life_stage -> next');
    console.log('✅ Authentication working properly');
    
    // Clean up test user
    console.log('\nCleaning up test user...');
    await prisma.user_onboarding_responses.deleteMany({ where: { user_id: testUserId } });
    await prisma.onboarding_progress.deleteMany({ where: { user_id: testUserId } });
    await prisma.users.delete({ where: { id: testUserId } });
    console.log('✅ Test user cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    // Try to clean up on error
    try {
      await prisma.user_onboarding_responses.deleteMany({ where: { user_id: testUserId } });
      await prisma.onboarding_progress.deleteMany({ where: { user_id: testUserId } });
      await prisma.users.delete({ where: { id: testUserId } });
    } catch {}
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testOnboardingFlow().then(success => {
  process.exit(success ? 0 : 1);
});