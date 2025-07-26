/**
 * Frontend Integration Test Script
 * Tests the hybrid approach from the frontend perspective
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:8000',
  testUser: {
    email: 'demo@truefi.ai',
    password: 'demo123'
  }
};

// Test results
let testResults = [];

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level}: ${message}`);
}

function addResult(testName, status, details = '') {
  testResults.push({ testName, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  log(`${icon} ${testName}: ${status} ${details}`);
}

async function testUnauthenticatedChat() {
  log('Testing unauthenticated chat (should use Alex profile)...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain'
      },
      body: JSON.stringify({
        message: 'What is my current financial situation?',
        conversationHistory: []
      })
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/plain')) {
        // Streaming response for unauthenticated users
        const reader = response.body.getReader();
        let content = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += new TextDecoder().decode(value);
        }
        
        if (content.includes('Alex') || content.includes('account') || content.includes('budget')) {
          addResult('Unauthenticated Chat', 'PASS', `Response length: ${content.length} chars`);
        } else {
          addResult('Unauthenticated Chat', 'WARNING', 'Response may not contain expected Alex profile data');
        }
      } else {
        addResult('Unauthenticated Chat', 'FAIL', 'Expected streaming response but got JSON');
      }
    } else {
      addResult('Unauthenticated Chat', 'FAIL', `HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    addResult('Unauthenticated Chat', 'FAIL', error.message);
  }
}

async function testAuthenticatedChat() {
  log('Testing authenticated chat (should use FastAPI backend)...');
  
  try {
    // First, try to get a token (this would normally come from login)
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      addResult('Authenticated Chat', 'SKIP', 'No auth token available - run this after logging in');
      return;
    }
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'What is my current financial situation?',
        conversationHistory: [],
        sessionId: `test-session-${Date.now()}`
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.message && data.session_id) {
        addResult('Authenticated Chat', 'PASS', `Session ID: ${data.session_id}, Response length: ${data.message.length} chars`);
        
        // Test if response contains user-specific data
        if (data.message.includes('account') || data.message.includes('transaction') || data.message.includes('goal')) {
          addResult('User Data Integration', 'PASS', 'Response contains financial data references');
        } else {
          addResult('User Data Integration', 'WARNING', 'Response may not contain user-specific financial data');
        }
      } else {
        addResult('Authenticated Chat', 'FAIL', 'Missing message or session_id in response');
      }
    } else {
      addResult('Authenticated Chat', 'FAIL', `HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    addResult('Authenticated Chat', 'FAIL', error.message);
  }
}

async function testSessionAnalysis() {
  log('Testing session analysis...');
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      addResult('Session Analysis', 'SKIP', 'No auth token available');
      return;
    }
    
    // First create a session with some messages
    const sessionId = `analysis-test-${Date.now()}`;
    
    // Send a few messages to create conversation
    const messages = [
      'What is my current financial situation?',
      'How much am I spending on food?',
      'What are my savings goals?'
    ];
    
    for (const message of messages) {
      await fetch(`${TEST_CONFIG.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          sessionId,
          conversationHistory: []
        })
      });
    }
    
    // Now test session analysis
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endSession: true,
        sessionId
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.summary && data.insights) {
        addResult('Session Analysis', 'PASS', `Summary: ${data.summary.length} chars, ${data.insights.length} insights`);
      } else {
        addResult('Session Analysis', 'FAIL', 'Missing summary or insights in response');
      }
    } else {
      addResult('Session Analysis', 'FAIL', `HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    addResult('Session Analysis', 'FAIL', error.message);
  }
}

function printSummary() {
  log('=' * 60);
  log('FRONTEND INTEGRATION TEST SUMMARY');
  log('=' * 60);
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const total = testResults.length;
  
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    log(`${icon} ${result.testName}: ${result.status} ${result.details}`);
  });
  
  log('=' * 60);
  log(`Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    log('🎉 All frontend integration tests passed!');
  } else if (passed >= total * 0.8) {
    log('✅ Most tests passed. Frontend integration is working well.');
  } else {
    log('❌ Several tests failed. Please check the configuration.');
  }
}

async function runAllTests() {
  log('Starting frontend integration tests...');
  log('=' * 60);
  
  await testUnauthenticatedChat();
  await testAuthenticatedChat();
  await testSessionAnalysis();
  
  printSummary();
}

// Run tests if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.runFrontendTests = runAllTests;
  console.log('Frontend tests loaded. Run window.runFrontendTests() to execute tests.');
} else {
  // Node.js environment
  runAllTests();
} 