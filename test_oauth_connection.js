// Test script to check OAuth connection
const testOAuthConnection = async () => {
  console.log('Testing OAuth connection...');
  
  try {
    // Test backend health first
    const healthResponse = await fetch('http://localhost:8080/health');
    console.log('Backend health status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Backend health data:', healthData);
    }
    
    // Test OAuth init endpoint
    const oauthResponse = await fetch('http://localhost:8080/api/auth/oauth/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        provider: 'google',
        redirect_uri: 'http://localhost:3000/api/auth/callback/google'
      }),
    });
    
    console.log('OAuth init status:', oauthResponse.status);
    
    if (oauthResponse.ok) {
      const oauthData = await oauthResponse.json();
      console.log('OAuth init data:', oauthData);
    } else {
      const errorText = await oauthResponse.text();
      console.log('OAuth init error:', errorText);
    }
    
  } catch (error) {
    console.error('Connection error:', error.message);
  }
};

// Run the test
testOAuthConnection(); 