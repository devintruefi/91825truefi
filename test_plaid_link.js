/**
 * Test Plaid link token creation
 */

const fetch = require('node-fetch');

async function testPlaidLinkToken() {
  console.log('========================================');
  console.log('Testing Plaid Link Token Creation');
  console.log('========================================\n');

  // First, login to get user credentials
  console.log('1. Logging in to backend...');
  const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'devinpatel_18@yahoo.com',
      password: 'truefitest'
    })
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    const error = await loginResponse.text();
    console.error(error);
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  console.log('✓ Logged in successfully');
  console.log(`  User ID: ${loginData.id}`);
  console.log(`  Email: ${loginData.email}\n`);

  // Now test Plaid link token creation
  console.log('2. Creating Plaid link token...');
  const plaidResponse = await fetch('http://localhost:3000/api/plaid/link-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      user_id: loginData.id,
      user_email: loginData.email
    })
  });

  console.log(`  Response status: ${plaidResponse.status}`);
  
  const responseText = await plaidResponse.text();
  console.log('  Raw response:', responseText);

  if (plaidResponse.ok) {
    try {
      const plaidData = JSON.parse(responseText);
      console.log('\n✓ Link token created successfully!');
      console.log(`  Token: ${plaidData.link_token.substring(0, 50)}...`);
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  } else {
    console.error('\n✗ Failed to create link token');
    try {
      const errorData = JSON.parse(responseText);
      console.error('  Error:', errorData.error || errorData);
    } catch (e) {
      console.error('  Error:', responseText);
    }
  }

  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================');
}

// Run the test
testPlaidLinkToken().catch(console.error);