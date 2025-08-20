// Test script for onboarding API endpoints
// Run with: npx tsx test/test-onboarding-api.ts

async function testOnboardingAPI() {
  const baseUrl = 'http://localhost:3000';
  const testUserId = 'test_user_' + Date.now();
  
  console.log('🧪 Testing Onboarding API Endpoints...\n');
  
  // Test 1: Sync state endpoint
  console.log('✅ Test 1: Sync onboarding state');
  try {
    const syncResponse = await fetch(`${baseUrl}/api/onboarding/sync-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: {
          userId: testUserId,
          currentStep: 'main_goal',
          completedSteps: ['connect_accounts'],
          responses: {
            hasConnectedAccounts: false,
            skipPlaidReason: 'Testing without Plaid',
            mainGoal: 'build_wealth',
            monthlyIncome: 8000,
            monthlyExpenses: 5500
          },
          isComplete: false,
          sessionId: 'test_session',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        version: '2.0'
      })
    });
    
    const syncResult = await syncResponse.json();
    console.log('Sync result:', syncResult);
  } catch (error) {
    console.error('Sync test failed:', error);
  }
  
  // Test 2: Recover state endpoint
  console.log('\n✅ Test 2: Recover onboarding state');
  try {
    const recoverResponse = await fetch(`${baseUrl}/api/onboarding/recover-state?userId=${testUserId}`);
    const recoverResult = await recoverResponse.json();
    console.log('Recover result:', {
      hasState: !!recoverResult.state,
      currentStep: recoverResult.state?.currentStep,
      responsesCount: Object.keys(recoverResult.state?.responses || {}).length
    });
  } catch (error) {
    console.error('Recover test failed:', error);
  }
  
  // Test 3: Generate dashboard endpoint
  console.log('\n✅ Test 3: Generate dashboard');
  try {
    const dashboardResponse = await fetch(`${baseUrl}/api/onboarding/generate-dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        onboardingData: {
          userId: testUserId,
          currentStep: 'complete',
          completedSteps: [
            'connect_accounts',
            'main_goal',
            'life_stage',
            'family_context',
            'income_verification',
            'review_confirm'
          ],
          responses: {
            hasConnectedAccounts: false,
            mainGoal: 'build_wealth',
            lifeStage: 'established',
            maritalStatus: 'married',
            dependents: 2,
            monthlyIncome: 8000,
            monthlyExpenses: 5500,
            confirmedData: true,
            consentToAnalysis: true
          },
          isComplete: true,
          sessionId: 'test_session',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    });
    
    if (dashboardResponse.ok) {
      const dashboardResult = await dashboardResponse.json();
      console.log('Dashboard result:', dashboardResult);
    } else {
      console.log('Dashboard generation failed:', dashboardResponse.status, await dashboardResponse.text());
    }
  } catch (error) {
    console.error('Dashboard test failed:', error);
  }
  
  console.log('\n✨ API tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('⚠️  Server not running. Start the server with: npm run dev');
    console.log('Then run this test again.');
    process.exit(1);
  }
  
  await testOnboardingAPI();
})().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});