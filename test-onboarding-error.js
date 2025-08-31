// Test script to debug onboarding error
const fetch = require('node-fetch');

async function testOnboardingResponse() {
  console.log('Testing onboarding component response...\n');
  
  // Simulated auth token (replace with actual token)
  const token = 'test-token';
  
  // Test payload that simulates clicking "Pay off debt"
  const testPayload = {
    sessionId: 'test-session-123',
    userId: 'test-user-123',
    message: '[Component Response: buttons:welcome] pay_off_debt',
    componentResponse: {
      stepId: 'welcome',
      componentType: 'buttons',
      value: 'pay_off_debt'
    },
    onboardingProgress: {
      currentStep: 'welcome',
      responses: {},
      completedSteps: []
    }
  };

  console.log('Test payload:', JSON.stringify(testPayload, null, 2));
  console.log('\nExpected behavior:');
  console.log('1. Process welcome step with value "pay_off_debt"');
  console.log('2. Save to user_preferences as primary_goal');
  console.log('3. Move to next step (main_goal)');
  console.log('4. Return component for main_goal step');
  
  console.log('\nPotential issues to check:');
  console.log('- crypto.randomUUID() availability in Node.js environment');
  console.log('- Prisma client initialization');
  console.log('- Database connection');
  console.log('- Step transition logic');
}

testOnboardingResponse();