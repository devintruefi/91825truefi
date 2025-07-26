// Test script for dashboard spending API
const API_BASE = 'http://localhost:3000/api';

async function testDashboardSpending() {
  try {
    // Test with a sample user ID (you may need to create a user first)
    const testUserId = 'test-user-123';
    
    console.log('Testing dashboard spending API...');
    
    const response = await fetch(`${API_BASE}/dashboard/spending/${testUserId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dashboard spending data retrieved successfully:');
      console.log('Spent by main category:', data.spentByMain);
      console.log('Month:', data.month);
      console.log('Transaction count:', data.transactionCount);
    } else {
      const error = await response.text();
      console.log('❌ Failed to get dashboard spending data:', error);
    }
  } catch (error) {
    console.log('❌ Error testing dashboard spending API:', error.message);
  }
}

// Run the test
testDashboardSpending(); 